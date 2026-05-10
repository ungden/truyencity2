/**
 * Blueprint sync — UNIFIED. Writes a NovelBlueprint into the
 * `chapter_blueprints` table (Codex's storage layer, single source of truth).
 *
 * Storage strategy (post 2026-05-10 unification):
 *   - 1 row per chapter in `chapter_blueprints` (Codex schema)
 *   - DB columns hold position + story + mechanics + lifecycle + forbidden_terms[]
 *   - JSONB `meta` holds Claude's authoring fields: beat, scenes, mcBenefit,
 *     threadsAdvance/Resolve/new, riskGuidance, toneDirectives, novelExtraBans
 *   - `arc_plans.plan_text` keeps arc-level context (sub-arcs + tone)
 *   - `arc_plans.chapter_briefs[]` JSONB DEPRECATED (legacy fallback only)
 *
 * Lifecycle:
 *   - Sync upserts rows with status='planned' + version
 *   - Writer marks status='used' after `markChapterBlueprintUsed`
 *   - Sync also updates `story_blueprint_runs` row with coverage status
 *   - Optionally sets `style_directives.require_full_chapter_blueprint=true` +
 *     `chapter_blueprint_version=N` on the project to gate writer
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NovelBlueprint,
  ChapterBrief,
  ArcSkeleton,
} from './types';
import {
  UNIVERSAL_FORBIDDEN_TERMS,
  UNIVERSAL_BANNED_PATTERNS,
  UNIVERSAL_TONE_DIRECTIVES,
} from './universal-bans';

export interface SyncOptions {
  /**
   * Set to true to flip writer over to chapter_blueprints path:
   *   style_directives.require_full_chapter_blueprint = true
   *   style_directives.chapter_blueprint_version = version
   * Pre-flip writer falls back to legacy arc_plans.chapter_briefs.
   */
  activate?: boolean;
  /** Blueprint version (default 1). Codex uses for migrations + repairs. */
  version?: number;
  /**
   * Optional — if true, also sync arc_plans.plan_text + sub_arcs (arc-level
   * context for older flash-cheap-routine path that loads arc plan).
   * Default: true (writer still uses arc plan for synopsis context).
   */
  syncArcPlanContext?: boolean;
}

export interface SyncResult {
  arcsSynced: number;
  briefsSynced: number;
  arcsSkipped: number;
  coverageOk: boolean;
  missingChapters: number[];
  invalidChapters: number[];
}

function findSubArcNumber(arc: ArcSkeleton, chapterN: number): number {
  const sub = arc.subArcs.find((s) => chapterN >= s.range[0] && chapterN <= s.range[1]);
  return sub?.number ?? 0;
}

function composeForbiddenTerms(brief: ChapterBrief, blueprint: NovelBlueprint): string[] {
  const merged = new Set<string>();
  for (const t of UNIVERSAL_FORBIDDEN_TERMS) merged.add(t);
  for (const t of blueprint.extraForbiddenTerms || []) merged.add(t);
  for (const t of brief.forbiddenTerms || []) merged.add(t);
  return Array.from(merged);
}

