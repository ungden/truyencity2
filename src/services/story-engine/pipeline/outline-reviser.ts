/**
 * Story Engine v2 — Outline Auto-Reviser (Phase 28 TIER 3.1)
 *
 * Safety net for long-form drift. When quality_trends shows critical drift
 * for 3+ consecutive snapshots OR first_10_evaluations.verdict='fail', the
 * project's outline is auto-revised:
 *
 *   1. Pause project (status='paused', pause_reason='outline_auto_revision')
 *   2. Read last 50 written chapters' summaries + canonical state
 *   3. AI revises master_outline.volumes[currentVolume+1..end]:
 *      - Keep current volume + completed volumes intact (already canon)
 *      - Adjust upcoming volumes to align with what actually happened
 *      - Preserve story-vision (mainPlotline, finalGoal)
 *   4. Persist revised master_outline + log revision history
 *   5. Resume project (status='active')
 *
 * Đại thần workflow mapping:
 *   "留白" — top web novel authors continuously revise outlines as the story
 *   evolves. They DON'T rigidly follow ch.1 outline at ch.500 — they ADJUST.
 *   Without this, AI either drifts then crashes or rigidly forces a stale plan.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';
import type { MasterOutline, VolumeOutline } from '../plan/master-outline';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RevisionResult {
  triggered: boolean;
  reason: string;
  volumesRevised: number;
  durationMs: number;
}

interface OutlineRevisionAIResponse {
  revisedVolumes?: VolumeOutline[];
  rationale?: string;
}

// ── Trigger detection ────────────────────────────────────────────────────────

/**
 * Check if a project meets revision triggers:
 *   - quality_trends critical for 3+ consecutive snapshots
 *   - OR first_10_evaluations.verdict = 'fail'
 *
 * Returns trigger reason string or null.
 */
