import { z } from 'zod';
import { archetypeOf, DEFAULT_ARCHETYPE, payoffKindIds } from './playbook';
import {
  NarrativeEvidenceSchema,
  NarrativeFoundationSchema,
  assertFoundationReferences,
} from '@/services/narrative/foundation';

/**
 * Artifacts for the serial engine.
 *
 * The rule that shapes every schema here: the Writer may invent freely, and is
 * constrained only by what a reader could catch. So durable state splits in two.
 * `symbolicCore` is a short, machine-checked list of facts a contradiction would
 * be obvious on — who is dead, what named progression someone holds, where they stand, what
 * day it is, which hooks are still open. Everything else is prose the models read
 * and rewrite. The previous engine tried to make the whole world machine-checked;
 * it produced arithmetically perfect chapters in which nothing happened.
 *
 * See docs/FALOO_CRAFT.md for the measurements these contracts encode.
 */

const id = z.string().trim().regex(/^[a-z0-9_]{2,64}$/, 'stable id: lowercase, digits, underscore');
const line = z.string().trim().min(1).max(400);
const para = z.string().trim().min(1).max(1_200);

/**
 * A satisfaction beat, by id. The registry still lives in playbook.json, but it is
 * materialized as an enum when the process starts so structured-output providers see
 * the exact legal ids instead of guessing a Vietnamese display name.
 */
const payoffIds = payoffKindIds();
if (payoffIds.length === 0) throw new Error('playbook payoffKinds cannot be empty');
export const PayoffKindSchema = z.enum(payoffIds as [string, ...string[]]);
export type PayoffKind = string;

/** Who is on stage for the payoff. A broker premise wins through other people. */
export const PERFORMERS = ['protagonist', 'ally', 'faction'] as const;
/** Who in the scene knows the protagonist is behind it. */
export const ATTRIBUTIONS = ['public', 'inner_circle', 'hidden'] as const;

export const LANES = [
  'he_thong_do_thi',
  'huyen_huyen_vo_dich',
  'toan_dan_lanh_chua',
  'trong_sinh_biet_truoc',
  'thuc_tinh_toan_dan',
  'toan_dan_chuc_nghiep',
  'gia_toc_tu_tien',
  'ngu_thu',
  'quy_tac_quai_dam',
] as const;
export type Lane = (typeof LANES)[number];

// ---------------------------------------------------------------- Premise

/**
 * Immutable after approval. A human reads exactly this one page and says yes or
 * no — the same gate Faloo's 责编 applies to the golden finger and the opening
 * before a book enters the library.
 */
const RankSchema = z.object({ id, name: z.string().trim().min(1).max(80), note: line.nullable().default(null) }).strict();
const ProgressionRefSchema = z.object({
  systemId: id,
  trackId: id.nullable().default(null),
  rankId: id,
  minorStageId: id.nullable().default(null),
}).strict();

export const ProgressionStateSchema = ProgressionRefSchema.extend({ subjectId: id }).strict();
export type ProgressionState = z.infer<typeof ProgressionStateSchema>;

/** A reader-visible lot that can be owned, transferred or consumed across chapters. */
export const AssetLotSchema = z.object({
  lotId: id,
  assetId: id,
  assetName: line,
  ownerId: id,
  ownerName: line,
  quantity: z.number().positive().max(1_000_000_000_000),
  unit: z.string().trim().min(1).max(60),
  fungible: z.boolean(),
  provenance: line,
  acquiredChapter: z.number().int().nonnegative(),
  updatedChapter: z.number().int().nonnegative(),
}).strict();
export type AssetLot = z.infer<typeof AssetLotSchema>;

/**
 * Extracted in prose order. For acquire, eventId becomes the new lot id. For
 * transfer, sourceLotId is debited and eventId becomes the recipient lot id.
 * Consume closes or reduces sourceLotId and creates no new lot.
 */
const AssetEventBaseSchema = z.object({
  eventId: id,
  kind: z.enum(['acquire', 'transfer', 'consume']),
  assetId: id,
  assetName: line,
  quantity: z.number().positive().max(1_000_000_000_000),
  unit: z.string().trim().min(1).max(60),
  fungible: z.boolean(),
  sourceLotId: id.nullable().default(null),
  fromOwnerId: id.nullable().default(null),
  fromOwnerName: line.nullable().default(null),
  toOwnerId: id.nullable().default(null),
  toOwnerName: line.nullable().default(null),
  note: line,
}).strict();

const validateAssetEvent = (event: z.infer<typeof AssetEventBaseSchema>, ctx: z.RefinementCtx) => {
  const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (event.kind === 'acquire' && (event.sourceLotId || !event.toOwnerId || !event.toOwnerName)) {
    issue('Acquire creates a new lot for a named owner and has no sourceLotId.');
  }
  if (event.kind === 'transfer' && (!event.sourceLotId || !event.fromOwnerId || !event.toOwnerId || !event.toOwnerName)) {
    issue('Transfer requires a source lot plus named source and destination owners.');
  }
  if (event.kind === 'consume' && (!event.sourceLotId || !event.fromOwnerId || event.toOwnerId || event.toOwnerName)) {
    issue('Consume requires a source lot and its owner, and creates no destination owner.');
  }
};

export const AssetEventSchema = AssetEventBaseSchema.superRefine(validateAssetEvent);
export type AssetEvent = z.infer<typeof AssetEventSchema>;

export const RecordedAssetEventSchema = AssetEventBaseSchema.extend({
  chapterNumber: z.number().int().min(1),
}).strict().superRefine(validateAssetEvent);
export type RecordedAssetEvent = z.infer<typeof RecordedAssetEventSchema>;

const MilestoneSchema = z.object({
  name: line,
  progressionTarget: ProgressionRefSchema.nullable().default(null),
  socialResult: line,
}).strict();

