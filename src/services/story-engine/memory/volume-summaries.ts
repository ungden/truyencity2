/**
 * Story Engine v2 — Volume Summarizer
 *
 * Đại thần workflow: every 100 chapters, generate a "volume bible" — a 3-5K char
 * consolidated narrative of the prior 100 chapters. This serves as the durable
 * macro-memory injected into Architect for the rest of the novel's life.
 *
 * Without this, Architect at ch.300 has only:
 *   - Layer 3 recent (12 latest summaries)
 *   - Synopsis (regenerated every 5 ch, accumulating noise)
 *   - RAG (retrieval-based, can miss context)
 *
 * With this, Architect at ch.300 sees consolidated volume summaries for ch.1-100,
 * 101-200, 201-300 — making it possible to reference truly long-range arcs.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// Phase 22 Stage 4 Lever D: cost-tuned volume injection.
// Generate every 25 ch (kept — denser macro memory). Inject only 3 most recent volumes
// (was 8) + cap total at 6000 chars. The 3 most recent cover ~75 chapters of macro
// memory which is sufficient for current arc + 1 past arc context. Older volumes
// rarely needed for live writing — accessible via RAG if specifically relevant.
const VOLUME_LENGTH = 25;
const MAX_INJECTION_CHARS = 6000;
const MAX_VOLUMES_INJECTED = 3;

export async function getVolumeSummaryContext(
  projectId: string,
  chapterNumber: number,
): Promise<string | null> {
  if (chapterNumber < VOLUME_LENGTH) return null;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('volume_summaries')
      .select('volume_number,start_chapter,end_chapter,title,summary,major_milestones,plot_threads_resolved,facts')
      .eq('project_id', projectId)
      .order('volume_number', { ascending: false })
      .limit(MAX_VOLUMES_INJECTED);

    if (!data?.length) return null;

    const lines: string[] = ['[VOLUME SUMMARIES — TÓM TẮT MACRO, MEMORY DÀI HẠN, TUYỆT ĐỐI BÁM SÁT]'];
    let totalChars = lines[0].length;

    // Show oldest first so reading flow is chronological
    const ordered = [...data].reverse();
    for (const v of ordered) {
      const milestones = (v.major_milestones || []).slice(0, 5).join(' • ');
      const resolved = (v.plot_threads_resolved || []).slice(0, 4).join(' • ');
      // Quality Overhaul 2.6: deterministic facts sub-block — state-table
      // truth that the LLM prose summary cannot drift away from. If prose
      // and facts conflict, FACTS win.
      const f = (v as { facts?: VolumeFacts | null }).facts;
      const factLines: string[] = [];
      if (f?.deaths?.length) factLines.push(`Đã chết: ${f.deaths.join(', ')}`);
      if (f?.mc_realm_end) factLines.push(`MC cảnh giới cuối volume: ${f.mc_realm_end}`);
      if (f?.threads_resolved?.length) factLines.push(`Threads đóng (DB): ${f.threads_resolved.slice(0, 4).join(' • ')}`);
      if (f?.timeline_span) factLines.push(`Thời gian in-world: ${f.timeline_span}`);
      const factBlock = factLines.length
        ? `\n  🔒 SỰ THẬT KHÓA (deterministic — prose mâu thuẫn thì THEO DÒNG NÀY): ${factLines.join(' | ')}`
        : '';
      const block = `\n📚 Volume ${v.volume_number} (Ch.${v.start_chapter}-${v.end_chapter})${v.title ? ` — ${v.title}` : ''}:\n${(v.summary || '').slice(0, 1800)}${milestones ? `\n  Mốc lớn: ${milestones}` : ''}${resolved ? `\n  Tuyến đã đóng: ${resolved}` : ''}${factBlock}`;
      if (totalChars + block.length > MAX_INJECTION_CHARS) break;
      lines.push(block);
      totalChars += block.length;
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Quality Overhaul 2.6 — deterministic facts from state tables for a chapter
 * range. Exported for unit tests (pass a mocked supabase via getSupabase).
 */
export interface VolumeFacts {
  deaths: string[];
  mc_realm_end: string | null;
  threads_resolved: string[];
  timeline_span: string | null;
}

