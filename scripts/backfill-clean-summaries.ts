/**
 * Backfill Clean Chapter Summaries — Phase Q 2026-05-13 root-cause fix
 *
 * Why: existing chapter_summaries rows for production_enabled novels were
 * captured under the OLD vague prompt ("trạng thái MC cuối chương" /
 * "tình huống chưa giải quyết") and may contain template patterns like
 * "ván cờ sinh tử bắt đầu" / "MC chuẩn bị tâm thế" in cliffhanger / mcState.
 * Those rows get loaded into the next chapter's bridge context, which then
 * pushes the next Architect toward static reflective openings — even after
 * we ship the new prompts. This script scrubs the bridge state for novels
 * that are about to write next so the new prompt rules can take effect
 * cleanly from chapter N+1 onward.
 *
 * Strategy:
 *   1. For each production_enabled project, load the LATEST chapter_summaries
 *      row (which is what the next bridge will read).
 *   2. If cliffhanger or mcState matches template patterns, fetch the actual
 *      chapter content, run extractConcreteEventFromTail / extractConcreteMcState
 *      to replace with concrete physical values, and update the row.
 *   3. Also scrub the previous 2-3 rows so [TÓM TẮT N CHƯƠNG GẦN NHẤT] and
 *      [CLIFFHANGER ĐÃ DÙNG — KHÔNG LẶP] arrays don't leak template few-shot.
 *
 * Heuristic — no AI calls needed. Pure deterministic regex + tail scan.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/backfill-clean-summaries.ts
 *   PROJECT_IDS="uuid1,uuid2" ./node_modules/.bin/tsx scripts/backfill-clean-summaries.ts
 *   SCAN_DEPTH=5 ./node_modules/.bin/tsx scripts/backfill-clean-summaries.ts  // scrub last N rows per project
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import {
  isTemplateCliffhanger,
  isTemplateMcState,
  extractConcreteEventFromTail,
  extractConcreteMcStateFromTail,
} from '../src/services/story-engine/context/generators';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const SCAN_DEPTH = Number.parseInt(process.env.SCAN_DEPTH || '3', 10);

interface Project {
  id: string;
  novel_id: string;
  current_chapter: number;
  main_character: string | null;
  novels: { title: string } | null;
}

interface SummaryRow {
  chapter_number: number;
  title: string;
  mc_state: string | null;
  cliffhanger: string | null;
}

async function loadTargetProjects(): Promise<Project[]> {
  const explicit = (process.env.PROJECT_IDS || '').trim();
  const ids = explicit ? explicit.split(',').map(s => s.trim()).filter(Boolean) : null;

  let query = supabase
    .from('ai_story_projects')
    .select('id, novel_id, current_chapter, main_character, novels(title)')
    .gt('current_chapter', 0);
  if (ids) {
    query = query.in('id', ids);
  } else {
    query = query.eq('style_directives->>production_enabled', 'true');
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Project[]) || [];
}

async function loadRecentSummaries(projectId: string, depth: number): Promise<SummaryRow[]> {
  const { data, error } = await supabase
    .from('chapter_summaries')
    .select('chapter_number, title, mc_state, cliffhanger')
    .eq('project_id', projectId)
    .order('chapter_number', { ascending: false })
    .limit(depth);
  if (error) throw error;
  return (data as SummaryRow[]) || [];
}

async function loadChapterContent(novelId: string, chapterNumber: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('chapters')
    .select('content')
    .eq('novel_id', novelId)
    .eq('chapter_number', chapterNumber)
    .maybeSingle();
  if (error) {
    console.warn(`  ! failed to load chapter ${chapterNumber}: ${error.message}`);
    return null;
  }
  return data?.content || null;
}

async function updateSummary(
  projectId: string,
  chapterNumber: number,
  patch: Partial<Pick<SummaryRow, 'mc_state' | 'cliffhanger'>>,
): Promise<void> {
  const { error } = await supabase
    .from('chapter_summaries')
    .update(patch)
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber);
  if (error) throw new Error(`update failed: ${error.message}`);
}

interface ProjectStats {
  scanned: number;
  cliffhangerScrubbed: number;
  mcStateScrubbed: number;
  noContent: number;
}

async function processProject(project: Project): Promise<ProjectStats> {
  const stats: ProjectStats = { scanned: 0, cliffhangerScrubbed: 0, mcStateScrubbed: 0, noContent: 0 };
  const protagonistName = project.main_character || 'MC';
  const summaries = await loadRecentSummaries(project.id, SCAN_DEPTH);
  if (summaries.length === 0) return stats;

  for (const s of summaries) {
    stats.scanned++;
    const needsCliffhangerFix = !!s.cliffhanger && isTemplateCliffhanger(s.cliffhanger);
    const needsMcStateFix = !!s.mc_state && isTemplateMcState(s.mc_state);
    if (!needsCliffhangerFix && !needsMcStateFix) continue;

    const content = await loadChapterContent(project.novel_id, s.chapter_number);
    if (!content) {
      stats.noContent++;
      continue;
    }

    const patch: Partial<Pick<SummaryRow, 'mc_state' | 'cliffhanger'>> = {};
    if (needsCliffhangerFix) {
      const concrete = extractConcreteEventFromTail(content);
      if (concrete) {
        patch.cliffhanger = concrete;
        stats.cliffhangerScrubbed++;
      }
    }
    if (needsMcStateFix) {
      const concrete = extractConcreteMcStateFromTail(content, protagonistName);
      if (concrete) {
        patch.mc_state = concrete;
        stats.mcStateScrubbed++;
      }
    }

    if (Object.keys(patch).length > 0) {
      try {
        await updateSummary(project.id, s.chapter_number, patch);
        console.log(`  ✓ ch.${s.chapter_number} scrubbed${patch.cliffhanger ? ' [cliffhanger]' : ''}${patch.mc_state ? ' [mcState]' : ''}`);
      } catch (err: any) {
        console.warn(`  ! ch.${s.chapter_number} update failed: ${err.message}`);
      }
    }
  }
  return stats;
}

async function main() {
  console.log(`[backfill-clean-summaries] SCAN_DEPTH=${SCAN_DEPTH}`);
  const projects = await loadTargetProjects();
  console.log(`[backfill-clean-summaries] ${projects.length} projects to scan`);

  let totalScanned = 0;
  let totalCliffhangers = 0;
  let totalMcStates = 0;

  for (const p of projects) {
    const title = p.novels?.title || '(no title)';
    console.log(`\n→ ${title} (${p.id.slice(0, 8)}) — ch.${p.current_chapter}`);
    try {
      const stats = await processProject(p);
      totalScanned += stats.scanned;
      totalCliffhangers += stats.cliffhangerScrubbed;
      totalMcStates += stats.mcStateScrubbed;
      console.log(`  Σ scanned=${stats.scanned} cliffhanger=${stats.cliffhangerScrubbed} mcState=${stats.mcStateScrubbed} noContent=${stats.noContent}`);
    } catch (err: any) {
      console.error(`  ✗ project failed: ${err.message}`);
    }
  }

  console.log(`\n[backfill-clean-summaries] DONE — scanned=${totalScanned} cliffhanger_scrubbed=${totalCliffhangers} mcState_scrubbed=${totalMcStates}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
