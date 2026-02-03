/**
 * Story Writing Factory - Cost Optimizer
 *
 * Strategies:
 * 1. Tiered Models - Use cheaper models for simpler tasks
 * 2. Caching - Cache similar requests
 * 3. Batch Optimization - Combine requests where possible
 * 4. Smart Retries - Avoid unnecessary API calls
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface ModelTier {
  name: string;
  provider: string;
  model: string;
  costPer1kTokens: number; // USD
  maxTokens: number;
  bestFor: TaskComplexity[];
}

export interface CacheEntry {
  key: string;
  response: string;
  createdAt: number;
  expiresAt: number;
  hits: number;
}

export interface CostReport {
  totalCalls: number;
  totalTokens: number;
  estimatedCost: number;
  savedByCaching: number;
  callsByTask: Record<string, number>;
  tokensByTask: Record<string, number>;
}

// ============================================================================
// MODEL TIERS
// ============================================================================

export const MODEL_TIERS: Record<string, ModelTier> = {
  // Cheap tier - For summarization, simple tasks
  cheap: {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    costPer1kTokens: 0.0005, // $0.50 per 1M tokens
    maxTokens: 4096,
    bestFor: ['simple'],
  },

  // Medium tier - For outlines, planning
  medium: {
    name: 'GPT-4o Mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    costPer1kTokens: 0.00015, // Very cheap
    maxTokens: 16384,
    bestFor: ['simple', 'medium'],
  },

  // Premium tier - For actual writing, complex reasoning
  premium: {
    name: 'Claude Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    costPer1kTokens: 0.003,
    maxTokens: 8192,
    bestFor: ['medium', 'complex'],
  },

  // Top tier - For critical chapters, quality issues
  top: {
    name: 'Claude Opus',
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    costPer1kTokens: 0.015,
    maxTokens: 8192,
    bestFor: ['complex'],
  },
};

// ============================================================================
// TASK MAPPINGS
// ============================================================================

export const TASK_COMPLEXITY: Record<string, TaskComplexity> = {
  // Simple tasks - Use cheap models
  'summarize_chapter': 'simple',
  'extract_key_events': 'simple',
  'count_dopamine': 'simple',
  'check_consistency': 'simple',

  // Medium tasks - Use medium models
  'create_outline': 'medium',
  'plan_arc': 'medium',
  'critic_review': 'medium',
  'generate_cliffhanger': 'medium',

  // Complex tasks - Use premium models
  'write_chapter': 'complex',
  'write_golden_chapter': 'complex', // First 3 chapters
  'rewrite_chapter': 'complex',
  'plan_story': 'complex',
};

// ============================================================================
// COST OPTIMIZER CLASS
// ============================================================================

export class CostOptimizer {
  private cache: Map<string, CacheEntry> = new Map();
  private costReport: CostReport;
  private cacheEnabled: boolean;
  private cacheTTL: number; // ms

  constructor(options?: {
    cacheEnabled?: boolean;
    cacheTTL?: number;
  }) {
    this.cacheEnabled = options?.cacheEnabled ?? true;
    this.cacheTTL = options?.cacheTTL ?? 3600000; // 1 hour default

    this.costReport = {
      totalCalls: 0,
      totalTokens: 0,
      estimatedCost: 0,
      savedByCaching: 0,
      callsByTask: {},
      tokensByTask: {},
    };
  }

  // ============================================================================
  // MODEL SELECTION
  // ============================================================================

  /**
   * Get optimal model for task
   */
  getModelForTask(taskType: string, chapterNumber?: number): ModelTier {
    const complexity = TASK_COMPLEXITY[taskType] || 'medium';

    // Special case: Golden chapters (1-3) always use premium
    if (chapterNumber && chapterNumber <= 3 && taskType === 'write_chapter') {
      return MODEL_TIERS.premium;
    }

    // Special case: First arc chapters use premium for better hook
    if (chapterNumber && chapterNumber <= 20 && taskType === 'write_chapter') {
      return MODEL_TIERS.premium;
    }

    // Normal selection based on complexity
    switch (complexity) {
      case 'simple':
        return MODEL_TIERS.medium; // GPT-4o-mini is very cheap
      case 'medium':
        return MODEL_TIERS.medium;
      case 'complex':
        return MODEL_TIERS.premium;
      default:
        return MODEL_TIERS.medium;
    }
  }

  /**
   * Get model config for AI service
   */
  getModelConfig(taskType: string, chapterNumber?: number): {
    provider: string;
    model: string;
    maxTokens: number;
  } {
    const tier = this.getModelForTask(taskType, chapterNumber);
    return {
      provider: tier.provider,
      model: tier.model,
      maxTokens: tier.maxTokens,
    };
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  /**
   * Generate cache key from prompt
   */
  private generateCacheKey(prompt: string, taskType: string): string {
    // Simple hash - in production use proper hash
    const hash = prompt.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    return `${taskType}_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Check cache for response
   */
  checkCache(prompt: string, taskType: string): string | null {
    if (!this.cacheEnabled) return null;

    const key = this.generateCacheKey(prompt, taskType);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.response;
  }

  /**
   * Store response in cache
   */
  storeCache(prompt: string, taskType: string, response: string): void {
    if (!this.cacheEnabled) return;

    const key = this.generateCacheKey(prompt, taskType);
    this.cache.set(key, {
      key,
      response,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.cacheTTL,
      hits: 0,
    });

    // Limit cache size
    if (this.cache.size > 1000) {
      this.pruneCache();
    }
  }

  /**
   * Remove old/unused cache entries
   */
  private pruneCache(): void {
    const entries = Array.from(this.cache.entries());

    // Sort by hits (least used first), then by age
    entries.sort((a, b) => {
      if (a[1].hits !== b[1].hits) return a[1].hits - b[1].hits;
      return a[1].createdAt - b[1].createdAt;
    });

    // Remove bottom 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  // ============================================================================
  // COST TRACKING
  // ============================================================================

  /**
   * Record API call for cost tracking
   */
  recordCall(taskType: string, tokens: number, cached: boolean = false): void {
    if (cached) {
      const tier = this.getModelForTask(taskType);
      this.costReport.savedByCaching += (tokens / 1000) * tier.costPer1kTokens;
      return;
    }

    this.costReport.totalCalls++;
    this.costReport.totalTokens += tokens;

    // Track by task
    this.costReport.callsByTask[taskType] = (this.costReport.callsByTask[taskType] || 0) + 1;
    this.costReport.tokensByTask[taskType] = (this.costReport.tokensByTask[taskType] || 0) + tokens;

    // Estimate cost
    const tier = this.getModelForTask(taskType);
    this.costReport.estimatedCost += (tokens / 1000) * tier.costPer1kTokens;
  }

  /**
   * Get cost report
   */
  getCostReport(): CostReport {
    return { ...this.costReport };
  }

  /**
   * Estimate cost for writing N chapters
   */
  estimateCost(chapterCount: number, use3AgentWorkflow: boolean = true): {
    estimatedCost: number;
    breakdown: Record<string, number>;
  } {
    const tokensPerChapter = {
      outline: 2000,
      write: 4000,
      critic: 1500,
      summary: 500,
    };

    let totalCost = 0;
    const breakdown: Record<string, number> = {};

    for (let i = 1; i <= chapterCount; i++) {
      // Outline
      const outlineTier = this.getModelForTask('create_outline', i);
      const outlineCost = (tokensPerChapter.outline / 1000) * outlineTier.costPer1kTokens;
      totalCost += outlineCost;
      breakdown['outline'] = (breakdown['outline'] || 0) + outlineCost;

      // Write
      const writeTier = this.getModelForTask('write_chapter', i);
      const writeCost = (tokensPerChapter.write / 1000) * writeTier.costPer1kTokens;
      totalCost += writeCost;
      breakdown['write'] = (breakdown['write'] || 0) + writeCost;

      // Critic (if 3-agent)
      if (use3AgentWorkflow) {
        const criticTier = this.getModelForTask('critic_review', i);
        const criticCost = (tokensPerChapter.critic / 1000) * criticTier.costPer1kTokens;
        totalCost += criticCost;
        breakdown['critic'] = (breakdown['critic'] || 0) + criticCost;
      }

      // Summary (cheap)
      const summaryTier = this.getModelForTask('summarize_chapter', i);
      const summaryCost = (tokensPerChapter.summary / 1000) * summaryTier.costPer1kTokens;
      totalCost += summaryCost;
      breakdown['summary'] = (breakdown['summary'] || 0) + summaryCost;
    }

    return {
      estimatedCost: Math.round(totalCost * 100) / 100,
      breakdown,
    };
  }

  // ============================================================================
  // SMART RETRIES
  // ============================================================================

  /**
   * Determine if we should retry based on error
   */
  shouldRetry(error: string, retryCount: number, maxRetries: number = 3): boolean {
    if (retryCount >= maxRetries) return false;

    // Always retry rate limits
    if (error.includes('rate_limit') || error.includes('429')) return true;

    // Retry transient errors
    if (error.includes('timeout') || error.includes('network')) return true;

    // Don't retry content/validation errors
    if (error.includes('content_policy') || error.includes('invalid')) return false;

    // Default: retry up to max
    return retryCount < maxRetries;
  }

  /**
   * Get retry delay with exponential backoff
   */
  getRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    // Add jitter
    return delay + Math.random() * 1000;
  }
}

// ============================================================================
// WORKFLOW OPTIMIZER
// ============================================================================

export class WorkflowOptimizer {
  /**
   * Decide if 3-agent workflow is needed
   */
  static shouldUse3Agent(chapterNumber: number, previousQuality: number = 7): boolean {
    // Always use 3-agent for golden chapters
    if (chapterNumber <= 3) return true;

    // Use 3-agent if previous quality was low
    if (previousQuality < 6) return true;

    // Use 3-agent for arc climax chapters
    const arcLength = 20;
    const positionInArc = ((chapterNumber - 1) % arcLength) + 1;
    const isClimaxArea = positionInArc >= 15 && positionInArc <= 18;
    if (isClimaxArea) return true;

    // Use 3-agent every 5th chapter for quality maintenance
    if (chapterNumber % 5 === 0) return true;

    // Otherwise, skip critic to save costs
    return false;
  }

  /**
   * Decide if we need full context or minimal
   */
  static getContextLevel(chapterNumber: number): 'full' | 'medium' | 'minimal' {
    // Golden chapters need full context
    if (chapterNumber <= 3) return 'full';

    // Arc transitions need full context
    const arcLength = 20;
    const positionInArc = ((chapterNumber - 1) % arcLength) + 1;
    if (positionInArc === 1 || positionInArc >= 19) return 'full';

    // Climax area needs medium context
    if (positionInArc >= 14 && positionInArc <= 18) return 'medium';

    // Regular chapters can use minimal
    return 'minimal';
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultOptimizer: CostOptimizer | null = null;

export function getCostOptimizer(): CostOptimizer {
  if (!defaultOptimizer) {
    defaultOptimizer = new CostOptimizer();
  }
  return defaultOptimizer;
}

export function createCostOptimizer(options?: {
  cacheEnabled?: boolean;
  cacheTTL?: number;
}): CostOptimizer {
  return new CostOptimizer(options);
}
