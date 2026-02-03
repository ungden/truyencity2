/**
 * Publishing Scheduler Service for Story Factory
 * Manages chapter publishing schedules and execution
 */

import { createClient } from '@supabase/supabase-js';
import {
  ChapterPublishQueueItem,
  ProductionQueueItem,
  ServiceResult,
  BatchResult,
  PublishSlot,
  DEFAULT_PUBLISH_SLOTS,
  PublishSlotConfig,
} from './types';

// Vietnam timezone offset (UTC+7)
const VIETNAM_TIMEZONE_OFFSET = 7 * 60 * 60 * 1000;

export class PublishingSchedulerService {
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
   * Schedule a chapter for publishing
   */
  async schedulePublish(
    productionId: string,
    chapterId: string,
    slot: PublishSlot,
    scheduledTime?: Date
  ): Promise<ServiceResult<ChapterPublishQueueItem>> {
    const supabase = this.getSupabase();

    // If no time provided, calculate next available time for slot
    const publishTime = scheduledTime || this.getNextSlotTime(slot);

    const { data, error } = await supabase
      .from('chapter_publish_queue')
      .insert({
        production_id: productionId,
        chapter_id: chapterId,
        scheduled_time: publishTime.toISOString(),
        publish_slot: slot,
        status: 'scheduled',
        retry_count: 0,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: data as ChapterPublishQueueItem,
    };
  }

  /**
   * Get chapters due for publishing
   */
  async getChaptersDueForPublishing(limit: number = 100): Promise<ServiceResult<ChapterPublishQueueItem[]>> {
    const supabase = this.getSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as ChapterPublishQueueItem[],
    };
  }

