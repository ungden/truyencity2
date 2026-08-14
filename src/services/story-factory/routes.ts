import { ModelRoutesSchema } from './contracts';

/**
 * Exact, versioned route. No runtime model substitution.
 *
 * Writer is GPT-5.6 Terra, adopted 2026-08-02 after a 7-model bakeoff on one frozen
 * launch pack: Terra was the only candidate to pass the writing smoke (5/5 chapters,
 * zero rewrites, zero violations — the Gemini 2.5-pro incumbent needed a rewrite),
 * then wrote six production chapters with one \$0.07 repair while the pro control
 * needed multiple operator revives. Editor and Planner stay on Gemini 3.1-pro:
 * every cheaper challenger (Luna, Terra-as-editor, deepseek, qwen, grok) failed.
 *
 * routeVersion is kept EXACTLY equal to the passed smoke's label — the claim gate
 * binds writer/editor/planner/planJudge/routeVersion to a passed smoke, so adopting
 * the proven identity authorizes new seeds with zero re-smoke.
 */
export const DEFAULT_MODEL_ROUTES = ModelRoutesSchema.parse({
  setupGeneratorA: 'gemini-3.5-flash',
  // 2.5 Pro cannot reliably serve the nested market-blueprint contract: it
  // rejects constrained schemas as "too many states" and repeatedly emits
  // malformed JSON in JSON mode. 3.1 Pro is the independent B generator for
  // fresh stories; existing projects keep their stored routes.
  setupGeneratorB: 'gemini-3.1-pro-preview',
  setupJudge: 'gemini-3.1-pro-preview',
  openingSimulator: 'gemini-3.5-flash',
  launchArchitect: 'gemini-3.1-pro-preview',
  planner: 'gemini-3.1-pro-preview',
  planJudge: 'gemini-2.5-pro',
  writer: 'gpt-5.6-terra',
  editor: 'gemini-3.1-pro-preview',
  routeVersion: 'terra-writer-experiment-2026-08-01.1',
});
