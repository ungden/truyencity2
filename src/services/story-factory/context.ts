import {
  narrativelyObservableDeltaIds,
  type ChapterPlan,
  type EditorAssessment,
  type StateDelta,
  type StoryKernel,
  type StoryState,
  type WorldMechanic,
} from './contracts';
import {
  flattenContinuityPacket,
  type ContinuityPacket,
  type RelevantStoryTransition,
} from './memory';
import type { CraftGuidance } from './craft';

export interface ContextManifestEntry {
  role: 'writer' | 'editor' | 'revision' | 'planner';
  block: string;
  source: string;
  chars: number;
}

export interface WriterBrief {
  story: { title: string };
  chapterNumber: number;
  // Plot steering belongs to the Planner. Forwarding the raw directive to the
  // Writer made stale numbers override committed canon ("four lures" after the
  // story had seven), buying avoidable rewrites. The Writer receives only the
  // resolved plan plus bounded, code-owned craft steering.
  recentTitles: string[];
  recentTitleStems: string[];
  craftGuidance: CraftGuidance[];
  cast: unknown[];
  canonicalUnits: string[];
  physicalLaws: string[];
  openingState: unknown[];
  scenes: Array<{
    pov: string;
    participants: string[];
    location: string;
    pacing: 'compress_transition' | 'full_scene';
    timeBudgetMinutes: number;
    travelFromPreviousMinutes: number;
    objective: string;
    obstacle: string;
    requiredChanges: unknown[];
  }>;
  operationalConstraints: string[];
  relevantConversionRates: unknown[];
  continuity: unknown[];
  nextOpening: null | {
    chapterNumber: number;
    location: string;
    participants: string[];
    immediateObjective: string;
    plannedTravelMinutes: number;
    mustRemainAvailableAt: Array<{ character: string; location: string }>;
  };
}

type ConversionMechanic = Extract<WorldMechanic, { kind: 'conversion' }>;

function isConversionMechanic(mechanic: WorldMechanic): mechanic is ConversionMechanic {
  return mechanic.kind === 'conversion';
}

function relevantConversionMechanics(kernel: StoryKernel, plan: ChapterPlan): ConversionMechanic[] {
  const conversions = kernel.worldMechanics.filter(isConversionMechanic);
  const invoked = conversions.filter(mechanic =>
    plan.mechanicUses.some(use => use.mechanicId === mechanic.id));
  const invokedIds = new Set(invoked.map(mechanic => mechanic.id));
  const relevantResourceIds = relevantIds(plan).resources;
  invoked.forEach(mechanic => {
    mechanic.inputsPerBatch.forEach(input => relevantResourceIds.add(input.resourceId));
    mechanic.outputsPerBatch.forEach(output => relevantResourceIds.add(output.resourceId));
  });
  if (!relevantResourceIds.size) return [];
  return conversions
    .filter(mechanic => {
      if (invokedIds.has(mechanic.id)) return true;
      const outputIds = new Set(mechanic.outputsPerBatch.map(output => output.resourceId));
      const isCircularExchange = mechanic.inputsPerBatch.some(input => outputIds.has(input.resourceId));
      return !isCircularExchange
        && (
          mechanic.inputsPerBatch.some(input => relevantResourceIds.has(input.resourceId))
          || mechanic.outputsPerBatch.some(output => relevantResourceIds.has(output.resourceId))
        );
    })
    .slice(0, 8);
}

