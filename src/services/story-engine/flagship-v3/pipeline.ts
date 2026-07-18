import { z } from 'zod';
import type { ArcPlanV3, ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';
import type { V3RoleContext, V3RoleContexts } from './context';
import { buildV3ProseSpans, type V3ProseSpan } from './evidence-spans';
import { runV3StructuredProsePreflight, type V3Evidence } from './preflight';
import {
  EditorAssessmentV3Schema,
  buildEditorResponseJsonSchemaV3,
  evaluateQualityV3,
  type EditorAssessmentV3,
  type GroundedEditorAssessmentV3,
  type QualityVerdictV3,
} from './quality';
import {
  V3_EDITOR_SYSTEM,
  V3_WRITER_SYSTEM,
  buildV3EditorPrompt,
  buildV3RevisionPrompt,
  buildV3WriterPrompt,
} from './prompts';
import { validateV3Artifacts } from './validation';

const writerSceneId = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);

export const WriterOutputV3Schema = z.object({
  title: z.string().trim().min(2).max(200),
  scenes: z.array(z.object({
    sceneId: writerSceneId,
    paragraphs: z.array(z.string().trim().min(10).max(2_000)).min(3).max(60),
  }).strict().superRefine((scene, ctx) => {
    if (scene.paragraphs.join(' ').length < 200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paragraphs'], message: 'Scene prose must contain at least 200 characters.' });
    }
  })).min(1).max(5),
}).strict();

export const LocalPatchOutputV3Schema = z.object({
  patches: z.array(z.object({
    spanId: z.string().regex(/^span_\d{3,}$/),
    replacement: z.string().trim().min(10).max(4_000),
  }).strict()).min(1).max(3),
}).strict();

export const RevisionOutputV3Schema = z.union([WriterOutputV3Schema, LocalPatchOutputV3Schema]);

export function buildWriterResponseJsonSchemaV3(plan: ChapterPlanV3): Record<string, unknown> {
  const sceneIds = plan.scenes.map(scene => scene.id);
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      scenes: {
        type: 'array', minItems: sceneIds.length, maxItems: sceneIds.length,
        items: {
          type: 'object',
          properties: {
            sceneId: { type: 'string', enum: sceneIds },
            paragraphs: {
              type: 'array', minItems: 3, maxItems: 60,
              items: { type: 'string', minLength: 10, maxLength: 2_000 },
            },
          },
          required: ['sceneId', 'paragraphs'], additionalProperties: false,
        },
      },
    },
    required: ['title', 'scenes'], additionalProperties: false,
  };
}

function buildLocalPatchResponseJsonSchemaV3(spanIds: string[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      patches: {
        type: 'array', minItems: spanIds.length, maxItems: spanIds.length,
        items: {
          type: 'object',
          properties: {
            spanId: { type: 'string', enum: spanIds },
            replacement: { type: 'string', minLength: 10, maxLength: 4_000 },
          },
          required: ['spanId', 'replacement'], additionalProperties: false,
        },
      },
    },
    required: ['patches'], additionalProperties: false,
  };
}

type WriterOutputV3 = z.infer<typeof WriterOutputV3Schema>;
type ChapterDraftV3 = {
  title: string;
  scenes: Array<{ sceneId: string; content: string }>;
  content: string;
};

function normalizeWriterSceneContent(content: string): string {
  // Some constrained JSON providers double-escape formatting inside string
  // values (literal "\\n") even though the surrounding JSON is valid. This is
  // transport normalization only: no word, punctuation or event is rewritten.
  return content.replace(/\\r\\n|\\n|\\r/gu, '\n').replace(/\\t/gu, '\t').trim();
}

function normalizeWriterTitle(title: string, chapterNumber: number): string {
  return title.replace(new RegExp(`^Chương\\s+${chapterNumber}\\s*[:.\\-–—]\\s*`, 'iu'), '').trim();
}

function materializeWriterOutput(output: WriterOutputV3, plan: ChapterPlanV3): ChapterDraftV3 {
  const expected = plan.scenes.map(scene => scene.id);
  const received = output.scenes.map(scene => scene.sceneId);
  if (expected.length !== received.length || expected.some((sceneId, index) => sceneId !== received[index])) {
    throw new FlagshipV3Error('infra_blocked', 'Writer changed, omitted or reordered ChapterPlan scene IDs.', { expected, received });
  }
  const scenes = output.scenes.map(scene => ({
    sceneId: scene.sceneId,
    content: scene.paragraphs.map(normalizeWriterSceneContent).join('\n\n'),
  }));
  const title = normalizeWriterTitle(output.title, plan.chapterNumber);
  if (title.length < 2) throw new FlagshipV3Error('infra_blocked', 'Writer returned an empty title after chapter-prefix normalization.');
  return { title, scenes, content: scenes.map(scene => scene.content).join('\n\n') };
}

