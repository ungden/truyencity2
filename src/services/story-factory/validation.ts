import {
  narrativelyObservableDeltaIds,
  type ArcPlan,
  type CanonExtension,
  type ChapterOutcome,
  type ChapterPlan,
  type RollingPlan,
  type StateDelta,
  type StoryKernel,
  type StoryState,
  StoryFactoryError,
} from './contracts';

export const CAUSAL_VALIDATOR_VERSION = 'story-factory-causal-validator-36-location-path-acquisition-bridge';

export interface StateEvent {
  chapterNumber: number;
  deltaId: string;
  kind: StateDelta['kind'] | 'chapter_outcome' | 'mechanic_use' | 'encounter';
  entityId: string;
  before: unknown;
  after: unknown;
  source: string | null;
  relatedEntityIds: string[];
}

/**
 * A signal the Plan Judge should look at, not a verdict.
 *
 * Some checks can only be expressed as pattern matching over free-form Vietnamese
 * scene text. Those cannot be authoritative: "chế tạo" reads as crafting whether the
 * scene completes an asset or merely persuades someone to start building one, and a
 * blocked plan there costs a whole job. The structured delta/mechanic contract remains
 * the source of truth for what actually moves; these observations go to the judge,
 * which has the full window and can answer with reasoning instead of a keyword.
 */
export interface PlanAdvisory {
  chapterNumber: number;
  sceneId: string;
  observation: string;
  question: string;
  evidence: unknown;
}

let advisoryBuffer: PlanAdvisory[] | null = null;

function advisory(entry: PlanAdvisory): void {
  advisoryBuffer?.push(entry);
}

/**
 * Run a SYNCHRONOUS validation and collect any advisories it raised.
 *
 * The buffer is module-global and restored in `finally`, so an async callback would
 * lose (or misattribute) anything raised after its first await. Every current caller
 * passes a synchronous validator; keep it that way.
 */
export function collectPlanAdvisories<T>(run: () => T): { value: T; advisories: PlanAdvisory[] } {
  const previous = advisoryBuffer;
  const buffer: PlanAdvisory[] = [];
  advisoryBuffer = buffer;
  try {
    return { value: run(), advisories: buffer };
  } finally {
    advisoryBuffer = previous;
  }
}

function fail(message: string, evidence?: unknown): never {
  throw new StoryFactoryError('plan_blocked', message, evidence);
}

function unique(values: string[], label: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) fail(`${label} contains duplicate stable IDs.`, [...new Set(duplicates)]);
}

/**
 * Resolve a model-proposed evidence anchor to bytes that actually occur in the
 * accepted prose. For longer proposals we require at least four consecutive
 * matching words; short proposals must match in full. The returned value is
 * always sliced from `content`, never copied from model output.
 */
