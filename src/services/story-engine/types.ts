/**
 * Story Engine v2 — Type Definitions
 *
 * Single source of truth for all types used across the pipeline.
 * Every type here is actively used; no dead types.
 */

// ── Genre ────────────────────────────────────────────────────────────────────

export type GenreType =
  | 'tien-hiep' | 'huyen-huyen' | 'do-thi' | 'kiem-hiep' | 'lich-su'
  | 'khoa-huyen' | 'vong-du' | 'dong-nhan' | 'mat-the' | 'linh-di'
  | 'quan-truong' | 'di-gioi' | 'ngon-tinh' | 'quy-tac-quai-dam'
  | 'ngu-thu-tien-hoa' | 'khoai-xuyen';

// ── Agent Roles ──────────────────────────────────────────────────────────────

export type AgentRole = 'architect' | 'writer' | 'critic';

// ── MC Archetype (modern narrative variants) ─────────────────────────────────

export type MCArchetype =
  | 'power_fantasy'   // Default — leveling-grinding hero, classic Qidian-style
  | 'intelligent'     // Qixia-style — wins by knowledge/psychology, not power
  | 'pragmatic'       // Calculated, risk-averse, business-minded
  | 'coward_smart'    // Weak but cunning, survives via mưu trí
  | 'family_pillar'   // Multi-gen family/gia-toc focus, responsibility-driven
  | 'career_driven';  // Sự nghiệp focus, common for 大女主 ngon-tinh

// ── Anti-Trope Flags (modern marketing) ──────────────────────────────────────

export type AntiTropeFlag =
  | 'no_system'              // Bỏ hệ thống cheat (winning marketing 2024+)
  | 'no_harem'               // Single love interest hoặc no romance
  | 'no_invincible'          // MC có thể thua, gặp thất bại thực
  | 'no_face_slap'           // Bỏ pattern "kẻ thù coi thường → nghiền nát"
  | 'no_rebirth_advantage'   // Trọng sinh nhưng không cheat từ knowledge tương lai
  | 'no_misery_porn'         // Cấm "tự ngược" — MC vượt qua không quá đau khổ
  | 'no_secret_identity'     // Bỏ "thân phận bí ẩn cực khủng"
  | 'no_tournament'          // Bỏ tournament arc cliché
  | 'no_cliffhanger_mandate';// Bỏ ép cliffhanger mỗi chương

// ── MC Starting Archetype (TQ 2024-2026 — phế vật giảm 55→25%, professional/privileged tăng) ──

export type StartingArchetype =
  | 'phe-vat'           // Khổ tận cam lai classic — phế vật, cô nhi, nhà nghèo (CLASSIC, 25%)
  | 'professional'      // Trung lưu professional reborn (kỹ sư, bác sĩ, doanh nhân nhỏ) (TRENDING, 25%)
  | 'privileged'        // Thiếu gia / hậu duệ gia tộc (TRENDING, 15-20%)
  | 'rebirth-memory'    // Trọng sinh chỉ có ký ức tương lai, no system (10-15%)
  | 'quasi-normal'      // Đời sống bình thường + mild trigger (cozy, 10%)
  | 'family-pillar';    // Family-focused, gia tộc lead (家族修仙 trend, 10-15%)

// ── Tone Profile (story emotional/narrative tone) ──

export type ToneProfile =
  | 'empowering'        // MC tự tin từ đầu, action-oriented
  | 'pragmatic'         // Calculated, không cảm tính, business-minded
  | 'hopeful'           // Curious, optimistic, mild stakes
  | 'cozy'              // Slice-of-life, low-drama, warm
  | 'bi-revenge'        // Khắc khổ, revenge-driven (chỉ khi genre yêu cầu)
  | 'cynical';          // Adult, biết đời, không ảo tưởng

// ── Style Directives (JSONB metadata) ────────────────────────────────────────

export interface StyleDirectives {
  /** Override DEFAULT_CONFIG.targetWordCount for this project */
  target_chapter_length_override?: number;
  /** Cliffhanger density: how often to use plot cliffhangers vs emotional/reveal endings */
  cliffhanger_density?: 'low' | 'medium' | 'high';
  /** Sub-arc length in chapters (5-10 typical for hyperpop sub-arc structure) */
  sub_arc_length?: number;
  /** Critic strictness — lite for slice-of-life, strict for plot-heavy */
  critic_strictness?: 'lite' | 'normal' | 'strict';
  /** Variant ID for genres with multiple variants (e.g., "ngon-tinh:dai-nu-chu", "do-thi:thuong-chien") */
  variant_id?: string;
  /** MC starting circumstances (modern 2024-2026 archetype) */
  starting_archetype?: StartingArchetype;
  /** Story tone profile — overall emotional palette */
  tone_profile?: ToneProfile;
  /** Anti-pattern flags — explicit prohibition prompts beyond anti_tropes */
  anti_seeds?: string[];
}

