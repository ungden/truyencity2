import { z } from 'zod';
import {
  ChapterOutcomeContentSchema,
  EditorAssessmentSchema,
  EditorContinuityIssueSchema,
  ReadingIssueSchema,
  StoryFactoryError,
  narrativelyObservableDeltaIds,
  type ChapterPlan,
  type EditorAssessment,
  type ModelRoutes,
  type StoryKernel,
  type StoryState,
} from './contracts';
import { buildChapterContexts, buildRevisionContext, type ContextManifestEntry } from './context';
import type { ContinuityPacket } from './memory';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { CHAPTER_CALL_TIMEOUT_MS, geminiProvider } from './provider';
import { EDITOR_SYSTEM_PROMPT, REVISION_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT } from './prompts';
import {
  appendAcceptedOutcome,
  applyChapterPlan,
  buildChapterOutcomeEvent,
  buildMechanicUseEvents,
  groundEvidenceSpan,
  type StateEvent,
} from './validation';

export const ChapterDraftSchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(20),
}).strict();
export type ChapterDraft = z.infer<typeof ChapterDraftSchema>;

const EditorWireDeltaCheckSchema = z.object({
  deltaId: z.string(),
  realized: z.boolean(),
  evidence: z.string().max(200),
}).strict();

const EditorWireOutcomeSchema = z.object({
  event: z.string().max(400),
  result: z.string().max(400),
  method: z.string().max(400).nullable(),
  endingSituation: z.string().max(400),
  evidenceSpans: z.array(z.string().max(200)).max(4),
}).strict();

const editorContinuityCategories = [
  'canon', 'existence', 'event_order', 'timeline', 'location', 'travel',
  'resource', 'resource_provenance', 'knowledge', 'knowledge_leak',
  'relationship', 'authority', 'capability', 'world_rule', 'causality',
  'promise', 'pov', 'required_delta',
] as const;
const editorReadingCategories = [
  'expository_prose', 'tool_character', 'unnatural_dialogue', 'unearned_outcome',
  'stock_reaction', 'ineffective_scene', 'narrative_repetition',
] as const;

/**
 * Gemini 3.1 rejects top-level/nested anyOf in this response schema. Keep one
 * provider-safe finding envelope with all evidence fields required, then let
 * application validation splits the two taxonomies from `category`, rather
 * than trusting the model to keep a duplicate `kind` discriminator aligned.
 * `referenceId` is always an allow-listed artifact token on the wire. Code
 * ignores that structural placeholder for reading findings; prompt leaks are
 * deterministic preflight findings and never model-authored.
 */
const EditorWireFindingSchema = z.object({
  category: z.enum([...editorContinuityCategories, ...editorReadingCategories]),
  severity: z.enum(['critical', 'major', 'moderate']),
  scope: z.enum(['prose', 'plan', 'kernel']),
  evidence: z.string().trim().min(1).max(800),
  referenceId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  instruction: z.string().trim().min(5).max(800),
}).strict();

/** Provider-facing assessment contract; code derives pass/revise from evidence. */
export const EditorWireAssessmentSchema = z.object({
  v: z.literal(3),
  findings: z.array(EditorWireFindingSchema).max(3),
  deltaChecks: z.array(EditorWireDeltaCheckSchema).min(1).max(30),
  outcome: EditorWireOutcomeSchema.nullable(),
}).strict();

function exactStringSchema(values: string[]) {
  const unique = [...new Set(values)].sort();
  if (!unique.length) throw new Error('Cannot build an empty exact-string schema.');
  if (unique.length === 1) return z.literal(unique[0]);
  return z.enum(unique as [string, string, ...string[]]);
}

function buildEditorWireAssessmentSchema(input: {
  deltaIds: string[];
}) {
  return z.object({
    v: z.literal(3),
    // Gemini can reject a large dynamic reference-ID enum with "too many
    // states for serving". Keep the compact stable-ID lexical contract here;
    // groundIssueEvidence validates exact membership against Kernel/Plan/State
    // immediately after decoding, before any verdict can pass.
    findings: z.array(EditorWireFindingSchema).max(3),
    deltaChecks: z.array(EditorWireDeltaCheckSchema.extend({
      deltaId: exactStringSchema(input.deltaIds),
    })).length(input.deltaIds.length),
    outcome: EditorWireOutcomeSchema.nullable(),
  }).strict();
}

