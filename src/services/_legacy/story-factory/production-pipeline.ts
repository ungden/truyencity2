/**
 * Production Pipeline - Hệ thống sản xuất song song
 * Quản lý nhiều workers viết nhiều truyện cùng lúc
 */

import {
  ProductionJob,
  WorkerStatus,
  ProductionBatch,
  StoryBlueprint,
  QualityReport,
  FactoryEvent,
  StoryFactoryConfig
} from './types';

interface QueuedChapter {
  jobId: string;
  blueprintId: string;
  storyId: string;
  chapterNumber: number;
  priority: number;
  retryCount: number;
  addedAt: Date;
}

interface WrittenChapter {
  jobId: string;
  chapterNumber: number;
  content: string;
  wordCount: number;
  qualityScore: number;
  writtenAt: Date;
}

/**
 * Worker Pool - Quản lý các workers song song
 */
export class WorkerPool {
  private workers: Map<string, WorkerStatus> = new Map();
  private maxWorkers: number;
  private activeJobs: Map<string, ProductionJob> = new Map();

  constructor(maxWorkers: number = 10) {
    this.maxWorkers = maxWorkers;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = `worker_${i + 1}`;
      this.workers.set(workerId, {
        id: workerId,
        status: 'idle',
        performance: {
          chaptersWritten: 0,
          averageTime: 0,
          averageQuality: 0,
          errorRate: 0
        }
      });
    }
  }

  /**
   * Get an available worker
   */
  getAvailableWorker(): WorkerStatus | undefined {
    for (const [id, worker] of this.workers) {
      if (worker.status === 'idle') {
        return worker;
      }
    }
    return undefined;
  }

  /**
   * Assign job to worker
   */
  assignJob(workerId: string, job: ProductionJob): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'working';
      worker.currentJob = job.id;
      this.activeJobs.set(job.id, job);
    }
  }

  /**
   * Release worker after job completion
   */
  releaseWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'idle';
      worker.currentJob = undefined;
      worker.currentChapter = undefined;
    }
  }

  /**
   * Update worker performance stats
   */
  updatePerformance(workerId: string, chapterTime: number, quality: number, success: boolean): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      const perf = worker.performance;
      const total = perf.chaptersWritten + 1;

      perf.averageTime = (perf.averageTime * perf.chaptersWritten + chapterTime) / total;
      perf.averageQuality = (perf.averageQuality * perf.chaptersWritten + quality) / total;
      perf.chaptersWritten = total;

      if (!success) {
        perf.errorRate = (perf.errorRate * (total - 1) + 1) / total;
      }
    }
  }

  /**
   * Get all workers status
   */
  getAllWorkers(): WorkerStatus[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get active workers count
   */
  getActiveCount(): number {
    return Array.from(this.workers.values()).filter(w => w.status === 'working').length;
  }

  /**
   * Get idle workers count
   */
  getIdleCount(): number {
    return Array.from(this.workers.values()).filter(w => w.status === 'idle').length;
  }
}

/**
 * Production Queue - Hàng đợi các chương cần viết
 */
export class ProductionQueue {
  private queue: QueuedChapter[] = [];
  private processing: Set<string> = new Set();

  /**
   * Add chapters to queue
   */
  enqueue(chapters: QueuedChapter[]): void {
    this.queue.push(...chapters);
    this.sortByPriority();
  }

  /**
   * Add single chapter
   */
  enqueueOne(chapter: QueuedChapter): void {
    this.queue.push(chapter);
    this.sortByPriority();
  }

  /**
   * Get next chapter to process
   */
  dequeue(): QueuedChapter | undefined {
    const chapter = this.queue.shift();
    if (chapter) {
      this.processing.add(`${chapter.jobId}_${chapter.chapterNumber}`);
    }
    return chapter;
  }

  /**
   * Mark chapter as completed
   */
  complete(jobId: string, chapterNumber: number): void {
    this.processing.delete(`${jobId}_${chapterNumber}`);
  }

  /**
   * Re-queue failed chapter with increased retry count
   */
  requeue(chapter: QueuedChapter): void {
    chapter.retryCount++;
    chapter.priority += 1; // Lower priority on retry
    this.queue.push(chapter);
    this.sortByPriority();
  }

  /**
   * Sort queue by priority (lower number = higher priority)
   */
  private sortByPriority(): void {
    this.queue.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Then by chapter number (earlier chapters first)
      return a.chapterNumber - b.chapterNumber;
    });
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Get processing count
   */
  get processingCount(): number {
    return this.processing.size;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get queue stats by job
   */
  getStatsByJob(): Map<string, { pending: number; processing: number }> {
    const stats = new Map<string, { pending: number; processing: number }>();

    // Count pending
    for (const chapter of this.queue) {
      const current = stats.get(chapter.jobId) || { pending: 0, processing: 0 };
      current.pending++;
      stats.set(chapter.jobId, current);
    }

    // Count processing
    for (const key of this.processing) {
      const jobId = key.split('_')[0];
      const current = stats.get(jobId) || { pending: 0, processing: 0 };
      current.processing++;
      stats.set(jobId, current);
    }

    return stats;
  }
}

