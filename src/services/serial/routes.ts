import { SerialRoutesSchema } from './contracts';

/**
 * Launch route for the Song Xuyên pilot. The original Gemini support route could not
 * authenticate on the production host; this all-OpenAI route was credential-smoked before
 * the first chapter and gets its own version so no running novel changes models silently.
 */
export const DEFAULT_SERIAL_ROUTES = SerialRoutesSchema.parse({
  premise: 'gpt-5.6-terra',
  planner: 'gpt-5.6-terra',
  writer: 'gpt-5.6-terra',
  judge: 'gpt-5.6-terra',
  extractor: 'gpt-5.6-luna',
  routeVersion: 'serial-openai-2026-09-19.1',
});
