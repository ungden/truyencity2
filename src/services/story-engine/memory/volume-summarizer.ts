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

const VOLUME_LENGTH = 100;
const MAX_INJECTION_CHARS = 6000;
const MAX_VOLUMES_INJECTED = 4; // Most recent 4 volumes

export async function getVolumeSummaryContext(
  projectId: string,
  chapterNumber: number,
): Promise<string | null> {
  if (chapterNumber < VOLUME_LENGTH) return null;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('volume_summaries')
      .select('volume_number,start_chapter,end_chapter,title,summary,major_milestones,plot_threads_resolved')
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
      const block = `\n📚 Volume ${v.volume_number} (Ch.${v.start_chapter}-${v.end_chapter})${v.title ? ` — ${v.title}` : ''}:\n${(v.summary || '').slice(0, 1800)}${milestones ? `\n  Mốc lớn: ${milestones}` : ''}${resolved ? `\n  Tuyến đã đóng: ${resolved}` : ''}`;
      if (totalChars + block.length > MAX_INJECTION_CHARS) break;
      lines.push(block);
      totalChars += block.length;
    }

    return lines.join('\n');
  } catch {
    return null;
  }
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
