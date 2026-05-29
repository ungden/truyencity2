/**
 * Model Tier Configuration (Phase 22 Stage 3)
 *
 * SOURCE OF TRUTH for per-task model routing. The two CLAUDE.md files mirror this;
 * if you change the sets below, update the routing tables there too.
 *
 * Effective routing after installModelTierRouting() (3 tiers):
 *   1. deepseek-v4-pro   (MODEL_PRO)   — creative setup + per-chapter writing
 *                                         (see PRO_TASKS; the few large-JSON tasks
 *                                          below are overridden back to Gemini).
 *   2. gemini-3.5-flash  (override)    — master_outline, arc_plan, critic
 *                                         (DeepSeek times out on large JSON / self-bias).
 *   3. gemini-3.1-flash-lite (MODEL_FLASH, _default) — stage_description + all
 *                                         extraction/recap tasks + anything undefined.
 *
 * Set globalThis.__MODEL_ROUTING__ (via installModelTierRouting) to apply.
 * DISABLE_PRO_TIER=1 reverts EVERYTHING to gemini-3.1-flash-lite (A/B baseline +
 * the DeepSeek-outage escape hatch — no fallback exists otherwise).
 *
 * Cost note: deepseek-v4-pro currently runs a 75% promo (effective $0.435/$0.87 per
 * 1M, ~3× Flash, not 12×). Per "cost is not a concern — ưu tiên chất lượng tối đa",
 * per-chapter writing is deliberately on Pro.
 */

// Pro tier covers BOTH the rare novel-defining setup stages AND the per-chapter
// writing tasks (architect/writer/critic/guardian/auto-revision). The latter were
// promoted to Pro on 2026-05-24 for chapter quality; critic + master_outline +
// arc_plan are then overridden back to Gemini below (large-JSON timeout / self-bias).
//
// Phase O (2026-05-12) — switched MODEL_PRO từ gemini-3.1-pro-preview sang
// deepseek-v4-pro. Lý do:
//   1. Gemini 3.1 Pro là "thinking" model — burns reasoning_tokens trước
//      emit content. master_outline 16K output → thinking ăn 12K → content
//      truncated → parseJSON returns null silent fail.
//   2. DeepSeek v4 Pro: 384K output ceiling, NO thinking burn, creative-tier reasoning.
//   3. User feedback 2026-05-12: "DeepSeek flash không đủ trình để setup
//      truyện hay". Setup pipeline cần creative reasoning, Flash optimize
//      cho cost+speed không phù hợp.
//
// PRO_TASKS — creative setup stages + per-chapter writing:
const PRO_TASKS = new Set([
  // Setup pipeline creative stages (Phase O 2026-05-12)
  'stage_idea',          // StoryKernel — readerFantasy/pleasureLoop/systemMechanic creative DNA
  'stage_world',         // World rules + magic system architecture
  'stage_character',     // MC archetype + voice signature
  'master_outline',      // 5-15 volumes × 4-6 sub-arcs × 6-axis — NOTE: overridden to gemini-3.5-flash below (large JSON times out on DeepSeek)
  'story_outline',       // premise + cast + worldRules + dopamineContract + conflictLadder

  // Existing Pro tasks
  'story_bible',         // ch.3 + every 150ch refresh ≈ 7× per 1000 chapters
  'arc_plan',            // ~50× per 1000 chapters — NOTE: overridden to gemini-3.5-flash below (large JSON times out on DeepSeek)

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

/**
 * Guard: confirm per-task routing is installed and the chapter WRITER is not
 * silently falling back to gemini-3.1-flash-lite.
 *
 * Background (2026-05-29): flash-lite produced "lởm" chapters vs deepseek-v4-pro,
 * so per-chapter writing is pinned to MODEL_PRO. The standard 3-agent path only
 * routes writer/architect → MODEL_PRO when __MODEL_ROUTING__ is installed; WITHOUT
 * it, callGemini() falls back to the project's ai_model column (= flash-lite for
 * the ~773 Phase Q projects). This guard fails loudly so a forgotten
 * installModelTierRouting() can never silently degrade chapter quality.
 *
 * When DISABLE_PRO_TIER=1 (A/B baseline / DeepSeek-outage escape hatch), routing
 * is intentionally absent — the guard is a no-op in that mode.
 */
export function assertChapterWriterRouting(): void {
  if (process.env.DISABLE_PRO_TIER === '1') return; // intentional all-Flash baseline
  const writerModel = globalThis.__MODEL_ROUTING__?.writer;
  if (writerModel !== MODEL_PRO) {
    throw new Error(
      `[ModelTier] Chapter writer routing not installed (writer→${writerModel ?? 'unset'}). ` +
      `Expected ${MODEL_PRO}. Call installModelTierRouting() before writeChapter — ` +
      `refusing to write with a flash-lite fallback (quality regression).`,
    );
  }
  if (process.env.DEBUG_ROUTING === '1') {
    const r = globalThis.__MODEL_ROUTING__!;
    console.warn(
      `[ModelTier] writer→${r.writer} architect→${r.architect} critic→${r.critic} _default→${r._default}`,
    );
  }
}

/** Convenience: get the model that would be used for a given task. */
export function modelForTask(task: string): string {
  if (PRO_TASKS.has(task)) return MODEL_PRO;
  if (FLASH_TASKS.has(task)) return MODEL_FLASH;
  return MODEL_FLASH;
}
