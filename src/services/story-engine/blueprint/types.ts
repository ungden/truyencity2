/**
 * Blueprint types — shared across all novels using the 1000-chapter pre-plan
 * approach.
 *
 * Blueprint workflow: tác giả (Claude/Codex) plan toàn bộ N chương trước khi
 * AI viết bất kỳ chương nào. AI chỉ expand brief → drift impossible.
 *
 * 5-chapter cluster pattern (default):
 *   ch.X+0: setup
 *   ch.X+1: breathing
 *   ch.X+2: confront
 *   ch.X+3: big_wow (mass face-slap, milestone, evolve visible)
 *   ch.X+4: resolution + breathing nhẹ
 */

export type BeatType = 'setup' | 'breathing' | 'confront' | 'big_wow' | 'resolution';

/**
 * Unified chapter brief — combines Codex's rich DB schema (chapter_blueprints
 * table, migration 0169) with Claude's authoring/cluster-pattern fields.
 *
 * Storage: 1 row per chapter in `chapter_blueprints` table.
 *   - DB columns: position + story + mechanics + lifecycle + forbidden_terms[]
 *   - JSONB `meta`: beat, scenes, mcBenefit, threads*, riskGuidance, toneDirectives
 *
 * Writer reads via `assertChapterBlueprintReady` + `formatChapterBlueprintContext`
 * (see src/services/story-engine/plan/chapter-blueprints.ts).
 */
export interface ChapterBrief {
  // ── Position ────────────────────────────────────────────────────────────
  /** 1-indexed chapter number within the novel. (DB: chapter_number) */
  n: number;
  /** 5-cluster beat — Claude's authoring pattern. (DB: meta.beat) */
  beat: BeatType;
  /** Volume number — for novels with volume hierarchy. (DB: volume_number) */
  volumeNumber?: number;
  /** Arc number 1..N. (DB: arc_number) */
  arcNumber?: number;
  /** Sub-arc number within arc. (DB: sub_arc_number) */
  subArcNumber?: number;

  // ── Story (rich, from Codex schema) ─────────────────────────────────────
  /** Optional title hint — writer may polish. (DB: title_hint) */
  titleHint?: string;
  /**
   * Concrete chapter goal. (DB: goal)
   * Falls back to `brief` if missing — at least one of {goal, brief} required.
   */
  goal?: string;
  /** Conflict / friction in the chapter. (DB: conflict) */
  conflict?: string;
  /**
   * Concrete payoff. (DB: payoff)
   * Falls back to `mcBenefit` if missing — at least one of {payoff, mcBenefit} required.
   */
  payoff?: string;
  /** Ending hook for next-chapter setup. (DB: ending_hook) */
  endingHook?: string;
  /** Cast members appearing in chapter. (DB: cast TEXT[]) */
  cast?: string[];
  /** Primary location. (DB: location) */
  location?: string;

  // ── Mechanics (Codex schema — domain-specific deltas) ───────────────────
  /** Resource ledger change. (DB: resource_ledger_delta) */
  resourceLedgerDelta?: string;
  /** Visible world-state change. (DB: world_state_delta) */
  worldStateDelta?: string;
  /** Species / dependent-race change (for ngu-thu, sang-the genres). (DB: species_delta) */
  speciesDelta?: string;
  /** Memory/template inspiration source. (DB: template_inspiration) */
  templateInspiration?: string;
  /** Authority/access constraints (academy, faction, log). (DB: authority_constraints) */
  authorityConstraints?: string;

  // ── Bans ────────────────────────────────────────────────────────────────
  /**
   * Literal strings auto-checked post-write by `evaluateBlueprintAlignment`.
   * Composed by sync = UNIVERSAL_FORBIDDEN_TERMS + per-novel extra +
   * per-chapter chapter-specific. (DB: forbidden_terms TEXT[])
   */
  forbiddenTerms?: string[];

  // ── Authoring / writer guidance (Claude's additions) ────────────────────
  /**
   * Legacy field — kept for backward compat with old briefs that don't have
   * goal/payoff explicit. Writers use goal+payoff for unified prompts.
   */
  brief?: string;
  /** 4-7 short scene phrases. (DB: meta.scenes) */
  scenes: string[];
  /**
   * Concrete benefit phrase — must contain CONCRETE_BENEFIT_RE keyword
   * (tài nguyên / uy tín / manh mối / network / ...). (DB: meta.mcBenefit)
   */
  mcBenefit: string;
  /** Plot threads to advance. (DB: meta.threadsAdvance) */
  threadsAdvance?: string[];
  /** Plot threads to resolve. (DB: meta.threadsResolve) */
  threadsResolve?: string[];
  /** New plot threads introduced. (DB: meta.newThreads) */
  newThreads?: string[];
  /**
   * High-level guidance instructions (NOT literal terms — for prompt only).
   * Per-chapter overrides; universal patterns auto-appended by sync.
   * (DB: meta.riskGuidance)
   */
  risks?: string[];
}

export interface SubArc {
  number: number;
  range: [number, number];
  theme: string;
  payoff: string;
}

export interface ArcSkeleton {
  arcNumber: number;
  range: [number, number];
  theme: string;
  corePayoff: string;
  subArcs: SubArc[];
}

/**
 * Per-arc blueprint = skeleton + detailed chapter briefs covering arc.range.
 *
 * Sync expects arc.subArcs to fully cover arc.range and briefs to cover the
 * same range (one brief per chapter).
 */
export interface ArcBlueprint {
  arc: ArcSkeleton;
  briefs: ChapterBrief[];
}

/**
 * Top-level novel blueprint. Used by sync script + spawn script.
 */
export interface NovelBlueprint {
  /** Stable identifier, e.g. "van-linh-pho-gia-toc". Matches focus_key. */
  id: string;
  title: string;
  slug: string;
  genre: string;
  totalChapters: number;
  /** All arcs covering ch.1 → totalChapters. */
  arcs: ArcBlueprint[];
  /**
   * Optional — high-level guidance ban patterns specific to this novel,
   * appended after UNIVERSAL_BANNED_PATTERNS. Goes into prompt only.
   */
  extraBannedPatterns?: string[];
  /**
   * Optional — literal forbidden terms specific to this novel, appended after
   * UNIVERSAL_FORBIDDEN_TERMS. Auto-checked post-write by evaluateBlueprintAlignment.
   */
  extraForbiddenTerms?: string[];
  /**
   * Optional — extra tone directives (1-2 lines) appended to plan_text + every
   * chapter's sceneDirection.
   */
  toneDirectives?: string[];
}
