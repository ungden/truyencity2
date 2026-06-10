/**
 * Quality Overhaul 3.1 — endgame planning.
 *
 * Supreme goal 4 ("natural ending in 1000-2000 chapters") had no concrete
 * machinery: masterOutline.finalBossOrGoal was one string, endingVision 1-2
 * sentences, and the soft-ending enforcer only said "climax-dense" — so the
 * final ~100 chapters either exhausted plot early or escalated past the peak.
 *
 * Two mechanisms:
 *  1. `generateEndgamePlan(projectId)` — ONE refinement pass when the novel
 *     crosses 70% of total_planned_chapters. Inputs are the story ACTUALLY
 *     written (open plot_threads, unresolved foreshadowing, volume
 *     summaries), not the ch.0 plan. Stored under master_outline.endgame.
 *  2. `getEndgameContext(projectId, chapterNumber, totalPlanned)` — when the
 *     chapter is within the final 120, inject the [ENDGAME PLAN] block as
 *     Tier-0 context so Architect steers every chapter toward the planned
 *     climax → resolution → epilogue shape.
 *
 * Non-fatal everywhere: failure falls back to existing soft-ending behavior.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import type { GeminiConfig } from '../types';
import type { EndgamePlan, MasterOutline } from './master-outline';

const REFINE_PROGRESS_THRESHOLD = 0.7;
const ENDGAME_INJECTION_WINDOW = 120; // chapters before total

/** Pure trigger decision — exported for unit tests. */
export function shouldRefineEndgame(
  currentChapter: number,
  totalPlanned: number | null | undefined,
  existingEndgame: EndgamePlan | undefined | null,
): boolean {
  if (!totalPlanned || totalPlanned <= 0) return false;
  if (currentChapter < totalPlanned * REFINE_PROGRESS_THRESHOLD) return false;
  // Refine once: skip if already refined.
  return existingEndgame?.source !== 'refined';
}

/**
 * One-time endgame refinement at 70% progress. Reads live story state and
 * re-plans the final stretch. Persists into master_outline.endgame.
 */