export function materializeEditorAssessment(value: unknown): EditorAssessment {
  const wire = EditorWireAssessmentSchema.parse(value);
  const failedDeltas = wire.deltaChecks.filter(check => !check.realized);
  if (!wire.findings.length && !failedDeltas.length) {
    return EditorAssessmentSchema.parse({
      status: 'pass',
      continuityIssues: [],
      readingIssues: [],
      deltaChecks: wire.deltaChecks,
      outcome: ChapterOutcomeContentSchema.parse(wire.outcome),
    });
  }
  if (!wire.findings.length) {
    throw new StoryFactoryError('infra_blocked', 'Editor returned an unrealized delta without a grounded finding.', {
      failedDeltaIds: failedDeltas.map(check => check.deltaId),
    });
  }
  const continuityIssues = wire.findings
    .filter(finding => editorContinuityCategories.includes(
      finding.category as typeof editorContinuityCategories[number],
    ))
    .map(finding => EditorContinuityIssueSchema.parse({
      category: finding.category,
      severity: finding.severity,
      scope: finding.scope,
      currentEvidence: finding.evidence,
      conflictingEvidence: finding.referenceId,
      referenceId: finding.referenceId,
      instruction: finding.instruction,
    }));
  const readingIssues = wire.findings
    .filter(finding => editorReadingCategories.includes(
      finding.category as typeof editorReadingCategories[number],
    ))
    .map(finding => ReadingIssueSchema.parse({
      category: finding.category,
      severity: finding.severity === 'critical' ? 'major' : finding.severity,
      evidence: finding.evidence,
      instruction: finding.instruction,
    }));
  return EditorAssessmentSchema.parse({
    status: 'revise',
    continuityIssues,
    readingIssues,
    deltaChecks: wire.deltaChecks,
  });
}

function injectDeterministicMissingDeltaFinding(
  value: z.infer<typeof EditorWireAssessmentSchema>,
  draft: ChapterDraft,
): z.infer<typeof EditorWireAssessmentSchema> {
  const failed = value.deltaChecks.filter(check => !check.realized);
  if (!failed.length || value.findings.length) return value;
  const tokens = [...draft.content.matchAll(/[\p{L}\p{N}]+/gu)];
  const start = tokens[Math.max(0, tokens.length - 10)]?.index ?? Math.max(0, draft.content.length - 120);
  const evidence = draft.content.slice(start).trim().slice(0, 200) || draft.content.slice(0, 200);
  return EditorWireAssessmentSchema.parse({
    ...value,
    findings: [{
      category: 'required_delta',
      severity: 'major',
      scope: 'prose',
      evidence,
      referenceId: failed[0].deltaId,
      instruction: `Viết lại toàn chương để thực hiện rõ required delta ${failed[0].deltaId} qua hành động và hậu quả trong cảnh.`,
    }],
    outcome: null,
  });
}

interface PreflightIssue {
  kind: 'continuity' | 'reading';
  category: 'canon' | 'prompt_leak' | 'resource' | 'unnatural_dialogue' | 'expository_prose';
  evidence: string;
  conflictingEvidence?: string;
  referenceId?: string;
  instruction: string;
}

/**
 * The negate-then-correct cadence ("Không phải X. Là Y.") is a signature LLM
 * rhythm rather than a Vietnamese prose habit, and it is audible — especially
 * once a chapter is read aloud by the app's TTS.
 *
 * Counted with this exact pattern over the 237 chapters already published:
 * 44% of chapters open a sentence with it at least once, 8.0% do it three or
 * more times, 3.8% four or more, 0.8% five. The Writer prompt carries the real
 * budget of one per chapter; this only catches the tail at four times that.
 *
 * Deliberately not tighter. A deterministic reading finding forces a rewrite,
 * and a rewrite that trips it again ends as `quality_blocked`, which no retry
 * clears — the same failure mode already parking jobs in this fleet. A style
 * nit must not be able to stop a novel.
 */
const NEGATE_THEN_CORRECT = /(?:^|[.!?…\n]\s*)Không phải\b/gu;
const NEGATE_THEN_CORRECT_BUDGET = 4;

export interface ChapterPipelineResult {
  decision: 'publish';
  draft: ChapterDraft;
  assessment: EditorAssessment;
  stateAfter: StoryState;
  stateEvents: StateEvent[];
  contextManifest: ContextManifestEntry[];
  usages: ProviderUsage[];
  revisionCount: 0 | 1;
  wordCount: number;
  attemptTelemetry: ChapterAttemptTelemetry;
}

export interface ChapterAttemptTelemetry {
  initialDraft: ChapterDraft | null;
  initialAssessment: EditorAssessment | null;
  revisionDraft: ChapterDraft | null;
  finalAssessment: EditorAssessment | null;
  usages: ProviderUsage[];
  revisionCount: 0 | 1;
  draftAttempts: 0 | 1 | 2;
  firstPass: boolean | null;
}

function wordCount(content: string): number {
  return content.trim().split(/\s+/u).filter(Boolean).length;
}

