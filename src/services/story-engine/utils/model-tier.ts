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

// Pro tier: ONLY rare, novel-trajectory-defining tasks.
// Per-chapter Pro × 1000 chapters = cost explosion. Architect/Critic/Guardian
// dropped to Flash — at 12× cost they would dominate the budget.
//
// 2026-05-02 master_outline removed from Pro tier: gemini-3.1-pro-preview is
// a "thinking" model that burns reasoning_tokens BEFORE emitting content.
// At maxTokens=16384, thinking ate 12K+ → content truncated → JSON malformed
// → parseJSON returns null → caller silently returns null. Symptom in DB:
// "master_outline generation returned no volumes/majorArcs" with 0 cost_tracking
// entries (callGemini threw before tracking). Flash (DeepSeek V4) has 384K
// output ceiling and no thinking burn — handles 8-12 arc × 6 axis JSON easily.
const PRO_TASKS = new Set([
  // Story-level planning — set the entire trajectory (called 1-50 times / 1000 chapters)
  'story_outline',       // 1× per novel
  'story_bible',         // ch.3 + every 150ch ≈ 7× per 1000 chapters
  'arc_plan',            // ~50× per 1000 chapters (every 20 ch)
]);

const FLASH_TASKS = new Set([
  // Per-chapter agents — high volume, must stay cheap
  'architect',
  'critic',
  'continuity_guardian',
  'writer',
  'writer_continuation',
  'auto_revision',
  'master_outline',      // Moved from Pro 2026-05-02 — see PRO_TASKS comment

  // Recap / extraction tasks
  'synopsis',
  'chapter_summary',
  'combined_summary',
  'character_bible_refresh',
  'volume_summary',
  'character_arc',
  'voice_fingerprint',
  'mc_power',
  'foreshadowing_agenda',
  'plot_tracker',
  'character_knowledge',
  'relationships',
  'economic',
  'world_expansion',
  'pacing_blueprint',
]);

export const MODEL_PRO = 'gemini-3.1-pro-preview';
export const MODEL_FLASH = 'deepseek-v4-flash';

declare global {
  // eslint-disable-next-line no-var
  var __MODEL_ROUTING__: Record<string, string> | undefined;
}

/**
 * Install tier routing globally. Idempotent — safe to call multiple times.
 * Call once at the top of any orchestrator entrypoint.
 *
 * Env overrides (Phase 29 Feature 3):
 *   CRITIC_MODEL_OVERRIDE — replaces 'critic' task model. Useful for A/B testing
 *     a different model as Critic (e.g. Gemini reviewing DeepSeek's output) to
 *     reduce self-bias. Example: CRITIC_MODEL_OVERRIDE=gemini-3-flash-preview
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

  // Phase 29 Feature 3: per-task env override for A/B testing.
  // Currently only Critic is exposed — expand to other tasks (architect/writer)
  // only after Critic A/B proves the routing change improves quality.
  const criticOverride = process.env.CRITIC_MODEL_OVERRIDE?.trim();
  if (criticOverride) {
    routing['critic'] = criticOverride;
    if (process.env.DEBUG_ROUTING === '1') {
      console.warn(`[ModelTier] CRITIC_MODEL_OVERRIDE active — critic task → ${criticOverride}`);
    }
  }

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
