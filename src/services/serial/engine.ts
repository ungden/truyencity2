import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
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
import { applyDigest, assertPayoffRotation, overdueHooks, SerialStateError } from './state';

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

export type ChapterOutcome = ChapterCommitted | ChapterNeedsReplan;

const totalCost = (usages: ProviderUsage[]): number =>
  Number(usages.reduce((sum, usage) => sum + usage.costUsd, 0).toFixed(6));

export async function auditFourChapterOpening(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
}): Promise<{ audit: OpeningAudit; usages: ProviderUsage[]; costUsd: number }> {
  if (input.chapters.length !== 4 || input.chapters.some((chapter, index) => chapter.chapterNumber !== index + 1)) {
    throw new Error('Opening audit requires chapters 1-4 in order.');
  }
  const result = await auditOpening({
    provider: input.provider,
    routes: input.routes,
    auditBrief: buildOpeningAuditBrief({ premise: input.premise, chapters: input.chapters }),
  });
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
  return { audit, usages: [result.usage], costUsd: result.usage.costUsd };
}

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
  let extracted = await extractDigest({
    provider, routes,
    extractorBrief,
  });
  usages.push(extracted.usage);

  let nextBible: Bible;
  try {
    nextBible = applyDigest({ premise, bible, digest: extracted.value });
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    // The prose already passed. Give the cheap extractor one visible, bounded repair
    // against the deterministic merge error before throwing away an entire private cycle.
    extracted = await extractDigest({
      provider, routes,
      extractorBrief: {
        ...extractorBrief,
        loiMerge: { rule: error.rule, message: error.message },
        yeuCauSua: 'Chỉ sửa digest cho khớp các id hợp lệ; không bịa sự kiện và không thay đổi nội dung chương.',
      },
    });
    usages.push(extracted.usage);
    try {
      nextBible = applyDigest({ premise, bible, digest: extracted.value });
    } catch (repairError) {
      if (!(repairError instanceof SerialStateError)) throw repairError;
      return {
        status: 'needs_replan', chapterNumber,
        reason: `State merge rejected the digest after one extractor repair (${repairError.rule}): ${repairError.message}`,
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
  cycleNumber: number;
  volumeNumber: number;
  startChapter: number;
  fixedEndChapter?: number;
  recentVerdicts: JudgeVerdict[];
  editorialNotes?: string[];
}): Promise<{ cycle: CyclePlan; usages: ProviderUsage[]; costUsd: number }> {
  const usages: ProviderUsage[] = [];
  const plannerBrief = buildCyclePlannerBrief({
    premise: input.premise,
    bible: input.bible,
    previousCycle: input.previousCycle,
    cycleNumber: input.cycleNumber,
    volumeNumber: input.volumeNumber,
    startChapter: input.startChapter,
    fixedEndChapter: input.fixedEndChapter,
    steering: [...new Set([...(input.editorialNotes ?? []), ...collectSteering(input.recentVerdicts)])].slice(0, 8),
  });

  const first = await planCycle({ provider: input.provider, routes: input.routes, plannerBrief });
  usages.push(first.usage);
  const firstCycle = CyclePlanSchema.parse({ ...first.value, editorialNotes: input.editorialNotes ?? [] });
  try {
    assertPayoffRotation(input.previousCycle, firstCycle);
    return { cycle: firstCycle, usages, costUsd: totalCost(usages) };
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    const retry = await planCycle({
      provider: input.provider, routes: input.routes,
      plannerBrief: { ...plannerBrief, loiVuaMacPhai: error.message },
    });
    usages.push(retry.usage);
    const retryCycle = CyclePlanSchema.parse({ ...retry.value, editorialNotes: input.editorialNotes ?? [] });
    assertPayoffRotation(input.previousCycle, retryCycle);
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
