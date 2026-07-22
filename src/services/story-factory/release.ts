import { createHash } from 'node:crypto';
import { FACTORY_PROMPT_VERSION } from './prompts';
import { DEFAULT_MODEL_ROUTES } from './routes';

export const FACTORY_CONTRACT_VERSION = 'story-factory-contracts-3-outcomes-wire-1';
export const FACTORY_STATE_VERSION = 'story-factory-state-4-narrative-outcomes';
export const FACTORY_SETUP_VERSION = 'story-factory-setup-5-call-3-stable-id';

const identity = {
  promptVersion: FACTORY_PROMPT_VERSION,
  contractVersion: FACTORY_CONTRACT_VERSION,
  stateVersion: FACTORY_STATE_VERSION,
  setupVersion: FACTORY_SETUP_VERSION,
  routeVersion: DEFAULT_MODEL_ROUTES.routeVersion,
};

export const STORY_FACTORY_RELEASE = `sf_${createHash('sha256')
  .update(JSON.stringify(identity))
  .digest('hex')
  .slice(0, 16)}`;

export const STORY_FACTORY_RELEASE_MANIFEST = { ...identity, releaseId: STORY_FACTORY_RELEASE } as const;