/**
 * Production Pipeline - Main orchestrator
 */
export class ProductionPipeline {
  private workerPool: WorkerPool;
  private queue: ProductionQueue;
  private jobs: Map<string, ProductionJob> = new Map();
  private blueprints: Map<string, StoryBlueprint> = new Map();
  private writtenChapters: Map<string, WrittenChapter[]> = new Map();
  private eventHandlers: Array<(event: FactoryEvent) => Promise<void>> = [];
  private config: StoryFactoryConfig;
  private isRunning: boolean = false;
  private processInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: StoryFactoryConfig) {
    this.config = config;
    this.workerPool = new WorkerPool(config.maxWorkers);
    this.queue = new ProductionQueue();
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: FactoryEvent) => Promise<void>): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event to all handlers
   */
  private async emitEvent(event: FactoryEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Add a new story to production
   */
  async addStory(blueprint: StoryBlueprint, priority: number = 5): Promise<ProductionJob> {
    const job: ProductionJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blueprintId: blueprint.id,
      status: 'queued',
      priority,
      currentChapter: 0,
      targetChapters: blueprint.targetChapters,
      chaptersPerDay: this.config.defaultChaptersPerDay,
      totalWordsWritten: 0,
      averageQualityScore: 0,
      errorCount: 0
    };

    this.jobs.set(job.id, job);
    this.blueprints.set(blueprint.id, blueprint);
    this.writtenChapters.set(job.id, []);

    // Queue all chapters
    const chapters: QueuedChapter[] = [];
    for (let i = 1; i <= blueprint.targetChapters; i++) {
      chapters.push({
        jobId: job.id,
        blueprintId: blueprint.id,
        storyId: blueprint.id,
        chapterNumber: i,
        priority: priority + Math.floor(i / 50), // Slightly lower priority for later chapters
        retryCount: 0,
        addedAt: new Date()
      });
    }

    this.queue.enqueue(chapters);

    return job;
  }

  /**
   * Start the production pipeline
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processInterval = setInterval(() => this.processQueue(), 1000);
    console.log('Production pipeline started');
  }

  /**
   * Stop the production pipeline
   */
  stop(): void {
    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log('Production pipeline stopped');
  }

  /**
   * Process the queue - assign work to available workers
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.queue.isEmpty()) return;

    const availableWorker = this.workerPool.getAvailableWorker();
    if (!availableWorker) return;

    const chapter = this.queue.dequeue();
    if (!chapter) return;

    const job = this.jobs.get(chapter.jobId);
    if (!job) return;

    // Assign work
    this.workerPool.assignJob(availableWorker.id, job);
    job.status = 'writing';
    job.assignedWorker = availableWorker.id;
    job.lastActivity = new Date();

    // Process chapter (in real implementation, this would call AI)
    try {
      const result = await this.writeChapter(chapter, availableWorker.id);

      // Update stats
      job.currentChapter = Math.max(job.currentChapter, chapter.chapterNumber);
      job.totalWordsWritten += result.wordCount;

      const chapters = this.writtenChapters.get(job.id) || [];
      chapters.push(result);
      this.writtenChapters.set(job.id, chapters);

      // Update average quality
      const totalQuality = chapters.reduce((sum, c) => sum + c.qualityScore, 0);
      job.averageQualityScore = totalQuality / chapters.length;

      // Update worker performance
      const writeTime = Date.now() - chapter.addedAt.getTime();
      this.workerPool.updatePerformance(availableWorker.id, writeTime, result.qualityScore, true);

      // Emit event
      await this.emitEvent({
        type: 'chapter_written',
        storyId: chapter.storyId,
        chapter: chapter.chapterNumber,
        quality: result.qualityScore
      });

      // Check if story is complete
      if (job.currentChapter >= job.targetChapters) {
        job.status = 'completed';
        job.completedAt = new Date();
        await this.emitEvent({
          type: 'story_completed',
          storyId: chapter.storyId,
          totalChapters: job.targetChapters
        });
      }

      // Mark as complete
      this.queue.complete(chapter.jobId, chapter.chapterNumber);

    } catch (error) {
      console.error(`Error writing chapter ${chapter.chapterNumber} for job ${chapter.jobId}:`, error);

      job.errorCount++;
      this.workerPool.updatePerformance(availableWorker.id, 0, 0, false);

      // Retry if under limit
      if (chapter.retryCount < 3) {
        this.queue.requeue(chapter);
      } else {
        job.status = 'failed';
        job.lastError = String(error);
        await this.emitEvent({
          type: 'worker_error',
          workerId: availableWorker.id,
          error: String(error)
        });
      }
    } finally {
      // Release worker
      this.workerPool.releaseWorker(availableWorker.id);
    }
  }

  /**
   * Write a single chapter (placeholder - will integrate with AI)
   */
  private async writeChapter(chapter: QueuedChapter, workerId: string): Promise<WrittenChapter> {
    const blueprint = this.blueprints.get(chapter.blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${chapter.blueprintId}`);
    }

    // Simulate writing delay (in real implementation, this calls AI)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Placeholder content
    const content = `Chương ${chapter.chapterNumber}: [Nội dung sẽ được AI viết]`;

    return {
      jobId: chapter.jobId,
      chapterNumber: chapter.chapterNumber,
      content,
      wordCount: 2500 + Math.floor(Math.random() * 500),
      qualityScore: 7 + Math.random() * 3,
      writtenAt: new Date()
    };
  }

  /**
   * Get pipeline status
   */
  getStatus(): {
    isRunning: boolean;
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    queuedChapters: number;
    processingChapters: number;
    workers: WorkerStatus[];
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      isRunning: this.isRunning,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'writing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      queuedChapters: this.queue.length,
      processingChapters: this.queue.processingCount,
      workers: this.workerPool.getAllWorkers()
    };
  }

  /**
   * Get job details
   */
  getJob(jobId: string): ProductionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProductionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get written chapters for a job
   */
  getWrittenChapters(jobId: string): WrittenChapter[] {
    return this.writtenChapters.get(jobId) || [];
  }

  /**
   * Pause a specific job
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'writing') {
      job.status = 'queued';
    }
  }

  /**
   * Resume a paused job
   */
  resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'queued') {
      job.status = 'writing';
    }
  }

  /**
   * Cancel a job and remove from queue
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.lastError = 'Cancelled by user';
    }
    // Note: In a real implementation, we'd also remove pending chapters from queue
  }
}

/**
 * Batch Manager - Quản lý batch nhiều truyện
 */
export class BatchManager {
  private batches: Map<string, ProductionBatch> = new Map();
  private pipeline: ProductionPipeline;

  constructor(pipeline: ProductionPipeline) {
    this.pipeline = pipeline;
  }

  /**
   * Create a new batch of stories
   */
  async createBatch(
    blueprints: StoryBlueprint[],
    name: string,
    chaptersPerDay: number = 3
  ): Promise<ProductionBatch> {
    const batch: ProductionBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: new Date(),
      status: 'in_production',
      totalStories: blueprints.length,
      genres: [...new Set(blueprints.map(b => b.genre))],
      chaptersPerStory: blueprints[0]?.targetChapters || 200,
      dailyChaptersPerStory: chaptersPerDay,
      workerCount: 10,
      storiesCompleted: 0,
      totalChaptersWritten: 0,
      averageQuality: 0
    };

    this.batches.set(batch.id, batch);

    // Add all stories to production pipeline
    for (let i = 0; i < blueprints.length; i++) {
      const blueprint = blueprints[i];
      // Stagger priority so stories don't all compete
      const priority = 5 + Math.floor(i / 10);
      await this.pipeline.addStory(blueprint, priority);
    }

    // Start pipeline if not running
    this.pipeline.start();

    return batch;
  }

  /**
   * Get batch status
   */
  getBatch(batchId: string): ProductionBatch | undefined {
    return this.batches.get(batchId);
  }

  /**
   * Get all batches
   */
  getAllBatches(): ProductionBatch[] {
    return Array.from(this.batches.values());
  }

  /**
   * Update batch stats from pipeline
   */
  updateBatchStats(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const jobs = this.pipeline.getAllJobs();
    const batchJobs = jobs; // In real impl, filter by batch

    batch.storiesCompleted = batchJobs.filter(j => j.status === 'completed').length;
    batch.totalChaptersWritten = batchJobs.reduce((sum, j) => sum + j.currentChapter, 0);

    const qualitySum = batchJobs.reduce((sum, j) => sum + j.averageQualityScore, 0);
    batch.averageQuality = batchJobs.length > 0 ? qualitySum / batchJobs.length : 0;

    // Estimate completion
    if (batch.totalChaptersWritten > 0) {
      const remainingChapters = batch.totalStories * batch.chaptersPerStory - batch.totalChaptersWritten;
      const avgChaptersPerDay = batch.dailyChaptersPerStory * batch.workerCount;
      const daysRemaining = remainingChapters / avgChaptersPerDay;
      batch.estimatedCompletion = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
    }

    if (batch.storiesCompleted >= batch.totalStories) {
      batch.status = 'completed';
    }
  }
}

// Export factory function
export function createProductionPipeline(config: StoryFactoryConfig): ProductionPipeline {
  return new ProductionPipeline(config);
}