export function groundEvidenceSpan(content: string, proposed: string): string | null {
  const tokenPattern = /[\p{L}\p{N}]+/gu;
  const contentTokens = [...content.matchAll(tokenPattern)].map(match => ({
    value: match[0].normalize('NFKC').toLocaleLowerCase('vi'),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  const proposedTokens = [...proposed.matchAll(tokenPattern)]
    .map(match => match[0].normalize('NFKC').toLocaleLowerCase('vi'));
  if (!contentTokens.length || !proposedTokens.length) return null;

  let bestLength = 0;
  let bestContentStart = -1;
  for (let proposedStart = 0; proposedStart < proposedTokens.length; proposedStart += 1) {
    for (let contentStart = 0; contentStart < contentTokens.length; contentStart += 1) {
      let length = 0;
      while (
        proposedStart + length < proposedTokens.length
        && contentStart + length < contentTokens.length
        && proposedTokens[proposedStart + length] === contentTokens[contentStart + length].value
      ) length += 1;
      if (length > bestLength) {
        bestLength = length;
        bestContentStart = contentStart;
      }
    }
  }
  const requiredLength = proposedTokens.length < 4 ? proposedTokens.length : 4;
  if (bestContentStart < 0 || bestLength < requiredLength) return null;
  const first = contentTokens[bestContentStart];
  const last = contentTokens[bestContentStart + bestLength - 1];
  return content.slice(first.start, last.end);
}

export function validateKernelState(kernel: StoryKernel, state: StoryState): void {
  unique(kernel.characters.map(item => item.id), 'Kernel characters');
  unique(kernel.resources.map(item => item.id), 'Kernel resources');
  unique(kernel.promises.map(item => item.id), 'Kernel promises');
  unique(kernel.worldRules.map(item => item.id), 'Kernel world rules');
  unique(kernel.worldMechanics.map(item => item.id), 'Kernel world mechanics');
  unique(kernel.locations.map(item => item.id), 'Kernel locations');
  unique(kernel.worldModel.geography.map(item => item.id), 'World geography');
  unique(kernel.worldModel.institutions.map(item => item.id), 'World institutions');
  unique(kernel.worldModel.systems.map(item => item.id), 'World systems');
  unique(kernel.progressionTracks.map(item => item.id), 'Progression tracks');
  unique(kernel.seriesSpine.stages.map(item => item.id), 'Series stages');
  unique(state.characters.map(item => item.characterId), 'State characters');
  unique(state.resources.map(item => item.resourceId), 'State resources');
  unique(state.promises.map(item => item.promiseId), 'State promises');
  unique(state.usedExpansionSeedIds, 'Consumed expansion seeds');
  unique(state.facts.map(item => item.id), 'State facts');
  unique(state.recentOutcomes.map(item => String(item.chapterNumber)), 'Recent outcome chapters');
  let previousOutcomeChapter = -1;
  for (const outcome of state.recentOutcomes) {
    if (outcome.chapterNumber > state.chapterNumber) {
      fail(`Recent outcome chapter ${outcome.chapterNumber} is ahead of StoryState chapter ${state.chapterNumber}.`);
    }
    if (outcome.chapterNumber <= previousOutcomeChapter) {
      fail('Recent outcomes must be strictly ordered by committed chapter number.');
    }
    previousOutcomeChapter = outcome.chapterNumber;
  }

  const characterIds = new Set(kernel.characters.map(item => item.id));
  const resourceIds = new Set(kernel.resources.map(item => item.id));
  const promiseIds = new Set(kernel.promises.map(item => item.id));
  const locationIds = new Set(kernel.locations.map(item => item.id));
  for (const mechanic of kernel.worldMechanics) {
    if (mechanic.kind === 'conversion') {
      for (const resource of [...mechanic.inputsPerBatch, ...mechanic.outputsPerBatch]) {
        if (!resourceIds.has(resource.resourceId)) fail(`Mechanic ${mechanic.id} references unknown resource ${resource.resourceId}.`);
      }
    } else {
      if (mechanic.kind === 'capability') {
        for (const actorId of mechanic.allowedActorIds) {
          if (!characterIds.has(actorId)) fail(`Mechanic ${mechanic.id} allows unknown actor ${actorId}.`);
        }
        for (const resourceId of mechanic.requiredResourceIds) {
          if (!resourceIds.has(resourceId)) fail(`Mechanic ${mechanic.id} requires unknown resource ${resourceId}.`);
        }
        for (const effect of mechanic.effectResources) {
          if (!resourceIds.has(effect.resourceId)) fail(`Mechanic ${mechanic.id} affects unknown resource ${effect.resourceId}.`);
        }
      }
      if (mechanic.kind === 'constraint') {
        for (const forbidden of mechanic.forbiddenFacts) {
          const conflict = mechanic.requiredFacts.some(required =>
            required.factId === forbidden.factId && required.expected === forbidden.expected);
          if (conflict) {
            fail(`Mechanic ${mechanic.id} both requires and forbids fact ${forbidden.factId}.`);
          }
        }
      }
    }
  }
  for (const character of state.characters) {
    if (!characterIds.has(character.characterId)) fail(`State references unknown character ${character.characterId}.`);
    if (!locationIds.has(character.locationId)) fail(`State references unknown location ${character.locationId}.`);
    unique(character.encounteredCharacterIds, `Encounter snapshot for ${character.characterId}`);
    for (const counterpartId of character.encounteredCharacterIds) {
      if (counterpartId === character.characterId) fail(`Character ${character.characterId} cannot encounter itself.`);
      if (!characterIds.has(counterpartId)) fail(`Encounter snapshot references unknown character ${counterpartId}.`);
      const counterpart = state.characters.find(item => item.characterId === counterpartId);
      if (!counterpart?.encounteredCharacterIds.includes(character.characterId)) {
        fail(`Encounter snapshot must be reciprocal for ${character.characterId}:${counterpartId}.`);
      }
    }
    for (const counterpartId of Object.keys(character.relationshipState)) {
      if (!characterIds.has(counterpartId)) fail(`Relationship state references unknown character ${counterpartId}.`);
      const value = character.relationshipState[counterpartId];
      if (/(?:\b(?:chưa|không|mới|đã)\s+(?:từng\s+)?(?:biết|gặp|quen)\b|sự tồn tại|lần đầu(?: tiên)?\s+(?:gặp|biết))/iu.test(value)) {
        fail(`Relationship state ${character.characterId}:${counterpartId} encodes encounter history in prose; use encounteredCharacterIds as the exact source of truth.`);
      }
    }
  }
  for (const resource of state.resources) {
    const definition = kernel.resources.find(item => item.id === resource.resourceId);
    if (!definition || definition.kind !== resource.kind) fail(`State resource ${resource.resourceId} does not match the kernel.`);
  }
  for (const promise of state.promises) {
    if (!promiseIds.has(promise.promiseId)) fail(`State references unknown promise ${promise.promiseId}.`);
  }
  for (const required of kernel.characters) {
    if (!state.characters.some(item => item.characterId === required.id)) fail(`Initial state is missing character ${required.id}.`);
  }
  for (const required of kernel.resources) {
    if (!state.resources.some(item => item.resourceId === required.id)) fail(`Initial state is missing resource ${required.id}.`);
  }
  for (const required of kernel.promises) {
    if (!state.promises.some(item => item.promiseId === required.id)) fail(`Initial state is missing promise ${required.id}.`);
  }

  const protagonistLocation = state.characters.find(item => item.characterId === kernel.protagonistId)?.locationId;
  if (!protagonistLocation) fail('Initial state is missing the protagonist location.');
  const reachableFrom = (start: string) => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      for (const rule of kernel.travelRules) {
        if (rule.fromLocationId !== current || seen.has(rule.toLocationId)) continue;
        seen.add(rule.toLocationId);
        queue.push(rule.toLocationId);
      }
    }
    return seen;
  };
  const outward = reachableFrom(protagonistLocation);
  const unreachable = kernel.locations.map(item => item.id).filter(locationId => !outward.has(locationId));
  const noReturn = kernel.locations.map(item => item.id)
    .filter(locationId => !reachableFrom(locationId).has(protagonistLocation));
  if (unreachable.length || noReturn.length) {
    // Name the offending locations in the message, not just the evidence: this
    // string is what lands in `story_factory_jobs.last_error`, and a generic
    // sentence there costs a round trip to the run row before anyone can act.
    const parts = [
      unreachable.length ? `không tới được: ${unreachable.join(', ')}` : '',
      noReturn.length ? `không có đường về: ${noReturn.join(', ')}` : '',
    ].filter(Boolean);
    fail(
      `Kernel travel graph must let the protagonist reach every declared location and return (từ ${protagonistLocation} — ${parts.join('; ')}).`,
      { protagonistLocation, unreachable, noReturn },
    );
  }
}

/**
 * Prove that the current arc does not depend on a resource that can never
 * exist. A resource is reachable when it is already present or is produced by
 * an active conversion whose own inputs are reachable. This deliberately
 * models provenance, not quantity scheduling; exact balances remain the
 * rolling-plan validator's responsibility.
 */
/**
 * Every resource an active conversion or capability CONSUMES must be PRODUCED by
 * at least one active mechanic. Opening stock does not count: a finite balance is a countdown,
 * not an acquisition path. The first production canary passed balance-seeded
 * reachability at setup, spent its opening inventory across three chapters, and
 * dead-ended — its arc could preserve and sell fish but nothing could ever acquire
 * fish again. Production-graph form deliberately accepts bootstrap loops (money
 * buys fish, selling fish yields money) that a zero-balance reachability check
 * would wrongly reject.
 */
export function assertRenewableMechanicSet(
  activeMechanics: StoryKernel['worldMechanics'],
): void {
  const produced = new Set<string>();
  const consumed = new Set<string>();
  for (const mechanic of activeMechanics) {
    if (mechanic.kind === 'conversion') {
      mechanic.outputsPerBatch.forEach(item => produced.add(item.resourceId));
      mechanic.inputsPerBatch.forEach(item => consumed.add(item.resourceId));
    } else if (mechanic.kind === 'capability') {
      mechanic.effectResources.forEach(effect => {
        if (effect.direction === 'increase') produced.add(effect.resourceId);
        if (effect.direction === 'decrease') consumed.add(effect.resourceId);
      });
    }
  }
  const sinkOnly = [...consumed].filter(resourceId => !produced.has(resourceId));
  if (sinkOnly.length) {
    fail('Active mechanics consume resources no active mechanic can produce.', {
      resourceIds: sinkOnly,
      repairRule: 'Add an active acquisition mechanic (purchase, harvest, production) for each listed resource, or deactivate the conversion that consumes it. A finite opening balance is not an acquisition path.',
    });
  }
}

export function assertRenewableConversionInputs(kernel: StoryKernel, arc: ArcPlan): void {
  const activeMechanics = arc.activeMechanicIds.map(id => (
    kernel.worldMechanics.find(mechanic => mechanic.id === id)
  )).filter((mechanic): mechanic is StoryKernel['worldMechanics'][number] => Boolean(mechanic));
  assertRenewableMechanicSet(activeMechanics);
}

export function validateArcResourceReachability(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
}): void {
  const { kernel, arc, state } = input;
  const resourceDefinitions = new Map(kernel.resources.map(resource => [resource.id, resource]));
  const activeMechanics = arc.activeMechanicIds.map(id => (
    kernel.worldMechanics.find(mechanic => mechanic.id === id)
  )).filter((mechanic): mechanic is StoryKernel['worldMechanics'][number] => Boolean(mechanic));
  const reachable = new Set(state.resources.flatMap(resource => {
    if (resource.kind === 'numeric' && resource.value > 0) return [resource.resourceId];
    if (resource.kind === 'state' && resource.value.trim() && !/^(?:0|false|none|null)$/iu.test(resource.value.trim())) {
      return [resource.resourceId];
    }
    return [];
  }));

  for (const mechanic of activeMechanics) {
    if (mechanic.kind !== 'conversion') continue;
    for (const item of [...mechanic.inputsPerBatch, ...mechanic.outputsPerBatch]) {
      if (resourceDefinitions.get(item.resourceId)?.kind !== 'numeric') {
        fail(`Conversion ${mechanic.id} must use numeric resources only.`, { resourceId: item.resourceId });
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const mechanic of activeMechanics) {
      if (mechanic.kind === 'conversion') {
        const required = mechanic.inputsPerBatch.map(item => item.resourceId);
        if (!required.every(resourceId => reachable.has(resourceId))) continue;
        for (const output of mechanic.outputsPerBatch) {
          if (reachable.has(output.resourceId)) continue;
          reachable.add(output.resourceId);
          changed = true;
        }
      } else if (mechanic.kind === 'capability'
        && mechanic.requiredResourceIds.every(resourceId => reachable.has(resourceId))) {
        for (const effect of mechanic.effectResources.filter(item => item.direction !== 'decrease')) {
          if (reachable.has(effect.resourceId)) continue;
          reachable.add(effect.resourceId);
          changed = true;
        }
      }
    }
  }

  const required = new Set<string>();
  for (const mechanic of activeMechanics) {
    if (mechanic.kind === 'conversion') {
      mechanic.inputsPerBatch.forEach(item => required.add(item.resourceId));
      mechanic.outputsPerBatch.forEach(item => required.add(item.resourceId));
    } else if (mechanic.kind === 'capability') {
      mechanic.requiredResourceIds.forEach(resourceId => required.add(resourceId));
      mechanic.effectResources.forEach(effect => required.add(effect.resourceId));
    }
  }
  const unreachable = [...required].filter(resourceId => !reachable.has(resourceId));
  if (unreachable.length) {
    fail('Arc depends on resources with no causal acquisition path.', {
      resourceIds: unreachable,
      activeMechanicIds: arc.activeMechanicIds,
      repairRule: 'Give the initial state a grounded positive balance or add an active conversion such as a story-specific purchase, harvest, or production path from already reachable resources.',
    });
  }
}

/**
 * Complete an arc's working set only when there is one unambiguous, already
 * funded conversion that acquires a resource an active mechanic needs. This is
 * deliberately narrower than planning: it never invents a resource, chooses
 * between competing suppliers, or adds a capability. It merely keeps a
 * canonical purchase/harvest conversion from being accidentally omitted from
 * `activeMechanicIds` while its consumer remains active.
 *
 * The returned arc is safe to persist. Callers must still run the normal
 * validators afterwards; an ambiguous or impossible path remains blocked.
 */
export function activateUnambiguousAcquisitionMechanics(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
}): { arc: ArcPlan; activatedMechanicIds: string[] } {
  const activeMechanicIds = [...input.arc.activeMechanicIds];
  const active = new Set(activeMechanicIds);
  const resources = new Map(input.kernel.resources.map(resource => [resource.id, resource]));
  const reachable = new Set(input.state.resources.flatMap(resource => {
    if (resource.kind === 'numeric' && resource.value > 0) return [resource.resourceId];
    if (resource.kind === 'state' && resource.value.trim() && !/^(?:0|false|none|null)$/iu.test(resource.value.trim())) {
      return [resource.resourceId];
    }
    return [];
  }));
  const activatedMechanicIds: string[] = [];

  const extendReachable = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const mechanicId of activeMechanicIds) {
        const mechanic = input.kernel.worldMechanics.find(item => item.id === mechanicId);
        if (!mechanic) continue;
        if (mechanic.kind === 'conversion') {
          if (!mechanic.inputsPerBatch.every(item => reachable.has(item.resourceId))) continue;
          for (const output of mechanic.outputsPerBatch) {
            if (reachable.has(output.resourceId)) continue;
            reachable.add(output.resourceId);
            changed = true;
          }
        } else if (mechanic.kind === 'capability'
          && mechanic.requiredResourceIds.every(resourceId => reachable.has(resourceId))) {
          for (const effect of mechanic.effectResources) {
            if (effect.direction === 'decrease' || reachable.has(effect.resourceId)) continue;
            reachable.add(effect.resourceId);
            changed = true;
          }
        }
      }
    }
  };

  // A newly activated purchase can make the input for another unambiguous
  // purchase reachable, so close the graph one bridge at a time.
  let changed = true;
  while (changed) {
    changed = false;
    extendReachable();
    const required = new Set<string>();
    for (const mechanicId of activeMechanicIds) {
      const mechanic = input.kernel.worldMechanics.find(item => item.id === mechanicId);
      if (!mechanic) continue;
      if (mechanic.kind === 'conversion') {
        mechanic.inputsPerBatch.forEach(item => required.add(item.resourceId));
        mechanic.outputsPerBatch.forEach(item => required.add(item.resourceId));
      } else if (mechanic.kind === 'capability') {
        mechanic.requiredResourceIds.forEach(resourceId => required.add(resourceId));
        mechanic.effectResources.forEach(effect => required.add(effect.resourceId));
      }
    }
    const missing = [...required].filter(resourceId => !reachable.has(resourceId));
    for (const resourceId of missing) {
      if (resources.get(resourceId)?.kind !== 'numeric') continue;
      const candidates = input.kernel.worldMechanics.filter((mechanic): mechanic is Extract<StoryKernel['worldMechanics'][number], { kind: 'conversion' }> => (
        mechanic.kind === 'conversion'
        && !active.has(mechanic.id)
        && mechanic.outputsPerBatch.some(output => output.resourceId === resourceId)
        && mechanic.inputsPerBatch.every(item => reachable.has(item.resourceId))
      ));
      if (candidates.length !== 1) continue;
      const candidate = candidates[0];
      active.add(candidate.id);
      activeMechanicIds.push(candidate.id);
      activatedMechanicIds.push(candidate.id);
      changed = true;
    }
  }

  return {
    arc: activatedMechanicIds.length
      ? { ...input.arc, activeMechanicIds }
      : input.arc,
    activatedMechanicIds,
  };
}

