import { createHash } from 'node:crypto';
import { STORY_FACTORY_BENCHMARK_PROTOCOL } from './benchmark';
// FACTORY_PLANNER_VERSION lives in planner.ts (release → benchmark → planner already
// exists; a planner → release import would close a bundle-breaking cycle). Re-exported
// here so version constants keep one import site.
import { FACTORY_PLANNER_VERSION } from './planner';
import { FACTORY_PROMPT_VERSION } from './prompts';
import { DEFAULT_MODEL_ROUTES } from './routes';
import { CAUSAL_VALIDATOR_VERSION } from './validation';

export { FACTORY_PLANNER_VERSION };

export const FACTORY_CONTRACT_VERSION = 'story-factory-contracts-43-literal-resource-scale';
export const FACTORY_STATE_VERSION = 'story-factory-state-10-exact-first-encounter';
export const FACTORY_SETUP_VERSION = 'story-factory-setup-49-exact-first-encounter';
export const FACTORY_CONTEXT_VERSION = 'story-factory-context-30-private-revision-spine';
export const FACTORY_MEMORY_POLICY_VERSION = 'story-factory-memory-6-in-memory-parity';
export const FACTORY_WINDOW_REVIEW_VERSION = 'story-factory-window-review-7-forward-advisories';

/**
 * Compatibility identity: the ONLY versions that decide whether artifacts already
 * persisted on a project (story_kernel, arc_plan, story_state, rolling_plan) still
 * parse under the running code. A change here genuinely orphans stored data, so it
 * must invalidate the release and force an explicit restage.
 *
 * Prompt, planner, validator, context, memory and window-review revisions are
 * deliberately NOT here. Those change how the next chapter is produced, never how
 * an existing artifact is read. Gating on them made every prompt fix orphan the
 * whole fleet and destroy the benchmark evidence that the same fix was needed to
 * obtain — a deadlock that produced zero published chapters over 19 days.
 */
const compatibilityIdentity = {
  contractVersion: FACTORY_CONTRACT_VERSION,
  stateVersion: FACTORY_STATE_VERSION,
  setupVersion: FACTORY_SETUP_VERSION,
};

/**
 * Revision identity: everything that shapes generation quality. Recorded on every
 * run row as telemetry so a quality regression can still be attributed to an exact
 * engine revision. It never gates job claiming.
 */
const revisionIdentity = {
  promptVersion: FACTORY_PROMPT_VERSION,
  plannerVersion: FACTORY_PLANNER_VERSION,
  causalValidatorVersion: CAUSAL_VALIDATOR_VERSION,
  contextProjectionVersion: FACTORY_CONTEXT_VERSION,
  memoryPolicyVersion: FACTORY_MEMORY_POLICY_VERSION,
  windowReviewVersion: FACTORY_WINDOW_REVIEW_VERSION,
  routeVersion: DEFAULT_MODEL_ROUTES.routeVersion,
  benchmarkProtocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
};

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

export const STORY_FACTORY_RELEASE = `sf_${digest(compatibilityIdentity)}`;
export const STORY_FACTORY_REVISION = `rev_${digest(revisionIdentity)}`;

export const STORY_FACTORY_RELEASE_MANIFEST = {
  ...compatibilityIdentity,
  ...revisionIdentity,
  releaseId: STORY_FACTORY_RELEASE,
  revisionId: STORY_FACTORY_REVISION,
  setupRevision: FACTORY_SETUP_VERSION,
  plannerRevision: FACTORY_PLANNER_VERSION,
} as const;
