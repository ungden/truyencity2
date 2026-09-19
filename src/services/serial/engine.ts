import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import {
  BibleSchema, scorecardAverage,
  type Bible, type ChapterDigest, type ChapterDraft, type CyclePlan, type JudgeVerdict,
  type Premise, type SerialRoutes,
} from './contracts';
import { extractDigest, judgeChapter, planCycle, reviseChapter, writeChapter } from './agents';
import {
  buildCyclePlannerBrief, buildExtractorBrief, buildJudgeBrief, buildWriterBrief,
  collectSteering, refreshStyleMemory,
} from './context';
import { applyDigest, assertPayoffRotation, overdueHooks, SerialStateError } from './state';

/**
 * The chapter loop and the cycle lifecycle.
 *
 * Failure policy, in one sentence: a chapter never parks. A contradiction buys one
 * targeted repair, then one clean rewrite, and if it still contradicts, the beat sheet
 * was wrong and the cycle gets replanned. The old engine had four `*_blocked` statuses
 * that waited for a human; every production job is sitting in one of them right now.
 */

export interface ChapterCommitted {
  status: 'committed';
  chapter: { chapterNumber: number; title: string; content: string };
  bible: Bible;
  verdict: JudgeVerdict;
  digest: ChapterDigest;
  attempts: number;
  usages: ProviderUsage[];
  costUsd: number;
}

export interface ChapterNeedsReplan {
  status: 'needs_replan';
  chapterNumber: number;
  reason: string;
  findings: JudgeVerdict['continuity'];
  usages: ProviderUsage[];
  costUsd: number;
}

export type ChapterOutcome = ChapterCommitted | ChapterNeedsReplan;

const totalCost = (usages: ProviderUsage[]): number =>
  Number(usages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));

export async function writeOneChapter(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  bible: Bible;
  cycle: CyclePlan;
  chapterNumber: number;
  previousChapter: string | null;
}): Promise<ChapterOutcome> {
  const { provider, routes, premise, bible, cycle, chapterNumber } = input;
  const usages: ProviderUsage[] = [];
  const writerBrief = buildWriterBrief({ premise, bible, cycle, chapterNumber, previousChapter: input.previousChapter });

  const judge = async (draft: ChapterDraft): Promise<JudgeVerdict> => {
    const result = await judgeChapter({
      provider, routes,
      judgeBrief: buildJudgeBrief({ premise, bible, cycle, chapterNumber, title: draft.title, prose: draft.content }),
    });
    usages.push(result.usage);
    return result.value;
  };

  const first = await writeChapter({ provider, routes, premise, writerBrief });
  usages.push(first.usage);
  let draft = first.value;
  let verdict = await judge(draft);
  let attempts = 1;

  // One targeted repair against the cited passages.
  if (verdict.continuity.length > 0) {
    const repaired = await reviseChapter({
      provider, routes, premise, writerBrief, rejected: draft, findings: verdict.continuity,
    });
    usages.push(repaired.usage);
    draft = repaired.value;
    verdict = await judge(draft);
    attempts += 1;
  }

  // One clean rewrite, with the surviving findings in front of it.
  if (verdict.continuity.length > 0) {
    const rewritten = await writeChapter({
      provider, routes, premise,
      writerBrief: { ...writerBrief, loiCanTranh: verdict.continuity },
    });
    usages.push(rewritten.usage);
    draft = rewritten.value;
    verdict = await judge(draft);
    attempts += 1;
  }

  if (verdict.continuity.length > 0) {
    return {
      status: 'needs_replan', chapterNumber,
      reason: 'Chapter still contradicts canon after a repair and a rewrite; the beat sheet is the problem.',
      findings: verdict.continuity, usages, costUsd: totalCost(usages),
    };
  }

  const extracted = await extractDigest({
    provider, routes,
    extractorBrief: buildExtractorBrief({ premise, bible, chapterNumber, title: draft.title, prose: draft.content }),
  });
  usages.push(extracted.usage);

  let nextBible: Bible;
  try {
    nextBible = applyDigest({ premise, bible, digest: extracted.value });
  } catch (error) {
    // The prose passed the reader but the extracted state is impossible. Treat it the
    // same way: replan rather than commit a Bible we know is wrong.
    if (!(error instanceof SerialStateError)) throw error;
    return {
      status: 'needs_replan', chapterNumber,
      reason: `State merge rejected the digest (${error.rule}): ${error.message}`,
      findings: [], usages, costUsd: totalCost(usages),
    };
  }

  return {
    status: 'committed',
    chapter: { chapterNumber, title: draft.title, content: draft.content },
    bible: BibleSchema.parse({ ...nextBible, styleMemory: refreshStyleMemory(nextBible, [verdict]) }),
    verdict, digest: extracted.value, attempts, usages, costUsd: totalCost(usages),
  };
}

