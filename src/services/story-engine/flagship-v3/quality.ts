import { z } from 'zod';
import type { ChapterPlanV3 } from './contracts';
import type { V3Evidence } from './preflight';

export const V3_HARD_GATE_KEYS = [
  'canon', 'timeline', 'resource_causality', 'character_knowledge',
  'authority', 'prompt_leak', 'plan_fidelity',
] as const;
export type V3HardGate = typeof V3_HARD_GATE_KEYS[number];

export const V3_QUALITY_GATE_KEYS = [
  'premise_interest', 'character_voice', 'scene_tension', 'causal_surprise',
  'emotional_movement', 'domain_truth', 'prose_naturalness', 'agency',
  'earned_pleasure', 'recovery_pacing', 'desire_to_read_next',
] as const;
export type V3QualityGate = typeof V3_QUALITY_GATE_KEYS[number];
export const V3_AXIS_KEYS = V3_QUALITY_GATE_KEYS;
export type V3QualityAxis = V3QualityGate;

const booleanObjectJsonSchema = (keys: readonly string[], passOnly: boolean): Record<string, unknown> => ({
  type: 'object',
  properties: Object.fromEntries(keys.map(key => [key, passOnly
    ? { type: 'boolean', enum: [true] }
    : { type: 'boolean' }])),
  required: [...keys],
  additionalProperties: false,
});

/**
 * Gemini rejects large, deeply repeated Zod-derived unions as a constrained
 * decoding state explosion. Keep the provider contract equivalent but bound it
 * to the current chapter: at most three reported issues and only the required
 * delta IDs that can actually occur in this plan. Zod and application
 * validation remain authoritative after generation.
 */
export function buildEditorResponseJsonSchemaV3(plan: ChapterPlanV3, issueBudget = 3): Record<string, unknown> {
  const boundedIssueBudget = Math.max(1, Math.min(3, Math.floor(issueBudget)));
  const deltaIds = [...new Set(plan.requiredDeltas
    .filter(delta => delta.evidenceRequired)
    .map(delta => delta.id))];
  const deltaEvidence = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        deltaId: deltaIds.length > 0
          ? { type: 'string', enum: deltaIds }
          : { type: 'string' },
        spanId: { type: 'string' },
      },
      required: ['deltaId', 'spanId'],
      additionalProperties: false,
    },
    minItems: 0,
    maxItems: deltaIds.length,
  };
  const issue = {
    type: 'object',
    properties: {
      gate: { type: 'string', enum: [...V3_HARD_GATE_KEYS, ...V3_QUALITY_GATE_KEYS] },
      severity: { type: 'string', enum: ['critical', 'major', 'moderate'] },
      spanId: { type: 'string' },
      message: { type: 'string' },
      locality: { type: 'string', enum: ['local', 'non_local'] },
      repairMode: { type: 'string', enum: ['local_edit', 'full_rewrite', 'artifact_blocked'] },
    },
    required: ['gate', 'severity', 'spanId', 'message', 'locality', 'repairMode'],
    additionalProperties: false,
  };
  const branch = (status: 'pass' | 'issues'): Record<string, unknown> => ({
    type: 'object',
    properties: {
      status: { type: 'string', enum: [status] },
      hardGates: booleanObjectJsonSchema(V3_HARD_GATE_KEYS, status === 'pass'),
      qualityGates: booleanObjectJsonSchema(V3_QUALITY_GATE_KEYS, status === 'pass'),
      issues: status === 'pass'
        ? { type: 'array', items: issue, minItems: 0, maxItems: 0 }
        : { type: 'array', items: issue, minItems: 1, maxItems: boundedIssueBudget },
      revisionInstructions: status === 'pass'
        ? { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 0 }
        : { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: boundedIssueBudget },
      realizedDeltaEvidence: status === 'pass'
        ? { ...deltaEvidence, minItems: deltaIds.length }
        : deltaEvidence,
    },
    required: ['status', 'hardGates', 'qualityGates', 'issues', 'revisionInstructions', 'realizedDeltaEvidence'],
    additionalProperties: false,
  });
  return { anyOf: [branch('pass'), branch('issues')] };
}

