/**
 * Production focus / enablement.
 *
 * 2026-05-12 (Phase Q): switched from hardcoded UUID allowlist → per-project
 * `style_directives.production_enabled` flag. Any project with the flag set
 * goes into the 50 ch/day cron pipeline; toggle on/off in DB to add/remove.
 *
 * Legacy `FOCUSED_PROJECT_IDS` env var still works as an additional allowlist
 * for emergency overrides — if set, project must EITHER have the flag OR be
 * in the UUID list. Default UUID list is empty post-Phase-Q.
 *
 * Master switches:
 *   - STORY_FOCUS_MODE=0      → disable all gating (all active projects run)
 *   - STORY_PRODUCTION_PAUSED=1 → halt cron entirely
 */

/** Empty by default in Phase Q. Env can still inject emergency overrides. */
export const DEFAULT_FOCUSED_PROJECT_IDS: readonly string[] = [];

function parseFocusedIds(raw?: string): string[] {
  return (raw || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export const FOCUS_MODE_ENABLED = process.env.STORY_FOCUS_MODE !== '0';
export const STORY_PRODUCTION_PAUSED = process.env.STORY_PRODUCTION_PAUSED === '1';

export const FOCUSED_PROJECT_IDS = parseFocusedIds(process.env.FOCUSED_PROJECT_IDS);
if (FOCUSED_PROJECT_IDS.length === 0) {
  FOCUSED_PROJECT_IDS.push(...DEFAULT_FOCUSED_PROJECT_IDS);
}

const FOCUSED_PROJECT_ID_SET = new Set<string>(FOCUSED_PROJECT_IDS);

/** Style-directives shape we care about for production gating. */
interface ProductionDirectives {
  production_enabled?: boolean;
}

interface ProductionRow {
  id?: string | null;
  style_directives?: ProductionDirectives | Record<string, unknown> | null;
}

/**
 * Check if a single project row should be picked up by the production cron.
 *
 * Rules:
 *   - If FOCUS_MODE is OFF → everything passes (cron filters by status only).
 *   - If style_directives.production_enabled === true → passes.
 *   - Else if project.id is in the legacy FOCUSED_PROJECT_IDS allowlist → passes.
 *   - Otherwise → blocked.
 */
export function isProductionEnabled(row: ProductionRow): boolean {
  if (!FOCUS_MODE_ENABLED) return true;
  const directives = row.style_directives as ProductionDirectives | null | undefined;
  if (directives && directives.production_enabled === true) return true;
  if (row.id && FOCUSED_PROJECT_ID_SET.has(row.id)) return true;
  return false;
}

/** Filter array of project rows in-memory (post-fetch belt-and-suspenders). */
export function filterProductionEnabled<T extends ProductionRow>(rows: T[]): T[] {
  if (!FOCUS_MODE_ENABLED) return rows;
  return rows.filter(isProductionEnabled);
}

// ── Legacy aliases (kept so older callers / tests still compile) ────────────

/**
 * Legacy ID-only check — only consults the UUID allowlist. Prefer
 * isProductionEnabled() which also reads the per-project flag.
 */
export function isFocusedProject(projectId?: string | null): boolean {
  if (!FOCUS_MODE_ENABLED) return true;
  return !!projectId && FOCUSED_PROJECT_ID_SET.has(projectId);
}

/** Legacy alias for `filterProductionEnabled`. */
export function filterFocusedProjects<T extends ProductionRow>(rows: T[]): T[] {
  return filterProductionEnabled(rows);
}
