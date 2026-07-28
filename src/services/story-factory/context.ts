import {
  type ChapterPlan,
  type EditorAssessment,
  type StateDelta,
  type StoryKernel,
  type StoryState,
} from './contracts';
import {
  flattenContinuityPacket,
  type ContinuityPacket,
  type RelevantStoryTransition,
} from './memory';

export interface ContextManifestEntry {
  role: 'writer' | 'editor' | 'revision' | 'planner';
  block: string;
  source: string;
  chars: number;
}

export interface WriterBrief {
  story: { title: string };
  cast: unknown[];
  openingState: unknown[];
  scenes: unknown[];
  operationalConstraints: string[];
  continuity: unknown[];
}

function relevantIds(plan: ChapterPlan) {
  const characters = new Set(plan.scenes.flatMap(scene => scene.participantIds));
  const locations = new Set(plan.scenes.map(scene => scene.locationId));
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
  plan.mechanicUses.forEach(use => {
    characters.add(use.actorId);
    use.preconditionFactIds.forEach(id => facts.add(id));
  });
  return { characters, locations, resources, promises, facts };
}

function labels(kernel: StoryKernel) {
  const values = new Map<string, string>([
    ...kernel.characters.map(item => [item.id, item.name] as const),
    ...kernel.locations.map(item => [item.id, item.name] as const),
    ...kernel.resources.map(item => [item.id, item.name] as const),
    ...kernel.promises.map(item => [item.id, item.description] as const),
    ...kernel.worldMechanics.map(item => [item.id, item.name] as const),
  ]);
  return (id: string) => values.get(id) ?? id.replaceAll('_', ' ');
}

function readableDelta(delta: StateDelta, name: (id: string) => string) {
  if (delta.kind === 'fact') return { entity: name(delta.factId), before: delta.before, requiredAfter: delta.after };
  if (delta.kind === 'resource_numeric') {
    return { entity: name(delta.resourceId), before: delta.before, requiredAfter: delta.after };
  }
  if (delta.kind === 'resource_state') return { entity: name(delta.resourceId), before: delta.before, requiredAfter: delta.after };
  if (delta.kind === 'knowledge') {
    return { entity: name(delta.characterId), before: `chưa biết ${name(delta.factId)}`, requiredAfter: `biết ${name(delta.factId)}` };
  }
  if (delta.kind === 'location') {
    return { entity: name(delta.characterId), before: name(delta.beforeLocationId), requiredAfter: name(delta.afterLocationId) };
  }
  if (delta.kind === 'relationship') {
    return {
      entity: `${name(delta.characterId)} với ${name(delta.counterpartId)}`,
      before: delta.before,
      requiredAfter: delta.after,
    };
  }
  return { entity: name(delta.promiseId), before: delta.before, requiredAfter: delta.after };
}

function operationalConstraints(kernel: StoryKernel, plan: ChapterPlan, name: (id: string) => string): string[] {
  return plan.mechanicUses.filter(use => use.role === 'support').map(use => {
    const mechanic = kernel.worldMechanics.find(item => item.id === use.mechanicId)!;
    if (mechanic.kind === 'conversion') {
      return `${name(use.actorId)} được phép thực hiện ${mechanic.name} trong cảnh này.`;
    }
    if (mechanic.kind === 'capability') {
      return `${name(use.actorId)} được phép dùng ${mechanic.name} trong phạm vi công việc của cảnh.`;
    }
    const required = mechanic.requiredFacts.map(condition =>
      `${name(condition.factId)} = ${String(condition.expected)}`);
    const forbidden = mechanic.forbiddenFacts.map(condition =>
      `${name(condition.factId)} = ${String(condition.expected)}`);
    return `${mechanic.name}: cần ${required.join(', ') || 'không có điều kiện thêm'}`
      + `${forbidden.length ? `; cấm khi ${forbidden.join(', ')}` : ''}.`;
  });
}

function readableTransition(event: RelevantStoryTransition, name: (id: string) => string) {
  return {
    chapter: event.chapterNumber,
    type: event.kind,
    entity: name(event.entityId),
    before: event.before,
    after: event.after,
  };
}