/**
 * Plan the next cycle. The payoff-rotation rule is code-owned, so a planner that repeats
 * the previous beat gets exactly one corrective attempt before this throws — it never
 * silently accepts the repetition that hollowed out the old novels.
 */
export async function planNextCycle(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  bible: Bible;
  previousCycle: CyclePlan | null;
  cycleNumber: number;
  volumeNumber: number;
  startChapter: number;
  recentVerdicts: JudgeVerdict[];
}): Promise<{ cycle: CyclePlan; usages: ProviderUsage[]; costUsd: number }> {
  const usages: ProviderUsage[] = [];
  const plannerBrief = buildCyclePlannerBrief({
    premise: input.premise,
    bible: input.bible,
    previousCycle: input.previousCycle,
    cycleNumber: input.cycleNumber,
    volumeNumber: input.volumeNumber,
    startChapter: input.startChapter,
    steering: collectSteering(input.recentVerdicts),
  });

  const first = await planCycle({ provider: input.provider, routes: input.routes, plannerBrief });
  usages.push(first.usage);
  try {
    assertPayoffRotation(input.previousCycle, first.value);
    return { cycle: first.value, usages, costUsd: totalCost(usages) };
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    const retry = await planCycle({
      provider: input.provider, routes: input.routes,
      plannerBrief: { ...plannerBrief, loiVuaMacPhai: error.message },
    });
    usages.push(retry.usage);
    assertPayoffRotation(input.previousCycle, retry.value);
    return { cycle: retry.value, usages, costUsd: totalCost(usages) };
  }
}

/** A cycle is finished when its last planned chapter is committed and no hook is overdue. */
export function cycleReadyToClose(bible: Bible, cycle: CyclePlan): { ready: boolean; reason: string | null } {
  if (bible.symbolicCore.chapterNumber < cycle.plannedEndChapter) {
    return { ready: false, reason: `At chapter ${bible.symbolicCore.chapterNumber} of ${cycle.plannedEndChapter}.` };
  }
  const overdue = overdueHooks(bible, cycle.plannedEndChapter);
  if (overdue.length > 0) {
    return { ready: false, reason: `Overdue hooks: ${overdue.map(hook => hook.id).join(', ')}.` };
  }
  return { ready: true, reason: null };
}

/**
 * Fold a finished volume into one paragraph and clear the rolling window.
 *
 * This is the answer to the one documented failure of the longest-running comparable
 * system — a million-character novel whose quality fell away after the first 500k.
 * The Bible cannot be allowed to grow with the story.
 */
export function foldVolume(input: { bible: Bible; volumeNumber: number; summary?: string }): Bible {
  const { bible, volumeNumber } = input;
  const generated = bible.recentSummary
    .map(entry => `Ch.${entry.chapterNumber} ${entry.summary}`)
    .join(' ');
  const summary = (input.summary?.trim() || generated).slice(0, 1_200);
  return BibleSchema.parse({
    ...bible,
    volumeSummaries: [...bible.volumeSummaries, { volumeNumber, summary: summary || `Quyển ${volumeNumber}.` }].slice(-12),
    recentSummary: bible.recentSummary.slice(-3),
    styleMemory: [],
  });
}

/** Rolling read quality, the number the operator dashboard shows instead of a block count. */
export function readingHealth(verdicts: JudgeVerdict[]): {
  chapters: number; average: number; weakest: keyof JudgeVerdict['scorecard'] | null;
} {
  if (verdicts.length === 0) return { chapters: 0, average: 0, weakest: null };
  const keys = ['opening', 'anticipation', 'payoff', 'newness', 'endHook'] as const;
  const totals = keys.map(key => ({
    key, total: verdicts.reduce((sum, verdict) => sum + verdict.scorecard[key], 0),
  }));
  const average = verdicts.reduce((sum, verdict) => sum + scorecardAverage(verdict), 0) / verdicts.length;
  const weakest = totals.reduce((low, item) => (item.total < low.total ? item : low), totals[0]);
  return { chapters: verdicts.length, average: Number(average.toFixed(2)), weakest: weakest.key };
}
