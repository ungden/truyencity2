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

import { randomUUID } from 'crypto';
import { AIProviderService } from '../ai-provider';
import { StoryPlanner } from './planner';
import { ChapterWriter } from './chapter';
import { MemoryManager, ChapterMemory } from './memory';
import { CostOptimizer, WorkflowOptimizer } from './cost-optimizer';
import { ensureProjectRecord, getSupabase } from './supabase-helper';
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
  StoryArc,
} from './types';
import { getStyleByGenre, getPowerSystemByGenre } from './templates';
import { logger } from '@/lib/security/logger';

// Sprint 1/2/3 Quality Systems
import { FullQCGating, FullGateResult } from './qc-gating';
import { CharacterDepthTracker, CharacterRole, MotivationType, PersonalityTrait } from './character-depth';
import { BattleVarietyTracker, BattleType, TacticalApproach, BattleOutcome, CombatElement } from './battle-variety';
import { PowerTracker } from './power-tracker';
import { AutoRewriter } from './auto-rewriter';
import { CanonResolver } from './canon-resolver';
import { BeatLedger } from './beat-ledger';
import { ConsistencyChecker } from './consistency';
import { PlotArcManager } from '../plot-arc-manager';

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
  private autoRewriter: AutoRewriter | null = null;
  private canonResolver: CanonResolver | null = null;
  private beatLedger: BeatLedger | null = null;
  private consistencyChecker: ConsistencyChecker | null = null;
  private plotArcManager: PlotArcManager | null = null;

  // State
  private state: RunnerState | null = null;
  private storyOutline: StoryOutline | null = null;
  private arcOutlines: ArcOutline[] = [];
  private worldBible: WorldBible | null = null;
  private styleBible: StyleBible | null = null;
  private writtenChapters: Map<number, ChapterContent> = new Map();
  private lastQualityScore: number = 5;
  private lastQCResult: FullGateResult | null = null;
  private chaptersToWriteLimit?: number; // Limit chapters per run
  private sessionChaptersWritten: number = 0; // Track chapters written in current run session

  // Control flags
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;

  // Callbacks
  private callbacks: RunnerCallbacks = {};

  constructor(
    factoryConfig?: Partial<FactoryConfig>,
    runnerConfig?: Partial<RunnerConfig>,
    aiService?: AIProviderService
  ) {
    this.config = { ...DEFAULT_CONFIG, ...factoryConfig };
    this.runnerConfig = { ...DEFAULT_RUNNER_CONFIG, ...runnerConfig };

    this.aiService = aiService || new AIProviderService();
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
    projectId?: string; // Optional: reuse existing ai_story_projects UUID
    chaptersToWrite?: number; // Optional: limit how many chapters to write in this run
    currentChapter?: number; // Optional: resume from this chapter
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

    this.chaptersToWriteLimit = input.chaptersToWrite;
    this.sessionChaptersWritten = 0;

    // Initialize state
    this.state = this.createInitialState(targetChapters, targetArcs, input.projectId);
    
    // If resuming, set state to reflect progress
    if (input.currentChapter && input.currentChapter > 0) {
      this.state.currentChapter = input.currentChapter;
      this.state.chaptersWritten = input.currentChapter;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;

    // Ensure ai_story_projects record exists for DB persistence
    await ensureProjectRecord(this.state.projectId, {
      title: input.title,
      genre: genre,
      mainCharacter: input.protagonistName,
      targetChapters,
    });

    // Initialize memory manager
    this.memoryManager = new MemoryManager(this.state.projectId);

    // Initialize Sprint 1/2/3 Quality Systems
    this.characterTracker = new CharacterDepthTracker(this.state.projectId);
    this.battleTracker = new BattleVarietyTracker(this.state.projectId);
    this.powerTracker = new PowerTracker(this.state.projectId);
    this.canonResolver = new CanonResolver(this.state.projectId);
    this.beatLedger = new BeatLedger(this.state.projectId);
    this.fullQCGating = new FullQCGating(this.state.projectId, undefined, {
      battleTracker: this.battleTracker,
      characterTracker: this.characterTracker,
    });

    // Initialize ConsistencyChecker for contradiction detection
    this.consistencyChecker = new ConsistencyChecker(this.state.projectId);

    // Initialize PlotArcManager for long-form story structure (especially resume mode)
    this.plotArcManager = new PlotArcManager(this.state.projectId);

    // Initialize AutoRewriter for quality recovery
    this.autoRewriter = new AutoRewriter(
      this.state.projectId,
      this.chapterWriter,
      this.fullQCGating,
      this.canonResolver,
      this.beatLedger,
      { maxAttempts: 2, targetScore: 65 }
    );

    // Try to load existing state (for crash recovery)
    const loaded = await this.memoryManager.load();
    if (loaded) {
      this.callbacks.onStatusChange?.('idle', 'Đã khôi phục từ lần chạy trước');
    }
    // Try to load quality system state (non-fatal if fails)
    try {
      await Promise.all([
        this.characterTracker.initialize(),
        this.battleTracker.initialize(),
        this.powerTracker.initialize(),
        this.fullQCGating.initialize(),
        this.canonResolver.initialize(),
        this.beatLedger.initialize(),
        this.consistencyChecker.initialize(),
      ]);
    } catch (e) {
      logger.debug('Quality system initialization failed (non-fatal)', {
        projectId: this.state.projectId,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      // ========== PHASE 1: PLAN STORY ==========
      this.updateStatus('planning_story', 'Đang lên cốt truyện...');

      if (input.currentChapter && input.currentChapter > 0) {
        // Resume mode: Create dummy/reconstruct
        this.storyOutline = this.createDummyOutline(input.title, input.protagonistName, genre, input.premise);
        this.callbacks.onStoryPlanned?.(this.storyOutline);
      } else {
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
      }

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

      if (input.currentChapter && input.currentChapter > 0) {
        // Resume mode: use dummy arcs starting from currentChapter+1
        this.arcOutlines = this.createDummyArcs(this.storyOutline, targetChapters, chaptersPerArc, input.currentChapter || 0);
      } else if (this.chaptersToWriteLimit && this.chaptersToWriteLimit <= chaptersPerArc) {
        // Limited run (e.g. cron writing 1 chapter): only plan 1 arc, not all
        // This avoids planning 25+ arcs when we only need to write 1 chapter
        const firstArcResult = await this.planner.planSingleArc({
          storyOutline: this.storyOutline,
          worldBible: this.worldBible!,
          arcNumber: 1,
          startChapter: 1,
          endChapter: Math.min(chaptersPerArc, targetChapters),
          plotPoints: this.storyOutline.majorPlotPoints.filter(pp => pp.targetArc === 1),
        });

        if (!firstArcResult.success || !firstArcResult.data) {
          throw new Error(`Arc planning failed: ${firstArcResult.error}`);
        }

        this.arcOutlines = [firstArcResult.data];
      } else {
        // Full planning: plan ALL arcs
        const arcsResult = await this.planner.planAllArcs(
          this.storyOutline,
          this.worldBible
        );
  
        if (!arcsResult.success || !arcsResult.data) {
          throw new Error(`Arc planning failed: ${arcsResult.error}`);
        }
        
        this.arcOutlines = arcsResult.data;
      }

      for (const arc of this.arcOutlines) {
        this.callbacks.onArcPlanned?.(arc);
      }

      // Enrich WorldBible with NPC data from first arc (if available)
      this.enrichWorldBibleFromArcs();

      // ========== PHASE 3: WRITE ARC BY ARC ==========
      this.updateStatus('writing', 'Bắt đầu viết truyện...');
      const chaptersWrittenAtStart = this.state.chaptersWritten;
      let hadArcFailure = false;

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
          hadArcFailure = true;
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
      if (this.state.chaptersWritten === chaptersWrittenAtStart) {
        const noWriteError = hadArcFailure
          ? 'No chapters were successfully written in this run'
          : 'Run completed without producing chapters';
        this.updateStatus('error', noWriteError);
        this.callbacks.onError?.(noWriteError);
        return {
          success: false,
          state: this.state,
          error: noWriteError,
        };
      }

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
    let successfulChaptersInArc = 0;
    let firstArcError: string | undefined;

    for (let i = 0; i < arc.chapterOutlines.length; i++) {
      if (this.shouldStop) return { success: false, error: 'Stopped by user' };
      
      // Check session limit
      if (this.chaptersToWriteLimit && this.sessionChaptersWritten >= this.chaptersToWriteLimit) {
        this.updateStatus('completed', `Đã đạt giới hạn ${this.chaptersToWriteLimit} chương trong phiên chạy này.`);
        this.shouldStop = true;
        return { success: true };
      }

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
          previousSummary = await this.memoryManager.buildContext(chapterNumber, 2000);
        } else if (contextLevel === 'medium') {
          previousSummary = await this.memoryManager.buildContext(chapterNumber, 1000);
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

        // Enrich context with PlotArcManager data (arc structure, twists, tension)
        if (this.plotArcManager) {
          try {
            // Ensure arc exists for this chapter (auto-creates if needed)
            await this.plotArcManager.ensureArcExists(chapterNumber);

            // Get plot objectives (tension level, arc theme, upcoming twists, character milestones)
            const plotObjectives = await this.plotArcManager.generatePlotObjectives(chapterNumber);
            if (plotObjectives) {
              previousSummary += `\n\n📊 PLOT OBJECTIVES:\n${plotObjectives}`;
            }

            // Get relevant arc summaries for long-term context
            const arcSummaries = await this.plotArcManager.getRelevantArcSummaries(chapterNumber, 2);
            if (arcSummaries.length > 0) {
              previousSummary += `\n\n📖 ARC CONTEXT:`;
              for (const summary of arcSummaries) {
                previousSummary += `\n- Arc ${summary.level_number} (Ch.${summary.start_chapter}-${summary.end_chapter}): ${summary.summary?.substring(0, 200) || 'No summary'}`;
              }
            }
          } catch (plotErr) {
            logger.debug('PlotArcManager enrichment failed (non-fatal)', {
              projectId: this.state?.projectId,
              chapterNumber,
              error: plotErr instanceof Error ? plotErr.message : String(plotErr),
            });
          }
        }
      } else {
        previousSummary = this.getPreviousSummary(chapterNumber);
      }

      // Decide if 3-agent workflow is needed (cost optimization)
      const use3Agent = WorkflowOptimizer.shouldUse3Agent(chapterNumber, this.lastQualityScore);

      // Detect if this is the final arc (by theme or if arc contains/exceeds the target)
      const targetChapters = this.state!.totalChapters;
      const isFinalArc = arc.theme === 'finale' || arc.endChapter >= targetChapters;
      const isInGracePeriod = chapterNumber >= targetChapters; // Past soft target, must wrap up
      const isNearEnd = chapterNumber >= targetChapters - 20;
      // Check if this is the last chapter of the current arc (natural ending point)
      const isLastChapterOfArc = chapterNumber === arc.endChapter || (chapterNumber % 20 === 0);

      // Add finale context to previousSummary
      if (isInGracePeriod) {
        // Grace period: past target, MUST finish at next arc boundary
        previousSummary += `\n\n🏁 GIAI ĐOẠN KẾT THÚC (đã vượt target ${targetChapters} chương):`;
        previousSummary += `\n- PHẢI kết thúc bộ truyện trong arc hiện tại`;
        previousSummary += `\n- Giải quyết TẤT CẢ xung đột còn lại ngay lập tức`;
        previousSummary += `\n- Không mở thêm bất kỳ xung đột hoặc bí ẩn mới nào`;
        if (isLastChapterOfArc) {
          previousSummary += `\n- ĐÂY LÀ CHƯƠNG CUỐI! Kết thúc hoàn chỉnh + epilogue, KHÔNG cliffhanger`;
        } else {
          previousSummary += `\n- Đẩy nhanh resolution, chuẩn bị cho chương cuối`;
        }
      } else if (isNearEnd) {
        previousSummary += `\n\n🏁 APPROACHING STORY FINALE (còn ~${targetChapters - chapterNumber} chương):`;
        previousSummary += `\n- Bắt đầu giải quyết các plot threads còn lại`;
        previousSummary += `\n- Không mở thêm xung đột mới hoặc bí ẩn mới`;
        previousSummary += `\n- Đẩy protagonist lên cảnh giới cao hơn nhanh chóng`;
      }

      // Build currentArc context
      const currentArcContext: StoryArc = {
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
        isFinalArc,
      };

      // Fetch previous chapter titles for title diversity checking
      const previousTitles = await this.getPreviousTitles(chapterNumber);

      // Write chapter
      let result: ChapterResult;
      if (use3Agent) {
        result = await this.chapterWriter.writeChapter(chapterNumber, {
          worldBible: this.worldBible!,
          styleBible: this.styleBible!,
          currentArc: currentArcContext,
          previousSummary,
          previousTitles,
        });
      } else {
        // Use simple workflow to save costs (but still pass arc context for quality)
        result = await this.chapterWriter.writeChapterSimple(chapterNumber, {
          worldBible: this.worldBible!,
          styleBible: this.styleBible!,
          previousSummary,
          currentArc: currentArcContext,
          previousTitles,
        });
      }

      // Track cost (estimate based on word count for 3-agent: architect + writer + critic)
      if (result.data?.wordCount) {
        const outputTokens = result.data.wordCount * 2; // Approx: Vietnamese ~2 tokens/word
        const inputTokens = use3Agent ? 3000 : 1500; // Approx prompt sizes
        this.costOptimizer.recordCall(
          use3Agent ? 'write_chapter_3agent' : 'write_chapter_simple',
          outputTokens + inputTokens
        );
      } else {
        this.costOptimizer.recordCall(
          use3Agent ? 'write_chapter_3agent' : 'write_chapter_simple',
          4000
        );
      }

      if (result.success && result.data) {
        successfulChaptersInArc++;
        // ========== QC EVALUATION (Sprint 1/2/3) ==========
        if (this.fullQCGating) {
          try {
            // Extract characters from outline if available
            const outlineCharacters = result.outline?.scenes
              ?.flatMap(s => s.characters)
              .filter((c, i, arr) => arr.indexOf(c) === i) || [];
            const allCharacters = [
              this.worldBible!.protagonist.name,
              ...outlineCharacters.filter(c => c !== this.worldBible!.protagonist.name),
            ];

            const qcMetadata = {
              protagonistPowerLevel: this.powerTracker ? {
                realm: this.powerTracker.getPowerState(this.worldBible!.protagonist.name)?.realm || '',
                realmIndex: 0,
              } : undefined,
              charactersInvolved: allCharacters,
            };

            const qcResult = await this.fullQCGating.evaluateFull(
              chapterNumber,
              result.data.content,
              qcMetadata
            );

            this.lastQCResult = qcResult;

            // Use style score from QC result (already computed inside evaluateFull)
            const styleScore = qcResult.styleAnalysis?.overallScore ?? qcResult.scores.writingStyle ?? 0;

            // Log quality metrics
            this.callbacks.onStatusChange?.('writing',
              `Ch.${chapterNumber} QC: ${qcResult.scores.overall}/100 | ` +
              `Style: ${styleScore} | ` +
              `Action: ${qcResult.action}`
            );

            // ========== AUTO-REWRITE if QC says so ==========
            if (qcResult.action === 'auto_rewrite' && this.autoRewriter) {
              this.callbacks.onError?.(`Ch.${chapterNumber} QC low (${qcResult.scores.overall}). Auto-rewriting...`);

              try {
                const rewriteResult = await this.autoRewriter.rewriteUntilPass(
                  chapterNumber,
                  result.data.content,
                  result.data.title,
                  qcResult,
                  {
                    worldBible: this.worldBible!,
                    styleBible: this.styleBible!,
                    currentArc: use3Agent ? {
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
                    } : undefined,
                    previousSummary,
                    protagonistName: this.worldBible!.protagonist.name,
                  }
                );

                if (rewriteResult.success) {
                  // Replace chapter with rewritten version
                  result.data.content = rewriteResult.finalContent;
                  result.data.title = rewriteResult.finalTitle;
                  result.data.wordCount = rewriteResult.finalContent.trim().split(/\s+/).length;
                  result.data.qualityScore = Math.round(rewriteResult.finalScore / 10);
                  this.callbacks.onStatusChange?.('writing',
                    `Ch.${chapterNumber} rewritten: ${rewriteResult.finalScore}/100 (${rewriteResult.attempts} attempts)`
                  );
                } else if (rewriteResult.needsHumanReview) {
                  this.callbacks.onError?.(`Ch.${chapterNumber} needs human review: ${rewriteResult.reviewReason}`);
                }
              } catch (rewriteErr) {
                // Rewrite failure is non-fatal, keep original
                this.callbacks.onError?.(`Ch.${chapterNumber} auto-rewrite failed: ${rewriteErr instanceof Error ? rewriteErr.message : 'Unknown'}`);
              }
            } else if (qcResult.action === 'auto_rewrite') {
              this.callbacks.onError?.(`Ch.${chapterNumber} QC low (${qcResult.scores.overall}): ${qcResult.failures.join(', ')}`);
            }
          } catch (e) {
            logger.debug('QC gating failed (non-fatal)', {
              projectId: this.state?.projectId,
              chapterNumber,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        // Store chapter
        this.writtenChapters.set(chapterNumber, result.data);

        // ========== PARALLEL POST-WRITE OPERATIONS ==========
        // Run consistency check, tracker recording, and AI summary in parallel
        // to save ~10-15s per chapter (previously sequential)

        const outlineCharacters = result.outline?.scenes
          ?.flatMap(s => s.characters)
          .filter((c, i, arr) => arr.indexOf(c) === i) || [];

        const outlineSummary = result.outline?.summary || '';
        const dopamineTypes = result.data.dopamineDelivered
          ?.map(d => d.type).join(', ') || '';

        // Build fallback summary (used if AI summary fails)
        const fallbackSummary = outlineSummary
          ? `${result.data.title}: ${outlineSummary}${dopamineTypes ? ` [Dopamine: ${dopamineTypes}]` : ''}`
          : `${result.data.title}: ${result.data.content.substring(0, 300)}...`;

        // --- Parallel task 1: Consistency check ---
        const consistencyPromise = (this.consistencyChecker && result.data)
          ? (async () => {
              try {
                const consistencyReport = await this.consistencyChecker!.checkChapter(
                  chapterNumber,
                  result.data!.content,
                  {
                    charactersInvolved: [
                      this.worldBible?.protagonist.name || '',
                      ...outlineCharacters,
                    ].filter(Boolean),
                    locations: result.outline?.location ? [result.outline.location] : [],
                    powerEvents: result.outline?.dopaminePoints
                      ?.filter(d => d.type === 'breakthrough')
                      .map(d => ({
                        character: this.worldBible?.protagonist.name || '',
                        toLevel: d.description,
                      })),
                    newCharacters: outlineCharacters
                      .filter(c => c !== this.worldBible?.protagonist.name)
                      .map(c => ({ name: c, role: 'supporting' as const })),
                  }
                );

                if (consistencyReport.hasCriticalIssues) {
                  const criticalIssues = consistencyReport.issues
                    .filter(i => i.severity === 'critical' || i.severity === 'major')
                    .map(i => `${i.type}: ${i.description}`)
                    .join('; ');

                  this.callbacks.onError?.(
                    `Ch.${chapterNumber} consistency issues (score: ${consistencyReport.overallScore}): ${criticalIssues}`
                  );

                  if (consistencyReport.overallScore < 40) {
                    this.callbacks.onStatusChange?.('writing',
                      `Ch.${chapterNumber} WARNING: Low consistency score ${consistencyReport.overallScore}/100`
                    );
                  }
                }
              } catch (consistencyErr) {
                this.callbacks.onError?.(
                  `Ch.${chapterNumber} consistency check failed (non-fatal): ${consistencyErr instanceof Error ? consistencyErr.message : 'Unknown'}`
                );
              }
            })()
          : Promise.resolve();

        // --- Parallel task 2: Extract & record to trackers (DB persistence) ---
        const trackerPromise = this.extractAndRecordFromChapter(chapterNumber, result, result.data.content);

        // --- Parallel task 3: AI summary generation ---
        const summaryPromise = (this.memoryManager)
          ? (async () => {
              try {
                const summaryResponse = await this.aiService.chat({
                  provider: this.config.provider,
                  model: this.config.model,
                  messages: [
                    {
                      role: 'system',
                      content: 'Bạn là trợ lý tóm tắt chương truyện. Tóm tắt ngắn gọn 2-3 câu, nêu: (1) sự kiện chính, (2) thay đổi trạng thái nhân vật/cảnh giới, (3) mối quan hệ mới/thay đổi, (4) cliffhanger. KHÔNG dùng markdown.',
                    },
                    {
                      role: 'user',
                      content: `Tóm tắt chương ${chapterNumber} "${result.data!.title}" trong 2-3 câu:\n\n${result.data!.content.substring(0, 4000)}${result.data!.content.length > 4000 ? '\n\n...' + result.data!.content.slice(-1500) : ''}`,
                    },
                  ],
                  temperature: 0.2,
                  maxTokens: 300,
                });

                return summaryResponse.success && summaryResponse.content
                  ? `${result.data!.title}: ${summaryResponse.content.trim()}`
                  : fallbackSummary;
              } catch {
                return fallbackSummary;
              }
            })()
          : Promise.resolve(fallbackSummary);

        // Wait for all parallel operations to complete
        const [, , summary] = await Promise.all([consistencyPromise, trackerPromise, summaryPromise]);

        // ========== UPDATE MEMORY (depends on summary result) ==========
        if (this.memoryManager) {
          const chapterMemory: ChapterMemory = {
            chapterNumber,
            title: result.data.title,
            summary,
            keyEvents: result.outline?.dopaminePoints?.map(d => `${d.type}: ${d.description}`) || [],
            charactersInvolved: [
              this.worldBible!.protagonist.name,
              ...outlineCharacters.filter(c => c !== this.worldBible!.protagonist.name),
            ],
            locationUsed: result.outline?.location || '',
            plotThreadsAdvanced: result.outline?.scenes
              ?.map(s => s.goal)
              .filter(g => g && g.length > 0) || [],
            emotionalBeat: result.outline?.dopaminePoints?.[0]?.type || '',
            cliffhanger: result.outline?.cliffhanger || result.data.content.slice(-300),
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
        this.lastQualityScore = result.data.qualityScore || 5;

        // Update stats
        this.state!.chaptersWritten++;
        this.sessionChaptersWritten++; // Increment session counter
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
        if (!firstArcError) {
          firstArcError = result.error || `Chapter ${chapterNumber} failed`;
        }
        this.callbacks.onChapterFailed?.(chapterNumber, result.error || 'Unknown error');

        if (this.runnerConfig.pauseOnError) {
          this.isPaused = true;
          this.updateStatus('paused', `Chapter ${chapterNumber} failed: ${result.error}`);
          await this.waitForResume();
        }
      }

      // Adaptive delay: skip long delay if chapter took > 5s (rate limit unlikely)
      if (i < arc.chapterOutlines.length - 1) {
        const adaptiveDelay = (result.duration || 0) > 5000 ? 500 : this.runnerConfig.delayBetweenChapters;
        await this.delay(adaptiveDelay);
      }
    }

    if (successfulChaptersInArc === 0) {
      return {
        success: false,
        error: firstArcError || `Arc ${arc.arcNumber} produced no successful chapters`,
      };
    }

    return { success: true };
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

  private createInitialState(totalChapters: number, totalArcs: number, projectId?: string): RunnerState {
    return {
      projectId: projectId || randomUUID(),
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

    // Extract meaningful traits from outline's protagonist data
    const baseTraits = this.extractTraitsFromOutline(outline);

    // Extract initial abilities from power system + outline hooks
    const initialAbilities = outline.uniqueHooks
      .filter(h => h.length < 50) // Short hooks are likely ability names
      .slice(0, 3);

    return {
      projectId: this.state!.projectId,
      storyTitle: outline.title,
      powerSystem,
      protagonist: {
        name: protagonistName,
        realm: powerSystem.realms[0].name,
        level: 1,
        age: 18,
        traits: baseTraits,
        abilities: initialAbilities,
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

  /**
   * Extract meaningful protagonist traits from StoryOutline instead of hardcoding.
   * Uses startingState + characterArc + premise keywords to derive 3-5 traits.
   */
  private extractTraitsFromOutline(outline: StoryOutline): string[] {
    const traits: string[] = [];
    const text = `${outline.protagonist.startingState} ${outline.protagonist.characterArc} ${outline.premise}`.toLowerCase();

    // Map keywords in outline text to personality traits
    const traitMap: Record<string, string> = {
      'kiên trì': 'kiên trì', 'bền bỉ': 'kiên trì', 'không bỏ cuộc': 'kiên trì', 'nỗ lực': 'kiên trì',
      'thông minh': 'thông minh', 'mưu trí': 'mưu trí', 'tính toán': 'mưu lược', 'trí tuệ': 'thông minh',
      'lạnh lùng': 'lạnh lùng', 'cold': 'lạnh lùng', 'bình tĩnh': 'bình tĩnh',
      'nóng nảy': 'nóng nảy', 'hot-blooded': 'nóng nảy', 'bốc đồng': 'bốc đồng',
      'tham vọng': 'tham vọng', 'ambitious': 'tham vọng',
      'trùng sinh': 'từng trải', 'reincarnated': 'từng trải', 'reborn': 'từng trải',
      'khiêm tốn': 'khiêm tốn', 'humble': 'khiêm tốn',
      'nghĩa khí': 'nghĩa khí', 'chính nghĩa': 'chính nghĩa',
      'cô độc': 'cô độc', 'alone': 'cô độc', 'lonely': 'cô độc',
      'báo thù': 'quyết tâm', 'revenge': 'quyết tâm', 'trả thù': 'quyết tâm',
      'system': 'thích nghi nhanh', 'hệ thống': 'thích nghi nhanh',
      'lucky': 'may mắn', 'luck': 'may mắn',
      'genius': 'thiên tài', 'prodigy': 'thiên tài', 'thiên tài': 'thiên tài',
      'fallen': 'kiên cường', 'thất bại': 'kiên cường',
    };

    for (const [keyword, trait] of Object.entries(traitMap)) {
      if (text.includes(keyword) && !traits.includes(trait)) {
        traits.push(trait);
      }
      if (traits.length >= 5) break;
    }

    // Ensure at least 2 traits
    if (traits.length < 2) {
      const defaults = ['kiên trì', 'thông minh', 'quyết tâm'];
      for (const d of defaults) {
        if (!traits.includes(d)) {
          traits.push(d);
          if (traits.length >= 3) break;
        }
      }
    }

    return traits;
  }

  /**
   * Enrich WorldBible with NPC data extracted from arc outlines.
   * Called after arc planning, before chapter writing begins.
   */
  private enrichWorldBibleFromArcs(): void {
    if (!this.worldBible || this.arcOutlines.length === 0) return;

    for (const arc of this.arcOutlines) {
      // Add NPCs from arc's newCharacters
      if (arc.newCharacters && arc.newCharacters.length > 0) {
        for (const npcName of arc.newCharacters) {
          // Skip if already tracked or if it's the protagonist
          const exists = this.worldBible.npcRelationships.some(
            n => n.name.toLowerCase() === npcName.toLowerCase()
          );
          if (exists || npcName.toLowerCase() === this.worldBible.protagonist.name.toLowerCase()) continue;

          this.worldBible.npcRelationships.push({
            name: npcName,
            role: 'neutral',
            affinity: 0,
            description: `Nhân vật mới xuất hiện trong arc ${arc.arcNumber}`,
            firstAppearance: arc.startChapter,
          });
        }
      }

      // Add enemy/obstacle from arc as an NPC
      if (arc.enemyOrObstacle && arc.enemyOrObstacle.length > 0) {
        const enemyName = arc.enemyOrObstacle;
        const exists = this.worldBible.npcRelationships.some(
          n => n.name.toLowerCase() === enemyName.toLowerCase()
        );
        if (!exists && enemyName.toLowerCase() !== this.worldBible.protagonist.name.toLowerCase()) {
          this.worldBible.npcRelationships.push({
            name: enemyName,
            role: 'enemy',
            affinity: -50,
            description: `Kẻ thù/chướng ngại arc ${arc.arcNumber}: ${arc.theme}`,
            firstAppearance: arc.startChapter,
          });
        }
      }
    }
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

  /**
   * Get previous chapter titles for title diversity checking.
   * 1. Try in-memory writtenChapters (current session)
   * 2. Fallback to Supabase chapters table (resume mode)
   */
  private async getPreviousTitles(chapterNumber: number, limit: number = 10): Promise<string[]> {
    const titles: string[] = [];

    // 1. Collect from in-memory writtenChapters (current session)
    for (let i = chapterNumber - 1; i >= Math.max(1, chapterNumber - limit); i--) {
      const chapter = this.writtenChapters.get(i);
      if (chapter?.title) {
        titles.unshift(chapter.title);
      }
    }

    // If we got enough titles from memory, return early
    if (titles.length >= limit) {
      return titles.slice(-limit);
    }

    // 2. Fallback: Query Supabase for previous titles (resume mode)
    if (titles.length < limit && this.state?.projectId) {
      try {
        const supabase = getSupabase();
        // Get novel_id from ai_story_projects
        const { data: project } = await supabase
          .from('ai_story_projects')
          .select('novel_id')
          .eq('id', this.state.projectId)
          .single();

        if (project?.novel_id) {
          const { data: chapters } = await supabase
            .from('chapters')
            .select('title')
            .eq('novel_id', project.novel_id)
            .lt('chapter_number', chapterNumber)
            .order('chapter_number', { ascending: false })
            .limit(limit);

          if (chapters && chapters.length > 0) {
            const dbTitles = chapters
              .reverse()
              .map(c => c.title)
              .filter((t): t is string => !!t);

            // Merge: prefer in-memory (more recent), fill with DB titles
            const memoryTitleSet = new Set(titles);
            for (const dbTitle of dbTitles) {
              if (!memoryTitleSet.has(dbTitle)) {
                titles.unshift(dbTitle);
              }
            }
          }
        }
      } catch {
        // Non-fatal: title checking works without previous titles, just less effective
      }
    }

    return titles.slice(-limit);
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

  // ============================================================================
  // PRIVATE: DUMMY DATA FOR RESUMING
  // ============================================================================

  private createDummyOutline(title: string, protagonistName: string, genre: GenreType, premise?: string): StoryOutline {
    return {
      id: randomUUID(),
      title,
      genre,
      premise: premise || title,
      themes: ['growth', 'adventure'],
      mainConflict: 'Rise to power',
      targetChapters: 200,
      targetArcs: 10,
      protagonist: {
        name: protagonistName,
        startingState: 'Newbie',
        endGoal: 'Supreme',
        characterArc: 'From zero to hero'
      },
      majorPlotPoints: [],
      endingVision: 'Conquer the world',
      uniqueHooks: []
    };
  }

  private createDummyArcs(storyOutline: StoryOutline | null, targetChapters: number, chaptersPerArc: number, startFromChapter: number = 0): ArcOutline[] {
    const arcs: ArcOutline[] = [];
    // Only create arcs for remaining chapters
    const actualStart = startFromChapter + 1; // Next chapter to write
    const remaining = targetChapters - startFromChapter;
    if (remaining <= 0) return arcs;
    const arcCount = Math.ceil(remaining / chaptersPerArc);
    
    for (let i = 1; i <= arcCount; i++) {
        const startCh = actualStart + (i - 1) * chaptersPerArc;
        const endCh = Math.min(actualStart + i * chaptersPerArc - 1, targetChapters);
        
        // Basic chapter outlines for this arc
        const chapterOutlines = Array.from({ length: endCh - startCh + 1 }, (_, idx) => ({
            chapterNumber: startCh + idx,
            localNumber: idx + 1,
            title: `Chương ${startCh + idx}`,
            purpose: 'Story progression',
            keyEvents: [],
            tensionLevel: 5,
            cliffhangerHint: ''
        }));

        const isLastArc = i === arcCount;
        arcs.push({
            id: randomUUID(),
            arcNumber: i,
            title: isLastArc ? `Arc Cuối - Đại Kết Cục` : `Arc ${i}`,
            theme: isLastArc ? 'finale' : 'growth',
            premise: isLastArc ? 'Arc cuối cùng - kết thúc bộ truyện' : `Arc ${i} premise`,
            startChapter: startCh,
            endChapter: endCh,
            chapterCount: endCh - startCh + 1,
            setup: 'Setup',
            confrontation: 'Confrontation',
            resolution: isLastArc ? 'Kết thúc hoàn chỉnh - epilogue' : 'Resolution',
            incitingIncident: 'Incident',
            midpoint: 'Midpoint',
            climax: 'Climax',
            cliffhanger: isLastArc ? 'KHÔNG CÓ — kết thúc thỏa mãn' : 'Cliffhanger',
            protagonistGrowth: 'Growth',
            newCharacters: [],
            enemyOrObstacle: 'Enemy',
            startingRealm: 'Realm Start',
            endingRealm: 'Realm End',
            breakthroughs: [],
            chapterOutlines,
            tensionCurve: [],
            status: 'planned'
        });
    }
    return arcs;
  }

  // ============================================================================
  // PRIVATE: EXTRACT & RECORD DATA FROM CHAPTER OUTPUT
  // ============================================================================

  /**
   * Extract characters, battles, power events from chapter output
   * and feed to Sprint 2/3 trackers for DB persistence.
   */
  private async extractAndRecordFromChapter(
    chapterNumber: number,
    result: ChapterResult,
    content: string,
  ): Promise<void> {
    try {
      // 1. Register characters from outline
      if (this.characterTracker && result.outline?.scenes) {
        const allCharacters = result.outline.scenes
          .flatMap(s => s.characters)
          .filter((c, i, arr) => arr.indexOf(c) === i);

        const protagonistName = this.worldBible!.protagonist.name;
        const existingChars = this.characterTracker.getAllCharacters();
        const existingNames = new Set(existingChars.map(c => c.name.toLowerCase()));

        // Register protagonist on first chapter
        if (chapterNumber === 1 && !existingNames.has(protagonistName.toLowerCase())) {
          await this.characterTracker.createCharacter(protagonistName, 'protagonist', {
            primaryMotivation: 'power' as MotivationType,
            backstory: this.storyOutline?.protagonist.characterArc || 'Nhân vật chính',
            flaw: 'kinh mạch bị phế',
            strength: 'ý chí kiên cường',
            personalityTraits: ['brave', 'stubborn'] as PersonalityTrait[],
            firstAppearance: 1,
          });
        }

        // Register new NPCs as minor characters with context-extracted traits
        for (const charName of allCharacters) {
          if (charName === protagonistName) continue;
          if (existingNames.has(charName.toLowerCase())) continue;

          const guessedRole = this.guessCharacterRole(charName, content);
          const extractedTraits = this.extractNPCTraitsFromContent(charName, content);
          await this.characterTracker.createCharacter(charName, guessedRole, {
            primaryMotivation: guessedRole === 'antagonist' ? 'power' as MotivationType : 'survival' as MotivationType,
            backstory: `Xuất hiện lần đầu ở chương ${chapterNumber}`,
            flaw: 'chưa rõ',
            strength: 'chưa rõ',
            personalityTraits: extractedTraits as PersonalityTrait[],
            firstAppearance: chapterNumber,
          });
          existingNames.add(charName.toLowerCase());
        }
      }

      // 2. Detect and record battles from QC result
      if (this.battleTracker && this.lastQCResult) {
        const hasBattle = this.lastQCResult.warnings?.some(w => 
          w.toLowerCase().includes('battle') || w.toLowerCase().includes('combat')
        ) || content.match(/chiến đấu|giao đấu|tấn công|xuất kiếm|đánh nhau|đại chiến/i);

        if (hasBattle) {
          const protagonistRealm = this.powerTracker?.getPowerState(
            this.worldBible!.protagonist.name
          )?.realm || 'luyện khí 1';

          await this.battleTracker.recordBattle({
            chapterNumber,
            battleType: 'one_on_one' as BattleType,
            tacticalApproach: 'balanced' as TacticalApproach,
            outcome: 'victory' as BattleOutcome,
            protagonistPowerLevel: protagonistRealm,
            enemyPowerLevel: protagonistRealm, // Approximate
            enemyType: 'unknown opponent',
            elementsUsed: ['skill_clash', 'power_reveal'] as CombatElement[],
            wordCount: result.data?.wordCount || 0,
            duration: 'medium' as const,
            varietyScore: 70,
            issues: [],
          });
        }
      }

      // 3. Record writing style analysis from QC
      if (this.lastQCResult?.styleAnalysis) {
        const style = this.lastQCResult.styleAnalysis;
        try {
          const { getSupabase } = await import('./supabase-helper');
          const supabase = getSupabase();
          await supabase.from('writing_style_analytics').insert({
            project_id: this.state!.projectId,
            chapter_number: chapterNumber,
            overall_score: style.overallScore,
            show_dont_tell_score: style.showDontTellScore,
            weak_verb_score: style.weakVerbScore,
            adverb_score: style.adverbScore,
            purple_prose_score: style.purpleProse?.score ?? 0,
            passive_voice_score: style.passiveVoice?.score ?? 0,
            sentence_variety_score: style.sentenceVariety?.score ?? 0,
            issues: style.issues,
            suggestions: style.suggestions,
            weak_verbs: style.weakVerbs,
            adverb_overuse: style.adverbOveruse,
            tell_instances: style.tellInstances,
            exposition_dumps: style.expositionDumps,
          });
        } catch {
          // Non-fatal: style analytics is optional
        }
      }
    } catch (e) {
      // Non-fatal: tracker recording should never crash the pipeline
      const msg = e instanceof Error ? e.message : 'Unknown';
      this.callbacks.onError?.(`[TRACKER] Extract/record failed for Ch.${chapterNumber}: ${msg}`);
    }
  }

  /**
   * Guess a character's role from context clues in the content.
   */
  /**
   * Extract 2-3 personality traits for an NPC from the chapter content where they appear.
   * Looks for behavioral and descriptive keywords near the character's name.
   */
  private extractNPCTraitsFromContent(name: string, content: string): string[] {
    const traits: string[] = [];
    const nameLower = name.toLowerCase();
    
    // Find sentences containing the character name to form local context
    const sentences = content.split(/[。.!！？?\n]/).filter(s => 
      s.toLowerCase().includes(nameLower)
    );
    const localContext = sentences.join(' ').toLowerCase();
    
    const traitKeywords: Record<string, string> = {
      'lạnh lùng': 'cold', 'bình tĩnh': 'calm', 'điềm đạm': 'calm',
      'hung ác': 'aggressive', 'tàn nhẫn': 'ruthless', 'ác độc': 'ruthless',
      'mưu mô': 'cunning', 'xảo quyệt': 'cunning', 'thâm trầm': 'cunning',
      'kiêu ngạo': 'arrogant', 'ngạo mạn': 'arrogant', 'khinh thường': 'arrogant',
      'trung thành': 'loyal', 'nghĩa khí': 'loyal',
      'xinh đẹp': 'charming', 'mỹ lệ': 'charming', 'quyến rũ': 'charming',
      'mạnh mẽ': 'brave', 'dũng cảm': 'brave', 'liều lĩnh': 'brave',
      'thông minh': 'intelligent', 'tinh tế': 'intelligent',
      'hiền lành': 'gentle', 'nhân hậu': 'gentle', 'từ bi': 'gentle',
      'bí ẩn': 'mysterious', 'khó đoán': 'mysterious',
    };

    for (const [keyword, trait] of Object.entries(traitKeywords)) {
      if (localContext.includes(keyword) && !traits.includes(trait)) {
        traits.push(trait);
      }
      if (traits.length >= 3) break;
    }

    // Fallback if no traits found
    if (traits.length === 0) {
      traits.push('serious');
    }

    return traits;
  }

  private guessCharacterRole(name: string, content: string): CharacterRole {
    const nameLower = name.toLowerCase();
    
    // Find sentences containing the character name
    const sentences = content.split(/[。.!！？?]/).filter(s => 
      s.toLowerCase().includes(nameLower)
    );
    const context = sentences.join(' ').toLowerCase();
    
    if (context.match(/kẻ thù|đối thủ|ác|tà|hung ác|tàn nhẫn|giết|hắc ám|phản bội/)) return 'antagonist';
    if (context.match(/sư phụ|sư tôn|dạy|truyền thụ|chỉ dẫn/)) return 'mentor';
    if (context.match(/nàng|mỹ nhân|xinh đẹp|hồng nhan|yêu/)) return 'love_interest';
    if (context.match(/huynh đệ|đồng hành|chiến hữu|bạn/)) return 'ally';
    if (context.match(/đấu|thách thức|ganh đua|cạnh tranh/)) return 'rival';
    if (context.match(/trưởng lão|tộc trưởng|chưởng môn|đại nhân/)) return 'minor';
    
    return 'minor';
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createStoryRunner(
  factoryConfig?: Partial<FactoryConfig>,
  runnerConfig?: Partial<RunnerConfig>,
  aiService?: AIProviderService
): StoryRunner {
  return new StoryRunner(factoryConfig, runnerConfig, aiService);
}

// Export singleton
let defaultRunner: StoryRunner | null = null;

export function getStoryRunner(
  factoryConfig?: Partial<FactoryConfig>,
  runnerConfig?: Partial<RunnerConfig>,
  aiService?: AIProviderService
): StoryRunner {
  if (!defaultRunner) {
    defaultRunner = new StoryRunner(factoryConfig, runnerConfig, aiService);
  }
  return defaultRunner;
}