export function applyCanonExtension(input: {
  kernel: StoryKernel;
  state: StoryState;
  extension: CanonExtension;
}): { kernel: StoryKernel; state: StoryState } {
  const kernel = structuredClone(input.kernel);
  const state = structuredClone(input.state);
  const stage = kernel.seriesSpine.stages.find(item => item.id === input.extension.stageId);
  if (!stage) fail(`Canon extension references unknown stage ${input.extension.stageId}.`);
  const seeds = new Map(stage.expansionSeeds.map(seed => [seed.id, seed.kind]));
  const usedSeeds: string[] = [];
  const assertSeed = (seedId: string, kind: 'character' | 'location' | 'promise' | 'world_rule' | 'world_mechanic') => {
    if (seeds.get(seedId) !== kind) fail(`Canon extension seed ${seedId} does not permit ${kind}.`);
    if (state.usedExpansionSeedIds.includes(seedId)) fail(`Canon extension seed ${seedId} was already consumed.`);
    usedSeeds.push(seedId);
  };
  const characterIds = new Set(kernel.characters.map(item => item.id));
  const locationIds = new Set(kernel.locations.map(item => item.id));
  const promiseIds = new Set(kernel.promises.map(item => item.id));
  const ruleIds = new Set(kernel.worldRules.map(item => item.id));
  const mechanicIds = new Set(kernel.worldMechanics.map(item => item.id));

  for (const item of input.extension.locations) {
    assertSeed(item.seedId, 'location');
    if (locationIds.has(item.definition.id)) fail(`Canon extension cannot overwrite location ${item.definition.id}.`);
    kernel.locations.push({ id: item.definition.id, name: item.definition.name });
    kernel.worldModel.geography.push(item.definition);
    locationIds.add(item.definition.id);
  }
  for (const item of input.extension.characters) {
    assertSeed(item.seedId, 'character');
    if (characterIds.has(item.definition.id)) fail(`Canon extension cannot overwrite character ${item.definition.id}.`);
    if (!locationIds.has(item.initialState.locationId)) fail(`New character ${item.definition.id} starts at an unknown location.`);
    kernel.characters.push(item.definition);
    state.characters.push({
      characterId: item.definition.id,
      locationId: item.initialState.locationId,
      knownFactIds: item.initialState.knownFactIds,
      encounteredCharacterIds: item.initialState.encounteredCharacterIds,
      relationshipState: item.initialState.relationshipState,
    });
    characterIds.add(item.definition.id);
  }
  for (const item of input.extension.promises) {
    assertSeed(item.seedId, 'promise');
    if (promiseIds.has(item.id)) fail(`Canon extension cannot overwrite promise ${item.id}.`);
    kernel.promises.push({ id: item.id, description: item.description });
    state.promises.push({ promiseId: item.id, status: 'open' });
    promiseIds.add(item.id);
  }
  for (const item of input.extension.worldRules) {
    assertSeed(item.seedId, 'world_rule');
    if (ruleIds.has(item.id)) fail(`Canon extension cannot overwrite world rule ${item.id}.`);
    kernel.worldRules.push({ id: item.id, claim: item.claim, exceptions: item.exceptions });
    ruleIds.add(item.id);
  }
  for (const item of input.extension.worldMechanics) {
    assertSeed(item.seedId, 'world_mechanic');
    if (mechanicIds.has(item.definition.id)) fail(`Canon extension cannot overwrite world mechanic ${item.definition.id}.`);
    kernel.worldMechanics.push(item.definition);
    mechanicIds.add(item.definition.id);
  }
  unique(usedSeeds, 'Canon extension seeds');
  state.usedExpansionSeedIds.push(...usedSeeds);
  for (const rule of input.extension.travelRules) {
    if (!locationIds.has(rule.fromLocationId) || !locationIds.has(rule.toLocationId)) {
      fail('Canon extension travel rule references an unknown location.', rule);
    }
    if (kernel.travelRules.some(existing => existing.fromLocationId === rule.fromLocationId
      && existing.toLocationId === rule.toLocationId)) {
      fail('Canon extension cannot overwrite an existing travel rule.', rule);
    }
    kernel.travelRules.push(rule);
  }
  validateKernelState(kernel, state);
  return { kernel, state };
}

function preconditionMatches(actual: string | number | undefined, expected: string | number): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') return nearlyEqual(actual, expected);
  if (actual === expected) return true;
  if (actual === undefined) return false;
  if (typeof actual !== typeof expected) {
    const stringValue = typeof actual === 'string'
      ? actual
      : typeof expected === 'string' ? expected : null;
    const numberValue = typeof actual === 'number'
      ? actual
      : typeof expected === 'number' ? expected : null;
    if (numberValue !== null && stringValue !== null && stringValue.trim() !== '') {
      const numericString = Number(stringValue);
      return Number.isFinite(numericString) && nearlyEqual(numberValue, numericString);
    }
  }
  return false;
}

function checkPreconditions(state: StoryState, plan: ChapterPlan): void {
  for (const condition of plan.preconditions) {
    let actual: string | number | undefined;
    if (condition.kind === 'fact') actual = state.facts.find(item => item.id === condition.entityId)?.value;
    if (condition.kind === 'resource') actual = state.resources.find(item => item.resourceId === condition.entityId)?.value;
    if (condition.kind === 'location') actual = state.characters.find(item => item.characterId === condition.entityId)?.locationId;
    if (condition.kind === 'promise') actual = state.promises.find(item => item.promiseId === condition.entityId)?.status;
    if (!preconditionMatches(actual, condition.expected)) {
      fail(`Precondition ${condition.kind}:${condition.entityId} is false.`, { expected: condition.expected, actual });
    }
  }
}

export function travelMinimum(kernel: StoryKernel, from: string, to: string): number | null {
  if (from === to) return 0;
  const distances = new Map<string, number>([[from, 0]]);
  const visited = new Set<string>();
  while (true) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const [locationId, distance] of distances) {
      if (!visited.has(locationId) && distance < currentDistance) {
        current = locationId;
        currentDistance = distance;
      }
    }
    if (current === null) return null;
    if (current === to) return currentDistance;
    visited.add(current);
    for (const rule of kernel.travelRules.filter(item => item.fromLocationId === current)) {
      const candidate = currentDistance + rule.minimumMinutes;
      if (candidate < (distances.get(rule.toLocationId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(rule.toLocationId, candidate);
      }
    }
  }
}

function stripFutureIntent(action: string): string {
  const intent = String.raw`(?:cần|sẽ|định|dự\s+định|tính|muốn|chưa|không|đi|hứa(?:\s+sẽ)?|cam\s+kết(?:\s+sẽ)?|chờ\s+đợi|dự\s+kiến|sắp|quyết\s+định|trước\s+khi|phân\s+tích\s+việc|xem\s+xét\s+việc|lên\s+kế\s+hoạch(?:\s+để)?|đồng\s+ý|chấp\s+nhận|thống\s+nhất|thỏa\s+thuận|thoả\s+thuận)`;
  const filler = String.raw`(?:[\p{L}\p{N}_-]+\s+){0,12}`;
  const verbs = String.raw`(?:mua|bán|thu\s+mua|trả\s+tiền|chi\s+tiền|thu\s+tiền|nhận\s+tiền|kiếm\s+tiền|chia\s+(?:một\s+)?(?:phần\s+)?lợi\s+nhuận|chia\s+tiền\s+lãi|trích\s+(?:phần\s+trăm|lợi\s+nhuận)|trả\s+công|chế\s+tạo|đóng\s+thành|xây\s+dựng|lắp\s+ráp|thu\s+gom|nhận\s+được)`;
  const left = String.raw`(?<![\p{L}\p{N}_-])`;
  const right = String.raw`(?=$|[^\p{L}\p{N}_-])`;
  return action.replace(new RegExp(String.raw`${left}${intent}\s+${filler}${verbs}${right}`, 'giu'), '');
}

function stripReportedTransactions(action: string): string {
  const reporting = String.raw`(?:thông\s+báo|báo\s+cáo|kể\s+lại|nhắc\s+lại|xác\s+nhận|nghe\s+tin|được\s+báo)`;
  const filler = String.raw`(?:[\p{L}\p{N}_-]+\s+){0,16}`;
  const verbs = String.raw`(?:mua|bán|thu\s+mua|trả\s+tiền|chi\s+tiền|thu\s+tiền|nhận\s+tiền|kiếm\s+tiền|chia\s+(?:một\s+)?phần\s+lợi\s+nhuận|chia\s+tiền\s+lãi|trích\s+phần\s+trăm|trả\s+công)`;
  const left = String.raw`(?<![\p{L}\p{N}_-])`;
  const right = String.raw`(?=$|[^\p{L}\p{N}_-])`;
  return action.replace(new RegExp(String.raw`${left}${reporting}\s+${filler}${verbs}${right}`, 'giu'), '');
}

function stripProhibitedTransactions(action: string): string {
  const prohibition = String.raw`(?:nghiêm\s+cấm|cấm|không\s+cho\s+phép|không\s+được|ngăn\s+chặn|hạn\s+chế|đình\s+chỉ)`;
  const filler = String.raw`(?:(?:việc|hành\s+vi)\s+)?`;
  const verbs = String.raw`(?:mua|bán|thu\s+mua|trả\s+tiền|chi\s+tiền|thu\s+tiền|nhận\s+tiền|kiếm\s+tiền)`;
  const left = String.raw`(?<![\p{L}\p{N}_-])`;
  const right = String.raw`(?=$|[^\p{L}\p{N}_-])`;
  return action.replace(new RegExp(String.raw`${left}${prohibition}\s+${filler}${verbs}${right}`, 'giu'), '');
}

