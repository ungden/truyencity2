import { z } from 'zod';
import {
  ChapterPlanV2Schema,
  validateChapterPlanSemantics,
  type ArcPlanV2,
  type ChapterPlanV2,
  type StorySpecV2,
  type StoryStateV2,
} from './contracts';
import {
  DIRECTOR_SYSTEM,
  EDITOR_SYSTEM,
  WRITER_SYSTEM,
  buildDirectorPrompt,
  buildEditorPrompt,
  buildRevisionPrompt,
  buildWriterPrompt,
} from './prompts';
import type { FlagshipRoleContexts } from './context';
import { evaluateFlagshipQuality, type QualityEvidenceV2, type QualityVerdictV2 } from './quality-verdict';

const AXIS_KEYS = [
  'premise_interest', 'character_voice', 'scene_tension', 'causal_surprise',
  'emotional_movement', 'domain_truth', 'prose_naturalness', 'agency',
  'earned_pleasure', 'recovery_pacing', 'desire_to_read_next',
] as const;

export const WriterOutputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(1000),
}).strict();

const EvidenceSchema = z.object({
  code: z.string().trim().min(2),
  severity: z.enum(['critical', 'major', 'moderate']),
  message: z.string().trim().min(5),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  excerpt: z.string().trim().min(1).max(500),
}).strict();

export const EditorOutputSchema = z.object({
  decision: z.enum(['publish', 'revise', 'reject']),
  confidence: z.number().min(0).max(1),
  planFidelity: z.number().min(0).max(10),
  hardGates: z.object({
    canon: z.boolean(),
    timeline: z.boolean(),
    resourceCausality: z.boolean(),
    characterKnowledge: z.boolean(),
    authority: z.boolean(),
    promptLeak: z.boolean(),
    planFidelity: z.boolean(),
  }).strict(),
  axes: z.object(Object.fromEntries(AXIS_KEYS.map(key => [key, z.number().min(0).max(10)])) as Record<typeof AXIS_KEYS[number], z.ZodNumber>).strict(),
  evidence: z.array(EvidenceSchema).max(30),
  revisionInstructions: z.array(z.string().trim().min(5)).max(12),
}).strict();

export type FlagshipModelRole = 'director' | 'writer' | 'editor' | 'writer_revision';

export interface FlagshipModelCall {
  role: FlagshipModelRole;
  systemPrompt: string;
  userPrompt: string;
  jsonMode: true;
}

export interface FlagshipPipelineDependencies {
  invoke(call: FlagshipModelCall): Promise<string>;
}

export interface FlagshipPipelineInput {
  storySpec: StorySpecV2;
  arcPlan: ArcPlanV2;
  storyState: StoryStateV2;
  preparedPlan: ChapterPlanV2;
  targetWordCount: number;
  /** Pre-budgeted, role-isolated context. Omitted only by offline unit callers. */
  roleContexts?: Pick<FlagshipRoleContexts, 'director' | 'writer' | 'editor'>;
}

export interface FlagshipPipelineOutput {
  title: string;
  content: string;
  chapterPlan: ChapterPlanV2;
  verdict: QualityVerdictV2;
  editorEvidence: QualityEvidenceV2[];
  callRoles: FlagshipModelRole[];
  revisionLineage: Array<{ attempt: number; evidenceCodes: string[] }>;
}

export class FlagshipPipelineError extends Error {
  constructor(
    public readonly code: 'setup_blocked' | 'infra_blocked' | 'quality_rejected' | 'human_gate' | 'commit_failed',
    message: string,
    public readonly detail?: unknown,
  ) {
    super(`${code.toUpperCase()}: ${message}`);
    this.name = 'FlagshipPipelineError';
  }
}

function parseJson<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch (error) {
    throw new FlagshipPipelineError('quality_rejected', `${label} returned invalid JSON`, { error: String(error) });
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new FlagshipPipelineError('quality_rejected', `${label} violated its output contract`, parsed.error.issues);
  }
  return parsed.data;
}

