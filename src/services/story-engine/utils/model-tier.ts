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
// Phase O (2026-05-12) — switch MODEL_PRO từ gemini-3.1-pro-preview sang
// deepseek-v4-pro. Lý do:
//   1. Gemini 3.1 Pro là "thinking" model — burns reasoning_tokens trước
//      emit content. master_outline 16K output → thinking ăn 12K → content
//      truncated → parseJSON returns null silent fail.
//   2. DeepSeek v4 Pro: 384K output ceiling, NO thinking burn, $1.74/$3.48
//      per 1M (12× Flash but creative-tier reasoning).
//   3. User feedback 2026-05-12: "DeepSeek flash không đủ trình để setup
//      truyện hay". Setup pipeline cần creative reasoning, Flash optimize
//      cho cost+speed không phù hợp.
//
// Expanded PRO_TASKS (Phase O) — toàn bộ creative setup stages:
const PRO_TASKS = new Set([
  // Setup pipeline creative stages (Phase O 2026-05-12)
  'stage_idea',          // StoryKernel — readerFantasy/pleasureLoop/systemMechanic creative DNA
  'stage_world',         // World rules + magic system architecture
  'stage_character',     // MC archetype + voice signature
  'master_outline',      // 5-15 volumes × 4-6 sub-arcs × 6-axis (Pro now handles 16K output)
  'story_outline',       // premise + cast + worldRules + dopamineContract + conflictLadder

  // Existing Pro tasks
  'story_bible',         // ch.3 + every 150ch refresh ≈ 7× per 1000 chapters
  'arc_plan',            // ~50× per 1000 chapters (every 20 ch)

  // Per-chapter writing tasks routed to Pro (2026-05-24)
  'architect',
  'critic',
  'continuity_guardian',
  'writer',
  'writer_continuation',
  'auto_revision',
]);

const FLASH_TASKS = new Set([
  // Setup pipeline cheap stages (low creative stake)
  'stage_description',   // Reader pitch 200 từ — okay generic

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

export const MODEL_PRO = 'deepseek-v4-pro';
export const MODEL_FLASH = 'gemini-3.1-flash-lite';

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
  routing['master_outline'] = 'gemini-3.5-flash'; // Override to Gemini to prevent DeepSeek timeouts on large master outlines
  routing['arc_plan'] = 'gemini-3.5-flash';       // Override to Gemini — arc_plan also generates large JSON and times out on DeepSeek
  routing['critic'] = 'gemini-3.5-flash';         // Override to Gemini to prevent DeepSeek formatting issues and reduce self-bias
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
