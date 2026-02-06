/**
 * Production Manager Service for Story Factory
 * Manages the production queue and chapter writing workflow
 */

import { createClient } from '@supabase/supabase-js';
import {
  ProductionQueueItem,
  StoryBlueprint,
  AIAuthorProfile,
  ChapterWriteQueueItem,
  ServiceResult,
  BatchResult,
  ProductionStatus,
  PublishSlot,
  DEFAULT_PUBLISH_SLOTS,
  FactoryConfig,
} from './types';

export class ProductionManagerService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: { supabaseUrl?: string; supabaseKey?: string }) {
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Start production for a blueprint
   * Creates novel, project, and adds to production queue
   */
  async startProduction(
    blueprint: StoryBlueprint,
    author: AIAuthorProfile,
    chaptersPerDay: number = 20
  ): Promise<ServiceResult<ProductionQueueItem>> {
    const supabase = this.getSupabase();

    try {
      // 1. Create novel record
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert({
          title: blueprint.title,
          slug: this.generateSlug(blueprint.title),
          author: author.pen_name,
          description: blueprint.short_synopsis,
          genre: blueprint.genre,
          cover_url: blueprint.cover_url,
          status: 'ongoing',
          total_chapters: 0,
          is_premium: false,
        })
        .select()
        .single();

      if (novelError) {
        throw new Error(`Failed to create novel: ${novelError.message}`);
      }

      // 2. Create AI story project for context tracking
      const { data: project, error: projectError } = await supabase
        .from('ai_story_projects')
        .insert({
          name: blueprint.title,
          genre: blueprint.genre,
          description: blueprint.full_synopsis,
          status: 'active',
          settings: {
            blueprint_id: blueprint.id,
            author_id: author.id,
            target_chapters: blueprint.total_planned_chapters,
          },
        })
        .select()
        .single();

      if (projectError) {
        // Rollback novel creation
        await supabase.from('novels').delete().eq('id', novel.id);
        throw new Error(`Failed to create project: ${projectError.message}`);
      }

      // 3. Add to production queue
      const { data: production, error: prodError } = await supabase
        .from('production_queue')
        .insert({
          blueprint_id: blueprint.id,
          novel_id: novel.id,
          project_id: project.id,
          author_id: author.id,
          status: 'queued',
          priority: 0,
          current_chapter: 0,
          total_chapters: blueprint.total_planned_chapters,
          chapters_per_day: chaptersPerDay,
          chapters_written_today: 0,
          running_plot_threads: [],
          character_states: {},
          quality_scores: [],
        })
        .select()
        .single();

      if (prodError) {
        // Rollback
        await supabase.from('novels').delete().eq('id', novel.id);
        await supabase.from('ai_story_projects').delete().eq('id', project.id);
        throw new Error(`Failed to create production: ${prodError.message}`);
      }

      // 4. Update blueprint status
      await supabase
        .from('story_blueprints')
        .update({ status: 'in_production' })
        .eq('id', blueprint.id);

      // 5. Update idea status
      if (blueprint.idea_id) {
        await supabase
          .from('story_ideas')
          .update({
            status: 'in_production',
            production_started_at: new Date().toISOString(),
          })
          .eq('id', blueprint.idea_id);
      }

      // 6. Update author stats
      await supabase
        .from('ai_author_profiles')
        .update({
          total_stories: author.total_stories + 1,
        })
        .eq('id', author.id);

      return {
        success: true,
        data: production as ProductionQueueItem,
      };
    } catch (error) {
      console.error('[ProductionManagerService] Start production error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PRODUCTION_START_ERROR',
      };
    }
  }

  /**
   * Activate queued productions (move from queued to active)
   */
  async activateProductions(
    count: number,
    maxActive: number = 500
  ): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();

    // Check current active count
    const { count: activeCount, error: countError } = await supabase
      .from('production_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (countError) {
      return {
        success: false,
        error: countError.message,
        errorCode: 'DB_COUNT_ERROR',
      };
    }

    const availableSlots = Math.max(0, maxActive - (activeCount || 0));
    const toActivate = Math.min(count, availableSlots);

    if (toActivate <= 0) {
      return { success: true, data: 0 };
    }

    // Get queued productions by priority
    const { data: queued, error: selectError } = await supabase
      .from('production_queue')
      .select('id')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('queued_at', { ascending: true })
      .limit(toActivate);

    if (selectError) {
      return {
        success: false,
        error: selectError.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    if (!queued || queued.length === 0) {
      return { success: true, data: 0 };
    }

    // Activate them
    const ids = queued.map((p) => p.id);
    const { error: updateError } = await supabase
      .from('production_queue')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true, data: ids.length };
  }