function applyLocalPatches(draft: ChapterDraftV3, spans: V3ProseSpan[], raw: string): ChapterDraftV3 {
  const parsed = parseJson(raw, LocalPatchOutputV3Schema, 'Local Revision Writer');
  const byId = new Map(spans.map(span => [span.id, span]));
  const seen = new Set<string>();
  const patches = parsed.patches.map(patch => {
    if (seen.has(patch.spanId)) throw new FlagshipV3Error('infra_blocked', `Revision duplicated patch span ${patch.spanId}.`);
    seen.add(patch.spanId);
    const span = byId.get(patch.spanId);
    if (!span) throw new FlagshipV3Error('infra_blocked', `Revision referenced unknown patch span ${patch.spanId}.`);
    if (patch.replacement === span.text) throw new FlagshipV3Error('quality_blocked', `Revision left ${patch.spanId} unchanged.`);
    return { ...patch, span };
  }).sort((left, right) => right.span.start - left.span.start);
  if (seen.size !== byId.size) {
    const missing = [...byId.keys()].filter(spanId => !seen.has(spanId));
    throw new FlagshipV3Error('infra_blocked', 'Local revision omitted grounded evidence spans.', { missing });
  }
  let sceneSearchOffset = 0;
  const sceneRanges = draft.scenes.map(scene => {
    const start = draft.content.indexOf(scene.content, sceneSearchOffset);
    if (start < 0) throw new FlagshipV3Error('infra_blocked', `Could not locate scene ${scene.sceneId} in materialized prose.`);
    const end = start + scene.content.length;
    sceneSearchOffset = end;
    return { scene, start, end };
  });
  const nextScenes = draft.scenes.map(scene => ({ ...scene }));
  for (const patch of patches) {
    const sceneIndex = sceneRanges.findIndex(range => patch.span.start >= range.start && patch.span.end <= range.end);
    if (sceneIndex < 0) throw new FlagshipV3Error('infra_blocked', `Local patch ${patch.spanId} crosses a scene boundary.`);
    const range = sceneRanges[sceneIndex];
    const relativeStart = patch.span.start - range.start;
    const relativeEnd = patch.span.end - range.start;
    const current = nextScenes[sceneIndex].content;
    nextScenes[sceneIndex].content = current.slice(0, relativeStart) + patch.replacement + current.slice(relativeEnd);
  }
  return { ...draft, scenes: nextScenes, content: nextScenes.map(scene => scene.content.trim()).join('\n\n') };
}

export type FlagshipV3ModelRole = 'writer' | 'editor' | 'writer_revision' | 'editor_recheck';

export interface FlagshipV3ModelCall {
  role: FlagshipV3ModelRole;
  systemPrompt: string;
  userPrompt: string;
  jsonMode: true;
  responseJsonSchema?: Record<string, unknown>;
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

function groundEditor(editor: EditorAssessmentV3, spans: V3ProseSpan[]): GroundedEditorAssessmentV3 {
  const byId = new Map(spans.map(span => [span.id, span]));
  const issues = editor.issues.map(item => {
    const span = byId.get(item.spanId);
    if (!span) throw new FlagshipV3Error('infra_blocked', `Editor evidence references unknown span: ${item.spanId}.`);
    return {
      ...item,
      code: `editor_${item.gate}`,
      local: item.locality === 'local',
      start: span.start,
      end: span.end,
      excerpt: span.text,
    };
  });
  const realizedDeltaEvidence = editor.realizedDeltaEvidence.map(item => {
    const span = byId.get(item.spanId);
    if (!span) throw new FlagshipV3Error('infra_blocked', `Delta evidence references unknown span: ${item.spanId}.`);
    return { deltaId: item.deltaId, start: span.start, end: span.end, excerpt: span.text };
  });
  return { ...editor, issues, realizedDeltaEvidence };
}

function assertAuditable(editor: GroundedEditorAssessmentV3): void {
  if (editor.status === 'issues') {
    const mutableFoundation = /(?:cập nhật|sửa|đổi|điều chỉnh)\s+(?:lại\s+)?(?:story\s+)?(?:state|tracking|chapterplan|plan|kế hoạch|canon|artifact)\b/iu;
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
    responseJsonSchema: buildWriterResponseJsonSchemaV3(input.plan),
  });
  let draft = materializeWriterOutput(parseJson(firstRaw, WriterOutputV3Schema, 'Writer'), input.plan);
  let deterministicEvidence = runV3StructuredProsePreflight({
    content: draft.content,
    scenes: draft.scenes,
    plan: input.plan,
    targetWordCount: input.targetWordCount,
    kernel: input.kernel,
    state: input.state,
  });

