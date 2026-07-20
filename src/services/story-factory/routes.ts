import { ModelRoutesSchema } from './contracts';

/** Exact, versioned official-Gemini route. No runtime provider/model fallback. */
export const DEFAULT_MODEL_ROUTES = ModelRoutesSchema.parse({
  setupGeneratorA: 'gemini-3.5-flash',
  setupGeneratorB: 'gemini-2.5-pro',
  setupJudge: 'gemini-3.1-pro-preview',
  openingSimulator: 'gemini-3.5-flash',
  launchArchitect: 'gemini-3.1-pro-preview',
  planner: 'gemini-3.1-pro-preview',
  writer: 'gemini-3.1-pro-preview',
  editor: 'gemini-2.5-pro',
  routeVersion: 'official-gemini-quality-2026-07-20.1',
});