  /**
   * Get active productions that need chapters written today
   */
  async getProductionsNeedingChapters(limit: number = 100): Promise<ServiceResult<ProductionQueueItem[]>> {
    const supabase = this.getSupabase();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('production_queue')
      .select('*')
      .eq('status', 'active')
      .or(`last_write_date.is.null,last_write_date.neq.${today}`)
      .order('priority', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    // Filter to only those with chapters remaining for today
    const filtered = (data as ProductionQueueItem[]).filter((p) => {
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = p.last_write_date !== today;
      const chaptersNeeded = isNewDay ? p.chapters_per_day : p.chapters_per_day - p.chapters_written_today;
      const hasChaptersRemaining = p.current_chapter < (p.total_chapters || Infinity);
      return chaptersNeeded > 0 && hasChaptersRemaining;
    });

    return {
      success: true,
      data: filtered,
    };
  }

  /**
   * Schedule chapters to be written for a production
   */
  async scheduleChaptersForProduction(
    production: ProductionQueueItem,
    chaptersToWrite: number,
    publishSlots: typeof DEFAULT_PUBLISH_SLOTS = DEFAULT_PUBLISH_SLOTS
  ): Promise<ServiceResult<ChapterWriteQueueItem[]>> {
    const supabase = this.getSupabase();

    // Calculate scheduled times based on publish slots
    const scheduledItems: Omit<ChapterWriteQueueItem, 'id' | 'created_at'>[] = [];
    let chapterNum = production.current_chapter + 1;

    // Distribute chapters across slots
    const now = new Date();
    let slotIndex = 0;
    let chaptersInCurrentSlot = 0;

    for (let i = 0; i < chaptersToWrite; i++) {
      const slot = publishSlots[slotIndex];
      const scheduledTime = this.calculateScheduledTime(now, slot, chaptersInCurrentSlot);

      scheduledItems.push({
        production_id: production.id,
        chapter_number: chapterNum,
        arc_number: this.getArcNumber(chapterNum),
        status: 'pending',
        attempt_count: 0,
        previous_summary: production.last_chapter_summary,
        plot_objectives: null,
        tension_target: this.calculateTensionTarget(chapterNum, production.total_chapters || 1500),
        special_instructions: null,
        result_chapter_id: null,
        content_preview: null,
        word_count: null,
        quality_score: null,
        error_message: null,
        scheduled_slot: slot.name as PublishSlot,
        scheduled_time: scheduledTime.toISOString(),
        started_at: null,
        completed_at: null,
      });

      chapterNum++;
      chaptersInCurrentSlot++;

      // Move to next slot if current is full
      if (chaptersInCurrentSlot >= slot.chapters) {
        slotIndex = (slotIndex + 1) % publishSlots.length;
        chaptersInCurrentSlot = 0;
      }
    }

    const { data, error } = await supabase
      .from('chapter_write_queue')
      .insert(scheduledItems)
      .select();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: data as ChapterWriteQueueItem[],
    };
  }

