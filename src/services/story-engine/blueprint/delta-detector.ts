/**
 * Delta detector — compares actual chapter content (engine-extracted summary +
 * character_states + plot_threads) against blueprint plan (chapter_blueprints
 * row's goal/payoff/cast/forbidden_terms/meta).
 *
 * Detects AI inventions per chapter (new entities, items, plot threads not in
 * blueprint), classifies severity, optionally writes to
 * `chapter_blueprints[n].actual_summary_delta` for forward propagation.
 *
 * Usage: post-write hook called after `markChapterBlueprintUsed`.
 *
 * Severity classes:
 *   soft     — small detail change (timing, scene order, minor item)
 *              → accept silently, log only
 *   medium   — new minor entity/item not in blueprint
 *              → record in actual_summary_delta, surface in admin dashboard
 *   hard     — new major character, new plot thread crossing arc boundary,
 *              cosmic-tier element pulled forward
 *              → record + flag for human review
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { UNIVERSAL_COSMIC_PATTERNS, DEFAULT_COSMIC_ARC_START_FRACTION } from './universal-bans';

export type DeltaSeverity = 'soft' | 'medium' | 'hard';

export interface BlueprintDelta {
  type: 'new_entity' | 'new_item' | 'new_thread' | 'cosmic_pull_forward' | 'forbidden_term_used' | 'goal_mismatch';
  severity: DeltaSeverity;
  description: string;
  evidence?: string;
}

export interface DeltaReport {
  projectId: string;
  chapterNumber: number;
  deltas: BlueprintDelta[];
  hardCount: number;
  mediumCount: number;
  softCount: number;
  hasHardDeltas: boolean;
}

interface BlueprintRow {
  goal?: string | null;
  payoff?: string | null;
  cast?: string[] | null;
  forbidden_terms?: string[] | null;
  meta?: Record<string, unknown> | null;
}

interface SummaryRow {
  summary?: string | null;
  mc_state?: string | null;
  cliffhanger?: string | null;
}

interface CharacterStateRow {
  character_name?: string | null;
}

interface PlotThreadRow {
  name?: string | null;
  description?: string | null;
}

function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map((p) => new RegExp(p, 'i'));
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Common Vietnamese non-name capitalized words to exclude.
const NAME_BLACKLIST = new Set([
  'Cố Diệp', 'Cố Tiểu Đào', // already in core cast — added per-call
]);

function extractEntityNames(text: string | null | undefined): string[] {
  if (!text) return [];
  // Heuristic: capitalized 2-3 word sequences with WORD BOUNDARY at start —
  // avoids catching mid-word fragments. Each token must start with letter
  // followed by ≥2 chars (drops single-letter false positives).
  const matches = text.match(/(?:^|[\s.,;:!?"'()\n])([A-ZÀ-Ỵ][\p{Ll}]{2,}(?:\s+[A-ZÀ-Ỵ][\p{Ll}]{1,}){1,3})/gu) || [];
  const cleaned = matches
    .map((m) => m.replace(/^[\s.,;:!?"'()\n]+/, '').trim())
    .filter((m) => m.length >= 5 && m.split(/\s+/).length >= 2)
    .map(normalizeName);
  return Array.from(new Set(cleaned));
}

function detectCosmicPullForward(
  content: string,
  currentChapter: number,
  cosmicArcStart: number,
  patterns: RegExp[],
): BlueprintDelta[] {
  const deltas: BlueprintDelta[] = [];
  if (currentChapter >= cosmicArcStart) return deltas; // ok in cosmic arc
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match) {
      deltas.push({
        type: 'cosmic_pull_forward',
        severity: 'medium',
        description: `Cosmic-tier pattern "${match[0]}" appears at ch.${currentChapter} (cosmic arc starts ch.${cosmicArcStart}+)`,
        evidence: match[0],
      });
    }
  }
  return deltas;
}

function detectForbiddenTermsUsed(content: string, forbiddenTerms: string[]): BlueprintDelta[] {
  const deltas: BlueprintDelta[] = [];
  const lower = content.toLowerCase();
  for (const term of forbiddenTerms) {
    if (term && lower.includes(term.toLowerCase())) {
      deltas.push({
        type: 'forbidden_term_used',
        severity: 'hard',
        description: `Blueprint forbidden_term "${term}" appears in chapter content`,
        evidence: term,
      });
    }
  }
  return deltas;
}

function detectNewCast(
  summaryText: string,
  characterStates: CharacterStateRow[],
  blueprintCast: string[],
): BlueprintDelta[] {
  const deltas: BlueprintDelta[] = [];
  const blueprintNames = new Set(blueprintCast.map(normalizeName));
  const stateNames = (characterStates || [])
    .map((s) => s.character_name || '')
    .filter(Boolean)
    .map(normalizeName);
  const summaryNames = extractEntityNames(summaryText);
  const seen = new Set<string>();

  for (const name of [...stateNames, ...summaryNames]) {
    if (!name || name.length < 4) continue;
    if (blueprintNames.has(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    deltas.push({
      type: 'new_entity',
      severity: stateNames.includes(name) ? 'medium' : 'soft',
      description: `Character "${name}" appears in chapter (not in blueprint cast)`,
      evidence: name,
    });
  }
  return deltas;
}

function detectNewThreads(
  newPlotThreads: PlotThreadRow[],
  blueprintNewThreads: string[],
): BlueprintDelta[] {
  const deltas: BlueprintDelta[] = [];
  const planned = new Set(blueprintNewThreads.map((t) => t.toLowerCase()));
  for (const thread of newPlotThreads || []) {
    const name = (thread.name || '').toLowerCase();
    if (!name) continue;
    if (planned.has(name)) continue;
    let matched = false;
    for (const p of planned) {
      if (name.includes(p) || p.includes(name)) { matched = true; break; }
    }
    if (matched) continue;
    deltas.push({
      type: 'new_thread',
      severity: 'medium',
      description: `Plot thread "${thread.name}" introduced (not in blueprint plan)`,
      evidence: (thread.description?.slice(0, 200) || thread.name || '') as string,
    });
  }
  return deltas;
}

function detectGoalMismatch(summary: string, blueprintGoal: string, blueprintPayoff: string): BlueprintDelta[] {
  const deltas: BlueprintDelta[] = [];
  if (!summary || (!blueprintGoal && !blueprintPayoff)) return deltas;
  const lower = summary.toLowerCase();
  const goalKeywords = blueprintGoal
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['trong', 'chương', 'được', 'bằng', 'thành', 'nhận', 'một', 'cho'].includes(w))
    .slice(0, 8);
  const payoffKeywords = blueprintPayoff
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['trong', 'chương', 'được', 'bằng', 'thành', 'nhận', 'một', 'cho'].includes(w))
    .slice(0, 8);
  const goalHits = goalKeywords.filter((k) => lower.includes(k)).length;
  const payoffHits = payoffKeywords.filter((k) => lower.includes(k)).length;
  if (goalKeywords.length >= 3 && goalHits === 0 && payoffHits === 0) {
    deltas.push({
      type: 'goal_mismatch',
      severity: 'hard',
      description: `Chapter summary missing both goal and payoff keywords from blueprint`,
      evidence: `goal: "${blueprintGoal.slice(0, 100)}" | payoff: "${blueprintPayoff.slice(0, 100)}"`,
    });
  }
  return deltas;
}

/**
 * Run delta detection for a single chapter.
 *
 * @param db Supabase client (service role)
 * @param projectId ai_story_projects.id
 * @param chapterNumber chapter to audit
 * @param novelTotalChapters total planned chapters (for cosmic arc boundary)
 * @param novelId chapters table novel_id
 * @returns DeltaReport with all detected deltas, classified by severity
 */
