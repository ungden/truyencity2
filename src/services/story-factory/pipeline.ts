import { z } from 'zod';
import {
  EditorAssessmentSchema,
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
import { applyChapterPlan, type StateEvent } from './validation';

export const ChapterDraftSchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(20),
}).strict();
export type ChapterDraft = z.infer<typeof ChapterDraftSchema>;

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
    schema: EditorAssessmentSchema,
    temperature: 0.4,
  });
  assertDeltaCoverage(input.plan, response.value);
  return { assessment: mergePreflight(response.value, deterministicIssues), usage: response.usage };
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
    return {
      decision: 'publish',
      draft: initial.value,
      assessment: firstAssessment.assessment,
      stateAfter: transition.state,
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
  return {
    decision: 'publish',
    draft: revision.value,
    assessment: secondAssessment.assessment,
    stateAfter: transition.state,
    stateEvents: transition.events,
    contextManifest: contexts.manifest,
    usages,
    revisionCount: 1,
    wordCount: wordCount(revision.value.content),
  };
}
