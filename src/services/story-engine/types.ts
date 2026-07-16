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
  /** Pipeline generation. flagship_v2 is quality-first and never uses routine soft gates. */
  pipeline_version?: 'legacy' | 'flagship_v2' | 'flagship_v3';
  /** Publication policy. Automatic is allowed only for explicitly factory-enabled projects. */
  publication_mode?: 'automatic' | 'human_gate' | 'offline_only';
  /** Opt this project into the autonomous flagship factory scheduler. This is
   * deliberately separate from production_enabled (the frozen legacy lane).
   * The scheduler requires an explicit true value and never infers it. */
  factory_enabled?: boolean;
  /** Hard chapter ceiling for autonomous runs. Defaults to 1000. */
  factory_max_chapters?: number;
  /** Latest human checkpoint approved for a flagship project. */
  flagship_human_gate?: 'concept' | 'story_spec' | 'chapter_3' | 'chapter_10' | 'chapter_30' | 'chapter_50';
  /** Setup mode is explicit per project; the factory mode is unattended. */
  flagship_setup_mode?: 'manual_only' | 'autonomous_factory';
  /** Explicit per-role routes. Flagship never falls back to ai_model or a global default. */
  flagship_model_routes?: {
    setupCreative: string;
    setupJudge: string;
    director: string;
    writer: string;
    editor: string;
    planner: string;
  };
  /** Exact v3 routes. There is deliberately no Director route because the
   * five-chapter Rolling Planner owns that responsibility. */
  flagship_model_routes_v3?: {
    setupGenerators: [string, string];
    setupJudges: [string, string, string];
    openingSimulator: string;
    launchArchitect: string;
    planner: string;
    writer: string;
    editor: string;
    routeVersion: string;
    maxPublishedChapterCostUsd: number;
  };
  /** Stable prompt bundle identifier persisted into write-run telemetry. */
  prompt_version?: string;
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
  /** Store one AI write as one reader-facing chapter instead of splitting it into two rows */
  disable_chapter_split?: boolean;
  /** Codex should act as high-level director only; routine text is written by configured provider. */
  codex_director_only?: boolean;
  /** Enables provider-side routine chapter generation without Codex manual authoring. */
  flash_writer_enabled?: boolean;
  /** Cheap bulk mode: routine chapters may pass a softer gate if no hard continuity/canon issue is present. */
  flash_routine_soft_gate?: boolean;
  /** Quality Overhaul 1.1: critic-directed revise pass before shipping marginal chapters. Default ON; set false to opt out. */
  critic_revise_pass?: boolean;
  /** Quality Overhaul 1.5: circuit breaker hold — set by quality-trend cron in enforce mode; write cron skips held projects. */
  quality_hold?: boolean;
  /** Quality Overhaul 4.1: modular prompt suffix (hard-bans recap at generation point). Default OFF — enable per novel for A/B. */
  modular_prompts?: boolean;
  /** Minimum score for flash_routine_soft_gate. Defaults to 5 in director-only Flash mode. */
  flash_routine_min_quality_score?: number;
  /** Retry count for routine Flash writes. Defaults to 1 in director-only Flash mode to avoid paid rewrite loops. */
  flash_routine_max_retries?: number;
  /** Allow one cheap continuation pass when Flash undershoots min words or ends without a hook. Defaults to true. */
  flash_routine_extend_on_short?: boolean;
  /** Max cheap continuation passes for undershot routine chapters. Defaults to 2. */
  flash_routine_max_extensions?: number;
  /** Cheapest stable routine path: compact DB brief + one DS Flash thinking writer call + deterministic hard gates. */
  flash_bulk_cheap_mode?: boolean;
  /** Maximum compact routine context size in characters. Defaults to 32000. */
  flash_bulk_context_max_chars?: number;
  /** Hard minimum published word count for cheap routine chapters. Defaults to 1500. */
  flash_bulk_min_words?: number;
  /** Per-project production daily chapter quota for cron writing. Overrides WRITE_CHAPTERS_DAILY_QUOTA. */
  production_daily_chapter_quota?: number;
  /** Phase Q (2026-05-12): flip true to opt the project into the production cron's daily-quota pipeline. */
  production_enabled?: boolean;
  /** Cadence for optional AI memory tasks in cheap mode. Defaults to 5 chapters. */
  flash_bulk_optional_task_cadence?: number;
  /** Cadence for strict AI critic sampling in cheap mode. Reserved for audit runners. Defaults to 10 chapters. */
  flash_bulk_critic_cadence?: number;
  /** Force cheap mode even near the final arc. Use only for experiments. */
  flash_bulk_force_all?: boolean;
  /** Focus preset key used by Codex/cron director flows. */
  focus_key?: string | null;
  /** Optional per-project routine writer instructions appended to compact Flash prompts. */
  routine_prompt_context?: string;
  /** Per-project deterministic writing rules merged with defaults before prompt + validation. */
  story_rules?: StoryRules;
  /** Require full chapter_blueprints coverage before routine writer can publish next chapter. */
  require_full_chapter_blueprint?: boolean;
  /** Active chapter_blueprints version expected by writer/audit gates. */
  chapter_blueprint_version?: number;
  /** Enable DeepSeek V4 thinking mode for selected story-engine calls. */
  deepseek_thinking_enabled?: boolean;
  /** DeepSeek V4 thinking effort. API maps low/medium to high; supported useful values are high/max. */
  deepseek_reasoning_effort?: 'high' | 'max';
  /** Optional task allow-list for thinking mode, e.g. architect/writer/critic. Empty means all DeepSeek calls. */
  deepseek_thinking_tasks?: string[];
}