function preflight(
  draft: ChapterDraft,
  plan: ChapterPlan,
  kernel: Pick<StoryKernel, 'resources'>,
): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const declaredChapter = draft.title.match(/^\s*chương\s+(\d+)\b/iu);
  if (declaredChapter && Number(declaredChapter[1]) !== plan.chapterNumber) {
    issues.push({
      kind: 'continuity',
      category: 'canon',
      evidence: draft.title,
      conflictingEvidence: `Đây là chương ${plan.chapterNumber}.`,
      instruction: `Đặt lại title cho đúng chương ${plan.chapterNumber}; không được ghi số chương khác.`,
    });
  }
  const leaks = [
    /\b(?:system prompt|developer message|chapter brief|writer brief|required[_ ]?delta|json schema)\b/iu,
    /\[(?:WRITER_BRIEF|CHAPTER_PLAN|STORY_STATE|EDITOR_RUBRIC)[^\]]*\]/iu,
  ];
  for (const pattern of leaks) {
    const match = draft.content.match(pattern);
    if (match) issues.push({
      kind: 'continuity',
      category: 'prompt_leak',
      evidence: match[0],
      instruction: 'Viết lại đoạn này như prose trong thế giới truyện, không để lộ thuật ngữ vận hành.',
    });
  }
  const foreign = draft.content.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u);
  if (foreign) issues.push({
    kind: 'reading',
    category: 'unnatural_dialogue',
    evidence: foreign[0],
    instruction: 'Thay ký tự Hán bằng tiếng Việt tự nhiên phù hợp bối cảnh.',
  });
  const negations = [...draft.content.matchAll(NEGATE_THEN_CORRECT)];
  if (negations.length >= NEGATE_THEN_CORRECT_BUDGET) {
    const anchorIndex = negations[negations.length - 1].index ?? 0;
    issues.push({
      kind: 'reading',
      category: 'expository_prose',
      evidence: draft.content.slice(anchorIndex, anchorIndex + 80).trim(),
      instruction: `Chương dùng khuôn phủ định-rồi-đính-chính "Không phải…" ${negations.length} lần. Giữ lại nhiều nhất một lần ở đúng khoảnh khắc lật nhận thức quan trọng nhất; viết lại những chỗ còn lại thành câu khẳng định nói thẳng điều đang xảy ra.`,
    });
  }
  const literalCurrencyResources = kernel.resources.filter(
    (resource): resource is Extract<StoryKernel['resources'][number], { kind: 'numeric' }> =>
      resource.kind === 'numeric' && /^(?:vnd|đồng)$/iu.test(resource.unit.trim()),
  );
  for (const resource of literalCurrencyResources) {
    const plannedValues = plan.requiredDeltas.flatMap(delta =>
      delta.kind === 'resource_numeric' && delta.resourceId === resource.id
        ? [delta.before, delta.delta, delta.after].map(Math.abs)
        : []);
    plan.preconditions.forEach(condition => {
      if (condition.kind === 'resource' && condition.entityId === resource.id) {
        const numericExpected = typeof condition.expected === 'number'
          ? condition.expected
          : Number(condition.expected);
        if (Number.isFinite(numericExpected)) plannedValues.push(Math.abs(numericExpected));
      }
    });
    const maximumLiteralValue = Math.max(0, ...plannedValues);
    if (!plannedValues.length || maximumLiteralValue >= 1_000) continue;
    const scaled = draft.content.match(
      /(?:\d+(?:[.,]\d+)?|[\p{L}]+(?:\s+[\p{L}]+){0,3})\s+(?:nghìn|ngàn|triệu|tỷ)\s+đồng/iu,
    );
    if (!scaled) continue;
    issues.push({
      kind: 'continuity',
      category: 'resource',
      evidence: scaled[0],
      conflictingEvidence: `${resource.name} dùng ${resource.unit} literal; các giá trị khóa trong chương: ${[...new Set(plannedValues)].join(', ')}.`,
      referenceId: resource.id,
      instruction: `Giữ nguyên thang ${resource.unit}: không thêm nghìn/ngàn/triệu/tỷ vào số tiền ledger đã khóa.`,
    });
    break;
  }
  return issues.slice(0, 3);
}

