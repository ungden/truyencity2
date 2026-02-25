/**
 * Story Engine v2 — Summary Manager
 *
 * Handles post-write summary generation and synopsis updates.
 * Extracted from v2 context-assembler.ts to keep that file focused on pre-write loading.
 *
 * All AI generators are already in context-assembler.ts (generateChapterSummary, generateSynopsis, etc).
 * This module provides the orchestration logic for when to trigger each generator.
 */

import {
  saveChapterSummary,
  generateChapterSummary,
  generateSummaryAndCharacters,
  generateSynopsis,
  generateArcPlan,
  generateStoryBible,
} from '../pipeline/context-assembler';
import type { CombinedSummaryAndCharacters } from '../pipeline/context-assembler';
import { getSupabase } from '../utils/supabase';
import { generateForeshadowingAgenda } from './foreshadowing-planner';
import { generatePacingBlueprint } from './pacing-director';
import { initializeWorldMap } from './world-expansion-tracker';
import type { GeminiConfig, GenreType } from '../types';

// ── Trigger Thresholds ───────────────────────────────────────────────────────

const SYNOPSIS_INTERVAL = 5;    // Regenerate synopsis every 5 chapters (V1 parity)
const ARC_SIZE = 20;            // Chapters per arc
const BIBLE_TRIGGER = 3;        // Generate bible after chapter 3
const BIBLE_REFRESH_INTERVAL = 150; // Refresh bible every 150 chapters

// ── Public: Run All Post-Write Summary Tasks ─────────────────────────────────

/**
 * After a chapter is written and saved, run all summary-related post-write tasks.
 * This handles:
 * 1. Always: generate + save chapter summary
 * 2. Conditionally: update synopsis (every 5 chapters)
 * 3. Conditionally: generate new arc plan (at arc boundaries)
 * 4. Conditionally: generate/refresh story bible (ch.3, then every 150)
 *
 * Returns void. All tasks are non-fatal.
 */
/**
 * Run all summary tasks. Returns combined result so orchestrator can reuse
 * character extraction data (avoids separate AI call for character states).
 */
export async function runSummaryTasks(
  projectId: string,
  novelId: string,
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
  genre: GenreType,
  totalPlannedChapters: number,
  worldDescription: string,
  config: GeminiConfig,
): Promise<CombinedSummaryAndCharacters | null> {
  let combinedResult: CombinedSummaryAndCharacters | null = null;
  try {
    const isLikelyFinale = shouldBeFinaleArc(chapterNumber, totalPlannedChapters);

    // 1. CRITICAL: combined summary + character extraction (single AI call)
    let summarySaved = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        combinedResult = await generateSummaryAndCharacters(
          chapterNumber,
          title,
          content,
          protagonistName,
          config,
          { allowEmptyCliffhanger: isLikelyFinale },
        );
        await saveChapterSummary(projectId, chapterNumber, title, combinedResult.summary);
        summarySaved = true;
        break;
      } catch (summaryErr) {
        console.warn(
          `[SummaryManager] Chapter ${chapterNumber} combined summary attempt ${attempt}/3 failed:`,
          summaryErr instanceof Error ? summaryErr.message : String(summaryErr),
        );
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
      }
    }
    if (!summarySaved) {
      console.error(`[SummaryManager] Chapter ${chapterNumber} summary FAILED after 3 retries`);
    }

    // 2. Synopsis: every SYNOPSIS_INTERVAL chapters
    if (chapterNumber % SYNOPSIS_INTERVAL === 0) {
      await tryUpdateSynopsis(projectId, chapterNumber, genre, protagonistName, config);
    }

    // 3. Arc plan: at end of each arc, generate plan for NEXT arc
    //    e.g., at chapter 20 generate arc 2 plan, at chapter 40 generate arc 3 plan
    //    so the plan is ready BEFORE writing the first chapter of the new arc.
    if (chapterNumber % ARC_SIZE === 0) {
      const arcNumber = (chapterNumber / ARC_SIZE) + 1; // next arc
      await tryGenerateArcPlan(
        projectId, arcNumber, genre, protagonistName, totalPlannedChapters, config,
      );
    }

    // 3b. Quality module catch-up: on the first chapter of each arc (ch 21, 41, 61...),
    //     ensure quality modules exist for the CURRENT arc. This handles the case where
    //     arc plans were generated before quality module code was deployed, so their
    //     foreshadowing/pacing/worldmap were never created.
    if (chapterNumber > 1 && (chapterNumber - 1) % ARC_SIZE === 0) {
      const currentArc = Math.ceil(chapterNumber / ARC_SIZE);
      await tryEnsureQualityModules(
        projectId, currentArc, genre, totalPlannedChapters, config,
      );
    }

    // 4. Story Bible: generate at chapter 3, refresh periodically
    if (chapterNumber === BIBLE_TRIGGER) {
      await tryGenerateStoryBible(projectId, novelId, genre, protagonistName, worldDescription, config);
    } else if (chapterNumber > BIBLE_TRIGGER && chapterNumber % BIBLE_REFRESH_INTERVAL === 0) {
      await tryGenerateStoryBible(projectId, novelId, genre, protagonistName, worldDescription, config);
    }
  } catch {
    // Non-fatal: summary tasks should never crash chapter writing
  }
  return combinedResult;
}

