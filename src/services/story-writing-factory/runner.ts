/**
 * Story Writing Factory - Story Runner
 *
 * Chạy liên tục đến khi hoàn thành bộ truyện:
 * 1. Plan Story → 2. Plan All Arcs → 3. Write Arc by Arc → 4. Write Chapter by Chapter
 *
 * Optimizations:
 * - Hierarchical memory for context management
 * - Beat ledger for anti-repetition
 * - Cost optimization with tiered models
 * - Auto-save for crash recovery
 */

import { AIProviderService } from '../ai-provider';
import { StoryPlanner } from './planner';
import { ChapterWriter } from './chapter';
import { MemoryManager, ChapterMemory } from './memory';
import { CostOptimizer, WorkflowOptimizer } from './cost-optimizer';
import {
  StoryOutline,
  ArcOutline,
  WorldBible,
  StyleBible,
  ChapterResult,
  ChapterContent,
  RunnerState,
  RunnerStatus,
  RunnerCallbacks,
  RunnerConfig,
  FactoryConfig,
  DEFAULT_CONFIG,
  GenreType,
} from './types';
import { getStyleByGenre, getPowerSystemByGenre } from './templates';

// Sprint 1/2/3 Quality Systems
import { FullQCGating, FullGateResult } from './qc-gating';
import { CharacterDepthTracker } from './character-depth';
import { BattleVarietyTracker, BattleType, TacticalApproach, CombatElement, BattleOutcome } from './battle-variety';
import { PowerTracker } from './power-tracker';
import { WritingStyleAnalyzer, writingStyleAnalyzer } from './writing-style-analyzer';
import { dialogueAnalyzer } from './dialogue-analyzer';

// ============================================================================
// DEFAULT RUNNER CONFIG
// ============================================================================

const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  delayBetweenChapters: 2000, // 2 seconds
  delayBetweenArcs: 5000, // 5 seconds
  maxChapterRetries: 3,
  maxArcRetries: 2,
  autoSaveEnabled: true,
  autoSaveInterval: 5, // Save every 5 chapters
  minQualityToProgress: 6,
  pauseOnError: true,
  pauseAfterArc: false,
};

// ============================================================================
// STORY RUNNER CLASS
// ============================================================================

export class StoryRunner {
  private config: FactoryConfig;
  private runnerConfig: RunnerConfig;

  // Components
  private aiService: AIProviderService;
  private planner: StoryPlanner;
  private chapterWriter: ChapterWriter;
  private memoryManager: MemoryManager | null = null;
  private costOptimizer: CostOptimizer;

  // Sprint 1/2/3 Quality Systems
  private fullQCGating: FullQCGating | null = null;
  private characterTracker: CharacterDepthTracker | null = null;
  private battleTracker: BattleVarietyTracker | null = null;
  private powerTracker: PowerTracker | null = null;

  // State
  private state: RunnerState | null = null;
  private storyOutline: StoryOutline | null = null;
  private arcOutlines: ArcOutline[] = [];
  private worldBible: WorldBible | null = null;
  private styleBible: StyleBible | null = null;
  private writtenChapters: Map<number, ChapterContent> = new Map();
  private lastQualityScore: number = 7;
  private lastQCResult: FullGateResult | null = null;

  // Control flags
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;

  // Callbacks
  private callbacks: RunnerCallbacks = {};

  constructor(
    factoryConfig?: Partial<FactoryConfig>,
    runnerConfig?: Partial<RunnerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...factoryConfig };
    this.runnerConfig = { ...DEFAULT_RUNNER_CONFIG, ...runnerConfig };