export async function generateEndgamePlan(
  projectId: string,
  config: GeminiConfig,
): Promise<EndgamePlan | null> {
  try {
    const db = getSupabase();
    const { data: project } = await db
      .from('ai_story_projects')
      .select('master_outline, story_outline, current_chapter, total_planned_chapters, genre')
      .eq('id', projectId)
      .maybeSingle();
    if (!project?.master_outline) return null;

    const masterOutline = project.master_outline as MasterOutline;
    const totalPlanned = project.total_planned_chapters || 1000;
    const currentChapter = project.current_chapter || 0;

    if (!shouldRefineEndgame(currentChapter, totalPlanned, masterOutline.endgame)) {
      return masterOutline.endgame ?? null;
    }

    // Live story state — the ending must close what was actually opened.
    const [{ data: openThreads }, { data: unresolvedHints }, { data: volumes }] = await Promise.all([
      db.from('plot_threads')
        .select('name, description, priority, importance, start_chapter')
        .eq('project_id', projectId)
        .not('status', 'in', '("resolved","legacy")')
        .order('importance', { ascending: false })
        .limit(20),
      db.from('foreshadowing_plans')
        .select('hint_text, payoff_description, payoff_chapter')
        .eq('project_id', projectId)
        .in('status', ['planted', 'developing'])
        .order('payoff_chapter', { ascending: true })
        .limit(15),
      db.from('volume_summaries')
        .select('volume_number, title, summary')
        .eq('project_id', projectId)
        .order('volume_number', { ascending: false })
        .limit(3),
    ]);

    const endingVision = (project.story_outline as { endingVision?: string } | null)?.endingVision || '';
    const climaxStart = Math.max(currentChapter + 1, totalPlanned - 100);
    const resolutionStart = totalPlanned - 30;

    const prompt = `Bạn là tổng biên tập lập KẾ HOẠCH KẾT THÚC cho truyện dài ${totalPlanned} chương, hiện đã viết đến chương ${currentChapter}.

MAIN PLOTLINE: ${masterOutline.mainPlotline}
FINAL GOAL: ${masterOutline.finalBossOrGoal}
ENDING VISION (từ setup): ${endingVision || '(chưa có)'}

TUYẾN TRUYỆN ĐANG MỞ (phải quyết định đóng ở đâu):
${(openThreads || []).map(t => `- [${t.priority}] ${t.name}: ${(t.description || '').slice(0, 150)}`).join('\n') || '(không có)'}

FORESHADOWING CHƯA PAYOFF:
${(unresolvedHints || []).map(h => `- "${(h.hint_text || '').slice(0, 100)}" → ${(h.payoff_description || '').slice(0, 100)}`).join('\n') || '(không có)'}

TÓM TẮT 3 VOLUME GẦN NHẤT (trạng thái truyện thực tế):
${(volumes || []).reverse().map(v => `Vol ${v.volume_number}${v.title ? ` (${v.title})` : ''}: ${(v.summary || '').slice(0, 600)}`).join('\n\n') || '(chưa có)'}

NHIỆM VỤ: Lập kế hoạch kết thúc CỤ THỂ cho ${totalPlanned - currentChapter} chương còn lại:
- Climax arc: chương ~${climaxStart} đến ~${resolutionStart - 1} — đỉnh điểm hội tụ các thread chính.
- Resolution arc: chương ~${resolutionStart} đến ${totalPlanned} — hạ màn, KHÔNG escalation mới.
- mustResolveThreads: các thread BẮT BUỘC đóng trước chương cuối (chọn từ danh sách trên — thread nào không đáng đóng on-page thì để soft-close).
- epilogueBeats: 3-5 beat cho 1-3 chương cuối (MC + người thân + thế giới sau biến cố).
- finalState: 2-3 câu trạng thái cuối của MC + thế giới.

Trả về JSON đúng schema:
{
  "climaxArc": {"startChapter": <int>, "endChapter": <int>, "description": "<2-4 câu>", "convergingThreads": ["..."], "finalConfrontation": "<1-2 câu — đối đầu/đỉnh điểm cuối là gì, ở đâu, với ai>"},
  "resolutionArc": {"startChapter": <int>, "endChapter": <int>, "beats": ["beat 1", "beat 2", "..."]},
  "finalState": "<2-3 câu>",
  "mustResolveThreads": ["tên thread 1", "..."],
  "epilogueBeats": ["beat 1", "..."]
}`;

    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.4,
      maxTokens: 8192,
    }, {
      jsonMode: true,
      tracking: { projectId, task: 'endgame_plan', chapterNumber: currentChapter },
    });

    const { parseJSON } = await import('../utils/json-repair');
    const parsed = parseJSON<EndgamePlan>(res.content);
    if (!parsed?.climaxArc?.startChapter || !parsed.resolutionArc?.startChapter || !parsed.finalState) {
      console.warn(`[EndgamePlan] parse failed or incomplete for project ${projectId}`);
      return null;
    }

    const endgame: EndgamePlan = {
      ...parsed,
      source: 'refined',
      refinedAtChapter: currentChapter,
    };

    const { error } = await db
      .from('ai_story_projects')
      .update({
        master_outline: { ...masterOutline, endgame },
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (error) {
      console.warn(`[EndgamePlan] persist failed for ${projectId}: ${error.message}`);
      return null;
    }

    console.log(`[EndgamePlan] refined endgame for project ${projectId} at ch.${currentChapter} (climax ${endgame.climaxArc.startChapter}-${endgame.climaxArc.endChapter}, resolution ${endgame.resolutionArc.startChapter}-${endgame.resolutionArc.endChapter})`);
    return endgame;
  } catch (e) {
    console.warn(`[EndgamePlan] generation threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** Pure formatter — exported for unit tests. */
export function formatEndgameContext(
  endgame: EndgamePlan,
  chapterNumber: number,
  totalPlanned: number,
): string {
  const lines: string[] = [
    '[ENDGAME PLAN — LỘ TRÌNH KẾT THÚC, TUYỆT ĐỐI BÁM SÁT]',
    `Truyện kết thúc ở chương ${totalPlanned}. Chương hiện tại: ${chapterNumber}.`,
    `CLIMAX ARC (ch.${endgame.climaxArc.startChapter}-${endgame.climaxArc.endChapter}): ${endgame.climaxArc.description}`,
    `  Đối đầu cuối: ${endgame.climaxArc.finalConfrontation}`,
  ];
  if (endgame.climaxArc.convergingThreads?.length) {
    lines.push(`  Threads hội tụ: ${endgame.climaxArc.convergingThreads.join(' • ')}`);
  }
  lines.push(`RESOLUTION ARC (ch.${endgame.resolutionArc.startChapter}-${endgame.resolutionArc.endChapter}) — KHÔNG escalation mới:`);
  for (const b of endgame.resolutionArc.beats || []) lines.push(`  • ${b}`);
  if (endgame.mustResolveThreads?.length) {
    lines.push(`THREADS BẮT BUỘC ĐÓNG TRƯỚC CHƯƠNG CUỐI: ${endgame.mustResolveThreads.join(' • ')}`);
  }
  if (endgame.epilogueBeats?.length) {
    lines.push(`EPILOGUE BEATS (1-3 chương cuối): ${endgame.epilogueBeats.join(' • ')}`);
  }
  lines.push(`TRẠNG THÁI CUỐI: ${endgame.finalState}`);

  if (chapterNumber >= endgame.resolutionArc.startChapter) {
    lines.push('→ ĐANG Ở RESOLUTION ARC: chương này hạ màn — đóng thread, emotional payoff, KHÔNG mở conflict/nhân vật/faction mới.');
  } else if (chapterNumber >= endgame.climaxArc.startChapter) {
    lines.push('→ ĐANG Ở CLIMAX ARC: mọi scene phải tiến về phía đối đầu cuối — escalate có hướng, không side-story.');
  } else {
    lines.push('→ SẮP VÀO CLIMAX: setup các quân cờ cho climax arc, bắt đầu thu hẹp side threads.');
  }
  return lines.join('\n');
}

/**
 * Returns the [ENDGAME PLAN] block when the chapter is within the final
 * injection window. Null otherwise (or when no endgame plan exists).
 */
export async function getEndgameContext(
  projectId: string,
  chapterNumber: number,
  totalPlanned: number | null | undefined,
): Promise<string | null> {
  try {
    if (!totalPlanned || totalPlanned <= 0) return null;
    if (chapterNumber <= totalPlanned - ENDGAME_INJECTION_WINDOW) return null;

    const db = getSupabase();
    const { data: project } = await db
      .from('ai_story_projects')
      .select('master_outline')
      .eq('id', projectId)
      .maybeSingle();
    const endgame = (project?.master_outline as MasterOutline | null)?.endgame;
    if (!endgame?.climaxArc || !endgame.resolutionArc) return null;

    return formatEndgameContext(endgame, chapterNumber, totalPlanned);
  } catch {
    return null;
  }
}
