import { createHash } from 'node:crypto';
import { FACTORY_PROMPT_VERSION } from './prompts';
import { DEFAULT_MODEL_ROUTES } from './routes';

export const FACTORY_CONTRACT_VERSION = 'story-factory-contracts-10-chapter-level-state-change';
export const FACTORY_STATE_VERSION = 'story-factory-state-4-narrative-outcomes';
export const FACTORY_SETUP_VERSION = 'story-factory-setup-6-call-12-ground-before-judge';
export const FACTORY_PLANNER_VERSION = 'story-factory-planner-4-chapter-level-change-and-time';
const FACTORY_ENGINE_SETUP_COMPATIBILITY = 'story-factory-setup-5-call-3-stable-id';

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
