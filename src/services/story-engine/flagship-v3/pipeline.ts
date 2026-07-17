import { z } from 'zod';
import type { ArcPlanV3, ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';
import type { V3RoleContext, V3RoleContexts } from './context';
import { buildV3ProseSpans, type V3ProseSpan } from './evidence-spans';
import { runV3ProsePreflight, type V3Evidence } from './preflight';
import {
  QualityVerdictV3ModelSchema,
  evaluateQualityV3,
  qualityThresholdFailuresV3,
  type GroundedQualityVerdictV3Model,
  type QualityVerdictV3,
  type QualityVerdictV3Model,
} from './quality';
import {
  V3_EDITOR_SYSTEM,
  V3_WRITER_SYSTEM,
  buildV3EditorPrompt,
  buildV3RevisionPrompt,
  buildV3WriterPrompt,
} from './prompts';
import { validateV3Artifacts } from './validation';

export const WriterOutputV3Schema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(1000),
}).strict();

export type FlagshipV3ModelRole = 'writer' | 'editor' | 'writer_revision' | 'editor_recheck';

export interface FlagshipV3ModelCall {
  role: FlagshipV3ModelRole;
  systemPrompt: string;
  userPrompt: string;
  jsonMode: true;
}

export interface FlagshipV3PipelineInput {
  kernel: StoryKernelV3;
  arc: ArcPlanV3;
  state: StoryStateV3;
  plan: ChapterPlanV3;
  targetWordCount: number;
  contexts: V3RoleContexts;
}

export interface FlagshipV3PipelineOutput {
  title: string;
  content: string;
  plan: ChapterPlanV3;
  verdict: QualityVerdictV3;
  callRoles: FlagshipV3ModelRole[];
  revisionLineage: Array<{ attempt: 1; evidenceCodes: string[] }>;
}

export class FlagshipV3Error extends Error {
  constructor(
    public readonly code: 'setup_blocked' | 'plan_blocked' | 'infra_blocked' | 'quality_blocked' | 'human_gate' | 'commit_failed',
    message: string,
    public readonly detail?: unknown,
  ) {
    super(`${code.toUpperCase()}: ${message}`);
    this.name = 'FlagshipV3Error';
  }
}

function parseJson<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch (error) {
    throw new FlagshipV3Error('infra_blocked', `${label} returned invalid JSON.`, String(error));
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new FlagshipV3Error('infra_blocked', `${label} violated its exact output contract.`, parsed.error.issues);
  }
  return parsed.data;
}

function groundEditor(editor: QualityVerdictV3Model, spans: V3ProseSpan[]): GroundedQualityVerdictV3Model {
  const byId = new Map(spans.map(span => [span.id, span]));
  const evidence = editor.evidence.map(item => {
    const span = byId.get(item.spanId);
    if (!span) throw new FlagshipV3Error('infra_blocked', `Editor evidence references unknown span: ${item.spanId}.`);
    return { code: item.code, severity: item.severity, message: item.message, local: item.local, start: span.start, end: span.end, excerpt: span.text };
  });
  const realizedDeltaEvidence = editor.realizedDeltaEvidence.map(item => {
    const span = byId.get(item.spanId);
    if (!span) throw new FlagshipV3Error('infra_blocked', `Delta evidence references unknown span: ${item.spanId}.`);
    return { deltaId: item.deltaId, start: span.start, end: span.end, excerpt: span.text };
  });
  return { ...editor, evidence, realizedDeltaEvidence };
}

function assertAuditable(editor: GroundedQualityVerdictV3Model, deterministicEvidence: V3Evidence[]): void {
  const failedGate = Object.values(editor.hardGates).some(value => !value);
  const thresholdFailures = qualityThresholdFailuresV3(editor);
  if ((editor.decision !== 'publish' || failedGate || thresholdFailures.length > 0)
    && editor.evidence.length === 0
    && deterministicEvidence.length === 0) {
    throw new FlagshipV3Error('infra_blocked', 'Editor returned a failing verdict without grounded evidence.', { thresholdFailures });
  }
  if (editor.decision === 'revise' && editor.revisionInstructions.length === 0) {
    throw new FlagshipV3Error('infra_blocked', 'Editor requested revision without scoped instructions.');
  }
  if (editor.decision === 'revise') {
    const mutableFoundation = /(?:cập nhật|sửa|đổi|điều chỉnh).{0,40}(?:state|tracking|plan|kế hoạch|canon|artifact)/iu;
    if (editor.revisionInstructions.some(instruction => mutableFoundation.test(instruction))) {
      throw new FlagshipV3Error(
        'infra_blocked',
        'Editor attempted to repair prose by mutating immutable story artifacts.',
        { revisionInstructions: editor.revisionInstructions },
      );
    }
  }
}