const hardGateBooleans = z.object({
  canon: z.boolean(),
  timeline: z.boolean(),
  resource_causality: z.boolean(),
  character_knowledge: z.boolean(),
  authority: z.boolean(),
  prompt_leak: z.boolean(),
  plan_fidelity: z.boolean(),
}).strict();

const hardGatePass = z.object({
  canon: z.literal(true),
  timeline: z.literal(true),
  resource_causality: z.literal(true),
  character_knowledge: z.literal(true),
  authority: z.literal(true),
  prompt_leak: z.literal(true),
  plan_fidelity: z.literal(true),
}).strict();

const qualityGateBooleans = z.object({
  premise_interest: z.boolean(),
  character_voice: z.boolean(),
  scene_tension: z.boolean(),
  causal_surprise: z.boolean(),
  emotional_movement: z.boolean(),
  domain_truth: z.boolean(),
  prose_naturalness: z.boolean(),
  agency: z.boolean(),
  earned_pleasure: z.boolean(),
  recovery_pacing: z.boolean(),
  desire_to_read_next: z.boolean(),
}).strict();

const qualityGatePass = z.object({
  premise_interest: z.literal(true),
  character_voice: z.literal(true),
  scene_tension: z.literal(true),
  causal_surprise: z.literal(true),
  emotional_movement: z.literal(true),
  domain_truth: z.literal(true),
  prose_naturalness: z.literal(true),
  agency: z.literal(true),
  earned_pleasure: z.literal(true),
  recovery_pacing: z.literal(true),
  desire_to_read_next: z.literal(true),
}).strict();

export const V3EditorIssueSchema = z.object({
  gate: z.enum([...V3_HARD_GATE_KEYS, ...V3_QUALITY_GATE_KEYS]),
  severity: z.enum(['critical', 'major', 'moderate']),
  spanId: z.string().regex(/^span_\d{3,}$/),
  message: z.string().trim().min(5).max(800),
  locality: z.enum(['local', 'non_local']),
  repairMode: z.enum(['local_edit', 'full_rewrite', 'artifact_blocked']),
}).strict();

const realizedDeltaEvidence = z.array(z.object({
  deltaId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  spanId: z.string().regex(/^span_\d{3,}$/),
}).strict()).max(30);

const revisionInstructions = z.array(z.string().trim().min(5).max(800)).max(3);

const EditorPassAssessmentV3Schema = z.object({
  status: z.literal('pass'),
  hardGates: hardGatePass,
  qualityGates: qualityGatePass,
  issues: z.array(V3EditorIssueSchema).length(0),
  revisionInstructions: revisionInstructions.length(0),
  realizedDeltaEvidence,
}).strict();

const EditorIssuesAssessmentV3Schema = z.object({
  status: z.literal('issues'),
  hardGates: hardGateBooleans,
  qualityGates: qualityGateBooleans,
  issues: z.array(V3EditorIssueSchema).min(1).max(30),
  revisionInstructions,
  realizedDeltaEvidence,
}).strict();

export const EditorAssessmentV3Schema = z.discriminatedUnion('status', [
  EditorPassAssessmentV3Schema,
  EditorIssuesAssessmentV3Schema,
]);

// Alias retained for audit readers while all runtime callers move to the new
// evidence-only contract. It intentionally contains no numeric score/decision.
export const QualityVerdictV3ModelSchema = EditorAssessmentV3Schema;

export type EditorAssessmentV3 = z.infer<typeof EditorAssessmentV3Schema>;
export type QualityVerdictV3Model = EditorAssessmentV3;

export interface GroundedEditorIssueV3 extends V3Evidence {
  gate: V3HardGate | V3QualityGate;
  locality: 'local' | 'non_local';
  repairMode: 'local_edit' | 'full_rewrite' | 'artifact_blocked';
}

export type GroundedEditorAssessmentV3 = Omit<EditorAssessmentV3, 'issues' | 'realizedDeltaEvidence'> & {
  issues: GroundedEditorIssueV3[];
  realizedDeltaEvidence: Array<{ deltaId: string; start: number; end: number; excerpt: string }>;
};
export type GroundedQualityVerdictV3Model = GroundedEditorAssessmentV3;