const PremiseObjectSchema = z.object({
  schemaVersion: z.union([z.literal(2), z.literal(3)]),
  narrativeFoundation: NarrativeFoundationSchema.optional(),
  lane: z.enum(LANES),
  /** Genre shape from the playbook registry: world count, commerce loop, reader promise. */
  archetype: z.string().trim().regex(/^[a-z0-9_]{3,48}$/).default(DEFAULT_ARCHETYPE),
  /** `ĐẤU TRƯỜNG: nhân vật + lợi thế + payoff`, the measured Faloo formula. */
  title: z.string().trim().min(12).max(120),
  /** One line a reader decides on. */
  hook: line,
  /** Desire/opportunity → advantage → first payoff → larger promise. */
  blurb: z.string().trim().min(200).max(1_200),
  /** What the reader is here to feel. Not a plot summary. */
  readerFantasy: line,

  /** Reader-facing launch material approved together with the premise. */
  presentation: z.object({
    coverPath: z.string().trim().regex(/^\/covers\/[a-z0-9_\-/]+\.webp$/),
    tagline: z.string().trim().min(8).max(120),
    shortDescription: z.string().trim().min(100).max(500),
    tags: z.array(z.string().trim().min(2).max(32)).min(4).max(10),
    sellingPoints: z.array(line).min(3).max(6),
  }).strict(),

  goldenFinger: z.object({
    name: z.string().trim().min(2).max(60),
    /** Stated the way the reader will see it, not as an internal mechanic. */
    rule: para,
    /** Optional functional scope of the established advantage. */
    scope: para.nullable().default(null),
    /** Each rung changes HOW the advantage is used, never only the number. */
    evolution: z.array(z.object({ id, name: line, changesUse: line })).min(1).max(12),
  }).strict(),

  /** Four directions for expansion, selected by the story rather than a fixed sequence. */
  conflictLadder: z.object({
    survival: line,   // beasts, thugs, going hungry
    rules: line,      // enforcers, sects, guilds, the law
    ideology: line,   // who should hold this, and why
    self: line.describe('Tham vọng và cách sống nhân vật chủ động chọn khi đã có thành quả.'),
  }).strict(),

  /** Planted early, surfaces mid-story, merges with the main line at the end. */
  hiddenThread: para,

  /**
   * Front: the protagonist wins on stage. Broker: allies win with what he gave them and
   * the reader, not the crowd, knows why. Mixed: both, cycle by cycle.
   */
  payoffStance: z.enum(['front', 'broker', 'mixed']).default('front'),

  /**
   * Where resistance comes from, by contract: people who want what the protagonist
   * has, or who lose something when he wins. Every cycle's pressure has to be
   * traceable to this, not to the advantage misfiring.
   */
  oppositionEngine: para,

  /** Named launch cast. Lived-causality stories may introduce a smaller cast naturally. */
  castSeed: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(60),
    role: z.enum(['protagonist', 'ally', 'antagonist', 'authority', 'rival', 'family']),
    /** What they want for themselves, independent of the protagonist. */
    agenda: line,
    antagonistClass: z.string().trim().max(60).nullable().default(null),
    startLocationId: id,
    startingProgressions: z.array(ProgressionRefSchema).max(8).default([]),
    milestones: z.array(MilestoneSchema).min(1).max(8),
  }).strict()).min(3).max(16),

  /** Complete approved canon. The living Bible only stores facts already shown in prose. */
  worldKernel: z.object({
    worlds: z.array(z.object({
      id,
      name: line,
      civilizationState: para,
      locations: z.array(z.object({ id, name: line, note: para }).strict()).min(2).max(20),
      factions: z.array(z.object({ id, name: line, agenda: para }).strict()).min(2).max(20),
    }).strict()).min(1).max(2),
    progressionSystems: z.array(z.object({
      id,
      name: line,
      kind: z.enum(['realm', 'profession', 'organization', 'business', 'ability']),
      subjectType: z.enum(['character', 'asset', 'faction', 'company']),
      tracks: z.array(RankSchema).max(12).default([]),
      ranks: z.array(RankSchema).min(2).max(24),
      minorStages: z.array(RankSchema).max(12).default([]),
    }).strict()).min(1).max(16),
    progressionSubjects: z.array(z.object({
      id,
      name: line,
      kind: z.enum(['asset', 'faction', 'company']),
      startLocationId: id,
      startingProgressions: z.array(ProgressionRefSchema).min(1).max(8),
    }).strict()).max(12).default([]),
    gradeSystems: z.array(z.object({
      id,
      name: line,
      categories: z.array(line).min(1).max(16),
      tiers: z.array(RankSchema).max(12).default([]),
      qualities: z.array(RankSchema).max(12).default([]),
      note: para,
    }).strict().superRefine((system, ctx) => {
      if (system.tiers.length === 0 && system.qualities.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A grade system needs tiers or qualities.' });
      }
    })).max(16),
    equivalences: z.array(z.object({
      leftSystemId: id, leftRankId: id, rightSystemId: id, rightRankId: id, note: para,
    }).strict()).max(24).default([]),
    economyLoops: z.array(z.object({
      id, name: line, fromWorldId: id, toWorldId: id,
      goods: z.array(line).min(1).max(12), buyer: line, settlement: line, reinvestment: para,
    }).strict()).max(12),
    launchProducts: z.array(z.object({
      id, name: line, category: line, gradeSystemId: id.nullable().default(null),
      tierId: id.nullable().default(null), qualityId: id.nullable().default(null),
      effect: para, targetBuyer: line, introducedChapter: z.number().int().min(1).nullable().default(null),
    }).strict()).max(16),
    openingContract: z.array(z.object({
      chapterNumber: z.number().int().min(1).max(4),
      proves: para,
      namedLevelOrGrade: line.nullable().default(null),
      visibleResult: line,
      witnessReaction: line.nullable().default(null),
      commercialAction: line.nullable().default(null),
    }).strict()).max(12),
    /**
     * Positive source of truth for the opening's commerce. The Writer turns these
     * entries into scenes; it does not have to reconstruct an accounting chain from
     * prose notes or a growing list of prohibitions.
     */
    openingLedger: z.array(z.object({
      id,
      chapterNumber: z.number().int().min(1).max(4),
      kind: z.enum(['acquisition', 'sale', 'reservation', 'order', 'settlement', 'transfer']),
      asset: line,
      quantity: line,
      from: line,
      to: line,
      consideration: para,
      resultingStatus: para,
    }).strict()).max(24),
  }).strict(),

  /** Legible category the Vietnamese convert reader already knows. Never a borrowed IP. */
  arena: line,
  /** The one fresh collision that makes it not a clone. */
  novelty: line,
  endingDirection: para,

  voiceSheet: z.object({
    pov: z.enum(['third_limited', 'first']),
    register: para,
    /** Chapter titles are a line of speech or thought with attitude. */
    chapterTitleRule: para,
    /** Lane has an in-fiction system panel shown to the reader in 【】. */
    showsSystemPanel: z.boolean(),
    reactionRule: para,
    taboos: z.array(line).max(12).default([]),
  }).strict(),
}).strict();

