import { z } from 'zod';
import { FlagshipSetupError } from './setup';

export const FlagshipModelRoutesV2Schema = z.object({
  setupCreative: z.string().trim().min(3),
  setupJudge: z.string().trim().min(3),
  director: z.string().trim().min(3),
  writer: z.string().trim().min(3),
  editor: z.string().trim().min(3),
  planner: z.string().trim().min(3),
}).strict().superRefine((routes, ctx) => {
  if (routes.writer === routes.editor) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['editor'], message: 'Editor must use a different model route from Writer.' });
  if (routes.setupCreative === routes.setupJudge) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['setupJudge'], message: 'Concept Judge must use a different model route from Setup Creative.' });
});

export type FlagshipModelRoutesV2 = z.infer<typeof FlagshipModelRoutesV2Schema>;

export function requireFlagshipModelRoutes(style: unknown): FlagshipModelRoutesV2 {
  const raw = (style as { flagship_model_routes?: unknown } | null)?.flagship_model_routes;
  const parsed = FlagshipModelRoutesV2Schema.safeParse(raw);
  if (!parsed.success) throw new FlagshipSetupError('setup_blocked', 'Explicit flagship_model_routes are missing or invalid; no model fallback is allowed.', parsed.error.issues);
  return parsed.data;
}