  const edit = async (role: 'editor' | 'editor_recheck', context: V3RoleContext): Promise<{
    editor: GroundedEditorAssessmentV3;
    verdict: QualityVerdictV3;
  }> => {
    const spans = buildV3ProseSpans(draft.content);
    const editorIssueBudget = Math.max(1, 3 - deterministicEvidence.length);
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
      responseJsonSchema: buildEditorResponseJsonSchemaV3(input.plan, editorIssueBudget),
    });
    const editor = groundEditor(parseJson(raw, EditorAssessmentV3Schema, role), spans);
    if (editor.status === 'issues' && (
      editor.issues.length > editorIssueBudget
      || editor.revisionInstructions.length > editorIssueBudget
    )) {
      throw new FlagshipV3Error('infra_blocked', `${role} exceeded the combined deterministic/editor issue budget.`, {
        deterministicIssues: deterministicEvidence.length,
        editorIssueBudget,
        editorIssues: editor.issues.length,
        revisionInstructions: editor.revisionInstructions.length,
      });
    }
    assertAuditable(editor);
    return { editor, verdict: evaluateQualityV3({ plan: input.plan, editor, deterministicEvidence }) };
  };

  let reviewed = await edit('editor', input.contexts.editor);
  if (reviewed.verdict.decision === 'publish') {
    return { ...draft, plan: input.plan, verdict: reviewed.verdict, callRoles, revisionLineage: [] };
  }
  if (reviewed.verdict.decision === 'reject') {
    if (reviewed.verdict.blocker) {
      throw new FlagshipV3Error(reviewed.verdict.blocker, 'Editor found an invalid immutable story artifact.', {
        verdict: reviewed.verdict,
        draft,
        callRoles,
      });
    }
    throw new FlagshipV3Error('quality_blocked', 'Independent editor rejected the chapter.', {
      verdict: reviewed.verdict,
      draft,
      callRoles,
      revisionLineage: [],
    });
  }

  const evidence = reviewed.verdict.evidence;
  const repairMode = reviewed.verdict.repairMode;
  if (!repairMode) throw new FlagshipV3Error('quality_blocked', 'Revision was requested without a repair mode.');
  const currentSpans = buildV3ProseSpans(draft.content);
  const allowedSpans = repairMode === 'local_edit'
    ? currentSpans.filter(span => evidence.some(item => item.start < span.end && item.end > span.start))
    : [];
  if (repairMode === 'local_edit' && allowedSpans.length === 0) {
    throw new FlagshipV3Error('quality_blocked', 'Local revision has no grounded evidence span.');
  }
  const revisionRaw = await invoke({
    role: 'writer_revision',
    systemPrompt: V3_WRITER_SYSTEM,
    userPrompt: buildV3RevisionPrompt({
      chapterNumber: input.plan.chapterNumber,
      targetWordCount: input.targetWordCount,
      context: input.contexts.revision(),
      title: draft.title,
      content: draft.content,
      evidence,
      instructions: reviewed.verdict.revisionInstructions,
      repairMode,
      allowedSpans: allowedSpans.map(span => ({ id: span.id, text: span.text })),
    }),
    jsonMode: true,
    responseJsonSchema: repairMode === 'local_edit'
      ? buildLocalPatchResponseJsonSchemaV3(allowedSpans.map(span => span.id))
      : buildWriterResponseJsonSchemaV3(input.plan),
  });
  const revised = repairMode === 'local_edit'
    ? applyLocalPatches(draft, allowedSpans, revisionRaw)
    : materializeWriterOutput(parseJson(revisionRaw, WriterOutputV3Schema, 'Revision Writer'), input.plan);
  if (revised.content === draft.content) {
    throw new FlagshipV3Error('quality_blocked', 'Revision Writer returned unchanged prose.', {
      verdict: reviewed.verdict,
      draft,
      callRoles,
      revisionLineage: [{ attempt: 1, evidenceCodes: evidence.map(item => item.code) }],
    });
  }
  draft = revised;
  deterministicEvidence = runV3StructuredProsePreflight({
    content: draft.content,
    scenes: draft.scenes,
    plan: input.plan,
    targetWordCount: input.targetWordCount,
    kernel: input.kernel,
    state: input.state,
  });
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