async function computeVolumeFacts(
  projectId: string,
  startChapter: number,
  endChapter: number,
): Promise<VolumeFacts> {
  const db = getSupabase();
  const facts: VolumeFacts = { deaths: [], mc_realm_end: null, threads_resolved: [], timeline_span: null };

  try {
    // Deaths: characters whose state flipped to dead within the range.
    const { data: deadStates } = await db
      .from('character_states')
      .select('character_name,chapter_number')
      .eq('project_id', projectId)
      .eq('status', 'dead')
      .gte('chapter_number', startChapter)
      .lte('chapter_number', endChapter)
      .order('chapter_number', { ascending: true })
      .limit(50);
    const seen = new Set<string>();
    for (const s of deadStates || []) {
      if (seen.has(s.character_name)) continue;
      seen.add(s.character_name);
      facts.deaths.push(`${s.character_name} (ch.${s.chapter_number})`);
    }
    facts.deaths = facts.deaths.slice(0, 10);
  } catch { /* non-fatal */ }

  try {
    // MC power realm — single-row table (PK project_id); only meaningful for
    // the volume if its last update falls within/before the range end.
    const { data: power } = await db
      .from('mc_power_states')
      .select('power_state,last_updated_chapter')
      .eq('project_id', projectId)
      .maybeSingle();
    const realm = (power?.power_state as { currentRealm?: string } | null)?.currentRealm;
    if (realm && typeof power?.last_updated_chapter === 'number' && power.last_updated_chapter <= endChapter) {
      facts.mc_realm_end = `${realm} (cập nhật ch.${power.last_updated_chapter})`;
    }
  } catch { /* non-fatal */ }

  try {
    // Threads resolved in range (deterministic — from plot_threads, not LLM).
    const { data: resolved } = await db
      .from('plot_threads')
      .select('name,last_active_chapter')
      .eq('project_id', projectId)
      .eq('status', 'resolved')
      .gte('last_active_chapter', startChapter)
      .lte('last_active_chapter', endChapter)
      .limit(10);
    facts.threads_resolved = (resolved || []).map(t => `${t.name} (ch.${t.last_active_chapter})`);
  } catch { /* non-fatal */ }

  try {
    // In-world timeline span.
    const { data: timeline } = await db
      .from('story_timeline')
      .select('in_world_date_text,chapter_number')
      .eq('project_id', projectId)
      .gte('chapter_number', startChapter)
      .lte('chapter_number', endChapter)
      .order('chapter_number', { ascending: true });
    if (timeline?.length) {
      const first = timeline[0];
      const last = timeline[timeline.length - 1];
      if (first.in_world_date_text && last.in_world_date_text) {
        facts.timeline_span = `${first.in_world_date_text} → ${last.in_world_date_text}`;
      }
    }
  } catch { /* non-fatal */ }

  return facts;
}

