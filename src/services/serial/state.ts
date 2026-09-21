import {
  type AssetEvent, type AssetLot, type Bible, type ChapterDigest, type CyclePlan, type Premise, type SymbolicCore,
  BibleSchema, type PayoffKind,
} from './contracts';


/**
 * The whole machine-checked surface of the serial engine.
 *
 * Ten rules, chosen because a reader would notice each one being broken. Everything
 * else about the story — tone, world detail, who says what — is prose the models own.
 * The previous engine had 108 hard checks over resource arithmetic and a travel graph;
 * it never caught a reader-visible problem that these ten miss, and it blocked 46% of
 * plan runs catching things readers cannot see.
 */
export class SerialStateError extends Error {
  constructor(public readonly rule: string, message: string) {
    super(message);
    this.name = 'SerialStateError';
  }
}

const fail = (rule: string, message: string): never => { throw new SerialStateError(rule, message); };

export function progressionRankIndex(premise: Premise, systemId: string, rankId: string): number {
  const system = premise.worldKernel.progressionSystems.find(item => item.id === systemId);
  return system?.ranks.findIndex(rank => rank.id === rankId) ?? -1;
}

export function goldenFingerRungIndex(premise: Premise, rungId: string): number {
  return premise.goldenFinger.evolution.findIndex(rung => rung.id === rungId);
}

/** Catch stale editorial checkpoints before a planner or writer can spend on them. */
export function assertBibleCoherence(premise: Premise, bible: Bible): void {
  const rungIds = premise.goldenFinger.evolution.map(rung => rung.id);
  if (!rungIds.includes(bible.symbolicCore.mc.goldenFingerRungId)) {
    fail('unknown_golden_finger_rung', `Bible has unknown golden finger rung ${bible.symbolicCore.mc.goldenFingerRungId}.`);
  }
  for (const subject of premise.worldKernel.progressionSubjects.filter(item => item.kind === 'asset')) {
    for (const initial of subject.startingProgressions) {
      const system = premise.worldKernel.progressionSystems.find(item => item.id === initial.systemId);
      if (!system || system.ranks.map(rank => rank.id).join('|') !== rungIds.join('|')) continue;
      const state = bible.symbolicCore.progressions.find(item => item.subjectId === subject.id
        && item.systemId === initial.systemId && item.trackId === initial.trackId)
        ?? fail('missing_asset_progression', `${subject.id} has no ${initial.systemId} progression state.`);
      if (state.rankId !== bible.symbolicCore.mc.goldenFingerRungId) {
        fail('golden_finger_asset_mismatch',
          `${subject.id} is ${state.rankId}, but golden finger is ${bible.symbolicCore.mc.goldenFingerRungId}.`);
      }
    }
  }
  const lotIds = new Set<string>();
  for (const lot of bible.symbolicCore.activeAssetLots) {
    if (lotIds.has(lot.lotId)) fail('duplicate_asset_lot', `Asset lot ${lot.lotId} appears more than once.`);
    lotIds.add(lot.lotId);
    if (lot.updatedChapter > bible.symbolicCore.chapterNumber || lot.acquiredChapter > lot.updatedChapter) {
      fail('asset_lot_timeline', `Asset lot ${lot.lotId} has an impossible chapter timeline.`);
    }
  }
}

/**
 * Reject a commercially impossible customer loop before any chapter call is made.
 * The planner owns prose; this check only compares its declared transaction intent
 * with the durable inventory that the named customer actually owns.
 */
export function assertCycleAssetCoherence(
  bible: Bible,
  cycle: CyclePlan,
  atChapter = cycle.startChapter,
): void {
  const loop = cycle.customerLoop;
  if (!loop) return;
  const ownedAssetIds = new Set(bible.symbolicCore.activeAssetLots
    .filter(lot => lot.ownerId === loop.customerId)
    .map(lot => lot.assetId));

  if (atChapter <= loop.schedule.purchaseChapter
    && loop.purchaseMode === 'first_acquisition'
    && ownedAssetIds.has(loop.purchaseAssetId)) {
    fail(
      'customer_already_owns_purchase',
      `${loop.customerId} already owns ${loop.purchaseAssetId}; it cannot be sold again as a first acquisition.`,
    );
  }

  if (['higher_grade', 'new_capability'].includes(loop.returnUpgradeMode)) {
    if (loop.returnUpgradeAssetId === loop.purchaseAssetId) {
      fail(
        'customer_upgrade_repeats_purchase',
        `${loop.customerId}'s promised upgrade repeats ${loop.purchaseAssetId} instead of naming a distinct asset.`,
      );
    }
    if (atChapter <= loop.schedule.returnUpgradeChapter && ownedAssetIds.has(loop.returnUpgradeAssetId)) {
      fail(
        'customer_already_owns_upgrade',
        `${loop.customerId} already owns the promised upgrade ${loop.returnUpgradeAssetId}.`,
      );
    }
  }
}