function assertPlanReferences(plan: ChapterPlanV2, spec: StorySpecV2, state: StoryStateV2, expectedChapter: number): void {
  const issues = validateChapterPlanSemantics(plan);
  if (plan.chapterNumber !== expectedChapter) issues.push({ path: 'chapterNumber', message: `Expected chapter ${expectedChapter}.` });

  const allowedCast = new Set(state.cast.map(item => item.name));
  for (const [index, delta] of plan.stateDelta.cast.entries()) {
    if (!allowedCast.has(delta.name)) issues.push({ path: `stateDelta.cast.${index}.name`, message: 'Director introduced a character outside this story kernel/state.' });
  }
  const allowedResources = new Set([...spec.resourceEconomy.map(item => item.resource), ...state.resources.map(item => item.resource)]);
  for (const [index, delta] of plan.stateDelta.resources.entries()) {
    if (!allowedResources.has(delta.resource)) issues.push({ path: `stateDelta.resources.${index}.resource`, message: 'Director introduced a resource outside this story kernel/state.' });
  }
  const allowedPromises = new Set(spec.promisePayoffLedger.map(item => item.id));
  for (const [index, delta] of plan.stateDelta.promises.entries()) {
    if (!allowedPromises.has(delta.id)) issues.push({ path: `stateDelta.promises.${index}.id`, message: 'Director introduced a promise outside StorySpec.' });
  }
  if (issues.length) throw new FlagshipPipelineError('setup_blocked', 'ChapterPlan is not story-safe.', issues);
}

function sorted(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function assertDirectorPreservedPreparedPlan(directed: ChapterPlanV2, prepared: ChapterPlanV2): void {
  const comparisons: Array<[string, string[], string[]]> = [
    ['scene ids', directed.scenes.map(scene => scene.id), prepared.scenes.map(scene => scene.id)],
    ['stateAfter keys', Object.keys(directed.stateAfter), Object.keys(prepared.stateAfter)],
    ['fact delta keys', Object.keys(directed.stateDelta.facts), Object.keys(prepared.stateDelta.facts)],
    ['cast delta names', directed.stateDelta.cast.map(item => item.name), prepared.stateDelta.cast.map(item => item.name)],
    ['resource delta names', directed.stateDelta.resources.map(item => item.resource), prepared.stateDelta.resources.map(item => item.resource)],
    ['promise delta ids', directed.stateDelta.promises.map(item => item.id), prepared.stateDelta.promises.map(item => item.id)],
    ['promises advanced', directed.promisesAdvanced, prepared.promisesAdvanced],
    ['promises paid', directed.promisesPaid, prepared.promisesPaid],
  ];
  const changed = comparisons.filter(([, actual, expected]) => JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(expected))).map(([label]) => label);
  if (directed.scenes.length !== prepared.scenes.length || changed.length) {
    throw new FlagshipPipelineError('setup_blocked', `Director changed prepared plan identity: ${changed.join(', ') || 'scene count'}.`);
  }
}

function evidenceRemoved(content: string, evidence: QualityEvidenceV2[]): boolean {
  return evidence.every(item => {
    const excerpt = item.excerpt.trim();
    return excerpt.length < 12 || !content.includes(excerpt);
  });
}

function groundEvidence(content: string, evidence: QualityEvidenceV2[]): QualityEvidenceV2[] {
  return evidence.map(item => {
    const start = content.indexOf(item.excerpt);
    if (start < 0) {
      throw new FlagshipPipelineError('infra_blocked', `Editor output contract is invalid because evidence is not grounded in prose: ${item.code}.`);
    }
    return { ...item, start, end: start + item.excerpt.length };
  });
}

function calibrated(editor: z.infer<typeof EditorOutputSchema>) {
  return { scores: editor.axes, source: 'independent_model' as const, confidence: editor.confidence };
}

function effectiveHardGates(editor: z.infer<typeof EditorOutputSchema>): Record<string, boolean> {
  return { ...editor.hardGates, planFidelity: editor.hardGates.planFidelity && editor.planFidelity >= 7.5 };
}

