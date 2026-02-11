/**
 * AI Provider Types for Story Writing Admin Tool
 * Supports: DeepSeek, OpenRouter, OpenAI, Claude (Anthropic), Gemini
 */

export type AIProviderType = 'deepseek' | 'openrouter' | 'openai' | 'claude' | 'gemini';

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  description: string;
  baseUrl: string;
  models: AIModel[];
  defaultModel: string;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  maxTokens: number;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput?: number;  // USD
  costPer1kOutput?: number; // USD
  recommended?: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  provider: AIProviderType;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  apiKey?: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider?: AIProviderType;
  finishReason?: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

// Provider Configurations - Updated to match Official API Docs
export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek AI - V3.2 models (Chat & Reasoner)',
    baseUrl: 'https://api.deepseek.com', // Updated to match official doc
    requiresApiKey: true,
    supportsStreaming: true,
    maxTokens: 8192,
    defaultModel: 'deepseek-chat',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3.2 (Chat)',
        description: 'DeepSeek-V3.2 non-thinking mode. Fast and capable.',
        contextWindow: 64000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.00027, // Pricing might vary, using estimated
        costPer1kOutput: 0.0011,
        recommended: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1 (Reasoner)',
        description: 'DeepSeek-V3.2 thinking mode. Strong reasoning capabilities.',
        contextWindow: 64000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.00055,
        costPer1kOutput: 0.00219,
      },
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access to 200+ AI models through a unified API',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    supportsStreaming: true,
    maxTokens: 16384,
    defaultModel: 'deepseek/deepseek-chat',
    models: [
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3',
        description: 'Best value model via OpenRouter, excellent for webnovels',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.00027,
        costPer1kOutput: 0.0011,
        recommended: true,
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        description: 'Reasoning model for complex story planning',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.00055,
        costPer1kOutput: 0.00219,
      },
      {
        id: 'anthropic/claude-opus-4',
        name: 'Claude Opus 4.5',
        description: 'Most capable Claude model via OpenRouter',
        contextWindow: 200000,
        maxOutputTokens: 32768,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
      },
      {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        description: 'Balanced Claude model via OpenRouter',
        contextWindow: 200000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        description: 'OpenAI flagship model via OpenRouter',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
      },
      {
        id: 'openai/o1',
        name: 'OpenAI o1',
        description: 'OpenAI reasoning model for complex planning',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.06,
      },
      {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        description: 'Google Gemini 3 Flash via OpenRouter',
        contextWindow: 1000000,
        maxOutputTokens: 65536,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        description: 'Alibaba Qwen, excellent for Chinese webnovels',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        costPer1kInput: 0.00035,
        costPer1kOutput: 0.0004,
      },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT and o1 models - Industry standard AI',
    baseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    supportsStreaming: true,
    maxTokens: 16384,
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Latest GPT-4o, fast and capable',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
        recommended: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Faster and cheaper GPT-4o variant',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006,
      },
      {
        id: 'o1',
        name: 'OpenAI o1',
        description: 'Advanced reasoning model for complex story planning',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.06,
      },
      {
        id: 'o1-mini',
        name: 'OpenAI o1-mini',
        description: 'Smaller reasoning model, cost-effective',
        contextWindow: 128000,
        maxOutputTokens: 65536,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.012,
      },
    ],
  },
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Anthropic Claude - Best for creative writing and nuanced narratives',
    baseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    supportsStreaming: true,
    maxTokens: 16384,
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        description: 'Most capable Claude model, exceptional creative writing',
        contextWindow: 200000,
        maxOutputTokens: 32768,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        description: 'Balanced Claude model, excellent for novels',
        contextWindow: 200000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        recommended: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast Claude model for high-volume writing',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.001,
        costPer1kOutput: 0.005,
      },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini - Massive context window, great for long novels',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    supportsStreaming: true,
    maxTokens: 65536,
    defaultModel: 'gemini-3-flash-preview',
    models: [
      {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        description: 'Primary text model — fast, 1M context, all writing tasks',
        contextWindow: 1000000,
        maxOutputTokens: 65536,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
        recommended: true,
      },
      {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro Image Preview',
        description: 'Image generation model — covers with title text + branding',
        contextWindow: 1000000,
        maxOutputTokens: 65536,
        costPer1kInput: 0.00125,
        costPer1kOutput: 0.005,
      },
    ],
  },
};