function buildSceneDirection(brief: ChapterBrief, blueprint: NovelBlueprint): string {
  // High-level guidance (NOT literal terms) — goes into prompt as instructions.
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

function briefToBlueprintRow(
  brief: ChapterBrief,
  arc: ArcSkeleton,
  blueprint: NovelBlueprint,
  projectId: string,
  version: number,
): Record<string, unknown> {
  const subArcNumber = brief.subArcNumber ?? findSubArcNumber(arc, brief.n);
  // Support legacy briefs that only have `brief` (1-line) — promote to goal.
  const goal = brief.goal || brief.brief || `Ch.${brief.n}: ${arc.theme}`;
  const payoff = brief.payoff || brief.mcBenefit;
  return {
    project_id: projectId,
    chapter_number: brief.n,
    volume_number: brief.volumeNumber ?? null,
    arc_number: brief.arcNumber ?? arc.arcNumber,
    sub_arc_number: subArcNumber || null,
    title_hint: brief.titleHint ?? null,
    goal,
    conflict: brief.conflict ?? null,
    payoff,
    ending_hook: brief.endingHook ?? null,
    cast: brief.cast ?? [],
    location: brief.location ?? null,
    resource_ledger_delta: brief.resourceLedgerDelta ?? null,
    world_state_delta: brief.worldStateDelta ?? null,
    species_delta: brief.speciesDelta ?? null,
    template_inspiration: brief.templateInspiration ?? null,
    authority_constraints: brief.authorityConstraints ?? null,
    forbidden_terms: composeForbiddenTerms(brief, blueprint),
    status: 'planned',
    version,
    actual_summary_delta: null,
    meta: {
      beat: brief.beat,
      scenes: brief.scenes,
      mcBenefit: brief.mcBenefit,
      threadsAdvance: brief.threadsAdvance ?? [],
      threadsResolve: brief.threadsResolve ?? [],
      newThreads: brief.newThreads ?? [],
      sceneDirection: buildSceneDirection(brief, blueprint),
      riskGuidance: brief.risks ?? [],
      noveExtraBans: blueprint.extraBannedPatterns ?? [],
      toneDirectives: [...UNIVERSAL_TONE_DIRECTIVES, ...(blueprint.toneDirectives || [])],
      authoredBy: 'unified_blueprint_sync_v1',
    },
    updated_at: new Date().toISOString(),
  };
}

function buildArcPlanText(arc: ArcSkeleton, blueprint: NovelBlueprint): string {
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

async function syncArcPlanContext(
  db: SupabaseClient,
  projectId: string,
  arc: ArcSkeleton,
  blueprint: NovelBlueprint,
): Promise<void> {
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
    plan_text: buildArcPlanText(arc, blueprint),
    sub_arcs: subArcs,
    // chapter_briefs[] DEPRECATED — single source of truth is chapter_blueprints table
    chapter_briefs: [],
    threads_to_advance: [],
    threads_to_resolve: [],
    new_threads: [],
  };
  const { error } = await db.from('arc_plans').upsert(row, { onConflict: 'project_id,arc_number' });
  if (error) throw new Error(`Arc ${arc.arcNumber} plan upsert failed: ${error.message}`);
}

async function syncChapterBlueprints(
  db: SupabaseClient,
  projectId: string,
  arc: ArcSkeleton,
  briefs: ChapterBrief[],
  blueprint: NovelBlueprint,
  version: number,
): Promise<number> {
  if (briefs.length === 0) return 0;
  const rows = briefs.map((b) => briefToBlueprintRow(b, arc, blueprint, projectId, version));
  const { error } = await db.from('chapter_blueprints').upsert(rows, {
    onConflict: 'project_id,chapter_number',
  });
  if (error) throw new Error(`chapter_blueprints upsert (arc ${arc.arcNumber}) failed: ${error.message}`);
  return rows.length;
}

async function recomputeCoverage(
  db: SupabaseClient,
  projectId: string,
  totalChapters: number,
  version: number,
): Promise<{ ok: boolean; generatedChapters: number; missingChapters: number[]; invalidChapters: number[] }> {
  const { data, error } = await db
    .from('chapter_blueprints')
    .select('chapter_number,status')
    .eq('project_id', projectId)
    .eq('version', version)
    .gte('chapter_number', 1)
    .lte('chapter_number', totalChapters);
  if (error) throw new Error(`coverage query failed: ${error.message}`);
  const seen = new Set<number>();
  const invalid: number[] = [];
  for (const row of data || []) {
    const ch = Number(row.chapter_number);
    seen.add(ch);
    if (row.status === 'invalid') invalid.push(ch);
  }
  const missing: number[] = [];
  for (let ch = 1; ch <= totalChapters; ch++) {
    if (!seen.has(ch)) missing.push(ch);
  }
  return {
    ok: missing.length === 0 && invalid.length === 0,
    generatedChapters: seen.size,
    missingChapters: missing,
    invalidChapters: invalid,
  };
}

async function upsertRunRecord(
  db: SupabaseClient,
  projectId: string,
  totalChapters: number,
  generatedChapters: number,
  version: number,
  coverageOk: boolean,
  missingChapters: number[],
  invalidChapters: number[],
): Promise<void> {
  const status = coverageOk ? 'valid' : 'invalid';
  const { error } = await db.from('story_blueprint_runs').upsert({
    project_id: projectId,
    target_chapters: totalChapters,
    generated_chapters: generatedChapters,
    version,
    status,
    coverage_ok: coverageOk,
    last_error: coverageOk ? null : `missing=${missingChapters.slice(0, 20).join(',')} invalid=${invalidChapters.slice(0, 20).join(',')}`,
    meta: {
      checked_at: new Date().toISOString(),
      missing_count: missingChapters.length,
      invalid_count: invalidChapters.length,
      sync_source: 'unified_blueprint_sync_v1',
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,version' });
  if (error) throw new Error(`story_blueprint_runs upsert failed: ${error.message}`);
}

async function activateProject(
  db: SupabaseClient,
  projectId: string,
  version: number,
): Promise<void> {
  const { data: project, error: getErr } = await db
    .from('ai_story_projects')
    .select('style_directives')
    .eq('id', projectId)
    .maybeSingle();
  if (getErr) throw new Error(`project fetch failed: ${getErr.message}`);
  const styleDirectives = (project?.style_directives as Record<string, unknown>) || {};
  const updated = {
    ...styleDirectives,
    require_full_chapter_blueprint: true,
    chapter_blueprint_version: version,
  };
  const { error } = await db
    .from('ai_story_projects')
    .update({ style_directives: updated, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw new Error(`project activate failed: ${error.message}`);
}

/**
 * Sync entire blueprint to DB.
 *
 * @param db Supabase client (service-role)
 * @param projectId ai_story_projects.id
 * @param blueprint NovelBlueprint with all arcs
 * @param options activate flag, version, syncArcPlanContext
 * @returns result with coverage stats
 */
export async function syncBlueprintToDb(
  db: SupabaseClient,
  projectId: string,
  blueprint: NovelBlueprint,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const version = options.version ?? 1;
  const syncArcContext = options.syncArcPlanContext !== false;
  let briefsSynced = 0;
  let arcsSynced = 0;
  let arcsSkipped = 0;

  for (const arcBlueprint of blueprint.arcs) {
    if (arcBlueprint.briefs.length === 0) {
      arcsSkipped++;
      continue;
    }
    if (syncArcContext) {
      await syncArcPlanContext(db, projectId, arcBlueprint.arc, blueprint);
    }
    const count = await syncChapterBlueprints(
      db,
      projectId,
      arcBlueprint.arc,
      arcBlueprint.briefs,
      blueprint,
      version,
    );
    briefsSynced += count;
    arcsSynced++;
  }

  const coverage = await recomputeCoverage(db, projectId, blueprint.totalChapters, version);
  await upsertRunRecord(
    db,
    projectId,
    blueprint.totalChapters,
    coverage.generatedChapters,
    version,
    coverage.ok,
    coverage.missingChapters,
    coverage.invalidChapters,
  );

  if (options.activate) {
    if (!coverage.ok) {
      throw new Error(`Cannot activate: blueprint coverage incomplete (${coverage.generatedChapters}/${blueprint.totalChapters}). Missing: ${coverage.missingChapters.slice(0, 10).join(',')}`);
    }
    await activateProject(db, projectId, version);
  }

  return {
    arcsSynced,
    briefsSynced,
    arcsSkipped,
    coverageOk: coverage.ok,
    missingChapters: coverage.missingChapters,
    invalidChapters: coverage.invalidChapters,
  };
}