export interface StoryRules {
  chapter_words?: {
    min?: number;
    max?: number;
  };
  forbidden_phrases?: string[];
  fatigue_words?: Record<string, number>;
  required_currency?: 'VND' | 'auto' | string;
  preferences?: string;
}

// ── Story Kernel (compact setup DNA) ─────────────────────────────────────────

/**
 * Central setup artifact for modern sảng văn. Stored in story_outline.setupKernel
 * so rollout does not require a migration. Prompts may expand this artifact, but
 * should not rewrite its engine after the idea stage.
 */
export interface StoryKernel {
  /** The exact satisfaction readers come back for. */
  readerFantasy: string;
  /** How the MC wins: advantage + temperament + action style. */
  protagonistEngine: string;
  /** 4-6 repeatable beats that create payoff every 1-3 chapters. */
  pleasureLoop: string[];
  /** Golden finger/system as an operating model, not a magic solve button. */
  systemMechanic: {
    name: string;
    input: string;
    output: string;
    limit: string;
    reward: string;
  };
  /**
   * Canonical MC origin — the SINGLE SOURCE OF TRUTH chốt một lần ở stage_idea,
   * mọi stage sau (master_outline, story_outline, character) PHẢI tuân theo.
   * - native: người bản địa trong thế giới truyện (KHÔNG xuyên không/trọng sinh/kiếp trước)
   * - transmigrator: xuyên không từ thế giới khác (vd Trái Đất hiện đại)
   * - reincarnated: trọng sinh/tái sinh trong CÙNG thế giới (giữ ký ức kiếp trước)
   * - system-bestowed: bản địa được Hệ Thống/golden finger ban tặng (nguồn in-world)
   * - returnee: bản địa từng rời đi rồi quay lại (hồi quy), không phải xuyên không
   */
  mcOrigin?: 'native' | 'transmigrator' | 'reincarnated' | 'system-bestowed' | 'returnee';
  /** Ghi chú khoá gốc gác (1 câu): điều TUYỆT ĐỐI không được mâu thuẫn ở các stage sau. */
  originLockNote?: string;
  /** What must stay secret about rebirth/system/golden finger and when it may reveal. */
  mcSecret: {
    secret: string;
    outsideWorldKnowledge: string;
    revealRule: string;
    coverStory?: string;
  };
  /**
   * Foreknowledge engine — ONLY for reincarnated/transmigrator/returnee origins.
   * Turns "biết trước / ký ức kiếp trước / kiến thức hiện đại" into a structural,
   * leverageable advantage instead of throwaway flavor. Chốt một lần ở stage_idea,
   * injected mỗi chương, enforced bởi checkForeknowledgeGate.
   * When mcOrigin is native/system-bestowed → undefined (or active:false).
   */
  mcForeknowledge?: {
    /** true only when mcOrigin ∈ {reincarnated, transmigrator, returnee}. */
    active: boolean;
    /** Loại tri thức MC mang theo. */
    knowledgeType: 'past_life_memory' | 'future_events' | 'modern_knowledge' | 'canon_knowledge';
    /** Lợi thế cụ thể MC nắm (1-2 câu): MC biết/nhớ điều gì mà người khác không. */
    whatMcKnows: string;
    /** 3-6 sự kiện/cột mốc tương lai cụ thể MC sẽ gặp và có thể khai thác. */
    futureTimeline: string[];
    /** MC DÙNG tri thức đó thế nào: né bẫy / chốt deal sớm / luyện sớm / cứu đúng người. */
    leverageRule: string;
    /** Rủi ro/chi phí khi hành động dựa trên biết trước (butterfly: đổi timeline → lệch dự đoán). */
    costRule: string;
    /** Nhịp hồi tưởng/khai thác: vd "1 memory-trigger mỗi 1-2 chương; callback kiếp trước ≥1/arc". */
    reminiscenceCadence: string;
    /** Người ngoài giải thích sự nhạy bén của MC ra sao (tái dùng mcSecret.coverStory). */
    coverStory: string;
  };
  /** Concrete goal → action → benefit loop that prevents random meddling. */
  benefitLoop: {
    goal: string;
    action: string;
    benefit: string;
    cadence: string;
  };
  /** Rule for when MC may intervene in external problems. */
  interventionRule: string;
  /** Ch.1-100 local sandbox that can keep generating scenes. */
  phase1Playground: {
    locations: string[];
    cast: string[];
    resources: string[];
    localAntagonists: string[];
    repeatableSceneTypes: string[];
  };
  /** People and channels that create witness/reaction/report-back dopamine. */
  socialReactor: {
    witnesses: string[];
    reactionModes: string[];
    reportBackCadence: string;
  };
  /** What opens every 20-50 chapters while staying in the same genre lane. */
  noveltyLadder: Array<{
    chapterRange: string;
    newToy: string;
    keepsSameLane: string;
  }>;
  /** Runtime control rules for arcs and chapter briefs. */
  controlRules: {
    payoffCadence: string;
    attentionGradient: string;
    openThreadsPerArc: number;
    closeThreadsPerArc: number;
  };
  /** Pattern cards selected from author-pattern-dna.ts. */
  patternCards: string[];
}