function validatePremise(premise: z.infer<typeof PremiseObjectSchema>, ctx: z.RefinementCtx): void {
  const unique = (values: string[], path: (string | number)[]) => {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'Ids must be unique.' });
  };
  const worlds = premise.worldKernel.worlds;
  const locations = worlds.flatMap(world => world.locations);
  const locationIds = new Set(locations.map(location => location.id));
  const systems = new Map(premise.worldKernel.progressionSystems.map(system => [system.id, system]));
  const grades = new Map(premise.worldKernel.gradeSystems.map(system => [system.id, system]));
  unique(worlds.map(world => world.id), ['worldKernel', 'worlds']);
  unique(locations.map(location => location.id), ['worldKernel', 'worlds']);
  unique([...systems.keys()], ['worldKernel', 'progressionSystems']);
  unique([...grades.keys()], ['worldKernel', 'gradeSystems']);
  unique(premise.castSeed.map(member => member.id), ['castSeed']);
  unique(premise.worldKernel.progressionSubjects.map(subject => subject.id), ['worldKernel', 'progressionSubjects']);
  if (premise.schemaVersion === 2 && premise.narrativeFoundation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['narrativeFoundation'], message: 'Legacy premise v2 cannot carry the lived-causality foundation.' });
  }
  if (premise.schemaVersion === 3 && !premise.narrativeFoundation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['narrativeFoundation'], message: 'Premise v3 requires a narrative foundation.' });
  }
  if (premise.castSeed.filter(member => member.role === 'protagonist').length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['castSeed'], message: 'Premise needs exactly one protagonist.' });
  }
  const antagonistClasses = new Set(premise.castSeed
    .filter(member => member.role === 'antagonist' && member.antagonistClass)
    .map(member => member.antagonistClass));
  if (premise.schemaVersion === 2 && antagonistClasses.size < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['castSeed'], message: 'castSeed needs at least two characters with role antagonist and different antagonistClass values.' });
  const shape = archetypeOf(premise.archetype);
  if (!shape) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['archetype'], message: `Unknown archetype ${premise.archetype}.` });
  } else if (premise.worldKernel.worlds.length !== shape.worlds) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'worlds'], message: `Archetype ${shape.id} needs exactly ${shape.worlds} world(s).` });
  }
  const commerce = shape?.commerce ?? true;
  if (premise.schemaVersion === 2) {
    // One issue per unmet minimum: a drafter has to know which count to fix.
    const minimums: Array<[boolean, (string | number)[], string]> = [
      [premise.castSeed.length < 6, ['castSeed'], 'castSeed needs at least 6 named characters.'],
      [premise.goldenFinger.evolution.length < 6 || premise.goldenFinger.evolution.length > 8, ['goldenFinger', 'evolution'], 'goldenFinger.evolution needs 6-8 named rungs.'],
      [premise.worldKernel.progressionSystems.length < 3, ['worldKernel', 'progressionSystems'], 'worldKernel.progressionSystems needs at least 3 systems.'],
      [premise.worldKernel.gradeSystems.length < 2, ['worldKernel', 'gradeSystems'], 'worldKernel.gradeSystems needs at least 2 grade systems.'],
      [commerce && premise.worldKernel.economyLoops.length < 2, ['worldKernel', 'economyLoops'], 'A commerce archetype needs at least 2 economy loops.'],
      [commerce && premise.worldKernel.launchProducts.length < 4, ['worldKernel', 'launchProducts'], 'A commerce archetype needs at least 4 launch products.'],
      [commerce && premise.worldKernel.openingLedger.length < 4, ['worldKernel', 'openingLedger'], 'A commerce archetype needs at least 4 opening ledger entries.'],
    ];
    for (const [unmet, path, message] of minimums) if (unmet) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
  const validateProgression = (state: z.infer<typeof ProgressionRefSchema>, path: (string | number)[]) => {
    const system = systems.get(state.systemId);
    if (!system) return ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, 'systemId'], message: `Unknown progression system ${state.systemId}.` });
    if (!system.ranks.some(rank => rank.id === state.rankId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, 'rankId'], message: `Unknown rank ${state.rankId}.` });
    if (state.trackId && !system.tracks.some(track => track.id === state.trackId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, 'trackId'], message: `Unknown track ${state.trackId}.` });
    if (state.minorStageId && !system.minorStages.some(stage => stage.id === state.minorStageId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, 'minorStageId'], message: `Unknown minor stage ${state.minorStageId}.` });
  };
  premise.castSeed.forEach((member, index) => {
    if (!locationIds.has(member.startLocationId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['castSeed', index, 'startLocationId'], message: 'Unknown start location.' });
    member.startingProgressions.forEach((state, stateIndex) => validateProgression(state, ['castSeed', index, 'startingProgressions', stateIndex]));
    member.milestones.forEach((milestone, milestoneIndex) => {
      if (milestone.progressionTarget) validateProgression(milestone.progressionTarget, ['castSeed', index, 'milestones', milestoneIndex, 'progressionTarget']);
    });
  });
  premise.worldKernel.progressionSubjects.forEach((subject, index) => {
    if (!locationIds.has(subject.startLocationId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'progressionSubjects', index, 'startLocationId'], message: 'Unknown start location.' });
    subject.startingProgressions.forEach((state, stateIndex) => validateProgression(state, ['worldKernel', 'progressionSubjects', index, 'startingProgressions', stateIndex]));
  });
  premise.worldKernel.equivalences.forEach((item, index) => {
    for (const side of ['left', 'right'] as const) {
      const system = systems.get(item[`${side}SystemId`]);
      if (!system || !system.ranks.some(rank => rank.id === item[`${side}RankId`])) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'equivalences', index], message: `Invalid ${side} progression reference.` });
    }
  });
  const worldIds = new Set(worlds.map(world => world.id));
  premise.worldKernel.economyLoops.forEach((loop, index) => {
    if (!worldIds.has(loop.fromWorldId) || !worldIds.has(loop.toWorldId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'economyLoops', index], message: 'Economy loop references an unknown world.' });
  });
  premise.worldKernel.launchProducts.forEach((product, index) => {
    const grade = product.gradeSystemId ? grades.get(product.gradeSystemId) : null;
    if (premise.schemaVersion === 2 && !product.gradeSystemId) return ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'gradeSystemId'], message: 'Legacy launch products require a grade system.' });
    if (!product.gradeSystemId) return;
    if (!grade) return ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'gradeSystemId'], message: 'Unknown grade system.' });
    if (product.tierId && !grade.tiers.some(tier => tier.id === product.tierId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'tierId'], message: 'Unknown product tier.' });
    if (product.qualityId && !grade.qualities.some(quality => quality.id === product.qualityId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'qualityId'], message: 'Unknown product quality.' });
  });
  const chapters = premise.worldKernel.openingContract.map(item => item.chapterNumber).sort();
  if (premise.schemaVersion === 2 && chapters.join(',') !== '1,2,3,4') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'openingContract'], message: 'Legacy opening contract must cover chapters 1, 2, 3 and 4 exactly once.' });
  if (premise.schemaVersion === 2 && premise.worldKernel.openingContract.some(item =>
    !item.namedLevelOrGrade || !item.witnessReaction || (commerce && !item.commercialAction))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'openingContract'], message: 'Opening rows require a named grade and a witness reaction; commerce archetypes also a commercial action.' });
  }
  if (premise.schemaVersion === 3 && premise.narrativeFoundation) {
    try {
      assertFoundationReferences({
        foundation: premise.narrativeFoundation,
        characterIds: premise.castSeed.map(member => member.id),
        worldIds: premise.worldKernel.worlds.map(world => world.id),
        protagonistId: premise.castSeed.find(member => member.role === 'protagonist')?.id ?? '',
      });
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['narrativeFoundation'], message: error instanceof Error ? error.message : String(error) });
    }
  }
}

