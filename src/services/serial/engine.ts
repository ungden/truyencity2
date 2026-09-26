import { createHash } from 'node:crypto';
import { mergeProviderUsage, type ProviderUsage, type StoryModelProvider } from '@/services/story-factory/provider';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import { groundEvidenceSpan } from '@/services/story-factory/validation';
import {
  BibleSchema, ChapterDigestSchema, CyclePlanSchema, CyclePlanShapeSchema, HARD_CONTINUITY_KINDS, normalizeCyclePlanShape, metaLeakFindings, processProseFindings, pullAverage, RollingCyclePlanSchema, scorecardAverage,
  type Bible, type ChapterDigest, type ChapterDraft, type CyclePlan, type JudgeVerdict,
  OpeningAuditSchema, type OpeningAudit, type Premise, type SerialRoutes,
} from './contracts';
import { archetypeOf } from './playbook';
import {
  auditOpening, CHAPTER_TIMEOUT_MS, reviewBindingMismatch, extractDigest, judgeChapter, planCycle, PLANNER_TIMEOUT_MS, reviseChapter,
  SUPPORT_TIMEOUT_MS, writeChapter,
} from './agents';
import {
  buildCyclePlannerBrief, buildExtractorBrief, buildJudgeBrief, buildWriterBrief,
  buildOpeningAuditBrief, refreshStyleMemory,
} from './context';
import {
  applyDigest, assertBibleCoherence, assertCycleAssetCoherence, assertCycleLedger, assertPayoffRotation,
  normalizeCycleLedger, overdueHooks, sanitizeDigest, SerialStateError,
} from './state';
import {
  assertNarrativeDigest, assertNarrativePlan, canonicalizeNarrativeLearnerIds, recoverNarrativeEvidence,
  reviewNarrativeSequence, verifyNarrativeEvidence,
} from './foundation';
import type { NarrativeReview } from '@/services/narrative/foundation';

/**
 * The chapter loop and the cycle lifecycle.
 *
 * A cited contradiction buys one repair. A plot hole that survives it goes back to
 * planning; a number that survives it is committed, because numbers belong to the
 * planned ledger and the prose is only allowed to copy them. Extractor mistakes are
 * set aside by `sanitizeDigest` instead of rejecting a chapter the judge accepted.
 */

const HARD_KINDS = new Set<string>(HARD_CONTINUITY_KINDS);

/**
 * A paid call is never started without the time to finish it. The function hosting a
 * tick has a hard ceiling (300s on Vercel); a call cut off by it is paid for and lost.
 * Instead the engine stops before the call, the finished layers are checkpointed, and
 * the next tick resumes exactly there. Nothing is bought twice.
 */
export class SerialDeadlineError extends Error {
  constructor(
    public readonly neededMs: number,
    public readonly leftMs: number,
    public readonly usages: ProviderUsage[] = [],
    /** For planning: the validation message the next tick's planner must fix. */
    public readonly correction: string | null = null,
  ) {
    super(`Deferred to the next tick: the next call needs ${Math.round(neededMs / 1_000)}s, ${Math.max(0, Math.round(leftMs / 1_000))}s remain.`);
    this.name = 'SerialDeadlineError';
  }
}

/** Headroom for the database writes that follow a call. */
export const DEADLINE_MARGIN_MS = 10_000;

export function assertTimeFor(
  neededMs: number,
  deadline: number | undefined,
  usages: ProviderUsage[] = [],
  correction: string | null = null,
): void {
  if (deadline === undefined) return;
  const leftMs = deadline - Date.now();
  if (leftMs < neededMs + DEADLINE_MARGIN_MS) throw new SerialDeadlineError(neededMs, leftMs, usages, correction);
}

export interface ChapterCommitted {
  status: 'committed';
  chapter: { chapterNumber: number; title: string; content: string };
  bible: Bible;
  verdict: JudgeVerdict;
  digest: ChapterDigest;
  /** Extractor entries set aside instead of blocking the chapter. Telemetry only. */
  mergeNotes: string[];
  attempts: number;
  usages: ProviderUsage[];
  costUsd: number;
  inputFingerprint: string;
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
  reviewKind: 'extractor' | 'prose' | 'upstream';
  chapterNumber: number;
  chapter: { chapterNumber: number; title: string; content: string };
  reason: string;
  findings: JudgeVerdict['continuity'];
  rejectedDigest: ChapterDigest | null;
  usages: ProviderUsage[];
  costUsd: number;
  verdict: JudgeVerdict;
  attempts: number;
  inputFingerprint: string;
}