    this.aiService = new AIProviderService();
    this.planner = new StoryPlanner(this.config, this.aiService);
    this.chapterWriter = new ChapterWriter(this.config, this.aiService);
    this.costOptimizer = new CostOptimizer({ cacheEnabled: true });
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setCallbacks(callbacks: RunnerCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  configure(config: Partial<RunnerConfig>) {
    this.runnerConfig = { ...this.runnerConfig, ...config };
  }

  // ============================================================================
  // MAIN ENTRY: RUN UNTIL COMPLETE
  // ============================================================================

  /**
   * Setup and run the entire story from start to finish
   */
  async run(input: {
    title: string;
    protagonistName: string;
    genre?: GenreType;
    premise?: string;
    targetChapters?: number;
    chaptersPerArc?: number;
  }): Promise<{ success: boolean; state: RunnerState; error?: string }> {
    if (this.isRunning) {
      return {
        success: false,
        state: this.state!,
        error: 'Runner is already running',
      };
    }

    const genre = input.genre || this.config.genre;
    const targetChapters = input.targetChapters || 200;
    const chaptersPerArc = input.chaptersPerArc || 20;
    const targetArcs = Math.ceil(targetChapters / chaptersPerArc);

    // Initialize state
    this.state = this.createInitialState(targetChapters, targetArcs);
    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;

    // Initialize memory manager
    this.memoryManager = new MemoryManager(this.state.projectId);

    // Initialize Sprint 1/2/3 Quality Systems
    this.characterTracker = new CharacterDepthTracker(this.state.projectId);
    this.battleTracker = new BattleVarietyTracker(this.state.projectId);
    this.powerTracker = new PowerTracker(this.state.projectId);
    this.fullQCGating = new FullQCGating(this.state.projectId, undefined, {
      battleTracker: this.battleTracker,
      characterTracker: this.characterTracker,
    });

    // Try to load existing state (for crash recovery)
    const loaded = await this.memoryManager.load();
    if (loaded) {
      this.callbacks.onStatusChange?.('idle', 'Đã khôi phục từ lần chạy trước');
      // Also try to load quality system state
      try {
        await this.characterTracker.initialize();
        await this.battleTracker.initialize();
        await this.powerTracker.initialize();
        await this.fullQCGating.initialize();
      } catch (e) {
        // Non-fatal: quality systems can work without prior data
      }
    }

    try {
      // ========== PHASE 1: PLAN STORY ==========
      this.updateStatus('planning_story', 'Đang lên cốt truyện...');

      const storyResult = await this.planner.planStory({
        title: input.title,
        protagonistName: input.protagonistName,
        genre,
        premise: input.premise,
        targetChapters,
        chaptersPerArc,
      });

      if (!storyResult.success || !storyResult.data) {
        throw new Error(`Story planning failed: ${storyResult.error}`);
      }

      this.storyOutline = storyResult.data;
      this.callbacks.onStoryPlanned?.(this.storyOutline);

      // Create world and style bibles
      this.worldBible = this.createWorldBible(
        this.storyOutline,
        input.protagonistName,
        genre
      );
      this.styleBible = getStyleByGenre(genre);

      // Initialize memory with world bible
      this.memoryManager!.setWorldBible(this.worldBible);
      this.memoryManager!.setStoryEssence({
        title: this.storyOutline.title,
        genre,
        premise: this.storyOutline.premise,
        protagonistName: input.protagonistName,
        mainGoal: this.storyOutline.protagonist.endGoal,
      });

      // ========== PHASE 2: PLAN ALL ARCS ==========
      this.updateStatus('planning_arcs', 'Đang lên dàn ý tất cả các arc...');

      const arcsResult = await this.planner.planAllArcs(
        this.storyOutline,
        this.worldBible
      );

      if (!arcsResult.success || !arcsResult.data) {
        throw new Error(`Arc planning failed: ${arcsResult.error}`);
      }

      this.arcOutlines = arcsResult.data;

      for (const arc of this.arcOutlines) {
        this.callbacks.onArcPlanned?.(arc);
      }

      // ========== PHASE 3: WRITE ARC BY ARC ==========
      this.updateStatus('writing', 'Bắt đầu viết truyện...');

      for (let arcIndex = 0; arcIndex < this.arcOutlines.length; arcIndex++) {
        if (this.shouldStop) break;
        if (this.isPaused) {
          await this.waitForResume();
        }

        const arc = this.arcOutlines[arcIndex];
        this.state.currentArc = arc.arcNumber;

        this.callbacks.onArcStarted?.(arc.arcNumber, arc);

        // Write all chapters in this arc
        const arcResult = await this.writeArc(arc);

        if (!arcResult.success) {
          if (this.shouldStop) {
            // Don't mark as completed if stopped
            break;
          }
          if (this.runnerConfig.pauseOnError) {
            this.isPaused = true;
            this.updateStatus('paused', `Arc ${arc.arcNumber} failed: ${arcResult.error}`);
            await this.waitForResume();
          }
        }

        // Only mark arc complete if not stopped
        if (!this.shouldStop) {
          arc.status = 'completed';
          this.callbacks.onArcCompleted?.(arc.arcNumber, arc);
        }

        // Pause after arc if configured
        if (this.runnerConfig.pauseAfterArc && arcIndex < this.arcOutlines.length - 1) {
          this.isPaused = true;
          this.updateStatus('paused', `Arc ${arc.arcNumber} hoàn thành. Chờ tiếp tục...`);
          await this.waitForResume();
        }

        // Delay between arcs
        if (arcIndex < this.arcOutlines.length - 1) {
          await this.delay(this.runnerConfig.delayBetweenArcs);
        }
      }

      // ========== COMPLETED ==========
      this.updateStatus('completed', 'Hoàn thành bộ truyện!');
      this.callbacks.onCompleted?.(this.state);

      return { success: true, state: this.state };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus('error', errorMsg);
      this.callbacks.onError?.(errorMsg);

      return {
        success: false,
        state: this.state,
        error: errorMsg,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Resume from a saved state (continue from where we left off)
   */
  async resume(): Promise<{ success: boolean; state: RunnerState; error?: string }> {
    if (!this.state) {
      return {
        success: false,
        state: this.createInitialState(0, 0),
        error: 'No state to resume from',
      };
    }

    if (this.isRunning && !this.isPaused) {
      return {
        success: false,
        state: this.state,
        error: 'Runner is already running',
      };
    }

    this.isPaused = false;
    this.shouldStop = false;

    return { success: true, state: this.state };
  }

  /**
   * Pause execution
   */
  pause() {
    this.isPaused = true;
    this.updateStatus('paused', 'Đã tạm dừng');
  }

  /**
   * Stop execution completely
   */
  stop() {
    this.shouldStop = true;
    this.isPaused = false;
  }

  /**
   * Get current state
   */
  getState(): RunnerState | null {
    return this.state;
  }

  /**
   * Get story outline
   */
  getStoryOutline(): StoryOutline | null {
    return this.storyOutline;
  }

  /**
   * Get all arc outlines
   */
  getArcOutlines(): ArcOutline[] {
    return this.arcOutlines;
  }

  /**
   * Get written chapters
   */
  getWrittenChapters(): Map<number, ChapterContent> {
    return this.writtenChapters;
  }

  /**
   * Get cost report
   */
  getCostReport() {
    return this.costOptimizer.getCostReport();
  }

  /**
   * Get memory manager
   */
  getMemoryManager(): MemoryManager | null {
    return this.memoryManager;
  }

  /**
   * Get quality systems
   */
  getQualitySystems() {
    return {
      qcGating: this.fullQCGating,
      characterTracker: this.characterTracker,
      battleTracker: this.battleTracker,
      powerTracker: this.powerTracker,
      lastQCResult: this.lastQCResult,
    };
  }

  /**
   * Estimate cost for remaining chapters
   */
  estimateRemainingCost(): { estimatedCost: number; breakdown: Record<string, number> } {
    const remaining = this.state
      ? this.state.totalChapters - this.state.chaptersWritten
      : 0;
    return this.costOptimizer.estimateCost(remaining, this.config.use3AgentWorkflow);
  }

  // ============================================================================
  // PRIVATE: ARC WRITING
  // ============================================================================

  private async writeArc(arc: ArcOutline): Promise<{ success: boolean; error?: string }> {
    arc.status = 'in_progress';

    for (let i = 0; i < arc.chapterOutlines.length; i++) {
      if (this.shouldStop) return { success: false, error: 'Stopped by user' };
      if (this.isPaused) await this.waitForResume();

      const chapterPlan = arc.chapterOutlines[i];
      const chapterNumber = chapterPlan.chapterNumber;

      this.state!.currentChapter = chapterNumber;
      this.callbacks.onChapterStarted?.(chapterNumber);

      // Determine context level based on chapter importance
      const contextLevel = WorkflowOptimizer.getContextLevel(chapterNumber);
      let previousSummary: string;

      if (this.memoryManager) {
        // Use hierarchical memory for optimized context
        if (contextLevel === 'full') {
          previousSummary = this.memoryManager.buildContext(chapterNumber, 2000);
        } else if (contextLevel === 'medium') {
          previousSummary = this.memoryManager.buildContext(chapterNumber, 1000);
        } else {
          previousSummary = this.memoryManager.buildMinimalContext(chapterNumber);
        }

        // Add beat restrictions to context
        const restrictions = this.memoryManager.getBeatRestrictions(chapterNumber);
        if (restrictions.length > 0) {
          previousSummary += `\n\n⚠️ AVOID: ${restrictions.join(', ')}`;
        }

        // Add character depth context (Sprint 2)
        if (this.characterTracker) {
          const needsDev = this.characterTracker.getCharactersNeedingDevelopment(chapterNumber);
          if (needsDev.length > 0) {
            const highPriority = needsDev.filter(d => d.priority === 'high').slice(0, 2);
            if (highPriority.length > 0) {
              previousSummary += `\n\n📌 CHARACTER DEVELOPMENT NEEDED:`;
              for (const dev of highPriority) {
                previousSummary += `\n- ${dev.character.name}: ${dev.reason}`;
              }
            }
          }
        }

        // Add last QC feedback for improvement (Sprint 1/2/3)
        if (this.lastQCResult && this.lastQCResult.scores.overall < 65) {
          previousSummary += `\n\n⚠️ QUALITY NOTE (từ chương trước):`;
          for (const warning of this.lastQCResult.warnings.slice(0, 3)) {
            previousSummary += `\n- ${warning}`;
          }
        }
      } else {
        previousSummary = this.getPreviousSummary(chapterNumber);
      }

      // Decide if 3-agent workflow is needed (cost optimization)
      const use3Agent = WorkflowOptimizer.shouldUse3Agent(chapterNumber, this.lastQualityScore);

      // Write chapter
      let result: ChapterResult;
      if (use3Agent) {
        result = await this.chapterWriter.writeChapter(chapterNumber, {
          worldBible: this.worldBible!,
          styleBible: this.styleBible!,
          currentArc: {
            id: arc.id,
            projectId: this.state!.projectId,
            arcNumber: arc.arcNumber,
            title: arc.title,
            theme: arc.theme,
            startChapter: arc.startChapter,
            endChapter: arc.endChapter,
            tensionCurve: arc.tensionCurve,
            climaxChapter: arc.startChapter + Math.floor(arc.chapterCount * 0.75),
            status: arc.status,
          },
          previousSummary,
        });
      } else {
        // Use simple workflow to save costs
        result = await this.chapterWriter.writeChapterSimple(chapterNumber, {
          worldBible: this.worldBible!,
          styleBible: this.styleBible!,
          previousSummary,
        });
      }

      // Track cost
      this.costOptimizer.recordCall(
        use3Agent ? 'write_chapter_3agent' : 'write_chapter_simple',
        result.data?.wordCount ? result.data.wordCount * 2 : 4000
      );

      if (result.success && result.data) {
        // ========== QC EVALUATION (Sprint 1/2/3) ==========
        let qcPassed = true;
        if (this.fullQCGating) {
          try {
            const qcResult = await this.fullQCGating.evaluateFull(
              chapterNumber,
              result.data.content,
              {
                protagonistPowerLevel: this.powerTracker ? {
                  realm: this.powerTracker.getPowerState(this.worldBible!.protagonist.name)?.realm || '',
                  realmIndex: 0,
                } : undefined,
                charactersInvolved: [this.worldBible!.protagonist.name],
              }
            );

            this.lastQCResult = qcResult;

            // Run writing style analysis (lightweight, always runs)
            const styleResult = writingStyleAnalyzer.analyzeStyle(result.data.content);

            // Log quality metrics
            this.callbacks.onStatusChange?.('writing',
              `Ch.${chapterNumber} QC: ${qcResult.scores.overall}/100 | ` +
              `Style: ${styleResult.overallScore} | ` +
              `Action: ${qcResult.action}`
            );

            // If QC says auto_rewrite, log warning but still accept
            // (full auto-rewrite integration is handled by AutoRewriter)
            if (qcResult.action === 'auto_rewrite') {
              this.callbacks.onError?.(`Ch.${chapterNumber} QC low (${qcResult.scores.overall}): ${qcResult.failures.join(', ')}`);
            }
          } catch (e) {
            // QC failure is non-fatal
          }
        }

        // Store chapter
        this.writtenChapters.set(chapterNumber, result.data);

        // ========== UPDATE TRACKING SYSTEMS ==========

        // Update memory manager
        if (this.memoryManager) {
          const chapterMemory: ChapterMemory = {
            chapterNumber,
            title: result.data.title,
            summary: `${result.data.title}: ${result.data.content.substring(0, 200)}...`,
            keyEvents: [],
            charactersInvolved: [this.worldBible!.protagonist.name],
            locationUsed: '',
            plotThreadsAdvanced: [],
            emotionalBeat: '',
            cliffhanger: result.data.content.slice(-200),
            wordCount: result.data.wordCount,
          };
          this.memoryManager.addChapter(chapterMemory);

          // Record dopamine if detected
          if (result.data.dopamineDelivered) {
            for (const dp of result.data.dopamineDelivered) {
              this.memoryManager.recordDopamine(chapterNumber, dp.type, dp.intensity, dp.description);
              this.memoryManager.recordBeat(chapterNumber, dp.type, dp.description, []);
            }
          }

          // Save chapter content to file
          await this.memoryManager.saveChapter(chapterNumber, result.data.content, result.data.title);
        }

        // Update quality tracking
        this.lastQualityScore = result.data.qualityScore || 7;

        // Update stats
        this.state!.chaptersWritten++;
        this.state!.totalWords += result.data.wordCount;
        this.state!.averageWordsPerChapter = Math.round(
          this.state!.totalWords / this.state!.chaptersWritten
        );
        this.state!.lastActivityAt = Date.now();

        this.callbacks.onChapterCompleted?.(chapterNumber, result);
        this.emitProgress();

        // Auto-save every N chapters
        if (this.runnerConfig.autoSaveEnabled &&
            chapterNumber % this.runnerConfig.autoSaveInterval === 0) {
          await this.memoryManager?.save();
        }
      } else {
        this.state!.chaptersFailed++;
        this.state!.lastError = result.error;
        this.callbacks.onChapterFailed?.(chapterNumber, result.error || 'Unknown error');

        if (this.runnerConfig.pauseOnError) {
          this.isPaused = true;
          this.updateStatus('paused', `Chapter ${chapterNumber} failed: ${result.error}`);
          await this.waitForResume();
        }
      }

      // Delay between chapters
      if (i < arc.chapterOutlines.length - 1) {
        await this.delay(this.runnerConfig.delayBetweenChapters);
      }
    }

    return { success: true };
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

  private createInitialState(totalChapters: number, totalArcs: number): RunnerState {
    return {
      projectId: `runner_${Date.now()}`,
      status: 'idle',
      currentArc: 0,
      currentChapter: 0,
      totalArcs,
      totalChapters,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      chaptersWritten: 0,
      chaptersFailed: 0,
      totalWords: 0,
      averageWordsPerChapter: 0,
      retryCount: 0,
    };
  }

  private createWorldBible(
    outline: StoryOutline,
    protagonistName: string,
    genre: GenreType
  ): WorldBible {
    const powerSystem = getPowerSystemByGenre(genre);

    return {
      projectId: this.state!.projectId,
      storyTitle: outline.title,
      powerSystem,
      protagonist: {
        name: protagonistName,
        realm: powerSystem.realms[0].name,
        level: 1,
        age: 18,
        traits: ['kiên trì', 'thông minh'],
        abilities: [],
        inventory: [],
        goals: [outline.protagonist.endGoal],
        status: 'active',
      },
      npcRelationships: [],
      locations: [],
      openPlotThreads: outline.majorPlotPoints.map(pp => ({
        id: pp.id,
        name: pp.name,
        description: pp.description,
        priority: pp.importance === 'critical' ? 'main' : 'sub',
        status: 'open',
        startChapter: 1,
      })),
      resolvedPlotThreads: [],
      foreshadowing: [],
      worldRules: [
        'Sức mạnh quyết định địa vị',
        'Cảnh giới cao áp chế cảnh giới thấp',
      ],
    };
  }

  private getPreviousSummary(chapterNumber: number): string {
    if (chapterNumber === 1) {
      return 'Đây là chương đầu tiên.';
    }

    // Get recent chapters from writtenChapters map
    const recentChapters: { chapterNumber: number; summary: string }[] = [];
    for (let i = chapterNumber - 1; i >= Math.max(1, chapterNumber - 3); i--) {
      const chapter = this.writtenChapters.get(i);
      if (chapter) {
        recentChapters.unshift({
          chapterNumber: i,
          summary: `Chương ${i}: ${chapter.title}`,
        });
      }
    }

    if (recentChapters.length === 0) {
      return 'Không có chương trước.';
    }

    return recentChapters.map(s => s.summary).join('\n');
  }

  private updateStatus(status: RunnerStatus, message: string) {
    if (this.state) {
      this.state.status = status;
      this.state.lastActivityAt = Date.now();
    }
    this.callbacks.onStatusChange?.(status, message);
  }

  private emitProgress() {
    if (this.state) {
      this.callbacks.onProgress?.(this.state);
    }
  }

  private async waitForResume(): Promise<void> {
    while (this.isPaused && !this.shouldStop) {
      await this.delay(500);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createStoryRunner(
  factoryConfig?: Partial<FactoryConfig>,
  runnerConfig?: Partial<RunnerConfig>
): StoryRunner {
  return new StoryRunner(factoryConfig, runnerConfig);
}

// Export singleton
let defaultRunner: StoryRunner | null = null;

export function getStoryRunner(
  factoryConfig?: Partial<FactoryConfig>,
  runnerConfig?: Partial<RunnerConfig>
): StoryRunner {
  if (!defaultRunner) {
    defaultRunner = new StoryRunner(factoryConfig, runnerConfig);
  }
  return defaultRunner;
}