// ── Internal: Synopsis ───────────────────────────────────────────────────────

async function tryUpdateSynopsis(
  projectId: string,
  chapterNumber: number,
  genre: GenreType,
  protagonistName: string,
  config: GeminiConfig,
): Promise<void> {
  try {
    const db = getSupabase();

    // Load existing synopsis
    const { data: synopsisRow } = await db
      .from('story_synopsis')
      .select('synopsis_text,last_updated_chapter')
      .eq('project_id', projectId)
      .order('last_updated_chapter', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastUpdated = synopsisRow?.last_updated_chapter || 0;

    // Load chapter summaries since last update
    const { data: summaries } = await db
      .from('chapter_summaries')
      .select('chapter_number,title,summary')
      .eq('project_id', projectId)
      .gt('chapter_number', lastUpdated)
      .lte('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: true });

    if (!summaries || summaries.length === 0) return;

    await generateSynopsis(
      projectId,
      synopsisRow?.synopsis_text,
      summaries,
      genre,
      protagonistName,
      chapterNumber,
      config,
    );
  } catch {
    // Non-fatal
  }
}

// ── Internal: Arc Plan ───────────────────────────────────────────────────────

async function tryGenerateArcPlan(
  projectId: string,
  arcNumber: number,
  genre: GenreType,
  protagonistName: string,
  totalPlanned: number,
  config: GeminiConfig,
): Promise<void> {
  try {
    const db = getSupabase();

    // Check if arc plan already exists
    const { data: existing } = await db
      .from('arc_plans')
      .select('arc_number')
      .eq('project_id', projectId)
      .eq('arc_number', arcNumber)
      .maybeSingle();

    // Load synopsis, bible, story_outline, and master_outline in one batch (B4 fix: no duplicate queries)
    const [{ data: synRow }, { data: projectRow }] = await Promise.all([
      db.from('story_synopsis').select('synopsis_text,open_threads').eq('project_id', projectId).order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
      db.from('ai_story_projects').select('story_bible,story_outline,master_outline').eq('id', projectId).maybeSingle(),
    ]);

    if (!existing) {
      // Generate arc plan if it doesn't exist yet
      // Extract StoryVision from story_outline for directional coherence
      let storyVision: { endingVision?: string; majorPlotPoints?: string[]; mainConflict?: string; endGoal?: string } | undefined;
      const outline = projectRow?.story_outline;
      if (outline && typeof outline === 'object') {
        storyVision = {
          endingVision: outline.endingVision,
          mainConflict: outline.mainConflict,
          endGoal: outline.protagonist?.endGoal,
          majorPlotPoints: outline.majorPlotPoints
            ?.map((p: any) => typeof p === 'string' ? p : p.description || p.name || JSON.stringify(p))
            ?.slice(0, 6),
        };
      }

      await generateArcPlan(
        projectId, arcNumber, genre, protagonistName,
        synRow?.synopsis_text, projectRow?.story_bible,
        totalPlanned, config,
        storyVision,
      );
    }

    // ── Arc-triggered quality module generation (all non-fatal) ──────────
    // IMPORTANT: These run regardless of whether arc plan already existed.
    // Each module has its own internal guard (checks if data already exists).
    // This ensures quality modules are populated even for arcs whose plans
    // were generated before the quality module code was deployed.
    const arcStart = (arcNumber - 1) * ARC_SIZE + 1;
    const arcEnd = arcNumber * ARC_SIZE;

    // Reuse synRow (already loaded above) for open_threads
    const openThreads: string[] = synRow?.open_threads || [];

    // Load arc plan text for pacing blueprint
    const { data: arcPlanRow } = await db
      .from('arc_plans')
      .select('plan_text')
      .eq('project_id', projectId)
      .eq('arc_number', arcNumber)
      .maybeSingle();

    // Reuse projectRow (already loaded above) for master_outline
    const rawMO = projectRow?.master_outline;
    const masterOutlineStr: string | undefined = rawMO
      ? (typeof rawMO === 'string' ? rawMO : JSON.stringify(rawMO))
      : undefined;

    await Promise.all([
      generateForeshadowingAgenda(
        projectId, arcNumber, arcStart, arcEnd, totalPlanned,
        synRow?.synopsis_text, masterOutlineStr,
        openThreads, genre, config,
      ).catch((e) => console.warn(`[SummaryManager] Foreshadowing agenda failed for arc ${arcNumber}:`, e instanceof Error ? e.message : String(e))),

      generatePacingBlueprint(
        projectId, arcNumber, arcStart, arcEnd, genre,
        arcPlanRow?.plan_text, config,
      ).catch((e) => console.warn(`[SummaryManager] Pacing blueprint failed for arc ${arcNumber}:`, e instanceof Error ? e.message : String(e))),

      // World map: only initialize once (initializeWorldMap has internal guard)
      initializeWorldMap(
        projectId, masterOutlineStr, genre, totalPlanned, config,
      ).catch((e) => console.warn(`[SummaryManager] World map init failed:`, e instanceof Error ? e.message : String(e))),
    ]);
  } catch {
    // Non-fatal
  }
}

// ── Internal: Quality Module Catch-up ─────────────────────────────────────────

/**
 * Ensure quality modules (foreshadowing, pacing, worldmap) exist for a given arc.
 * Called on the first chapter of each arc to catch up any arcs that were planned
 * before the quality module code was deployed.
 * Each module has its own internal guard, so this is safe to call repeatedly.
 */
async function tryEnsureQualityModules(
  projectId: string,
  arcNumber: number,
  genre: GenreType,
  totalPlanned: number,
  config: GeminiConfig,
): Promise<void> {
  try {
    const db = getSupabase();
    const arcStart = (arcNumber - 1) * ARC_SIZE + 1;
    const arcEnd = arcNumber * ARC_SIZE;

    // Quick check: if all 3 modules already have data for this arc, skip entirely
    const [{ count: fhCount }, { count: pbCount }, { count: lbCount }] = await Promise.all([
      db.from('foreshadowing_plans').select('*', { count: 'exact', head: true })
        .eq('project_id', projectId).eq('arc_number', arcNumber),
      db.from('arc_pacing_blueprints').select('*', { count: 'exact', head: true })
        .eq('project_id', projectId).eq('arc_number', arcNumber),
      db.from('location_bibles').select('*', { count: 'exact', head: true })
        .eq('project_id', projectId),
    ]);

    if ((fhCount ?? 0) > 0 && (pbCount ?? 0) > 0 && (lbCount ?? 0) > 0) {
      return; // All modules already populated
    }

    // Load context needed by quality modules
    const [{ data: synRow }, { data: arcPlanRow }, { data: masterRow }, { data: synopsisRow }] = await Promise.all([
      db.from('story_synopsis').select('synopsis_text').eq('project_id', projectId)
        .order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
      db.from('arc_plans').select('plan_text').eq('project_id', projectId)
        .eq('arc_number', arcNumber).maybeSingle(),
      db.from('ai_story_projects').select('master_outline').eq('id', projectId).maybeSingle(),
      db.from('story_synopsis').select('open_threads').eq('project_id', projectId)
        .order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const openThreads: string[] = synopsisRow?.open_threads || [];
    const rawMO = masterRow?.master_outline;
    const masterOutlineStr: string | undefined = rawMO
      ? (typeof rawMO === 'string' ? rawMO : JSON.stringify(rawMO))
      : undefined;

    const tasks: Promise<void>[] = [];

    if ((fhCount ?? 0) === 0) {
      tasks.push(
        generateForeshadowingAgenda(
          projectId, arcNumber, arcStart, arcEnd, totalPlanned,
          synRow?.synopsis_text, masterOutlineStr,
          openThreads, genre, config,
        ).catch((e) => console.warn(`[SummaryManager] Catch-up foreshadowing arc ${arcNumber}:`, e instanceof Error ? e.message : String(e))),
      );
    }

    if ((pbCount ?? 0) === 0) {
      tasks.push(
        generatePacingBlueprint(
          projectId, arcNumber, arcStart, arcEnd, genre,
          arcPlanRow?.plan_text, config,
        ).catch((e) => console.warn(`[SummaryManager] Catch-up pacing arc ${arcNumber}:`, e instanceof Error ? e.message : String(e))),
      );
    }

    if ((lbCount ?? 0) === 0) {
      tasks.push(
        initializeWorldMap(
          projectId, masterOutlineStr, genre, totalPlanned, config,
        ).catch((e) => console.warn(`[SummaryManager] Catch-up worldmap:`, e instanceof Error ? e.message : String(e))),
      );
    }

    if (tasks.length > 0) {
      console.log(`[SummaryManager] Catch-up: generating ${tasks.length} quality modules for project ${projectId.slice(0, 8)} arc ${arcNumber}`);
      await Promise.all(tasks);
    }
  } catch {
    // Non-fatal
  }
}

// ── Internal: Story Bible ────────────────────────────────────────────────────

async function tryGenerateStoryBible(
  projectId: string,
  novelId: string,
  genre: GenreType,
  protagonistName: string,
  worldDescription: string,
  config: GeminiConfig,
): Promise<void> {
  try {
    const db = getSupabase();

    // Load synopsis and recent chapters for bible refresh (v1 feature)
    const [{ data: synRow }, { data: recentChapters }] = await Promise.all([
      db.from('story_synopsis').select('synopsis_text').eq('project_id', projectId).order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
      db.from('chapters').select('content,chapter_number').eq('novel_id', novelId).order('chapter_number', { ascending: false }).limit(10),
    ]);

    // Use synopsis + recent chapters if available, otherwise fall back to first 3
    let chapterContents: string[];
    if (recentChapters && recentChapters.length > 0) {
      chapterContents = recentChapters.reverse().map(c => c.content);
    } else {
      const { data: firstChapters } = await db
        .from('chapters')
        .select('content')
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: true })
        .limit(3);
      chapterContents = firstChapters?.map(c => c.content) || [];
    }

    if (chapterContents.length === 0) return;

    await generateStoryBible(
      projectId, genre, protagonistName, worldDescription,
      chapterContents, config,
      synRow?.synopsis_text,
    );
  } catch {
    // Non-fatal
  }
}

// ── Internal: Should Be Finale Arc Detection ─────────────────────────────────

/**
 * Detect if the story should enter the finale arc based on progress and synopsis.
 */
export function shouldBeFinaleArc(
  currentChapter: number,
  totalPlanned: number,
  openThreads?: string[],
): boolean {
  const progressPct = currentChapter / totalPlanned;
  const remaining = totalPlanned - currentChapter;

  // Hard rules for finale
  if (remaining <= 10) return true;
  if (progressPct >= 0.95) return true;

  // Soft: if approaching end and most threads resolved
  if (progressPct >= 0.85 && (!openThreads || openThreads.length <= 2)) {
    return true;
  }

  return false;
}


