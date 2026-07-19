import { createHash } from 'node:crypto';
import { z } from 'zod';
import { FLAGSHIP_V3_PROMPT_VERSION } from './prompts';
import {
  FLAGSHIP_V3_CONCEPT_GENERATOR_PROMPT_VERSION,
  FLAGSHIP_V3_CONCEPT_JUDGE_PROMPT_VERSION,
  FLAGSHIP_V3_CONCEPT_PROMPT_VERSION,
  FLAGSHIP_V3_OPENING_PROMPT_VERSION,
} from './concept-lab';

export const FLAGSHIP_V3_SETUP_VERSION = 'flagship-v3-setup-2026-07-19.2-research-provenance';
export const FLAGSHIP_V3_KERNEL_ARCHITECT_VERSION = 'flagship-v3-kernel-2026-07-19.10-research-grounded-mechanism';
export const FLAGSHIP_V3_STATE_SEEDER_VERSION = 'flagship-v3-state-seeder-2026-07-18.6-exact-shape';
export const FLAGSHIP_V3_ARC_ARCHITECT_VERSION = 'flagship-v3-arc-2026-07-18.3-exact-shape';

export const FLAGSHIP_V3_CONTRACT_VERSION = 'story-contracts-v3.6-neutral-voice-mechanical-scenes';
export const FLAGSHIP_V3_CONTEXT_VERSION = 'role-context-v3.8-writer-brief-published-tail';
export const FLAGSHIP_V3_PREFLIGHT_VERSION = 'deterministic-preflight-v3.4-soft-length-tail-repeat';
export const FLAGSHIP_V3_QUALITY_VERSION = 'quality-v3.11-chapter-vs-cadence-gates';
export const FLAGSHIP_V3_ARC_LIFECYCLE_VERSION = 'arc-lifecycle-v3.1-ending-gated';
export const FLAGSHIP_V3_ROLLING_PLANNER_VERSION = 'flagship-v3.28-compact-obligation-fact';
export const FLAGSHIP_V3_PROVIDER_VERSION = 'provider-v3.9-combined-editor-issue-budget';

export const FlagshipReleaseManifestV3Schema = z.object({
  pipelineVersion: z.literal('flagship_v3'),
  promptVersion: z.string().min(3),
  rollingPlannerVersion: z.string().min(3),
  contractVersion: z.string().min(3),
  contextVersion: z.string().min(3),
  preflightVersion: z.string().min(3),
  qualityVersion: z.string().min(3),
  arcLifecycleVersion: z.string().min(3),
  providerVersion: z.string().min(3),
  conceptVersion: z.string().min(3),
  conceptGeneratorVersion: z.string().min(3),
  conceptJudgeVersion: z.string().min(3),
  openingVersion: z.string().min(3),
  setupVersion: z.string().min(3),
  kernelArchitectVersion: z.string().min(3),
  stateSeederVersion: z.string().min(3),
  arcArchitectVersion: z.string().min(3),
  releaseId: z.string().regex(/^fv3_[a-f0-9]{16}$/),
}).strict();

export type FlagshipReleaseManifestV3 = z.infer<typeof FlagshipReleaseManifestV3Schema>;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function digestFlagshipV3(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

export function getFlagshipReleaseManifestV3(): FlagshipReleaseManifestV3 {
  const identity = {
    pipelineVersion: 'flagship_v3' as const,
    promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
    rollingPlannerVersion: FLAGSHIP_V3_ROLLING_PLANNER_VERSION,
    contractVersion: FLAGSHIP_V3_CONTRACT_VERSION,
    contextVersion: FLAGSHIP_V3_CONTEXT_VERSION,
    preflightVersion: FLAGSHIP_V3_PREFLIGHT_VERSION,
    qualityVersion: FLAGSHIP_V3_QUALITY_VERSION,
    arcLifecycleVersion: FLAGSHIP_V3_ARC_LIFECYCLE_VERSION,
    providerVersion: FLAGSHIP_V3_PROVIDER_VERSION,
    conceptVersion: FLAGSHIP_V3_CONCEPT_PROMPT_VERSION,
    conceptGeneratorVersion: FLAGSHIP_V3_CONCEPT_GENERATOR_PROMPT_VERSION,
    conceptJudgeVersion: FLAGSHIP_V3_CONCEPT_JUDGE_PROMPT_VERSION,
    openingVersion: FLAGSHIP_V3_OPENING_PROMPT_VERSION,
    setupVersion: FLAGSHIP_V3_SETUP_VERSION,
    kernelArchitectVersion: FLAGSHIP_V3_KERNEL_ARCHITECT_VERSION,
    stateSeederVersion: FLAGSHIP_V3_STATE_SEEDER_VERSION,
    arcArchitectVersion: FLAGSHIP_V3_ARC_ARCHITECT_VERSION,
  };
  return FlagshipReleaseManifestV3Schema.parse({
    ...identity,
    releaseId: `fv3_${digestFlagshipV3(identity).slice(0, 16)}`,
  });
}

export function assertFlagshipReleaseV3(value: unknown): FlagshipReleaseManifestV3 {
  const stored = FlagshipReleaseManifestV3Schema.parse(value);
  const current = getFlagshipReleaseManifestV3();
  if (stored.releaseId !== current.releaseId || digestFlagshipV3(stored) !== digestFlagshipV3(current)) {
    throw new Error(`FLAGSHIP_V3_RELEASE_MISMATCH: stored=${stored.releaseId}, current=${current.releaseId}`);
  }
  return stored;
}
