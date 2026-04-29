/**
 * Story Engine v2 — Character Bible Refresh
 *
 * Đại thần workflow: in long novels (100+ chapters), the Architect cannot reconstruct
 * a character by reading 50+ character_states snapshots. Real novelists maintain a
 * consolidated "bible" per character — refreshed periodically — and reference that.
 *
 * This module:
 *  - Triggers refresh every 50 chapters per character (top importance only)
 *  - Reads ALL character_states + RAG character_event chunks for the character
 *  - Calls DeepSeek to distill into 1500-2500 char bible
 *  - Stores in `character_bibles` table
 *  - Surfaces top bibles to Architect context every chapter
 *
 * Non-fatal: refresh failures don't block chapter writing.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import type { GeminiConfig } from '../types';

const REFRESH_INTERVAL = 50;
const MAX_BIBLES_PER_CONTEXT = 6;
const MAX_BIBLE_CHARS = 2500;
const MAX_TOTAL_INJECTION = 8000;

export interface CharacterBible {
  id: string;
  characterName: string;
  lastRefreshedChapter: number;
  bibleText: string;
  powerRealmIndex: number | null;
  currentLocation: string | null;
  status: string;
  importance: number;
  keyRelationships: Array<{ name: string; type: string; status: string }>;
}

// ── Public: load + format bibles for Architect context ─────────────────────

export async function getCharacterBibleContext(
  projectId: string,
  chapterNumber: number,
): Promise<string | null> {
  // Skip for early chapters — bibles are useful only when we have refresh data
  if (chapterNumber < REFRESH_INTERVAL) return null;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('character_bibles')
      .select('id,character_name,last_refreshed_chapter,bible_text,power_realm_index,current_location,status,importance,key_relationships')
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .order('last_refreshed_chapter', { ascending: false })
      .limit(MAX_BIBLES_PER_CONTEXT);

    if (!data?.length) return null;

    const lines: string[] = ['[NHÂN VẬT BIBLE — HỒ SƠ NHÂN VẬT TRỌNG TÂM, BÁM SÁT TUYỆT ĐỐI]'];
    let totalChars = lines[0].length;

    for (const row of data) {
      const bibleSlice = (row.bible_text || '').slice(0, MAX_BIBLE_CHARS);
      const header = `\n📖 ${row.character_name} (refresh ch.${row.last_refreshed_chapter}, importance ${row.importance}, status: ${row.status}):`;
      const block = `${header}\n${bibleSlice}`;
      if (totalChars + block.length > MAX_TOTAL_INJECTION) break;
      lines.push(block);
      totalChars += block.length;
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

// ── Public: trigger refresh at boundaries ──────────────────────────────────

/**
 * Called from orchestrator post-write at chapter boundaries (50, 100, 150, ...).
 * Refreshes bibles for top-importance characters whose bible is stale.
 */
export async function refreshCharacterBibles(
  projectId: string,
  chapterNumber: number,
  config: GeminiConfig,
): Promise<void> {
  if (chapterNumber < REFRESH_INTERVAL) return;
  if (chapterNumber % REFRESH_INTERVAL !== 0) return;

  try {
    const db = getSupabase();

    // Find candidates: top characters by appearance frequency in character_states
    const { data: charRows } = await db
      .from('character_states')
      .select('character_name')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: false })
      .limit(500);

    if (!charRows?.length) return;

    const freq = new Map<string, number>();
    for (const r of charRows) {
      const name = r.character_name?.trim();
      if (!name) continue;
      freq.set(name, (freq.get(name) || 0) + 1);
    }

    const topCharacters = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    if (topCharacters.length === 0) return;

    // Find which characters need refresh (no bible OR bible older than this milestone)
    const { data: existingBibles } = await db
      .from('character_bibles')
      .select('character_name,last_refreshed_chapter')
      .eq('project_id', projectId)
      .in('character_name', topCharacters);

    const lastRefreshMap = new Map<string, number>();
    for (const b of existingBibles || []) {
      lastRefreshMap.set(b.character_name, b.last_refreshed_chapter);
    }

    const needsRefresh = topCharacters.filter(name => {
      const last = lastRefreshMap.get(name) || 0;
      return chapterNumber - last >= REFRESH_INTERVAL;
    });

    if (needsRefresh.length === 0) return;

    // Refresh top 5 sequentially (avoid hammering DeepSeek with 10 parallel calls)
    for (const charName of needsRefresh.slice(0, 5)) {
      try {
        await refreshOneBible(projectId, charName, chapterNumber, freq.get(charName) || 1, config);
      } catch (e) {
        console.warn(`[CharacterBible] Refresh failed for ${charName}:`, e instanceof Error ? e.message : String(e));
      }
    }
  } catch (e) {
    console.warn('[CharacterBible] refreshCharacterBibles failed:', e instanceof Error ? e.message : String(e));
  }
}