function editorPrompt(input: {
  kernel: Pick<StoryKernel, 'protagonistId' | 'resources'>;
  state: unknown;
  plan: ChapterPlan;
  draft: ChapterDraft;
  deterministicIssues: PreflightIssue[];
}): string {
  return JSON.stringify({
    task: 'Đánh giá chương theo canon và hiệu quả đọc. Trả đúng EditorAssessment.',
    kernel: input.kernel,
    stateBefore: input.state,
    chapterPlan: input.plan,
    draft: input.draft,
    deterministicIssues: input.deterministicIssues,
    audit: {
      findings: 'Nếu có lỗi, trả 1-3 finding. Category continuity dùng evidence nguyên văn từ draft và referenceId thuộc allowedArtifactReferenceIds; code tự lấy artifact evidence nên không được chép lại. Category reading luôn scope=prose, evidence nguyên văn; do provider cần một schema phẳng, hãy chọn phần tử đầu tiên của allowedArtifactReferenceIds cho referenceId (code sẽ bỏ qua anchor này ở reading issue). Không tự báo prompt leak; deterministic preflight chịu trách nhiệm lỗi đó.',
      allowedArtifactReferenceIds: [...collectStableIds({
        kernel: input.kernel,
        state: input.state,
        plan: input.plan,
      })].sort(),
      observableDeltaIds: [...narrativelyObservableDeltaIds(input.kernel, input.plan)],
      hiddenMechanicalDeltaIds: input.plan.requiredDeltas
        .map(delta => delta.id)
        .filter(deltaId => !narrativelyObservableDeltaIds(input.kernel, input.plan).has(deltaId)),
      deltaChecks: 'Chỉ mỗi observableDeltaId có đúng một check và evidence nguyên văn nếu realized=true. Hidden mechanical delta vẫn được code kiểm và commit, nhưng không được bắt prose nêu số dư/trữ lượng ẩn.',
      resourceSemantics: 'Với resource numeric, before/after là tổng số dư còn delta là lượng giao dịch. Cụm thu về/chi/trả/mua/bán X phải so với delta hiện tại hoặc transition lịch sử liên quan, không so X với tổng số dư. Chỉ cụm tổng cộng/còn lại/đang có mới là claim về balance.',
      historicalMoney: 'Phân biệt tổng giá trị với mệnh giá: “cọc/xấp tiền trị giá năm trăm ngàn” không có nghĩa là một tờ tiền mệnh giá 500.000. Chỉ báo lỗi mệnh giá khi prose nói rõ một tờ hoặc đồng tiền có mệnh giá lịch sử không tồn tại.',
      temporalArithmetic: 'Đối chiếu mọi cụm thời lượng trong prose với durationMinutes, travelMinutesFromPrevious và storyTimeAfterMinutes. Cộng thời gian diễn ra trong từng cảnh; báo timeline/travel nếu prose vượt ngân sách hoặc di chuyển nhanh hơn plan.',
      clean: 'findings=[] chỉ khi mọi delta realized=true; khi đó outcome bắt buộc.',
      issues: 'Có finding hoặc delta chưa realized thì outcome=null.',
    },
    decisionRule: 'Không tự quyết định pass/revise và không chấm điểm. Code sẽ suy ra quyết định từ issues và deltaChecks.',
  });
}

function assertDeltaCoverage(
  kernel: Pick<StoryKernel, 'protagonistId' | 'resources'>,
  plan: ChapterPlan,
  assessment: EditorAssessment,
): void {
  const expected = narrativelyObservableDeltaIds(kernel, plan);
  const actual = assessment.deltaChecks.map(check => check.deltaId);
  if (new Set(actual).size !== actual.length || actual.some(id => !expected.has(id)) || actual.length !== expected.size) {
    throw new StoryFactoryError('infra_blocked', 'Editor returned an invalid delta-check set.', { expected: [...expected], actual });
  }
  if (assessment.status === 'pass' && assessment.deltaChecks.some(check => !check.realized)) {
    throw new StoryFactoryError('infra_blocked', 'Editor pass contained an unrealized delta.');
  }
}

function mergePreflight(assessment: EditorAssessment, deterministic: PreflightIssue[]): EditorAssessment {
  if (!deterministic.length) return assessment;
  const existingContinuity = assessment.status === 'revise' ? assessment.continuityIssues : [];
  const existingReading = assessment.status === 'revise' ? assessment.readingIssues : [];
  const continuityIssues = [
    ...deterministic.filter(issue => issue.kind === 'continuity').map(issue => ({
      category: issue.category,
      severity: 'major' as const,
      scope: 'prose' as const,
      currentEvidence: issue.evidence,
      conflictingEvidence: issue.conflictingEvidence ?? 'Nội dung chương không được chứa thuật ngữ vận hành.',
      referenceId: issue.referenceId ?? null,
      instruction: issue.instruction,
    })),
    ...existingContinuity,
  ];
  const readingIssues = [
    ...deterministic.filter(issue => issue.kind === 'reading').map(issue => ({
      // Preflight reading checks carry their own category; anything outside the
      // reading taxonomy falls back to the historical default.
      category: issue.category === 'expository_prose'
        ? ('expository_prose' as const)
        : ('unnatural_dialogue' as const),
      severity: 'major' as const,
      evidence: issue.evidence,
      instruction: issue.instruction,
    })),
    ...existingReading,
  ];
  const combined = [
    ...continuityIssues.map(issue => ({ kind: 'continuity' as const, issue })),
    ...readingIssues.map(issue => ({ kind: 'reading' as const, issue })),
  ].slice(0, 3);
  return EditorAssessmentSchema.parse({
    status: 'revise',
    continuityIssues: combined.filter(item => item.kind === 'continuity').map(item => item.issue),
    readingIssues: combined.filter(item => item.kind === 'reading').map(item => item.issue),
    deltaChecks: assessment.deltaChecks,
  });
}

function collectStableIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  const visit = (item: unknown, key?: string) => {
    if (typeof item === 'string' && isStableIdKey(key)) {
      ids.add(item);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(entry => visit(entry, key));
      return;
    }
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([entryKey, entry]) => visit(entry, entryKey));
    }
  };
  visit(value);
  return ids;
}

function isStableIdKey(key?: string): boolean {
  return key === 'id' || key?.endsWith('Id') === true || key?.endsWith('Ids') === true;
}

function entryContainsStableId(key: string, value: unknown, id: string): boolean {
  if (!isStableIdKey(key)) return false;
  if (typeof value === 'string') return value === id;
  return key.endsWith('Ids')
    && Array.isArray(value)
    && value.some(item => typeof item === 'string' && item === id);
}

function findArtifactByStableId(value: unknown, id: string, canonicalOwnerOnly: boolean): unknown | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findArtifactByStableId(item, id, canonicalOwnerOnly);
      if (found !== null) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const entries = Object.entries(value);
  const matches = canonicalOwnerOnly
    ? entries.some(([key, item]) => key === 'id' && item === id)
    : entries.some(([key, item]) => entryContainsStableId(key, item, id));
  if (matches) {
    return value;
  }
  for (const [, item] of entries) {
    const found = findArtifactByStableId(item, id, canonicalOwnerOnly);
    if (found !== null) return found;
  }
  return null;
}

function artifactByStableId(value: unknown, id: string): unknown | null {
  // Prefer the canonical object whose own `id` matches. Only when history has
  // no standalone artifact (for example `factIds` on an old outcome event),
  // fall back to the enclosing reference-bearing event. This keeps delta
  // evidence precise without making exact-ID history unresolvable.
  return findArtifactByStableId(value, id, true)
    ?? findArtifactByStableId(value, id, false);
}

function canonicalArtifactEvidence(input: {
  referenceId: string;
  kernel: unknown;
  plan: ChapterPlan;
  state: unknown;
}): string | null {
  const artifact = artifactByStableId(input.plan, input.referenceId)
    ?? artifactByStableId(input.state, input.referenceId)
    ?? artifactByStableId(input.kernel, input.referenceId);
  if (artifact === null) return null;
  return JSON.stringify(artifact).slice(0, 800);
}

function groundIssueEvidence(input: {
  assessment: EditorAssessment;
  draft: ChapterDraft;
  kernel: unknown;
  plan: ChapterPlan;
  state: unknown;
}): EditorAssessment {
  if (input.assessment.status !== 'revise') return input.assessment;
  const kernelIds = collectStableIds(input.kernel);
  const planIds = collectStableIds(input.plan);
  const referenceIds = new Set([...kernelIds, ...planIds, ...collectStableIds(input.state)]);
  const continuityIssues = input.assessment.continuityIssues.map(issue => {
    if (issue.scope === 'prose') {
      const evidence = groundEvidenceSpan(input.draft.content, issue.currentEvidence)
        ?? groundEvidenceSpan(input.draft.title, issue.currentEvidence);
      if (!evidence) {
        throw new StoryFactoryError('infra_blocked', 'Editor prose issue contains evidence that code cannot ground in the draft.', issue);
      }
      if (issue.referenceId !== null && !referenceIds.has(issue.referenceId)) {
        throw new StoryFactoryError('infra_blocked', 'Editor continuity issue references an unknown stable ID.', issue);
      }
      if (issue.category === 'prompt_leak') {
        return { ...issue, currentEvidence: evidence };
      }
      if (issue.referenceId === null) {
        throw new StoryFactoryError('infra_blocked', 'Editor continuity issue has no stable artifact reference.', issue);
      }
      const conflictingEvidence = canonicalArtifactEvidence({
        referenceId: issue.referenceId,
        kernel: input.kernel,
        plan: input.plan,
        state: input.state,
      });
      if (conflictingEvidence === null) {
        throw new StoryFactoryError('infra_blocked', 'Editor continuity issue cannot resolve its stable artifact reference.', issue);
      }
      return { ...issue, currentEvidence: evidence, conflictingEvidence };
    }
    const validIds = issue.scope === 'kernel' ? kernelIds : new Set([...planIds, ...kernelIds]);
    if (issue.referenceId === null || !validIds.has(issue.referenceId)) {
      throw new StoryFactoryError('infra_blocked', `Editor ${issue.scope} issue does not reference a valid stable ID.`, issue);
    }
    const conflictingEvidence = canonicalArtifactEvidence({
      referenceId: issue.referenceId,
      kernel: input.kernel,
      plan: input.plan,
      state: input.state,
    });
    if (conflictingEvidence === null) {
      throw new StoryFactoryError('infra_blocked', `Editor ${issue.scope} issue cannot resolve its stable artifact reference.`, issue);
    }
    return { ...issue, conflictingEvidence };
  });
  const readingIssues = input.assessment.readingIssues.map(issue => {
    const evidence = groundEvidenceSpan(input.draft.content, issue.evidence);
    if (!evidence) {
      throw new StoryFactoryError('infra_blocked', 'Editor reading issue contains evidence that code cannot ground in the draft.', issue);
    }
    return { ...issue, evidence };
  });
  return EditorAssessmentSchema.parse({ ...input.assessment, continuityIssues, readingIssues });
}

