import { z } from 'zod';
import { payoffKindIds } from './playbook';

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

const id = z.string().trim().regex(/^[a-z0-9_]{2,48}$/, 'stable id: lowercase, digits, underscore');
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

export const PremiseSchema = z.object({
  schemaVersion: z.literal(2),
  lane: z.enum(LANES),
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
    /** 6–8 rungs, each changing HOW it is used, never only the number. */
    evolution: z.array(z.object({ id, name: line, changesUse: line })).min(6).max(8),
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

  /** ≥6 named people at launch, ≥2 antagonists in two different classes. */
  castSeed: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(60),
    role: z.enum(['protagonist', 'ally', 'antagonist', 'authority', 'rival', 'family']),
    /** What they want for themselves, independent of the protagonist. */
    agenda: line,
    antagonistClass: z.string().trim().max(60).nullable().default(null),
    startLocationId: id,
    startingProgressions: z.array(ProgressionRefSchema).max(8).default([]),
    milestones: z.array(MilestoneSchema).min(3).max(5),
  }).strict()).min(6).max(12),

  /** Complete approved canon. The living Bible only stores facts already shown in prose. */
  worldKernel: z.object({
    worlds: z.array(z.object({
      id,
      name: line,
      civilizationState: para,
      locations: z.array(z.object({ id, name: line, note: para }).strict()).min(2).max(20),
      factions: z.array(z.object({ id, name: line, agenda: para }).strict()).min(2).max(20),
    }).strict()).length(2),
    progressionSystems: z.array(z.object({
      id,
      name: line,
      kind: z.enum(['realm', 'profession', 'organization', 'business', 'ability']),
      subjectType: z.enum(['character', 'asset', 'faction', 'company']),
      tracks: z.array(RankSchema).max(12).default([]),
      ranks: z.array(RankSchema).min(2).max(24),
      minorStages: z.array(RankSchema).max(12).default([]),
    }).strict()).min(3).max(16),
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
    })).min(2).max(16),
    equivalences: z.array(z.object({
      leftSystemId: id, leftRankId: id, rightSystemId: id, rightRankId: id, note: para,
    }).strict()).max(24).default([]),
    economyLoops: z.array(z.object({
      id, name: line, fromWorldId: id, toWorldId: id,
      goods: z.array(line).min(1).max(12), buyer: line, settlement: line, reinvestment: para,
    }).strict()).min(2).max(12),
    launchProducts: z.array(z.object({
      id, name: line, category: line, gradeSystemId: id,
      tierId: id.nullable().default(null), qualityId: id.nullable().default(null),
      effect: para, targetBuyer: line, introducedChapter: z.number().int().min(1).max(4),
    }).strict()).min(4).max(16),
    openingContract: z.array(z.object({
      chapterNumber: z.number().int().min(1).max(4),
      proves: para,
      namedLevelOrGrade: line,
      visibleResult: line,
      witnessReaction: line,
      commercialAction: line,
    }).strict()).length(4),
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
    }).strict()).min(4).max(24),
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
}).strict().superRefine((premise, ctx) => {
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
  if (premise.castSeed.filter(member => member.role === 'protagonist').length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['castSeed'], message: 'Premise needs exactly one protagonist.' });
  }
  const antagonistClasses = new Set(premise.castSeed
    .filter(member => member.role === 'antagonist' && member.antagonistClass)
    .map(member => member.antagonistClass));
  if (antagonistClasses.size < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['castSeed'], message: 'Premise needs antagonists from at least two classes.' });
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
    const grade = grades.get(product.gradeSystemId);
    if (!grade) return ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'gradeSystemId'], message: 'Unknown grade system.' });
    if (product.tierId && !grade.tiers.some(tier => tier.id === product.tierId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'tierId'], message: 'Unknown product tier.' });
    if (product.qualityId && !grade.qualities.some(quality => quality.id === product.qualityId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'launchProducts', index, 'qualityId'], message: 'Unknown product quality.' });
  });
  const chapters = premise.worldKernel.openingContract.map(item => item.chapterNumber).sort();
  if (chapters.join(',') !== '1,2,3,4') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['worldKernel', 'openingContract'], message: 'Opening contract must cover chapters 1, 2, 3 and 4 exactly once.' });
});
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

