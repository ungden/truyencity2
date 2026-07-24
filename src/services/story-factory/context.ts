import type { ChapterPlan, EditorAssessment, StoryKernel, StoryState } from './contracts';
import type { RelevantStoryMemory } from './memory';

export interface ContextManifestEntry {
  role: 'writer' | 'editor' | 'revision' | 'planner';
  block: string;
  source: string;
  chars: number;
}

export interface WriterBrief {
  story: { title: string; genreLane: string; uniqueMechanism: string };
  cast: unknown[];
  worldRules: unknown[];
  scenes: unknown[];
  currentFacts: unknown[];
  characterState: unknown[];
  resources: unknown[];
  promises: unknown[];
  relevantMemory: unknown[];
  requiredDeltas: unknown[];
}

function relevantIds(plan: ChapterPlan) {
  const characters = new Set(plan.scenes.flatMap(scene => scene.participantIds));
  const resources = new Set(plan.requiredDeltas.flatMap(delta =>
    delta.kind === 'resource_numeric' || delta.kind === 'resource_state' ? [delta.resourceId] : [],
  ));
  const promises = new Set(plan.requiredDeltas.flatMap(delta => delta.kind === 'promise' ? [delta.promiseId] : []));
  const facts = new Set(plan.requiredDeltas.flatMap(delta =>
    delta.kind === 'fact' || delta.kind === 'knowledge' ? [delta.factId] : [],
  ));
  plan.preconditions.forEach(condition => {
    if (condition.kind === 'fact') facts.add(condition.entityId);
    if (condition.kind === 'resource') resources.add(condition.entityId);
    if (condition.kind === 'promise') promises.add(condition.entityId);
    if (condition.kind === 'location') characters.add(condition.entityId);
  });
  return { characters, resources, promises, facts };
}

export function buildWriterBrief(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  relevantMemory?: RelevantStoryMemory[];
}): WriterBrief {
  const ids = relevantIds(input.plan);
  ids.characters.add(input.kernel.protagonistId);
  return {
    story: {
      title: input.kernel.title,
      genreLane: input.kernel.genreLane,
      uniqueMechanism: input.kernel.uniqueMechanism,
    },
    cast: input.kernel.characters.filter(character => ids.characters.has(character.id)).map(character => ({
      id: character.id,
      name: character.name,
      aliases: character.aliases,
      agenda: character.agenda,
      competence: character.competence,
      constraint: character.constraint,
      moralBoundary: character.moralBoundary,
      voice: character.voice,
    })),
    worldRules: input.kernel.worldRules.filter(rule => input.plan.requiredWorldRuleIds.includes(rule.id)),
    scenes: input.plan.scenes.map(scene => ({
      id: scene.id,
      povCharacterId: scene.povCharacterId,
      participantIds: scene.participantIds,
      locationId: scene.locationId,
      durationMinutes: scene.durationMinutes,
      travelMinutesFromPrevious: scene.travelMinutesFromPrevious,
      objective: scene.objective,
      obstacle: scene.obstacle,
      action: scene.action,
      requiredDeltaIds: scene.requiredDeltaIds,
    })),
    // Current facts are compact canon, not historical memory. Include all of
    // them so a planner omission cannot hide a decision made last chapter.
    currentFacts: input.state.facts,
    characterState: input.state.characters.filter(character => ids.characters.has(character.characterId)).map(character => ({
      ...character,
      knownFactIds: character.knownFactIds.filter(factId => ids.facts.has(factId)),
    })),
    resources: input.state.resources.filter(resource => ids.resources.has(resource.resourceId)),
    promises: input.state.promises.filter(promise => ids.promises.has(promise.promiseId)),
    relevantMemory: (input.relevantMemory ?? []).map(memory => ({
      chapterNumber: memory.outcome.chapterNumber,
      event: memory.outcome.event,
      result: memory.outcome.result,
      endingSituation: memory.outcome.endingSituation,
      relatedEntityIds: memory.relatedEntityIds,
    })),
    requiredDeltas: input.plan.requiredDeltas,
  };
}

export function selectPreviousTail(content: string, maxWords = 1_200): string {
  const words = [...content.matchAll(/\S+/gu)];
  if (words.length <= maxWords) return content.trim();
  return content.slice(words[words.length - maxWords].index).trim();
}

function manifest(role: ContextManifestEntry['role'], blocks: Array<[string, string, unknown]>): ContextManifestEntry[] {
  return blocks.map(([block, source, value]) => ({
    role,
    block,
    source,
    chars: typeof value === 'string' ? value.length : JSON.stringify(value).length,
  }));
}

export function buildChapterContexts(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  previousChapter?: string;
  relevantMemory?: RelevantStoryMemory[];
}) {
  const brief = buildWriterBrief(input);
  const previousTail = input.previousChapter ? selectPreviousTail(input.previousChapter) : '';
  const ids = relevantIds(input.plan);
  const editorKernel = {
    title: input.kernel.title,
    protagonistId: input.kernel.protagonistId,
    characters: input.kernel.characters.filter(character => ids.characters.has(character.id) || character.id === input.kernel.protagonistId),
    worldRules: input.kernel.worldRules.filter(rule => input.plan.requiredWorldRuleIds.includes(rule.id)),
    resources: input.kernel.resources.filter(resource => ids.resources.has(resource.id)),
    promises: input.kernel.promises.filter(promise => ids.promises.has(promise.id)),
  };
  const editorState = {
    chapterNumber: input.state.chapterNumber,
    storyTimeMinutes: input.state.storyTimeMinutes,
    facts: input.state.facts,
    characters: input.state.characters.filter(character => ids.characters.has(character.characterId)).map(character => ({
      ...character,
      knownFactIds: character.knownFactIds.filter(factId => ids.facts.has(factId)),
    })),
    resources: input.state.resources.filter(resource => ids.resources.has(resource.resourceId)),
    promises: input.state.promises.filter(promise => ids.promises.has(promise.promiseId)),
    recentOutcomes: input.state.recentOutcomes,
    relevantMemory: input.relevantMemory ?? [],
  };
  return {
    brief,
    previousTail,
    editorKernel,
    editorState,
    manifest: [
      ...manifest('writer', [
        ['writer_brief', `plan:${input.plan.chapterNumber}`, brief],
        ...(previousTail ? [['previous_tail', `chapter:${input.plan.chapterNumber - 1}`, previousTail] as [string, string, unknown]] : []),
      ]),
      ...manifest('editor', [
        ['kernel_projection', 'project.story_kernel', editorKernel],
        ['chapter_plan', `plan:${input.plan.chapterNumber}`, input.plan],
        ['state_projection', 'project.story_state', editorState],
      ]),
    ],
  };
}

export function buildRevisionContext(input: {
  brief: WriterBrief;
  previousTail: string;
  draft: { title: string; content: string };
  assessment: EditorAssessment;
}) {
  if (input.assessment.status !== 'revise') throw new Error('Revision context requires a revise assessment.');
  return {
    writerBrief: input.brief,
    previousChapterTail: input.previousTail,
    currentDraft: input.draft,
    issues: input.assessment.issues,
  };
}
