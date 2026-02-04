/**
 * Cost Cache - Caching and cost optimization layer
 *
 * Features:
 * 1. Embedding cache (in-memory + DB)
 * 2. Retrieval result cache
 * 3. Batch summarization by arc
 * 4. Model routing (small for QC, large for writing)
 */

import crypto from 'crypto';
import { getSupabase } from './supabase-helper';

// Model tiers for different tasks
export interface ModelTier {
  name: string;
  modelId: string;
  costPer1kTokens: number;  // USD
  maxTokens: number;
  bestFor: string[];
}

export const MODEL_TIERS: Record<string, ModelTier> = {
  // Small/Fast - for QC, summarization, extraction
  small: {
    name: 'Small',
    modelId: 'deepseek/deepseek-chat-v3-0324',  // Fast and cheap
    costPer1kTokens: 0.0001,
    maxTokens: 8000,
    bestFor: ['qc', 'summarization', 'extraction', 'classification'],
  },
  // Medium - for outline, planning
  medium: {
    name: 'Medium',
    modelId: 'anthropic/claude-3-haiku',
    costPer1kTokens: 0.00025,
    maxTokens: 16000,
    bestFor: ['outline', 'planning', 'editing'],
  },
  // Large - for actual writing
  large: {
    name: 'Large',
    modelId: 'anthropic/claude-sonnet-4',
    costPer1kTokens: 0.003,
    maxTokens: 32000,
    bestFor: ['writing', 'creative', 'complex_dialogue'],
  },
};

// Cache entry
interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

// Embedding cache
interface EmbeddingCacheEntry extends CacheEntry<number[]> {
  text: string;
  model: string;
}

// Retrieval cache
interface RetrievalCacheEntry extends CacheEntry<any[]> {
  query: string;
  projectId: string;
}

// Cost tracking
interface CostRecord {
  timestamp: number;
  model: string;
  task: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export class CostCache {
  private projectId: string;
  private embeddingCache: Map<string, EmbeddingCacheEntry> = new Map();
  private retrievalCache: Map<string, RetrievalCacheEntry> = new Map();
  private costHistory: CostRecord[] = [];

  // Cache settings
  private embeddingCacheTTL: number = 7 * 24 * 60 * 60 * 1000;  // 7 days
  private retrievalCacheTTL: number = 1 * 60 * 60 * 1000;       // 1 hour
  private maxCacheSize: number = 10000;

  // Cost limits
  private dailyBudget: number = 10;  // USD
  private sessionBudget: number = 5; // USD

  constructor(projectId: string, options?: {
    dailyBudget?: number;
    sessionBudget?: number;
  }) {
    this.projectId = projectId;
    if (options?.dailyBudget) this.dailyBudget = options.dailyBudget;
    if (options?.sessionBudget) this.sessionBudget = options.sessionBudget;
  }

  /**
   * Initialize by loading cached embeddings from DB
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();
    // Load frequently used embeddings
    const { data: embeddings } = await supabase
      .from('embedding_cache')
      .select('text_hash, embedding, model, hit_count')
      .eq('project_id', this.projectId)
      .order('hit_count', { ascending: false })
      .limit(1000);

    if (embeddings) {
      for (const e of embeddings) {
        this.embeddingCache.set(e.text_hash, {
          key: e.text_hash,
          value: e.embedding,
          text: '', // We don't need original text
          model: e.model,
          createdAt: Date.now(),
          expiresAt: Date.now() + this.embeddingCacheTTL,
          hitCount: e.hit_count,
        });
      }
    }

    // Load today's cost history
    const today = new Date().toISOString().split('T')[0];
    const { data: costs } = await supabase
      .from('cost_tracking')
      .select('*')
      .eq('project_id', this.projectId)
      .gte('created_at', today);

    if (costs) {
      this.costHistory = costs.map(c => ({
        timestamp: new Date(c.created_at).getTime(),
        model: c.model,
        task: c.task,
        inputTokens: c.input_tokens,
        outputTokens: c.output_tokens,
        cost: c.cost,
      }));
    }
  }

  /**
   * Generate hash for text
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 32);
  }

  /**
   * Get cached embedding or null
   */
  getCachedEmbedding(text: string): number[] | null {
    const hash = this.hashText(text);
    const entry = this.embeddingCache.get(hash);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.embeddingCache.delete(hash);
      return null;
    }

    entry.hitCount++;
    return entry.value;
  }

