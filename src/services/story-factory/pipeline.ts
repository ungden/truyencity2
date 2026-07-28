import { z } from 'zod';
import {
  ChapterOutcomeContentSchema,
  EditorAssessmentSchema,
  EditorContinuityIssueSchema,
  ReadingIssueSchema,
  StoryFactoryError,
  type ChapterPlan,
  type EditorAssessment,
  type ModelRoutes,
  type StoryKernel,
  type StoryState,
} from './contracts';
import { buildChapterContexts, buildRevisionContext, type ContextManifestEntry } from './context';
import type { ContinuityPacket } from './memory';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider } from './provider';
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

export const EditorWireAssessmentSchema = z.object({
  v: z.literal(2),
  continuityIssues: z.array(EditorContinuityIssueSchema).max(3),
  readingIssues: z.array(ReadingIssueSchema).max(3),
  deltaChecks: z.array(EditorWireDeltaCheckSchema).min(1).max(30),
  outcome: EditorWireOutcomeSchema.nullable(),
}).strict();

export function materializeEditorAssessment(value: z.infer<typeof EditorWireAssessmentSchema>): EditorAssessment {
  const wire = EditorWireAssessmentSchema.parse(value);
  const failedDeltas = wire.deltaChecks.filter(check => !check.realized);
  if (failedDeltas.length > 0 && wire.continuityIssues.length + wire.readingIssues.length === 0) {
    throw new StoryFactoryError('infra_blocked', 'Editor returned an unrealized delta without a grounded issue.', {
      failedDeltas: failedDeltas.map(check => check.deltaId),
    });
  }
  const issueCount = wire.continuityIssues.length + wire.readingIssues.length;
  if (issueCount === 0 && failedDeltas.length === 0) {
    const outcome = ChapterOutcomeContentSchema.parse(wire.outcome);
    return EditorAssessmentSchema.parse({
      status: 'pass',
      continuityIssues: [],
      readingIssues: [],
      deltaChecks: wire.deltaChecks,
      outcome,
    });
  }
  if (issueCount < 1 || issueCount > 3) {
    throw new StoryFactoryError('infra_blocked', 'Editor must return one to three total grounded issues when a gate fails.', {
      continuityIssues: wire.continuityIssues.length,
      readingIssues: wire.readingIssues.length,
    });
  }
  return EditorAssessmentSchema.parse({
    status: 'revise',
    continuityIssues: wire.continuityIssues,
    readingIssues: wire.readingIssues,
    deltaChecks: wire.deltaChecks,
  });
}

interface PreflightIssue {
  kind: 'continuity' | 'reading';
  category: 'prompt_leak' | 'unnatural_dialogue';
  evidence: string;
  instruction: string;
}

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

function preflight(draft: ChapterDraft): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
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
  return issues.slice(0, 3);
}

function editorPrompt(input: {
  kernel: unknown;
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
      continuityIssues: 'Chỉ báo lỗi thuộc taxonomy continuity trong schema. currentEvidence phải nguyên văn từ draft. Với lỗi khác prompt_leak, referenceId bắt buộc là stable ID của state/plan/kernel mâu thuẫn; conflictingEvidence chỉ mô tả ngắn vì code sẽ thay bằng evidence canonical từ referenceId.',
      readingIssues: 'Báo prose thuyết minh, nhân vật công cụ, thoại giả, kết quả chưa earned, stock reaction, cảnh không hiệu quả hoặc lặp công thức. Evidence phải là anchor nguyên văn từ draft.',
      deltaChecks: 'Mỗi required delta đúng một check và evidence nguyên văn nếu realized=true.',
      outcome: 'Chỉ điền khi không có issue và mọi delta realized; nếu không thì null.',
    },
    decisionRule: 'Không tự quyết định pass/revise và không chấm điểm. Code sẽ suy ra quyết định từ issues và deltaChecks.',
  });
}

