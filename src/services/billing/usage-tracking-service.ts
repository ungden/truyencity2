/**
 * Usage Tracking Service - Tracks AI writing usage for analytics and billing
 *
 * Handles:
 * - Chapter writing metrics
 * - AI token consumption
 * - Cost calculation
 * - Usage reports
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

export interface UsageMetrics {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  chapters_written: number;
  words_generated: number;
  api_calls: number;
  ai_tokens_used: number;
  ai_cost_usd: number;
  usage_by_model: Record<string, ModelUsage>;
}

export interface ModelUsage {
  calls: number;
  tokens: number;
  cost: number;
}

export interface UsageSummary {
  today: {
    chapters: number;
    words: number;
    cost: number;
  };
  thisWeek: {
    chapters: number;
    words: number;
    cost: number;
  };
  thisMonth: {
    chapters: number;
    words: number;
    cost: number;
  };
  allTime: {
    chapters: number;
    words: number;
    cost: number;
  };
}

// AI model pricing (per 1M tokens)
export const AI_MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek/deepseek-reasoner': { input: 0.55, output: 2.19 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'anthropic/claude-3-5-sonnet': { input: 3.00, output: 15.00 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  'google/gemini-3-flash-preview': { input: 0.10, output: 0.40 },
  'google/gemini-3-pro-image-preview': { input: 0.50, output: 1.50 },
};

class UsageTrackingService {
  /**
   * Record usage for a chapter writing operation
   */
  async recordChapterWriting(
    supabase: SupabaseClient,
    userId: string,
    metrics: {
      wordCount: number;
      model: string;
      inputTokens: number;
      outputTokens: number;
    }
  ): Promise<void> {
    try {
      const now = new Date();
      const periodStart = this.getPeriodStart(now);
      const periodEnd = this.getPeriodEnd(now);

      // Calculate cost
      const pricing = AI_MODEL_PRICING[metrics.model] || { input: 0.5, output: 1.0 };
      const cost = (
        (metrics.inputTokens / 1_000_000) * pricing.input +
        (metrics.outputTokens / 1_000_000) * pricing.output
      );

      // Get or create usage record for this period
      const { data: existing } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .single();

      if (existing) {
        // Update existing record
        const usageByModel = existing.usage_by_model || {};
        const modelKey = metrics.model;

        if (!usageByModel[modelKey]) {
          usageByModel[modelKey] = { calls: 0, tokens: 0, cost: 0 };
        }

        usageByModel[modelKey].calls += 1;
        usageByModel[modelKey].tokens += metrics.inputTokens + metrics.outputTokens;
        usageByModel[modelKey].cost += cost;

        await supabase
          .from('usage_tracking')
          .update({
            chapters_written: existing.chapters_written + 1,
            words_generated: existing.words_generated + metrics.wordCount,
            api_calls: existing.api_calls + 1,
            ai_tokens_used: existing.ai_tokens_used + metrics.inputTokens + metrics.outputTokens,
            ai_cost_usd: existing.ai_cost_usd + cost,
            usage_by_model: usageByModel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from('usage_tracking')
          .insert({
            user_id: userId,
            period_start: periodStart,
            period_end: periodEnd,
            chapters_written: 1,
            words_generated: metrics.wordCount,
            api_calls: 1,
            ai_tokens_used: metrics.inputTokens + metrics.outputTokens,
            ai_cost_usd: cost,
            usage_by_model: {
              [metrics.model]: {
                calls: 1,
                tokens: metrics.inputTokens + metrics.outputTokens,
                cost: cost,
              },
            },
          });
      }

      logger.info('Usage recorded', {
        userId,
        wordCount: metrics.wordCount,
        model: metrics.model,
        cost,
      });
    } catch (error) {
      logger.error('Failed to record usage', error as Error, { userId });
    }
  }

  /**
   * Get usage summary for a user
   */
  async getUsageSummary(
    supabase: SupabaseClient,
    userId: string
  ): Promise<UsageSummary> {
    try {
      const now = new Date();

      // Get all usage data
      const { data: allUsage } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false });

      if (!allUsage || allUsage.length === 0) {
        return this.emptyUsageSummary();
      }

      // Calculate summaries
      const today = this.getPeriodStart(now);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      let todayData = { chapters: 0, words: 0, cost: 0 };
      let weekData = { chapters: 0, words: 0, cost: 0 };
      let monthData = { chapters: 0, words: 0, cost: 0 };
      let allTimeData = { chapters: 0, words: 0, cost: 0 };

      for (const record of allUsage) {
        const periodStart = new Date(record.period_start);

        // All time
        allTimeData.chapters += record.chapters_written;
        allTimeData.words += record.words_generated;
        allTimeData.cost += record.ai_cost_usd;

        // This month
        if (periodStart >= monthAgo) {
          monthData.chapters += record.chapters_written;
          monthData.words += record.words_generated;
          monthData.cost += record.ai_cost_usd;
        }

        // This week
        if (periodStart >= weekAgo) {
          weekData.chapters += record.chapters_written;
          weekData.words += record.words_generated;
          weekData.cost += record.ai_cost_usd;
        }

        // Today
        if (record.period_start === today) {
          todayData.chapters = record.chapters_written;
          todayData.words = record.words_generated;
          todayData.cost = record.ai_cost_usd;
        }
      }

      return {
        today: todayData,
        thisWeek: weekData,
        thisMonth: monthData,
        allTime: allTimeData,
      };
    } catch (error) {
      logger.error('Failed to get usage summary', error as Error, { userId });
      return this.emptyUsageSummary();
    }
  }

  /**
   * Get detailed usage history
   */
  async getUsageHistory(
    supabase: SupabaseClient,
    userId: string,
    days: number = 30
  ): Promise<UsageMetrics[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('period_start', startDate.toISOString().split('T')[0])
        .order('period_start', { ascending: false });

      if (error) {
        logger.error('Failed to get usage history', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get usage history', error as Error, { userId });
      return [];
    }
  }

  /**
   * Get platform-wide usage stats (for admin)
   */
  async getPlatformStats(
    supabase: SupabaseClient
  ): Promise<{
    totalChapters: number;
    totalWords: number;
    totalCost: number;
    activeUsers: number;
    topModels: Array<{ model: string; calls: number; cost: number }>;
  }> {
    try {
      const { data: allUsage } = await supabase
        .from('usage_tracking')
        .select('*');

      if (!allUsage || allUsage.length === 0) {
        return {
          totalChapters: 0,
          totalWords: 0,
          totalCost: 0,
          activeUsers: 0,
          topModels: [],
        };
      }

      const uniqueUsers = new Set<string>();
      let totalChapters = 0;
      let totalWords = 0;
      let totalCost = 0;
      const modelStats: Record<string, { calls: number; cost: number }> = {};

      for (const record of allUsage) {
        uniqueUsers.add(record.user_id);
        totalChapters += record.chapters_written;
        totalWords += record.words_generated;
        totalCost += record.ai_cost_usd;

        // Aggregate model stats
        if (record.usage_by_model) {
          for (const [model, stats] of Object.entries(record.usage_by_model as Record<string, ModelUsage>)) {
            if (!modelStats[model]) {
              modelStats[model] = { calls: 0, cost: 0 };
            }
            modelStats[model].calls += stats.calls;
            modelStats[model].cost += stats.cost;
          }
        }
      }

      // Sort models by usage
      const topModels = Object.entries(modelStats)
        .map(([model, stats]) => ({ model, ...stats }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);

      return {
        totalChapters,
        totalWords,
        totalCost,
        activeUsers: uniqueUsers.size,
        topModels,
      };
    } catch (error) {
      logger.error('Failed to get platform stats', error as Error);
      return {
        totalChapters: 0,
        totalWords: 0,
        totalCost: 0,
        activeUsers: 0,
        topModels: [],
      };
    }
  }

  /**
   * Calculate estimated cost for a chapter
   */
  estimateChapterCost(
    model: string,
    targetWords: number
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = AI_MODEL_PRICING[model] || { input: 0.5, output: 1.0 };

    // Estimate tokens (rough: ~1.3 tokens per word for Vietnamese)
    const estimatedInputTokens = 2000; // Context + prompt
    const estimatedOutputTokens = Math.round(targetWords * 1.3);

    const inputCost = (estimatedInputTokens / 1_000_000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  // Helper methods
  private getPeriodStart(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getPeriodEnd(date: Date): string {
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    return end.toISOString().split('T')[0];
  }

  private emptyUsageSummary(): UsageSummary {
    const empty = { chapters: 0, words: 0, cost: 0 };
    return {
      today: { ...empty },
      thisWeek: { ...empty },
      thisMonth: { ...empty },
      allTime: { ...empty },
    };
  }
}

// Singleton instance
export const usageTrackingService = new UsageTrackingService();