export async function generateVolumeSummary(
  projectId: string,
  chapterNumber: number,
  config: GeminiConfig,
): Promise<void> {
  if (chapterNumber < VOLUME_LENGTH) return;
  if (chapterNumber % VOLUME_LENGTH !== 0) return;

  const volumeNumber = chapterNumber / VOLUME_LENGTH;
  const startChapter = chapterNumber - VOLUME_LENGTH + 1;
  const endChapter = chapterNumber;

  try {
    const db = getSupabase();

    // Already exists?
    const { data: existing } = await db
      .from('volume_summaries')
      .select('id')
      .eq('project_id', projectId)
      .eq('volume_number', volumeNumber)
      .maybeSingle();
    if (existing?.id) return;

    // Fetch all 100 chapter summaries for this volume
    const { data: summaries } = await db
      .from('chapter_summaries')
      .select('chapter_number,title,summary,mc_state,cliffhanger')
      .eq('project_id', projectId)
      .gte('chapter_number', startChapter)
      .lte('chapter_number', endChapter)
      .order('chapter_number', { ascending: true });

    if (!summaries?.length) {
      console.warn(`[VolumeSummarizer] No chapter summaries for volume ${volumeNumber}`);
      return;
    }

    // Fetch arc plans that fell in this volume (for thread closure data)
    const { data: arcs } = await db
      .from('arc_plans')
      .select('arc_number,arc_theme,plan_text,threads_to_resolve,new_threads')
      .eq('project_id', projectId)
      .gte('start_chapter', startChapter)
      .lte('end_chapter', endChapter)
      .order('arc_number', { ascending: true });

    // Build compact input — chapter summaries condensed
    const chSummariesBlock = summaries
      .map(s => `Ch.${s.chapter_number} "${s.title}": ${s.summary}${s.cliffhanger ? ` [Hook: ${s.cliffhanger}]` : ''}`)
      .join('\n')
      .slice(0, 30000); // Cap at 30K chars input

    const arcsBlock = (arcs || [])
      .map(a => `Arc ${a.arc_number} (${a.arc_theme}): resolved=[${(a.threads_to_resolve || []).join(', ')}] introduced=[${(a.new_threads || []).join(', ')}]`)
      .join('\n');

    const prompt = `Bạn là biên tập viên truyện dài. Tổng hợp 100 chương thành 1 VOLUME BIBLE cô đặc.

VOLUME ${volumeNumber} (Chương ${startChapter} - ${endChapter}):

CHAPTER SUMMARIES (chronological):
${chSummariesBlock}

${arcsBlock ? `\nARCS TRONG VOLUME:\n${arcsBlock}\n` : ''}

NHIỆM VỤ:
1. Viết Volume Summary 2500-3500 từ — kể lại Volume này như một mini-arc hoàn chỉnh
2. Nhận diện 5-8 mốc trọng đại nhất (major_milestones)
3. Liệt kê tuyến truyện đã đóng (plot_threads_resolved) và mở mới (plot_threads_introduced)
4. Ghi character_development cho 3-5 nhân vật chính (JSON: {name: string, change: string})
5. Đặt tên Volume gợi cảm phù hợp nội dung (vd: "Khởi Đầu Hỗn Mang", "Trận Chiến Thiên Đỉnh")

Trả về JSON:
{
  "title": "<volume name>",
  "summary": "<2500-3500 char narrative summary>",
  "major_milestones": ["<milestone 1>", ...],
  "plot_threads_resolved": ["<thread 1>", ...],
  "plot_threads_introduced": ["<thread 1>", ...],
  "character_development": [{"name": "...", "change": "..."}]
}`;

    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.25,
      maxTokens: 6144,
    }, {
      jsonMode: true,
      tracking: { projectId, task: 'volume_summary', chapterNumber },
    });

    const parsed = parseJSON<{
      title?: string;
      summary?: string;
      major_milestones?: string[];
      plot_threads_resolved?: string[];
      plot_threads_introduced?: string[];
      character_development?: Array<{ name: string; change: string }>;
    }>(res.content);

    if (!parsed?.summary || parsed.summary.length < 500) {
      console.warn(`[VolumeSummarizer] Vol ${volumeNumber}: summary too short, skipping`);
      return;
    }

    const charDevObj: Record<string, string> = {};
    for (const cd of parsed.character_development || []) {
      if (cd.name) charDevObj[cd.name] = cd.change || '';
    }

    // Quality Overhaul 2.6 — deterministic facts straight from state tables
    // for the volume range. LLM prose summaries accumulate errors over 40+
    // volume cycles (summary inherits last summary's mistakes); these fields
    // cannot drift and make prose-vs-fact contradictions detectable.
    const facts = await computeVolumeFacts(projectId, startChapter, endChapter);

    const { error } = await db.from('volume_summaries').upsert({
      project_id: projectId,
      volume_number: volumeNumber,
      start_chapter: startChapter,
      end_chapter: endChapter,
      title: parsed.title || `Volume ${volumeNumber}`,
      summary: parsed.summary,
      major_milestones: parsed.major_milestones || [],
      plot_threads_resolved: parsed.plot_threads_resolved || [],
      plot_threads_introduced: parsed.plot_threads_introduced || [],
      character_development: charDevObj,
      arcs_included: (arcs || []).map(a => a.arc_number),
      facts,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,volume_number' });

    if (error) {
      console.warn(`[VolumeSummarizer] Failed to save volume ${volumeNumber}: ${error.message}`);
    } else {
      console.log(`[VolumeSummarizer] ✓ Saved Vol ${volumeNumber} (Ch.${startChapter}-${endChapter}): "${parsed.title}"`);
    }
  } catch (e) {
    console.warn(`[VolumeSummarizer] Vol ${volumeNumber} generation failed:`, e instanceof Error ? e.message : String(e));
  }
}