  /**
   * Update production after chapter is written
   */
  async updateProductionAfterChapter(
    productionId: string,
    chapterNumber: number,
    summary: string,
    qualityScore: number
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();
    const today = new Date().toISOString().split('T')[0];

    // Get current production
    const { data: production, error: fetchError } = await supabase
      .from('production_queue')
      .select('*')
      .eq('id', productionId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: fetchError.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    const prod = production as ProductionQueueItem;
    const isNewDay = prod.last_write_date !== today;
    const newChaptersToday = isNewDay ? 1 : prod.chapters_written_today + 1;

    // Update quality scores (keep last 10)
    const qualityScores = [...(prod.quality_scores || []), qualityScore].slice(-10);
    const avgQuality =
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    // Check if finished
    const isFinished = chapterNumber >= (prod.total_chapters || Infinity);

    const { error: updateError } = await supabase
      .from('production_queue')
      .update({
        current_chapter: chapterNumber,
        last_chapter_summary: summary,
        last_write_date: today,
        chapters_written_today: newChaptersToday,
        quality_scores: qualityScores,
        avg_chapter_quality: avgQuality,
        consecutive_errors: 0, // Reset on success
        ...(isFinished && {
          status: 'finished',
          finished_at: new Date().toISOString(),
        }),
      })
      .eq('id', productionId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    // Update novel chapter count
    await supabase
      .from('novels')
      .update({ total_chapters: chapterNumber })
      .eq('id', prod.novel_id);

    return { success: true };
  }

  /**
   * Record production error
   */
  async recordError(
    productionId: string,
    error: string,
    pauseIfConsecutive: number = 3
  ): Promise<ServiceResult<{ paused: boolean }>> {
    const supabase = this.getSupabase();

    const { data: production, error: fetchError } = await supabase
      .from('production_queue')
      .select('consecutive_errors')
      .eq('id', productionId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: fetchError.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    const consecutiveErrors = (production?.consecutive_errors || 0) + 1;
    const shouldPause = consecutiveErrors >= pauseIfConsecutive;

    const { error: updateError } = await supabase
      .from('production_queue')
      .update({
        consecutive_errors: consecutiveErrors,
        last_error: error,
        last_error_at: new Date().toISOString(),
        ...(shouldPause && {
          status: 'paused',
          paused_at: new Date().toISOString(),
          paused_reason: `Paused after ${consecutiveErrors} consecutive errors: ${error}`,
        }),
      })
      .eq('id', productionId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return {
      success: true,
      data: { paused: shouldPause },
    };
  }

  /**
   * Resume a paused production
   */
  async resumeProduction(productionId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('production_queue')
      .update({
        status: 'active',
        paused_at: null,
        paused_reason: null,
        consecutive_errors: 0,
      })
      .eq('id', productionId);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Get production statistics
   */
  async getProductionStats(): Promise<
    ServiceResult<{
      queued: number;
      active: number;
      paused: number;
      finished: number;
      errored: number;
      chaptersToday: number;
    }>
  > {
    const supabase = this.getSupabase();
    const today = new Date().toISOString().split('T')[0];

    const [queued, active, writing, paused, finished, errored, chaptersTodayResult] = await Promise.all([
      supabase.from('production_queue').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
      supabase.from('production_queue').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('production_queue').select('*', { count: 'exact', head: true }).eq('status', 'writing'),
      supabase.from('production_queue').select('*', { count: 'exact', head: true }).eq('status', 'paused'),
      supabase.from('production_queue').select('*', { count: 'exact', head: true }).eq('status', 'finished'),
      supabase.from('production_queue').select('*', { count: 'exact', head: true }).eq('status', 'error'),
      supabase.from('production_queue').select('chapters_written_today').eq('last_write_date', today),
    ]);

    const firstError = [queued, active, writing, paused, finished, errored, chaptersTodayResult].find(r => r.error);
    if (firstError?.error) {
      return {
        success: false,
        error: firstError.error.message,
        errorCode: 'DB_COUNT_ERROR',
      };
    }

    const chaptersToday = (chaptersTodayResult.data || []).reduce(
      (sum: number, row: { chapters_written_today: number }) => sum + (row.chapters_written_today || 0),
      0
    );

    return {
      success: true,
      data: {
        queued: queued.count || 0,
        active: (active.count || 0) + (writing.count || 0),
        paused: paused.count || 0,
        finished: finished.count || 0,
        errored: errored.count || 0,
        chaptersToday,
      },
    };
  }

  /**
   * Reset daily counters (run at midnight)
   */
  async resetDailyCounters(): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('production_queue')
      .update({ chapters_written_today: 0 })
      .neq('status', 'finished')
      .select('id');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true, data: data?.length || 0 };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private calculateScheduledTime(
    baseDate: Date,
    slot: typeof DEFAULT_PUBLISH_SLOTS[0],
    indexInSlot: number
  ): Date {
    const date = new Date(baseDate);
    const slotDuration = slot.end_hour - slot.start_hour;
    const minutesPerChapter = (slotDuration * 60) / slot.chapters;
    const minutesOffset = indexInSlot * minutesPerChapter;

    date.setHours(slot.start_hour, Math.floor(minutesOffset), 0, 0);
    return date;
  }

  private getArcNumber(chapterNumber: number): number {
    // Simple arc calculation: ~200 chapters per arc
    return Math.ceil(chapterNumber / 200);
  }

  private calculateTensionTarget(chapterNumber: number, totalChapters: number): number {
    // Tension follows a wave pattern with overall increase
    const progress = chapterNumber / totalChapters;
    const baseWave = Math.sin(chapterNumber * 0.05) * 30; // Wave pattern
    const progressBonus = progress * 30; // Increases over time
    const randomVariation = Math.random() * 20 - 10; // Random variation

    return Math.max(10, Math.min(100, 40 + baseWave + progressBonus + randomVariation));
  }
}

// Singleton instance
let productionManagerInstance: ProductionManagerService | null = null;

export function getProductionManagerService(): ProductionManagerService {
  if (!productionManagerInstance) {
    productionManagerInstance = new ProductionManagerService();
  }
  return productionManagerInstance;
}

export function createProductionManagerService(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
}): ProductionManagerService {
  return new ProductionManagerService(options);
}