// ── Dopamine ─────────────────────────────────────────────────────────────────

export type DopamineType =
  | 'face_slap' | 'power_reveal' | 'treasure_gain' | 'breakthrough'
  | 'revenge' | 'recognition' | 'beauty_encounter' | 'secret_identity'
  | 'business_success' | 'harvest' | 'flex_wealth' | 'comfort' | 'comedy_misunderstanding'
  | 'steal_luck' | 'simulate_success' | 'tears_of_regret' | 'flex_power_casual'
  | 'civilization_harvest' | 'player_exploitation' | 'two_world_shock' | 'master_flex' | 'book_manifestation' | 'monster_evolution'
  | 'smooth_opportunity' | 'casual_competence' | 'peaceful_growth'
  | 'knowledge_leverage' | 'network_payoff' | 'business_pivot' | 'quiet_competence' | 'insider_advantage'
  | 'mass_witnessed_shock';

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
  model: 'gemini-3.1-flash-lite',
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
  /**
   * Quality Overhaul 1.4: recovery paths that shipped degraded content and
   * need admin attention ('golden_fallback' | 'revise_pass_failed').
   * Orchestrator inserts admin_review_queue rows for these post-save.
   */
  recoveryFlags?: string[];
  /** Quality Overhaul 1.1: true when the critic-directed revise pass replaced the content. */
  criticRevisedPass?: boolean;
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
  /**
   * Foreknowledge beat — present only when project foreknowledge is active
   * (mcOrigin reincarnated/transmigrator/returnee). Architect plans a concrete
   * memory-trigger / knowledge-action on a 1-2 chapter cadence; Writer renders
   * it; checkForeknowledgeGate enforces it. See StoryKernel.mcForeknowledge.
   */
  foreknowledgeBeat?: {
    type: 'memory_trigger' | 'knowledge_action' | 'future_avoidance' | 'modern_leverage';
    sceneNumber?: number;
    trigger?: string;
    description: string;
    benefit?: string;
    cost?: string;
  };
  cliffhanger: string;
  targetWordCount: number;
  /**
   * Phase M.4 (2026-05-12) — Optional chapter intent doc emitted by Architect.
   * Condensed 500-800 chars summarizing chapter primary goal, cliffhanger
   * target, MC state delta, threads to close/open, distilled creative
   * constraints. Used by Writer + Critic instead of re-loading full context
   * (30-50% token saving khi feature flag use_intent_doc_pipeline=true).
   */
  chapterIntent?: ChapterIntent;
}