// ── Dopamine ─────────────────────────────────────────────────────────────────

export type DopamineType =
  | 'face_slap' | 'power_reveal' | 'treasure_gain' | 'breakthrough'
  | 'revenge' | 'recognition' | 'beauty_encounter' | 'secret_identity'
  | 'business_success' | 'harvest' | 'flex_wealth' | 'comfort' | 'comedy_misunderstanding'
  | 'steal_luck' | 'simulate_success' | 'tears_of_regret' | 'flex_power_casual'
  | 'civilization_harvest' | 'player_exploitation' | 'two_world_shock' | 'master_flex' | 'book_manifestation' | 'monster_evolution'
  | 'smooth_opportunity' | 'casual_competence' | 'peaceful_growth'
  | 'knowledge_leverage' | 'network_payoff' | 'business_pivot' | 'quiet_competence' | 'insider_advantage';

// ── Engine Config ────────────────────────────────────────────────────────────

export interface EngineConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  targetWordCount: number;
  genre: GenreType;
  topicId?: string;
  minQualityScore: number;
  maxRetries: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  model: 'deepseek-v4-flash',
  temperature: 0.75,
  maxTokens: 32768,
  // 2800 từ AI write target — narrative coherence intact.
  // Output đến reader được SPLIT thành 2 chương ~1400 từ mỗi chương via orchestrator
  // post-write split (mobile-friendly + matches modern TQ trend 1500-2000 từ/reader-chapter).
  targetWordCount: 2800,
  genre: 'tien-hiep',
  minQualityScore: 7,
  maxRetries: 3,
};

// ── Write Input ──────────────────────────────────────────────────────────────

export interface WriteChapterInput {
  projectId: string;
  novelId: string;
  storyTitle: string;
  protagonistName: string;
  genre: GenreType;
  chapterNumber: number;
  totalPlannedChapters: number;
  worldDescription?: string;
  customPrompt?: string;
}

// ── Write Result ─────────────────────────────────────────────────────────────

export interface WriteChapterResult {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  criticReport?: CriticOutput;
  /** The Architect's chapter outline — used by post-write tasks for character extraction */
  outline?: ChapterOutline;
  duration: number;
}

// ── Chapter Outline (Architect output) ───────────────────────────────────────

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  summary: string;
  pov: string;
  location: string;
  scenes: SceneOutline[];
  tensionLevel: number;
  dopaminePoints: DopaminePoint[];
  /** Emotional arc for the chapter - guides tone shifts */
  emotionalArc?: EmotionalArc;
  /** Comedy beat plan - what type (não bổ/vô sỉ/phản kém/nội tâm tự giễu) and which scene */
  comedyBeat?: string;
  /** Which scene number is the slow/breathing scene for pacing contrast */
  slowScene?: string;
  cliffhanger: string;
  targetWordCount: number;
}

export interface SceneOutline {
  order: number;
  setting: string;
  characters: string[];
  goal: string;
  conflict: string;
  resolution: string;
  dopamineType?: DopamineType;
  estimatedWords: number;
  /** Optional per-scene POV character — enables multi-POV storytelling */
  pov?: string;
}

export interface EmotionalArc {
  opening: string;
  midpoint: string;
  climax: string;
  closing: string;
}

export interface DopaminePoint {
  type: DopamineType;
  scene: number;
  description: string;
  intensity: number;
  setup?: string;
  payoff?: string;
}

// ── Critic Output ────────────────────────────────────────────────────────────

export interface CriticOutput {
  overallScore: number;
  dopamineScore: number;
  pacingScore: number;
  endingHookScore?: number;
  /**
   * Phase 25 rubric judge — replaces keyword-counting signals as the primary
   * quality measure. Each dimension scored 1-10 by Critic. Used to compute /
   * sanity-check overallScore and flag dimension-specific weaknesses.
   *  - promiseClarity: chapter advance genre promise / core loop?
   *  - sceneSpecificity: concrete objects/events/numbers vs vague abstraction
   *  - mcAgency: MC drives decisions vs being reactively pushed
   *  - payoffConsequence: events change status/resource/relationship (not throwaway)
   *  - voiceDistinction: characters sound different (vocab, cadence, quirks)
   */
  rubricScores?: {
    promiseClarity: number;
    sceneSpecificity: number;
    mcAgency: number;
    payoffConsequence: number;
    voiceDistinction: number;
  };
  issues: CriticIssue[];
  approved: boolean;
  requiresRewrite: boolean;
  rewriteInstructions?: string;
}