function stripNonActionAssetPhrases(action: string): string {
  // These phrases name a field of knowledge rather than the act of creating a
  // durable asset. Free-form scene text is only a defensive signal; it must
  // not override the structured delta/mechanic contract on a lexical match.
  return action.replace(
    /(?<![\p{L}\p{N}_-])(?:kiến\s+thức|kinh\s+nghiệm|kỹ\s+năng|kỹ\s+thuật|chuyên\s+môn|ngành|lĩnh\s+vực|thuật\s+ngữ)\s+(?:về\s+)?xây\s+dựng(?=$|[^\p{L}\p{N}_-])/giu,
    '',
  );
}

function describesCompletedDurableAsset(action: string): boolean {
  const completionBeforeVerb = String.raw`(?:hoàn\s+tất|hoàn\s+thành)\s+(?:việc\s+)?(?:chế\s+tạo|đóng|xây\s+dựng|lắp\s+ráp|dựng)`;
  const completionAfterVerb = String.raw`(?:chế\s+tạo|xây\s+dựng|lắp\s+ráp|dựng)\s+(?:xong|hoàn\s+chỉnh)`;
  const resultativeBuild = String.raw`đóng\s+thành`;
  return hasVietnameseTerm(action, `${completionBeforeVerb}|${completionAfterVerb}|${resultativeBuild}`);
}

function hasVietnameseTerm(action: string, terms: string): boolean {
  return new RegExp(String.raw`(?<![\p{L}\p{N}_-])(?:${terms})(?=$|[^\p{L}\p{N}_-])`, 'iu').test(action);
}

function semanticSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/đ/gu, 'd')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokenSequenceStartsAt(tokens: string[], sequence: string[], start: number): boolean {
  return sequence.every((token, offset) => tokens[start + offset] === token);
}

function ownerPerformsTransfer(
  input: string,
  labels: string[],
  verbs: string[][],
  requireMoneyTerm: boolean,
  requireAmount = false,
): boolean {
  const tokens = semanticSlug(input).split(' ').filter(Boolean);
  const moneyTerms = new Set(['tien', 'dong', 'phi', 'cong', 'von']);
  for (const label of labels) {
    const labelTokens = semanticSlug(label).split(' ').filter(Boolean);
    if (!labelTokens.length) continue;
    for (let index = 0; index <= tokens.length - labelTokens.length; index += 1) {
      if (!tokenSequenceStartsAt(tokens, labelTokens, index)) continue;
      const predicateStart = index + labelTokens.length;
      const predicateEnd = Math.min(tokens.length, predicateStart + 16);
      for (let verbStart = predicateStart; verbStart < predicateEnd; verbStart += 1) {
        const verb = verbs.find(candidate => tokenSequenceStartsAt(tokens, candidate, verbStart));
        if (!verb) continue;
        if (!requireMoneyTerm) return true;
        const objectEnd = Math.min(tokens.length, verbStart + verb.length + 12);
        const objectTokens = tokens.slice(verbStart + verb.length, objectEnd);
        if (objectTokens.some(token => moneyTerms.has(token))
          && (!requireAmount || objectTokens.some(token => /^\d+(?:[.,]\d+)*$/u.test(token)))) return true;
      }
    }
  }
  return false;
}

function validateRouteEfficiency(kernel: StoryKernel, state: StoryState, plan: ChapterPlan): void {
  for (const character of state.characters) {
    let currentLocation = character.locationId;
    const transitions: Array<{
      from: string;
      to: string;
      sceneId: string;
      sceneIndex: number;
    }> = [];
    plan.scenes.forEach((scene, sceneIndex) => {
      if (!scene.participantIds.includes(character.characterId)) return;
      if (currentLocation !== scene.locationId) {
        transitions.push({
          from: currentLocation,
          to: scene.locationId,
          sceneId: scene.id,
          sceneIndex,
        });
        currentLocation = scene.locationId;
      }
    });
    for (let firstIndex = 0; firstIndex < transitions.length - 2; firstIndex += 1) {
      const first = transitions[firstIndex];
      const reverseIndex = transitions.findIndex((transition, index) =>
        index > firstIndex
        && transition.from === first.to
        && transition.to === first.from);
      if (reverseIndex < 0) continue;
      const repeatedIndex = transitions.findIndex((transition, index) =>
        index > reverseIndex
        && transition.from === first.from
        && transition.to === first.to);
      if (repeatedIndex < 0) continue;
      const reverse = transitions[reverseIndex];
      const acquisitionUses = plan.mechanicUses.filter(use => {
        if (use.sceneId !== reverse.sceneId || use.actorId !== character.characterId || use.role !== 'effect') return false;
        return kernel.worldMechanics.find(mechanic => mechanic.id === use.mechanicId)?.kind === 'conversion';
      });
      if (!acquisitionUses.length) continue;
      const interveningFactIds = new Set(plan.scenes
        .slice(first.sceneIndex, reverse.sceneIndex)
        .flatMap(scene => scene.requiredDeltaIds)
        .flatMap(deltaId => {
          const delta = plan.requiredDeltas.find(item => item.id === deltaId);
          return delta?.kind === 'fact' ? [delta.factId] : [];
        }));
      const acquisitionDependsOnInterveningFact = acquisitionUses.some(use =>
        use.preconditionFactIds.some(factId => interveningFactIds.has(factId)));
      if (acquisitionDependsOnInterveningFact) continue;
      fail(
        `Chapter ${plan.chapterNumber} sends ${character.characterId} through a redundant acquisition round trip.`,
        {
          repeatedRoute: `${first.from} -> ${first.to} -> ${reverse.to} -> ${transitions[repeatedIndex].to}`,
          firstDepartureSceneId: first.sceneId,
          acquisitionSceneId: reverse.sceneId,
          repeatedDepartureSceneId: transitions[repeatedIndex].sceneId,
          acquisitionMechanicUseIds: acquisitionUses.map(use => use.id),
          instruction: 'Move the acquisition before the first departure, or encode the intervening fact that causally makes the later acquisition necessary and cite it as a mechanic precondition.',
        },
      );
    }
  }
}

