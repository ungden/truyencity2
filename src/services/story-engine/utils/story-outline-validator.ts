/**
 * Canonical schema validator for story_outline JSONB.
 *
 * WHY THIS EXISTS:
 * Two novels (studio-indie + dai-van-hao spawned 2026-04-29) drifted
 * from premise because their spawn scripts generated story_outline
 * with the WRONG schema (antagonists/powerSystem/openingHook/
 * majorThemes/settingDetails) while context-assembler reads a
 * DIFFERENT schema (premise/mainConflict/themes/majorPlotPoints/
 * endingVision/uniqueHooks/protagonist.{startingState,endGoal,
 * characterArc}). Schema mismatch caused context-assembler to drop
 * every field except protagonist.name → Architect lost premise →
 * AI fell back to generic do-thi defaults (NEET + system + biz
 * cycle) → 10 chapters of off-premise content before user noticed.
 *
 * This validator prevents recurrence by failing LOUDLY at spawn time
 * if the generated outline is missing canonical fields. Spawn scripts
 * call validateStoryOutline() before saving → throw early with clear
 * message → user knows immediately, doesn't wait for cron drift.
 *
 * The CANONICAL schema is whatever assembleContext() in
 * pipeline/context-assembler.ts actually reads. Keep this validator
 * synced with that consumer.
 */
import type { StoryOutline } from '../types';

export interface OutlineValidationIssue {
  severity: 'error' | 'warning';
  field: string;
  message: string;
}

/**
 * Required fields for story_outline to be useful to the chapter
 * pipeline. Missing any of these = context-assembler drops the data.
 */
const REQUIRED_FIELDS_TOP_LEVEL = ['premise', 'mainConflict', 'themes', 'protagonist', 'majorPlotPoints'] as const;
const REQUIRED_FIELDS_PROTAGONIST = ['name', 'startingState', 'endGoal', 'characterArc'] as const;
const RECOMMENDED_FIELDS_TOP_LEVEL = ['endingVision', 'uniqueHooks'] as const;

/**
 * Validate story_outline against canonical schema. Returns array of
 * issues (severity 'error' = caller should reject; 'warning' = log
 * but accept).
 *
 * Caller pattern:
 *   const issues = validateStoryOutline(outline);
 *   const errors = issues.filter(i => i.severity === 'error');
 *   if (errors.length) throw new Error(`Invalid story_outline: ${errors.map(e => e.message).join(', ')}`);
 *   for (const w of issues.filter(i => i.severity === 'warning')) console.warn(w.message);
 */
export function validateStoryOutline(outline: unknown): OutlineValidationIssue[] {
  const issues: OutlineValidationIssue[] = [];

  if (!outline || typeof outline !== 'object') {
    issues.push({ severity: 'error', field: '<root>', message: 'story_outline is null or not an object' });
    return issues;
  }

  const o = outline as Record<string, unknown>;

  // Top-level required
  for (const field of REQUIRED_FIELDS_TOP_LEVEL) {
    if (!(field in o) || o[field] === null || o[field] === undefined) {
      issues.push({ severity: 'error', field, message: `Missing required field: ${field}` });
    }
  }

  // Protagonist sub-fields
  if (o.protagonist && typeof o.protagonist === 'object') {
    const p = o.protagonist as Record<string, unknown>;
    for (const subField of REQUIRED_FIELDS_PROTAGONIST) {
      if (!p[subField] || (typeof p[subField] === 'string' && (p[subField] as string).trim().length === 0)) {
        issues.push({
          severity: subField === 'name' ? 'error' : 'warning',
          field: `protagonist.${subField}`,
          message: `protagonist.${subField} is missing or empty (canonical schema requires startingState, endGoal, characterArc for character grounding)`,
        });
      }
    }
  }

  // majorPlotPoints array
  if (Array.isArray(o.majorPlotPoints)) {
    if (o.majorPlotPoints.length < 3) {
      issues.push({
        severity: 'warning',
        field: 'majorPlotPoints',
        message: `majorPlotPoints has ${o.majorPlotPoints.length} entries, recommend ≥6 for coherent phase roadmap`,
      });
    }
    // Check entries have required shape
    for (const [idx, pp] of o.majorPlotPoints.entries()) {
      if (typeof pp !== 'object' || pp === null) {
        issues.push({ severity: 'error', field: `majorPlotPoints[${idx}]`, message: `entry is not an object` });
        continue;
      }
      const point = pp as Record<string, unknown>;
      const hasNameOrEvent = !!(point.name || point.event);
      if (!hasNameOrEvent) {
        issues.push({ severity: 'warning', field: `majorPlotPoints[${idx}]`, message: `entry missing both 'name' and 'event' — context-assembler will skip this point` });
      }
    }
  } else if (o.majorPlotPoints !== undefined) {
    issues.push({ severity: 'error', field: 'majorPlotPoints', message: `must be an array, got ${typeof o.majorPlotPoints}` });
  }

  // themes array
  if (o.themes !== undefined) {
    if (!Array.isArray(o.themes)) {
      issues.push({ severity: 'error', field: 'themes', message: `must be an array, got ${typeof o.themes}` });
    } else if (o.themes.length === 0) {
      issues.push({ severity: 'warning', field: 'themes', message: 'themes array is empty' });
    }
  }

  // Recommended fields (warnings)
  for (const field of RECOMMENDED_FIELDS_TOP_LEVEL) {
    if (!(field in o) || !o[field]) {
      issues.push({ severity: 'warning', field, message: `Recommended field missing: ${field}` });
    }
  }

  // Anti-pattern detection: shapes that signal the OLD wrong schema
  // (caused the studio-indie + dai-van-hao drift bug)
  const wrongSchemaFields = ['antagonists', 'powerSystem', 'openingHook', 'majorThemes', 'settingDetails', 'supportingCast'];
  const detectedWrongFields = wrongSchemaFields.filter(f => f in o);
  if (detectedWrongFields.length >= 3) {
    issues.push({
      severity: 'error',
      field: '<schema>',
      message: `Detected legacy/wrong schema fields [${detectedWrongFields.join(', ')}]. Canonical schema uses: premise, mainConflict, themes, majorPlotPoints, endingVision, uniqueHooks, protagonist.{name,startingState,endGoal,characterArc}. The wrong fields will be silently dropped by context-assembler. See spawn-pure-game-studio drift incident 2026-04-29.`,
    });
  }

  return issues;
}

/**
 * Convenience wrapper: throws on errors, logs warnings.
 * Returns the typed outline (cast) on success.
 */
export function validateStoryOutlineOrThrow(outline: unknown, context: string): StoryOutline {
  const issues = validateStoryOutline(outline);
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  for (const w of warnings) {
    console.warn(`[story_outline validator] ${context}: ${w.field}: ${w.message}`);
  }

  if (errors.length > 0) {
    const summary = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid story_outline (${context}): ${summary}`);
  }

  return outline as StoryOutline;
}