export async function runDeltaDetection(
  db: SupabaseClient,
  projectId: string,
  chapterNumber: number,
  novelTotalChapters: number,
  novelId: string,
  options?: {
    projectWideCast?: string[];
    /** Override cosmic arc start chapter. Default: 70% of novelTotalChapters. */
    cosmicArcStartChapter?: number;
    /** Override cosmic patterns. Default: UNIVERSAL_COSMIC_PATTERNS. */
    cosmicTierPatterns?: string[];
  },
): Promise<DeltaReport> {
  const [
    { data: blueprint },
    { data: summary },
    { data: characterStates },
    { data: newThreads },
    { data: chapter },
  ] = await Promise.all([
    db.from('chapter_blueprints')
      .select('goal, payoff, cast, forbidden_terms, meta')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle() as unknown as Promise<{ data: BlueprintRow | null }>,
    db.from('chapter_summaries')
      .select('summary, mc_state, cliffhanger')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle() as unknown as Promise<{ data: SummaryRow | null }>,
    db.from('character_states')
      .select('character_name')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber) as unknown as Promise<{ data: CharacterStateRow[] | null }>,
    db.from('plot_threads')
      .select('name, description')
      .eq('project_id', projectId)
      .gte('first_seen_chapter', chapterNumber)
      .lte('first_seen_chapter', chapterNumber) as unknown as Promise<{ data: PlotThreadRow[] | null }>,
    db.from('chapters')
      .select('content')
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle() as unknown as Promise<{ data: { content?: string | null } | null }>,
  ]);

  const deltas: BlueprintDelta[] = [];

  if (!blueprint) {
    deltas.push({
      type: 'goal_mismatch',
      severity: 'hard',
      description: `No chapter_blueprints row for ch.${chapterNumber}`,
    });
  } else {
    const summaryText = [summary?.summary, summary?.mc_state, summary?.cliffhanger].filter(Boolean).join('\n');
    const content = chapter?.content || '';

    const cosmicStart = options?.cosmicArcStartChapter ?? Math.floor(novelTotalChapters * DEFAULT_COSMIC_ARC_START_FRACTION);
    const cosmicPatterns = compilePatterns(options?.cosmicTierPatterns ?? UNIVERSAL_COSMIC_PATTERNS);
    deltas.push(
      ...detectCosmicPullForward(content, chapterNumber, cosmicStart, cosmicPatterns),
      ...detectForbiddenTermsUsed(content, blueprint.forbidden_terms || []),
      ...detectNewCast(summaryText, characterStates || [], [...(blueprint.cast || []), ...(options?.projectWideCast || [])]),
      ...detectNewThreads(newThreads || [], []),
      ...detectGoalMismatch(summaryText, blueprint.goal || '', blueprint.payoff || ''),
    );
  }

  const hardCount = deltas.filter((d) => d.severity === 'hard').length;
  const mediumCount = deltas.filter((d) => d.severity === 'medium').length;
  const softCount = deltas.filter((d) => d.severity === 'soft').length;

  return {
    projectId,
    chapterNumber,
    deltas,
    hardCount,
    mediumCount,
    softCount,
    hasHardDeltas: hardCount > 0,
  };
}