function relevantConversionRates(
  kernel: StoryKernel,
  plan: ChapterPlan,
  name: (id: string) => string,
) {
  const units = new Map(kernel.resources.flatMap(resource =>
    resource.kind === 'numeric' ? [[resource.id, resource.unit] as const] : []));
  return relevantConversionMechanics(kernel, plan).map(mechanic => ({
    conversion: mechanic.name,
    inputsPerBatch: mechanic.inputsPerBatch.map(input => ({
      resource: name(input.resourceId),
      amount: input.amount,
      unit: units.get(input.resourceId) ?? null,
    })),
    outputsPerBatch: mechanic.outputsPerBatch.map(output => ({
      resource: name(output.resourceId),
      amount: output.amount,
      unit: units.get(output.resourceId) ?? null,
    })),
  }));
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
  const seen = new Set<string>();
  return plan.mechanicUses.flatMap(use => {
    const key = `${use.actorId}\u0000${use.mechanicId}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const mechanic = kernel.worldMechanics.find(item => item.id === use.mechanicId)!;
    if (mechanic.kind === 'conversion') {
      return [`${name(use.actorId)} thực hiện ${mechanic.name}: ${mechanic.description}`];
    }
    if (mechanic.kind === 'capability') {
      return [`${name(use.actorId)} thực hiện ${mechanic.name}: ${mechanic.description}`];
    }
    const required = mechanic.requiredFacts.map(condition =>
      `${name(condition.factId)} = ${String(condition.expected)}`);
    const forbidden = mechanic.forbiddenFacts.map(condition =>
      `${name(condition.factId)} = ${String(condition.expected)}`);
    return [`${mechanic.name}: ${mechanic.description}; cần ${required.join(', ') || 'không có điều kiện thêm'}`
      + `${forbidden.length ? `; cấm khi ${forbidden.join(', ')}` : ''}.`];
  });
}

function readableTransition(event: RelevantStoryTransition, name: (id: string) => string) {
  const change = typeof event.before === 'number' && typeof event.after === 'number'
    ? event.after - event.before
    : null;
  return {
    chapter: event.chapterNumber,
    type: event.kind,
    entity: name(event.entityId),
    before: event.before,
    change,
    after: event.after,
    provenance: event.source,
  };
}

function normalizedPacingText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
}

function isTimeCycleResource(kernel: StoryKernel, resourceId: string): boolean {
  const resource = kernel.resources.find(item => item.id === resourceId);
  if (!resource) return false;
  const text = normalizedPacingText(`${resource.name} ${resource.kind === 'numeric' ? resource.unit : ''}`);
  return /(^|\s)(chu ky|cycle|ca nghi|ngay dem|thoi gian)(\s|$)/u.test(text);
}

/**
 * A long rest/overnight conversion is mechanically necessary but is not a
 * dramatic scene by itself. Mark only the strict case: at least four hours, a
 * declared time-cycle conversion, and no fact/knowledge/relationship/promise
 * or state-resource change. Real conflicts and durable consequences stay full.
 */
export function scenePacing(
  kernel: StoryKernel,
  plan: ChapterPlan,
  sceneId: string,
): 'compress_transition' | 'full_scene' {
  const scene = plan.scenes.find(item => item.id === sceneId);
  if (!scene || scene.durationMinutes < 240) return 'full_scene';
  const sceneDeltas = plan.requiredDeltas.filter(delta => scene.requiredDeltaIds.includes(delta.id));
  if (sceneDeltas.some(delta => (
    delta.kind === 'fact'
    || delta.kind === 'knowledge'
    || delta.kind === 'relationship'
    || delta.kind === 'promise'
    || delta.kind === 'resource_state'
  ))) return 'full_scene';
  const hasTimeCycleConversion = plan.mechanicUses
    .filter(use => use.sceneId === sceneId && use.role === 'effect')
    .some(use => {
      const mechanic = kernel.worldMechanics.find(item => item.id === use.mechanicId);
      return mechanic?.kind === 'conversion' && [
        ...mechanic.inputsPerBatch,
        ...mechanic.outputsPerBatch,
      ].some(resource => isTimeCycleResource(kernel, resource.resourceId));
    });
  return hasTimeCycleConversion ? 'compress_transition' : 'full_scene';
}

export function buildWriterBrief(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
  stateAfter?: StoryState;
  nextPlan?: ChapterPlan;
  continuityPacket?: ContinuityPacket;
  craftGuidance?: CraftGuidance[];
}): WriterBrief {
  const ids = relevantIds(input.plan);
  ids.characters.add(input.kernel.protagonistId);
  const name = labels(input.kernel);
  const observableDeltaIds = narrativelyObservableDeltaIds(input.kernel, input.plan);
  const hiddenResourceIds = new Set(input.plan.requiredDeltas.flatMap(delta => (
    (delta.kind === 'resource_numeric' || delta.kind === 'resource_state')
    && !observableDeltaIds.has(delta.id)
      ? [delta.resourceId]
      : []
  )));
  hiddenResourceIds.forEach(resourceId => ids.resources.delete(resourceId));
  const deltas = new Map(input.plan.requiredDeltas
    .filter(delta => observableDeltaIds.has(delta.id))
    .map(delta => [delta.id, delta]));
  const continuity = input.continuityPacket
    ? flattenContinuityPacket(input.continuityPacket).slice(0, 12).map(event => readableTransition(event, name))
    : [];
  const sceneChanges = (sceneId: string, deltaIds: string[]) => {
    const available = new Set(deltaIds.filter(deltaId => deltas.has(deltaId)));
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
      .filter(id => deltas.has(id) && !claimed.has(id))
      .map(id => ({
        operation: null,
        actor: null,
        transitions: [readableDelta(deltas.get(id)!, name)],
      }));
    return [...operations, ...standalone];
  };
  const nextScene = input.nextPlan?.chapterNumber === input.plan.chapterNumber + 1
    ? input.nextPlan.scenes[0]
    : null;
  const nextOpening = nextScene
    ? {
      chapterNumber: input.nextPlan!.chapterNumber,
      location: name(nextScene.locationId),
      participants: nextScene.participantIds.map(name),
      immediateObjective: nextScene.objective,
      plannedTravelMinutes: nextScene.travelMinutesFromPrevious,
      mustRemainAvailableAt: (input.stateAfter?.characters ?? [])
        .filter(character => (
          nextScene.participantIds.includes(character.characterId)
          && character.locationId === nextScene.locationId
        ))
        .map(character => ({
          character: name(character.characterId),
          location: name(character.locationId),
        })),
    }
    : null;
  const recentTitles = input.state.recentOutcomes.slice(-5).map(outcome => outcome.title);
  const recentTitleStems = recentTitles.map(title => title
    .replace(/^\s*Chương\s+\d+\s*:\s*/iu, '')
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .join(' '))
    .filter(Boolean);
  return {
    story: { title: input.kernel.title },
    chapterNumber: input.plan.chapterNumber,
    recentTitles,
    recentTitleStems,
    craftGuidance: (input.craftGuidance ?? []).slice(0, 4),
    canonicalUnits: [...new Set(input.kernel.resources.flatMap(resource =>
      resource.kind === 'numeric' ? [resource.unit] : []))],
    // Canon laws governing this chapter, verbatim. The Writer used to be denied all
    // world-rule text and promptly contradicted one it had never seen (crabs drifting
    // with the current against a rule that says they work upstream) — a violation the
    // Editor missed and only the independent continuity judge caught. Rule TEXT is
    // kernel canon, not plan internals; exposing it does not leak mechanics.
    physicalLaws: input.kernel.worldRules
      .filter(rule => input.plan.requiredWorldRuleIds.includes(rule.id))
      .map(rule => (rule.exceptions.length
        ? `${rule.claim} (ngoại lệ: ${rule.exceptions.join('; ')})`
        : rule.claim)),
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
        encounteredRelevantCharacters: character.encounteredCharacterIds
          .filter(counterpartId => ids.characters.has(counterpartId))
          .map(name),
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
      pacing: scenePacing(input.kernel, input.plan, scene.id),
      timeBudgetMinutes: scene.durationMinutes,
      travelFromPreviousMinutes: scene.travelMinutesFromPrevious,
      objective: scene.objective,
      obstacle: scene.obstacle,
      // Group exact ledger transitions into causal operations. Writer still sees
      // every required before/after state, but no longer receives a flat list
      // that invites prose shaped like database telemetry.
      requiredChanges: sceneChanges(scene.id, scene.requiredDeltaIds),
    })),
    operationalConstraints: operationalConstraints(input.kernel, input.plan, name),
    relevantConversionRates: relevantConversionRates(input.kernel, input.plan, name),
    continuity,
    nextOpening,
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
  stateAfter?: StoryState;
  nextPlan?: ChapterPlan;
  previousChapter?: string;
  continuityPacket?: ContinuityPacket;
  craftGuidance?: CraftGuidance[];
}) {
  const brief = buildWriterBrief(input);
  const previousTail = input.previousChapter ? selectPreviousTail(input.previousChapter) : '';
  const ids = relevantIds(input.plan);
  const comparisonMechanics = relevantConversionMechanics(input.kernel, input.plan);
  const comparisonMechanicIds = new Set(comparisonMechanics.map(mechanic => mechanic.id));
  const comparisonResourceIds = new Set(comparisonMechanics.flatMap(mechanic => [
    ...mechanic.inputsPerBatch.map(inputResource => inputResource.resourceId),
    ...mechanic.outputsPerBatch.map(outputResource => outputResource.resourceId),
  ]));
  const editorKernel = {
    title: input.kernel.title,
    protagonistId: input.kernel.protagonistId,
    characters: input.kernel.characters.filter(character => ids.characters.has(character.id) || character.id === input.kernel.protagonistId),
    worldMechanics: input.kernel.worldMechanics.filter(mechanic =>
      input.plan.mechanicUses.some(use => use.mechanicId === mechanic.id)
      || comparisonMechanicIds.has(mechanic.id)),
    resources: input.kernel.resources.filter(resource =>
      ids.resources.has(resource.id) || comparisonResourceIds.has(resource.id)),
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
    plannedEndState: input.stateAfter ? {
      chapterNumber: input.stateAfter.chapterNumber,
      storyTimeMinutes: input.stateAfter.storyTimeMinutes,
      facts: input.stateAfter.facts.filter(fact => ids.facts.has(fact.id)),
      characters: input.stateAfter.characters.filter(character => ids.characters.has(character.characterId)),
      resources: input.stateAfter.resources.filter(resource => ids.resources.has(resource.resourceId)),
      promises: input.stateAfter.promises.filter(promise => ids.promises.has(promise.promiseId)),
    } : null,
    nextOpening: brief.nextOpening,
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
  rejectedDraft?: { title: string; content: string };
}) {
  if (input.assessment.status !== 'revise') throw new Error('Revision context requires a revise assessment.');
  return {
    writerBrief: input.brief,
    previousChapterTail: input.previousTail,
    // The rejected draft IS provided. The original design withheld it to prevent
    // sentence-patching, and the result was measurable: across six smokes and two
    // writer models, zero rewrites survived the second edit — each from-scratch
    // rewrite fixed the cited findings and rolled brand-new violations elsewhere.
    // A targeted repair keeps the ~90% of the draft that already passed inspection.
    rejectedDraft: input.rejectedDraft ?? null,
    continuityIssues: input.assessment.continuityIssues,
    readingIssues: input.assessment.readingIssues,
  };
}