export const PremiseSchema = PremiseObjectSchema.superRefine(validatePremise);

const toStableId = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);

/**
 * Stable ids are mechanical: a drafter that writes `Lam_Kha` or `lâm-kha` has not made a
 * story mistake. Every id-valued field is rewritten the same way, so references stay
 * consistent; nothing else in the package is touched.
 */
export function normalizePremiseIds<T>(value: T, key = ''): T {
  const idKey = /^id$|Ids?$/.test(key);
  if (typeof value === 'string') return (idKey ? toStableId(value) : value) as T;
  if (Array.isArray(value)) return value.map(item => normalizePremiseIds(item, idKey ? key : '')) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizePremiseIds(v, k)])) as T;
  }
  return value;
}

/**
 * What a premise model is shown: schema v2 only. Offering the retired v3 foundation made the
 * model fill it and fail validation on every draft (2026-09-24), the same way the extractor
 * once filled lived-causality evidence nobody asked for.
 */
export const ProposedPremiseSchema = z.preprocess(
  value => normalizePremiseIds(value),
  PremiseObjectSchema.omit({ narrativeFoundation: true })
    .extend({ schemaVersion: z.literal(2) })
    .superRefine((premise, ctx) => validatePremise(premise, ctx)),
);


export type Premise = z.infer<typeof PremiseSchema>;

// ------------------------------------------------------------------ Bible

/** Machine-checked. Small on purpose: a reader would catch a contradiction in any of it. */
export const SymbolicCoreSchema = z.object({
  storyDay: z.number().int().nonnegative(),
  chapterNumber: z.number().int().nonnegative(),
  mc: z.object({
    characterId: id,
    locationId: id,
    keyAssetIds: z.array(id).max(24),
    goldenFingerRungId: id,
  }).strict(),
  cast: z.array(z.object({
    id,
    alive: z.boolean(),
    locationId: id,
    lastSeenChapter: z.number().int().nonnegative(),
    /** Does this character know about the golden finger? Information boundary. */
    knowsFinger: z.boolean().default(false),
  }).strict()).max(120),
  progressions: z.array(ProgressionStateSchema).max(480),
  /** Current spendable/usable lots plus a bounded cross-chapter audit trail. */
  activeAssetLots: z.array(AssetLotSchema).max(240).default([]),
  recentAssetEvents: z.array(RecordedAssetEventSchema).max(120).default([]),
  /** Reader-grounded revelations. A plan or kernel fact does not count as revealed. */
  narrativeEvidence: z.array(NarrativeEvidenceSchema).max(240).default([]),
  /** Durable indexes. Unlike narrativeEvidence, these are never truncated. */
  revealedNarrativeIds: z.array(id).max(2_000).default([]),
  achievedNarrativeMilestoneIds: z.array(id).max(1_000).default([]),
  characterKnowledge: z.array(z.object({
    characterId: id,
    factIds: z.array(id).max(2_000),
  }).strict()).max(120).default([]),
  openHooks: z.array(z.object({
    id,
    what: line,
    plantedChapter: z.number().int().min(1),
    dueByChapter: z.number().int().min(1),
    status: z.enum(['open', 'moving', 'paid', 'dropped']),
  }).strict()).max(40),
}).strict();
export type SymbolicCore = z.infer<typeof SymbolicCoreSchema>;

export const BibleSchema = z.object({
  schemaVersion: z.literal(2),
  symbolicCore: SymbolicCoreSchema,
  /** 3–5 lines per person. Prose, not fields — the models read and rewrite it. */
  castSheet: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(60),
    sheet: para,
  }).strict()).max(120),
  /** Factions, places, what the world has been told about the finger so far. */
  world: z.array(z.object({ id, name: line, note: para }).strict()).max(80),
  /** Last 10 chapters, one line each, with the beat used and the hook left open. */
  recentSummary: z.array(z.object({
    chapterNumber: z.number().int().min(1),
    title: line,
    summary: line,
    payoffKind: PayoffKindSchema.nullable(),
    endedOn: line,
  }).strict()).max(10),
  /** One paragraph per finished volume. This is how the Bible stays bounded at chapter 800. */
  volumeSummaries: z.array(z.object({
    volumeNumber: z.number().int().min(1),
    summary: para,
  }).strict()).max(12),
  /** Phrases, sentence shapes and images already worn out. Fed to the Writer as a ban list. */
  styleMemory: z.array(line).max(40).default([]),
}).strict();
export type Bible = z.infer<typeof BibleSchema>;

// -------------------------------------------------------------- Cycle plan

export const SceneModeSchema = z.enum([
  'transaction', 'hunt', 'combat', 'public_showcase', 'negotiation',
  'investigation', 'crafting', 'world_crossing', 'organization', 'progression',
  'daily_life', 'relationship', 'reflection', 'discovery',
]);
export type SceneMode = z.infer<typeof SceneModeSchema>;

