import {
  type ArcPlan,
  type ChapterOutcome,
  type ChapterPlan,
  type RollingPlan,
  type StateDelta,
  type StoryKernel,
  type StoryState,
  StoryFactoryError,
} from './contracts';

export interface StateEvent {
  chapterNumber: number;
  deltaId: string;
  kind: StateDelta['kind'];
  entityId: string;
  before: unknown;
  after: unknown;
  source: string | null;
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
  unique(kernel.locations.map(item => item.id), 'Kernel locations');
  unique(state.characters.map(item => item.characterId), 'State characters');
  unique(state.resources.map(item => item.resourceId), 'State resources');
  unique(state.promises.map(item => item.promiseId), 'State promises');
  unique(state.facts.map(item => item.id), 'State facts');

  const characterIds = new Set(kernel.characters.map(item => item.id));
  const resourceIds = new Set(kernel.resources.map(item => item.id));
  const promiseIds = new Set(kernel.promises.map(item => item.id));
  const locationIds = new Set(kernel.locations.map(item => item.id));
  for (const character of state.characters) {
    if (!characterIds.has(character.characterId)) fail(`State references unknown character ${character.characterId}.`);
    if (!locationIds.has(character.locationId)) fail(`State references unknown location ${character.locationId}.`);
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

function checkPreconditions(state: StoryState, plan: ChapterPlan): void {
  for (const condition of plan.preconditions) {
    let actual: string | number | undefined;
    if (condition.kind === 'fact') actual = state.facts.find(item => item.id === condition.entityId)?.value;
    if (condition.kind === 'resource') actual = state.resources.find(item => item.resourceId === condition.entityId)?.value;
    if (condition.kind === 'location') actual = state.characters.find(item => item.characterId === condition.entityId)?.locationId;
    if (condition.kind === 'promise') actual = state.promises.find(item => item.promiseId === condition.entityId)?.status;
    if (actual !== condition.expected) {
      fail(`Precondition ${condition.kind}:${condition.entityId} is false.`, { expected: condition.expected, actual });
    }
  }
}

function travelMinimum(kernel: StoryKernel, from: string, to: string): number | null {
  if (from === to) return 0;
  return kernel.travelRules.find(rule => rule.fromLocationId === from && rule.toLocationId === to)?.minimumMinutes ?? null;
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
    const realizedAction = scene.action.replace(
      /\b(?:cần|sẽ|định|dự định|tính|muốn|chưa|không|phân tích việc|xem xét việc|lên kế hoạch)\s+(?:mua|bán|thu mua|trả tiền|chi tiền|thu tiền|nhận tiền|kiếm tiền|chế tạo|đóng thành|xây dựng|lắp ráp|thu gom|nhận được)\b/giu,
      '',
    );
    if (/\b(?:mua|bán|thu mua|trả tiền|chi tiền|thu tiền|nhận tiền|kiếm tiền)\b/iu.test(realizedAction)
      && !sceneDeltas.some(delta => delta.kind === 'resource_numeric')) {
      fail(`Scene ${scene.id} describes a transaction without a numeric resource delta.`, scene.action);
    }
    if (/\b(?:chế tạo|đóng thành|xây dựng|lắp ráp|thu gom|nhận được)\b/iu.test(realizedAction)
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

function eventEntity(delta: StateDelta): string {
  if (delta.kind === 'fact') return delta.factId;
  if (delta.kind === 'knowledge' || delta.kind === 'location') return delta.characterId;
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
    } else {
      const promise = state.promises.find(item => item.promiseId === delta.promiseId);
      if (!promise) fail(`Promise delta references unknown promise ${delta.promiseId}.`);
      before = promise.status;
      if (before !== delta.before) fail(`Promise ${delta.promiseId} status drifted.`, { expected: delta.before, actual: before });
      promise.status = delta.after;
      after = delta.after;
    }
    events.push({
      chapterNumber: plan.chapterNumber,
      deltaId: delta.id,
      kind: delta.kind,
      entityId: eventEntity(delta),
      before,
      after,
      source,
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

export function validateRollingPlan(input: {
  kernel: StoryKernel;
  arc: ArcPlan;
  state: StoryState;
  rollingPlan: RollingPlan;
}): StoryState {
  if (input.rollingPlan.startChapter !== input.state.chapterNumber + 1) {
    fail('Rolling plan does not begin at the next uncommitted chapter.');
  }
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