export async function assessStoryDraft(input: {
  provider: StoryModelProvider;
  model: string;
  kernel: Pick<StoryKernel, 'protagonistId' | 'resources'>;
  state: unknown;
  plan: ChapterPlan;
  draft: ChapterDraft;
}): Promise<{ assessment: EditorAssessment; usage: ProviderUsage }> {
  const deterministicIssues = preflight(input.draft, input.plan, input.kernel);
  const deltaIds = [...narrativelyObservableDeltaIds(input.kernel, input.plan)];
  const responseSchema = buildEditorWireAssessmentSchema({ deltaIds });
  const materialize = (value: Parameters<typeof injectDeterministicMissingDeltaFinding>[0]): EditorAssessment => {
    let assessment: EditorAssessment;
    try {
      assessment = materializeEditorAssessment(injectDeterministicMissingDeltaFinding(value, input.draft));
    } catch (error) {
      if (error instanceof StoryFactoryError) throw error;
      throw new StoryFactoryError('infra_blocked', 'Editor output failed the exact application contract.', error instanceof z.ZodError ? error.issues : undefined);
    }
    if (assessment.status === 'pass') {
      const deltaChecks = assessment.deltaChecks.map(check => ({
        ...check,
        evidence: groundEvidenceSpan(input.draft.content, check.evidence),
      }));
      const evidenceSpans = assessment.outcome.evidenceSpans.map(span => groundEvidenceSpan(input.draft.content, span));
      if (deltaChecks.some(check => check.evidence === null) || evidenceSpans.some(span => span === null)) {
        throw new StoryFactoryError('infra_blocked', 'Editor pass contains an evidence anchor that code cannot ground in prose.', {
          deltaChecks: deltaChecks.filter(check => check.evidence === null).map(check => check.deltaId),
          outcomeSpans: assessment.outcome.evidenceSpans.filter((_, index) => evidenceSpans[index] === null),
        });
      }
      assessment = EditorAssessmentSchema.parse({
        ...assessment,
        deltaChecks: deltaChecks.map(check => ({ ...check, evidence: check.evidence as string })),
        outcome: { ...assessment.outcome, evidenceSpans: evidenceSpans as string[] },
      });
    } else {
      assessment = groundIssueEvidence({
        assessment,
        draft: input.draft,
        kernel: input.kernel,
        plan: input.plan,
        state: input.state,
      });
    }
    assertDeltaCoverage(input.kernel, input.plan, assessment);
    return assessment;
  };
  const response = await input.provider.json({
    model: input.model,
    timeoutMs: CHAPTER_CALL_TIMEOUT_MS,
    system: EDITOR_SYSTEM_PROMPT,
    prompt: editorPrompt({ ...input, deterministicIssues }),
    schema: responseSchema,
    temperature: 0.4,
  });
  try {
    return { assessment: mergePreflight(materialize(response.value), deterministicIssues), usage: response.usage };
  } catch (error) {
    // Paraphrased anchors and dangling reference IDs are wire-discipline failures,
    // not verdicts — the same disease the window review corrective pass cures. Two
    // production novels parked over a weekend on exactly this loop (bad anchor →
    // full editor re-roll → bad anchor again, until the retry budget drained). Give
    // the SAME model one corrective pass with the exact failure before treating it
    // as infrastructure; a second failure falls through unchanged.
    if (!(error instanceof StoryFactoryError) || error.code !== 'infra_blocked') throw error;
    const corrective = await input.provider.json({
      model: input.model,
      timeoutMs: CHAPTER_CALL_TIMEOUT_MS,
      system: `${EDITOR_SYSTEM_PROMPT}
Bản assessment trước bị từ chối vì evidence không đạt hợp đồng grounding. Chấm lại toàn bộ: mỗi anchor evidence phải là 4-12 từ liên tiếp copy đúng từng ký tự từ draft, referenceId phải là stable ID có thật, và mọi issue phải sửa đúng lỗi grounding được nêu.`,
      prompt: `${editorPrompt({ ...input, deterministicIssues })}

GROUNDING_ERRORS: ${JSON.stringify({ message: error.message, evidence: error.evidence ?? null })}`,
      schema: responseSchema,
      temperature: 0.2,
    });
    const usageTotal = {
      ...corrective.usage,
      inputTokens: response.usage.inputTokens + corrective.usage.inputTokens,
      outputTokens: response.usage.outputTokens + corrective.usage.outputTokens,
      costUsd: response.usage.costUsd + corrective.usage.costUsd,
    };
    return { assessment: mergePreflight(materialize(corrective.value), deterministicIssues), usage: usageTotal };
  }
}

