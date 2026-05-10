/**
 * Blueprint sync — writes a NovelBlueprint into `arc_plans` table for a project.
 *
 * For each arc in blueprint.arcs:
 *   1. Build per-chapter `chapter_briefs[]` with:
 *      - chapterNumber, brief, scenes, mcBenefit (concrete keywords required)
 *      - sub_arc_number (computed from arc.subArcs[].range)
 *      - sceneDirection = per-chapter risks + universal bans + tone directives
 *      - beat (setup/breathing/confront/big_wow/resolution)
 *   2. Build plan_text from arc theme + sub-arcs + universal bans + tone.
 *   3. Upsert arc_plans row by (project_id, arc_number).
 *
 * Engine reads:
 *   - chapter_briefs[i].brief (1 line goal)
 *   - chapter_briefs[i].sceneDirection (full BAN/TONE block)
 *   - chapter_briefs[i].mcBenefit (concrete payoff phrase)
 *   - chapter_briefs[i].scenes (4-7 scene phrases)
 *   - plan_text (arc-level context)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NovelBlueprint, ArcBlueprint, ChapterBrief, ArcSkeleton } from './types';
import { UNIVERSAL_BANNED_PATTERNS, UNIVERSAL_TONE_DIRECTIVES } from './universal-bans';

export interface SyncOptions {
  /** Optional — if true, preserve existing chapter_briefs for ch <= preserveBelow. */
  preserveBriefsBelow?: number;
}

export interface SyncResult {
  arcsSynced: number;
  briefsTotal: number;
  arcsSkipped: number;
}

function findSubArcNumber(arc: ArcSkeleton, chapterN: number): number {
  const sub = arc.subArcs.find((s) => chapterN >= s.range[0] && chapterN <= s.range[1]);
  return sub?.number ?? 0;
}

function buildSceneDirection(
  brief: ChapterBrief,
  blueprint: NovelBlueprint,
): string {
  const lines: string[] = [];
  if (brief.risks?.length) lines.push('CHAPTER RULES:', ...brief.risks.map((r) => `- ${r}`));
  lines.push('', 'UNIVERSAL BANS:', ...UNIVERSAL_BANNED_PATTERNS.map((b) => `- ${b}`));
  if (blueprint.extraBannedPatterns?.length) {
    lines.push('', `${blueprint.id.toUpperCase()} EXTRA BANS:`, ...blueprint.extraBannedPatterns.map((b) => `- ${b}`));
  }
  lines.push('', 'TONE:', ...UNIVERSAL_TONE_DIRECTIVES.map((t) => `- ${t}`));
  if (blueprint.toneDirectives?.length) {
    lines.push(...blueprint.toneDirectives.map((t) => `- ${t}`));
  }
  return lines.join('\n');
}

function transformBrief(
  brief: ChapterBrief,
  arc: ArcSkeleton,
  blueprint: NovelBlueprint,
): Record<string, unknown> {
  return {
    chapterNumber: brief.n,
    sub_arc_number: findSubArcNumber(arc, brief.n),
    brief: brief.brief,
    sceneDirection: buildSceneDirection(brief, blueprint),
    scenes: brief.scenes,
    mcBenefit: brief.mcBenefit,
    beat: brief.beat,
  };
}

function buildPlanText(arc: ArcSkeleton, blueprint: NovelBlueprint): string {
  const lines: string[] = [
    `ARC ${arc.arcNumber} (ch.${arc.range[0]}-${arc.range[1]}): ${arc.theme}`,
    `Core payoff: ${arc.corePayoff}`,
    '',
    'Sub-arcs:',
    ...arc.subArcs.map((s) => `  Sub-arc ${s.number} (ch.${s.range[0]}-${s.range[1]}): ${s.theme} — payoff: ${s.payoff}`),
    '',
    '*** UNIVERSAL BANS (apply EVERY chapter) ***',
    ...UNIVERSAL_BANNED_PATTERNS.map((b) => `- ${b}`),
  ];
  if (blueprint.extraBannedPatterns?.length) {
    lines.push('', `*** ${blueprint.id.toUpperCase()} EXTRA BANS ***`, ...blueprint.extraBannedPatterns.map((b) => `- ${b}`));
  }
  lines.push('', '*** TONE ***', ...UNIVERSAL_TONE_DIRECTIVES.map((t) => `- ${t}`));
  if (blueprint.toneDirectives?.length) {
    lines.push(...blueprint.toneDirectives.map((t) => `- ${t}`));
  }
  return lines.join('\n');
}

async function syncArc(
  db: SupabaseClient,
  projectId: string,
  arc: ArcSkeleton,
  briefs: ChapterBrief[],
  blueprint: NovelBlueprint,
  options: SyncOptions,
): Promise<number> {
  let mergedBriefs: ChapterBrief[] = briefs;
  if (options.preserveBriefsBelow && options.preserveBriefsBelow > 0) {
    const { data: existing } = await db
      .from('arc_plans')
      .select('chapter_briefs')
      .eq('project_id', projectId)
      .eq('arc_number', arc.arcNumber)
      .maybeSingle();
    const existingBriefs = (existing?.chapter_briefs as ChapterBrief[] || [])
      .filter((b) => typeof b.n === 'number' && b.n <= options.preserveBriefsBelow!);
    const incomingChapters = new Set(briefs.map((b) => b.n));
    const merged = [
      ...existingBriefs.filter((b) => !incomingChapters.has(b.n)),
      ...briefs,
    ].sort((a, b) => a.n - b.n);
    mergedBriefs = merged;
  }

  const transformed = mergedBriefs.map((b) => transformBrief(b, arc, blueprint));
  const subArcs = arc.subArcs.map((s) => ({
    sub_arc_number: s.number,
    chapter_range: `${s.range[0]}-${s.range[1]}`,
    theme: s.theme,
    payoff: s.payoff,
    start_chapter: s.range[0],
    end_chapter: s.range[1],
  }));

  const row = {
    project_id: projectId,
    arc_number: arc.arcNumber,
    start_chapter: arc.range[0],
    end_chapter: arc.range[1],
    arc_theme: arc.theme,
    plan_text: buildPlanText(arc, blueprint),
    sub_arcs: subArcs,
    chapter_briefs: transformed,
    threads_to_advance: [],
    threads_to_resolve: [],
    new_threads: [],
  };

  const { error } = await db.from('arc_plans').upsert(row, { onConflict: 'project_id,arc_number' });
  if (error) throw new Error(`Arc ${arc.arcNumber} upsert failed: ${error.message}`);
  return transformed.length;
}

/**
 * Sync entire blueprint to arc_plans table for a project.
 *
 * @param db Supabase client (service-role)
 * @param projectId ai_story_projects.id
 * @param blueprint NovelBlueprint with all arcs
 * @param options sync options (preserve existing briefs, etc.)
 */
export async function syncBlueprintToDb(
  db: SupabaseClient,
  projectId: string,
  blueprint: NovelBlueprint,
  options: SyncOptions = {},
): Promise<SyncResult> {
  let briefsTotal = 0;
  let arcsSynced = 0;
  let arcsSkipped = 0;
  for (const arcBlueprint of blueprint.arcs) {
    if (arcBlueprint.briefs.length === 0) {
      arcsSkipped++;
      continue;
    }
    const count = await syncArc(db, projectId, arcBlueprint.arc, arcBlueprint.briefs, blueprint, options);
    briefsTotal += count;
    arcsSynced++;
  }
  return { arcsSynced, briefsTotal, arcsSkipped };
}
