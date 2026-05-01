/**
 * Story Engine v2 — Rolling Chapter Briefs (Phase 27 W5.4)
 *
 * Pre-Phase-27: Architect at chapter N saw only the brief for chapter N (from
 * arc plan). Result: scenes designed in isolation, no awareness of what's
 * coming next 2-3 chapters → "dead-end" scenes that don't lead anywhere.
 *
 * Phase 27 W5.4 fix:
 *   1. After ch.N is written: generate detailed briefs for ch.N+1, N+2, N+3
 *      using current arc plan + recent chapter summaries as input.
 *   2. Persist to chapter_briefs table (one row per chapter).
 *   3. Architect at ch.N reads not just current brief but also briefs for
 *      ch.N+1 to N+3 → can plant seeds, set up future scenes.
 *
 * Đại thần workflow mapping:
 *   "日大纲" — top web novel authors outline 1-3 chapters ahead in detail
 *   before writing today's chapter. This avoids dead-end scenes.
 *
 * Storage: arc_plans table already has `chapter_briefs` JSONB field. We extend
 * usage instead of new table — store rolling briefs there.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface BriefAIResponse {
  briefs?: Array<{
    chapterNumber?: number;
    brief?: string;
    sceneDirection?: string; // 1-2 sentences direction
  }>;
}

interface RollingBrief {
  chapterNumber: number;
  brief: string;
  sceneDirection?: string;
}

// ── Generate rolling briefs (post-write, fires every 5 chapters) ─────────────

/**
 * Generate detailed briefs for chapter N+1, N+2, N+3 (3 chapters ahead).
 * Persists to arc_plans.chapter_briefs JSONB (extends existing array).
 *
 * Cadence: after every 5th chapter (post-write task). Not every chapter
 * because briefs ahead by 3 means we only need refresh every 3 written.
 *
 * Input: current arc plan, recent 3 chapter summaries.
 * Output: 3 briefs persisted; pre-write picks them up via context-assembler.
 */