/** A 副本: pressure, escalation, release. 5–15 chapters. */
export const CyclePlanSchema = z.object({
  schemaVersion: z.literal(1),
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
    witnesses: z.array(line).min(1).max(6),
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
  }).strict(),
  /** Rolling: beats for the next 3 chapters only. */
  beatSheets: z.array(z.object({
    chapterNumber: z.number().int().min(1),
    /** 2–4 beats. Prose intent, never state deltas. */
    beats: z.array(line).min(2).max(4),
    /** What the reader should feel by the last line. */
    emotionalTarget: line,
    /** At least one new named thing this chapter introduces. */
    newNamedThing: line,
    endHookKind: z.enum(['threat', 'question', 'declaration', 'opportunity', 'reward', 'reveal']),
  }).strict()).min(1).max(3),
  /** Human/auditor findings carried unchanged into every Writer brief for this replan. */
  editorialNotes: z.array(para).max(8).default([]),
}).strict().superRefine((cycle, ctx) => {
  const span = cycle.plannedEndChapter - cycle.startChapter + 1;
  if (span < 5 || span > 15) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plannedEndChapter'], message: 'A cycle spans 5-15 chapters.' });
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
  const schedule = cycle.customerLoop.schedule;
  if (schedule.purchaseChapter < cycle.startChapter || schedule.purchaseChapter > cycle.startChapter + 1) {
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
  if (schedule.returnUpgradeChapter > Math.min(cycle.plannedEndChapter, cycle.startChapter + 4)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerLoop', 'schedule', 'returnUpgradeChapter'],
      message: 'The full customer loop must close within the first five chapters of the cycle.',
    });
  }
});
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

// ---------------------------------------------------------------- Verdict

const score = z.number().int().min(0).max(5);

/**
 * The judge reads as a reader. Only `continuity` blocks, and only with a verbatim
 * quote — the finding has to be something a reader could point at. Everything else
 * steers the next cycle plan instead of stopping the line.
 */
export const JudgeVerdictSchema = z.object({
  continuity: z.array(z.object({
    kind: z.enum([
      'dead_returns', 'progression_regressed', 'location_impossible', 'timeline',
      'knows_too_much', 'contradicts_bible', 'golden_finger_scope',
      'transaction_contradiction', 'resource_provenance', 'progression_contradiction',
    ]),
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
  /** Free-form direction for the next cycle plan. Never applied to this chapter. */
  steering: z.array(line).max(5),
}).strict();
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

// ---------------------------------------------------------- Opening audit

/** Objective cross-chapter defects that a per-chapter judge cannot see. */
export const OpeningAuditFindingSchema = z.object({
  kind: z.enum([
    'inventory_arithmetic',
    'resource_provenance',
    'transaction_continuity',
    'timeline',
    'format_duplicate_title',
    'opening_contract',
    'unapproved_cost',
  ]),
  chapterNumber: z.number().int().min(1).max(4),
  quote: z.string().trim().min(4).max(500),
  explain: line,
  repair: line,
}).strict();

export const OpeningAuditSchema = z.object({
  passed: z.boolean(),
  summary: line,
  findings: z.array(OpeningAuditFindingSchema).max(12),
}).strict().superRefine((audit, ctx) => {
  if (audit.passed !== (audit.findings.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['passed'],
      message: 'passed must be true exactly when findings is empty.',
    });
  }
});
export type OpeningAudit = z.infer<typeof OpeningAuditSchema>;

export const CHAPTER_WORD_RANGE = { min: 1_600, max: 2_600 } as const;

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
