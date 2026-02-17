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
  generateSynopsis,
  generateArcPlan,
  generateStoryBible,
} from '../pipeline/context-assembler';
import { getSupabase } from '../utils/supabase';
import type { GeminiConfig, GenreType } from '../types';

// ── Trigger Thresholds ───────────────────────────────────────────────────────

const SYNOPSIS_INTERVAL = 20;   // Regenerate synopsis every 20 chapters
const ARC_SIZE = 20;            // Chapters per arc
const BIBLE_TRIGGER = 3;        // Generate bible after chapter 3
const BIBLE_REFRESH_INTERVAL = 150; // Refresh bible every 150 chapters

// ── Public: Run All Post-Write Summary Tasks ─────────────────────────────────

/**
 * After a chapter is written and saved, run all summary-related post-write tasks.
 * This handles:
 * 1. Always: generate + save chapter summary
 * 2. Conditionally: update synopsis (every 20 chapters)
 * 3. Conditionally: generate new arc plan (at arc boundaries)
 * 4. Conditionally: generate/refresh story bible (ch.3, then every 150)
 *
 * Returns void. All tasks are non-fatal.
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
): Promise<void> {
  try {
    // 1. Always: generate and save chapter summary
    const summary = await generateChapterSummary(
      chapterNumber, title, content, protagonistName, config,
    );
    await saveChapterSummary(projectId, chapterNumber, title, summary);

    // 2. Synopsis: every SYNOPSIS_INTERVAL chapters
    if (chapterNumber % SYNOPSIS_INTERVAL === 0) {
      await tryUpdateSynopsis(projectId, chapterNumber, genre, protagonistName, config);
    }

    // 3. Arc plan: at arc boundaries (start of new arc)
    if ((chapterNumber - 1) % ARC_SIZE === 0 && chapterNumber > 1) {
      const arcNumber = Math.ceil(chapterNumber / ARC_SIZE);
      await tryGenerateArcPlan(
        projectId, arcNumber, genre, protagonistName, totalPlannedChapters, config,
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

    if (existing) return; // Already planned

    // Load synopsis and bible for context
    const [{ data: synRow }, { data: bibleRow }] = await Promise.all([
      db.from('story_synopsis').select('synopsis_text').eq('project_id', projectId).order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
      db.from('ai_story_projects').select('story_bible').eq('id', projectId).maybeSingle(),
    ]);

    await generateArcPlan(
      projectId, arcNumber, genre, protagonistName,
      synRow?.synopsis_text, bibleRow?.story_bible,
      totalPlanned, config,
    );
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

    // Load first 3 chapters for bible generation
    const { data: chapters } = await db
      .from('chapters')
      .select('content')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true })
      .limit(3);

    if (!chapters || chapters.length === 0) return;

    await generateStoryBible(
      projectId, genre, protagonistName, worldDescription,
      chapters.map(c => c.content),
      config,
    );
  } catch {
    // Non-fatal
  }
}
