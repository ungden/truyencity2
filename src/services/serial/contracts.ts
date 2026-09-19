import { z } from 'zod';

/**
 * Artifacts for the serial engine.
 *
 * The rule that shapes every schema here: the Writer may invent freely, and is
 * constrained only by what a reader could catch. So durable state splits in two.
 * `symbolicCore` is a short, machine-checked list of facts a contradiction would
 * be obvious on — who is dead, what tier someone holds, where they stand, what
 * day it is, which hooks are still open. Everything else is prose the models read
 * and rewrite. The previous engine tried to make the whole world machine-checked;
 * it produced arithmetically perfect chapters in which nothing happened.
 *
 * See docs/FALOO_CRAFT.md for the measurements these contracts encode.
 */

const id = z.string().trim().regex(/^[a-z0-9_]{2,48}$/, 'stable id: lowercase, digits, underscore');
const line = z.string().trim().min(1).max(400);
const para = z.string().trim().min(1).max(1_200);

/** The 15 satisfaction beats Faloo rotates. Code forbids repeating one in adjacent cycles. */
export const PAYOFF_KINDS = [
  'va_mat',            // đối thủ coi thường bị đập mặt
  'nghich_tap',        // từ đáy vươn lên
  'nghien_ep',         // thực lực áp đảo
  'giau_manh',         // giấu mạnh rồi lộ
  'pha_vay',           // thoát vòng vây
  'tri_thang',         // thắng bằng mưu
  'kho_bau',           // được báu vật/tài nguyên hiếm
  'duoc_cong_nhan',    // được tập thể/quyền lực thừa nhận
  'cuu_nguy',          // cứu người/cứu cục diện
  'ky_ngo',            // gặp cơ duyên
  'dot_pha',           // lên cấp bậc có tên
  'ke_manh_tro_ve',    // thế lực bạn xuất hiện
  'tuyet_dia_phan_kich', // lật ngược từ tuyệt vọng
  'tinh_truong',       // quan hệ tiến triển
  'luc_van_cuong_lan', // gánh cả cục diện
] as const;
export type PayoffKind = (typeof PAYOFF_KINDS)[number];

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
export const PremiseSchema = z.object({
  schemaVersion: z.literal(1),
  lane: z.enum(LANES),
  /** `ĐẤU TRƯỜNG: nhân vật + lợi thế + payoff`, the measured Faloo formula. */
  title: z.string().trim().min(12).max(120),
  /** One line a reader decides on. */
  hook: line,
  /** Bán hàng: áp lực → lợi thế → payoff đầu → leo thang. Never world history first. */
  blurb: z.string().trim().min(200).max(1_200),
  /** What the reader is here to feel. Not a plot summary. */
  readerFantasy: line,

  goldenFinger: z.object({
    name: z.string().trim().min(2).max(60),
    /** Stated the way the reader will see it, not as an internal mechanic. */
    rule: para,
    /**
     * What the advantage does NOT reach — a boundary on scale, never a punishment.
     *
     * This field used to be called `limit` and asked what the advantage "costs".
     * That wording manufactured exactly what readers have turned against: systems
     * that bill the protagonist in lifespan, debt, injury or permanent poverty.
     * Scope keeps the planner honest about what the advantage cannot solve, which
     * is what preserves anticipation, without ever turning the advantage into the
     * antagonist.
     */
    scope: para,
    /** 6–8 rungs, each changing HOW it is used, never only the number. */
    evolution: z.array(z.object({ id, name: line, changesUse: line })).min(6).max(8),
  }).strict(),

  /**
   * Where resistance comes from, by contract: people who want what the protagonist
   * has, or who lose something when he wins. Every cycle's pressure has to be
   * traceable to this, not to the advantage misfiring.
   */
  oppositionEngine: para,

  /** The only progression measure code understands. Named rungs, lowest first. */
  tierLadder: z.array(z.object({ id, name: z.string().trim().min(2).max(60) })).min(6).max(20),

  /** ≥6 named people at launch, ≥2 antagonists in two different classes. */
  castSeed: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(60),
    role: z.enum(['protagonist', 'ally', 'antagonist', 'authority', 'rival', 'family']),
    /** What they want for themselves, independent of the protagonist. */
    agenda: line,
    antagonistClass: z.string().trim().max(60).nullable().default(null),
  }).strict()).min(6).max(12),

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
    taboos: z.array(line).max(12).default([]),
  }).strict(),
}).strict();
export type Premise = z.infer<typeof PremiseSchema>;

// ------------------------------------------------------------------ Bible