export interface QualityVerdictV3 {
  version: 3;
  decision: 'publish' | 'revise' | 'reject';
  gateSummary: {
    hard: Record<V3HardGate, boolean>;
    quality: Record<V3QualityGate, boolean>;
  };
  evidence: V3Evidence[];
  realizedDeltaEvidence: GroundedEditorAssessmentV3['realizedDeltaEvidence'];
  revisionInstructions: string[];
  repairMode: 'local_edit' | 'full_rewrite' | null;
  blocker: 'setup_blocked' | 'plan_blocked' | null;
}

const allTrue = (values: Record<string, boolean>): boolean => Object.values(values).every(Boolean);

export function evaluateQualityV3(input: {
  plan: ChapterPlanV3;
  editor: GroundedEditorAssessmentV3;
  deterministicEvidence: V3Evidence[];
}): QualityVerdictV3 {
  const editorEvidence: V3Evidence[] = input.editor.issues.map(issue => ({
    code: `editor_${issue.gate}`,
    severity: issue.severity,
    message: issue.message,
    start: issue.start,
    end: issue.end,
    excerpt: issue.excerpt,
    local: issue.local,
  }));
  const evidence = [...input.deterministicEvidence, ...editorEvidence];
  const realized = new Set(input.editor.realizedDeltaEvidence.map(item => item.deltaId));
  const missingDeltas = input.plan.requiredDeltas.filter(delta => delta.evidenceRequired && !realized.has(delta.id));
  for (const delta of missingDeltas) {
    evidence.push({
      code: 'required_delta_unrealized',
      severity: 'critical',
      message: `Required state delta ${delta.id} has no grounded prose evidence.`,
      start: 0,
      end: 0,
      excerpt: delta.id,
      local: false,
    });
  }

  const gateSummary = { hard: input.editor.hardGates, quality: input.editor.qualityGates };
  if (input.editor.issues.some(issue => issue.repairMode === 'artifact_blocked')) {
    const planArtifact = input.editor.issues.some(issue => issue.repairMode === 'artifact_blocked' && issue.gate === 'plan_fidelity');
    return {
      version: 3,
      decision: 'reject',
      gateSummary,
      evidence,
      realizedDeltaEvidence: input.editor.realizedDeltaEvidence,
      revisionInstructions: [],
      repairMode: null,
      blocker: planArtifact ? 'plan_blocked' : 'setup_blocked',
    };
  }

  const clean = input.editor.status === 'pass'
    && allTrue(input.editor.hardGates)
    && allTrue(input.editor.qualityGates)
    && evidence.length === 0
    && missingDeltas.length === 0;
  if (clean) {
    return {
      version: 3,
      decision: 'publish',
      gateSummary,
      evidence,
      realizedDeltaEvidence: input.editor.realizedDeltaEvidence,
      revisionInstructions: [],
      repairMode: null,
      blocker: null,
    };
  }

  const issueCount = input.editor.issues.length + input.deterministicEvidence.length;
  const repairable = missingDeltas.length > 0 || (issueCount > 0 && issueCount <= 3);
  const repairMode: 'local_edit' | 'full_rewrite' = missingDeltas.length > 0
    || input.editor.issues.some(issue => issue.repairMode === 'full_rewrite' || issue.locality === 'non_local')
    || input.deterministicEvidence.some(issue => !issue.local)
    ? 'full_rewrite'
    : 'local_edit';
  const generatedInstructions = evidence.slice(0, 3).map(item => `Sửa lỗi ${item.code}: ${item.message}`);
  return {
    version: 3,
    decision: repairable ? 'revise' : 'reject',
    gateSummary,
    evidence,
    realizedDeltaEvidence: input.editor.realizedDeltaEvidence,
    revisionInstructions: input.editor.revisionInstructions.length > 0
      ? input.editor.revisionInstructions
      : generatedInstructions,
    repairMode: repairable ? repairMode : null,
    blocker: null,
  };
}
