/**
 * Model Tier Configuration (Phase 22 Stage 3)
 *
 * Routes critical reasoning tasks to deepseek-v4-pro (12x cost, deeper reasoning).
 * Routes high-volume / low-stakes tasks to deepseek-v4-flash.
 *
 * Set globalThis.__MODEL_ROUTING__ to override per-task model.
 *
 * Cost impact: Pro adds ~$0.7/AI write for the 7 critical tasks. For a 1500-chapter
 * novel that's ~$525 extra. Worth it for "đại thần grade" quality.
 */

const PRO_TASKS = new Set([
  // Story-level planning — set the entire trajectory
  'master_outline',
  'story_outline',
  'arc_plan',
  'story_bible',
  // Per-chapter reasoning
  'architect',           // Plans every scene structure
  'critic',              // Editorial review
  'continuity_guardian', // 4th-agent biên tập viên
  'auto_revision',       // Precise multi-issue editing
]);

const FLASH_TASKS = new Set([
  'writer',              // Volume play; Vietnamese prose; Pro overkill
  'writer_continuation',
  'synopsis',            // Recap data, low stakes
  'chapter_summary',     // Recap data
  'combined_summary',    // Recap + character extraction
  'character_bible_refresh',     // Bible assembly from existing data
  'volume_summary',              // Macro recap
  'character_arc',
  'voice_fingerprint',
  'mc_power',
  'foreshadowing_agenda',
  'plot_tracker',        // Finance check is rule-based mostly
  'character_knowledge',
  'relationships',
  'economic',
  'world_expansion',
  'pacing_blueprint',
]);

export const MODEL_PRO = 'deepseek-v4-pro';
export const MODEL_FLASH = 'deepseek-v4-flash';

declare global {
  // eslint-disable-next-line no-var
  var __MODEL_ROUTING__: Record<string, string> | undefined;
}

/**
 * Install tier routing globally. Idempotent — safe to call multiple times.
 * Call once at the top of any orchestrator entrypoint.
 */
export function installModelTierRouting(): void {
  if (process.env.DISABLE_PRO_TIER === '1') {
    if (process.env.DEBUG_ROUTING === '1') console.warn('[ModelTier] Pro tier disabled by DISABLE_PRO_TIER');
    return;
  }
  const routing: Record<string, string> = {};
  for (const task of PRO_TASKS) routing[task] = MODEL_PRO;
  for (const task of FLASH_TASKS) routing[task] = MODEL_FLASH;
  // _default fallback to flash when task is undefined
  routing['_default'] = MODEL_FLASH;
  globalThis.__MODEL_ROUTING__ = routing;
  if (process.env.DEBUG_ROUTING === '1') {
    console.warn(`[ModelTier] Installed routing: ${PRO_TASKS.size} Pro tasks, ${FLASH_TASKS.size} Flash tasks`);
  }
}

/** Convenience: get the model that would be used for a given task. */
export function modelForTask(task: string): string {
  if (PRO_TASKS.has(task)) return MODEL_PRO;
  if (FLASH_TASKS.has(task)) return MODEL_FLASH;
  return MODEL_FLASH;
}
