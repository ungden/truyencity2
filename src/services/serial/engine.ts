import { mergeProviderUsage, type ProviderUsage, type StoryModelProvider } from '@/services/story-factory/provider';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import {
  BibleSchema, CyclePlanSchema, scorecardAverage,
  type Bible, type ChapterDigest, type ChapterDraft, type CyclePlan, type JudgeVerdict,
  OpeningAuditSchema, type OpeningAudit, type Premise, type SerialRoutes,
} from './contracts';
import { auditOpening, extractDigest, judgeChapter, planCycle, reviseChapter, writeChapter } from './agents';
import {
  buildCyclePlannerBrief, buildExtractorBrief, buildJudgeBrief, buildWriterBrief,
  buildOpeningAuditBrief, collectSteering, refreshStyleMemory,
} from './context';
import {
  applyDigest, assertBibleCoherence, assertCycleAssetCoherence, assertPayoffRotation, overdueHooks, SerialStateError,
} from './state';
import { assertNarrativeDigest, assertNarrativePlan, reviewNarrativeSequence, verifyNarrativeEvidence } from './foundation';
import type { NarrativeReview } from '@/services/narrative/foundation';

/**
 * The chapter loop and the cycle lifecycle.
 *
 * A cited contradiction buys one repair. Surviving evidence goes back to planning;
 * regenerating the chapter with the same context does not diagnose the source.
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
  verdict: JudgeVerdict;
  attempts: number;
}

export interface ChapterNeedsReview {
  status: 'needs_review';
  reviewKind: 'extractor' | 'prose';
  chapterNumber: number;
  chapter: { chapterNumber: number; title: string; content: string };
  reason: string;
  findings: JudgeVerdict['continuity'];
  rejectedDigest: ChapterDigest | null;
  usages: ProviderUsage[];
  costUsd: number;
  verdict: JudgeVerdict;
  attempts: number;
}

export type ChapterOutcome = ChapterCommitted | ChapterNeedsReplan | ChapterNeedsReview;

export interface SerialDraftCheckpoint {
  schemaVersion: 1;
  resumeFrom: 'judge' | 'revision' | 'extractor' | 'verifier' | 'literary_review';
  chapter: { chapterNumber: number; title: string; content: string };
  verdict?: JudgeVerdict;
  digest?: ChapterDigest;
  attempts: number;
}

/** A paid downstream step failed after prose already existed. */
export class SerialCheckpointError extends Error {
  constructor(
    public readonly checkpoint: SerialDraftCheckpoint,
    public readonly usages: ProviderUsage[],
    public readonly underlying: unknown,
  ) {
    super(underlying instanceof Error ? underlying.message : String(underlying));
    this.name = 'SerialCheckpointError';
  }
}

const totalCost = (usages: ProviderUsage[]): number =>
  Number(usages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));

