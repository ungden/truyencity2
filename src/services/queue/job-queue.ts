/**
 * Job Queue System - Reliable async job processing
 *
 * Replaces fire-and-forget pattern with proper job tracking:
 * - Job persistence in database
 * - Retry with exponential backoff
 * - Timeout handling
 * - Progress tracking
 * - Failure recovery
 *
 * For production scale, consider migrating to:
 * - BullMQ with Redis
 * - Inngest
 * - Trigger.dev
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'timeout';
export type JobType = 'write_chapter' | 'batch_write' | 'analyze_chapter' | 'generate_summary' | 'export_story';

export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  priority: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  max_attempts: number;
  timeout_ms: number;
  started_at?: string;
  completed_at?: string;
  scheduled_for?: string;
  progress: number;
  progress_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJobParams {
  user_id: string;
  type: JobType;
  payload: Record<string, unknown>;
  priority?: number;
  max_attempts?: number;
  timeout_ms?: number;
  scheduled_for?: Date;
}

// Default timeouts per job type (in ms)
const JOB_TIMEOUTS: Record<JobType, number> = {
  write_chapter: 5 * 60 * 1000, // 5 minutes
  batch_write: 30 * 60 * 1000, // 30 minutes
  analyze_chapter: 2 * 60 * 1000, // 2 minutes
  generate_summary: 3 * 60 * 1000, // 3 minutes
  export_story: 10 * 60 * 1000, // 10 minutes
};

// Retry delays (exponential backoff)
const RETRY_DELAYS = [
  1000, // 1 second
  5000, // 5 seconds
  30000, // 30 seconds
  60000, // 1 minute
  300000, // 5 minutes
];

class JobQueue {
  private processingJobs: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new job
   */
  async createJob(
    supabase: SupabaseClient,
    params: CreateJobParams
  ): Promise<Job | null> {
    try {
      const timeout = params.timeout_ms || JOB_TIMEOUTS[params.type] || 5 * 60 * 1000;

      const { data, error } = await supabase
        .from('job_queue')
        .insert({
          user_id: params.user_id,
          type: params.type,
          status: 'pending',
          priority: params.priority || 0,
          payload: params.payload,
          attempts: 0,
          max_attempts: params.max_attempts || 3,
          timeout_ms: timeout,
          scheduled_for: params.scheduled_for?.toISOString() || new Date().toISOString(),
          progress: 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create job', error);
        return null;
      }

      logger.info('Job created', {
        jobId: data.id,
        type: params.type,
        userId: params.user_id,
      });

      return data;
    } catch (error) {
      logger.error('Failed to create job', error as Error);
      return null;
    }
  }

  /**
   * Get next job to process (FIFO with priority)
   */
  async getNextJob(
    supabase: SupabaseClient
  ): Promise<Job | null> {
    try {
      const now = new Date().toISOString();

      // Get pending job with highest priority, scheduled for now or earlier
      const { data, error } = await supabase
        .from('job_queue')
        .select('*')
        .in('status', ['pending', 'retrying'])
        .lte('scheduled_for', now)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is ok
          logger.error('Failed to get next job', error);
        }
        return null;
      }

      // Mark as processing
      await this.updateJobStatus(supabase, data.id, 'processing', {
        started_at: now,
        attempts: data.attempts + 1,
      });

      return { ...data, status: 'processing', started_at: now };
    } catch (error) {
      logger.error('Failed to get next job', error as Error);
      return null;
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    supabase: SupabaseClient,
    jobId: string,
    status: JobStatus,
    updates?: Partial<Job>
  ): Promise<void> {
    try {
      await supabase
        .from('job_queue')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } catch (error) {
      logger.error('Failed to update job status', error as Error, { jobId });
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    supabase: SupabaseClient,
    jobId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    try {
      await supabase
        .from('job_queue')
        .update({
          progress: Math.min(100, Math.max(0, progress)),
          progress_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } catch (error) {
      logger.error('Failed to update job progress', error as Error, { jobId });
    }
  }

  /**
   * Complete job with result
   */
  async completeJob(
    supabase: SupabaseClient,
    jobId: string,
    result: Record<string, unknown>
  ): Promise<void> {
    await this.updateJobStatus(supabase, jobId, 'completed', {
      result,
      completed_at: new Date().toISOString(),
      progress: 100,
    });

    // Clear timeout if any
    this.clearJobTimeout(jobId);

    logger.info('Job completed', { jobId, result });
  }

  /**
   * Fail job with error
   */
  async failJob(
    supabase: SupabaseClient,
    jobId: string,
    error: string,
    shouldRetry: boolean = true
  ): Promise<void> {
    const { data: job } = await supabase
      .from('job_queue')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();

    if (shouldRetry && job && job.attempts < job.max_attempts) {
      // Schedule retry with exponential backoff
      const delayIndex = Math.min(job.attempts, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[delayIndex];
      const scheduledFor = new Date(Date.now() + delay);

      await this.updateJobStatus(supabase, jobId, 'retrying', {
        error,
        scheduled_for: scheduledFor.toISOString(),
      });

      logger.info('Job scheduled for retry', {
        jobId,
        attempt: job.attempts,
        nextRetry: scheduledFor.toISOString(),
      });
    } else {
      await this.updateJobStatus(supabase, jobId, 'failed', {
        error,
        completed_at: new Date().toISOString(),
      });

      logger.error('Job failed permanently', new Error(error), { jobId });
    }

    this.clearJobTimeout(jobId);
  }

  /**
   * Set job timeout
   */
  setJobTimeout(
    supabase: SupabaseClient,
    jobId: string,
    timeoutMs: number
  ): void {
    const timeout = setTimeout(async () => {
      await this.failJob(supabase, jobId, 'Job timeout exceeded', true);
      await this.updateJobStatus(supabase, jobId, 'timeout');
    }, timeoutMs);

    this.processingJobs.set(jobId, timeout);
  }

  /**
   * Clear job timeout
   */
  private clearJobTimeout(jobId: string): void {
    const timeout = this.processingJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(
    supabase: SupabaseClient,
    jobId: string
  ): Promise<Job | null> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get job', error as Error, { jobId });
      return null;
    }
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(
    supabase: SupabaseClient,
    userId: string,
    status?: JobStatus[],
    limit: number = 20
  ): Promise<Job[]> {
    try {
      let query = supabase
        .from('job_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user jobs', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get user jobs', error as Error, { userId });
      return [];
    }
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(
    supabase: SupabaseClient,
    jobId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: job } = await supabase
        .from('job_queue')
        .select('status, user_id')
        .eq('id', jobId)
        .single();

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      if (job.user_id !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      if (!['pending', 'retrying'].includes(job.status)) {
        return { success: false, error: 'Job cannot be cancelled' };
      }

      await this.updateJobStatus(supabase, jobId, 'failed', {
        error: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel job', error as Error, { jobId });
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(
    supabase: SupabaseClient,
    daysToKeep: number = 7
  ): Promise<number> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('job_queue')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('completed_at', cutoff.toISOString())
        .select('id');

      if (error) {
        logger.error('Failed to cleanup jobs', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error('Failed to cleanup jobs', error as Error);
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(
    supabase: SupabaseClient
  ): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    avgProcessingTime: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .select('status, started_at, completed_at');

      if (error || !data) {
        return {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          avgProcessingTime: 0,
        };
      }

      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      };

      let totalProcessingTime = 0;
      let completedCount = 0;

      for (const job of data) {
        if (job.status === 'pending' || job.status === 'retrying') {
          stats.pending++;
        } else if (job.status === 'processing') {
          stats.processing++;
        } else if (job.status === 'completed') {
          stats.completed++;
          if (job.started_at && job.completed_at) {
            totalProcessingTime += new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
            completedCount++;
          }
        } else if (job.status === 'failed' || job.status === 'timeout') {
          stats.failed++;
        }
      }

      stats.avgProcessingTime = completedCount > 0 ? totalProcessingTime / completedCount : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get queue stats', error as Error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      };
    }
  }
}

// Singleton instance
export const jobQueue = new JobQueue();