export async function detectRevisionTrigger(projectId: string): Promise<string | null> {
  try {
    const db = getSupabase();

    // Check first-10 fail.
    const { data: first10 } = await db
      .from('first_10_evaluations')
      .select('verdict')
      .eq('project_id', projectId)
      .maybeSingle();
    if (first10?.verdict === 'fail') {
      return `first_10_evaluations verdict=fail`;
    }

    // Check quality_trends 3+ consecutive critical.
    const { data: trends } = await db
      .from('quality_trends')
      .select('snapshot_date,alert_level,drift,recent_avg_score')
      .eq('project_id', projectId)
      .order('snapshot_date', { ascending: false })
      .limit(3);
    if (trends?.length === 3 && trends.every(t => t.alert_level === 'critical')) {
      const avgDrift = trends.reduce((s, t) => s + (Number(t.drift) || 0), 0) / 3;
      return `quality_trends critical 3 consecutive snapshots (avg drift ${avgDrift.toFixed(2)})`;
    }

    return null;
  } catch (e) {
    console.warn(`[outline-reviser] detectRevisionTrigger threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Revision workflow ────────────────────────────────────────────────────────

/**
 * Run outline revision: pause → revise → resume. Idempotent with respect to
 * concurrent triggers (uses pause_reason as a soft lock).
 */
export async function runOutlineRevision(
  projectId: string,
  trigger: string,
  config: GeminiConfig,
): Promise<RevisionResult> {
  const startTime = Date.now();
  const db = getSupabase();

  try {
    // Soft-lock: pause project if not already paused for this reason.
    const { data: project } = await db
      .from('ai_story_projects')
      .select('id,status,pause_reason,master_outline,current_chapter,genre,total_planned_chapters,main_character,world_description')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      return { triggered: false, reason: 'project not found', volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    if (project.pause_reason?.startsWith('outline_auto_revision')) {
      return { triggered: false, reason: 'already revising (soft-locked)', volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    // Pause project.
    const { error: pauseErr } = await db
      .from('ai_story_projects')
      .update({
        status: 'paused',
        pause_reason: `outline_auto_revision: ${trigger}`,
        paused_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (pauseErr) {
      return { triggered: false, reason: `pause failed: ${pauseErr.message}`, volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    console.log(`[outline-reviser] Paused project ${projectId} for revision. Trigger: ${trigger}`);

    const masterOutline = project.master_outline as MasterOutline | null;
    if (!masterOutline?.volumes?.length) {
      // No volumes to revise — resume immediately.
      await db.from('ai_story_projects').update({ status: 'active', pause_reason: null }).eq('id', projectId);
      return { triggered: false, reason: 'no volumes in master_outline (legacy structure)', volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    const currentChapter = project.current_chapter || 0;
    const currentVolumeIdx = masterOutline.volumes.findIndex(v =>
      currentChapter >= v.startChapter && currentChapter <= v.endChapter,
    );
    const lockedVolumes = masterOutline.volumes.slice(0, Math.max(0, currentVolumeIdx + 1));
    const upcomingVolumes = masterOutline.volumes.slice(currentVolumeIdx + 1);

    if (upcomingVolumes.length === 0) {
      // Nothing to revise (we're in the last volume).
      await db.from('ai_story_projects').update({ status: 'active', pause_reason: null }).eq('id', projectId);
      return { triggered: false, reason: 'in last volume — nothing to revise', volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    // Load recent 50 chapter summaries for grounding.
    const { data: recentSummaries } = await db
      .from('chapter_summaries')
      .select('chapter_number,title,summary,cliffhanger,mc_state')
      .eq('project_id', projectId)
      .lte('chapter_number', currentChapter)
      .order('chapter_number', { ascending: false })
      .limit(50);

    const recentText = (recentSummaries || [])
      .reverse()
      .map(s => `Ch.${s.chapter_number} "${s.title}": ${s.summary} | MC state: ${s.mc_state || '?'}`)
      .join('\n');

    // Get current volume context.
    const currentVol = masterOutline.volumes[currentVolumeIdx];
    const lockedVolBrief = lockedVolumes
      .map(v => `Vol ${v.volumeNumber} "${v.name}" (ch.${v.startChapter}-${v.endChapter}): ${v.theme}; conflict: ${v.primaryConflict}`)
      .join('\n');

    const prompt = `Bạn là Master Editor — REVISE outline cho một bộ truyện đang viết. Quality drift đã trigger revision (lý do: ${trigger}).

NHIỆM VỤ: GIỮ NGUYÊN current/past volumes (đã canon). REVISE upcoming volumes để align với những gì THỰC SỰ đã xảy ra trong recent chapters.

CONTEXT:
- Genre: ${project.genre}
- MC: ${project.main_character}
- Total planned: ${project.total_planned_chapters} chương
- Current chapter: ${currentChapter}
- Trigger: ${trigger}
- Main plotline: ${masterOutline.mainPlotline}
- Final goal: ${masterOutline.finalBossOrGoal}

LOCKED VOLUMES (đã viết hoặc đang viết, KHÔNG sửa):
${lockedVolBrief}

CURRENT VOLUME (đang ở giữa):
Vol ${currentVol.volumeNumber} "${currentVol.name}" (ch.${currentVol.startChapter}-${currentVol.endChapter})
Theme: ${currentVol.theme}
Conflict: ${currentVol.primaryConflict}
Climax at: ch.${currentVol.volumeClimaxAt}

UPCOMING VOLUMES TO REVISE (${upcomingVolumes.length} volumes from ${upcomingVolumes[0].startChapter} to ${upcomingVolumes[upcomingVolumes.length - 1].endChapter}):
${upcomingVolumes.map(v => `Vol ${v.volumeNumber} "${v.name}" (ch.${v.startChapter}-${v.endChapter}): ${v.theme}; conflict: ${v.primaryConflict}; climax ch.${v.volumeClimaxAt}`).join('\n')}

50 CHƯƠNG GẦN NHẤT (sự thật những gì đã xảy ra):
${recentText.slice(0, 12000)}

Trả về JSON:
{
  "revisedVolumes": [
    {
      "volumeNumber": <giữ nguyên>,
      "name": "<tên có thể đổi nếu cần fit narrative>",
      "startChapter": <giữ nguyên>,
      "endChapter": <giữ nguyên>,
      "theme": "<có thể đổi để fit current trajectory>",
      "primaryConflict": "<có thể đổi>",
      "primaryVillain": "<có thể đổi>",
      "keyPayoffsOpened": [...],
      "keyPayoffsClosed": [...],
      "volumeClimaxAt": <số chương>,
      "subArcs": [
        {
          "arcName": "...",
          "arcNumber": ...,
          "startChapter": ...,
          "endChapter": ...,
          "description": "...",
          "keyMilestone": "...",
          "theme": "...",
          "mood": "...",
          "biggestSetpiece": "...",
          "characterArcBeat": "...",
          "worldExpansion": "...",
          "pacingTarget": "...",
          "mediumClimaxAt": ...
        }
      ]
    }
    // ALL upcoming volumes — same number as upcoming, same chapter ranges, same volumeNumbers
  ],
  "rationale": "<2-3 câu giải thích revision logic>"
}

QUY TẮC:
1. KHÔNG đổi mainPlotline, finalGoal, genre.
2. KHÔNG đổi volumeNumber, startChapter, endChapter của upcoming volumes (chapter ranges đã planned).
3. CÓ THỂ đổi: theme, primaryConflict, primaryVillain, keyPayoffs, climax positions, sub-arc structure.
4. Revision phải REFLECT what actually happened (vd nếu MC đã become powerful sớm hơn outline → upcoming arc 5 villain phải scale up; nếu MC's relationship đã settle khác outline → revise romance arc).
5. PRESERVE story trajectory đến finalGoal — adjustments không được phá overall arc.
6. SAME number of volumes as upcoming (${upcomingVolumes.length} volumes, mỗi volume có 4-6 sub-arcs).`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.4, maxTokens: 16384 },
      { jsonMode: true, tracking: { projectId, task: 'outline_revision' } },
    );

    if (!res.content) {
      // Resume even on failure — admin can manually re-run.
      await db.from('ai_story_projects').update({ status: 'active', pause_reason: null }).eq('id', projectId);
      return { triggered: true, reason: 'AI returned empty', volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    const parsed = parseJSON<OutlineRevisionAIResponse>(res.content);
    if (!parsed?.revisedVolumes?.length) {
      await db.from('ai_story_projects').update({ status: 'active', pause_reason: null }).eq('id', projectId);
      return { triggered: true, reason: 'AI parse failed', volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    // Validate revised volumes match upcoming structure.
    const expectedVolNumbers = new Set(upcomingVolumes.map(v => v.volumeNumber));
    const actualVolNumbers = new Set(parsed.revisedVolumes.map(v => v.volumeNumber));
    if (expectedVolNumbers.size !== actualVolNumbers.size) {
      await db.from('ai_story_projects').update({ status: 'active', pause_reason: null }).eq('id', projectId);
      return { triggered: true, reason: `volume count mismatch (expected ${expectedVolNumbers.size}, got ${actualVolNumbers.size})`, volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    // Stitch back: locked volumes + revised volumes.
    const newOutline: MasterOutline = {
      ...masterOutline,
      volumes: [...lockedVolumes, ...parsed.revisedVolumes],
      // Auto-flatten majorArcs from new volumes (keeping the locked-volume arcs intact).
      majorArcs: [
        ...lockedVolumes.flatMap(v => v.subArcs || []),
        ...parsed.revisedVolumes.flatMap(v => v.subArcs || []),
      ].map((sub, i) => ({ ...sub, arcNumber: i + 1 })),
    };

    // Persist + log revision history (in pause_reason temporarily; consider new table later).
    const { error: persistErr } = await db
      .from('ai_story_projects')
      .update({
        master_outline: newOutline as unknown as Record<string, unknown>,
        status: 'active',
        pause_reason: null,
      })
      .eq('id', projectId);
    if (persistErr) {
      return { triggered: true, reason: `persist failed: ${persistErr.message}`, volumesRevised: 0, durationMs: Date.now() - startTime };
    }

    console.log(`[outline-reviser] Revised ${parsed.revisedVolumes.length} volumes for project ${projectId}. Rationale: ${parsed.rationale}`);
    return {
      triggered: true,
      reason: `revised ${parsed.revisedVolumes.length} volumes — ${parsed.rationale || ''}`.slice(0, 500),
      volumesRevised: parsed.revisedVolumes.length,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    // On error: try to resume project so it doesn't stay paused.
    try {
      await db.from('ai_story_projects').update({ status: 'active', pause_reason: null }).eq('id', projectId);
    } catch {
      // best effort
    }
    return {
      triggered: true,
      reason: `exception: ${e instanceof Error ? e.message : String(e)}`,
      volumesRevised: 0,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Cron entry point: scan all active projects for revision triggers, run revision
 * sequentially (not in parallel — outline revision is heavy AI work).
 */
export async function scanAndReviseDriftedProjects(
  config: GeminiConfig,
): Promise<{ scanned: number; triggered: number; revised: number }> {
  const stats = { scanned: 0, triggered: 0, revised: 0 };
  try {
    const db = getSupabase();
    const { data: projects } = await db
      .from('ai_story_projects')
      .select('id')
      .eq('status', 'active');
    if (!projects?.length) return stats;

    for (const p of projects) {
      stats.scanned++;
      const trigger = await detectRevisionTrigger(p.id);
      if (!trigger) continue;
      stats.triggered++;
      const result = await runOutlineRevision(p.id, trigger, config);
      if (result.volumesRevised > 0) stats.revised++;
    }
  } catch (e) {
    console.warn(`[outline-reviser] scanAndReviseDriftedProjects threw:`, e instanceof Error ? e.message : String(e));
  }
  return stats;
}