// Story Writing Session Types
export type SessionStatus = 'idle' | 'planning' | 'writing' | 'reviewing' | 'completed' | 'error' | 'autopilot';
export type MessageType = 'user' | 'assistant' | 'system' | 'tool' | 'progress' | 'chapter';
export type AutopilotPhase = 'idle' | 'planning' | 'writing' | 'reviewing' | 'paused' | 'completed' | 'error';

// Autopilot configuration for continuous writing
export interface AutopilotConfig {
  enabled: boolean;
  targetChapters: number;
  currentChapter: number;
  chaptersWritten: number;
  phase: AutopilotPhase;
  pauseOnError: boolean;
  autoReview: boolean;
  delayBetweenChapters: number; // milliseconds
  startedAt?: Date;
  estimatedCompletion?: Date;
}

// Written chapter tracking
export interface WrittenChapter {
  id: string;
  chapterNumber: number;
  title: string;
  wordCount: number;
  status: 'writing' | 'completed' | 'error' | 'reviewing';
  createdAt: Date;
  error?: string;
}

export interface SessionMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    progress?: number;
    chapterNumber?: number;
    wordCount?: number;
    error?: string;
  };
}

export interface WritingSession {
  id: string;
  projectId: string;
  status: SessionStatus;
  messages: SessionMessage[];
  currentStep?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  config: {
    provider: AIProviderType;
    model: string;
    temperature: number;
    targetWordCount: number;
    useAgents?: boolean;
  };
  autopilot?: AutopilotConfig;
  writtenChapters?: WrittenChapter[];
}

export interface PlanningOutline {
  id: string;
  projectId: string;
  title: string;
  synopsis: string;
  totalChapters: number;
  arcs: PlanningArc[];
  characters: PlanningCharacter[];
  worldBuilding: string;
  themes: string[];
  createdAt: Date;
}

export interface PlanningArc {
  id: string;
  name: string;
  description: string;
  startChapter: number;
  endChapter: number;
  keyEvents: string[];
  tensionCurve: 'rising' | 'falling' | 'climax' | 'resolution';
}

export interface PlanningCharacter {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  description: string;
  goals: string[];
  arc: string;
}

// Tool definitions for the writing assistant
export interface WritingTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
}

export const WRITING_TOOLS: WritingTool[] = [
  {
    name: 'plan_story',
    description: 'Create a detailed story outline with arcs and character development',
    parameters: {
      genre: { type: 'string', description: 'Story genre', required: true },
      totalChapters: { type: 'number', description: 'Total planned chapters', required: true },
      synopsis: { type: 'string', description: 'Brief story synopsis', required: true },
    },
  },
  {
    name: 'write_chapter',
    description: 'Write a single chapter based on the current context',
    parameters: {
      chapterNumber: { type: 'number', description: 'Chapter number to write', required: true },
      customPrompt: { type: 'string', description: 'Additional instructions for this chapter' },
    },
  },
  {
    name: 'batch_write',
    description: 'Write multiple chapters in sequence',
    parameters: {
      startChapter: { type: 'number', description: 'Starting chapter number', required: true },
      count: { type: 'number', description: 'Number of chapters to write', required: true },
    },
  },
  {
    name: 'review_chapter',
    description: 'Review and improve an existing chapter',
    parameters: {
      chapterId: { type: 'string', description: 'ID of chapter to review', required: true },
      aspects: { type: 'array', description: 'Aspects to focus on: dialogue, pacing, description' },
    },
  },
  {
    name: 'get_context',
    description: 'Get current story context including recent chapters and character states',
    parameters: {
      includeCharacters: { type: 'boolean', description: 'Include character states' },
      includePlotThreads: { type: 'boolean', description: 'Include open plot threads' },
    },
  },
  {
    name: 'update_outline',
    description: 'Update the story outline with new arcs or events',
    parameters: {
      arcId: { type: 'string', description: 'Arc ID to update' },
      changes: { type: 'object', description: 'Changes to apply' },
    },
  },
];