/** Machine-checked. Small on purpose: a reader would catch a contradiction in any of it. */
export const SymbolicCoreSchema = z.object({
  storyDay: z.number().int().nonnegative(),
  chapterNumber: z.number().int().nonnegative(),
  mc: z.object({
    tierId: id,
    locationId: id,
    keyAssetIds: z.array(id).max(24),
  }).strict(),
  cast: z.array(z.object({
    id,
    alive: z.boolean(),
    tierId: id.nullable(),
    locationId: id,
    lastSeenChapter: z.number().int().nonnegative(),
    /** Does this character know about the golden finger? Information boundary. */
    knowsFinger: z.boolean().default(false),
  }).strict()).max(120),
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
  schemaVersion: z.literal(1),
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
    payoffKind: z.enum(PAYOFF_KINDS).nullable(),
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
  /** 小不爽 — what is denied, taken or threatened at the start. */
  pressure: para,
  /** 3–6 steps that make it worse before it gets better. */
  escalation: z.array(line).min(3).max(6),
  climax: z.object({
    payoffKind: z.enum(PAYOFF_KINDS),
    /** The visible, material result. "He wins" is not a result. */
    result: para,
    /** Who sees it happen. A payoff nobody witnesses does not land. */
    witnesses: z.array(line).min(1).max(6),
  }).strict(),
  aftermath: para,
  /** The expectation this cycle leaves burning for the next one. */
  nextHook: para,
  /** Rolling: beats for the next 3 chapters only. */
  beatSheets: z.array(z.object({
    chapterNumber: z.number().int().min(1),
    /** 2–4 beats. Prose intent, never state deltas. */
    beats: z.array(line).min(2).max(4),
    /** What the reader should feel by the last line. */
    emotionalTarget: line,
    /** At least one new named thing this chapter introduces. */
    newNamedThing: line,
    /** threat | question | declaration */
    endHookKind: z.enum(['threat', 'question', 'declaration']),
  }).strict()).min(1).max(3),
}).strict().superRefine((cycle, ctx) => {
  const span = cycle.plannedEndChapter - cycle.startChapter + 1;
  if (span < 5 || span > 15) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plannedEndChapter'], message: 'A cycle spans 5-15 chapters.' });
  }
});
export type CyclePlan = z.infer<typeof CyclePlanSchema>;

// ----------------------------------------------------------------- Digest

/** Extracted from prose that was actually written, by a cheap model. */
export const ChapterDigestSchema = z.object({
  chapterNumber: z.number().int().min(1),
  title: line,
  summary: line,
  payoffKind: z.enum(PAYOFF_KINDS).nullable(),
  endedOn: line,
  newNamedThings: z.array(line).max(8),
  coreChanges: z.object({
    storyDayDelta: z.number().int().min(0).max(3_650),
    died: z.array(id).max(8),
    tierChanges: z.array(z.object({ characterId: id, toTierId: id, why: line }).strict()).max(8),
    moved: z.array(z.object({ characterId: id, toLocationId: id }).strict()).max(24),
    newCast: z.array(z.object({ id, name: line, sheet: para, role: line }).strict()).max(8),
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
    kind: z.enum(['dead_returns', 'tier_regressed', 'location_impossible', 'timeline', 'knows_too_much', 'contradicts_bible']),
    quote: z.string().trim().min(4).max(400),
    explain: line,
  }).strict()).max(10),
  scorecard: z.object({
    /** Did the chapter open on pressure instead of scenery? */
    opening: score,
    /** Was something withheld or denied before it was given? */
    anticipation: score,
    /** Did a payoff land with a named, visible result? */
    payoff: score,
    /** Did at least one new named thing enter? */
    newness: score,
    /** Did the last lines open a threat, a question or a declaration? */
    endHook: score,
  }).strict(),
  repetition: z.array(z.object({ quote: z.string().trim().min(4).max(400), repeatsChapter: z.number().int().min(1), note: line }).strict()).max(6),
  /** 排比三连 · 空洞抒情 · 万能过渡 · 万能形容词 · 情感标签 */
  aiFlavor: z.array(z.object({ quote: z.string().trim().min(4).max(400), kind: z.enum(['parallel_triple', 'empty_lyricism', 'generic_transition', 'generic_adjective', 'emotion_label']) }).strict()).max(10),
  /** Free-form direction for the next cycle plan. Never applied to this chapter. */
  steering: z.array(line).max(5),
}).strict();
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

export const CHAPTER_WORD_RANGE = { min: 1_600, max: 2_600 } as const;

export function scorecardAverage(verdict: JudgeVerdict): number {
  const s = verdict.scorecard;
  return (s.opening + s.anticipation + s.payoff + s.newness + s.endHook) / 5;
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
