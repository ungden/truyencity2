import { z } from 'zod';
import { FlagshipV3Error } from './pipeline';

export const FlagshipModelRoutesV3Schema = z.object({
  setupGenerators: z.tuple([z.string().trim().min(3), z.string().trim().min(3)]),
  setupJudges: z.tuple([
    z.string().trim().min(3),
    z.string().trim().min(3),
    z.string().trim().min(3),
  ]),
  openingSimulator: z.string().trim().min(3),
  launchArchitect: z.string().trim().min(3),
  planner: z.string().trim().min(3),
  writer: z.string().trim().min(3),
  editor: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
  maxPublishedChapterCostUsd: z.number().positive().max(5),
}).strict().superRefine((routes, ctx) => {
  if (routes.writer === routes.editor) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['editor'], message: 'Writer and Editor routes must be independent.' });
  }
  if (new Set(routes.setupGenerators).size !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['setupGenerators'], message: 'The two Concept Generators must use distinct routes.' });
  }
  if (new Set(routes.setupJudges).size !== 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['setupJudges'], message: 'The three Concept Judges must use distinct routes.' });
  }
});

export type FlagshipModelRoutesV3 = z.infer<typeof FlagshipModelRoutesV3Schema>;

export function requireFlagshipModelRoutesV3(style: unknown): FlagshipModelRoutesV3 {
  const raw = (style as { flagship_model_routes_v3?: unknown } | null)?.flagship_model_routes_v3;
  const parsed = FlagshipModelRoutesV3Schema.safeParse(raw);
  if (!parsed.success) {
    throw new FlagshipV3Error('setup_blocked', 'Explicit flagship_model_routes_v3 are missing or invalid; no model fallback is allowed.', parsed.error.issues);
  }
  return parsed.data;
}
