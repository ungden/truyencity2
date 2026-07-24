import { createHash } from 'node:crypto';
import { FACTORY_PROMPT_VERSION } from './prompts';
import { DEFAULT_MODEL_ROUTES } from './routes';

export const FACTORY_CONTRACT_VERSION = 'story-factory-contracts-12-add-only-canon-extension';
export const FACTORY_STATE_VERSION = 'story-factory-state-6-exact-id-memory-consumed-seeds';
export const FACTORY_SETUP_VERSION = 'story-factory-setup-8-long-series-add-only-canon';
export const FACTORY_PLANNER_VERSION = 'story-factory-planner-6-stage-bound-arc-memory';
const FACTORY_ENGINE_SETUP_COMPATIBILITY = 'story-factory-setup-8-long-series-add-only-canon';

const identity = {
  promptVersion: FACTORY_PROMPT_VERSION,
  contractVersion: FACTORY_CONTRACT_VERSION,
  stateVersion: FACTORY_STATE_VERSION,
  // Setup revisions are tracked independently so a Launch-Pack-only change does
  // not invalidate an already proven Writer/Editor runtime release.
  setupVersion: FACTORY_ENGINE_SETUP_COMPATIBILITY,
  routeVersion: DEFAULT_MODEL_ROUTES.routeVersion,
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