/** A 副本: pressure, escalation, release. 5–15 chapters. */
const CyclePlanObjectSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  cycleNumber: z.number().int().min(1),
  volumeNumber: z.number().int().min(1),
  startChapter: z.number().int().min(1),
  plannedEndChapter: z.number().int().min(1),
  /** Legacy field name retained for persisted cycles; motivation may be positive. */
  pressure: para.describe('Động lực mở chu kỳ: cơ hội, mục tiêu nhân vật muốn đạt hoặc đối kháng cụ thể.'),
  escalation: z.array(line).min(3).max(6).describe('Các bước làm kết quả đáng mong hơn: khám phá, thành công, phản ứng, mở rộng hoặc đối đầu.'),
  climax: z.object({
    payoffKind: PayoffKindSchema,
    performedBy: z.enum(PERFORMERS).default('protagonist'),
    attribution: z.enum(ATTRIBUTIONS).default('public'),
    /** The visible, material result. "He wins" is not a result. */
    result: para,
    /** Who sees it happen. A payoff nobody witnesses does not land. */
    witnesses: z.array(line).max(6),
  }).strict(),
  aftermath: para,
  /** The expectation this cycle leaves burning for the next one. */
  nextHook: para,
  /** The repeat-purchase engine: a customer becomes stronger, earns, shows it, then upgrades. */
  customerLoop: z.object({
    customerId: id,
    entryNeed: line,
    purchaseAssetId: id.describe('ID ổn định của món khách mua ở đầu vòng.'),
    purchaseMode: z.enum(['first_acquisition', 'restock', 'replacement', 'organization_order']),
    purchaseTerms: z.object({
      quantity: z.number().positive().max(1_000_000_000),
      unit: z.string().trim().min(1).max(60),
      consideration: line.describe('Đối giá cụ thể được trả trên trang: số tiền, tinh hạch, tài nguyên hoặc điều khoản định lượng.'),
    }).strict(),
    purchase: line,
    useToEarn: line,
    publicProof: line,
    returnUpgradeAssetId: id.describe('ID ổn định của món khách quay lại mua ở cuối vòng.'),
    returnUpgradeMode: z.enum(['higher_grade', 'new_capability', 'organization_scale', 'restock']),
    returnUpgradeTerms: z.object({
      quantity: z.number().positive().max(1_000_000_000),
      unit: z.string().trim().min(1).max(60),
      consideration: line.describe('Đối giá hoặc tiền cọc cụ thể của lần quay lại.'),
    }).strict(),
    returnUpgrade: line,
    schedule: z.object({
      purchaseChapter: z.number().int().min(1),
      useToEarnChapter: z.number().int().min(1),
      publicProofChapter: z.number().int().min(1),
      returnUpgradeChapter: z.number().int().min(1),
    }).strict(),
  }).strict().nullable(),
  /** Rolling: beats for the next 3 chapters only. */
  beatSheets: z.array(z.object({
    chapterNumber: z.number().int().min(1),
    sceneMode: SceneModeSchema,
    /** The concrete first movement that pays the previous chapter's last line. */
    openingBridge: line,
    /** A choice/action only the protagonist makes; allies may execute after it. */
    protagonistMove: line,
    /** 2–4 beats. Prose intent, never state deltas. */
    beats: z.array(line).min(2).max(4),
    /** What materially exists, changes hands or changes status before the hook. */
    materialOutcome: line,
    /** What the reader should feel by the last line. */
    emotionalTarget: line,
    /** At least one new named thing this chapter introduces. */
    newNamedThing: line.nullable(),
    prerequisiteIds: z.array(id).max(24).default([]),
    revealsFactIds: z.array(id).max(24).default([]),
    advancesMilestoneIds: z.array(id).max(12).default([]),
    /** Bind a product scene to the approved cross-world value gap instead of generic amazement. */
    valueContrastId: id.nullable().optional(),
    /** Concrete use/reaction/result that makes the value gap pleasurable on the page. */
    valueExperience: line.nullable().optional(),
    /**
     * Every quantity that changes hands in this chapter, declared by the planner and
     * validated by code before any prose exists. Code renders it into the numbers the
     * Writer shows and applies it to the ledger at commit; nobody reconstructs
     * arithmetic from prose afterwards.
     */
    ledger: z.array(AssetEventSchema).max(8).optional(),
    endHookKind: z.enum(['threat', 'question', 'declaration', 'opportunity', 'reward', 'reveal']),
  }).strict()).min(1).max(3),
  /** Human/auditor findings carried unchanged into every Writer brief for this replan. */
  editorialNotes: z.array(para).max(8).default([]),
}).strict();

function validateCyclePlan(cycle: z.infer<typeof CyclePlanObjectSchema>, ctx: z.RefinementCtx, minimumSpan: number): void {
  const span = cycle.plannedEndChapter - cycle.startChapter + 1;
  if (span < minimumSpan || span > 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['plannedEndChapter'],
      message: minimumSpan === 1 ? 'A rolling window spans 1-15 chapters.' : 'A cycle spans 5-15 chapters.',
    });
  }
  cycle.beatSheets.forEach((sheet, index) => {
    if (index > 0 && sheet.chapterNumber !== cycle.beatSheets[index - 1].chapterNumber + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['beatSheets', index, 'chapterNumber'],
        message: 'Rolling beat sheets must cover consecutive chapters.',
      });
    }
    if (sheet.chapterNumber > cycle.plannedEndChapter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['beatSheets', index, 'chapterNumber'],
        message: 'A beat sheet cannot sit beyond plannedEndChapter.',
      });
    }
  });
  const plannedModes = cycle.beatSheets.map(sheet => sheet.sceneMode);
  if (minimumSpan === 5 && cycle.schemaVersion === 1 && new Set(plannedModes).size !== plannedModes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['beatSheets'],
      message: 'A rolling beat window must use a different dominant scene mode for each chapter.',
    });
  }
  // The customer loop is a commerce-archetype requirement, checked where the premise is known.
  if (minimumSpan === 5 && cycle.schemaVersion === 1 && (cycle.climax.witnesses.length === 0
    || cycle.beatSheets.some(sheet => !sheet.newNamedThing))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cycle v1 requires witnesses and one new named thing per beat.' });
  }
  const schedule = cycle.customerLoop?.schedule;
  if (!schedule) return;
  if (minimumSpan === 5 && cycle.schemaVersion === 1 && (schedule.purchaseChapter < cycle.startChapter || schedule.purchaseChapter > cycle.startChapter + 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerLoop', 'schedule', 'purchaseChapter'],
      message: 'The customer purchase must land in the first two chapters of the cycle.',
    });
  }
  const ordered = [
    schedule.purchaseChapter,
    schedule.useToEarnChapter,
    schedule.publicProofChapter,
    schedule.returnUpgradeChapter,
  ];
  if (ordered.some((chapter, index) => index > 0 && chapter <= ordered[index - 1])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerLoop', 'schedule'],
      message: 'Purchase, use-to-earn, public proof and return upgrade must land in four consecutive-order chapter slots.',
    });
  }
  if (minimumSpan === 5 && cycle.schemaVersion === 1 && schedule.returnUpgradeChapter > Math.min(cycle.plannedEndChapter, cycle.startChapter + 4)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerLoop', 'schedule', 'returnUpgradeChapter'],
      message: 'The full customer loop must close within the first five chapters of the cycle.',
    });
  }
}

