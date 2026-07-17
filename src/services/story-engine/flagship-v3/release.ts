import { createHash } from 'node:crypto';
import { z } from 'zod';
import { FLAGSHIP_V3_PROMPT_VERSION } from './prompts';

export const FLAGSHIP_V3_CONTRACT_VERSION = 'story-contracts-v3.2-arc-memory';
export const FLAGSHIP_V3_CONTEXT_VERSION = 'role-context-v3.2-ledger-retrieval';
export const FLAGSHIP_V3_PREFLIGHT_VERSION = 'deterministic-preflight-v3.1';
export const FLAGSHIP_V3_QUALITY_VERSION = 'quality-v3.2-auditable-thresholds';
export const FLAGSHIP_V3_ARC_LIFECYCLE_VERSION = 'arc-lifecycle-v3.1-ending-gated';
export const FLAGSHIP_V3_ROLLING_PLANNER_VERSION = 'flagship-v3.9-no-forced-filler-scene';

export const FlagshipReleaseManifestV3Schema = z.object({
  pipelineVersion: z.literal('flagship_v3'),
  promptVersion: z.string().min(3),
  rollingPlannerVersion: z.string().min(3),
  contractVersion: z.string().min(3),
  contextVersion: z.string().min(3),
  preflightVersion: z.string().min(3),
  qualityVersion: z.string().min(3),
  arcLifecycleVersion: z.string().min(3),
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
