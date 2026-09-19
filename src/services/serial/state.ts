import {
  type Bible, type ChapterDigest, type CyclePlan, type Premise, type SymbolicCore,
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

/** Rung index in the premise ladder, or -1. Progression is only ever measured here. */
export function tierIndex(premise: Premise, tierId: string | null): number {
  if (!tierId) return -1;
  return premise.tierLadder.findIndex(tier => tier.id === tierId);
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
  const core = bible.symbolicCore;

  // 1. Chapters land in order. A gap means a lost commit, not a story event.
  if (digest.chapterNumber !== core.chapterNumber + 1) {
    fail('chapter_sequence', `Digest is for chapter ${digest.chapterNumber}, Bible is at ${core.chapterNumber}.`);
  }

  const cast = new Map(core.cast.map(member => [member.id, { ...member }]));
  const sheets = new Map(bible.castSheet.map(entry => [entry.id, { ...entry }]));

  // 2. New cast arrives with a sheet, and cannot collide with a known id.
  for (const arrival of digest.coreChanges.newCast) {
    if (cast.has(arrival.id)) fail('cast_collision', `Chapter ${digest.chapterNumber} re-introduces existing character ${arrival.id}.`);
    cast.set(arrival.id, {
      id: arrival.id, alive: true, tierId: null, locationId: core.mc.locationId,
      lastSeenChapter: digest.chapterNumber, knowsFinger: false,
    });
    sheets.set(arrival.id, { id: arrival.id, name: arrival.name, sheet: arrival.sheet });
  }

  // 3. The dead stay dead. Killing someone already dead is a contradiction too.
  for (const deadId of digest.coreChanges.died) {
    const member = cast.get(deadId) ?? fail('unknown_character', `Chapter ${digest.chapterNumber} kills unknown character ${deadId}.`);
    if (!member.alive) fail('dead_stays_dead', `Character ${deadId} was already dead before chapter ${digest.chapterNumber}.`);
    member.alive = false;
    member.lastSeenChapter = digest.chapterNumber;
  }

  // 4. Rank never regresses, and never moves for someone who is dead.
  for (const change of digest.coreChanges.tierChanges) {
    const member = cast.get(change.characterId) ?? fail('unknown_character', `Chapter ${digest.chapterNumber} ranks unknown character ${change.characterId}.`);
    if (!member.alive) fail('dead_stays_dead', `Chapter ${digest.chapterNumber} changes the rank of dead character ${change.characterId}.`);
    const next = tierIndex(premise, change.toTierId);
    if (next < 0) fail('unknown_tier', `Tier ${change.toTierId} is not on the ladder.`);
    if (next < tierIndex(premise, member.tierId)) {
      fail('tier_regression', `Chapter ${digest.chapterNumber} demotes ${change.characterId} without a ladder reason.`);
    }
    member.tierId = change.toTierId;
    member.lastSeenChapter = digest.chapterNumber;
  }

  // 5. The dead do not travel.
  for (const move of digest.coreChanges.moved) {
    const member = cast.get(move.characterId) ?? fail('unknown_character', `Chapter ${digest.chapterNumber} moves unknown character ${move.characterId}.`);
    if (!member.alive) fail('dead_stays_dead', `Chapter ${digest.chapterNumber} moves dead character ${move.characterId}.`);
    member.locationId = move.toLocationId;
    member.lastSeenChapter = digest.chapterNumber;
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

  const symbolicCore: SymbolicCore = {
    // 8. Story time only ever moves forward.
    storyDay: core.storyDay + digest.coreChanges.storyDayDelta,
    chapterNumber: digest.chapterNumber,
    mc: {
      tierId: mc?.tierId ?? core.mc.tierId,
      locationId: mc?.locationId ?? core.mc.locationId,
      keyAssetIds: core.mc.keyAssetIds,
    },
    cast: [...cast.values()],
    openHooks: hooks,
  };

  return BibleSchema.parse({
    ...bible,
    symbolicCore,
    castSheet: [...sheets.values()],
    // 9. Recent memory is a window, not an archive. Volume summaries carry the rest.
    recentSummary: [...bible.recentSummary, {
      chapterNumber: digest.chapterNumber,
      title: digest.title,
      summary: digest.summary,
      payoffKind: digest.payoffKind,
      endedOn: digest.endedOn,
    }].slice(-10),
  });
}

/**
 * 10. A cycle may not lead on the same satisfaction beat as the cycle before it.
 * This is the one rule that directly defends against what killed the old novels:
 * five chapters in a row of the same contract signing, the same engine repair.
 */
export function assertPayoffRotation(previous: CyclePlan | null, next: CyclePlan): void {
  if (!previous) return;
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
export function seedBible(input: { premise: Premise; startLocationId: string; startLocationNote: string }): Bible {
  const { premise } = input;
  const protagonist = premise.castSeed.find(member => member.role === 'protagonist')
    ?? fail('no_protagonist', 'Premise has no character with role "protagonist".');
  return BibleSchema.parse({
    schemaVersion: 1,
    symbolicCore: {
      storyDay: 0,
      chapterNumber: 0,
      mc: { tierId: premise.tierLadder[0].id, locationId: input.startLocationId, keyAssetIds: [] },
      cast: premise.castSeed.map(member => ({
        id: member.id,
        alive: true,
        tierId: member.id === protagonist.id ? premise.tierLadder[0].id : null,
        locationId: input.startLocationId,
        lastSeenChapter: 0,
        knowsFinger: member.id === protagonist.id,
      })),
      openHooks: [],
    },
    castSheet: premise.castSeed.map(member => ({
      id: member.id,
      name: member.name,
      sheet: `${member.role} — ${member.agenda}${member.antagonistClass ? ` (${member.antagonistClass})` : ''}`,
    })),
    world: [{ id: input.startLocationId, name: input.startLocationId, note: input.startLocationNote }],
    recentSummary: [],
    volumeSummaries: [],
    styleMemory: [],
  });
}