/**
 * What the planner model is asked to return: the plan's shape without its cross-field
 * rules. Chapter spans, loop schedules and paired fields are mechanical; a model that
 * gets one wrong has not made a story mistake, and rejecting its whole plan for it is
 * how the old factory lost 46% of its planning runs. `normalizeCyclePlanShape` repairs
 * those fields in code; only what it cannot repair reaches the strict schema.
 */
export const CyclePlanShapeSchema = CyclePlanObjectSchema;
type CyclePlanShape = z.infer<typeof CyclePlanShapeSchema>;

export function normalizeCyclePlanShape(plan: CyclePlanShape, options: { rolling: boolean }): CyclePlanShape {
  const start = plan.startChapter;
  let end = plan.plannedEndChapter;
  if (!options.rolling) end = Math.min(Math.max(end, start + 4), start + 14);
  const first = plan.beatSheets[0]?.chapterNumber ?? start;
  const beatSheets = plan.beatSheets
    .map((beat, index) => {
      const paired = Boolean(beat.valueContrastId) && Boolean(beat.valueExperience);
      return {
        ...beat,
        chapterNumber: first + index,
        valueContrastId: paired ? beat.valueContrastId : null,
        valueExperience: paired ? beat.valueExperience : null,
      };
    })
    .filter((beat, index) => index === 0 || beat.chapterNumber <= end);
  end = Math.max(end, beatSheets[0]?.chapterNumber ?? end);
  let customerLoop = plan.customerLoop;
  if (customerLoop && !options.rolling) {
    const { purchaseChapter, useToEarnChapter, publicProofChapter, returnUpgradeChapter } = customerLoop.schedule;
    const ordered = [purchaseChapter, useToEarnChapter, publicProofChapter, returnUpgradeChapter];
    const valid = ordered.every((chapter, index) => index === 0 || chapter > ordered[index - 1])
      && purchaseChapter >= start && purchaseChapter <= start + 1
      && returnUpgradeChapter <= Math.min(end, start + 4);
    if (!valid) customerLoop = {
      ...customerLoop,
      schedule: {
        purchaseChapter: start,
        useToEarnChapter: start + 1,
        publicProofChapter: start + 2,
        returnUpgradeChapter: Math.min(start + 3, end),
      },
    };
  }
  return { ...plan, plannedEndChapter: end, beatSheets, customerLoop };
}

/** Durable cycle contract. A new cycle owns a five-to-fifteen chapter promise. */
export const CyclePlanSchema = CyclePlanObjectSchema.superRefine((cycle, ctx) => validateCyclePlan(cycle, ctx, 5));

/** Rolling planning contract. It may cover the final one or two chapters of a durable cycle. */
export const RollingCyclePlanSchema = CyclePlanObjectSchema.superRefine((cycle, ctx) => validateCyclePlan(cycle, ctx, 1));
export type CyclePlan = z.infer<typeof CyclePlanSchema>;

// ----------------------------------------------------------------- Digest

/** Extracted from prose that was actually written, by a cheap model. */
export const ChapterDigestSchema = z.object({
  chapterNumber: z.number().int().min(1),
  title: line,
  summary: line,
  payoffKind: PayoffKindSchema.nullable(),
  endedOn: line,
  newNamedThings: z.array(line).max(8),
  narrativeEvidence: z.array(NarrativeEvidenceSchema).max(24).default([]),
  coreChanges: z.object({
    storyDayDelta: z.number().int().min(0).max(3_650),
    died: z.array(id).max(8),
    progressionChanges: z.array(z.object({
      subjectId: id, systemId: id, trackId: id.nullable().default(null),
      toRankId: id, toMinorStageId: id.nullable().default(null), why: line,
    }).strict()).max(16),
    assetEvents: z.array(AssetEventSchema).max(24).default([]),
    goldenFingerRungChange: z.object({ toRungId: id, why: line }).strict().nullable().default(null),
    moved: z.array(z.object({ characterId: id, toLocationId: id }).strict()).max(24),
    worldFactsRevealed: z.array(z.object({ id, note: para }).strict()).max(8),
    newCast: z.array(z.object({
      id, name: line, sheet: para, role: line, locationId: id,
      startingProgressions: z.array(ProgressionRefSchema).max(8).default([]),
    }).strict()).max(8),
    hooksPlanted: z.array(z.object({ id, what: line, dueByChapter: z.number().int().min(1) }).strict()).max(6),
    hooksPaid: z.array(id).max(6),
    learnedFinger: z.array(id).max(8),
  }).strict(),
}).strict();
export type ChapterDigest = z.infer<typeof ChapterDigestSchema>;
/** What a v2 extractor is asked for: the digest without lived-causality evidence. */
export const LegacyChapterDigestSchema = ChapterDigestSchema.omit({ narrativeEvidence: true })
  .transform(digest => ({ ...digest, narrativeEvidence: [] as ChapterDigest['narrativeEvidence'] }));

// ---------------------------------------------------------------- Verdict

const score = z.number().int().min(0).max(5);

/**
 * The judge reads as a reader. Only `continuity` blocks, and only with a verbatim
 * quote — the finding has to be something a reader could point at. Everything else
 * steers the next cycle plan instead of stopping the line.
 */
export const JudgeReviewBindingSchema = z.object({
  chapterNumber: z.number().int().min(1),
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().min(24).max(400),
}).strict();

/**
 * Continuity a reader would call a plot hole. Anything else a judge cites — a price
 * that drifted, a receipt without a supplier — is repaired once and then committed:
 * numbers are owned by the planned ledger, so a prose slip is a typo, not a reason to
 * throw the chapter away. Discarding eventful chapters for arithmetic is what left
 * only uneventful ones alive in the September pilots.
 */
export const HARD_CONTINUITY_KINDS = [
  'dead_returns', 'progression_regressed', 'location_impossible', 'timeline',
  'knows_too_much', 'contradicts_bible', 'golden_finger_scope', 'progression_contradiction',
] as const;
export const SOFT_CONTINUITY_KINDS = ['transaction_contradiction', 'resource_provenance', 'meta_leak', 'process_prose'] as const;