function validateScenes(kernel: StoryKernel, state: StoryState, plan: ChapterPlan): void {
  const characterIds = new Set(kernel.characters.map(item => item.id));
  const locationIds = new Set(kernel.locations.map(item => item.id));
  const worldRuleIds = new Set(kernel.worldRules.map(item => item.id));
  const deltaIds = new Set(plan.requiredDeltas.map(item => item.id));
  const resourceDefinitions = new Map(kernel.resources.map(resource => [resource.id, resource]));
  const ownerLabels = new Map<string, string[]>();
  kernel.characters.forEach(character => ownerLabels.set(character.id, [character.name, ...character.aliases]));
  kernel.worldModel.institutions.forEach(institution => ownerLabels.set(institution.id, [institution.name]));
  unique(plan.scenes.map(item => item.id), `Chapter ${plan.chapterNumber} scenes`);
  unique(plan.requiredDeltas.map(item => item.id), `Chapter ${plan.chapterNumber} deltas`);
  unique(plan.requiredWorldRuleIds, `Chapter ${plan.chapterNumber} world rules`);
  for (const ruleId of plan.requiredWorldRuleIds) {
    if (!worldRuleIds.has(ruleId)) fail(`Chapter ${plan.chapterNumber} references unknown world rule ${ruleId}.`);
  }
  const referenced = new Set<string>();
  const locations = new Map(state.characters.map(item => [item.characterId, item.locationId]));
  const movementDeltaIds = new Set<string>();
  for (const scene of plan.scenes) {
    if (!characterIds.has(scene.povCharacterId)) fail(`Scene ${scene.id} has unknown POV ${scene.povCharacterId}.`);
    if (!scene.participantIds.includes(scene.povCharacterId)) fail(`Scene ${scene.id} POV is not a participant.`);
    if (!locationIds.has(scene.locationId)) fail(`Scene ${scene.id} has unknown location ${scene.locationId}.`);
    const movements: Array<{ characterId: string; beforeLocationId: string; afterLocationId: string }> = [];
    for (const participantId of scene.participantIds) {
      if (!characterIds.has(participantId)) fail(`Scene ${scene.id} has unknown participant ${participantId}.`);
      const previous = locations.get(participantId);
      if (previous && previous !== scene.locationId) {
        const minimum = travelMinimum(kernel, previous, scene.locationId);
        if (minimum === null) fail(`No travel rule connects ${previous} to ${scene.locationId} for ${participantId}.`);
        if (scene.travelMinutesFromPrevious < minimum) {
          fail(`Scene ${scene.id} moves ${participantId} faster than the world permits.`, {
            from: previous,
            to: scene.locationId,
            minimum,
            planned: scene.travelMinutesFromPrevious,
          });
        }
        movements.push({
          characterId: participantId,
          beforeLocationId: previous,
          afterLocationId: scene.locationId,
        });
      }
    }
    for (const deltaId of scene.requiredDeltaIds) {
      if (!deltaIds.has(deltaId)) fail(`Scene ${scene.id} references unknown delta ${deltaId}.`);
      referenced.add(deltaId);
    }
    const sceneDeltas = scene.requiredDeltaIds.map(deltaId => plan.requiredDeltas.find(delta => delta.id === deltaId)!);
    const locationDeltas = sceneDeltas.filter(
      (delta): delta is Extract<StateDelta, { kind: 'location' }> => delta.kind === 'location',
    );
    for (const movement of movements) {
      const matches = locationDeltas.filter(delta => (
        delta.characterId === movement.characterId
        && delta.beforeLocationId === movement.beforeLocationId
        && delta.afterLocationId === movement.afterLocationId
      ));
      if (matches.length !== 1) {
        fail(`Scene ${scene.id} must commit the exact location transition for ${movement.characterId}.`, {
          beforeLocationId: movement.beforeLocationId,
          afterLocationId: movement.afterLocationId,
          matchingLocationDeltaIds: matches.map(delta => delta.id),
        });
      }
      movementDeltaIds.add(matches[0].id);
    }
    for (const delta of locationDeltas) {
      const isExactMovement = movements.some(movement => (
        movement.characterId === delta.characterId
        && movement.beforeLocationId === delta.beforeLocationId
        && movement.afterLocationId === delta.afterLocationId
      ));
      if (!isExactMovement) {
        fail(`Scene ${scene.id} assigns a location delta that does not match a movement in that scene.`, {
          locationDeltaId: delta.id,
          characterId: delta.characterId,
          beforeLocationId: delta.beforeLocationId,
          afterLocationId: delta.afterLocationId,
        });
      }
    }
    for (const participantId of scene.participantIds) locations.set(participantId, scene.locationId);
    const broadAcquisition = hasVietnameseTerm(
      `${scene.objective} ${scene.action}`,
      String.raw`cướp (?:toàn bộ )?(?:trang bị|vũ khí|chiến lợi phẩm|đồ đạc) (?:của )?(?:chúng|địch|đối phương)|thu gom (?:toàn bộ )?(?:trang bị|vũ khí|chiến lợi phẩm)|giữ lại (?:mọi|những|các) (?:trang bị|vũ khí|chiến lợi phẩm|thứ có giá trị)`,
    );
    const trackedLoot = sceneDeltas.some(delta => delta.kind === 'resource_numeric'
      && delta.delta > 0
      && hasVietnameseTerm(`${delta.source ?? ''} ${delta.sink ?? ''}`, String.raw`cướp|thu gom|chiến lợi phẩm|tịch thu`));
    if (broadAcquisition && !trackedLoot) {
      fail(`Scene ${scene.id} claims a broad durable acquisition without a matching resource delta.`, {
        objective: scene.objective,
        action: scene.action,
        instruction: 'Narrow the scene to the exact tracked item/state delta, or add a positive numeric resource delta for the aggregate loot. Do not invite Writer to keep untracked weapons or gear.',
      });
    }
    const realizedAction = stripNonActionAssetPhrases(
      stripProhibitedTransactions(stripReportedTransactions(stripFutureIntent(scene.action))),
    );
    const normalizedAction = semanticSlug(realizedAction);
    for (const delta of sceneDeltas) {
      if (delta.kind !== 'resource_numeric') continue;
      const definition = resourceDefinitions.get(delta.resourceId);
      if (!definition || definition.kind !== 'numeric' || !definition.ownerEntityId) continue;
      const labels = (ownerLabels.get(definition.ownerEntityId) ?? [definition.ownerEntityId])
        .map(semanticSlug)
        .filter(Boolean);
      const source = semanticSlug(delta.source ?? '');
      const sink = semanticSlug(delta.sink ?? '');
      const paymentVerbs = [['tra'], ['chi'], ['dua'], ['thanh', 'toan']];
      const receiptVerbs = [['nhan'], ['thu'], ['kiem']];
      // Action prose can contain several subjects ("Phan pays; Trương
      // receives") and is not a safe ownership ledger. Direction comes only
      // from exact structured source/sink provenance and mechanic ownership.
      const ownerPaysInProvenance = ownerPerformsTransfer(source, labels, paymentVerbs, false)
        || ownerPerformsTransfer(sink, labels, paymentVerbs, false);
      const ownerReceivesInProvenance = ownerPerformsTransfer(source, labels, receiptVerbs, false)
        || ownerPerformsTransfer(sink, labels, receiptVerbs, false);
      if (delta.delta > 0 && ownerPaysInProvenance) {
        fail(`Resource ${delta.resourceId} increases even though its owner pays it out.`, {
          ownerEntityId: definition.ownerEntityId,
          action: scene.action,
          source: delta.source,
          delta: delta.delta,
        });
      }
      if (delta.delta < 0 && ownerReceivesInProvenance) {
        fail(`Resource ${delta.resourceId} decreases even though its owner receives it.`, {
          ownerEntityId: definition.ownerEntityId,
          action: scene.action,
          sink: delta.sink,
          delta: delta.delta,
        });
      }
    }
    // The ledger tracks the story resource's net balance, not which character
    // is physically holding it. "Nhận tiền" by itself can therefore be an
    // internal hand-off with no balance change. External acquisition/payment
    // remains covered by the unambiguous transaction verbs below.
    const transactionEvidence = [
      realizedAction,
      ...sceneDeltas.flatMap(delta => (
        delta.kind !== 'resource_numeric' && 'source' in delta && typeof delta.source === 'string'
          ? [stripReportedTransactions(stripFutureIntent(delta.source))]
          : []
      )),
    ].join(' ');
    const explicitMaterialSettlement = hasVietnameseTerm(
      transactionEvidence,
      String.raw`giao nộp (?:tiền|vàng|tài sản|bồi thường)|(?:trả|nộp) (?:tiền|vàng|tài sản )?bồi thường|bồi thường (?:bằng )?(?:tiền|vàng|tài sản)`,
    );
    const materialGainDelta = sceneDeltas.some(delta => (
      (delta.kind === 'resource_numeric' && delta.delta > 0)
      || delta.kind === 'resource_state'
    ));
    if (explicitMaterialSettlement && !materialGainDelta) {
      fail(`Scene ${scene.id} completes material compensation but carries no positive resource delta.`, {
        action: scene.action,
        deltaSources: sceneDeltas.flatMap(delta => (
          'source' in delta && typeof delta.source === 'string' ? [delta.source] : []
        )),
      });
    }
    // Free-form action text is not a transaction ledger. Bare mentions of
    // buying/selling can be reports, negotiations, or counting proceeds already
    // committed in an earlier scene. Only an explicit present settlement is a
    // defensive contradiction here; exact movement remains owned by structured
    // resource deltas and mechanics.
    if (hasVietnameseTerm(transactionEvidence, String.raw`trả tiền|chi tiền|thanh toán|lấy tiền|chia (?:một )?(?:phần )?lợi nhuận|chia tiền lãi|trích (?:phần trăm|lợi nhuận)|trả công`)
      && !sceneDeltas.some(delta => delta.kind === 'resource_numeric')) {
      advisory({
        chapterNumber: plan.chapterNumber,
        sceneId: scene.id,
        observation: `Scene ${scene.id} uses settlement wording but carries no numeric resource delta.`,
        question: 'Trong cảnh này tiền hoặc hàng có thật sự đổi chủ ngay không? Nếu có, plan thiếu resource delta và phải bị trả lại. Nếu đây chỉ là tường thuật, thương lượng, hoặc nghĩa vụ tương lai thì plan đang đúng.',
        evidence: {
          action: scene.action,
          deltaSources: sceneDeltas.flatMap(delta => (
            'source' in delta && typeof delta.source === 'string' ? [delta.source] : []
          )),
        },
      });
    }
    if (describesCompletedDurableAsset(realizedAction)
      && !sceneDeltas.some(delta => delta.kind === 'resource_numeric' || delta.kind === 'resource_state' || delta.kind === 'fact')) {
      advisory({
        chapterNumber: plan.chapterNumber,
        sceneId: scene.id,
        observation: `Scene ${scene.id} uses completion wording for a durable asset but carries no state delta.`,
        question: 'Cảnh này có thật sự hoàn tất một tài sản bền vững không? Nếu có, plan thiếu delta ghi nhận nó. Nếu cảnh chỉ bắt đầu, thuyết phục, hoặc dự định chế tạo thì plan đang đúng.',
        evidence: { action: scene.action },
      });
    }
  }
  validateRouteEfficiency(kernel, state, plan);
  const orphaned = [...deltaIds].filter(id => !referenced.has(id));
  if (orphaned.length) fail(`Chapter ${plan.chapterNumber} has deltas not assigned to a scene.`, orphaned);
  const unusedLocationDeltas = plan.requiredDeltas.filter(
    (delta): delta is Extract<StateDelta, { kind: 'location' }> => (
      delta.kind === 'location' && !movementDeltaIds.has(delta.id)
    ),
  );
  if (unusedLocationDeltas.length) {
    fail(`Chapter ${plan.chapterNumber} has location deltas not tied to their exact scene movement.`, {
      locationDeltaIds: unusedLocationDeltas.map(delta => delta.id),
    });
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9;
}

// Story quantities are authored at >= 0.01 granularity, but chained deltas
// accumulate IEEE754 dust (a lãnh-chúa canary parked twice on 0.2 !== 0.2).
// Every numeric comparison in this file must go through an epsilon.
const EPSILON = 1e-9;

function valuesEqual(left: string | number | null | undefined, right: string | number | null | undefined): boolean {
  if (typeof left === 'number' && typeof right === 'number') return nearlyEqual(left, right);
  return left === right;
}

/**
 * Validate causal mechanics without asking a model to infer arithmetic or
 * authority from prose. This runs before the Plan Judge and is intentionally
 * strict: an ambiguous causal plan is not a valid plan.
 */
export function validateCausalMechanics(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
}): void {
  const { kernel, state, plan } = input;
  const mechanics = new Map(kernel.worldMechanics.map(item => [item.id, item]));
  const scenes = new Map(plan.scenes.map(item => [item.id, item]));
  const deltas = new Map(plan.requiredDeltas.map(item => [item.id, item]));
  const stateFacts = new Map(state.facts.map(item => [item.id, item.value]));
  const simulatedResources = new Map(state.resources.map(item => [item.resourceId, item.value]));
  const resourceDefinitions = new Map(kernel.resources.map(item => [item.id, item]));
  const effectDeltaIds = new Set<string>();
  const externalOutflowDeltaIds = new Set<string>();
  const declaredEffectDeltaIds = new Set(plan.mechanicUses
    .filter(use => use.role === 'effect')
    .flatMap(use => use.deltaIds));
  const issues: Array<{
    mechanicUseId: string | null;
    message: string;
    evidence: unknown;
  }> = [];
  unique(plan.mechanicUses.map(item => item.id), `Chapter ${plan.chapterNumber} mechanic uses`);
  for (const use of plan.mechanicUses.filter(item => !scenes.has(item.sceneId))) {
    issues.push({
      mechanicUseId: use.id,
      message: `Mechanic use ${use.id} references unknown scene ${use.sceneId}.`,
      evidence: null,
    });
  }

  for (const scene of plan.scenes) {
    // Support mechanics describe prerequisites for the scene's causal effects.
    // They must therefore be checked against the scene-opening state, even when
    // the model serializes the support use after the effect that consumes the
    // prerequisite. Effect mechanics still use the live simulated ledger so
    // chained production/consumption remains strictly sequential.
    const sceneOpeningFacts = new Map(stateFacts);
    const sceneOpeningResources = new Map(simulatedResources);
    for (const use of plan.mechanicUses.filter(item => item.sceneId === scene.id)) {
    try {
    const mechanic = mechanics.get(use.mechanicId);
    const referencedScene = scenes.get(use.sceneId);
    if (!mechanic) fail(`Mechanic use ${use.id} references unknown mechanic ${use.mechanicId}.`);
    if (!referencedScene) fail(`Mechanic use ${use.id} references unknown scene ${use.sceneId}.`);
    if (!referencedScene.participantIds.includes(use.actorId)) {
      fail(`Mechanic use ${use.id} actor ${use.actorId} is not present in scene ${referencedScene.id}.`);
    }
    for (const deltaId of use.deltaIds) {
      if (!deltas.has(deltaId)) fail(`Mechanic use ${use.id} references unknown delta ${deltaId}.`);
      if (!referencedScene.requiredDeltaIds.includes(deltaId)) {
        fail(`Mechanic use ${use.id} references delta ${deltaId} outside scene ${referencedScene.id}.`);
      }
      if (use.role === 'effect') {
        if (effectDeltaIds.has(deltaId)) fail(`Delta ${deltaId} has more than one effect mechanic.`);
        effectDeltaIds.add(deltaId);
      }
    }

    const suppliedFacts = new Set(use.preconditionFactIds);
    for (const factId of suppliedFacts) {
      if (!stateFacts.has(factId)) fail(`Mechanic use ${use.id} cites missing fact ${factId}.`);
    }

    if (mechanic.kind === 'conversion') {
      if (use.role !== 'effect') fail(`Conversion ${use.id} must be an effect mechanic.`);
      if (mechanic.maximumBatchesPerUse !== null && use.quantity > mechanic.maximumBatchesPerUse) {
        fail(`Mechanic use ${use.id} exceeds the conversion batch limit.`, {
          planned: use.quantity,
          maximum: mechanic.maximumBatchesPerUse,
        });
      }
      const inputs = new Map<string, number>();
      const outputs = new Map<string, number>();
      mechanic.inputsPerBatch.forEach(item => {
        inputs.set(item.resourceId, (inputs.get(item.resourceId) ?? 0) + item.amount * use.quantity);
      });
      mechanic.outputsPerBatch.forEach(item => {
        outputs.set(item.resourceId, (outputs.get(item.resourceId) ?? 0) + item.amount * use.quantity);
      });
      const expected = new Map<string, number>();
      for (const resourceId of new Set([...inputs.keys(), ...outputs.keys()])) {
        const consumed = inputs.get(resourceId) ?? 0;
        const rawProduced = outputs.get(resourceId) ?? 0;
        const definition = resourceDefinitions.get(resourceId);
        const current = simulatedResources.get(resourceId);
        // Regeneration/refresh conversions saturate at the resource ceiling.
        // A full night can restore Phan by 50 and Minh by only 10 when Minh is
        // already at 90/100; forcing both outputs to +50 made a correct capped
        // ledger buy an unnecessary Planner repair. Inputs remain fully paid.
        const produced = definition?.kind === 'numeric'
          && definition.maximum !== undefined
          && typeof current === 'number'
          ? Math.min(rawProduced, Math.max(0, definition.maximum - (current - consumed)))
          : rawProduced;
        expected.set(resourceId, -consumed + produced);
      }
      const actual = new Map<string, number>();
      for (const deltaId of use.deltaIds) {
        const delta = deltas.get(deltaId)!;
        if (delta.kind !== 'resource_numeric') {
          fail(`Conversion ${use.id} can only claim numeric resource deltas.`, deltaId);
        }
        actual.set(delta.resourceId, (actual.get(delta.resourceId) ?? 0) + delta.delta);
      }
      const allResources = new Set([...expected.keys(), ...actual.keys()]);
      for (const resourceId of allResources) {
        if (!nearlyEqual(expected.get(resourceId) ?? 0, actual.get(resourceId) ?? 0)) {
          fail(`Conversion ${use.id} has an invalid ${resourceId} balance.`, {
            expected: expected.get(resourceId) ?? 0,
            actual: actual.get(resourceId) ?? 0,
          });
        }
      }
    } else if (mechanic.kind === 'capability') {
      if (mechanic.allowedActorIds.length && !mechanic.allowedActorIds.includes(use.actorId)) {
        fail(`Actor ${use.actorId} lacks capability ${mechanic.id}.`);
      }
      for (const condition of mechanic.requiredFacts) {
        if (!suppliedFacts.has(condition.factId)) {
          fail(`Capability ${mechanic.id} does not cite required fact ${condition.factId}.`);
        }
        const actual = (use.role === 'support' ? sceneOpeningFacts : stateFacts).get(condition.factId);
        if (!preconditionMatches(actual, condition.expected)) {
          fail(`Capability ${mechanic.id} has a false required fact ${condition.factId}.`, {
            expected: condition.expected,
            actual,
          });
        }
      }
      for (const resourceId of mechanic.requiredResourceIds) {
        const currentValue = (use.role === 'support' ? sceneOpeningResources : simulatedResources).get(resourceId);
        if (currentValue === undefined
          || (typeof currentValue === 'number' && currentValue <= EPSILON)
          || (typeof currentValue === 'string' && currentValue.trim().length === 0)) {
          fail(`Capability ${mechanic.id} lacks usable resource ${resourceId}.`, {
            resourceId,
            currentValue: currentValue ?? null,
            repairRule: 'Schedule this capability after an earlier causal effect in the same/prior scene or after a prior committed chapter makes the resource usable; otherwise remove the capability use.',
          });
        }
      }
      if (mechanic.maximumUnitsPerMinute !== null) {
        const availableMinutes = scene.durationMinutes
          + (use.role === 'support' ? scene.travelMinutesFromPrevious : 0);
        const maximum = mechanic.maximumUnitsPerMinute * availableMinutes;
        if (use.quantity > maximum) {
          fail(`Mechanic use ${use.id} exceeds scene capacity.`, {
            planned: use.quantity,
            maximum,
            availableMinutes,
            durationMinutes: scene.durationMinutes,
            travelMinutes: use.role === 'support' ? scene.travelMinutesFromPrevious : 0,
          });
        }
      }
      if (use.role === 'effect') {
        for (const deltaId of use.deltaIds) {
          const delta = deltas.get(deltaId)!;
          if (delta.kind === 'resource_numeric' || delta.kind === 'resource_state') {
            const resourceEffects = mechanic.effectResources.filter(effect => effect.resourceId === delta.resourceId);
            if (!resourceEffects.length) {
              fail(`Capability ${mechanic.id} cannot affect resource ${delta.resourceId}.`, {
                allowedResourceIds: mechanic.effectResources.map(effect => effect.resourceId),
              });
            }
            if (delta.kind === 'resource_state' && !resourceEffects.some(effect => effect.direction === 'state_change')) {
              fail(`Capability ${mechanic.id} declares the wrong effect direction for state resource ${delta.resourceId}.`, {
                declared: resourceEffects.map(effect => effect.direction),
                required: 'state_change',
              });
            }
            if (delta.kind === 'resource_numeric') {
              const requiredDirection = delta.delta > 0 ? 'increase' : 'decrease';
              if (!resourceEffects.some(effect => effect.direction === requiredDirection)) {
                fail(`Capability ${mechanic.id} cannot ${requiredDirection} resource ${delta.resourceId}.`, {
                  declared: resourceEffects.map(effect => effect.direction),
                  delta: delta.delta,
                });
              }
            }
          }
          if (delta.kind === 'fact' && !mechanic.effectFactIds.includes(delta.factId)) {
            fail(`Capability ${mechanic.id} cannot affect fact ${delta.factId}.`, {
              allowedFactIds: mechanic.effectFactIds,
            });
          }
          if (!['resource_numeric', 'resource_state', 'fact'].includes(delta.kind)) {
            fail(`Capability ${mechanic.id} cannot own ${delta.kind} delta ${delta.id}.`);
          }
        }
      }
    } else {
      if (use.role !== 'support') fail(`Constraint ${use.id} must be a support mechanic.`);
      for (const condition of mechanic.requiredFacts) {
        if (!suppliedFacts.has(condition.factId)
          || !preconditionMatches(stateFacts.get(condition.factId), condition.expected)) {
          fail(`Constraint ${mechanic.id} lacks required fact ${condition.factId}.`);
        }
      }
      const violated = mechanic.forbiddenFacts.filter(condition =>
        preconditionMatches(stateFacts.get(condition.factId), condition.expected));
      if (violated.length) fail(`Constraint ${mechanic.id} is blocked by forbidden facts.`, violated);
    }

    if (use.role === 'effect') {
      const orderedOwnedDeltas = plan.requiredDeltas.filter(delta => use.deltaIds.includes(delta.id));
      for (const delta of orderedOwnedDeltas) {
        if (delta.kind === 'fact') {
          const actual = stateFacts.get(delta.factId) ?? null;
          if (!valuesEqual(actual, delta.before)) {
            fail(`Effect ${use.id} fact ${delta.factId} starts from the wrong value.`, {
              expected: delta.before,
              actual,
            });
          }
          stateFacts.set(delta.factId, delta.after);
        } else if (delta.kind === 'resource_numeric') {
          const actual = simulatedResources.get(delta.resourceId);
          if (!valuesEqual(actual, delta.before)) {
            fail(`Effect ${use.id} resource ${delta.resourceId} starts from the wrong value.`, {
              expected: delta.before,
              actual,
            });
          }
          simulatedResources.set(delta.resourceId, delta.after);
        } else if (delta.kind === 'resource_state') {
          const actual = simulatedResources.get(delta.resourceId);
          if (actual !== delta.before) {
            fail(`Effect ${use.id} state resource ${delta.resourceId} starts from the wrong value.`, {
              expected: delta.before,
              actual,
            });
          }
          simulatedResources.set(delta.resourceId, delta.after);
        }
      }
    }
    } catch (error) {
      if (!(error instanceof StoryFactoryError) || error.code !== 'plan_blocked') throw error;
      issues.push({
        mechanicUseId: use.id,
        message: error.message,
        evidence: error.evidence ?? null,
      });
    }
    }
    for (const deltaId of scene.requiredDeltaIds) {
      const delta = deltas.get(deltaId);
      if (!delta || delta.kind !== 'fact' || declaredEffectDeltaIds.has(deltaId)) continue;
      const actual = stateFacts.get(delta.factId) ?? null;
      if (actual !== delta.before) {
        issues.push({
          mechanicUseId: null,
          message: `Scene ${scene.id} external fact ${delta.factId} starts from the wrong value.`,
          evidence: { expected: delta.before, actual },
        });
        continue;
      }
      stateFacts.set(delta.factId, delta.after);
    }
    // Paying an external party or consuming an owned stock is a sink, not a
    // world conversion. Requiring a fake capability for every debt payment,
    // fee, or profit distribution made plans less truthful. This narrow
    // exception only permits an existing numeric resource to decrease when its
    // exact owner is physically present and an explicit non-mechanic sink is
    // recorded. Increases and state changes still require a causal mechanic.
    for (const delta of plan.requiredDeltas.filter(item => scene.requiredDeltaIds.includes(item.id))) {
      if (delta.kind !== 'resource_numeric' || delta.delta >= 0 || effectDeltaIds.has(delta.id)) continue;
      const definition = resourceDefinitions.get(delta.resourceId);
      if (!definition || definition.kind !== 'numeric' || !definition.ownerEntityId) continue;
      const sink = delta.sink?.trim();
      if (!sink || mechanics.has(sink)) continue;
      if (!scene.participantIds.includes(definition.ownerEntityId)) continue;
      const actual = simulatedResources.get(delta.resourceId);
      if (actual !== delta.before) {
        issues.push({
          mechanicUseId: null,
          message: `Scene ${scene.id} external outflow ${delta.id} starts from the wrong value.`,
          evidence: { expected: delta.before, actual },
        });
        continue;
      }
      const calculated = delta.before + delta.delta;
      if (!nearlyEqual(calculated, delta.after)) {
        issues.push({
          mechanicUseId: null,
          message: `Scene ${scene.id} external outflow ${delta.id} has invalid arithmetic.`,
          evidence: { calculated, declared: delta.after },
        });
        continue;
      }
      if (definition.minimum !== undefined && calculated < definition.minimum - EPSILON) {
        issues.push({
          mechanicUseId: null,
          message: `Scene ${scene.id} external outflow ${delta.id} falls below its minimum.`,
          evidence: { minimum: definition.minimum, calculated },
        });
        continue;
      }
      if (definition.maximum !== undefined && calculated > definition.maximum + EPSILON) {
        issues.push({
          mechanicUseId: null,
          message: `Scene ${scene.id} external outflow ${delta.id} exceeds its maximum.`,
          evidence: { maximum: definition.maximum, calculated },
        });
        continue;
      }
      simulatedResources.set(delta.resourceId, calculated);
      externalOutflowDeltaIds.add(delta.id);
    }
  }
  const ungroundedResourceDeltas = plan.requiredDeltas
    .filter(delta => delta.kind === 'resource_numeric' || delta.kind === 'resource_state')
    .filter(delta => !effectDeltaIds.has(delta.id) && !externalOutflowDeltaIds.has(delta.id));
  if (ungroundedResourceDeltas.length) {
    issues.push({
      mechanicUseId: null,
      message: `Chapter ${plan.chapterNumber} changes resources without a validated world mechanic.`,
      evidence: {
        unownedDeltas: ungroundedResourceDeltas.map(delta => ({
        deltaId: delta.id,
        resourceId: delta.resourceId,
        candidateMechanics: kernel.worldMechanics.reduce<Array<{
          mechanicId: string;
          kind: 'conversion' | 'capability';
        }>>((candidates, mechanic) => {
          if (mechanic.kind === 'conversion') {
            const resourceIds = [
              ...mechanic.inputsPerBatch,
              ...mechanic.outputsPerBatch,
            ].map(item => item.resourceId);
            if (resourceIds.includes(delta.resourceId)) {
              candidates.push({ mechanicId: mechanic.id, kind: mechanic.kind });
            }
          }
          if (mechanic.kind === 'capability'
            && mechanic.effectResources.some(effect => effect.resourceId === delta.resourceId)) {
            candidates.push({ mechanicId: mechanic.id, kind: mechanic.kind });
          }
          return candidates;
        }, []),
        })),
        repairRule: 'Positive numeric deltas and all state-resource changes need exactly one active conversion/capability effect owner. A negative numeric delta may omit a mechanic only for an external payment or consumption with an explicit non-mechanic sink while the exact resource owner is present in that scene. Conversion inputs still belong to their conversion. Otherwise remove the delta or represent a genuinely social change with an existing fact, relationship, or promise ID. Never invent a mechanic inside the plan.',
      },
    });
  }
  if (issues.length) {
    const first = issues[0];
    throw new StoryFactoryError(
      'plan_blocked',
      issues.length === 1 ? first.message : `Chapter ${plan.chapterNumber} has ${issues.length} causal validation issues.`,
      { issues },
    );
  }
}