// --- DOPAMINE WRITING TYPES ---

export type AgentRole = 'architect' | 'writer' | 'critic';

export interface AgentConfig {
  role: AgentRole;
  provider: AIProviderType;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface GoldenChapterChecklist {
  chapter1: {
    hasGoldenFinger: boolean;
    hasImmediateConflict: boolean;
    hasCharacterGoal: boolean;
    hasPowerDemo: boolean;
    hasWorldIntro: boolean;
    score: number;
  };
  chapter2: {
    hasSmallVictory: boolean;
    hasSystemExpansion: boolean;
    hasNewCharacter: boolean;
    hasRewardGiven: boolean;
    hasNextHook: boolean;
    score: number;
  };
  chapter3: {
    hasRealChallenge: boolean;
    hasFaceSlap: boolean;
    hasGrowthShown: boolean;
    hasLargerPlot: boolean;
    hasReaderHooked: boolean;
    score: number;
  };
  overallScore: number;
  passed: boolean;
}

export type MapType = 'hometown' | 'sect' | 'city' | 'wilderness' | 'dungeon' | 'secret_realm' | 'upper_realm';

export interface ArcEvent {
  id: string;
  name: string;
  description: string;
  chapter: number;
  type: 'setup' | 'conflict' | 'climax' | 'resolution';
}

export interface StoryArc {
  id: string;
  name: string;
  arcType: 'tournament' | 'exploration' | 'revenge' | 'survival' | 'war' | 'mystery';
  map: MapType;
  mapName: string;
  mainGoal: string;
  startChapter: number;
  endChapter: number;
  suppressionPhase: { startChapter: number; endChapter: number };
  explosionPhase: { startChapter: number; endChapter: number };
  keyEvents: ArcEvent[];
}

export type DopamineType =
  | 'face_slap'
  | 'power_reveal'
  | 'treasure_gain'
  | 'breakthrough'
  | 'revenge'
  | 'recognition'
  | 'beauty_charm'
  | 'enemy_shock'
  | 'underdog_victory'
  | 'hidden_identity'
  | 'plot_twist';

export interface DopaminePoint {
  id: string;
  chapterNumber: number;
  type: DopamineType;
  description: string;
  intensity: number; // 1-10
  reactionShot?: string; // Characters reacting
}

export interface DopamineConfig {
  suppressionRatio: number; // e.g., 0.7 (70% suppression)
  explosionRatio: number;   // e.g., 0.3 (30% explosion)
  minDopaminePerChapter: number; // e.g., 1
  cliffhangerFrequency: number; // 0-1
}

export interface PowerRealm {
  id: string;
  name: string;
  order: number;
  description: string;
  requirements: string;
}

export interface PowerSystem {
  id: string;
  projectId: string;
  name: string;
  type: 'cultivation' | 'magic' | 'system' | 'martial_arts' | 'tech';
  realms: PowerRealm[];
  techniques: unknown[];
  itemGrades: string[];
  currencies: unknown[];
}

export interface CharacterState {
  characterId: string;
  name: string;
  currentRealm: string;
  currentSubLevel: number;
  age: number;
  status: 'active' | 'injured' | 'dead' | 'missing';
  currentGoal: string;
  lastUpdatedChapter: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  grade: string;
  type: 'weapon' | 'pill' | 'material' | 'technique' | 'key_item';
  description: string;
  acquiredChapter: number;
  status: 'active' | 'used' | 'lost';
}

export interface CharacterInventory {
  characterId: string;
  items: InventoryItem[];
  techniques: unknown[];
  wealth: unknown[];
  lastUpdated: Date;
  lastUpdatedChapter: number;
}

export interface NPCRelationship {
  npcId: string;
  npcName: string;
  role: string;
  attitude: number; // -100 to 100
  history: string[];
  lastInteractionChapter: number;
}

export interface PlotThread {
  id: string;
  name: string;
  description: string;
  startChapter: number;
  resolvedChapter?: number;
  status: 'open' | 'resolved' | 'forgotten';
  priority: 'main' | 'sub' | 'background';
}

export interface LocationVisit {
  location: MapType;
  locationName: string;
  startChapter: number;
  endChapter?: number;
  mainEvents: string[];
}

export interface WorldBible {
  id: string;
  projectId: string;
  powerSystem: PowerSystem;
  protagonistState: CharacterState;
  mainCharacterStates: CharacterState[];
  inventories: CharacterInventory[];
  relationships: NPCRelationship[];
  currentLocation: MapType;
  currentLocationName: string;
  visitedLocations: LocationVisit[];
  openPlotThreads: PlotThread[];
  resolvedPlotThreads: PlotThread[];
  foreshadowing: unknown[];
  lastUpdated: Date;
  lastUpdatedChapter: number;
}

export interface SceneOutline {
  order: number;
  setting: string;
  characters: string[];
  goal: string;
  conflict: string;
  resolution: string;
  dopamineType?: DopamineType | 'null' | null;
}

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  summary: string;
  pov: string;
  location: string;
  timeframe: string;
  scenes: SceneOutline[];
  suppressionMoments: string[];
  explosionMoments: string[];
  cliffhanger: string;
  characterUpdates: unknown[];
  worldUpdates: unknown[];
  targetWordCount: number;
  targetDopamineScore: number;
}