export type ChapterOutcome = ChapterCommitted | ChapterNeedsReplan | ChapterNeedsReview;

export interface SerialDraftCheckpoint {
  schemaVersion: 1 | 2;
  resumeFrom: 'judge' | 'revision' | 'extractor' | 'verifier' | 'literary_review';
  chapter: { chapterNumber: number; title: string; content: string };
  verdict?: JudgeVerdict;
  digest?: ChapterDigest;
  attempts: number;
  inputFingerprint?: string;
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

export function serialChapterInputFingerprint(input: {
  premise: Premise;
  bible: Bible;
  cycle: CyclePlan;
  chapterNumber: number;
  previousChapter: string | null;
}): string {
  return createHash('sha256').update(JSON.stringify({
    premise: input.premise,
    bible: input.bible,
    cycle: input.cycle,
    chapterNumber: input.chapterNumber,
    previousChapter: input.previousChapter,
  })).digest('hex');
}

function verdictMatchesChapter(verdict: JudgeVerdict | undefined, chapter: ChapterDraft, chapterNumber: number): boolean {
  return reviewBindingMismatch(verdict?.reviewBinding, { chapterNumber, title: chapter.title, content: chapter.content }) === null;
}

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
  // A system lane whose opening never shows the system has hidden the reader's reward.
  const panelFindings = input.premise.voiceSheet.showsSystemPanel
    && !input.chapters.some(chapter => chapter.content.includes('【'))
    ? [{
      kind: 'system_panel_missing' as const,
      chapterNumber: 2,
      quote: input.chapters[1].content.trim().split(/\r?\n/).filter(Boolean).slice(-1)[0]?.slice(0, 500) ?? input.chapters[1].title,
      explain: 'Truyện có hệ thống hiện cho độc giả nhưng bốn chương mở đầu không có bảng 【】 nào.',
      repair: 'Cho thông báo hệ thống, hóa đơn hoặc bảng thăng cấp hiện nguyên văn trong 【】 đúng khoảnh khắc nhận thưởng.',
    }]
    : [];
  const codeFindings = [...formatFindings, ...panelFindings];
  const audit = OpeningAuditSchema.parse(codeFindings.length === 0
    ? result.value
    : {
      passed: false,
      summary: `Có ${codeFindings.length} lỗi xác định bằng code. ${result.value.summary}`,
      findings: [...codeFindings, ...result.value.findings].slice(0, 12),
    });
  const usages = [result.usage, ...(narrative ? [narrative.usage] : [])];
  return { audit, narrativeReview: narrative?.review ?? null, usages, costUsd: totalCost(usages) };
}

/**
 * Opening findings that mean the opening is built wrong — the golden finger pays late,
 * the title's promise is unpaid, the system never shows. Those replan the cycle.
 * Everything else (a timeline slip, an ending without a hook) is a passage an editor
 * would send back for a local fix; discarding four chapters for one sentence is the
 * waste this engine exists to avoid.
 */
export const STRUCTURAL_OPENING_KINDS = new Set<string>([
  'golden_finger_late', 'title_promise_unpaid', 'system_panel_missing', 'opening_contract', 'unapproved_cost',
]);

export function splitOpeningFindings(audit: OpeningAudit): {
  structural: OpeningAudit['findings'];
  local: OpeningAudit['findings'];
} {
  return {
    structural: audit.findings.filter(finding => STRUCTURAL_OPENING_KINDS.has(finding.kind)),
    local: audit.findings.filter(finding => !STRUCTURAL_OPENING_KINDS.has(finding.kind)),
  };
}