function eventEntity(delta: StateDelta): string {
  if (delta.kind === 'fact') return delta.factId;
  if (delta.kind === 'knowledge' || delta.kind === 'location') return delta.characterId;
  if (delta.kind === 'relationship') return `${delta.characterId}:${delta.counterpartId}`;
  if (delta.kind === 'promise') return delta.promiseId;
  return delta.resourceId;
}

export function applyChapterPlan(input: {
  kernel: StoryKernel;
  state: StoryState;
  plan: ChapterPlan;
}): { state: StoryState; events: StateEvent[] } {
  const { kernel, plan } = input;
  let state: StoryState = structuredClone(input.state);
  validateKernelState(kernel, state);
  if (plan.chapterNumber !== state.chapterNumber + 1) {
    fail(`Expected chapter ${state.chapterNumber + 1}, received ${plan.chapterNumber}.`);
  }
  if (plan.storyTimeAfterMinutes < state.storyTimeMinutes) fail('Story time cannot move backwards.');
  const minimumElapsedMinutes = plan.scenes.reduce(
    (total, scene) => total + scene.durationMinutes + scene.travelMinutesFromPrevious,
    0,
  );
  if (plan.storyTimeAfterMinutes < state.storyTimeMinutes + minimumElapsedMinutes) {
    fail(`Chapter ${plan.chapterNumber} ends before its planned scenes can occur.`, {
      stateTime: state.storyTimeMinutes,
      minimumElapsedMinutes,
      plannedTime: plan.storyTimeAfterMinutes,
    });
  }
  checkPreconditions(state, plan);
  validateScenes(kernel, state, plan);
  validateCausalMechanics({ kernel, state, plan });
  if (narrativelyObservableDeltaIds(kernel, plan).size === 0) {
    fail(`Chapter ${plan.chapterNumber} changes only hidden world ledger state and has no reader-visible story delta.`);
  }

  const events: StateEvent[] = [];
  const encounterPairs = new Set<string>();
  for (const scene of plan.scenes) {
    const participants = [...new Set(scene.participantIds)].sort();
    for (let leftIndex = 0; leftIndex < participants.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < participants.length; rightIndex += 1) {
        encounterPairs.add(`${participants[leftIndex]}\u0000${participants[rightIndex]}`);
      }
    }
  }
  for (const pair of encounterPairs) {
    const [leftId, rightId] = pair.split('\u0000');
    const left = state.characters.find(character => character.characterId === leftId);
    const right = state.characters.find(character => character.characterId === rightId);
    if (!left || !right) fail(`Encounter references an unknown character pair ${leftId}:${rightId}.`);
    const alreadyEncountered = left.encounteredCharacterIds.includes(rightId)
      && right.encounteredCharacterIds.includes(leftId);
    if (alreadyEncountered) continue;
    if (!left.encounteredCharacterIds.includes(rightId)) left.encounteredCharacterIds.push(rightId);
    if (!right.encounteredCharacterIds.includes(leftId)) right.encounteredCharacterIds.push(leftId);
    events.push({
      chapterNumber: plan.chapterNumber,
      deltaId: `encounter_${plan.chapterNumber}_${leftId}_${rightId}`,
      kind: 'encounter',
      entityId: `${leftId}:${rightId}`,
      before: false,
      after: true,
      source: plan.scenes.find(scene =>
        scene.participantIds.includes(leftId) && scene.participantIds.includes(rightId))?.id ?? null,
      relatedEntityIds: [leftId, rightId],
    });
  }
  for (const delta of plan.requiredDeltas) {
    let before: unknown;
    let after: unknown;
    let source: string | null = null;
    if (delta.kind === 'fact') {
      const existing = state.facts.find(item => item.id === delta.factId);
      before = existing?.value ?? null;
      if (before !== delta.before) fail(`Fact ${delta.factId} before-value drifted.`, { expected: delta.before, actual: before });
      if (existing) existing.value = delta.after;
      else {
        if (state.facts.length >= 500) fail('StoryState fact snapshot is full; update an existing stable fact instead of growing state.');
        state.facts.push({ id: delta.factId, value: delta.after });
      }
      after = delta.after;
    } else if (delta.kind === 'resource_numeric') {
      const existing = state.resources.find(item => item.resourceId === delta.resourceId);
      const definition = kernel.resources.find(item => item.id === delta.resourceId);
      if (!existing || existing.kind !== 'numeric' || !definition || definition.kind !== 'numeric') fail(`Numeric resource ${delta.resourceId} is undefined.`);
      before = existing.value;
      if (!valuesEqual(existing.value, delta.before)) fail(`Resource ${delta.resourceId} before-value drifted.`, { expected: delta.before, actual: existing.value });
      const calculated = delta.before + delta.delta;
      if (Math.abs(calculated - delta.after) > 1e-9) fail(`Resource ${delta.resourceId} arithmetic is invalid.`, { calculated, declared: delta.after });
      if (definition.minimum !== undefined && calculated < definition.minimum - EPSILON) fail(`Resource ${delta.resourceId} falls below its minimum.`);
      if (definition.maximum !== undefined && calculated > definition.maximum + EPSILON) fail(`Resource ${delta.resourceId} exceeds its maximum.`);
      if (delta.delta > 0 && !delta.source) fail(`Positive resource delta ${delta.id} has no source.`);
      if (delta.delta < 0 && !delta.sink) fail(`Negative resource delta ${delta.id} has no sink.`);
      existing.value = calculated;
      after = calculated;
      source = delta.source ?? delta.sink;
    } else if (delta.kind === 'resource_state') {
      const existing = state.resources.find(item => item.resourceId === delta.resourceId);
      if (!existing || existing.kind !== 'state') fail(`State resource ${delta.resourceId} is undefined.`);
      before = existing.value;
      if (existing.value !== delta.before) fail(`State resource ${delta.resourceId} before-value drifted.`);
      existing.value = delta.after;
      after = delta.after;
      source = delta.source;
    } else if (delta.kind === 'knowledge') {
      const character = state.characters.find(item => item.characterId === delta.characterId);
      if (!character) fail(`Knowledge delta references unknown character ${delta.characterId}.`);
      if (!state.facts.some(item => item.id === delta.factId)) fail(`Knowledge delta references unknown fact ${delta.factId}.`);
      before = character.knownFactIds.includes(delta.factId);
      if (!before) {
        if (character.knownFactIds.length >= 500) fail(`Knowledge snapshot for ${delta.characterId} is full; reuse a stable fact.`);
        character.knownFactIds.push(delta.factId);
      }
      after = true;
      source = delta.source;
    } else if (delta.kind === 'location') {
      const character = state.characters.find(item => item.characterId === delta.characterId);
      if (!character) fail(`Location delta references unknown character ${delta.characterId}.`);
      before = character.locationId;
      if (before !== delta.beforeLocationId) fail(`Character ${delta.characterId} location drifted.`, { expected: delta.beforeLocationId, actual: before });
      character.locationId = delta.afterLocationId;
      after = delta.afterLocationId;
    } else if (delta.kind === 'promise') {
      const promise = state.promises.find(item => item.promiseId === delta.promiseId);
      if (!promise) fail(`Promise delta references unknown promise ${delta.promiseId}.`);
      before = promise.status;
      if (before !== delta.before) fail(`Promise ${delta.promiseId} status drifted.`, { expected: delta.before, actual: before });
      promise.status = delta.after;
      after = delta.after;
    } else {
      const character = state.characters.find(item => item.characterId === delta.characterId);
      if (!character || !state.characters.some(item => item.characterId === delta.counterpartId)) {
        fail(`Relationship delta references an unknown character pair ${delta.characterId}:${delta.counterpartId}.`);
      }
      before = character.relationshipState[delta.counterpartId] ?? null;
      if (before !== delta.before) {
        fail(`Relationship ${delta.characterId}:${delta.counterpartId} before-value drifted.`, {
          expected: delta.before,
          actual: before,
        });
      }
      character.relationshipState[delta.counterpartId] = delta.after;
      after = delta.after;
      source = delta.source;
    }
    events.push({
      chapterNumber: plan.chapterNumber,
      deltaId: delta.id,
      kind: delta.kind,
      entityId: eventEntity(delta),
      before,
      after,
      source,
      relatedEntityIds: delta.kind === 'relationship'
        ? [delta.characterId, delta.counterpartId]
        : [eventEntity(delta)],
    });
  }
  state.chapterNumber = plan.chapterNumber;
  state.storyTimeMinutes = plan.storyTimeAfterMinutes;
  validateKernelState(kernel, state);
  return { state, events };
}