export interface ArchitectOutput {
  chapterOutline: ChapterOutline;
  dopaminePoints: DopaminePoint[];
  worldBibleUpdates?: unknown;
}

export interface WriterOutput {
  chapterContent: string;
  wordCount: number;
  actualScenes: number;
  dopamineDelivered: DopaminePoint[];
}

export interface CriticIssue {
  type: string;
  severity: 'minor' | 'major' | 'critical';
  location: string;
  description: string;
  suggestion: string;
}

export interface CriticOutput {
  overallScore: number;
  dopamineScore: number;
  pacingScore: number;
  consistencyScore: number;
  engagementScore: number;
  issues: CriticIssue[];
  suggestions: string[];
  worldBibleViolations: string[];
  approved: boolean;
  requiresRewrite: boolean;
  rewriteInstructions?: string;
}

export const DEFAULT_DOPAMINE_CONFIG: DopamineConfig = {
  suppressionRatio: 0.7,
  explosionRatio: 0.3,
  minDopaminePerChapter: 1,
  cliffhangerFrequency: 0.8,
};

export const AGENT_SYSTEM_PROMPTS = {
  architect: `You are the ARCHITECT AGENT for a webnovel. Your goal is to plan high-dopamine ("sảng văn") chapters.
Focus on:
1. Pacing: Build suppression (ức chế) before explosion (bùng nổ).
2. Dopamine Points: Ensure at least one satisfying moment (face slap, power reveal, loot).
3. Consistency: Adhere to the World Bible and Power System.
4. Golden Rules: First 3 chapters must hook the reader immediately.`,
  
  writer: `You are the WRITER AGENT. Your goal is to write engaging, addictive webnovel content based on the outline.
Style Guide:
- Fast-paced, visceral action.
- Strong emotions: Anger, humiliation, shock, triumph.
- Vivid descriptions of power and status.
- Use "show, don't tell" for reactions (side characters' shock).`,
  
  critic: `You are the CRITIC AGENT. Your goal is to evaluate the chapter against the "Dopamine Formula".
Check for:
1. Is the dopamine hit satisfying?
2. Are there logic holes?
3. Is the pacing too slow?
4. Did the writer follow the outline?
Be strict but constructive. If the chapter is boring, request a rewrite.`
};
