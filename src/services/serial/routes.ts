import { SerialRoutesSchema } from './contracts';

/**
 * Starting routes, inherited from the story-factory bakeoff of 2026-08-02 and due to be
 * re-run: that bakeoff scored literary process prose, and this engine asks for something
 * else — short paragraphs, casual register, running internal monologue, a hook every
 * chapter. Treat these as the incumbent to beat, not as a settled answer.
 */
export const DEFAULT_SERIAL_ROUTES = SerialRoutesSchema.parse({
  premise: 'gemini-3.1-pro-preview',
  planner: 'gemini-3.1-pro-preview',
  writer: 'gpt-5.6-terra',
  judge: 'gemini-3.1-pro-preview',
  extractor: 'gemini-3.5-flash',
  routeVersion: 'serial-incumbent-2026-09-19.1',
});