export async function auditFourChapterOpening(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  bible?: Bible;
  startBible?: Bible;
  approvedPlan?: CyclePlan | CyclePlan[];
}): Promise<{ audit: OpeningAudit; narrativeReview: NarrativeReview | null; usages: ProviderUsage[]; costUsd: number }> {
  if (input.chapters.length !== 4 || input.chapters.some((chapter, index) => chapter.chapterNumber !== index + 1)) {
    throw new Error('Opening audit requires chapters 1-4 in order.');
  }
  const result = await auditOpening({
    provider: input.provider,
    routes: input.routes,
    premise: input.premise,
    auditBrief: buildOpeningAuditBrief({ premise: input.premise, chapters: input.chapters }),
  });
  let narrative: Awaited<ReturnType<typeof reviewNarrativeSequence>>;
  try {
    narrative = await reviewNarrativeSequence({
      provider: input.provider,
      routes: input.routes,
      premise: input.premise,
      chapters: input.chapters,
      bible: input.bible,
      startBible: input.startBible,
      approvedPlan: input.approvedPlan,
    });
  } catch (error) {
    const evidence = error instanceof StoryFactoryError && error.evidence && typeof error.evidence === 'object'
      ? error.evidence as { usages?: ProviderUsage[]; usage?: ProviderUsage }
      : {};
    const reviewUsages = Array.isArray(evidence.usages) ? evidence.usages : evidence.usage ? [evidence.usage] : [];
    const usage = [result.usage, ...reviewUsages].reduce((total, item) => mergeProviderUsage(total, item));
    throw new StoryFactoryError(
      error instanceof StoryFactoryError ? error.code : 'infra_blocked',
      error instanceof Error ? error.message : String(error),
      { ...(error instanceof StoryFactoryError && error.evidence && typeof error.evidence === 'object' ? error.evidence : {}), usages: [usage] },
    );
  }
  const formatFindings = input.chapters.flatMap(chapter => {
    const firstLine = chapter.content.split(/\r?\n/, 1)[0]?.trim() ?? '';
    const numberedTitle = /^chương\s+\d+\s*:/iu.test(chapter.title);
    const repeatedHeading = (/^#{1,6}\s+/.test(firstLine) || /^chương\s+\d+\s*:/iu.test(firstLine))
      && firstLine.includes(chapter.title);
    if (!numberedTitle && !repeatedHeading) return [];
    return [{
      kind: 'format_duplicate_title' as const,
      chapterNumber: chapter.chapterNumber,
      quote: numberedTitle ? chapter.title : firstLine,
      explain: 'Số chương hoặc tiêu đề bị lặp trong dữ liệu mà giao diện sẽ tự hiển thị.',
      repair: 'Chỉ giữ tên chương trong trường title và mở thân chương bằng câu truyện đầu tiên.',
    }];
  });
  const audit = OpeningAuditSchema.parse(formatFindings.length === 0
    ? result.value
    : {
      passed: false,
      summary: `Có ${formatFindings.length} lỗi định dạng tiêu đề xác định bằng code. ${result.value.summary}`,
      findings: [...formatFindings, ...result.value.findings].slice(0, 12),
    });
  const usages = [result.usage, ...(narrative ? [narrative.usage] : [])];
  return { audit, narrativeReview: narrative?.review ?? null, usages, costUsd: totalCost(usages) };
}

export async function writeOneChapter(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  bible: Bible;
  cycle: CyclePlan;
  chapterNumber: number;
  previousChapter: string | null;
  resumeArtifact?: SerialDraftCheckpoint | null;
}): Promise<ChapterOutcome> {
  const { provider, routes, premise, bible, cycle, chapterNumber } = input;
  assertBibleCoherence(premise, bible);
  assertCycleAssetCoherence(bible, cycle, chapterNumber);
  assertNarrativePlan(premise, bible, {
    ...cycle,
    beatSheets: cycle.beatSheets.filter(beat => beat.chapterNumber >= chapterNumber),
  });
  const usages: ProviderUsage[] = [];
  const writerBrief = buildWriterBrief({ premise, bible, cycle, chapterNumber, previousChapter: input.previousChapter });

  const checkpoint = (
    underlying: unknown,
    resumeFrom: SerialDraftCheckpoint['resumeFrom'],
    draft: ChapterDraft,
    attempts: number,
    verdict?: JudgeVerdict,
    extracted?: ChapterDigest,
  ): never => {
    throw new SerialCheckpointError({
      schemaVersion: 1,
      resumeFrom,
      chapter: { chapterNumber, title: draft.title, content: draft.content },
      verdict,
      digest: extracted,
      attempts,
    }, [...usages], underlying);
  };

  const judge = async (draft: ChapterDraft): Promise<JudgeVerdict> => {
    const result = await judgeChapter({
      provider, routes,
      premise,
      judgeBrief: buildJudgeBrief({ premise, bible, cycle, chapterNumber, title: draft.title, prose: draft.content }),
    });
    usages.push(result.usage);
    return result.value;
  };

  const resumed = input.resumeArtifact?.chapter.chapterNumber === chapterNumber
    ? input.resumeArtifact
    : null;
  let draft: ChapterDraft;
  let verdict: JudgeVerdict | undefined = resumed?.verdict;
  let attempts = resumed?.attempts ?? 1;
  if (resumed) {
    draft = { title: resumed.chapter.title, content: resumed.chapter.content };
  } else {
    const first = await writeChapter({ provider, routes, premise, writerBrief });
    usages.push(first.usage);
    draft = first.value;
  }
  if (resumed?.resumeFrom === 'revision') {
    try {
      const repaired = await reviseChapter({
        provider, routes, premise, writerBrief, rejected: draft, findings: verdict?.continuity ?? [],
      });
      usages.push(repaired.usage);
      draft = repaired.value;
      attempts += 1;
      verdict = undefined;
    } catch (error) {
      return checkpoint(error, 'revision', draft, attempts, verdict);
    }
  }
  if (!verdict || resumed?.resumeFrom === 'judge') {
    try {
      verdict = await judge(draft);
    } catch (error) {
      return checkpoint(error, 'judge', draft, attempts);
    }
  }

  // One targeted repair against the cited passages.
  if (verdict.continuity.length > 0) {
    try {
      const repaired = await reviseChapter({
        provider, routes, premise, writerBrief, rejected: draft, findings: verdict.continuity,
      });
      usages.push(repaired.usage);
      draft = repaired.value;
      attempts += 1;
    } catch (error) {
      return checkpoint(error, 'revision', draft, attempts, verdict);
    }
    try {
      verdict = await judge(draft);
    } catch (error) {
      return checkpoint(error, 'judge', draft, attempts);
    }
  }

  if (verdict.continuity.length > 0) {
    const evidence = verdict.continuity.map(finding =>
      `${finding.kind}: ${finding.explain} Quote: ${finding.quote}`
    ).join(' | ');
    return {
      status: 'needs_replan', chapterNumber,
      reason: `Contradiction survived one repair. Reconcile the supplied canon and beat before writing again. ${evidence}`.slice(0, 4_000),
      findings: verdict.continuity, verdict, attempts, usages, costUsd: totalCost(usages),
    };
  }

  const extractorBrief = buildExtractorBrief({ premise, bible, chapterNumber, title: draft.title, prose: draft.content });
  let extracted: { value: ChapterDigest; usage?: ProviderUsage };
  if (resumed?.digest && ['verifier', 'literary_review'].includes(resumed.resumeFrom)) {
    extracted = { value: resumed.digest };
  } else {
    try {
      const result = await extractDigest({ provider, routes, premise, extractorBrief });
      usages.push(result.usage);
      extracted = result;
    } catch (error) {
      return checkpoint(error, 'extractor', draft, attempts, verdict);
    }
  }

  let nextBible: Bible;
  const validateExtracted = async (digest: ChapterDigest): Promise<void> => {
    assertNarrativeDigest({ premise, bible, digest, prose: draft.content, cycle });
    let verified: Awaited<ReturnType<typeof verifyNarrativeEvidence>>;
    try {
      verified = await verifyNarrativeEvidence({ provider, routes, premise, bible, digest, prose: draft.content });
    } catch (error) {
      return checkpoint(error, 'verifier', draft, attempts, verdict, digest);
    }
    if (verified) {
      usages.push(verified.usage);
      const rejected = verified.errors[0];
      if (rejected) throw new SerialStateError(rejected.rule, rejected.message);
    }
  };
  try {
    if (resumed?.resumeFrom !== 'literary_review') await validateExtracted(extracted.value);
    nextBible = applyDigest({ premise, bible, digest: extracted.value });
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    // The prose already passed. Give the cheap extractor one visible, bounded repair
    // against the deterministic merge error before throwing away an entire private cycle.
    try {
      const repaired = await extractDigest({
        provider, routes,
        premise,
        extractorBrief: {
          ...extractorBrief,
          loiMerge: { rule: error.rule, message: error.message },
          yeuCauSua: 'Chỉ sửa digest cho khớp các id hợp lệ; không bịa sự kiện và không thay đổi nội dung chương.',
        },
      });
      usages.push(repaired.usage);
      extracted = repaired;
    } catch (repairCallError) {
      return checkpoint(repairCallError, 'extractor', draft, attempts, verdict);
    }
    try {
      await validateExtracted(extracted.value);
      nextBible = applyDigest({ premise, bible, digest: extracted.value });
    } catch (repairError) {
      if (!(repairError instanceof SerialStateError)) throw repairError;
      return {
        status: 'needs_review', reviewKind: 'extractor', chapterNumber,
        chapter: { chapterNumber, title: draft.title, content: draft.content },
        reason: `State merge rejected the digest after one extractor repair (${repairError.rule}): ${repairError.message}`,
        rejectedDigest: extracted.value,
        findings: [], verdict, attempts, usages, costUsd: totalCost(usages),
      };
    }
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
  activeCycle?: CyclePlan | null;
  cycleNumber: number;
  volumeNumber: number;
  startChapter: number;
  fixedEndChapter?: number;
  recentVerdicts: JudgeVerdict[];
  editorialNotes?: string[];
}): Promise<{ cycle: CyclePlan; usages: ProviderUsage[]; costUsd: number }> {
  assertBibleCoherence(input.premise, input.bible);
  const usages: ProviderUsage[] = [];
  const plannerBrief = buildCyclePlannerBrief({
    premise: input.premise,
    bible: input.bible,
    previousCycle: input.previousCycle,
    activeCycle: input.activeCycle ?? null,
    cycleNumber: input.cycleNumber,
    volumeNumber: input.volumeNumber,
    startChapter: input.startChapter,
    fixedEndChapter: input.fixedEndChapter,
    steering: [...new Set([...(input.editorialNotes ?? []), ...collectSteering(input.recentVerdicts)])].slice(0, 8),
  });

  const first = await planCycle({ provider: input.provider, routes: input.routes, premise: input.premise, plannerBrief });
  usages.push(first.usage);
  const firstCycle = CyclePlanSchema.parse({ ...first.value, editorialNotes: input.editorialNotes ?? [] });
  const assertPlan = (candidate: CyclePlan): void => {
    if (candidate.beatSheets[0]?.chapterNumber !== input.startChapter) {
      throw new SerialStateError(
        'cycle_window_start',
        `First beat sheet must be chapter ${input.startChapter}, got ${candidate.beatSheets[0]?.chapterNumber ?? 'none'}.`,
      );
    }
    if (input.fixedEndChapter && candidate.plannedEndChapter !== input.fixedEndChapter) {
      throw new SerialStateError(
        'cycle_window_end',
        `Cycle end is fixed at ${input.fixedEndChapter}, got ${candidate.plannedEndChapter}.`,
      );
    }
    if (!input.activeCycle && candidate.startChapter !== input.startChapter) {
      throw new SerialStateError(
        'cycle_window_start',
        `New cycle must start at chapter ${input.startChapter}, got ${candidate.startChapter}.`,
      );
    }
    if (input.activeCycle && input.premise.schemaVersion !== 3) {
      const recentModes = new Set(input.activeCycle.beatSheets
        .filter(sheet => sheet.chapterNumber < input.startChapter && sheet.chapterNumber >= input.startChapter - 3)
        .map(sheet => sheet.sceneMode));
      // The rolling merge keeps the approved loop, not the planner's temporary
      // replacement fields. Validate exemptions against that same durable promise.
      const scheduledChapters = new Set(input.activeCycle.customerLoop
        ? Object.values(input.activeCycle.customerLoop.schedule)
        : []);
      const repeated = candidate.beatSheets.find(sheet =>
        recentModes.has(sheet.sceneMode) && !scheduledChapters.has(sheet.chapterNumber));
      if (repeated) {
        throw new SerialStateError(
          'recent_scene_mode_repeat',
          `Chapter ${repeated.chapterNumber} repeats recent scene mode ${repeated.sceneMode} outside a scheduled customer milestone.`,
        );
      }
    }
    assertPayoffRotation(input.previousCycle, candidate);
    assertCycleAssetCoherence(input.bible, candidate, input.startChapter);
    assertNarrativePlan(input.premise, input.bible, candidate);
  };
  try {
    assertPlan(firstCycle);
    return { cycle: firstCycle, usages, costUsd: totalCost(usages) };
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    const retry = await planCycle({
      provider: input.provider, routes: input.routes,
      premise: input.premise,
      plannerBrief: { ...plannerBrief, loiVuaMacPhai: error.message },
    });
    usages.push(retry.usage);
    const retryCycle = CyclePlanSchema.parse({ ...retry.value, editorialNotes: input.editorialNotes ?? [] });
    assertPlan(retryCycle);
    return { cycle: retryCycle, usages, costUsd: totalCost(usages) };
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
    symbolicCore: {
      ...bible.symbolicCore,
      recentAssetEvents: bible.symbolicCore.recentAssetEvents.slice(-40),
    },
    volumeSummaries: [...bible.volumeSummaries, { volumeNumber, summary: summary || `Quyển ${volumeNumber}.` }].slice(-12),
    recentSummary: bible.recentSummary.slice(-3),
    styleMemory: [],
  });
}