  /**
   * Cache an embedding
   */
  async cacheEmbedding(text: string, embedding: number[], model: string): Promise<void> {
    const supabase = getSupabase();
    const hash = this.hashText(text);

    // In-memory
    this.embeddingCache.set(hash, {
      key: hash,
      value: embedding,
      text,
      model,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.embeddingCacheTTL,
      hitCount: 1,
    });

    // Evict if too large
    if (this.embeddingCache.size > this.maxCacheSize) {
      this.evictLRU(this.embeddingCache);
    }

    // Persist to DB (async, don't wait)
    Promise.resolve(
      supabase
        .from('embedding_cache')
        .upsert({
          project_id: this.projectId,
          text_hash: hash,
          embedding,
          model,
          hit_count: 1,
        }, {
          onConflict: 'project_id,text_hash',
        })
    ).catch((e: Error) => console.warn('Failed to persist embedding cache:', e));
  }

  /**
   * Get cached retrieval results
   */
  getCachedRetrieval(query: string): any[] | null {
    const hash = this.hashText(`${this.projectId}:${query}`);
    const entry = this.retrievalCache.get(hash);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.retrievalCache.delete(hash);
      return null;
    }

    entry.hitCount++;
    return entry.value;
  }

  /**
   * Cache retrieval results
   */
  cacheRetrieval(query: string, results: any[]): void {
    const hash = this.hashText(`${this.projectId}:${query}`);

    this.retrievalCache.set(hash, {
      key: hash,
      value: results,
      query,
      projectId: this.projectId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.retrievalCacheTTL,
      hitCount: 1,
    });

    if (this.retrievalCache.size > 100) {
      this.evictLRU(this.retrievalCache);
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU<T>(cache: Map<string, CacheEntry<T>>): void {
    // Sort by hitCount, remove bottom 20%
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].hitCount - b[1].hitCount);

    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  /**
   * Select model based on task
   */
  selectModel(task: 'writing' | 'qc' | 'summarization' | 'outline' | 'extraction'): ModelTier {
    switch (task) {
      case 'writing':
        return MODEL_TIERS.large;
      case 'outline':
        return MODEL_TIERS.medium;
      case 'qc':
      case 'summarization':
      case 'extraction':
      default:
        return MODEL_TIERS.small;
    }
  }

  /**
   * Record cost
   */
  async recordCost(
    model: string,
    task: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<{ cost: number; withinBudget: boolean }> {
    const supabase = getSupabase();
    // Find model tier
    const tier = Object.values(MODEL_TIERS).find(t => t.modelId === model) || MODEL_TIERS.small;

    // Calculate cost
    const inputCost = (inputTokens / 1000) * tier.costPer1kTokens;
    const outputCost = (outputTokens / 1000) * tier.costPer1kTokens * 3; // Output usually costs more
    const cost = inputCost + outputCost;

    const record: CostRecord = {
      timestamp: Date.now(),
      model,
      task,
      inputTokens,
      outputTokens,
      cost,
    };

    this.costHistory.push(record);

    // Persist (async)
    Promise.resolve(
      supabase
        .from('cost_tracking')
        .insert({
          project_id: this.projectId,
          model,
          task,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost,
        })
    ).catch((e: Error) => console.warn('Failed to persist cost:', e));

    // Check budget
    const todayCost = this.getTodayCost();
    const sessionCost = this.getSessionCost();

    return {
      cost,
      withinBudget: todayCost <= this.dailyBudget && sessionCost <= this.sessionBudget,
    };
  }

  /**
   * Get today's total cost
   */
  getTodayCost(): number {
    const today = new Date().setHours(0, 0, 0, 0);
    return this.costHistory
      .filter(r => r.timestamp >= today)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get session cost (last hour)
   */
  getSessionCost(): number {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return this.costHistory
      .filter(r => r.timestamp >= hourAgo)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Check if we can proceed with a task
   */
  canProceed(estimatedTokens: number, task: string): {
    allowed: boolean;
    reason?: string;
    suggestedModel?: string;
  } {
    const tier = this.selectModel(task as any);
    const estimatedCost = (estimatedTokens / 1000) * tier.costPer1kTokens * 2;

    const todayCost = this.getTodayCost();
    const sessionCost = this.getSessionCost();

    if (todayCost + estimatedCost > this.dailyBudget) {
      return {
        allowed: false,
        reason: `Daily budget exceeded ($${todayCost.toFixed(2)} / $${this.dailyBudget})`,
        suggestedModel: MODEL_TIERS.small.modelId,
      };
    }

    if (sessionCost + estimatedCost > this.sessionBudget) {
      return {
        allowed: false,
        reason: `Session budget exceeded ($${sessionCost.toFixed(2)} / $${this.sessionBudget})`,
        suggestedModel: MODEL_TIERS.small.modelId,
      };
    }

    return { allowed: true };
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    today: number;
    session: number;
    byTask: Record<string, number>;
    byModel: Record<string, number>;
    dailyRemaining: number;
    sessionRemaining: number;
  } {
    const today = new Date().setHours(0, 0, 0, 0);
    const hourAgo = Date.now() - 60 * 60 * 1000;

    const todayRecords = this.costHistory.filter(r => r.timestamp >= today);
    const sessionRecords = this.costHistory.filter(r => r.timestamp >= hourAgo);

    const byTask: Record<string, number> = {};
    const byModel: Record<string, number> = {};

    for (const record of todayRecords) {
      byTask[record.task] = (byTask[record.task] || 0) + record.cost;
      byModel[record.model] = (byModel[record.model] || 0) + record.cost;
    }

    const todayCost = todayRecords.reduce((sum, r) => sum + r.cost, 0);
    const sessionCost = sessionRecords.reduce((sum, r) => sum + r.cost, 0);

    return {
      today: todayCost,
      session: sessionCost,
      byTask,
      byModel,
      dailyRemaining: Math.max(0, this.dailyBudget - todayCost),
      sessionRemaining: Math.max(0, this.sessionBudget - sessionCost),
    };
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    embeddingsCached: number;
    retrievalsCached: number;
    estimatedSavings: number;
  } {
    const embeddingHits = Array.from(this.embeddingCache.values())
      .reduce((sum, e) => sum + e.hitCount - 1, 0); // -1 for initial insert

    const retrievalHits = Array.from(this.retrievalCache.values())
      .reduce((sum, e) => sum + e.hitCount - 1, 0);

    // Estimate savings: ~$0.0001 per embedding, ~$0.001 per retrieval
    const estimatedSavings = embeddingHits * 0.0001 + retrievalHits * 0.001;

    return {
      embeddingsCached: this.embeddingCache.size,
      retrievalsCached: this.retrievalCache.size,
      estimatedSavings,
    };
  }
}

// Batch summarization helper
export class BatchSummarizer {
  private projectId: string;
  private pendingSummaries: Map<number, string> = new Map();
  private summarizedArcs: Set<number> = new Set();

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Queue chapter for batch summarization
   */
  queueChapter(chapterNumber: number, content: string): void {
    this.pendingSummaries.set(chapterNumber, content);
  }

  /**
   * Check if arc needs summarization
   */
  needsArcSummary(arcNumber: number, arcEndChapter: number): boolean {
    if (this.summarizedArcs.has(arcNumber)) return false;

    // Check if we have enough chapters
    const chaptersInArc = Array.from(this.pendingSummaries.keys())
      .filter(ch => ch <= arcEndChapter);

    return chaptersInArc.length >= 5; // Summarize every 5 chapters or at arc end
  }

  /**
   * Get chapters to summarize for an arc
   */
  getChaptersForArcSummary(arcStartChapter: number, arcEndChapter: number): Map<number, string> {
    const result = new Map<number, string>();

    for (const [ch, content] of this.pendingSummaries) {
      if (ch >= arcStartChapter && ch <= arcEndChapter) {
        result.set(ch, content);
      }
    }

    return result;
  }

  /**
   * Mark arc as summarized
   */
  markArcSummarized(arcNumber: number): void {
    this.summarizedArcs.add(arcNumber);
  }

  /**
   * Clear processed chapters
   */
  clearProcessed(upToChapter: number): void {
    for (const ch of this.pendingSummaries.keys()) {
      if (ch <= upToChapter) {
        this.pendingSummaries.delete(ch);
      }
    }
  }
}

export function createCostCache(projectId: string, options?: {
  dailyBudget?: number;
  sessionBudget?: number;
}): CostCache {
  return new CostCache(projectId, options);
}

export function createBatchSummarizer(projectId: string): BatchSummarizer {
  return new BatchSummarizer(projectId);
}