const sameQuantity = (left: number, right: number): boolean => Math.abs(left - right) < 1e-9;

function applyAssetEvents(input: {
  chapterNumber: number;
  lots: AssetLot[];
  priorEvents: Bible['symbolicCore']['recentAssetEvents'];
  events: AssetEvent[];
}): { lots: AssetLot[]; recentEvents: Bible['symbolicCore']['recentAssetEvents'] } {
  const lots = new Map(input.lots.map(lot => [lot.lotId, { ...lot }]));
  const knownEventIds = new Set(input.priorEvents.map(event => event.eventId));
  const recorded = [...input.priorEvents];

  for (const event of input.events) {
    if (!event.eventId.startsWith(`c${input.chapterNumber}_`)) {
      fail('asset_event_id', `Asset event ${event.eventId} must start with c${input.chapterNumber}_.`);
    }
    if (knownEventIds.has(event.eventId) || lots.has(event.eventId)) {
      fail('asset_event_collision', `Asset event/lot id ${event.eventId} already exists.`);
    }
    knownEventIds.add(event.eventId);

    if (event.kind === 'acquire') {
      lots.set(event.eventId, {
        lotId: event.eventId,
        assetId: event.assetId,
        assetName: event.assetName,
        ownerId: event.toOwnerId!,
        ownerName: event.toOwnerName!,
        quantity: event.quantity,
        unit: event.unit,
        fungible: event.fungible,
        provenance: event.note,
        acquiredChapter: input.chapterNumber,
        updatedChapter: input.chapterNumber,
      });
    } else {
      const source = lots.get(event.sourceLotId!)
        ?? fail('asset_lot_unavailable', `Chapter ${input.chapterNumber} uses unavailable lot ${event.sourceLotId}.`);
      if (source.ownerId !== event.fromOwnerId) {
        fail('asset_owner_mismatch', `Lot ${source.lotId} belongs to ${source.ownerId}, not ${event.fromOwnerId}.`);
      }
      if (source.assetId !== event.assetId || source.unit !== event.unit || source.fungible !== event.fungible) {
        fail('asset_identity_mismatch', `Event ${event.eventId} does not match source lot ${source.lotId}.`);
      }
      if (event.quantity > source.quantity && !sameQuantity(event.quantity, source.quantity)) {
        fail('asset_overspend', `Event ${event.eventId} needs ${event.quantity} ${event.unit}; lot ${source.lotId} has ${source.quantity}.`);
      }
      const remaining = source.quantity - event.quantity;
      if (remaining <= 1e-9) lots.delete(source.lotId);
      else lots.set(source.lotId, { ...source, quantity: remaining, updatedChapter: input.chapterNumber });

      if (event.kind === 'transfer') {
        lots.set(event.eventId, {
          lotId: event.eventId,
          assetId: source.assetId,
          assetName: source.assetName,
          ownerId: event.toOwnerId!,
          ownerName: event.toOwnerName!,
          quantity: event.quantity,
          unit: source.unit,
          fungible: source.fungible,
          provenance: event.note,
          acquiredChapter: input.chapterNumber,
          updatedChapter: input.chapterNumber,
        });
      }
    }
    recorded.push({ ...event, chapterNumber: input.chapterNumber });
  }

  return { lots: [...lots.values()], recentEvents: recorded.slice(-120) };
}