export interface ChapterStageInput {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  nextPlan?: ChapterPlan;
  previousChapter?: string;
  continuityPacket?: ContinuityPacket;
  routes: ModelRoutes;
  provider?: StoryModelProvider;
}

/**
 * A draft that the Editor asked to rewrite, carried across a tick boundary.
 *
 * Writer + Editor + Rewrite + Editor is up to four provider calls. That cannot fit
 * inside the 300s route ceiling, so the rewrite runs in its own tick. Only prose-scoped
 * findings ever reach here: artifact-scoped findings are thrown by the draft stage.
 */
export interface PendingRevision {
  draft: ChapterDraft;
  assessment: EditorAssessment;
  usages: ProviderUsage[];
  telemetry: ChapterAttemptTelemetry;
}

export type ChapterDraftOutcome =
  | { decision: 'publish'; result: ChapterPipelineResult }
  | { decision: 'revise'; pending: PendingRevision };

function publishResult(input: {
  stage: ChapterStageInput;
  transition: ReturnType<typeof applyChapterPlan>;
  contexts: ReturnType<typeof buildChapterContexts>;
  draft: ChapterDraft;
  assessment: Extract<EditorAssessment, { status: 'pass' }>;
  usages: ProviderUsage[];
  revisionCount: 0 | 1;
  telemetry: ChapterAttemptTelemetry;
}): ChapterPipelineResult {
  const stateAfter = appendAcceptedOutcome({
    state: input.transition.state,
    title: input.draft.title,
    content: input.draft.content,
    outcome: input.assessment.outcome,
  });
  const acceptedOutcome = stateAfter.recentOutcomes[stateAfter.recentOutcomes.length - 1];
  return {
    decision: 'publish',
    draft: input.draft,
    assessment: input.assessment,
    stateAfter,
    stateEvents: [
      ...input.transition.events,
      ...buildMechanicUseEvents(input.stage.plan),
      buildChapterOutcomeEvent({ plan: input.stage.plan, outcome: acceptedOutcome }),
    ],
    contextManifest: input.contexts.manifest,
    usages: input.usages,
    revisionCount: input.revisionCount,
    wordCount: wordCount(input.draft.content),
    attemptTelemetry: input.telemetry,
  };
}

function rethrowWithTelemetry(error: unknown, telemetry: ChapterAttemptTelemetry): never {
  const factoryError = error instanceof StoryFactoryError
    ? error
    : new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
  throw new StoryFactoryError(factoryError.code, factoryError.message, {
    cause: factoryError.evidence ?? null,
    pipelineTelemetry: telemetry,
  });
}

/** Writer + Editor. Publishes on a clean first pass, otherwise hands back the rewrite payload. */
export async function draftStoryChapter(input: ChapterStageInput): Promise<ChapterDraftOutcome> {
  const provider = input.provider ?? geminiProvider;
  // Validate and materialize the exact state transition before spending a model call.
  const transition = applyChapterPlan({ kernel: input.kernel, state: input.state, plan: input.plan });
  const contexts = buildChapterContexts({ ...input, stateAfter: transition.state });
  const usages: ProviderUsage[] = [];
  let initialDraft: ChapterDraft | null = null;
  let initialAssessment: EditorAssessment | null = null;
  const telemetry = (): ChapterAttemptTelemetry => ({
    initialDraft,
    initialAssessment,
    revisionDraft: null,
    finalAssessment: initialAssessment,
    usages: [...usages],
    revisionCount: 0,
    draftAttempts: initialDraft ? 1 : 0,
    firstPass: initialAssessment ? initialAssessment.status === 'pass' : null,
  });

  try {
    const initial = await provider.json({
      model: input.routes.writer,
      timeoutMs: CHAPTER_CALL_TIMEOUT_MS,
      verbosity: 'high',
      system: WRITER_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        task: 'Viết chương truyện hoàn chỉnh.',
        chapterNumber: input.plan.chapterNumber,
        writerBrief: contexts.brief,
        previousChapterTail: contexts.previousTail || null,
      }),
      schema: ChapterDraftSchema,
      temperature: 1,
    });
    initialDraft = initial.value;
    usages.push(initial.usage);
    const firstAssessment = await assessStoryDraft({
      provider,
      model: input.routes.editor,
      kernel: contexts.editorKernel,
      state: contexts.editorState,
      plan: input.plan,
      draft: initial.value,
    });
    initialAssessment = firstAssessment.assessment;
    usages.push(firstAssessment.usage);

    if (firstAssessment.assessment.status === 'pass') {
      return {
        decision: 'publish',
        result: publishResult({
          stage: input,
          transition,
          contexts,
          draft: initial.value,
          assessment: firstAssessment.assessment,
          usages,
          revisionCount: 0,
          telemetry: telemetry(),
        }),
      };
    }

    const artifactIssue = firstAssessment.assessment.continuityIssues.find(issue => issue.scope !== 'prose');
    if (artifactIssue) {
      throw new StoryFactoryError(
        artifactIssue.scope === 'kernel' ? 'setup_blocked' : 'plan_blocked',
        artifactIssue.instruction,
        firstAssessment.assessment,
      );
    }

    return {
      decision: 'revise',
      pending: {
        draft: initial.value,
        assessment: firstAssessment.assessment,
        usages,
        telemetry: telemetry(),
      },
    };
  } catch (error) {
    rethrowWithTelemetry(error, telemetry());
  }
}

