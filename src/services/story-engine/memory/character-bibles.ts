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

// Phase 22 Stage 4 Lever D: cost-tuned bible injection.
// Refresh every 20 ch (kept). Reduce inject 10 → 6 most-important + cap each at 2800 chars.
// Top 6 typically covers MC + 4-5 main supporters + antagonist. Less critical chars covered
// by character_states snapshot which is always present.
const REFRESH_INTERVAL = 20;
const MAX_BIBLES_PER_CONTEXT = 6;
const MAX_BIBLE_CHARS = 2800;
const MAX_TOTAL_INJECTION = 13000;

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

/**
 * Keep the most recent `recentCount` rows intact and stride-sample the older
 * history down to `historyCount`, so a long novel's bible sees the full life
 * arc instead of one contiguous window. Input must be sorted DESC by chapter;
 * output is chronological (oldest → newest).
 * Exported for unit tests.
 */
export function strideSampleTimeline<T>(rowsDesc: T[], recentCount = 40, historyCount = 60): T[] {
  const recent = rowsDesc.slice(0, recentCount).reverse();
  const history = rowsDesc.slice(recentCount).reverse();
  if (history.length <= historyCount) return [...history, ...recent];
  const step = history.length / historyCount;
  const sampled: T[] = [];
  for (let i = 0; i < historyCount; i++) {
    sampled.push(history[Math.floor(i * step)]);
  }
  return [...sampled, ...recent];
}

async function refreshOneBible(
  projectId: string,
  characterName: string,
  chapterNumber: number,
  appearances: number,
  config: GeminiConfig,
): Promise<void> {
  const db = getSupabase();

  // Pull character_states snapshots up to this milestone.
  // Bound by chapter_number ≤ milestone so backfill produces correct historical bibles
  // (e.g. backfill at milestone=50 for a project at ch.250 must NOT include ch.51+ data).
  // DESC + stride-sample: ascending+limit silently froze bibles at the OLDEST 100
  // states for long novels — "latest" was really ~ch.100's state.
  const { data: stateRows } = await db
    .from('character_states')
    .select('chapter_number,status,power_level,power_realm_index,location,personality_quirks,notes')
    .eq('project_id', projectId)
    .eq('character_name', characterName)
    .lte('chapter_number', chapterNumber)
    .order('chapter_number', { ascending: false })
    .limit(400);

  if (!stateRows?.length) return;

  const states = strideSampleTimeline(stateRows);

  // Build compact timeline string
  const timeline = states.map(s =>
    `Ch.${s.chapter_number}: ${s.status}${s.power_level ? ` | ${s.power_level}` : ''}${s.location ? ` @${s.location}` : ''}${s.personality_quirks ? ` | quirks: ${s.personality_quirks}` : ''}${s.notes ? ` | ${s.notes}` : ''}`
  ).join('\n');

  // Pull RAG character_event chunks (top 8) for richer context — bound by milestone too.
  // DESC so the fetch window covers the most recent events; pick 2 earliest + 6 newest
  // relevant chunks for life-arc coverage (origin events + current situation).
  const { data: chunks } = await db
    .from('story_memory_chunks')
    .select('chapter_number,content,chunk_type')
    .eq('project_id', projectId)
    .lte('chapter_number', chapterNumber)
    .in('chunk_type', ['character_event', 'plot_point', 'key_event'])
    .order('chapter_number', { ascending: false })
    .limit(200);

  const namedChunks = (chunks || []).filter(c => c.content && c.content.includes(characterName));
  const pickedChunks = namedChunks.length <= 8
    ? [...namedChunks].reverse()
    : [...namedChunks.slice(-2), ...namedChunks.slice(0, 6)].sort((a, b) => a.chapter_number - b.chapter_number);
  const relevantChunks = pickedChunks
    .map(c => `Ch.${c.chapter_number} (${c.chunk_type}): ${c.content.slice(0, 400)}`)
    .join('\n\n');

  const latest = states[states.length - 1];

  // Head+tail truncation: a pure head-cut would drop the NEWEST timeline entries.
  const timelineText = timeline.length > 5000
    ? `${timeline.slice(0, 1500)}\n[...lược bớt giai đoạn giữa...]\n${timeline.slice(-3500)}`
    : timeline;

  const prompt = `Bạn là trợ lý biên tập viết hồ sơ nhân vật cho truyện dài. Tổng hợp các snapshot + sự kiện thành 1 BIBLE NHÂN VẬT cô đặc, chính xác.

NHÂN VẬT: ${characterName}
TIMELINE TRẠNG THÁI (${states.length} điểm dữ liệu):
${timelineText}

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

  // Quality Overhaul 2.1 — deterministic post-refresh validation: the state
  // table is ground truth for status/power. If the LLM's parsed values
  // contradict the latest character_states row, overwrite with the DB value
  // and record the correction in grounding (LLM prose can drift; facts can't).
  const correctedFields: string[] = [];
  let finalStatus = parsed.status || latest.status || 'alive';
  if (parsed.status && latest.status && parsed.status !== latest.status) {
    finalStatus = latest.status;
    correctedFields.push(`status: llm='${parsed.status}' → state='${latest.status}'`);
  }
  let finalRealmIndex = parsed.power_realm_index ?? latest.power_realm_index ?? null;
  if (
    typeof parsed.power_realm_index === 'number' &&
    typeof latest.power_realm_index === 'number' &&
    parsed.power_realm_index !== latest.power_realm_index
  ) {
    finalRealmIndex = latest.power_realm_index;
    correctedFields.push(`power_realm_index: llm=${parsed.power_realm_index} → state=${latest.power_realm_index}`);
  }
  if (correctedFields.length > 0) {
    console.warn(`[CharacterBible] ${characterName}: corrected LLM drift vs character_states — ${correctedFields.join('; ')}`);
  }

  // Pedigree: generation counter tracks how many refresh cycles this bible
  // has survived; grounding records what this refresh actually saw.
  const { data: prevBible } = await db
    .from('character_bibles')
    .select('generation')
    .eq('project_id', projectId)
    .eq('character_name', characterName)
    .maybeSingle();

  const { error } = await db.from('character_bibles').upsert({
    project_id: projectId,
    character_name: characterName,
    last_refreshed_chapter: chapterNumber,
    bible_text: parsed.bible_text,
    power_realm_index: finalRealmIndex,
    current_location: parsed.current_location ?? latest.location ?? null,
    status: finalStatus,
    importance,
    key_relationships: parsed.key_relationships || [],
    generation: ((prevBible?.generation as number | undefined) ?? 0) + 1,
    grounding: {
      states_count: stateRows.length,
      latest_state_chapter: latest.chapter_number,
      chunks_used: pickedChunks.length,
      corrected_fields: correctedFields,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,character_name' });

  if (error) {
    console.warn(`[CharacterBible] Failed to save bible for ${characterName}: ${error.message}`);
  }
}