export function rebuildBibleFromDigests(input: {
  premise: Premise;
  digests: ChapterDigest[];
  throughChapter?: number;
}): Bible {
  const through = input.throughChapter ?? Math.max(0, ...input.digests.map(item => item.chapterNumber));
  const byChapter = new Map(input.digests.map(digest => [digest.chapterNumber, digest]));
  let bible = seedBible({ premise: input.premise });
  for (let chapterNumber = 1; chapterNumber <= through; chapterNumber++) {
    const digest = byChapter.get(chapterNumber)
      ?? fail('missing_digest', `Cannot rebuild Bible: chapter ${chapterNumber} has no digest.`);
    bible = applyDigest({ premise: input.premise, bible, digest });
  }
  assertBibleCoherence(input.premise, bible);
  return bible;
}

/**
 * Deterministic merge of a chapter digest into the Bible. No model runs here: given the
 * same Bible and digest this returns the same Bible, which is what makes a rerun safe.
 */
export function applyDigest(input: {
  premise: Premise;
  bible: Bible;
  digest: ChapterDigest;
}): Bible {
  const { premise, bible, digest } = input;
  assertBibleCoherence(premise, bible);
  const core = bible.symbolicCore;

  // 1. Chapters land in order. A gap means a lost commit, not a story event.
  if (digest.chapterNumber !== core.chapterNumber + 1) {
    fail('chapter_sequence', `Digest is for chapter ${digest.chapterNumber}, Bible is at ${core.chapterNumber}.`);
  }

  const cast = new Map(core.cast.map(member => [member.id, { ...member }]));
  const sheets = new Map(bible.castSheet.map(entry => [entry.id, { ...entry }]));
  const locationIds = new Set(premise.worldKernel.worlds.flatMap(world => world.locations.map(location => location.id)));
  const systems = new Map(premise.worldKernel.progressionSystems.map(system => [system.id, system]));
  const canonicalWorldEntities = new Map(premise.worldKernel.worlds.flatMap(world => [
    { id: world.id, name: world.name },
    ...world.locations.map(location => ({ id: location.id, name: location.name })),
    ...world.factions.map(faction => ({ id: faction.id, name: faction.name })),
  ]).map(entity => [entity.id, entity]));
  const progressions = new Map(core.progressions.map(state => [
    `${state.subjectId}:${state.systemId}:${state.trackId ?? ''}`,
    { ...state },
  ]));
  const assetState = applyAssetEvents({
    chapterNumber: digest.chapterNumber,
    lots: core.activeAssetLots,
    priorEvents: core.recentAssetEvents,
    events: digest.coreChanges.assetEvents,
  });

  // 2. New cast arrives with a sheet, and cannot collide with a known id.
  for (const arrival of digest.coreChanges.newCast) {
    if (cast.has(arrival.id)) fail('cast_collision', `Chapter ${digest.chapterNumber} re-introduces existing character ${arrival.id}.`);
    if (!locationIds.has(arrival.locationId)) fail('unknown_location', `Chapter ${digest.chapterNumber} introduces ${arrival.id} at unknown location ${arrival.locationId}.`);
    cast.set(arrival.id, {
      id: arrival.id, alive: true, locationId: arrival.locationId,
      lastSeenChapter: digest.chapterNumber, knowsFinger: false,
    });
    sheets.set(arrival.id, { id: arrival.id, name: arrival.name, sheet: arrival.sheet });
    for (const state of arrival.startingProgressions) {
      const system = systems.get(state.systemId) ?? fail('unknown_progression_system', `Unknown progression system ${state.systemId}.`);
      if (!system.ranks.some(rank => rank.id === state.rankId)) fail('unknown_progression_rank', `Unknown rank ${state.rankId}.`);
      if (state.trackId && !system.tracks.some(track => track.id === state.trackId)) fail('unknown_progression_track', `Unknown track ${state.trackId}.`);
      if (state.minorStageId && !system.minorStages.some(stage => stage.id === state.minorStageId)) fail('unknown_minor_stage', `Unknown minor stage ${state.minorStageId}.`);
      progressions.set(`${arrival.id}:${state.systemId}:${state.trackId ?? ''}`, { subjectId: arrival.id, ...state });
    }
  }

  // 3. The dead stay dead. Killing someone already dead is a contradiction too.
  for (const deadId of digest.coreChanges.died) {
    const member = cast.get(deadId) ?? fail('unknown_character', `Chapter ${digest.chapterNumber} kills unknown character ${deadId}.`);
    if (!member.alive) fail('dead_stays_dead', `Character ${deadId} was already dead before chapter ${digest.chapterNumber}.`);
    member.alive = false;
    member.lastSeenChapter = digest.chapterNumber;
  }

  // 4. Each progression axis advances independently, using only canonical ids and one step at a time.
  const knownSubjects = new Set([
    ...cast.keys(),
    ...premise.worldKernel.progressionSubjects.map(subject => subject.id),
  ]);
  for (const change of digest.coreChanges.progressionChanges) {
    if (!knownSubjects.has(change.subjectId)) fail('unknown_progression_subject', `Chapter ${digest.chapterNumber} progresses unknown subject ${change.subjectId}.`);
    const member = cast.get(change.subjectId);
    if (member && !member.alive) fail('dead_stays_dead', `Chapter ${digest.chapterNumber} progresses dead character ${change.subjectId}.`);
    const system = systems.get(change.systemId) ?? fail('unknown_progression_system', `Unknown progression system ${change.systemId}.`);
    const nextRank = system.ranks.findIndex(rank => rank.id === change.toRankId);
    if (nextRank < 0) fail('unknown_progression_rank', `Rank ${change.toRankId} is not in ${change.systemId}.`);
    if (change.trackId && !system.tracks.some(track => track.id === change.trackId)) fail('unknown_progression_track', `Track ${change.trackId} is not in ${change.systemId}.`);
    const nextMinor = change.toMinorStageId ? system.minorStages.findIndex(stage => stage.id === change.toMinorStageId) : -1;
    if (change.toMinorStageId && nextMinor < 0) fail('unknown_minor_stage', `Minor stage ${change.toMinorStageId} is not in ${change.systemId}.`);
    const key = `${change.subjectId}:${change.systemId}:${change.trackId ?? ''}`;
    const previous = progressions.get(key);
    if (previous) {
      const previousRank = system.ranks.findIndex(rank => rank.id === previous.rankId);
      if (nextRank < previousRank) fail('progression_regression', `${change.subjectId} regresses in ${change.systemId}.`);
      if (nextRank > previousRank + 1) fail('progression_skip', `${change.subjectId} skips a rank in ${change.systemId}.`);
      if (nextRank === previousRank && system.minorStages.length > 0) {
        const previousMinor = previous.minorStageId ? system.minorStages.findIndex(stage => stage.id === previous.minorStageId) : -1;
        if (nextMinor < previousMinor) fail('progression_regression', `${change.subjectId} regresses a minor stage in ${change.systemId}.`);
        if (nextMinor > previousMinor + 1) fail('progression_skip', `${change.subjectId} skips a minor stage in ${change.systemId}.`);
      }
    } else {
      if (nextRank !== 0) fail('progression_skip', `${change.subjectId} must enter ${change.systemId} at its first rank.`);
      if (system.minorStages.length > 0 && nextMinor > 0) fail('progression_skip', `${change.subjectId} must enter ${change.systemId} at its first minor stage.`);
    }
    progressions.set(key, {
      subjectId: change.subjectId, systemId: change.systemId, trackId: change.trackId,
      rankId: change.toRankId, minorStageId: change.toMinorStageId,
    });
    if (member) member.lastSeenChapter = digest.chapterNumber;
  }

  let goldenFingerRungId = core.mc.goldenFingerRungId;
  if (digest.coreChanges.goldenFingerRungChange) {
    const previous = goldenFingerRungIndex(premise, goldenFingerRungId);
    const next = goldenFingerRungIndex(premise, digest.coreChanges.goldenFingerRungChange.toRungId);
    if (next < 0) fail('unknown_golden_finger_rung', `Unknown golden finger rung ${digest.coreChanges.goldenFingerRungChange.toRungId}.`);
    if (next < previous) fail('golden_finger_regression', 'Golden finger rung cannot regress.');
    if (next > previous + 1) fail('golden_finger_skip', 'Golden finger rung must advance sequentially.');
    goldenFingerRungId = digest.coreChanges.goldenFingerRungChange.toRungId;
  }

  // 5. The dead do not travel.
  for (const move of digest.coreChanges.moved) {
    const member = cast.get(move.characterId) ?? fail('unknown_character', `Chapter ${digest.chapterNumber} moves unknown character ${move.characterId}.`);
    if (!member.alive) fail('dead_stays_dead', `Chapter ${digest.chapterNumber} moves dead character ${move.characterId}.`);
    if (!locationIds.has(move.toLocationId)) fail('unknown_location', `Chapter ${digest.chapterNumber} moves ${move.characterId} to unknown location ${move.toLocationId}.`);
    member.locationId = move.toLocationId;
    member.lastSeenChapter = digest.chapterNumber;
  }

  const revealedWorld = new Map(bible.world.map(entry => [entry.id, { ...entry }]));
  for (const revealed of digest.coreChanges.worldFactsRevealed) {
    const entity = canonicalWorldEntities.get(revealed.id)
      ?? fail('unknown_world_entity', `Chapter ${digest.chapterNumber} reveals unknown world entity ${revealed.id}.`);
    revealedWorld.set(revealed.id, { id: revealed.id, name: entity.name, note: revealed.note });
  }

  // 6. Knowing the secret is one-way: a reveal cannot be un-revealed.
  for (const learnerId of digest.coreChanges.learnedFinger) {
    const member = cast.get(learnerId) ?? fail('unknown_character', `Chapter ${digest.chapterNumber} reveals the advantage to unknown character ${learnerId}.`);
    member.knowsFinger = true;
  }

  // 7. Hooks are paid only if they were planted, and only once.
  const hooks = core.openHooks.map(hook => ({ ...hook }));
  for (const planted of digest.coreChanges.hooksPlanted) {
    if (hooks.some(hook => hook.id === planted.id)) fail('hook_collision', `Hook ${planted.id} is already open.`);
    if (planted.dueByChapter <= digest.chapterNumber) {
      fail('hook_due_in_past', `Hook ${planted.id} is due at chapter ${planted.dueByChapter}, at or before the chapter that plants it.`);
    }
    hooks.push({ id: planted.id, what: planted.what, plantedChapter: digest.chapterNumber, dueByChapter: planted.dueByChapter, status: 'open' });
  }
  for (const paidId of digest.coreChanges.hooksPaid) {
    const hook = hooks.find(item => item.id === paidId) ?? fail('unknown_hook', `Chapter ${digest.chapterNumber} pays off unplanted hook ${paidId}.`);
    if (hook.status === 'paid') fail('hook_paid_twice', `Hook ${paidId} was already paid.`);
    hook.status = 'paid';
  }

  const mc = cast.get(premise.castSeed.find(member => member.role === 'protagonist')!.id);
  const foundation = premise.schemaVersion === 3 ? premise.narrativeFoundation : null;
  const factIds = new Set(foundation?.facts.map(fact => fact.id) ?? []);
  const milestoneIds = new Set(foundation?.milestones.map(milestone => milestone.id) ?? []);
  const revealedNarrativeIds = new Set([
    ...core.revealedNarrativeIds,
    ...core.narrativeEvidence.filter(item => factIds.has(item.id)).map(item => item.id),
  ]);
  const achievedNarrativeMilestoneIds = new Set([
    ...core.achievedNarrativeMilestoneIds,
    ...core.narrativeEvidence.filter(item => milestoneIds.has(item.id)).map(item => item.id),
  ]);
  const characterKnowledge = new Map(core.characterKnowledge.map(entry => [entry.characterId, new Set(entry.factIds)]));
  // Bible JSON written before durable knowledge snapshots defaults this array to
  // empty. Recover every learner still present in the legacy evidence window before
  // that window is truncated, otherwise an established information boundary is lost.
  for (const evidence of core.narrativeEvidence) {
    if (!factIds.has(evidence.id)) continue;
    for (const characterId of evidence.learnedByCharacterIds) {
      const known = characterKnowledge.get(characterId) ?? new Set<string>();
      known.add(evidence.id);
      characterKnowledge.set(characterId, known);
    }
  }
  for (const evidence of digest.narrativeEvidence) {
    if (factIds.has(evidence.id)) revealedNarrativeIds.add(evidence.id);
    if (milestoneIds.has(evidence.id)) achievedNarrativeMilestoneIds.add(evidence.id);
    for (const characterId of evidence.learnedByCharacterIds) {
      const known = characterKnowledge.get(characterId) ?? new Set<string>();
      if (factIds.has(evidence.id)) known.add(evidence.id);
      characterKnowledge.set(characterId, known);
    }
  }

  const symbolicCore: SymbolicCore = {
    // 8. Story time only ever moves forward.
    storyDay: core.storyDay + digest.coreChanges.storyDayDelta,
    chapterNumber: digest.chapterNumber,
    mc: {
      characterId: core.mc.characterId,
      locationId: mc?.locationId ?? core.mc.locationId,
      keyAssetIds: core.mc.keyAssetIds,
      goldenFingerRungId,
    },
    cast: [...cast.values()],
    progressions: [...progressions.values()],
    activeAssetLots: assetState.lots,
    recentAssetEvents: assetState.recentEvents,
    // The same fact can be revealed to the reader in one chapter and learned by
    // another character later. Preserve those events; only remove an exact
    // duplicate extractor record from the same chapter.
    narrativeEvidence: [...core.narrativeEvidence, ...digest.narrativeEvidence]
      .filter((item, index, all) => {
        const learners = [...item.learnedByCharacterIds].sort().join(',');
        return all.findIndex(candidate => candidate.id === item.id
          && candidate.chapterNumber === item.chapterNumber
          && candidate.quote === item.quote
          && [...candidate.learnedByCharacterIds].sort().join(',') === learners) === index;
      })
      .slice(-240),
    revealedNarrativeIds: [...revealedNarrativeIds],
    achievedNarrativeMilestoneIds: [...achievedNarrativeMilestoneIds],
    characterKnowledge: [...characterKnowledge].map(([characterId, known]) => ({
      characterId,
      factIds: [...known],
    })),
    openHooks: hooks,
  };

  const next = BibleSchema.parse({
    ...bible,
    symbolicCore,
    castSheet: [...sheets.values()],
    world: [...revealedWorld.values()],
    // 9. Recent memory is a window, not an archive. Volume summaries carry the rest.
    recentSummary: [...bible.recentSummary, {
      chapterNumber: digest.chapterNumber,
      title: digest.title,
      summary: digest.summary,
      payoffKind: digest.payoffKind,
      endedOn: digest.endedOn,
    }].slice(-10),
  });
  assertBibleCoherence(premise, next);
  return next;
}