/**
 * Rewrite + Editor. The state transition and contexts are recomputed here — they are
 * pure functions of kernel/state/plan and nothing was committed by the draft stage,
 * so this is exact rather than a re-derivation risk.
 */
export async function reviseStoryChapter(
  input: ChapterStageInput & { pending: PendingRevision },
): Promise<ChapterPipelineResult> {
  const provider = input.provider ?? geminiProvider;
  const usages: ProviderUsage[] = [...input.pending.usages];
  let revisionDraft: ChapterDraft | null = null;
  let finalAssessment: EditorAssessment | null = input.pending.assessment;
  const telemetry = (): ChapterAttemptTelemetry => ({
    initialDraft: input.pending.telemetry.initialDraft,
    initialAssessment: input.pending.assessment,
    revisionDraft,
    finalAssessment,
    usages: [...usages],
    revisionCount: revisionDraft ? 1 : 0,
    draftAttempts: revisionDraft ? 2 : 1,
    firstPass: false,
  });

  try {
    // Inside the try: this stage carries the draft tick's paid usages, and a throw
    // here (applyChapterPlan can raise plan_blocked) must surface them through
    // rethrowWithTelemetry — outside the try, the run row would record $0 for a
    // chapter attempt that already spent two provider calls.
    const transition = applyChapterPlan({ kernel: input.kernel, state: input.state, plan: input.plan });
    const contexts = buildChapterContexts({ ...input, stateAfter: transition.state });
    const revision = await provider.json({
      model: input.routes.writer,
      timeoutMs: CHAPTER_CALL_TIMEOUT_MS,
      verbosity: 'high',
      system: REVISION_SYSTEM_PROMPT,
      prompt: JSON.stringify(buildRevisionContext({
        brief: contexts.brief,
        previousTail: contexts.previousTail,
        assessment: input.pending.assessment,
        rejectedDraft: input.pending.draft,
      })),
      schema: ChapterDraftSchema,
      temperature: 1,
    });
    revisionDraft = revision.value;
    usages.push(revision.usage);
    const secondAssessment = await assessStoryDraft({
      provider,
      model: input.routes.editor,
      kernel: contexts.editorKernel,
      state: contexts.editorState,
      plan: input.plan,
      draft: revision.value,
    });
    finalAssessment = secondAssessment.assessment;
    usages.push(secondAssessment.usage);
    if (secondAssessment.assessment.status !== 'pass') {
      const artifact = secondAssessment.assessment.continuityIssues.find(issue => issue.scope !== 'prose');
      if (artifact) {
        throw new StoryFactoryError(artifact.scope === 'kernel' ? 'setup_blocked' : 'plan_blocked', artifact.instruction, secondAssessment.assessment);
      }
      throw new StoryFactoryError('quality_blocked', 'Chapter still fails after one evidence-based full rewrite.', secondAssessment.assessment);
    }
    return publishResult({
      stage: input,
      transition,
      contexts,
      draft: revision.value,
      assessment: secondAssessment.assessment,
      usages,
      revisionCount: 1,
      telemetry: telemetry(),
    });
  } catch (error) {
    rethrowWithTelemetry(error, telemetry());
  }
}

/**
 * Both stages in one call. Used by the offline benchmark and bake-off harnesses,
 * which are not bound by the route's execution ceiling.
 */
export async function writeStoryChapter(input: ChapterStageInput): Promise<ChapterPipelineResult> {
  const drafted = await draftStoryChapter(input);
  if (drafted.decision === 'publish') return drafted.result;
  return reviseStoryChapter({ ...input, pending: drafted.pending });
}