/** One targeted revision per chapter an editor flagged, leaving every other chapter as it was. */
export async function repairOpeningChapters(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  findings: OpeningAudit['findings'];
  deadline?: number;
}): Promise<{ chapters: Array<{ chapterNumber: number; title: string; content: string }>; repaired: number[]; usages: ProviderUsage[] }> {
  const usages: ProviderUsage[] = [];
  const repaired: number[] = [];
  const chapters = [...input.chapters];
  for (const chapterNumber of [...new Set(input.findings.map(finding => finding.chapterNumber))].sort((a, b) => a - b)) {
    const index = chapters.findIndex(chapter => chapter.chapterNumber === chapterNumber);
    if (index < 0) continue;
    assertTimeFor(CHAPTER_TIMEOUT_MS, input.deadline, usages);
    const neighbours = chapters.filter(chapter => Math.abs(chapter.chapterNumber - chapterNumber) === 1)
      .map(chapter => ({ chuongSo: chapter.chapterNumber, tieuDe: chapter.title, doanDau: chapter.content.slice(0, 600), doanCuoi: chapter.content.slice(-600) }));
    const result = await reviseChapter({
      provider: input.provider, routes: input.routes, premise: input.premise,
      writerBrief: { chuongSo: chapterNumber, suaCucBoTheoBienTapMoDau: true, chuongLienKe: neighbours },
      rejected: { title: chapters[index].title, content: chapters[index].content },
      findings: input.findings.filter(finding => finding.chapterNumber === chapterNumber).map(finding => ({
        kind: finding.kind, quote: finding.quote, explain: `${finding.explain} Hướng sửa: ${finding.repair}`,
      })),
    });
    usages.push(result.usage);
    chapters[index] = { chapterNumber, title: result.value.title, content: result.value.content };
    repaired.push(chapterNumber);
  }
  return { chapters, repaired, usages };
}

/**
 * Repair local opening findings, audit again, and repeat once if the fix moved the
 * problem next door (a delivery moved into chapter three now happens twice). Bounded:
 * what survives two rounds, or anything structural, is left for the reader and replan.
 */