/**
 * 10. A cycle may not lead on the same satisfaction beat as the cycle before it.
 * This is the one rule that directly defends against what killed the old novels:
 * five chapters in a row of the same contract signing, the same engine repair.
 */
export function assertPayoffRotation(previous: CyclePlan | null, next: CyclePlan): void {
  if (!previous || next.schemaVersion === 2) return;
  if (previous.climax.payoffKind === next.climax.payoffKind) {
    throw new SerialStateError(
      'payoff_rotation',
      `Cycle ${next.cycleNumber} repeats the payoff kind "${next.climax.payoffKind}" used by cycle ${previous.cycleNumber}.`,
    );
  }
}

/** Hooks a cycle plan must clear before it may end. Overdue hooks are how a serial rots. */
export function overdueHooks(bible: Bible, throughChapter: number): Array<{ id: string; what: string; dueByChapter: number }> {
  return bible.symbolicCore.openHooks
    .filter(hook => hook.status !== 'paid' && hook.status !== 'dropped' && hook.dueByChapter <= throughChapter)
    .map(hook => ({ id: hook.id, what: hook.what, dueByChapter: hook.dueByChapter }));
}

/**
 * A broker story wins through other people. If the protagonist keeps stepping on stage
 * himself, it stops being that story; if nobody ever learns he was behind it, the reader
 * loses the thread. Both drifts are code-owned because both are invisible one cycle at a
 * time and obvious ten cycles later.
 */