export function appendAcceptedOutcome(input: {
  state: StoryState;
  title: string;
  content: string;
  outcome: Omit<ChapterOutcome, 'chapterNumber' | 'title'>;
}): StoryState {
  const groundedEvidence = input.outcome.evidenceSpans.map(span => groundEvidenceSpan(input.content, span));
  if (groundedEvidence.some(span => span === null)) {
    const ungrounded = input.outcome.evidenceSpans.filter((_, index) => groundedEvidence[index] === null);
    throw new StoryFactoryError('infra_blocked', 'Editor outcome does not contain a sufficiently grounded prose anchor.', ungrounded);
  }
  const state = structuredClone(input.state);
  state.recentOutcomes = [
    ...state.recentOutcomes,
    {
      chapterNumber: state.chapterNumber,
      title: input.title,
      ...input.outcome,
      evidenceSpans: groundedEvidence as string[],
    },
  ].slice(-12);
  return state;
}

export function buildChapterOutcomeEvent(input: {
  plan: ChapterPlan;
  outcome: ChapterOutcome;
}): StateEvent {
  const relatedEntityIds = new Set<string>([
    ...input.plan.requiredWorldRuleIds,
    ...input.plan.mechanicUses.map(use => use.mechanicId),
    ...input.plan.scenes.flatMap(scene => [scene.locationId, ...scene.participantIds]),
  ]);
  for (const delta of input.plan.requiredDeltas) {
    if (delta.kind === 'fact') relatedEntityIds.add(delta.factId);
    else if (delta.kind === 'knowledge' || delta.kind === 'location') relatedEntityIds.add(delta.characterId);
    else if (delta.kind === 'relationship') {
      relatedEntityIds.add(delta.characterId);
      relatedEntityIds.add(delta.counterpartId);
    } else if (delta.kind === 'promise') relatedEntityIds.add(delta.promiseId);
    else relatedEntityIds.add(delta.resourceId);
  }
  return {
    chapterNumber: input.plan.chapterNumber,
    deltaId: `outcome_${input.plan.chapterNumber}`,
    kind: 'chapter_outcome',
    entityId: 'story',
    before: null,
    after: input.outcome,
    source: 'independent_editor',
    relatedEntityIds: [...relatedEntityIds],
  };
}

