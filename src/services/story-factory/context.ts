import {
  type ChapterPlan,
  type EditorAssessment,
  type StoryKernel,
  type StoryState,
} from './contracts';
import type { RelevantStoryMemory, RelevantStoryTransition } from './memory';

export interface ContextManifestEntry {
  role: 'writer' | 'editor' | 'revision' | 'planner';
  block: string;
  source: string;
  chars: number;
}

export interface WriterBrief {
  story: { title: string };
  cast: unknown[];
  worldRules: unknown[];
  scenes: unknown[];
  currentFacts: unknown[];
  characterState: unknown[];
  resources: unknown[];
  promises: unknown[];
  historicalTransitions: unknown[];
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
  relevantTransitions?: RelevantStoryTransition[];
}): WriterBrief {
  const ids = relevantIds(input.plan);
  ids.characters.add(input.kernel.protagonistId);
  return {
    story: {
      title: input.kernel.title,
    },
    cast: input.kernel.characters.filter(character => ids.characters.has(character.id)).map(character => ({
      id: character.id,
      name: character.name,
      agenda: character.agenda,
      competence: character.competence,
      constraint: character.constraint,
      moralBoundary: character.moralBoundary,
      voice: character.voice,
    })),
    worldRules: input.kernel.worldRules.filter(rule => input.plan.requiredWorldRuleIds.includes(rule.id))
      .map(rule => ({ id: rule.id, claim: rule.claim })),
    scenes: input.plan.scenes.map(scene => ({
      id: scene.id,
      povCharacterId: scene.povCharacterId,
      participantIds: scene.participantIds,
      locationId: scene.locationId,
      objective: scene.objective,
      obstacle: scene.obstacle,
      requiredDeltaIds: scene.requiredDeltaIds,
    })),
    currentFacts: input.state.facts.filter(fact => ids.facts.has(fact.id)),
    characterState: input.state.characters.filter(character => ids.characters.has(character.characterId)).map(character => ({
      ...character,
      knownFactIds: character.knownFactIds.filter(factId => ids.facts.has(factId)),
      relationshipState: Object.fromEntries(
        Object.entries(character.relationshipState).filter(([counterpartId]) => ids.characters.has(counterpartId)),
      ),
    })),
    resources: input.state.resources.filter(resource => ids.resources.has(resource.resourceId)),
    promises: input.state.promises.filter(promise => ids.promises.has(promise.promiseId)),
    historicalTransitions: (input.relevantTransitions ?? []).slice(0, 6).map(transition => ({
      chapterNumber: transition.chapterNumber,
      deltaId: transition.deltaId,
      kind: transition.kind,
      entityId: transition.entityId,
      before: transition.before,
      after: transition.after,
      relatedEntityIds: transition.relatedEntityIds,
    })),
    requiredDeltas: input.plan.requiredDeltas.map(delta => {
      if (delta.kind === 'fact') return {
        id: delta.id, kind: delta.kind, entityId: delta.factId, before: delta.before, after: delta.after,
      };
      if (delta.kind === 'resource_numeric') return {
        id: delta.id, kind: delta.kind, entityId: delta.resourceId,
        before: delta.before, delta: delta.delta, after: delta.after,
      };
      if (delta.kind === 'resource_state') return {
        id: delta.id, kind: delta.kind, entityId: delta.resourceId, before: delta.before, after: delta.after,
      };
      if (delta.kind === 'knowledge') return {
        id: delta.id, kind: delta.kind, entityId: delta.characterId, factId: delta.factId,
      };
      if (delta.kind === 'location') return {
        id: delta.id, kind: delta.kind, entityId: delta.characterId,
        before: delta.beforeLocationId, after: delta.afterLocationId,
      };
      if (delta.kind === 'relationship') return {
        id: delta.id, kind: delta.kind, entityId: delta.characterId,
        counterpartId: delta.counterpartId, before: delta.before, after: delta.after,
      };
      return {
        id: delta.id, kind: delta.kind, entityId: delta.promiseId, before: delta.before, after: delta.after,
      };
    }),
  };
}

export function selectPreviousTail(content: string, maxWords = 600): string {
  const words = [...content.matchAll(/\S+/gu)];
  if (words.length <= maxWords) return content.trim();
  const start = words[words.length - maxWords].index ?? 0;
  const paragraphBoundary = content.indexOf('\n\n', start);
  return content.slice(paragraphBoundary >= 0 ? paragraphBoundary + 2 : start).trim();
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
  relevantTransitions?: RelevantStoryTransition[];
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
