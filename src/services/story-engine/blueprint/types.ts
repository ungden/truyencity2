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

export interface ChapterBrief {
  /** 1-indexed chapter number within the novel. */
  n: number;
  beat: BeatType;
  /** One-line goal of the chapter. */
  brief: string;
  /** 4-7 short scene descriptions. Writer expands each into a real scene. */
  scenes: string[];
  /**
   * Concrete benefit phrase — must contain at least one of the keywords in
   * `CONCRETE_BENEFIT_RE` (tài nguyên / uy tín / manh mối / network / ...).
   * Validated by `arc plan` writer at chapter time.
   */
  mcBenefit: string;
  /** Plot threads to advance in this chapter (optional). */
  threadsAdvance?: string[];
  /** Plot threads to resolve in this chapter (optional). */
  threadsResolve?: string[];
  /** New plot threads introduced in this chapter (optional). */
  newThreads?: string[];
  /**
   * Per-chapter ban list + tone directives. Injected into `sceneDirection`
   * field which writer reads. Universal bans (UNIVERSAL_BANNED_PATTERNS)
   * are auto-appended by sync — risks here are chapter-specific overrides.
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
   * Optional — extra ban patterns specific to this novel's genre/preset
   * appended after UNIVERSAL_BANNED_PATTERNS.
   */
  extraBannedPatterns?: string[];
  /**
   * Optional — extra tone directives (1-2 lines) appended to plan_text + every
   * chapter's sceneDirection.
   */
  toneDirectives?: string[];
}