export function buildWriterBrief(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  continuityPacket?: ContinuityPacket;
}): WriterBrief {
  const ids = relevantIds(input.plan);
  ids.characters.add(input.kernel.protagonistId);
  const name = labels(input.kernel);
  const deltas = new Map(input.plan.requiredDeltas.map(delta => [delta.id, delta]));
  const continuity = input.continuityPacket
    ? flattenContinuityPacket(input.continuityPacket).slice(0, 12).map(event => readableTransition(event, name))
    : [];
  const sceneChanges = (sceneId: string, deltaIds: string[]) => {
    const available = new Set(deltaIds);
    const claimed = new Set<string>();
    const operations = input.plan.mechanicUses
      .filter(use => use.sceneId === sceneId && use.role === 'effect')
      .flatMap(use => {
        const transitionIds = use.deltaIds.filter(id => available.has(id) && !claimed.has(id));
        transitionIds.forEach(id => claimed.add(id));
        if (!transitionIds.length) return [];
        return [{
          operation: name(use.mechanicId),
          actor: name(use.actorId),
          transitions: transitionIds.map(id => readableDelta(deltas.get(id)!, name)),
        }];
      });
    const standalone = deltaIds
      .filter(id => !claimed.has(id))
      .map(id => ({
        operation: null,
        actor: null,
        transitions: [readableDelta(deltas.get(id)!, name)],
      }));
    return [...operations, ...standalone];
  };
  return {
    story: { title: input.kernel.title },
    cast: input.kernel.characters.filter(character => ids.characters.has(character.id)).map(character => ({
      name: character.name,
      agenda: character.agenda,
      competence: character.competence,
      constraint: character.constraint,
      moralBoundary: character.moralBoundary,
      voice: character.voice,
    })),
    openingState: [
      ...input.state.facts.filter(fact => ids.facts.has(fact.id)).map(fact => ({
        entity: name(fact.id),
        value: fact.value,
      })),
      ...input.state.characters.filter(character => ids.characters.has(character.characterId)).map(character => ({
        entity: name(character.characterId),
        location: name(character.locationId),
        knownRelevantFacts: character.knownFactIds.filter(id => ids.facts.has(id)).map(name),
        relevantRelationships: Object.entries(character.relationshipState)
          .filter(([counterpartId]) => ids.characters.has(counterpartId))
          .map(([counterpartId, value]) => ({ with: name(counterpartId), state: value })),
      })),
      ...input.state.resources.filter(resource => ids.resources.has(resource.resourceId)).map(resource => ({
        entity: name(resource.resourceId),
        value: resource.value,
        unit: input.kernel.resources.find(item => item.id === resource.resourceId)?.kind === 'numeric'
          ? (input.kernel.resources.find(item => item.id === resource.resourceId) as Extract<StoryKernel['resources'][number], { kind: 'numeric' }>).unit
          : null,
      })),
      ...input.state.promises.filter(promise => ids.promises.has(promise.promiseId)).map(promise => ({
        entity: name(promise.promiseId),
        status: promise.status,
      })),
    ],
    scenes: input.plan.scenes.map(scene => ({
      pov: name(scene.povCharacterId),
      participants: scene.participantIds.map(name),
      location: name(scene.locationId),
      objective: scene.objective,
      obstacle: scene.obstacle,
      // Group exact ledger transitions into causal operations. Writer still sees
      // every required before/after state, but no longer receives a flat list
      // that invites prose shaped like database telemetry.
      requiredChanges: sceneChanges(scene.id, scene.requiredDeltaIds),
    })),
    operationalConstraints: operationalConstraints(input.kernel, input.plan, name),
    continuity,
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
  continuityPacket?: ContinuityPacket;
}) {
  const brief = buildWriterBrief(input);
  const previousTail = input.previousChapter ? selectPreviousTail(input.previousChapter) : '';
  const ids = relevantIds(input.plan);
  const editorKernel = {
    title: input.kernel.title,
    protagonistId: input.kernel.protagonistId,
    characters: input.kernel.characters.filter(character => ids.characters.has(character.id) || character.id === input.kernel.protagonistId),
    worldMechanics: input.kernel.worldMechanics.filter(mechanic =>
      input.plan.mechanicUses.some(use => use.mechanicId === mechanic.id)),
    resources: input.kernel.resources.filter(resource => ids.resources.has(resource.id)),
    promises: input.kernel.promises.filter(promise => ids.promises.has(promise.id)),
  };
  const editorState = {
    chapterNumber: input.state.chapterNumber,
    storyTimeMinutes: input.state.storyTimeMinutes,
    facts: input.state.facts.filter(fact => ids.facts.has(fact.id)),
    characters: input.state.characters.filter(character => ids.characters.has(character.characterId)),
    resources: input.state.resources.filter(resource => ids.resources.has(resource.resourceId)),
    promises: input.state.promises.filter(promise => ids.promises.has(promise.promiseId)),
    recentOutcomes: input.state.recentOutcomes,
    continuityPacket: input.continuityPacket ?? null,
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
        ['state_and_continuity', 'project.story_state+story_state_events', editorState],
      ]),
    ],
  };
}

export function buildRevisionContext(input: {
  brief: WriterBrief;
  previousTail: string;
  assessment: EditorAssessment;
}) {
  if (input.assessment.status !== 'revise') throw new Error('Revision context requires a revise assessment.');
  return {
    writerBrief: input.brief,
    previousChapterTail: input.previousTail,
    continuityIssues: input.assessment.continuityIssues,
    readingIssues: input.assessment.readingIssues,
  };
}