/**
 * Persist a delta report to chapter_blueprints.actual_summary_delta (Codex
 * schema field). Forward chapters' writer can read this to know what
 * actually happened vs what was planned.
 */
export async function persistDeltaReport(
  db: SupabaseClient,
  report: DeltaReport,
): Promise<void> {
  if (report.deltas.length === 0) return;
  const summaryDelta = JSON.stringify({
    detected_at: new Date().toISOString(),
    hardCount: report.hardCount,
    mediumCount: report.mediumCount,
    softCount: report.softCount,
    deltas: report.deltas,
  });
  const { error } = await db
    .from('chapter_blueprints')
    .update({ actual_summary_delta: summaryDelta })
    .eq('project_id', report.projectId)
    .eq('chapter_number', report.chapterNumber);
  if (error) throw new Error(`actual_summary_delta update failed: ${error.message}`);
}

/**
 * Aggregate cast across all chapter_blueprints + character_states for a
 * project. Used as `projectWideCast` for runDeltaDetection so established
 * characters don't flag as new every chapter they appear.
 *
 * Sources:
 *   - chapter_blueprints.cast[] (from blueprint planning)
 *   - character_states.character_name (engine-extracted from past chapters)
 *
 * Engine-extracted names complement plan-side cast — covers characters that
 * appeared but weren't named in the blueprint cast array.
 */
export async function loadProjectWideCast(db: SupabaseClient, projectId: string): Promise<string[]> {
  const [
    { data: blueprintRows, error: bpErr },
    { data: stateRows, error: stErr },
  ] = await Promise.all([
    db.from('chapter_blueprints').select('cast').eq('project_id', projectId),
    db.from('character_states').select('character_name').eq('project_id', projectId),
  ]);
  if (bpErr) throw new Error(`loadProjectWideCast (blueprints) failed: ${bpErr.message}`);
  if (stErr) throw new Error(`loadProjectWideCast (character_states) failed: ${stErr.message}`);
  const cast = new Set<string>();
  for (const row of (blueprintRows as { cast?: string[] }[] | null) || []) {
    for (const name of row.cast || []) {
      if (name) cast.add(name);
    }
  }
  for (const row of (stateRows as { character_name?: string }[] | null) || []) {
    if (row.character_name) cast.add(row.character_name);
  }
  return Array.from(cast);
}

export function formatDeltaReport(report: DeltaReport): string {
  const lines: string[] = [
    `Delta report — project ${report.projectId.slice(0, 8)} ch.${report.chapterNumber}`,
    `  hard=${report.hardCount} medium=${report.mediumCount} soft=${report.softCount}`,
  ];
  for (const d of report.deltas) {
    lines.push(`  [${d.severity}] ${d.type}: ${d.description}${d.evidence ? ` | "${d.evidence.slice(0, 80)}"` : ''}`);
  }
  return lines.join('\n');
}
