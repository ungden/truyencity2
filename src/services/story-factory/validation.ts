import {
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

export const CAUSAL_VALIDATOR_VERSION = 'story-factory-causal-validator-14-directed-shortest-travel';

export interface StateEvent {
  chapterNumber: number;
  deltaId: string;
  kind: StateDelta['kind'] | 'chapter_outcome' | 'mechanic_use';
  entityId: string;
  before: unknown;
  after: unknown;
  source: string | null;
  relatedEntityIds: string[];
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
        for (const resourceId of mechanic.effectResourceIds) {
          if (!resourceIds.has(resourceId)) fail(`Mechanic ${mechanic.id} affects unknown resource ${resourceId}.`);
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
    for (const counterpartId of Object.keys(character.relationshipState)) {
      if (!characterIds.has(counterpartId)) fail(`Relationship state references unknown character ${counterpartId}.`);
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
    fail('Kernel travel graph must let the protagonist reach every declared location and return.', {
      protagonistLocation,
      unreachable,
      noReturn,
    });
  }
}

/**
 * Prove that the current arc does not depend on a resource that can never
 * exist. A resource is reachable when it is already present or is produced by
 * an active conversion whose own inputs are reachable. This deliberately
 * models provenance, not quantity scheduling; exact balances remain the
 * rolling-plan validator's responsibility.
 */
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
        for (const resourceId of mechanic.effectResourceIds) {
          if (reachable.has(resourceId)) continue;
          reachable.add(resourceId);
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
      mechanic.effectResourceIds.forEach(resourceId => required.add(resourceId));
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
      return Number.isFinite(numericString) && numberValue === numericString;
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

function travelMinimum(kernel: StoryKernel, from: string, to: string): number | null {
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
  const intent = String.raw`(?:cần|sẽ|định|dự\s+định|tính|muốn|chưa|không|đi|hứa(?:\s+sẽ)?|dự\s+kiến|sắp|quyết\s+định|trước\s+khi|phân\s+tích\s+việc|xem\s+xét\s+việc|lên\s+kế\s+hoạch(?:\s+để)?|đồng\s+ý|chấp\s+nhận|thống\s+nhất|thỏa\s+thuận|thoả\s+thuận)`;
  const filler = String.raw`(?:[\p{L}\p{N}_-]+\s+){0,12}`;
  const verbs = String.raw`(?:mua|bán|thu\s+mua|trả\s+tiền|chi\s+tiền|thu\s+tiền|nhận\s+tiền|kiếm\s+tiền|chế\s+tạo|đóng\s+thành|xây\s+dựng|lắp\s+ráp|thu\s+gom|nhận\s+được)`;
  const left = String.raw`(?<![\p{L}\p{N}_-])`;
  const right = String.raw`(?=$|[^\p{L}\p{N}_-])`;
  return action.replace(new RegExp(String.raw`${left}${intent}\s+${filler}${verbs}${right}`, 'giu'), '');
}

function hasVietnameseTerm(action: string, terms: string): boolean {
  return new RegExp(String.raw`(?<![\p{L}\p{N}_-])(?:${terms})(?=$|[^\p{L}\p{N}_-])`, 'iu').test(action);
}

function validateScenes(kernel: StoryKernel, state: StoryState, plan: ChapterPlan): void {
  const characterIds = new Set(kernel.characters.map(item => item.id));
  const locationIds = new Set(kernel.locations.map(item => item.id));
  const worldRuleIds = new Set(kernel.worldRules.map(item => item.id));
  const deltaIds = new Set(plan.requiredDeltas.map(item => item.id));
  unique(plan.scenes.map(item => item.id), `Chapter ${plan.chapterNumber} scenes`);
  unique(plan.requiredDeltas.map(item => item.id), `Chapter ${plan.chapterNumber} deltas`);
  unique(plan.requiredWorldRuleIds, `Chapter ${plan.chapterNumber} world rules`);
  for (const ruleId of plan.requiredWorldRuleIds) {
    if (!worldRuleIds.has(ruleId)) fail(`Chapter ${plan.chapterNumber} references unknown world rule ${ruleId}.`);
  }
  const referenced = new Set<string>();
  const startingLocations = new Map(state.characters.map(item => [item.characterId, item.locationId]));
  const locations = new Map(startingLocations);
  for (const scene of plan.scenes) {
    if (!characterIds.has(scene.povCharacterId)) fail(`Scene ${scene.id} has unknown POV ${scene.povCharacterId}.`);
    if (!scene.participantIds.includes(scene.povCharacterId)) fail(`Scene ${scene.id} POV is not a participant.`);
    if (!locationIds.has(scene.locationId)) fail(`Scene ${scene.id} has unknown location ${scene.locationId}.`);
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
      }
      locations.set(participantId, scene.locationId);
    }
    for (const deltaId of scene.requiredDeltaIds) {
      if (!deltaIds.has(deltaId)) fail(`Scene ${scene.id} references unknown delta ${deltaId}.`);
      referenced.add(deltaId);
    }
    const sceneDeltas = scene.requiredDeltaIds.map(deltaId => plan.requiredDeltas.find(delta => delta.id === deltaId)!);
    const realizedAction = stripFutureIntent(scene.action);
    if (hasVietnameseTerm(realizedAction, String.raw`mua|bán|thu mua|trả tiền|chi tiền|thu tiền|nhận tiền|kiếm tiền`)
      && !sceneDeltas.some(delta => delta.kind === 'resource_numeric')) {
      fail(`Scene ${scene.id} describes a transaction without a numeric resource delta.`, scene.action);
    }
    if (hasVietnameseTerm(realizedAction, String.raw`chế tạo|đóng thành|xây dựng|lắp ráp|thu gom|nhận được`)
      && !sceneDeltas.some(delta => delta.kind === 'resource_numeric' || delta.kind === 'resource_state' || delta.kind === 'fact')) {
      fail(`Scene ${scene.id} creates or acquires a durable asset without a state delta.`, scene.action);
    }
  }
  const orphaned = [...deltaIds].filter(id => !referenced.has(id));
  if (orphaned.length) fail(`Chapter ${plan.chapterNumber} has deltas not assigned to a scene.`, orphaned);
  for (const [characterId, afterLocationId] of locations) {
    const beforeLocationId = startingLocations.get(characterId);
    if (!beforeLocationId || beforeLocationId === afterLocationId) continue;
    const locationDeltas = plan.requiredDeltas.filter(
      (delta): delta is Extract<StateDelta, { kind: 'location' }> => delta.kind === 'location' && delta.characterId === characterId,
    );
    if (locationDeltas.length !== 1
      || locationDeltas[0].beforeLocationId !== beforeLocationId
      || locationDeltas[0].afterLocationId !== afterLocationId) {
      fail(`Chapter ${plan.chapterNumber} must commit the final location of ${characterId}.`, {
        beforeLocationId,
        afterLocationId,
      });
    }
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9;
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
  const effectDeltaIds = new Set<string>();
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
      const expected = new Map<string, number>();
      const addExpected = (resourceId: string, amount: number) => {
        expected.set(resourceId, (expected.get(resourceId) ?? 0) + amount);
      };
      mechanic.inputsPerBatch.forEach(item => addExpected(item.resourceId, -item.amount * use.quantity));
      mechanic.outputsPerBatch.forEach(item => addExpected(item.resourceId, item.amount * use.quantity));
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
          || (typeof currentValue === 'number' && currentValue <= 0)
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
          if ((delta.kind === 'resource_numeric' || delta.kind === 'resource_state')
            && !mechanic.effectResourceIds.includes(delta.resourceId)) {
            fail(`Capability ${mechanic.id} cannot affect resource ${delta.resourceId}.`, {
              allowedResourceIds: mechanic.effectResourceIds,
            });
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
          if (actual !== delta.before) {
            fail(`Effect ${use.id} fact ${delta.factId} starts from the wrong value.`, {
              expected: delta.before,
              actual,
            });
          }
          stateFacts.set(delta.factId, delta.after);
        } else if (delta.kind === 'resource_numeric') {
          const actual = simulatedResources.get(delta.resourceId);
          if (actual !== delta.before) {
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
  }
  const ungroundedResourceDeltas = plan.requiredDeltas
    .filter(delta => delta.kind === 'resource_numeric' || delta.kind === 'resource_state')
    .filter(delta => !effectDeltaIds.has(delta.id));
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
          if (mechanic.kind === 'capability' && mechanic.effectResourceIds.includes(delta.resourceId)) {
            candidates.push({ mechanicId: mechanic.id, kind: mechanic.kind });
          }
          return candidates;
        }, []),
        })),
        repairRule: 'Every resource delta needs exactly one active conversion/capability effect owner. If candidateMechanics is empty, remove that resource delta; represent a social or narrative change as an existing fact, relationship, or promise delta only when semantically correct. Never invent a mechanic inside the plan.',
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

  const events: StateEvent[] = [];
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
      if (existing.value !== delta.before) fail(`Resource ${delta.resourceId} before-value drifted.`, { expected: delta.before, actual: existing.value });
      const calculated = delta.before + delta.delta;
      if (Math.abs(calculated - delta.after) > 1e-9) fail(`Resource ${delta.resourceId} arithmetic is invalid.`, { calculated, declared: delta.after });
      if (definition.minimum !== undefined && calculated < definition.minimum) fail(`Resource ${delta.resourceId} falls below its minimum.`);
      if (definition.maximum !== undefined && calculated > definition.maximum) fail(`Resource ${delta.resourceId} exceeds its maximum.`);
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