// ── Internal: refresh one character ────────────────────────────────────────

async function refreshOneBible(
  projectId: string,
  characterName: string,
  chapterNumber: number,
  appearances: number,
  config: GeminiConfig,
): Promise<void> {
  const db = getSupabase();

  // Pull character_states snapshots up to this milestone (max 100).
  // Bound by chapter_number ≤ milestone so backfill produces correct historical bibles
  // (e.g. backfill at milestone=50 for a project at ch.250 must NOT include ch.51+ data).
  const { data: states } = await db
    .from('character_states')
    .select('chapter_number,status,power_level,power_realm_index,location,personality_quirks,notes')
    .eq('project_id', projectId)
    .eq('character_name', characterName)
    .lte('chapter_number', chapterNumber)
    .order('chapter_number', { ascending: true })
    .limit(100);

  if (!states?.length) return;

  // Build compact timeline string
  const timeline = states.map(s =>
    `Ch.${s.chapter_number}: ${s.status}${s.power_level ? ` | ${s.power_level}` : ''}${s.location ? ` @${s.location}` : ''}${s.personality_quirks ? ` | quirks: ${s.personality_quirks}` : ''}${s.notes ? ` | ${s.notes}` : ''}`
  ).join('\n');

  // Pull RAG character_event chunks (top 8) for richer context — bound by milestone too
  const { data: chunks } = await db
    .from('story_memory_chunks')
    .select('chapter_number,content,chunk_type')
    .eq('project_id', projectId)
    .lte('chapter_number', chapterNumber)
    .in('chunk_type', ['character_event', 'plot_point', 'key_event'])
    .order('chapter_number', { ascending: true })
    .limit(200);

  const relevantChunks = (chunks || [])
    .filter(c => c.content && c.content.includes(characterName))
    .slice(0, 8)
    .map(c => `Ch.${c.chapter_number} (${c.chunk_type}): ${c.content.slice(0, 400)}`)
    .join('\n\n');

  const latest = states[states.length - 1];

  const prompt = `Bạn là trợ lý biên tập viết hồ sơ nhân vật cho truyện dài. Tổng hợp các snapshot + sự kiện thành 1 BIBLE NHÂN VẬT cô đặc, chính xác.

NHÂN VẬT: ${characterName}
TIMELINE TRẠNG THÁI (${states.length} điểm dữ liệu):
${timeline.slice(0, 5000)}

${relevantChunks ? `SỰ KIỆN LIÊN QUAN:\n${relevantChunks.slice(0, 4000)}\n` : ''}

VIẾT BIBLE 1500-2500 chars, structure:
1. Tóm tắt 1-2 câu (ai, vai trò trong truyện)
2. Tính cách & quirks (bullet list — TRÍCH ĐÚNG từ data, không bịa)
3. Sức mạnh / cảnh giới hiện tại (theo snapshot mới nhất)
4. Vị trí hiện tại
5. Quan hệ với MC + nhân vật khác (bullet list — chỉ liệt kê có data)
6. Sự kiện trọng tâm trong life arc (3-5 bullet)
7. Trạng thái cuối cùng: alive | dead | missing | retired

Trả về JSON:
{
  "bible_text": "<full text 1500-2500 chars>",
  "status": "alive|dead|missing|retired",
  "current_location": "<latest known location or null>",
  "power_realm_index": <int or null>,
  "importance": <0-100, dựa trên frequency + role>,
  "key_relationships": [{"name": "...", "type": "ally|enemy|family|romantic|...", "status": "active|broken|past"}]
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.2,
    maxTokens: 3072,
  }, {
    jsonMode: true,
    tracking: { projectId, task: 'character_bible_refresh', chapterNumber },
  });

  const { parseJSON } = await import('../utils/json-repair');
  const parsed = parseJSON<{
    bible_text?: string;
    status?: string;
    current_location?: string | null;
    power_realm_index?: number | null;
    importance?: number;
    key_relationships?: Array<{ name: string; type: string; status: string }>;
  }>(res.content);

  if (!parsed?.bible_text || parsed.bible_text.length < 300) {
    console.warn(`[CharacterBible] ${characterName}: bible too short or missing, skipping save`);
    return;
  }

  const importance = Math.min(100, Math.max(20, parsed.importance ?? Math.min(100, appearances * 5)));

  const { error } = await db.from('character_bibles').upsert({
    project_id: projectId,
    character_name: characterName,
    last_refreshed_chapter: chapterNumber,
    bible_text: parsed.bible_text,
    power_realm_index: parsed.power_realm_index ?? latest.power_realm_index ?? null,
    current_location: parsed.current_location ?? latest.location ?? null,
    status: parsed.status || latest.status || 'alive',
    importance,
    key_relationships: parsed.key_relationships || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,character_name' });

  if (error) {
    console.warn(`[CharacterBible] Failed to save bible for ${characterName}: ${error.message}`);
  }
}