/**
 * Words that only exist in the brief. A reader who meets "một thứ mới có tên" or "ở
 * chương 2" inside the story has been shown the machinery; the pilot of 2026-09-23 did
 * exactly that. Detected in code and repaired like any other slip.
 */
const META_LEAK = /thứ mới có tên|bangSoLieu|hinhDangChuong|openingBridge|protagonistMove|materialOutcome|beat ?sheet|(?:^|\s)(?:ở|từ|trong|tại) chương \d+|【\s*\d+\.\s/iu;

/**
 * Bookkeeping and inspection vocabulary. The failure every engine here has slid into is
 * a chapter spent on ledgers, samples and verification: the two September pilots rose
 * from ~8 to 20–27 of these per thousand words by chapter ten, and the first chapter-four
 * on the fixed engine was already at 15. Measured in code, so no judge has to be asked
 * whether caution is interesting.
 */
const PROCESS_WORDS = [
  'kiểm', 'mẫu', 'ghi', 'sổ', 'xác nhận', 'đối chứng', 'giới hạn', 'không hứa', 'quyết toán',
  'tín dụng', 'ghi có', 'số dư', 'khoản', 'phiếu', 'chứng từ', 'thủ tục',
];
export const PROCESS_DENSITY_LIMIT = 14;

const countProcessWords = (text: string): number => {
  const lower = text.toLowerCase();
  return PROCESS_WORDS.reduce((sum, word) => sum + lower.split(word).length - 1, 0);
};

/** Bookkeeping words per thousand words of prose. */
export function processDensity(prose: string): number {
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  return words === 0 ? 0 : Number((countProcessWords(prose) * 1_000 / words).toFixed(1));
}

export function processProseFindings(prose: string): Array<{ kind: 'process_prose'; quote: string; explain: string }> {
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  const density = processDensity(prose);
  if (words < 600 || density <= PROCESS_DENSITY_LIMIT) return [];
  return prose.split(/\r?\n/).map(line => line.trim()).filter(line => line.length >= 12)
    .map(line => ({ line, hits: countProcessWords(line) }))
    .filter(item => item.hits >= 2)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map(item => ({
      kind: 'process_prose' as const,
      quote: item.line.slice(0, 400),
      explain: `Chương dành ${density} từ sổ sách/kiểm định trên 1.000 từ (ngưỡng ${PROCESS_DENSITY_LIMIT}). Rút đoạn này thành một câu hoặc thay bằng hành động, phản ứng và kết quả nhìn thấy.`,
    }));
}

export function metaLeakFindings(prose: string): Array<{ kind: 'meta_leak'; quote: string; explain: string }> {
  return prose.split(/\r?\n/).filter(line => META_LEAK.test(line)).slice(0, 5).map(line => ({
    kind: 'meta_leak' as const,
    quote: line.trim().slice(0, 400),
    explain: 'Câu này nhắc tới cách viết (luật, số chương, trường dữ liệu) thay vì chuyện trong truyện; viết lại thành diễn biến hoặc xoá.',
  }));
}

export const JudgeVerdictSchema = z.object({
  continuity: z.array(z.object({
    kind: z.enum([...HARD_CONTINUITY_KINDS, ...SOFT_CONTINUITY_KINDS]),
    quote: z.string().trim().min(4).max(400),
    explain: line,
  }).strict()).max(10),
  scorecard: z.object({
    /** Did the opening advance something the reader cares about? */
    opening: score,
    /** How desirable and concrete is the result the reader anticipates? */
    anticipation: score,
    /** Did a payoff land with a named, visible result? */
    payoff: score,
    /** Did at least one new named thing enter? */
    newness: score,
    /** Is there something specific worth reading next? */
    endHook: score,
  }).strict(),
  craft: z.object({
    /** Does the protagonist choose, act, work or gain something only they can carry forward? */
    protagonistAgency: score,
    /** Does the chapter play as a lived scene rather than a report, ledger or product demo? */
    sceneLife: score,
    /** Do travel, technology, causality and institutions obey the supplied world rules? */
    worldLogic: score,
    /** Do people speak from immediate wants in distinct voices instead of stating the theme? */
    dialogueNaturalness: score,
    /** Is the reward structure materially different from the recent chapters? */
    structuralFreshness: score,
  }).strict(),
  repetition: z.array(z.object({ quote: z.string().trim().min(4).max(400), repeatsChapter: z.number().int().min(1), note: line }).strict()).max(6),
  /** 排比三连 · 空洞抒情 · 万能过渡 · 万能形容词 · 情感标签 */
  aiFlavor: z.array(z.object({
    quote: z.string().trim().min(4).max(400),
    kind: z.enum([
      'parallel_triple', 'empty_lyricism', 'generic_transition', 'generic_adjective', 'emotion_label',
      'report_prose', 'theme_spoken', 'crowd_chorus',
    ]),
  }).strict()).max(10),
  /**
   * Retired 2026-09-26: the Judge used to steer the next cycle, and a third of its steering
   * asked for clauses, witnesses and re-inspections, which turned every protagonist into a
   * clerk. Direction now comes from the premise ladder. Kept readable for stored verdicts.
   */
  steering: z.array(line).max(5).default([]),
  /** Optional only so verdicts persisted before prompt v30 remain readable. New calls require it. */
  reviewBinding: JudgeReviewBindingSchema.optional(),
}).strict();
/**
 * What the Judge model is asked for: no steering field, a required review binding. A model
 * that still volunteers steering out of habit has it dropped, not the whole verdict refused.
 */
export const JudgeProviderVerdictSchema = z.preprocess(
  value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const { steering: _dropped, ...rest } = value as Record<string, unknown>;
    return rest;
  },
  JudgeVerdictSchema.omit({ steering: true }).extend({ reviewBinding: JudgeReviewBindingSchema }),
);
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

// ---------------------------------------------------------- Opening audit

/**
 * What an editor checks before a book enters the library: did the golden finger pay
 * out, did every chapter leave something to want, did the title's promise start to
 * cash. The first three kinds survive only so audits persisted before 2026-09-23 still
 * parse; the auditor is no longer asked to do inventory arithmetic.
 */