export function buildMechanicUseEvents(plan: ChapterPlan): StateEvent[] {
  return plan.mechanicUses.map(use => ({
    chapterNumber: plan.chapterNumber,
    deltaId: `mechanic_${plan.chapterNumber}_${use.id}`,
    kind: 'mechanic_use',
    entityId: use.mechanicId,
    before: null,
    after: {
      sceneId: use.sceneId,
      actorId: use.actorId,
      role: use.role,
      quantity: use.quantity,
      deltaIds: use.deltaIds,
    },
    source: 'causal_validator',
    relatedEntityIds: [
      use.mechanicId,
      use.actorId,
      ...use.preconditionFactIds,
      ...use.deltaIds,
    ],
  }));
}

/**
 * The active mechanic set is the Planner's working memory for one arc, and
 * planner latency grows with it: an arc that activated all 21 kernel mechanics
 * pushed a single plan call to ~10 minutes — past Vercel's 300s ceiling — while
 * fleet arcs with 3–10 active planned in 1–4 minutes. Enforced only where a new
 * arc is born (launch and arc lifecycle), never against running artifacts.
 */
export const ARC_ACTIVE_MECHANIC_BUDGET = 12;

export function validateArcActivationBudget(arc: Pick<ArcPlan, 'activeMechanicIds'>): void {
  if (arc.activeMechanicIds.length > ARC_ACTIVE_MECHANIC_BUDGET) {
    fail(
      `Arc activates ${arc.activeMechanicIds.length} mechanics; the planner working-set budget is ${ARC_ACTIVE_MECHANIC_BUDGET}. Chọn đúng các mechanic mà beat của arc này thật sự dùng — mechanic không chọn vẫn nằm trong kernel và arc sau kích hoạt lại được.`,
      { activeMechanicIds: arc.activeMechanicIds, budget: ARC_ACTIVE_MECHANIC_BUDGET },
    );
  }
}

export function validateArcAgainstKernel(kernel: StoryKernel, arc: ArcPlan): void {
  if (!kernel.seriesSpine.stages.some(stage => stage.id === arc.stageId)) {
    fail(`Arc references unknown series stage ${arc.stageId}.`);
  }
  const unknownArcReferences = [
    ...arc.activeCharacterIds.filter(id => !kernel.characters.some(item => item.id === id)),
    ...arc.activeLocationIds.filter(id => !kernel.locations.some(item => item.id === id)),
    ...arc.activeResourceIds.filter(id => !kernel.resources.some(item => item.id === id)),
    ...arc.activeWorldRuleIds.filter(id => !kernel.worldRules.some(item => item.id === id)),
    ...arc.activeMechanicIds.filter(id => !kernel.worldMechanics.some(item => item.id === id)),
    ...arc.duePromiseIds.filter(id => !kernel.promises.some(item => item.id === id)),
  ];
  if (unknownArcReferences.length) fail('Arc references unknown kernel IDs.', unknownArcReferences);
}

export function validateRollingPlan(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  rollingPlan: RollingPlan;
}): StoryState {
  if (input.rollingPlan.startChapter !== input.state.chapterNumber + 1) {
    fail('Rolling plan does not begin at the next uncommitted chapter.');
  }
  validateArcAgainstKernel(input.kernel, input.arc);
  validateArcResourceReachability({
    kernel: input.kernel,
    arc: input.arc,
    state: input.state,
  });
  let state = structuredClone(input.state);
  input.rollingPlan.plans.forEach((plan, index) => {
    if (plan.chapterNumber !== input.rollingPlan.startChapter + index) fail('Rolling plan chapter numbers are not contiguous.');
    if (plan.arcNumber !== input.arc.arcNumber) fail(`Chapter ${plan.chapterNumber} belongs to the wrong arc.`);
    if (plan.chapterNumber < input.arc.startChapter || plan.chapterNumber > input.arc.plannedEndChapter) {
      fail(`Chapter ${plan.chapterNumber} lies outside the current arc.`);
    }
    state = applyChapterPlan({ kernel: input.kernel, state, plan }).state;
  });
  return state;
}