export async function repairOpeningUntilClean(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  audit: OpeningAudit;
  maxRounds?: number;
  deadline?: number;
  /** Persist each round's revisions before the next paid call, so a failure loses nothing. */
  onRepaired?: (chapters: Array<{ chapterNumber: number; title: string; content: string }>, repaired: number[]) => Promise<void> | void;
}): Promise<{
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
  audit: OpeningAudit;
  repaired: number[];
  rounds: Array<{ repaired: number[]; findings: OpeningAudit['findings'] }>;
  usages: ProviderUsage[];
}> {
  let chapters = input.chapters;
  let audit = input.audit;
  const usages: ProviderUsage[] = [];
  const rounds: Array<{ repaired: number[]; findings: OpeningAudit['findings'] }> = [];
  for (let round = 0; round < (input.maxRounds ?? 2); round += 1) {
    const { structural, local } = splitOpeningFindings(audit);
    if (audit.passed || structural.length > 0 || local.length === 0) break;
    const repaired = await repairOpeningChapters({ ...input, chapters, findings: local });
    usages.push(...repaired.usages);
    chapters = repaired.chapters;
    rounds.push({ repaired: repaired.repaired, findings: local });
    await input.onRepaired?.(chapters, repaired.repaired);
    assertTimeFor(SUPPORT_TIMEOUT_MS, input.deadline, usages);
    const again = await auditFourChapterOpening({ provider: input.provider, routes: input.routes, premise: input.premise, chapters });
    usages.push(...again.usages);
    audit = again.audit;
  }
  return { chapters, audit, repaired: [...new Set(rounds.flatMap(item => item.repaired))].sort(), rounds, usages };
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
  /** Epoch ms after which no paid call may start. Omit for no ceiling (CLI, tests). */
  deadline?: number;
}): Promise<ChapterOutcome> {
  const { provider, routes, premise, bible, cycle, chapterNumber } = input;
  assertBibleCoherence(premise, bible);
  assertCycleAssetCoherence(bible, cycle, chapterNumber);
  assertNarrativePlan(premise, bible, {
    ...cycle,
    beatSheets: cycle.beatSheets.filter(beat => beat.chapterNumber >= chapterNumber),
  });
  const inputFingerprint = serialChapterInputFingerprint({
    premise, bible, cycle, chapterNumber, previousChapter: input.previousChapter,
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
      schemaVersion: 2,
      resumeFrom,
      chapter: { chapterNumber, title: draft.title, content: draft.content },
      verdict,
      digest: extracted,
      attempts,
      inputFingerprint,
    }, [...usages], underlying);
  };

  const judge = async (draft: ChapterDraft): Promise<JudgeVerdict> => {
    assertTimeFor(SUPPORT_TIMEOUT_MS, input.deadline);
    const result = await judgeChapter({
      provider, routes,
      premise,
      judgeBrief: buildJudgeBrief({
        premise, bible, cycle, chapterNumber, title: draft.title, prose: draft.content, previousChapter: input.previousChapter,
      }),
      chapter: { chapterNumber, title: draft.title, content: draft.content },
    });
    usages.push(result.usage);
    // Code-detected slips join the judge's findings so they get the same one repair.
    const leaks = [...metaLeakFindings(draft.content), ...processProseFindings(draft.content)]
      .filter(leak => !result.value.continuity.some(item => item.quote === leak.quote));
    return leaks.length ? { ...result.value, continuity: [...result.value.continuity, ...leaks].slice(0, 10) } : result.value;
  };

  const resumeCandidate = input.resumeArtifact?.chapter.chapterNumber === chapterNumber
    ? input.resumeArtifact : null;
  // Every version checks the fingerprint (premise, Bible, plan, previous chapter). A replan
  // keeps the cycle id, so without it a draft written for the discarded plan was resumable.
  const resumed = resumeCandidate
    && resumeCandidate.inputFingerprint === inputFingerprint
    && (!resumeCandidate.verdict || premise.schemaVersion !== 3
      || verdictMatchesChapter(resumeCandidate.verdict, resumeCandidate.chapter, chapterNumber))
    ? resumeCandidate : null;
  let draft: ChapterDraft;
  let verdict: JudgeVerdict | undefined = resumed?.verdict;
  let attempts = resumed?.attempts ?? 1;
  if (resumed) {
    draft = { title: resumed.chapter.title, content: resumed.chapter.content };
  } else {
    assertTimeFor(CHAPTER_TIMEOUT_MS, input.deadline);
    const first = await writeChapter({ provider, routes, premise, writerBrief });
    usages.push(first.usage);
    draft = first.value;
  }
  if (resumed?.resumeFrom === 'revision') {
    try {
      assertTimeFor(CHAPTER_TIMEOUT_MS, input.deadline);
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

  // One targeted repair against the cited passages — only for a first draft that has
  // not already passed review in an earlier tick.
  const reviewedEarlier = Boolean(resumed && ['extractor', 'verifier', 'literary_review'].includes(resumed.resumeFrom));
  if (verdict.continuity.length > 0 && attempts === 1 && !reviewedEarlier) {
    try {
      assertTimeFor(CHAPTER_TIMEOUT_MS, input.deadline);
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

  const plotHoles = verdict.continuity.filter(finding => HARD_KINDS.has(finding.kind));
  if (plotHoles.length > 0) {
    const evidence = plotHoles.map(finding =>
      `${finding.kind}: ${finding.explain} Quote: ${finding.quote}`
    ).join(' | ');
    return {
      status: 'needs_replan', chapterNumber,
      reason: `Contradiction survived one repair. Reconcile the supplied canon and beat before writing again. ${evidence}`.slice(0, 4_000),
      findings: plotHoles, verdict, attempts, usages, costUsd: totalCost(usages),
    };
  }

  const extractorBrief = buildExtractorBrief({ premise, bible, cycle, chapterNumber, title: draft.title, prose: draft.content });
  let extracted: { value: ChapterDigest; usage?: ProviderUsage };
  if (resumed?.digest && ['verifier', 'literary_review'].includes(resumed.resumeFrom)) {
    extracted = { value: resumed.digest };
  } else {
    try {
      assertTimeFor(SUPPORT_TIMEOUT_MS, input.deadline);
      const result = await extractDigest({ provider, routes, premise, extractorBrief });
      usages.push(result.usage);
      extracted = result;
    } catch (error) {
      return checkpoint(error, 'extractor', draft, attempts, verdict);
    }
  }
  const plannedLedger = cycle.beatSheets.find(beat => beat.chapterNumber === chapterNumber)?.ledger ?? [];
  let mergeNotes: string[] = [];
  const groundDigestEvidence = (digest: ChapterDigest): ChapterDigest => {
    const grounded = ChapterDigestSchema.parse(canonicalizeNarrativeLearnerIds(bible, {
      ...digest,
      narrativeEvidence: digest.narrativeEvidence.map(evidence => ({
        ...evidence,
        quote: draft.content.includes(evidence.quote)
          ? evidence.quote
          : groundEvidenceSpan(draft.content, evidence.quote) ?? evidence.quote,
      })),
      // The ledger is the plan's, validated before the Writer ran. Whatever the
      // extractor thought it saw changing hands is not consulted.
      coreChanges: { ...digest.coreChanges, assetEvents: plannedLedger },
    }));
    const sanitized = sanitizeDigest({ premise, bible, digest: grounded });
    mergeNotes = sanitized.dropped;
    return ChapterDigestSchema.parse(sanitized.digest);
  };
  extracted = { ...extracted, value: groundDigestEvidence(extracted.value) };

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
  const upstreamRules = new Set([
    'narrative_evidence_semantics', 'narrative_evidence_unplanned',
    'narrative_milestone_unplanned', 'narrative_milestone_unearned',
  ]);
  const evidenceRecoveryRules = new Set(['narrative_evidence_missing', 'narrative_evidence_quote']);
  const reviewOutcome = (error: SerialStateError, reviewKind: ChapterNeedsReview['reviewKind']): ChapterNeedsReview => ({
    status: 'needs_review', reviewKind, chapterNumber,
    chapter: { chapterNumber, title: draft.title, content: draft.content },
    reason: `State merge rejected the digest (${error.rule}): ${error.message}`,
    rejectedDigest: extracted.value,
    findings: [], verdict: verdict!, attempts, usages, costUsd: totalCost(usages), inputFingerprint,
  });
  const recoverPlannedEvidence = async (): Promise<Bible> => {
    const beat = cycle.beatSheets.find(item => item.chapterNumber === chapterNumber);
    const requiredIds = [...new Set([
      ...(beat?.revealsFactIds ?? []),
      ...(beat?.advancesMilestoneIds ?? []),
    ])];
    const recovered = await recoverNarrativeEvidence({
      provider, routes, premise, bible, chapterNumber, prose: draft.content, requiredIds,
    });
    usages.push(recovered.usage);
    const required = new Set(requiredIds);
    extracted = {
      ...extracted,
      value: groundDigestEvidence(ChapterDigestSchema.parse({
        ...extracted.value,
        narrativeEvidence: [
          ...extracted.value.narrativeEvidence.filter(item => !required.has(item.id)),
          ...recovered.evidence,
        ],
      })),
    };
    await validateExtracted(extracted.value);
    return applyDigest({ premise, bible, digest: extracted.value });
  };
  try {
    if (resumed?.resumeFrom !== 'literary_review') await validateExtracted(extracted.value);
    nextBible = applyDigest({ premise, bible, digest: extracted.value });
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    if (error.rule === 'narrative_evidence_verification_shape') {
      return checkpoint(error, 'verifier', draft, attempts, verdict, extracted.value);
    }
    if (upstreamRules.has(error.rule)) return reviewOutcome(error, 'upstream');
    if (evidenceRecoveryRules.has(error.rule)) {
      try {
        const recoveredBible = await recoverPlannedEvidence();
        nextBible = recoveredBible;
      } catch (recoveryError) {
        if (!(recoveryError instanceof SerialStateError)) {
          return checkpoint(recoveryError, 'extractor', draft, attempts, verdict, extracted.value);
        }
        if (recoveryError.rule === 'narrative_evidence_verification_shape') {
          return checkpoint(recoveryError, 'verifier', draft, attempts, verdict, extracted.value);
        }
        return reviewOutcome(recoveryError, upstreamRules.has(recoveryError.rule) ? 'upstream' : 'extractor');
      }
      return {
        status: 'committed',
        chapter: { chapterNumber, title: draft.title, content: draft.content },
        bible: BibleSchema.parse({ ...nextBible, styleMemory: refreshStyleMemory(nextBible, [verdict]) }),
        verdict, digest: extracted.value, mergeNotes, attempts, usages, costUsd: totalCost(usages), inputFingerprint,
      };
    }
    // The prose already passed. Give the cheap extractor one visible, bounded repair
    // against the deterministic merge error before throwing away an entire private cycle.
    try {
      assertTimeFor(SUPPORT_TIMEOUT_MS, input.deadline);
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
      extracted = { ...repaired, value: groundDigestEvidence(repaired.value) };
    } catch (repairCallError) {
      return checkpoint(repairCallError, 'extractor', draft, attempts, verdict);
    }
    try {
      await validateExtracted(extracted.value);
      nextBible = applyDigest({ premise, bible, digest: extracted.value });
    } catch (repairError) {
      if (!(repairError instanceof SerialStateError)) throw repairError;
      if (repairError.rule === 'narrative_evidence_verification_shape') {
        return checkpoint(repairError, 'verifier', draft, attempts, verdict, extracted.value);
      }
      if (upstreamRules.has(repairError.rule)) return reviewOutcome(repairError, 'upstream');
      if (evidenceRecoveryRules.has(repairError.rule)) {
        try {
          const recoveredBible = await recoverPlannedEvidence();
          nextBible = recoveredBible;
          return {
            status: 'committed',
            chapter: { chapterNumber, title: draft.title, content: draft.content },
            bible: BibleSchema.parse({ ...nextBible, styleMemory: refreshStyleMemory(nextBible, [verdict]) }),
            verdict, digest: extracted.value, mergeNotes, attempts, usages, costUsd: totalCost(usages), inputFingerprint,
          };
        } catch (recoveryError) {
          if (!(recoveryError instanceof SerialStateError)) {
            return checkpoint(recoveryError, 'extractor', draft, attempts, verdict, extracted.value);
          }
          if (recoveryError.rule === 'narrative_evidence_verification_shape') {
            return checkpoint(recoveryError, 'verifier', draft, attempts, verdict, extracted.value);
          }
          return reviewOutcome(recoveryError, upstreamRules.has(recoveryError.rule) ? 'upstream' : 'extractor');
        }
      }
      return reviewOutcome(repairError, 'extractor');
    }
  }

  return {
    status: 'committed',
    chapter: { chapterNumber, title: draft.title, content: draft.content },
    bible: BibleSchema.parse({ ...nextBible, styleMemory: refreshStyleMemory(nextBible, [verdict]) }),
    verdict, digest: extracted.value, mergeNotes, attempts, usages, costUsd: totalCost(usages), inputFingerprint,
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
  editorialNotes?: string[];
  /** A validation error from the previous tick's plan, fixed on this first attempt. */
  correction?: string | null;
  deadline?: number;
  /** The last written chapter, so the first planned chapter continues what it ended on. */
  previousChapter?: string | null;
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
    editorialNotes: [...new Set(input.editorialNotes ?? [])].slice(0, 8),
    previousChapter: input.previousChapter ?? null,
  });

  const rolling = Boolean(input.activeCycle);
  const planSchema = rolling ? RollingCyclePlanSchema : CyclePlanSchema;
  assertTimeFor(PLANNER_TIMEOUT_MS, input.deadline, [], input.correction ?? null);
  const first = await planCycle({
    provider: input.provider, routes: input.routes, premise: input.premise, rolling,
    plannerBrief: input.correction ? { ...plannerBrief, loiVuaMacPhai: input.correction } : plannerBrief,
  });
  usages.push(first.usage);
  // Mechanical fields are repaired in code; anything left over is a story-level problem
  // the planner gets one chance to fix, like any other validation failure.
  const commerceShape = archetypeOf(input.premise.archetype)?.commerce ?? true;
  const toPlan = (value: unknown): CyclePlan => {
    const shaped = normalizeCyclePlanShape(CyclePlanShapeSchema.parse(value), { rolling });
    // The plan version follows the premise; it is code's to set, not the model's to choose.
    // A planner that wrote schemaVersion 2 for a v2 premise cost a paid retry on 2026-09-26.
    const parsed = planSchema.safeParse({
      ...shaped,
      schemaVersion: input.premise.narrativeFoundation ? 2 : 1,
      editorialNotes: input.editorialNotes ?? [],
    });
    if (!parsed.success) {
      throw new SerialStateError('plan_shape', parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' | ').slice(0, 1_500));
    }
    // Only commerce archetypes run the customer loop; the rest must not invent one.
    if (commerceShape && !rolling && !parsed.data.customerLoop) {
      throw new SerialStateError('plan_shape', 'customerLoop: a commerce cycle needs a customer loop.');
    }
    if (!commerceShape && parsed.data.customerLoop) parsed.data.customerLoop = null;
    return normalizeCycleLedger(parsed.data as CyclePlan);
  };
  const assertPlan = (candidate: CyclePlan): void => {
    if (candidate.beatSheets[0]?.chapterNumber !== input.startChapter) {
      throw new SerialStateError(
        'cycle_window_start',
        `First beat sheet must be chapter ${input.startChapter}, got ${candidate.beatSheets[0]?.chapterNumber ?? 'none'}.`,
      );
    }
    if (input.fixedEndChapter && !input.activeCycle && candidate.plannedEndChapter !== input.fixedEndChapter) {
      throw new SerialStateError(
        'cycle_window_end',
        `Cycle end is fixed at ${input.fixedEndChapter}, got ${candidate.plannedEndChapter}.`,
      );
    }
    if (input.activeCycle && candidate.startChapter !== input.startChapter) {
      throw new SerialStateError(
        'cycle_window_start',
        `Rolling plan must start at chapter ${input.startChapter}, got ${candidate.startChapter}.`,
      );
    }
    if (input.fixedEndChapter && input.activeCycle && candidate.plannedEndChapter !== input.fixedEndChapter) {
      throw new SerialStateError(
        'cycle_window_end',
        `Rolling plan must end at the fixed cycle end ${input.fixedEndChapter}, got ${candidate.plannedEndChapter}.`,
      );
    }
    if (!input.activeCycle && candidate.startChapter !== input.startChapter) {
      throw new SerialStateError(
        'cycle_window_start',
        `New cycle must start at chapter ${input.startChapter}, got ${candidate.startChapter}.`,
      );
    }
    // Scene-mode variety is taste, asked for in the planner prompt. It used to reject rolling
    // plans outright; a planner that missed it twice paused a whole story (card-profession,
    // 2026-09-24). Taste steers; it never stops a story.
    if (!input.activeCycle) {
      assertPayoffRotation(input.previousCycle, candidate);
      assertCycleAssetCoherence(input.bible, candidate, input.startChapter);
      assertCycleLedger(input.bible, candidate, input.startChapter);
      assertNarrativePlan(input.premise, input.bible, candidate);
    } else {
      const merged = CyclePlanSchema.parse({
        ...input.activeCycle,
        beatSheets: candidate.beatSheets,
        editorialNotes: input.editorialNotes ?? [],
      });
      assertCycleAssetCoherence(input.bible, merged, input.startChapter);
      assertCycleLedger(input.bible, merged, input.startChapter);
      assertNarrativePlan(input.premise, input.bible, merged);
    }
  };
  try {
    const firstCycle = toPlan(first.value);
    assertPlan(firstCycle);
    return { cycle: firstCycle, usages, costUsd: totalCost(usages) };
  } catch (error) {
    if (!(error instanceof SerialStateError)) throw error;
    // No room for a second plan in this tick: hand the correction to the next one.
    assertTimeFor(PLANNER_TIMEOUT_MS, input.deadline, usages, error.message);
    const retry = await planCycle({
      provider: input.provider, routes: input.routes,
      premise: input.premise,
      plannerBrief: { ...plannerBrief, loiVuaMacPhai: error.message },
      rolling,
    });
    usages.push(retry.usage);
    const retryCycle = toPlan(retry.value);
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

