import { createHash } from 'node:crypto';
import { STORY_FACTORY_BENCHMARK_PROTOCOL } from './benchmark';
import { FACTORY_PROMPT_VERSION } from './prompts';
import { DEFAULT_MODEL_ROUTES } from './routes';
import { CAUSAL_VALIDATOR_VERSION } from './validation';

export const FACTORY_CONTRACT_VERSION = 'story-factory-contracts-30-direct-compact-chapters';
export const FACTORY_STATE_VERSION = 'story-factory-state-9-exact-id-continuity-packet';
export const FACTORY_SETUP_VERSION = 'story-factory-setup-31-typed-cast-roles';
export const FACTORY_PLANNER_VERSION = 'story-factory-planner-35-separated-repair-budgets';
export const FACTORY_CONTEXT_VERSION = 'story-factory-context-9-input-output-mechanics';
export const FACTORY_MEMORY_POLICY_VERSION = 'story-factory-memory-4-exact-id-bounded-no-rag';
const FACTORY_ENGINE_SETUP_COMPATIBILITY = FACTORY_SETUP_VERSION;

const identity = {
  promptVersion: FACTORY_PROMPT_VERSION,
  contractVersion: FACTORY_CONTRACT_VERSION,
  causalValidatorVersion: CAUSAL_VALIDATOR_VERSION,
  contextProjectionVersion: FACTORY_CONTEXT_VERSION,
  memoryPolicyVersion: FACTORY_MEMORY_POLICY_VERSION,
  stateVersion: FACTORY_STATE_VERSION,
  plannerVersion: FACTORY_PLANNER_VERSION,
  // Setup revisions are tracked independently so a Launch-Pack-only change does
  // not invalidate an already proven Writer/Editor runtime release.
  setupVersion: FACTORY_ENGINE_SETUP_COMPATIBILITY,
  routeVersion: DEFAULT_MODEL_ROUTES.routeVersion,
  benchmarkProtocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
};

export const STORY_FACTORY_RELEASE = `sf_${createHash('sha256')
  .update(JSON.stringify(identity))
  .digest('hex')
  .slice(0, 16)}`;

export const STORY_FACTORY_RELEASE_MANIFEST = {
  ...identity,
  setupRevision: FACTORY_SETUP_VERSION,
  plannerRevision: FACTORY_PLANNER_VERSION,
  releaseId: STORY_FACTORY_RELEASE,
} as const;