export interface CriticIssue {
  type: 'pacing' | 'consistency' | 'continuity' | 'dopamine' | 'quality' | 'word_count' | 'dialogue' | 'critic_error' | 'logic' | 'detail';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  suggestion?: string;
}

// ── World Constraints ────────────────────────────────────────────────────────

export interface WorldConstraint {
  id: string;
  project_id?: string;
  blueprint_id?: string;
  category: 'quantity' | 'hierarchy' | 'rule' | 'geography' | 'character_limit' | 'power_cap';
  subject: string;
  predicate: string;
  value: string | number;
  context: string;
  immutable: boolean;
}

// ── Context Payload (assembled before writing) ───────────────────────────────

export interface ContextPayload {
  // Layer -1: World Description (canonical premise source, hand-crafted at spawn time)
  /** Project's world_description text — the source of truth for setting, golden finger, antagonists, MC archetype.
   *  When story_outline schema is incomplete or master_outline is too high-level, world_description is the
   *  fallback that grounds every chapter in the actual premise. ALWAYS injected early in context. */
  worldDescription?: string;

  // Layer 0: Chapter Bridge
  previousSummary?: string;
  previousMcState?: string;
  previousCliffhanger?: string;
  previousEnding?: string;
  /** Anti-self-torture: recent 3 chapters' conflict status to prevent back-to-back beat-downs */
  recentBeatHistory?: string;

  // ── Modern narrative metadata (from ai_story_projects, migration 0149) ──
  /** Sub-genre tag keys (NOT GenreType — these are SUB_GENRE_RULES keys like 'trong-sinh',
   *  'cau-dao-truong-sinh', 'mo-phong'). Validated against SUB_GENRE_RULES at load. */
  subGenres?: string[];
  /** MC archetype — overrides default power-fantasy framing */
  mcArchetype?: MCArchetype;
  /** Anti-trope flags — engine injects explicit prohibitions */
  antiTropes?: AntiTropeFlag[];
  /** Style directives — chapter length, cliffhanger density, etc. */
  styleDirectives?: StyleDirectives;

  // Layer 1: Story Bible
  storyBible?: string;
  hasStoryBible: boolean;

  // Layer 2: Rolling Synopsis
  synopsis?: string;
  synopsisStructured?: {
    mc_current_state?: string;
    active_allies?: string[];
    active_enemies?: string[];
    open_threads?: string[];
  };

  // Layer 3: Recent Chapters
  recentChapters: string[];
  /**
   * Phase 22 Stage 2 (Q1): full prose of last 3 chapters. Writer reads previous prose verbatim
   * (not just summaries) to maintain voice consistency, capture nuance, and reference precise
   * details. Real "đại thần" novelists re-read the previous chapter before writing the next —
   * this gives the AI the same advantage. ~30-45K chars total.
   */
  recentChapterFullText?: Array<{ chapter_number: number; title: string; content: string }>;

  // Layer 4: Arc Plan
  arcPlan?: string;
  chapterBrief?: string;
  arcPlanThreads?: {
    threads_to_advance?: string[];
    threads_to_resolve?: string[];
    new_threads?: string[];
  };
  /** Hyperpop sub-arc context: which sub-arc this chapter belongs to + mini-payoff */
  currentSubArc?: string;

  /**
   * Phase 26: compact volume + sub-arc metadata block for the current chapter.
   * Built from MasterOutline.volumes hierarchy. Tells Architect "where in the
   * 1000-chapter map are we?" — current volume theme/conflict/villain, sub-arc
   * milestones, distance to medium/major climax, position in volume.
   */
  volumeContext?: string;

  /**
   * Phase 27 W2.1: comprehensive cast roster — every named character with
   * latest known state. Solves long-tail cast drift in 1000+ chapter novels
   * (pre-Phase-27 limit of 50 character_states ROWS missed ~80% of named cast).
   */
  castRoster?: string;

  /** Phase 27 W2.2: chapter ↔ in-world date timeline with MC age tracking. */
  timelineContext?: string;

  /** Phase 27 W2.3: current MC + key char inventory + recently lost items. */
  inventoryContext?: string;

  /** Phase 27 W2.4: comprehensive power-system rules generated at setup. */
  powerSystemCanonContext?: string;

  /** Phase 27 W2.5: top-N active factions with current alliances/rivalries. */
  factionsContext?: string;

  /** Phase 27 W3.1: upcoming plot twists in seeding/imminent state. */
  plotTwistsContext?: string;

