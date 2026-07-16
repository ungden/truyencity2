import { z } from 'zod';
import {
  ArcPlanV3Schema,
  RollingPlanWindowV3Schema,
  StoryKernelV3Schema,
  StoryStateV3Schema,
  type StoryStateV3,
} from './contracts';
import { FlagshipV3Error } from './pipeline';
import { validateRollingWindowV3 } from './rolling-planner';

export const FlagshipLaunchPackV3Schema = z.object({
  schemaVersion: z.literal(3),
  selectedConceptId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  kernel: StoryKernelV3Schema,
  arc: ArcPlanV3Schema,
  initialState: StoryStateV3Schema,
  initialWindow: RollingPlanWindowV3Schema,
}).strict();

export type FlagshipLaunchPackV3 = z.infer<typeof FlagshipLaunchPackV3Schema>;

export function validateLaunchPackV3(pack: FlagshipLaunchPackV3): void {
  if (pack.initialState.chapterNumber !== 0 || pack.arc.startChapter !== 1 || pack.initialWindow.startChapter !== 1) {
    throw new FlagshipV3Error('setup_blocked', 'Launch pack must begin from chapter zero and plan chapters 1-5.');
  }
  const characterIds = new Set(pack.kernel.characters.map(character => character.id));
  const resourceIds = new Set(pack.kernel.resources.map(resource => resource.id));
  const promiseIds = new Set(pack.kernel.promises.map(promise => promise.id));
  const stateCharacterIds = new Set(pack.initialState.characters.map(character => character.characterId));
  const stateResourceIds = new Set(pack.initialState.resources.map(resource => resource.resourceId));
  const statePromiseIds = new Set(pack.initialState.promises.map(promise => promise.promiseId));
  const missing = {
    characters: [...characterIds].filter(item => !stateCharacterIds.has(item)),
    resources: [...resourceIds].filter(item => !stateResourceIds.has(item)),
    promises: [...promiseIds].filter(item => !statePromiseIds.has(item)),
  };
  if (missing.characters.length || missing.resources.length || missing.promises.length) {
    throw new FlagshipV3Error('setup_blocked', 'Initial StoryStateV3 does not cover its own kernel.', missing);
  }
  validateRollingWindowV3({
    kernel: pack.kernel,
    arc: pack.arc,
    state: pack.initialState as StoryStateV3,
    window: pack.initialWindow,
  });
}