export async function executeFlagshipPipeline(
  input: FlagshipPipelineInput,
  dependencies: FlagshipPipelineDependencies,
): Promise<FlagshipPipelineOutput> {
  const callRoles: FlagshipModelRole[] = [];
  const invoke = async (call: FlagshipModelCall): Promise<string> => {
    callRoles.push(call.role);
    if (callRoles.length > 4) throw new FlagshipPipelineError('quality_rejected', 'Flagship model-call budget exceeded.');
    return dependencies.invoke(call);
  };

  assertPlanReferences(input.preparedPlan, input.storySpec, input.storyState, input.storyState.chapterNumber + 1);

  const directedRaw = await invoke({ role: 'director', systemPrompt: DIRECTOR_SYSTEM, userPrompt: buildDirectorPrompt(input), jsonMode: true });
  const chapterPlan = parseJson(directedRaw, ChapterPlanV2Schema, 'Director');
  assertDirectorPreservedPreparedPlan(chapterPlan, input.preparedPlan);
  assertPlanReferences(chapterPlan, input.storySpec, input.storyState, input.preparedPlan.chapterNumber);

  const writerRaw = await invoke({
    role: 'writer',
    systemPrompt: WRITER_SYSTEM,
    userPrompt: buildWriterPrompt({ ...input, chapterPlan }),
    jsonMode: true,
  });
  let draft = parseJson(writerRaw, WriterOutputSchema, 'Writer');

  const editorRaw = await invoke({
    role: 'editor',
    systemPrompt: EDITOR_SYSTEM,
    userPrompt: buildEditorPrompt({ ...input, chapterPlan, ...draft }),
    jsonMode: true,
  });
  const editor = parseJson(editorRaw, EditorOutputSchema, 'Editor');
  const editorEvidence = groundEvidence(draft.content, editor.evidence);
  let verdict = evaluateFlagshipQuality({
    content: draft.content,
    storySpec: input.storySpec,
    chapterPlan,
    calibrated: calibrated(editor),
    editorEvidence,
    hardGates: effectiveHardGates(editor),
    planFidelityScore: editor.planFidelity,
  });

  if (editor.decision === 'reject' || verdict.decision === 'reject') {
    throw new FlagshipPipelineError('quality_rejected', 'Independent editor rejected the chapter.', { verdict, callRoles });
  }

  const revisionLineage: Array<{ attempt: number; evidenceCodes: string[] }> = [];
  if (editor.decision === 'revise' || verdict.decision === 'revise') {
    const locallyRevisable = Object.values(effectiveHardGates(editor)).every(Boolean)
      && Math.min(...Object.values(editor.axes)) >= 7.5
      && editor.confidence >= 0.65
      && editorEvidence.length > 0
      && editorEvidence.every(item => item.severity !== 'critical')
      && editor.revisionInstructions.length > 0;
    if (!locallyRevisable) {
      throw new FlagshipPipelineError('quality_rejected', 'Revision was requested for non-local or under-threshold problems.', { verdict, callRoles });
    }
    const revisionRaw = await invoke({
      role: 'writer_revision',
      systemPrompt: WRITER_SYSTEM,
      userPrompt: buildRevisionPrompt({ ...input, chapterPlan, ...draft, evidence: editorEvidence, instructions: editor.revisionInstructions }),
      jsonMode: true,
    });
    const revised = parseJson(revisionRaw, WriterOutputSchema, 'Revision Writer');
    revisionLineage.push({ attempt: 1, evidenceCodes: editorEvidence.map(item => item.code) });
    if (revised.content === draft.content || !evidenceRemoved(revised.content, editorEvidence)) {
      throw new FlagshipPipelineError('quality_rejected', 'Single revision did not remove the cited evidence.', { callRoles });
    }
    draft = revised;
    verdict = evaluateFlagshipQuality({
      content: draft.content,
      storySpec: input.storySpec,
      chapterPlan,
      calibrated: calibrated(editor),
      hardGates: effectiveHardGates(editor),
      planFidelityScore: editor.planFidelity,
    });
  }

  if (verdict.decision !== 'publish') {
    throw new FlagshipPipelineError('quality_rejected', 'Chapter did not reach publish after the single allowed revision.', { verdict, callRoles });
  }
  return { ...draft, chapterPlan, verdict, editorEvidence, callRoles, revisionLineage };
}