  /** Phase 27 W3.2: themes registry with reinforcement status + drift flags. */
  themesContext?: string;

  /** Phase 27 W3.3: comprehensive worldbuilding canon (cosmology + history + cultures + regions). */
  worldbuildingCanonContext?: string;

  /** Phase 27 W4.2: voice anchor snippets from ch.1-3, re-fed every 50ch to combat drift. */
  voiceAnchorContext?: string;

  /** Phase 27 W5.4: detailed briefs for next 1-3 chapters (rolling outline ahead). */
  rollingBriefsContext?: string;

  // Anti-repetition
  previousTitles: string[];
  recentOpenings: string[];
  recentCliffhangers: string[];

  // Character states
  characterStates?: string;
  /** All known character names (alive + dead) for scalability module queries */
  knownCharacterNames: string[];

  // Genre boundary
  genreBoundary?: string;

  // RAG semantic context
  ragContext?: string;

  // Scalability modules
  plotThreads?: string;
  beatGuidance?: string;
  worldRules?: string;
  masterOutline?: string;
  storyOutline?: StoryOutline;

  // Quality modules (Qidian Master Level)
  foreshadowingContext?: string;
  characterArcContext?: string;
  pacingContext?: string;
  voiceContext?: string;
  powerContext?: string;
  worldContext?: string;

  // Phase 22 continuity overhaul: durable consolidated bibles
  characterBibleContext?: string;
  volumeSummaryContext?: string;
  geographyContext?: string;

  // Character knowledge graph (MemPalace-inspired)
  characterKnowledgeContext?: string;
  /** Per-pair latest relationship state (love/hate/ally/enemy/etc.) — coherence guard */
  relationshipContext?: string;
  /** MC + key entities financial state (do-thi/quan-truong only) — economic coherence */
  economicContext?: string;

  // Arc chapter summaries (for synopsis generation)
  arcChapterSummaries?: Array<{ chapter_number: number; title: string; summary: string }>;
}

// ── Chapter Summary (stored in DB) ───────────────────────────────────────────

export interface ChapterSummary {
  summary: string;
  openingSentence: string;
  mcState: string;
  cliffhanger: string;
}

// ── Story Plan Types ─────────────────────────────────────────────────────────

export interface StoryOutline {
  title: string;
  genre: GenreType;
  premise: string;
  themes: string[];
  mainConflict: string;
  targetChapters: number;
  protagonist: {
    name: string;
    startingState: string;
    endGoal: string;
    characterArc: string;
  };
  majorPlotPoints: Array<{ chapter: number; event: string; name?: string; description?: string }>;
  uniqueHooks?: string[];
  endingVision: string;
}

export interface ArcOutline {
  arcNumber: number;
  title: string;
  theme: ArcTheme;
  premise: string;
  startChapter: number;
  endChapter: number;
  chapterCount: number;
  setup: string;
  confrontation: string;
  resolution: string;
  climax: string;
  cliffhanger: string;
  protagonistGrowth: string;
  startingRealm: string;
  endingRealm: string;
  chapterOutlines: ArcChapterPlan[];
  tensionCurve: number[];
}

export type ArcTheme =
  | 'foundation' | 'conflict' | 'growth' | 'betrayal' | 'redemption'
  | 'revelation' | 'war' | 'triumph' | 'tournament' | 'exploration'
  | 'revenge' | 'romance' | 'finale';

export interface ArcChapterPlan {
  chapterNumber: number;
  title: string;
  brief: string;
  tensionLevel: number;
}

// ── Power System ─────────────────────────────────────────────────────────────

export interface PowerSystem {
  name: string;
  realms: PowerRealm[];
  resources: string[];
  techniqueGrades: string[];
  itemGrades: string[];
  currencies?: Array<{
    name: string;
    value: number;
    description: string;
  }>;
}

export interface PowerRealm {
  name: string;
  description: string;
  index?: number;
  rank?: number;
  subLevels?: number;
  abilities?: string[];
  breakthroughDifficulty?: string;
}

// ── Style Bible ──────────────────────────────────────────────────────────────

export interface StyleBible {
  authorVoice: string;
  narrativeStyle: 'first_person' | 'third_person_limited' | 'third_person_omniscient';
  toneKeywords: string[];
  avoidKeywords: string[];
  dialogueRatio: [number, number];
  descriptionRatio: [number, number];
  innerThoughtRatio: [number, number];
  actionRatio: [number, number];
  pacingStyle: 'fast' | 'medium' | 'slow';
  genreConventions: string[];
}

// ── Gemini API ───────────────────────────────────────────────────────────────

export interface GeminiResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  finishReason: string;
}

export interface GeminiConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}