function assertDeltaCoverage(plan: ChapterPlan, assessment: EditorAssessment): void {
  const expected = new Set(plan.requiredDeltas.map(delta => delta.id));
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
      category: 'prompt_leak' as const,
      severity: 'major' as const,
      scope: 'prose' as const,
      currentEvidence: issue.evidence,
      conflictingEvidence: 'Nội dung chương không được chứa thuật ngữ vận hành.',
      referenceId: null,
      instruction: issue.instruction,
    })),
    ...existingContinuity,
  ];
  const readingIssues = [
    ...deterministic.filter(issue => issue.kind === 'reading').map(issue => ({
      category: 'unnatural_dialogue' as const,
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
    if (typeof item === 'string' && (key === 'id' || key?.endsWith('Id') || key?.endsWith('Ids'))) {
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

function artifactByStableId(value: unknown, id: string): unknown | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = artifactByStableId(item, id);
      if (found !== null) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const entries = Object.entries(value);
  if (entries.some(([key, item]) => (
    typeof item === 'string'
    && item === id
    && (key === 'id' || key.endsWith('Id') || key.endsWith('Ids'))
  ))) {
    return value;
  }
  for (const [, item] of entries) {
    const found = artifactByStableId(item, id);
    if (found !== null) return found;
  }
  return null;
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
      const evidence = groundEvidenceSpan(input.draft.content, issue.currentEvidence);
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
    return issue;
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
  kernel: unknown;
  state: unknown;
  plan: ChapterPlan;
  draft: ChapterDraft;
}): Promise<{ assessment: EditorAssessment; usage: ProviderUsage }> {
  const deterministicIssues = preflight(input.draft);
  const response = await input.provider.json({
    model: input.model,
    system: EDITOR_SYSTEM_PROMPT,
    prompt: editorPrompt({ ...input, deterministicIssues }),
    schema: EditorWireAssessmentSchema,
    temperature: 0.4,
  });
  let assessment: EditorAssessment;
  try {
    assessment = materializeEditorAssessment(response.value);
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
  assertDeltaCoverage(input.plan, assessment);
  return { assessment: mergePreflight(assessment, deterministicIssues), usage: response.usage };
}

export async function writeStoryChapter(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  previousChapter?: string;
  continuityPacket?: ContinuityPacket;
  routes: ModelRoutes;
  provider?: StoryModelProvider;
}): Promise<ChapterPipelineResult> {
  const provider = input.provider ?? geminiProvider;
  // Validate and materialize the exact state transition before spending a model call.
  const transition = applyChapterPlan({ kernel: input.kernel, state: input.state, plan: input.plan });
  const contexts = buildChapterContexts(input);
  const usages: ProviderUsage[] = [];
  let initialDraft: ChapterDraft | null = null;
  let initialAssessment: EditorAssessment | null = null;
  let revisionDraft: ChapterDraft | null = null;
  let finalAssessment: EditorAssessment | null = null;
  const telemetry = (): ChapterAttemptTelemetry => ({
    initialDraft,
    initialAssessment,
    revisionDraft,
    finalAssessment,
    usages: [...usages],
    revisionCount: revisionDraft ? 1 : 0,
    draftAttempts: revisionDraft ? 2 : initialDraft ? 1 : 0,
    firstPass: initialAssessment ? initialAssessment.status === 'pass' : null,
  });

  try {
    const initial = await provider.json({
      model: input.routes.writer,
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
    finalAssessment = firstAssessment.assessment;
    usages.push(firstAssessment.usage);

    if (firstAssessment.assessment.status === 'pass') {
      const stateAfter = appendAcceptedOutcome({
        state: transition.state,
        title: initial.value.title,
        content: initial.value.content,
        outcome: firstAssessment.assessment.outcome,
      });
      const acceptedOutcome = stateAfter.recentOutcomes[stateAfter.recentOutcomes.length - 1];
      return {
        decision: 'publish',
        draft: initial.value,
        assessment: firstAssessment.assessment,
        stateAfter,
        stateEvents: [
          ...transition.events,
          ...buildMechanicUseEvents(input.plan),
          buildChapterOutcomeEvent({ plan: input.plan, outcome: acceptedOutcome }),
        ],
        contextManifest: contexts.manifest,
        usages,
        revisionCount: 0,
        wordCount: wordCount(initial.value.content),
        attemptTelemetry: telemetry(),
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

    const revision = await provider.json({
      model: input.routes.writer,
      system: REVISION_SYSTEM_PROMPT,
      prompt: JSON.stringify(buildRevisionContext({
        brief: contexts.brief,
        previousTail: contexts.previousTail,
        draft: initial.value,
        assessment: firstAssessment.assessment,
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
    const stateAfter = appendAcceptedOutcome({
      state: transition.state,
      title: revision.value.title,
      content: revision.value.content,
      outcome: secondAssessment.assessment.outcome,
    });
    const acceptedOutcome = stateAfter.recentOutcomes[stateAfter.recentOutcomes.length - 1];
    return {
      decision: 'publish',
      draft: revision.value,
      assessment: secondAssessment.assessment,
      stateAfter,
      stateEvents: [
        ...transition.events,
        ...buildMechanicUseEvents(input.plan),
        buildChapterOutcomeEvent({ plan: input.plan, outcome: acceptedOutcome }),
      ],
      contextManifest: contexts.manifest,
      usages,
      revisionCount: 1,
      wordCount: wordCount(revision.value.content),
      attemptTelemetry: telemetry(),
    };
  } catch (error) {
    const factoryError = error instanceof StoryFactoryError
      ? error
      : new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
    throw new StoryFactoryError(factoryError.code, factoryError.message, {
      cause: factoryError.evidence ?? null,
      pipelineTelemetry: telemetry(),
    });
  }
}