/** Rolling read quality, the number the operator dashboard shows instead of a block count. */
export function readingHealth(verdicts: JudgeVerdict[]): {
  chapters: number;
  average: number;
  weakest: keyof JudgeVerdict['scorecard'] | keyof JudgeVerdict['craft'] | null;
} {
  if (verdicts.length === 0) return { chapters: 0, average: 0, weakest: null };
  const readingKeys = ['opening', 'anticipation', 'payoff', 'newness', 'endHook'] as const;
  const craftKeys = ['protagonistAgency', 'sceneLife', 'worldLogic', 'dialogueNaturalness', 'structuralFreshness'] as const;
  const totals = [
    ...readingKeys.map(key => ({
      key, total: verdicts.reduce((sum, verdict) => sum + verdict.scorecard[key], 0),
    })),
    ...craftKeys.map(key => ({
      key, total: verdicts.reduce((sum, verdict) => sum + verdict.craft[key], 0),
    })),
  ];
  const average = verdicts.reduce((sum, verdict) => sum + scorecardAverage(verdict), 0) / verdicts.length;
  const weakest = totals.reduce((low, item) => (item.total < low.total ? item : low), totals[0]);
  return { chapters: verdicts.length, average: Number(average.toFixed(2)), weakest: weakest.key };
}