export function assertStanceHeld(input: {
  stance: Premise['payoffStance'];
  recentCycles: Array<Pick<CyclePlan['climax'], 'performedBy' | 'attribution'>>;
}): void {
  if (input.stance !== 'broker' || input.recentCycles.length < 3) return;
  const window = input.recentCycles.slice(-5);
  const brokered = window.filter(climax => climax.performedBy !== 'protagonist').length;
  if (brokered * 2 <= window.length) {
    throw new SerialStateError(
      'stance_drift',
      `A broker story has the protagonist performing ${window.length - brokered} of the last ${window.length} payoffs.`,
    );
  }
  if (window.every(climax => climax.attribution === 'hidden')) {
    throw new SerialStateError(
      'attribution_starved',
      `Nobody has learned who is behind the last ${window.length} payoffs; the reader has nothing to hold on to.`,
    );
  }
}

/** Payoff kinds used recently, newest first — the planner sees this and rotates away. */
export function recentPayoffKinds(bible: Bible): PayoffKind[] {
  return [...bible.recentSummary].reverse()
    .map(entry => entry.payoffKind)
    .filter((kind): kind is PayoffKind => kind !== null);
}

/**
 * The Bible a story starts from. Derived entirely from the approved Premise, so a
 * launch cannot begin from state nobody read: everyone is alive, nobody has risen,
 * nobody knows the secret, and no hook is owed yet.
 */
