/**
 * Factory Orchestrator Service
 * Main coordinator for the Story Factory system
 * Handles daily tasks, main loop, and bootstrapping
 */

import { createClient } from '@supabase/supabase-js';
import { IdeaBankService, getIdeaBankService } from './idea-bank';
import { BlueprintFactoryService, getBlueprintFactoryService } from './blueprint-factory';
import { ChapterWriterService, getChapterWriterService } from './chapter-writer';
import { ProductionManagerService, getProductionManagerService } from './production-manager';
import { PublishingSchedulerService, getPublishingSchedulerService } from './publishing-scheduler';
import { QualityControllerService, getQualityControllerService } from './quality-controller';
import { AuthorManagerService, getAuthorManagerService } from './author-manager';
import { ErrorHandlerService, getErrorHandlerService } from './error-handler';
import {
  FactoryConfig,
  FactoryDashboardStats,
  BootstrapConfig,
  BootstrapProgress,
  ServiceResult,
  StoryIdea,
  StoryBlueprint,
  AIAuthorProfile,
  ProductionQueueItem,
} from './types';

export class FactoryOrchestrator {
  private ideaBank: IdeaBankService;
  private blueprintFactory: BlueprintFactoryService;
  private chapterWriter: ChapterWriterService;
  private productionManager: ProductionManagerService;
  private publishingScheduler: PublishingSchedulerService;
  private qualityController: QualityControllerService;
  private authorManager: AuthorManagerService;
  private errorHandler: ErrorHandlerService;

  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    ideaBank?: IdeaBankService;
    blueprintFactory?: BlueprintFactoryService;
    chapterWriter?: ChapterWriterService;
    productionManager?: ProductionManagerService;
    publishingScheduler?: PublishingSchedulerService;
    qualityController?: QualityControllerService;
    authorManager?: AuthorManagerService;
    errorHandler?: ErrorHandlerService;
  }) {
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    this.ideaBank = options?.ideaBank || getIdeaBankService();
    this.blueprintFactory = options?.blueprintFactory || getBlueprintFactoryService();
    this.chapterWriter = options?.chapterWriter || getChapterWriterService();
    this.productionManager = options?.productionManager || getProductionManagerService();
    this.publishingScheduler = options?.publishingScheduler || getPublishingSchedulerService();
    this.qualityController = options?.qualityController || getQualityControllerService();
    this.authorManager = options?.authorManager || getAuthorManagerService();
    this.errorHandler = options?.errorHandler || getErrorHandlerService();
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Get factory configuration
   */
  async getConfig(): Promise<ServiceResult<FactoryConfig>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase.from('factory_config').select('*').single();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as FactoryConfig,
    };
  }

  /**
   * Update factory configuration
   */
  async updateConfig(updates: Partial<FactoryConfig>): Promise<ServiceResult<FactoryConfig>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('factory_config')
      .update(updates)
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
      data: data as FactoryConfig,
    };
  }

  /**
   * Start the factory
   */
  async start(): Promise<ServiceResult<void>> {
    return this.updateConfig({ is_running: true }).then((r) => ({
      success: r.success,
      error: r.error,
    }));
  }

  /**
   * Stop the factory
   */
  async stop(): Promise<ServiceResult<void>> {
    return this.updateConfig({ is_running: false }).then((r) => ({
      success: r.success,
      error: r.error,
    }));
  }

  /**
   * Run daily tasks (should be called at midnight)
   * - Reset daily counters
   * - Generate new ideas
   * - Create blueprints from approved ideas
   * - Start new productions
   * - Clean up old errors
   */
  async runDailyTasks(): Promise<
    ServiceResult<{
      ideasGenerated: number;
      blueprintsCreated: number;
      productionsStarted: number;
      errorsCleanedUp: number;
    }>
  > {
    const startTime = Date.now();
    const results = {
      ideasGenerated: 0,
      blueprintsCreated: 0,
      productionsStarted: 0,
      errorsCleanedUp: 0,
    };

    try {
      // Log run start
      const supabase = this.getSupabase();
      const { data: runLog } = await supabase
        .from('factory_run_log')
        .insert({
          run_type: 'daily_tasks',
          status: 'running',
        })
        .select()
        .single();

      // Get config
      const configResult = await this.getConfig();
      if (!configResult.success || !configResult.data) {
        throw new Error('Failed to get config');
      }
      const config = configResult.data;

      // Check if factory is running
      if (!config.is_running) {
        return {
          success: true,
          data: results,
        };
      }

      // 1. Reset daily counters
      await this.productionManager.resetDailyCounters();

      // 2. Generate new ideas
      const ideasResult = await this.ideaBank.generateAndSaveIdeas(
        config.ideas_per_day,
        config.genre_distribution
      );
      results.ideasGenerated = ideasResult.succeeded;

      // 3. Auto-approve ideas (for fully automated mode)
      await this.ideaBank.autoApproveIdeas(config.new_stories_per_day);

      // 4. Get approved ideas and create blueprints
      const approvedIdeas = await this.ideaBank.getApprovedIdeas(config.new_stories_per_day);
      if (approvedIdeas.success && approvedIdeas.data) {
        const authors = await this.authorManager.getActiveAuthors();
        if (authors.success && authors.data) {
          const blueprintResult = await this.blueprintFactory.batchGenerateBlueprints(
            approvedIdeas.data,
            authors.data,
            Math.floor((config.min_chapters + config.max_chapters) / 2)
          );
          results.blueprintsCreated = blueprintResult.succeeded;
        }
      }

      // 5. Start new productions from ready blueprints
      const readyBlueprints = await this.blueprintFactory.getReadyBlueprints(config.new_stories_per_day);
      if (readyBlueprints.success && readyBlueprints.data) {
        for (const blueprint of readyBlueprints.data) {
          const authorResult = await this.authorManager.findAuthorForGenre(blueprint.genre);
          if (authorResult.success && authorResult.data) {
            const prodResult = await this.productionManager.startProduction(
              blueprint,
              authorResult.data,
              config.chapters_per_story_per_day
            );
            if (prodResult.success) {
              results.productionsStarted++;
            }
          }
        }
      }

      // 6. Activate queued productions
      await this.productionManager.activateProductions(
        config.new_stories_per_day,
        config.max_active_stories
      );

      // 7. Clean up old errors
      const cleanupResult = await this.errorHandler.cleanupOldErrors(30);
      results.errorsCleanedUp = cleanupResult.data || 0;

      // 8. Auto-resolve old minor errors
      await this.errorHandler.autoResolveOldErrors(7);

      // Update config with last run time
      await this.updateConfig({ last_daily_run: new Date().toISOString() });

      // Log run completion
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (runLog) {
        await supabase
          .from('factory_run_log')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_seconds: duration,
            results,
            items_processed:
              results.ideasGenerated + results.blueprintsCreated + results.productionsStarted,
          })
          .eq('id', runLog.id);
      }

      // Save daily stats
      await this.saveDailyStats(results);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      await this.errorHandler.logError({
        error_type: 'system_error',
        error_message: `Daily tasks failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DAILY_TASKS_ERROR',
      };
    }
  }

  /**
   * Run main loop iteration (should be called every 5-10 minutes)
   * - Check for chapters to write
   * - Write pending chapters
   * - Publish due chapters
   */
  async runMainLoop(): Promise<
    ServiceResult<{
      chaptersWritten: number;
      chaptersPublished: number;
      errors: number;
    }>
  > {
    const startTime = Date.now();
    const results = {
      chaptersWritten: 0,
      chaptersPublished: 0,
      errors: 0,
    };

    try {
      // Get config
      const configResult = await this.getConfig();
      if (!configResult.success || !configResult.data || !configResult.data.is_running) {
        return { success: true, data: results };
      }
      const config = configResult.data;

      // Log run start
      const supabase = this.getSupabase();
      const { data: runLog } = await supabase
        .from('factory_run_log')
        .insert({
          run_type: 'main_loop',
          status: 'running',
        })
        .select()
        .single();

      // 1. Get productions needing chapters
      const productionsResult = await this.productionManager.getProductionsNeedingChapters(50);
      if (productionsResult.success && productionsResult.data) {
        for (const production of productionsResult.data) {
          try {
            // Schedule chapters if not already scheduled
            await this.scheduleChaptersForProduction(production, config);
          } catch (error) {
            results.errors++;
            await this.errorHandler.logError({
              error_type: 'system_error',
              error_message: `Failed to schedule chapters: ${error}`,
              production_id: production.id,
              severity: 'warning',
            });
          }
        }
      }

      // 2. Write pending chapters
      const pendingChapters = await this.chapterWriter.getPendingChapters(20);
      if (pendingChapters.success && pendingChapters.data) {
        for (const queueItem of pendingChapters.data) {
          try {
            const writeResult = await this.writeQueuedChapter(queueItem, config);
            if (writeResult.success) {
              results.chaptersWritten++;
            } else {
              results.errors++;
            }
          } catch (error) {
            results.errors++;
            await this.errorHandler.logError({
              error_type: 'ai_failure',
              error_message: `Chapter write failed: ${error}`,
              production_id: queueItem.production_id,
              chapter_number: queueItem.chapter_number,
              severity: 'warning',
            });
          }
        }
      }

      // 3. Publish due chapters
      const publishResult = await this.publishingScheduler.publishDueChapters();
      results.chaptersPublished = publishResult.succeeded;
      results.errors += publishResult.failed;

      // Log run completion
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (runLog) {
        await supabase
          .from('factory_run_log')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_seconds: duration,
            results,
            items_processed: results.chaptersWritten + results.chaptersPublished,
          })
          .eq('id', runLog.id);
      }

      return { success: true, data: results };
    } catch (error) {
      await this.errorHandler.logError({
        error_type: 'system_error',
        error_message: `Main loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MAIN_LOOP_ERROR',
      };
    }
  }

  /**
   * Bootstrap the factory with initial stories
   */
  async bootstrap(
    config: BootstrapConfig,
    onProgress?: (progress: BootstrapProgress) => void
  ): Promise<ServiceResult<BootstrapProgress>> {
    const progress: BootstrapProgress = {
      phase: 'ideas',
      total: config.total_stories,
      completed: 0,
      errors: [],
    };

    try {
      const factoryConfig = await this.getConfig();
      if (!factoryConfig.success || !factoryConfig.data) {
        throw new Error('Failed to get factory config');
      }

      const distribution = config.genre_distribution || factoryConfig.data.genre_distribution;
      const authors = await this.authorManager.getActiveAuthors();
      if (!authors.success || !authors.data?.length) {
        throw new Error('No active authors available');
      }

      // Phase 1: Generate Ideas
      progress.phase = 'ideas';
      onProgress?.(progress);

      const ideasResult = await this.ideaBank.generateAndSaveIdeas(config.total_stories, distribution);
      progress.completed = ideasResult.succeeded;
      onProgress?.(progress);

      if (ideasResult.failed > 0) {
        progress.errors.push(`Failed to generate ${ideasResult.failed} ideas`);
      }

      // Auto-approve all generated ideas
      await this.ideaBank.autoApproveIdeas(config.total_stories);

      // Phase 2: Create Blueprints
      progress.phase = 'blueprints';
      progress.completed = 0;
      onProgress?.(progress);

      const approvedIdeas = await this.ideaBank.getApprovedIdeas(config.total_stories);
      if (approvedIdeas.success && approvedIdeas.data) {
        const blueprintResult = await this.blueprintFactory.batchGenerateBlueprints(
          approvedIdeas.data,
          authors.data,
          1500
        );
        progress.completed = blueprintResult.succeeded;
        if (blueprintResult.failed > 0) {
          progress.errors.push(`Failed to create ${blueprintResult.failed} blueprints`);
        }
      }
      onProgress?.(progress);

      // Phase 3: Generate Covers (optional, can be slow)
      progress.phase = 'covers';
      progress.completed = 0;
      onProgress?.(progress);

      // Skip cover generation for speed - can be done later
      progress.completed = config.total_stories;
      onProgress?.(progress);

      // Phase 4: Start Productions
      progress.phase = 'production';
      progress.completed = 0;
      onProgress?.(progress);

      const readyBlueprints = await this.blueprintFactory.getReadyBlueprints(config.total_stories);
      if (readyBlueprints.success && readyBlueprints.data) {
        // Also include 'generated' status blueprints (without covers)
        const supabase = this.getSupabase();
        const { data: generatedBlueprints } = await supabase
          .from('story_blueprints')
          .select('*')
          .eq('status', 'generated')
          .limit(config.total_stories);

        const allBlueprints = [...(readyBlueprints.data || []), ...(generatedBlueprints || [])].slice(
          0,
          config.total_stories
        );

        for (const blueprint of allBlueprints) {
          const authorResult = await this.authorManager.findAuthorForGenre(blueprint.genre);
          if (authorResult.success && authorResult.data) {
            const prodResult = await this.productionManager.startProduction(
              blueprint,
              authorResult.data,
              factoryConfig.data.chapters_per_story_per_day
            );
            if (prodResult.success) {
              progress.completed++;
              onProgress?.(progress);
            }
          }
        }
      }

      // Activate productions if requested
      if (config.start_immediately) {
        await this.productionManager.activateProductions(
          config.total_stories,
          factoryConfig.data.max_active_stories
        );
        await this.start();
      }

      progress.phase = 'complete';
      onProgress?.(progress);

      return { success: true, data: progress };
    } catch (error) {
      progress.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        data: progress,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BOOTSTRAP_ERROR',
      };
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<ServiceResult<FactoryDashboardStats>> {
    const supabase = this.getSupabase();

    // Use database function if available
    const { data, error } = await supabase.rpc('get_factory_dashboard_stats');

    if (!error && data) {
      return { success: true, data: data as FactoryDashboardStats };
    }

    // Fallback: Manual calculation
    const [prodStats, ideaCount, blueprintCount, publishStats, errorStats, authorStats] =
      await Promise.all([
        this.productionManager.getProductionStats(),
        this.ideaBank.getIdeaCounts(),
        this.blueprintFactory.getReadyBlueprints(1),
        this.publishingScheduler.getPublishingStats(),
        this.errorHandler.getDashboardSummary(),
        this.authorManager.getAuthorStats(),
      ]);

    const stats: FactoryDashboardStats = {
      active_stories: prodStats.data?.active || 0,
      queued_stories: prodStats.data?.queued || 0,
      total_stories: (prodStats.data?.active || 0) + (prodStats.data?.queued || 0) + (prodStats.data?.finished || 0),
      chapters_today: prodStats.data?.chaptersToday || 0,
      pending_ideas: ideaCount.data?.generated || 0,
      ready_blueprints: blueprintCount.data?.length || 0,
      pending_publishes: publishStats.data?.upcoming_hour || 0,
      new_errors: errorStats.data?.newErrors || 0,
      total_authors: authorStats.data?.active || 0,
    };

    return { success: true, data: stats };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async scheduleChaptersForProduction(
    production: ProductionQueueItem,
    config: FactoryConfig
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = production.last_write_date !== today;
    const chaptersToSchedule = isNewDay
      ? production.chapters_per_day
      : production.chapters_per_day - production.chapters_written_today;

    if (chaptersToSchedule <= 0) return;

    await this.productionManager.scheduleChaptersForProduction(
      production,
      chaptersToSchedule,
      config.publish_slots
    );
  }

  private async writeQueuedChapter(
    queueItem: any,
    config: FactoryConfig
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    // Get production and blueprint info
    const { data: production } = await supabase
      .from('production_queue')
      .select('*, story_blueprints(*), ai_author_profiles(*)')
      .eq('id', queueItem.production_id)
      .single();

    if (!production) {
      return { success: false, error: 'Production not found' };
    }

    // Update queue status to writing
    await this.chapterWriter.updateWriteQueueStatus(queueItem.id, 'writing');

    // Write the chapter
    const writeResult = await this.chapterWriter.writeChapter({
      blueprint: production.story_blueprints,
      production: production,
      chapter_number: queueItem.chapter_number,
      previous_chapters_summary: production.last_chapter_summary || '',
      plot_objectives: queueItem.plot_objectives || '',
      tension_target: queueItem.tension_target || 50,
      special_instructions: queueItem.special_instructions,
      author_persona: production.ai_author_profiles?.persona_prompt || '',
    });

    if (!writeResult.success || !writeResult.data) {
      await this.chapterWriter.updateWriteQueueStatus(queueItem.id, 'failed', {
        error_message: writeResult.error,
      });
      await this.productionManager.recordError(production.id, writeResult.error || 'Write failed');
      return { success: false, error: writeResult.error };
    }

    // Check quality
    const qualityResult = await this.qualityController.checkQuality({
      content: writeResult.data.content,
      chapter_number: queueItem.chapter_number,
      genre: production.story_blueprints.genre,
      blueprint: production.story_blueprints,
      min_quality_score: config.min_chapter_quality,
    });

    let finalContent = writeResult.data.content;
    let finalScore = qualityResult.data?.score || 7;

    // Auto-rewrite if quality is low
    if (qualityResult.success && qualityResult.data && !qualityResult.data.passed) {
      await this.chapterWriter.updateWriteQueueStatus(queueItem.id, 'rewriting');

      const rewriteResult = await this.qualityController.autoRewrite(
        writeResult.data.content,
        qualityResult.data,
        production.ai_author_profiles,
        config.max_rewrite_attempts
      );

      if (rewriteResult.success && rewriteResult.data) {
        finalContent = rewriteResult.data.content;
        finalScore = rewriteResult.data.finalScore;
      }
    }

    // Save chapter to database
    const saveResult = await this.chapterWriter.saveChapter(production.novel_id, {
      ...writeResult.data,
      content: finalContent,
    });

    if (!saveResult.success || !saveResult.data) {
      await this.chapterWriter.updateWriteQueueStatus(queueItem.id, 'failed', {
        error_message: saveResult.error,
      });
      return { success: false, error: saveResult.error };
    }

    // Update queue as completed
    await this.chapterWriter.updateWriteQueueStatus(queueItem.id, 'completed', {
      chapter_id: saveResult.data.chapterId,
      content_preview: finalContent.substring(0, 500),
      word_count: writeResult.data.word_count,
      quality_score: finalScore,
    });

    // Update production
    await this.productionManager.updateProductionAfterChapter(
      production.id,
      queueItem.chapter_number,
      writeResult.data.summary,
      finalScore
    );

    // Update author stats
    await this.authorManager.updateAuthorStats(production.author_id, finalScore);

    // Schedule for publishing
    await this.publishingScheduler.schedulePublish(
      production.id,
      saveResult.data.chapterId,
      queueItem.scheduled_slot || 'evening',
      queueItem.scheduled_time ? new Date(queueItem.scheduled_time) : undefined
    );

    return { success: true };
  }

  private async saveDailyStats(results: {
    ideasGenerated: number;
    blueprintsCreated: number;
    productionsStarted: number;
  }): Promise<void> {
    const supabase = this.getSupabase();
    const today = new Date().toISOString().split('T')[0];

    const prodStats = await this.productionManager.getProductionStats();
    const publishStats = await this.publishingScheduler.getPublishingStats();

    await supabase.from('factory_stats').upsert({
      stat_date: today,
      active_stories: prodStats.data?.active || 0,
      stories_started: results.productionsStarted,
      stories_finished: prodStats.data?.finished || 0,
      stories_paused: prodStats.data?.paused || 0,
      stories_errored: prodStats.data?.errored || 0,
      chapters_written: prodStats.data?.chaptersToday || 0,
      chapters_published: publishStats.data?.published_today || 0,
      ideas_generated: results.ideasGenerated,
      blueprints_created: results.blueprintsCreated,
    });
  }
}

// Singleton instance
let orchestratorInstance: FactoryOrchestrator | null = null;

export function getFactoryOrchestrator(): FactoryOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new FactoryOrchestrator();
  }
  return orchestratorInstance;
}

export function createFactoryOrchestrator(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
}): FactoryOrchestrator {
  return new FactoryOrchestrator(options);
}