export const LEGACY_OPENING_AUDIT_KINDS = ['inventory_arithmetic', 'resource_provenance', 'transaction_continuity'] as const;
export const OPENING_AUDIT_KINDS = [
  'golden_finger_late',
  'reward_hook_missing',
  'title_promise_unpaid',
  'system_panel_missing',
  'opening_contract',
  'timeline',
  'format_duplicate_title',
  'unapproved_cost',
] as const;

const openingAuditSchema = <K extends [string, ...string[]]>(kinds: K) => z.object({
  passed: z.boolean(),
  summary: line,
  findings: z.array(z.object({
    kind: z.enum(kinds),
    chapterNumber: z.number().int().min(1).max(4),
    quote: z.string().trim().min(4).max(500),
    explain: line,
    repair: line,
  }).strict()).max(12),
}).strict().superRefine((audit, ctx) => {
  if (audit.passed !== (audit.findings.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['passed'],
      message: 'passed must be true exactly when findings is empty.',
    });
  }
});

/** Persisted audits, including the retired arithmetic kinds. */
export const OpeningAuditSchema = openingAuditSchema([...OPENING_AUDIT_KINDS, ...LEGACY_OPENING_AUDIT_KINDS]);
/** What the auditor model may return today. */
export const OpeningAuditProviderSchema = openingAuditSchema([...OPENING_AUDIT_KINDS]);

/**
 * The one reader of `serial_runs.opening_audit`. The runtime stores the audit together
 * with the (v3-only) narrative review; every consumer goes through here, so the writer
 * and the readers cannot drift apart again.
 */
export function storedOpeningAudit(audit: OpeningAudit, narrativeReview: unknown): Record<string, unknown> {
  return { ...audit, narrativeReview: narrativeReview ?? null };
}

export function readStoredOpeningAudit(value: unknown): OpeningAudit | null {
  if (!value || typeof value !== 'object') return null;
  const { narrativeReview: _review, ...audit } = value as Record<string, unknown>;
  const parsed = OpeningAuditSchema.safeParse(audit);
  return parsed.success ? parsed.data : null;
}
export type OpeningAudit = z.infer<typeof OpeningAuditSchema>;

export const CHAPTER_WORD_RANGE = { min: 1_600, max: 2_600 } as const;

/** The five reader-pull dimensions only: did this chapter make anyone want the next one. */
export function pullAverage(verdict: JudgeVerdict): number {
  const s = verdict.scorecard;
  return (s.opening + s.anticipation + s.payoff + s.newness + s.endHook) / 5;
}

export function scorecardAverage(verdict: JudgeVerdict): number {
  const s = verdict.scorecard;
  const c = verdict.craft;
  return (
    s.opening + s.anticipation + s.payoff + s.newness + s.endHook
    + c.protagonistAgency + c.sceneLife + c.worldLogic + c.dialogueNaturalness + c.structuralFreshness
  ) / 10;
}

// ------------------------------------------------------------- Model output

/** Writer output. Length is telemetry, never a gate — the judge reads, it does not count. */
export const ChapterDraftSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(800),
}).strict();
export type ChapterDraft = z.infer<typeof ChapterDraftSchema>;

/** Exact, versioned routes. No substitution: a failed call retries the same model. */
export const SerialRoutesSchema = z.object({
  premise: z.string().trim().min(3),
  planner: z.string().trim().min(3),
  writer: z.string().trim().min(3),
  judge: z.string().trim().min(3),
  extractor: z.string().trim().min(3),
  routeVersion: z.string().trim().min(3),
}).strict();
export type SerialRoutes = z.infer<typeof SerialRoutesSchema>;

/**
 * Only the Faloo-shaped premise (schema v2) may start or continue a story. Schema v3
 * ("lived-causality", 2026-09-21) replaced the craft playbook with rules forbidding
 * transactions, ranks, new names and crowds unless earned slowly; both pilots written
 * under it spent ten chapters on inspection forms and never paid the title's promise.
 * v3 still parses so its stored novels stay readable. See
 * docs/WRITING_SYSTEM_AUDIT_2026-09-23.md.
 */
export function assertSerialLaunchable(premise: Premise): void {
  if (premise.schemaVersion !== 2) {
    throw new Error('Serial chỉ khởi chạy premise văn phạm Faloo (schemaVersion 2). Premise v3 lived-causality đã ngừng dùng từ 2026-09-23.');
  }
  const problems = premiseLint(premise);
  if (problems.length) throw new Error(`Premise chưa đạt văn phạm Faloo: ${problems.join(' | ')}`);
}

/**
 * The premise is copied into every chapter's brief, so whatever it dwells on the prose
 * dwells on. The first fixed-engine pilot spent a scene of chapter four on a "hunter
 * credit ledger" because the approved opening ledger was written as accounting (credits,
 * balances, "no credit arises", "paid in chapter two"). A hook that postpones the title's
 * promise ("before selling techniques he must understand…") produced ten chapters of
 * postponement. Both are rejected before approval.
 */
const BOOKKEEPING = /tín dụng|ghi có|số dư|quyết toán|phát sinh|khấu trừ|người thanh toán|nghĩa vụ|(?:^|\s)chương (?:một|hai|ba|bốn|\d+)/iu;
const POSTPONED_PROMISE = /trước khi (?:bán|mở|kiếm|lên cấp|thành)|rồi mới (?:bán|mở|hình thành)|từng bước[^.]{0,40}rồi mới/iu;

export function premiseLint(premise: Premise): string[] {
  const problems: string[] = [];
  for (const entry of premise.worldKernel.openingLedger) {
    const text = `${entry.quantity} ${entry.consideration} ${entry.resultingStatus}`;
    if (BOOKKEEPING.test(text)) problems.push(`openingLedger ${entry.id} viết như sổ kế toán hoặc nhắc số chương`);
    if (entry.consideration.length + entry.resultingStatus.length > 240) problems.push(`openingLedger ${entry.id} dài quá 240 ký tự`);
  }
  for (const [field, value] of [['hook', premise.hook], ['readerFantasy', premise.readerFantasy]] as const) {
    if (POSTPONED_PROMISE.test(value)) problems.push(`${field} trì hoãn lời hứa thay vì hứa nó`);
  }
  if (!premise.title.includes(':') || /^\s*(đấu trường|đấu truong|arena)\s*:/iu.test(premise.title)) {
    problems.push('title phải có dạng "Thể loại: lợi thế + phần thưởng", không chép nhãn công thức');
  }
  if (premise.goldenFinger.evolution.length < 6 || premise.goldenFinger.evolution.length > 8) {
    problems.push('kim thủ chỉ cần 6–8 nấc có tên');
  }
  return problems;
}