export function seedBible(input: { premise: Premise }): Bible {
  const { premise } = input;
  const protagonist = premise.castSeed.find(member => member.role === 'protagonist')
    ?? fail('no_protagonist', 'Premise has no character with role "protagonist".');
  const bible = BibleSchema.parse({
    schemaVersion: 2,
    symbolicCore: {
      storyDay: 0,
      chapterNumber: 0,
      mc: {
        characterId: protagonist.id,
        locationId: protagonist.startLocationId,
        keyAssetIds: premise.worldKernel.progressionSubjects.filter(subject => subject.kind === 'asset').map(subject => subject.id),
        goldenFingerRungId: premise.goldenFinger.evolution[0].id,
      },
      cast: premise.castSeed.map(member => ({
        id: member.id,
        alive: true,
        locationId: member.startLocationId,
        lastSeenChapter: 0,
        knowsFinger: premise.schemaVersion === 2
          ? member.id === protagonist.id
          : Boolean(premise.narrativeFoundation?.advantageDiscovery.initiallyKnownFactIds.length
            && member.id === protagonist.id),
      })),
      progressions: [
        ...premise.castSeed.flatMap(member => member.startingProgressions.map(state => ({ subjectId: member.id, ...state }))),
        ...premise.worldKernel.progressionSubjects.flatMap(subject => subject.startingProgressions.map(state => ({ subjectId: subject.id, ...state }))),
      ],
      activeAssetLots: [],
      recentAssetEvents: [],
      narrativeEvidence: [],
      revealedNarrativeIds: premise.schemaVersion === 3
        ? premise.narrativeFoundation?.advantageDiscovery.initiallyKnownFactIds ?? []
        : [],
      achievedNarrativeMilestoneIds: [],
      characterKnowledge: premise.schemaVersion === 3
        ? premise.castSeed.map(member => ({
            characterId: member.id,
            factIds: [
              ...(member.id === protagonist.id
                ? premise.narrativeFoundation?.advantageDiscovery.initiallyKnownFactIds ?? []
                : []),
              ...(premise.narrativeFoundation?.facts
                .filter(fact => fact.initiallyKnownByCharacterIds.includes(member.id))
                .map(fact => fact.id) ?? []),
            ].filter((factId, index, all) => all.indexOf(factId) === index),
          })).filter(entry => entry.factIds.length > 0)
        : [],
      openHooks: [],
    },
    castSheet: premise.castSeed.map(member => ({
      id: member.id,
      name: member.name,
      sheet: (() => {
        const foundation = premise.narrativeFoundation?.characters.find(item => item.characterId === member.id);
        return foundation
          ? `${member.role} — hiện tại: ${foundation.presentLife}; năng lực: ${foundation.existingCompetence}; giới hạn: ${foundation.limitsOfKnowledge}; quan hệ: ${foundation.relationships}; thói quen: ${foundation.habits}; mong muốn: ${foundation.desireBeforeAdvantage}`
          : `${member.role} — ${member.agenda}${member.antagonistClass ? ` (${member.antagonistClass})` : ''}`;
      })(),
    })),
    // Complete canon stays in worldKernel; the living list starts empty and grows only
    // when an Extractor records an entity actually shown on the page.
    world: [],
    recentSummary: [],
    volumeSummaries: [],
    styleMemory: [],
  });
  assertBibleCoherence(premise, bible);
  return bible;
}