export interface ChapterIntent {
  /** Primary goal of the chapter (1-2 sentences) */
  primaryGoal: string;
  /** Target cliffhanger / hook ending (1 sentence) */
  cliffhangerTarget: string;
  /** MC state delta — what changes về MC state (power/relationship/resources) */
  mcStateDelta: string;
  /** Plot threads to close in this chapter (thread names) */
  threadsToClose: string[];
  /** Plot threads to open / advance in this chapter */
  threadsToAdvance: string[];
  /**
   * Distilled creative constraints — combined from 6 quality modules
   * (foreshadowing, character arc, pacing, voice, power, world).
   * ≤500 chars total, structured by label vd "[Voice] MC dùng 'ta' với ...".
   */
  creativeConstraints: string;
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
  type: 'pacing' | 'consistency' | 'continuity' | 'dopamine' | 'quality' | 'word_count' | 'dialogue' | 'critic_error' | 'logic' | 'detail' | 'reader_persona';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  suggestion?: string;
  /** Phase 29 Feature 2: which reader persona flagged this (only set when type='reader_persona') */
  persona?: 'sangvan' | 'logic' | 'emotion';
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
  /** Quality Overhaul 2.7: names of context loaders that failed for this chapter (silent context loss telemetry). */
  loaderFailures?: string[];

  /** Quality Overhaul 3.1: [ENDGAME PLAN] block — injected Tier 0 when within the final ~120 chapters. */
  endgameContext?: string;

  // Layer -1: World Description (canonical premise source, hand-crafted at spawn time)
  /** Project's world_description text — the source of truth for setting, golden finger, antagonists, MC archetype.
   *  When story_outline schema is incomplete or master_outline is too high-level, world_description is the
   *  fallback that grounds every chapter in the actual premise. ALWAYS injected early in context. */
  worldDescription?: string;

  /** StoryKernel from story_outline.setupKernel — compact machine-truyen contract. */
  setupKernel?: StoryKernel;

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

  /** Full-novel chapter blueprint row for this exact chapter. Highest-level hard rail. */
  chapterBlueprintContext?: string;

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
  setupKernel?: StoryKernel;
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
  /** Deterministic estimate from the exact provider/model token usage returned
   * by the response. Flagship v3 uses it before publication. */
  estimatedCostUsd?: number;
}

export interface GeminiConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  thinkingLevel?: 'low' | 'medium' | 'high';
  responseJsonSchema?: Record<string, unknown>;
  deepseekThinkingEnabled?: boolean;
  deepseekReasoningEffort?: 'high' | 'max';
  deepseekThinkingTasks?: string[];
}