export async function generateRollingBriefs(
  projectId: string,
  currentChapter: number,
  config: GeminiConfig,
): Promise<{ generated: number }> {
  try {
    const db = getSupabase();

    // Load current arc plan.
    const { data: arcPlan } = await db
      .from('arc_plans')
      .select('arc_number,start_chapter,end_chapter,arc_theme,plan_text,chapter_briefs')
      .eq('project_id', projectId)
      .lte('start_chapter', currentChapter)
      .gte('end_chapter', currentChapter)
      .order('arc_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!arcPlan) return { generated: 0 };

    // Skip if arc end is within 3 chapters (briefs of next arc need new arc plan).
    const remainingInArc = arcPlan.end_chapter - currentChapter;
    if (remainingInArc < 3) return { generated: 0 };

    // Load recent 3 chapter summaries for grounding.
    const { data: summaries } = await db
      .from('chapter_summaries')
      .select('chapter_number,title,summary,cliffhanger')
      .eq('project_id', projectId)
      .lte('chapter_number', currentChapter)
      .order('chapter_number', { ascending: false })
      .limit(3);

    const recentSummariesText = (summaries || [])
      .reverse()
      .map(s => `Ch.${s.chapter_number} "${s.title}": ${s.summary} | Cliffhanger: ${s.cliffhanger || '(none)'}`)
      .join('\n');

    // Existing briefs for next 3 chapters (skip if all already exist).
    const existingBriefs = (arcPlan.chapter_briefs || []) as Array<{ chapterNumber: number; brief: string }>;
    const existingChapterNumbers = new Set(existingBriefs.map(b => b.chapterNumber));
    const targetChapters = [currentChapter + 1, currentChapter + 2, currentChapter + 3]
      .filter(ch => ch <= arcPlan.end_chapter && !existingChapterNumbers.has(ch));
    if (targetChapters.length === 0) return { generated: 0 };

    const prompt = `Bạn là daily outliner cho truyện dài kỳ. Generate detailed briefs cho ${targetChapters.length} chương kế tiếp.

ARC HIỆN TẠI (arc ${arcPlan.arc_number}, ch.${arcPlan.start_chapter}-${arcPlan.end_chapter}):
Theme: ${arcPlan.arc_theme || 'unknown'}
Plan: ${(arcPlan.plan_text || '').slice(0, 2000)}

3 CHƯƠNG GẦN NHẤT:
${recentSummariesText}

CHƯƠNG CẦN BRIEF (${targetChapters.length} briefs):
${targetChapters.map(ch => `- Chapter ${ch}`).join('\n')}

Trả về JSON:
{
  "briefs": [
    {
      "chapterNumber": ${targetChapters[0]},
      "brief": "<150-250 từ describing scene direction. Cụ thể: WHERE (location), WHO (cast), WHAT happens (events), WHY (motivations), HOOK (ending direction). KHÔNG generic.>",
      "sceneDirection": "<1-2 câu high-level direction — vd 'MC encounters villain at marketplace, escalation, reveal twist about brother'>"
    }
    ...
  ]
}

QUY TẮC:
1. Briefs phải BUILD ON nhau — chương N+1 phải tiếp nối cliffhanger N. Chương N+2 phải có mention/seed gì đó từ N+1.
2. Mỗi brief phải fit ARC THEME + plan.
3. KHÔNG bịa events không có trong arc plan.
4. brief phải concrete — có thể write Architect outline từ brief này.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 3072 },
      { jsonMode: true, tracking: { projectId, task: 'rolling_briefs', chapterNumber: currentChapter } },
    );

    if (!res.content) return { generated: 0 };

    const parsed = parseJSON<BriefAIResponse>(res.content);
    if (!parsed?.briefs?.length) return { generated: 0 };

    const newBriefs: RollingBrief[] = parsed.briefs
      .filter(b => typeof b.chapterNumber === 'number' && b.brief && b.brief.length >= 50)
      .map(b => ({
        chapterNumber: b.chapterNumber!,
        brief: b.brief!.slice(0, 1200),
        sceneDirection: b.sceneDirection?.slice(0, 300),
      }));

    if (newBriefs.length === 0) return { generated: 0 };

    // Merge into arc_plans.chapter_briefs JSONB.
    const merged = [...existingBriefs];
    for (const nb of newBriefs) {
      const existingIdx = merged.findIndex(e => e.chapterNumber === nb.chapterNumber);
      if (existingIdx >= 0) {
        merged[existingIdx] = nb;
      } else {
        merged.push(nb);
      }
    }
    merged.sort((a, b) => a.chapterNumber - b.chapterNumber);

    const { error } = await db
      .from('arc_plans')
      .update({ chapter_briefs: merged })
      .eq('project_id', projectId)
      .eq('arc_number', arcPlan.arc_number);
    if (error) {
      console.warn(`[chapter-briefs] Update failed: ${error.message}`);
      return { generated: 0 };
    }

    console.log(`[chapter-briefs] Generated ${newBriefs.length} rolling briefs for project ${projectId} (chapters ${newBriefs.map(b => b.chapterNumber).join(', ')}).`);
    return { generated: newBriefs.length };
  } catch (e) {
    console.warn(`[chapter-briefs] generateRollingBriefs threw:`, e instanceof Error ? e.message : String(e));
    return { generated: 0 };
  }
}

/**
 * Read briefs for chapter N + N+1 + N+2 (future-aware context for Architect).
 * Returns formatted block.
 */
export async function getRollingBriefsContext(
  projectId: string,
  currentChapter: number,
): Promise<string | null> {
  try {
    const db = getSupabase();
    const { data: arcPlan } = await db
      .from('arc_plans')
      .select('chapter_briefs')
      .eq('project_id', projectId)
      .lte('start_chapter', currentChapter)
      .gte('end_chapter', currentChapter)
      .order('arc_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!arcPlan) return null;

    const briefs = (arcPlan.chapter_briefs || []) as Array<{ chapterNumber: number; brief: string; sceneDirection?: string }>;
    const futureBriefs = briefs
      .filter(b => b.chapterNumber > currentChapter && b.chapterNumber <= currentChapter + 3)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    if (futureBriefs.length === 0) return null;

    const lines: string[] = [
      '[CHƯƠNG TIẾP THEO — DỰ KIẾN, để Architect plant seeds + tránh dead-end scene]',
    ];

    for (const b of futureBriefs) {
      lines.push(`\n📋 Ch.${b.chapterNumber}:`);
      if (b.sceneDirection) lines.push(`   Direction: ${b.sceneDirection}`);
      lines.push(`   Brief: ${b.brief.slice(0, 400)}`);
    }

    lines.push('\n→ Khi viết chương hiện tại, plant seeds cho 1-2 events trong các chương trên. Tránh tạo scenes "dead-end" không dẫn đến đâu.');
    return lines.join('\n');
  } catch (e) {
    console.warn(`[chapter-briefs] getRollingBriefsContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
