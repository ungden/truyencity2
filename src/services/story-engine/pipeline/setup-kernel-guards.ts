import type { StoryKernel } from '../types';

export function extractSetupKernel(storyOutline: unknown): StoryKernel | undefined {
  if (!storyOutline || typeof storyOutline !== 'object') return undefined;
  return (storyOutline as { setupKernel?: StoryKernel }).setupKernel;
}

export function hasValidSetupKernel(storyOutline: unknown): boolean {
  const kernel = extractSetupKernel(storyOutline);
  if (!kernel || typeof kernel !== 'object') return false;
  if (!kernel.readerFantasy || kernel.readerFantasy.trim().length < 20) return false;
  if (!kernel.protagonistEngine || kernel.protagonistEngine.trim().length < 20) return false;
  if (!Array.isArray(kernel.pleasureLoop) || kernel.pleasureLoop.filter(Boolean).length < 4) return false;
  if (!kernel.systemMechanic?.input || !kernel.systemMechanic?.output || !kernel.systemMechanic?.limit || !kernel.systemMechanic?.reward) return false;
  if (!Array.isArray(kernel.phase1Playground?.locations) || kernel.phase1Playground.locations.length < 2) return false;
  if (!Array.isArray(kernel.phase1Playground?.cast) || kernel.phase1Playground.cast.length < 2) return false;
  if (!Array.isArray(kernel.phase1Playground?.localAntagonists) || kernel.phase1Playground.localAntagonists.length < 1) return false;
  if (!Array.isArray(kernel.phase1Playground?.repeatableSceneTypes) || kernel.phase1Playground.repeatableSceneTypes.length < 3) return false;
  if (!Array.isArray(kernel.noveltyLadder) || kernel.noveltyLadder.length < 3) return false;
  if (!kernel.controlRules?.payoffCadence || !kernel.controlRules?.attentionGradient) return false;
  return true;
}

export function shouldResetUnwrittenMissingKernel(input: {
  currentChapter?: number | null;
  setupStage?: string | null;
  storyOutline?: unknown;
}): boolean {
  const stage = input.setupStage || 'idea';
  return (input.currentChapter || 0) === 0
    && (stage === 'ready_to_write' || stage === 'writing')
    && !hasValidSetupKernel(input.storyOutline);
}

export function shouldBlockWriterForMissingKernel(input: {
  currentChapter?: number | null;
  storyOutline?: unknown;
}): boolean {
  return !hasValidSetupKernel(input.storyOutline);
}