export async function executeFlagshipV3Pipeline(
  input: FlagshipV3PipelineInput,
  dependencies: { invoke(call: FlagshipV3ModelCall): Promise<string> },
): Promise<FlagshipV3PipelineOutput> {
  const planIssues = validateV3Artifacts(input);
  if (planIssues.length) throw new FlagshipV3Error('plan_blocked', 'ChapterPlanV3 does not match committed story state.', planIssues);

  const callRoles: FlagshipV3ModelRole[] = [];
  const invoke = async (call: FlagshipV3ModelCall): Promise<string> => {
    callRoles.push(call.role);
    if (callRoles.length > 4) throw new FlagshipV3Error('quality_blocked', 'Flagship v3 call budget exceeded.');
    return dependencies.invoke(call);
  };

  const firstRaw = await invoke({
    role: 'writer',
    systemPrompt: V3_WRITER_SYSTEM,
    userPrompt: buildV3WriterPrompt({
      chapterNumber: input.plan.chapterNumber,
      targetWordCount: input.targetWordCount,
      context: input.contexts.writer,
    }),
    jsonMode: true,
  });
  let draft = parseJson(firstRaw, WriterOutputV3Schema, 'Writer');
  let deterministicEvidence = runV3ProsePreflight(draft.content, input.plan);

  const edit = async (role: 'editor' | 'editor_recheck', context: V3RoleContext): Promise<{
    editor: GroundedQualityVerdictV3Model;
    verdict: QualityVerdictV3;
  }> => {
    const spans = buildV3ProseSpans(draft.content);
    const raw = await invoke({
      role,
      systemPrompt: V3_EDITOR_SYSTEM,
      userPrompt: buildV3EditorPrompt({
        plan: input.plan,
        context,
        title: draft.title,
        content: draft.content,
        spans,
        deterministicEvidence,
      }),
      jsonMode: true,
    });
    const editor = groundEditor(parseJson(raw, QualityVerdictV3ModelSchema, role), spans);
    assertAuditable(editor, deterministicEvidence);
    return { editor, verdict: evaluateQualityV3({ plan: input.plan, editor, deterministicEvidence }) };
  };

  let reviewed = await edit('editor', input.contexts.editor);
  if (reviewed.verdict.decision === 'publish') {
    return { ...draft, plan: input.plan, verdict: reviewed.verdict, callRoles, revisionLineage: [] };
  }
  if (reviewed.verdict.decision === 'reject') {
    throw new FlagshipV3Error('quality_blocked', 'Independent editor rejected the chapter.', {
      verdict: reviewed.verdict,
      draft,
      callRoles,
      revisionLineage: [],
    });
  }

  const evidence = reviewed.verdict.evidence;
  const revisionRaw = await invoke({
    role: 'writer_revision',
    systemPrompt: V3_WRITER_SYSTEM,
    userPrompt: buildV3RevisionPrompt({
      chapterNumber: input.plan.chapterNumber,
      context: input.contexts.revision(),
      title: draft.title,
      content: draft.content,
      evidence,
      instructions: reviewed.editor.revisionInstructions,
    }),
    jsonMode: true,
  });
  const revised = parseJson(revisionRaw, WriterOutputV3Schema, 'Revision Writer');
  if (revised.content === draft.content) {
    throw new FlagshipV3Error('quality_blocked', 'Revision Writer returned unchanged prose.', {
      verdict: reviewed.verdict,
      draft,
      callRoles,
      revisionLineage: [{ attempt: 1, evidenceCodes: evidence.map(item => item.code) }],
    });
  }
  draft = revised;
  deterministicEvidence = runV3ProsePreflight(draft.content, input.plan);
  reviewed = await edit('editor_recheck', input.contexts.editor);
  const revisionLineage = [{ attempt: 1 as const, evidenceCodes: evidence.map(item => item.code) }];
  if (reviewed.verdict.decision !== 'publish') {
    throw new FlagshipV3Error('quality_blocked', 'Re-editor did not approve the single revision.', {
      verdict: reviewed.verdict,
      draft,
      callRoles,
      revisionLineage,
    });
  }
  return { ...draft, plan: input.plan, verdict: reviewed.verdict, callRoles, revisionLineage };
}
