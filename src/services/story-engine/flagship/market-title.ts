import { z } from 'zod';

// Upstream catalogue and human-gate contract only. This never reaches chapter prompts.
// It blocks the short, atmospheric labels that repeatedly hid the actual premise.
export const FlagshipMarketTitleV1Schema = z.string().trim().min(40).max(80).superRefine((title, ctx) => {
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount < 10 || wordCount > 18) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Market title must contain 10-18 words.' });
  }
  if (!/[:,?!]/.test(title)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Market title must expose setup and payoff as two readable clauses.' });
  }
});

export type FlagshipMarketTitleV1 = z.infer<typeof FlagshipMarketTitleV1Schema>;
