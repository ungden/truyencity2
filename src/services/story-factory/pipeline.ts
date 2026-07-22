import { z } from 'zod';
import {
  ChapterOutcomeContentSchema,
  EditorAssessmentSchema,
  EditorIssueSchema,
  StoryFactoryError,
  type ChapterPlan,
  type EditorAssessment,
  type ModelRoutes,
  type StoryKernel,
  type StoryState,
} from './contracts';
import { buildChapterContexts, buildRevisionContext, type ContextManifestEntry } from './context';
import type { ProviderUsage, StoryModelProvider } from './provider';
import { geminiProvider } from './provider';
import { EDITOR_SYSTEM_PROMPT, REVISION_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT } from './prompts';
import { appendAcceptedOutcome, applyChapterPlan, groundEvidenceSpan, type StateEvent } from './validation';

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
  method: z.string().max(400),
  endingSituation: z.string().max(400),
  evidenceSpans: z.array(z.string().max(200)).max(4),
}).strict();

export const EditorWireAssessmentSchema = z.object({
  v: z.literal(1),
  status: z.enum(['pass', 'revise']),
  issues: z.array(EditorIssueSchema).max(3),
  deltaChecks: z.array(EditorWireDeltaCheckSchema).min(1).max(30),
  outcome: EditorWireOutcomeSchema,
}).strict();

const EDITOR_WIRE_CONTRACT = {
  pass: 'status=pass, issues=[], mọi deltaChecks.realized=true, outcome có nội dung và evidenceSpans nguyên văn.',
  revise: 'status=revise, issues có 1-3 phần tử; để mọi trường chuỗi của outcome rỗng và evidenceSpans=[].',
} as const;

export function materializeEditorAssessment(value: z.infer<typeof EditorWireAssessmentSchema>): EditorAssessment {
  const wire = EditorWireAssessmentSchema.parse(value);
  const failedDeltas = wire.deltaChecks.filter(check => !check.realized);
  if (wire.issues.length === 0 && failedDeltas.length === 0) {
    const outcome = ChapterOutcomeContentSchema.parse(wire.outcome);
    return EditorAssessmentSchema.parse({ status: 'pass', issues: wire.issues, deltaChecks: wire.deltaChecks, outcome });
  }
  const issues = wire.issues.length > 0 ? wire.issues : failedDeltas.slice(0, 3).map(check => ({
    category: 'required_delta' as const,
    severity: 'major' as const,
    scope: 'prose' as const,
    evidence: check.evidence.trim() || `Delta ${check.deltaId} chưa có bằng chứng trong prose.`,
    instruction: `Viết lại để thực hiện rõ required delta ${check.deltaId}.`,
  }));
  return EditorAssessmentSchema.parse({ status: 'revise', issues, deltaChecks: wire.deltaChecks });
}

interface PreflightIssue {
  category: 'prompt_leak' | 'prose_naturalness';
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
      category: 'prompt_leak',
      evidence: match[0],
      instruction: 'Viết lại đoạn này như prose trong thế giới truyện, không để lộ thuật ngữ vận hành.',
    });
  }
  const foreign = draft.content.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u);
  if (foreign) issues.push({
    category: 'prose_naturalness',
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
    wireContract: EDITOR_WIRE_CONTRACT,
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
  const existing = assessment.status === 'revise' ? assessment.issues : [];
  const issues = [
    ...deterministic.map(issue => ({
      category: issue.category,
      severity: 'major' as const,
      scope: 'prose' as const,
      evidence: issue.evidence,
      instruction: issue.instruction,
    })),
    ...existing,
  ].slice(0, 3);
  return EditorAssessmentSchema.parse({ status: 'revise', issues, deltaChecks: assessment.deltaChecks });
}

async function assess(input: {
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
  }
  assertDeltaCoverage(input.plan, assessment);
  return { assessment: mergePreflight(assessment, deterministicIssues), usage: response.usage };
}

export async function writeStoryChapter(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  previousChapter?: string;
  routes: ModelRoutes;
  provider?: StoryModelProvider;
}): Promise<ChapterPipelineResult> {
  const provider = input.provider ?? geminiProvider;
  // Validate and materialize the exact state transition before spending a model call.
  const transition = applyChapterPlan({ kernel: input.kernel, state: input.state, plan: input.plan });
  const contexts = buildChapterContexts(input);
  const usages: ProviderUsage[] = [];

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
  usages.push(initial.usage);
  const firstAssessment = await assess({
    provider,
    model: input.routes.editor,
    kernel: contexts.editorKernel,
    state: contexts.editorState,
    plan: input.plan,
    draft: initial.value,
  });
  usages.push(firstAssessment.usage);

  if (firstAssessment.assessment.status === 'pass') {
    const stateAfter = appendAcceptedOutcome({
      state: transition.state,
      title: initial.value.title,
      content: initial.value.content,
      outcome: firstAssessment.assessment.outcome,
    });
    return {
      decision: 'publish',
      draft: initial.value,
      assessment: firstAssessment.assessment,
      stateAfter,
      stateEvents: transition.events,
      contextManifest: contexts.manifest,
      usages,
      revisionCount: 0,
      wordCount: wordCount(initial.value.content),
    };
  }

  const artifactIssue = firstAssessment.assessment.issues.find(issue => issue.scope !== 'prose');
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
  usages.push(revision.usage);
  const secondAssessment = await assess({
    provider,
    model: input.routes.editor,
    kernel: contexts.editorKernel,
    state: contexts.editorState,
    plan: input.plan,
    draft: revision.value,
  });
  usages.push(secondAssessment.usage);
  if (secondAssessment.assessment.status !== 'pass') {
    const artifact = secondAssessment.assessment.issues.find(issue => issue.scope !== 'prose');
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
  return {
    decision: 'publish',
    draft: revision.value,
    assessment: secondAssessment.assessment,
    stateAfter,
    stateEvents: transition.events,
    contextManifest: contexts.manifest,
    usages,
    revisionCount: 1,
    wordCount: wordCount(revision.value.content),
  };
}
