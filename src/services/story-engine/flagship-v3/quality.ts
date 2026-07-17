import { z } from 'zod';
import type { ChapterPlanV3 } from './contracts';
import type { V3Evidence } from './preflight';

export const V3_AXIS_KEYS = [
  'premise_interest', 'character_voice', 'scene_tension', 'causal_surprise',
  'emotional_movement', 'domain_truth', 'prose_naturalness', 'agency',
  'earned_pleasure', 'recovery_pacing', 'desire_to_read_next',
] as const;
export type V3QualityAxis = typeof V3_AXIS_KEYS[number];

export const V3EvidenceSchema = z.object({
  code: z.string().trim().min(2),
  severity: z.enum(['critical', 'major', 'moderate']),
  message: z.string().trim().min(5),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  excerpt: z.string().min(1).max(800),
  local: z.boolean(),
}).strict();

export const V3EditorEvidenceClaimSchema = z.object({
  code: z.string().trim().min(2),
  severity: z.enum(['critical', 'major', 'moderate']),
  message: z.string().trim().min(5),
  spanId: z.string().regex(/^span_\d{3,}$/),
  local: z.boolean(),
}).strict();

export const QualityVerdictV3ModelSchema = z.object({
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
  axes: z.object(Object.fromEntries(
    V3_AXIS_KEYS.map(key => [key, z.number().min(0).max(10)]),
  ) as Record<V3QualityAxis, z.ZodNumber>).strict(),
  evidence: z.array(V3EditorEvidenceClaimSchema).max(30),
  revisionInstructions: z.array(z.string().trim().min(5)).max(8),
  realizedDeltaEvidence: z.array(z.object({
    deltaId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    spanId: z.string().regex(/^span_\d{3,}$/),
  }).strict()).max(30),
}).strict();

export type QualityVerdictV3Model = z.infer<typeof QualityVerdictV3ModelSchema>;
export type GroundedQualityVerdictV3Model = Omit<QualityVerdictV3Model, 'evidence' | 'realizedDeltaEvidence'> & {
  evidence: V3Evidence[];
  realizedDeltaEvidence: Array<{ deltaId: string; start: number; end: number; excerpt: string }>;
};

export interface QualityVerdictV3 {
  version: 3;
  decision: 'publish' | 'revise' | 'reject';
  confidence: number;
  hardGatePassed: boolean;
  planFidelity: number;
  weightedMean: number;
  axes: Record<V3QualityAxis, number>;
  evidence: V3Evidence[];
  realizedDeltaEvidence: GroundedQualityVerdictV3Model['realizedDeltaEvidence'];
}

const WEIGHTS: Record<V3QualityAxis, number> = {
  premise_interest: 1,
  character_voice: 1.1,
  scene_tension: 1,
  causal_surprise: 1,
  emotional_movement: 1,
  domain_truth: 1.1,
  prose_naturalness: 1.2,
  agency: 1,
  earned_pleasure: 1,
  recovery_pacing: 1,
  desire_to_read_next: 1.2,
};

const SERIOUS_HARD_GATES = ['canon', 'timeline', 'resourceCausality', 'characterKnowledge', 'authority', 'planFidelity'] as const;

export function evaluateQualityV3(input: {
  plan: ChapterPlanV3;
  editor: GroundedQualityVerdictV3Model;
  deterministicEvidence: V3Evidence[];
}): QualityVerdictV3 {
  const evidence = [...input.deterministicEvidence, ...input.editor.evidence];
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

  const hardGatePassed = Object.values(input.editor.hardGates).every(Boolean)
    && input.editor.planFidelity >= 7.5
    && missingDeltas.length === 0;
  const weighted = V3_AXIS_KEYS.reduce((sum, key) => sum + input.editor.axes[key] * WEIGHTS[key], 0);
  const weightTotal = V3_AXIS_KEYS.reduce((sum, key) => sum + WEIGHTS[key], 0);
  const weightedMean = Number((weighted / weightTotal).toFixed(2));
  const minAxis = Math.min(...V3_AXIS_KEYS.map(key => input.editor.axes[key]));
  const thresholdPassed = input.editor.confidence >= 0.7
    && input.editor.axes.desire_to_read_next >= 8
    && input.editor.axes.prose_naturalness >= 7.5
    && input.editor.axes.character_voice >= 7.5
    && input.editor.axes.domain_truth >= 7.5
    && weightedMean >= 7.8
    && minAxis >= 7;
  const seriousGateFailed = SERIOUS_HARD_GATES.some(key => !input.editor.hardGates[key])
    || input.editor.planFidelity < 7.5
    || missingDeltas.length > 0;
  const localized = evidence.length > 0
    && evidence.length <= 3
    && evidence.every(item => item.local)
    && !seriousGateFailed;

  const decision: QualityVerdictV3['decision'] = hardGatePassed && thresholdPassed && evidence.length === 0
    ? 'publish'
    : localized && input.editor.revisionInstructions.length > 0
      ? 'revise'
      : 'reject';
  return {
    version: 3,
    decision,
    confidence: input.editor.confidence,
    hardGatePassed,
    planFidelity: input.editor.planFidelity,
    weightedMean,
    axes: input.editor.axes,
    evidence,
    realizedDeltaEvidence: input.editor.realizedDeltaEvidence,
  };
}