  /**
   * Publish a chapter (make it visible to readers)
   */
  async publishChapter(queueItemId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    // Get queue item
    const { data: queueItem, error: fetchError } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .eq('id', queueItemId)
      .single();

    if (fetchError || !queueItem) {
      return {
        success: false,
        error: 'Queue item not found',
        errorCode: 'NOT_FOUND',
      };
    }

    try {
      // Update chapter status to published
      const { error: chapterError } = await supabase
        .from('chapters')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', queueItem.chapter_id);

      if (chapterError) {
        throw new Error(`Failed to update chapter: ${chapterError.message}`);
      }

      // Update queue item
      const { error: queueError } = await supabase
        .from('chapter_publish_queue')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', queueItemId);

      if (queueError) {
        throw new Error(`Failed to update queue: ${queueError.message}`);
      }

      // Update novel's updated_at timestamp
      const { data: chapter } = await supabase
        .from('chapters')
        .select('novel_id')
        .eq('id', queueItem.chapter_id)
        .single();

      if (chapter) {
        await supabase
          .from('novels')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chapter.novel_id);
      }

      return { success: true };
    } catch (error) {
      // Record error
      await supabase
        .from('chapter_publish_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: (queueItem.retry_count || 0) + 1,
        })
        .eq('id', queueItemId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PUBLISH_ERROR',
      };
    }
  }

  /**
   * Batch publish all due chapters
   */
  async publishDueChapters(): Promise<BatchResult<ChapterPublishQueueItem>> {
    const dueResult = await this.getChaptersDueForPublishing(100);

    if (!dueResult.success || !dueResult.data) {
      return {
        success: false,
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
      };
    }

    const results: Array<{ item: ChapterPublishQueueItem; success: boolean; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of dueResult.data) {
      const publishResult = await this.publishChapter(item.id);

      if (publishResult.success) {
        results.push({ item, success: true });
        succeeded++;
      } else {
        results.push({ item, success: false, error: publishResult.error });
        failed++;
      }
    }

    return {
      success: failed === 0,
      total: dueResult.data.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Retry failed publishes
   */
  async retryFailedPublishes(maxRetries: number = 3): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();

    // Get failed items that haven't exceeded max retries
    const { data: failed, error: fetchError } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', maxRetries);

    if (fetchError) {
      return {
        success: false,
        error: fetchError.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    let retried = 0;
    for (const item of failed || []) {
      // Reset status to scheduled for retry
      await supabase
        .from('chapter_publish_queue')
        .update({
          status: 'scheduled',
          error_message: null,
        })
        .eq('id', item.id);

      const result = await this.publishChapter(item.id);
      if (result.success) {
        retried++;
      }
    }

    return { success: true, data: retried };
  }

  /**
   * Get publishing schedule for today
   */
  async getTodaySchedule(): Promise<
    ServiceResult<{
      morning: ChapterPublishQueueItem[];
      afternoon: ChapterPublishQueueItem[];
      evening: ChapterPublishQueueItem[];
    }>
  > {
    const supabase = this.getSupabase();

    // Get today's date range in Vietnam timezone
    const now = new Date();
    const vietnamNow = new Date(now.getTime() + VIETNAM_TIMEZONE_OFFSET);
    const todayStart = new Date(vietnamNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data, error } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .gte('scheduled_time', todayStart.toISOString())
      .lt('scheduled_time', todayEnd.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    const schedule = {
      morning: [] as ChapterPublishQueueItem[],
      afternoon: [] as ChapterPublishQueueItem[],
      evening: [] as ChapterPublishQueueItem[],
    };

    for (const item of data as ChapterPublishQueueItem[]) {
      switch (item.publish_slot) {
        case 'morning':
          schedule.morning.push(item);
          break;
        case 'afternoon':
          schedule.afternoon.push(item);
          break;
        case 'evening':
          schedule.evening.push(item);
          break;
      }
    }

    return { success: true, data: schedule };
  }

  /**
   * Get upcoming publishes
   */
  async getUpcomingPublishes(
    hours: number = 24
  ): Promise<ServiceResult<ChapterPublishQueueItem[]>> {
    const supabase = this.getSupabase();

    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('chapter_publish_queue')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_time', now.toISOString())
      .lte('scheduled_time', future.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as ChapterPublishQueueItem[],
    };
  }

  /**
   * Cancel scheduled publish
   */
  async cancelPublish(queueItemId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('chapter_publish_queue')
      .delete()
      .eq('id', queueItemId)
      .eq('status', 'scheduled'); // Only cancel if not yet published

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_DELETE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Reschedule a publish
   */
  async reschedulePublish(
    queueItemId: string,
    newTime: Date
  ): Promise<ServiceResult<ChapterPublishQueueItem>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('chapter_publish_queue')
      .update({
        scheduled_time: newTime.toISOString(),
        publish_slot: this.getSlotForTime(newTime),
      })
      .eq('id', queueItemId)
      .eq('status', 'scheduled')
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return {
      success: true,
      data: data as ChapterPublishQueueItem,
    };
  }

  /**
   * Get publishing statistics
   */
  async getPublishingStats(): Promise<
    ServiceResult<{
      scheduled: number;
      published_today: number;
      failed: number;
      upcoming_hour: number;
    }>
  > {
    const supabase = this.getSupabase();

    const now = new Date();
    const hourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [scheduledResult, publishedResult, failedResult, upcomingResult] = await Promise.all([
      supabase
        .from('chapter_publish_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled'),
      supabase
        .from('chapter_publish_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', todayStart.toISOString()),
      supabase
        .from('chapter_publish_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('chapter_publish_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .lte('scheduled_time', hourLater.toISOString()),
    ]);

    return {
      success: true,
      data: {
        scheduled: scheduledResult.count || 0,
        published_today: publishedResult.count || 0,
        failed: failedResult.count || 0,
        upcoming_hour: upcomingResult.count || 0,
      },
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private getNextSlotTime(slot: PublishSlot): Date {
    const slotConfig = DEFAULT_PUBLISH_SLOTS.find((s) => s.name === slot);
    if (!slotConfig) {
      throw new Error(`Invalid slot: ${slot}`);
    }

    const now = new Date();
    const vietnamNow = new Date(now.getTime() + VIETNAM_TIMEZONE_OFFSET);

    // Set to slot start hour
    const scheduled = new Date(vietnamNow);
    scheduled.setHours(slotConfig.start_hour, 0, 0, 0);

    // If slot already passed today, schedule for tomorrow
    if (scheduled <= vietnamNow) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    // Add some randomization within the slot
    const slotDurationMinutes = (slotConfig.end_hour - slotConfig.start_hour) * 60;
    const randomMinutes = Math.floor(Math.random() * slotDurationMinutes);
    scheduled.setMinutes(randomMinutes);

    // Convert back to UTC
    return new Date(scheduled.getTime() - VIETNAM_TIMEZONE_OFFSET);
  }

  private getSlotForTime(time: Date): PublishSlot {
    const vietnamTime = new Date(time.getTime() + VIETNAM_TIMEZONE_OFFSET);
    const hour = vietnamTime.getHours();

    for (const slot of DEFAULT_PUBLISH_SLOTS) {
      if (hour >= slot.start_hour && hour < slot.end_hour) {
        return slot.name as PublishSlot;
      }
    }

    // Default to evening if outside defined slots
    return 'evening';
  }
}

// Singleton instance
let publishingSchedulerInstance: PublishingSchedulerService | null = null;

export function getPublishingSchedulerService(): PublishingSchedulerService {
  if (!publishingSchedulerInstance) {
    publishingSchedulerInstance = new PublishingSchedulerService();
  }
  return publishingSchedulerInstance;
}

export function createPublishingSchedulerService(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
}): PublishingSchedulerService {
  return new PublishingSchedulerService(options);
}
