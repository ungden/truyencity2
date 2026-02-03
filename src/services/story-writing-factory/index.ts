/**
 * Story Writing Factory - Main Orchestrator
 *
 * Unified factory tổng hợp tinh hoa từ các tool cũ:
 * - _legacy/ai-story-writer.ts
 * - _legacy/dopamine-writing-optimizer.ts
 * - _legacy/plot-arc-manager.ts
 * - _legacy/story-factory/
 * - _legacy/ai-story-inspiration.ts
 *
 * @example
 * ```typescript
 * import { StoryWritingFactory } from '@/services/story-writing-factory';
 *
 * const factory = new StoryWritingFactory({ genre: 'tien-hiep' });
 *
 * // Setup project
 * await factory.createProject('Thiên Đạo Chí Tôn', 'protagonist_name');
 *
 * // Write chapters
 * const result = await factory.writeChapter(1);
 * ```
 */

// Re-export types
export * from './types';

// Re-export templates
export * from './templates';

// Re-export modules
export { ChapterWriter, chapterWriter } from './chapter';
export { QualityGate, ContentAnalyzer, qualityGate, contentAnalyzer } from './quality';
export { StoryPlanner, storyPlanner } from './planner';
export { StoryRunner, createStoryRunner, getStoryRunner } from './runner';
export { MemoryManager, createMemoryManager } from './memory';
export { CostOptimizer, WorkflowOptimizer, getCostOptimizer, createCostOptimizer } from './cost-optimizer';

// New systems for consistency, power tracking, and RAG
export { RAGService, ContentExtractor, ragService } from './rag';
export type { EmbeddingContent, SearchResult, RAGContext } from './rag';
export { ConsistencyChecker, createConsistencyChecker } from './consistency';
export type { ConsistencyIssue, CharacterState, ConsistencyReport } from './consistency';
export { PowerTracker, createPowerTracker } from './power-tracker';
export type { PowerState, ProgressionEvent, ProgressionValidation } from './power-tracker';

// Phase 2: Canon Resolver, QC Gating, Beat Ledger, Style Bible, Cost Cache
export { CanonResolver, createCanonResolver, CanonLevel } from './canon-resolver';
export type { CanonFact, ConflictReport, ContinuityIssue } from './canon-resolver';
export { QCGating, createQCGating, DEFAULT_THRESHOLDS } from './qc-gating';
export type { GatingThresholds, QCScores, GateResult } from './qc-gating';
export { BeatLedger, createBeatLedger } from './beat-ledger';
export type { BeatEntry, BeatCategory, PlotBeat, EmotionalBeat, SettingBeat, BeatRecommendation } from './beat-ledger';
export { getEnhancedStyleBible, buildStyleContext, QIDIAN_VOCABULARY, QIDIAN_EXEMPLARS, PACING_RULES, CLIFFHANGER_TECHNIQUES } from './style-bible';
export type { SceneType, PacingRule, VocabularyGuide, StyleExemplar } from './style-bible';
export { CostCache, BatchSummarizer, createCostCache, createBatchSummarizer, MODEL_TIERS } from './cost-cache';
export type { ModelTier } from './cost-cache';

// Auto-Rewriter
export { AutoRewriter, createAutoRewriter, DEFAULT_REWRITE_CONFIG } from './auto-rewriter';
export type { RewriteConfig, RewriteResult } from './auto-rewriter';

// Author Generator
export { AuthorGenerator, createAuthorGenerator, generateQuickAuthor } from './author-generator';
export type { GeneratedAuthor, AuthorGenerationConfig } from './author-generator';

// Author Assigner - Types only (functions have supabase dependency)
// Import functions directly from './author-assigner' when needed
export type { AuthorAssignmentResult, AssignAuthorOptions } from './author-assigner';

import { AIProviderService } from '../ai-provider';
import { ChapterWriter } from './chapter';
import { QualityGate, ContentAnalyzer } from './quality';
import {
  FactoryConfig,
  DEFAULT_CONFIG,
  GenreType,
  WorldBible,
  StyleBible,
  StoryArc,
  ChapterResult,
  BatchResult,
  ChapterSummary,
  RunnerState,
  RunnerCallbacks,
} from './types';
import { StoryRunner } from './runner';
import { getStyleByGenre, getPowerSystemByGenre, GOLDEN_CHAPTER_REQUIREMENTS } from './templates';

// ============================================================================
// PROJECT STATE
// ============================================================================

interface ProjectState {
  projectId: string;
  title: string;
  genre: GenreType;
  worldBible: WorldBible;
  styleBible: StyleBible;
  arcs: StoryArc[];
  currentChapter: number;
  chapterSummaries: ChapterSummary[];
  status: 'idle' | 'setup' | 'writing' | 'completed' | 'error';
}

// ============================================================================
// MAIN FACTORY CLASS
// ============================================================================

export class StoryWritingFactory {
  private config: FactoryConfig;
  private aiService: AIProviderService;
  private chapterWriter: ChapterWriter;
  private qualityGate: QualityGate;
  private contentAnalyzer: ContentAnalyzer;

  // Project state
  private project: ProjectState | null = null;

  // Callbacks
  private onProgress?: (step: string, progress: number, message: string) => void;

  constructor(config?: Partial<FactoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiService = new AIProviderService();
    this.chapterWriter = new ChapterWriter(this.config, this.aiService);
    this.qualityGate = new QualityGate();
    this.contentAnalyzer = new ContentAnalyzer();
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  configure(config: Partial<FactoryConfig>) {
    this.config = { ...this.config, ...config };
  }

  setOnProgress(callback: (step: string, progress: number, message: string) => void) {
    this.onProgress = callback;
  }

  private report(step: string, progress: number, message: string) {
    this.onProgress?.(step, progress, message);
  }

  // ============================================================================
  // PROJECT MANAGEMENT
  // ============================================================================

  /**
   * Create a new project with world bible and arcs
   */
  async createProject(
    title: string,
    protagonistName: string,
    options?: {
      protagonistRealm?: string;
      protagonistGoals?: string[];
      totalChapters?: number;
      chaptersPerArc?: number;
    }
  ): Promise<{ success: boolean; projectId: string; error?: string }> {
    const projectId = `project_${Date.now()}`;
    const totalChapters = options?.totalChapters || 200;
    const chaptersPerArc = options?.chaptersPerArc || 20;

    this.report('setup', 10, 'Tạo World Bible...');

    try {
      // Create World Bible
      const worldBible = this.createWorldBible(projectId, title, protagonistName, options);

      // Create Style Bible
      this.report('setup', 30, 'Tạo Style Bible...');
      const styleBible = getStyleByGenre(this.config.genre);

      // Create Arcs
      this.report('setup', 50, 'Lên kế hoạch arcs...');
      const arcs = this.generateArcs(projectId, totalChapters, chaptersPerArc);

      // Save project state
      this.project = {
        projectId,
        title,
        genre: this.config.genre,
        worldBible,
        styleBible,
        arcs,
        currentChapter: 0,
        chapterSummaries: [],
        status: 'writing',
      };

      this.report('setup', 100, 'Project created!');

      return { success: true, projectId };
    } catch (error) {
      return {
        success: false,
        projectId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current project
   */
  getProject(): ProjectState | null {
    return this.project;
  }

  // ============================================================================
  // CHAPTER WRITING
  // ============================================================================

  /**
   * Write a single chapter
   */
  async writeChapter(chapterNumber?: number): Promise<ChapterResult> {
    if (!this.project) {
      return {
        success: false,
        error: 'No project. Call createProject() first.',
        retryCount: 0,
        duration: 0,
      };
    }

    const targetChapter = chapterNumber || this.project.currentChapter + 1;

    // Get current arc
    const currentArc = this.getCurrentArc(targetChapter);
    if (!currentArc) {
      return {
        success: false,
        error: `No arc for chapter ${targetChapter}`,
        retryCount: 0,
        duration: 0,
      };
    }

    // Get previous summary
    const previousSummary = this.getPreviousSummary(targetChapter);

    this.report('writing', 10, `Writing chapter ${targetChapter}...`);

    // Use 3-agent or simple workflow
    let result: ChapterResult;

    if (this.config.use3AgentWorkflow) {
      result = await this.chapterWriter.writeChapter(targetChapter, {
        worldBible: this.project.worldBible,
        styleBible: this.project.styleBible,
        currentArc,
        previousSummary,
      });
    } else {
      result = await this.chapterWriter.writeChapterSimple(targetChapter, {
        worldBible: this.project.worldBible,
        styleBible: this.project.styleBible,
        previousSummary,
      });
    }

    if (result.success && result.data) {
      // Update state
      this.project.currentChapter = targetChapter;

      // Add summary
      this.project.chapterSummaries.push({
        chapterNumber: targetChapter,
        summary: `Chương ${targetChapter}: ${result.data.title}`,
        keyEvents: [],
        wordCount: result.data.wordCount,
      });

      this.report('completed', 100, `Chapter ${targetChapter} done!`);
    }

    return result;
  }

  /**
   * Write multiple chapters
   */
  async writeBatch(
    startChapter: number,
    count: number,
    onChapterDone?: (chapterNumber: number, result: ChapterResult) => void
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const results: ChapterResult[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      const chapterNumber = startChapter + i;

      this.report('batch', Math.round((i / count) * 100), `Writing ${chapterNumber}/${startChapter + count - 1}...`);

      const result = await this.writeChapter(chapterNumber);
      results.push(result);

      if (result.success) {
        success++;
      } else {
        failed++;
      }

      onChapterDone?.(chapterNumber, result);

      // Small delay
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return {
      success: failed === 0,
      chaptersGenerated: success,
      chaptersFailed: failed,
      results,
      totalDuration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // QUALITY
  // ============================================================================

  /**
   * Evaluate chapter quality
   */
  evaluateChapter(content: string, chapterNumber: number) {
    return this.qualityGate.evaluate(
      content,
      chapterNumber,
      this.config.genre,
      this.project?.projectId || 'unknown',
      this.project?.styleBible
    );
  }

  /**
   * Analyze content composition
   */
  analyzeComposition(content: string) {
    return this.contentAnalyzer.analyzeComposition(content);
  }

  // ============================================================================
  // RUN UNTIL COMPLETE (New Workflow)
  // ============================================================================

  /**
   * Setup and run until the entire story is complete.
   *
   * Pipeline: Cốt truyện → Dàn ý All Arcs → Viết từng Arc → Viết từng Chương
   *
   * @example
   * ```typescript
   * const factory = new StoryWritingFactory({ genre: 'tien-hiep' });
   *
   * await factory.runUntilComplete({
   *   title: 'Thiên Đạo Chí Tôn',
   *   protagonistName: 'Lâm Phong',
   *   targetChapters: 200,
   *   callbacks: {
   *     onChapterCompleted: (num, result) => console.log(`Chapter ${num} done!`),
   *     onArcCompleted: (num, arc) => console.log(`Arc ${num} done!`),
   *     onProgress: (state) => console.log(`Progress: ${state.chaptersWritten}/${state.totalChapters}`),
   *   }
   * });
   * ```
   */
  async runUntilComplete(input: {
    title: string;
    protagonistName: string;
    premise?: string;
    targetChapters?: number;
    chaptersPerArc?: number;
    callbacks?: RunnerCallbacks;
  }): Promise<{ success: boolean; state: RunnerState; error?: string }> {
    const runner = new StoryRunner(this.config);

    if (input.callbacks) {
      runner.setCallbacks(input.callbacks);
    }

    // Also connect to the factory's onProgress callback
    if (this.onProgress) {
      const existingOnProgress = input.callbacks?.onProgress;
      runner.setCallbacks({
        ...input.callbacks,
        onProgress: (state) => {
          existingOnProgress?.(state);
          this.onProgress?.('writing', Math.round((state.chaptersWritten / state.totalChapters) * 100), `Chapter ${state.currentChapter}`);
        },
        onStatusChange: (status, message) => {
          input.callbacks?.onStatusChange?.(status, message);
          this.onProgress?.(status, 0, message);
        },
      });
    }

    return runner.run({
      title: input.title,
      protagonistName: input.protagonistName,
      genre: this.config.genre,
      premise: input.premise,
      targetChapters: input.targetChapters,
      chaptersPerArc: input.chaptersPerArc,
    });
  }

  /**
   * Get a new StoryRunner instance for more control
   */
  createRunner(): StoryRunner {
    return new StoryRunner(this.config);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private createWorldBible(
    projectId: string,
    title: string,
    protagonistName: string,
    options?: {
      protagonistRealm?: string;
      protagonistGoals?: string[];
    }
  ): WorldBible {
    const powerSystem = getPowerSystemByGenre(this.config.genre);

    return {
      projectId,
      storyTitle: title,
      powerSystem,
      protagonist: {
        name: protagonistName,
        realm: options?.protagonistRealm || powerSystem.realms[0].name,
        level: 1,
        age: 18,
        traits: ['kiên trì', 'thông minh', 'bảo vệ người thân'],
        abilities: [],
        inventory: [],
        goals: options?.protagonistGoals || ['Trở thành cường giả', 'Bảo vệ gia đình'],
        status: 'active',
      },
      npcRelationships: [],
      locations: [],
      openPlotThreads: [],
      resolvedPlotThreads: [],
      foreshadowing: [],
      worldRules: [
        'Sức mạnh quyết định địa vị',
        'Cảnh giới cao áp chế cảnh giới thấp',
        'Tài nguyên có hạn, cạnh tranh khốc liệt',
      ],
    };
  }

  private generateArcs(
    projectId: string,
    totalChapters: number,
    chaptersPerArc: number
  ): StoryArc[] {
    const arcCount = Math.ceil(totalChapters / chaptersPerArc);
    const themes: Array<'foundation' | 'conflict' | 'growth' | 'revelation' | 'triumph'> = [
      'foundation', 'conflict', 'growth', 'revelation', 'triumph',
    ];

    return Array.from({ length: arcCount }, (_, i) => {
      const startChapter = i * chaptersPerArc + 1;
      const endChapter = Math.min((i + 1) * chaptersPerArc, totalChapters);

      // Generate tension curve (rise → climax → fall)
      const arcLength = endChapter - startChapter + 1;
      const climaxChapter = startChapter + Math.floor(arcLength * 0.75);
      const tensionCurve = this.generateTensionCurve(arcLength);

      return {
        id: `arc_${i + 1}`,
        projectId,
        arcNumber: i + 1,
        title: `Arc ${i + 1}`,
        theme: themes[i % themes.length],
        startChapter,
        endChapter,
        tensionCurve,
        climaxChapter,
        status: i === 0 ? 'in_progress' : 'planned',
      };
    });
  }

  private generateTensionCurve(arcLength: number): number[] {
    const curve: number[] = [];
    const climaxPosition = Math.floor(arcLength * 0.75);

    for (let i = 0; i < arcLength; i++) {
      if (i < climaxPosition) {
        // Rising tension
        curve.push(30 + Math.floor((60 * i) / climaxPosition));
      } else {
        // Falling action
        curve.push(90 - Math.floor((40 * (i - climaxPosition)) / (arcLength - climaxPosition)));
      }
    }

    return curve;
  }

  private getCurrentArc(chapterNumber: number): StoryArc | null {
    if (!this.project) return null;

    return this.project.arcs.find(
      arc => chapterNumber >= arc.startChapter && chapterNumber <= arc.endChapter
    ) || null;
  }

  private getPreviousSummary(chapterNumber: number): string {
    if (!this.project || chapterNumber === 1) {
      return 'Đây là chương đầu tiên.';
    }

    const recent = this.project.chapterSummaries
      .filter(s => s.chapterNumber < chapterNumber)
      .slice(-3);

    if (recent.length === 0) {
      return 'Không có chương trước.';
    }

    return recent.map(s => s.summary).join('\n');
  }
}

// ============================================================================
// FACTORY SINGLETON
// ============================================================================

let defaultFactory: StoryWritingFactory | null = null;

export function getStoryWritingFactory(config?: Partial<FactoryConfig>): StoryWritingFactory {
  if (!defaultFactory) {
    defaultFactory = new StoryWritingFactory(config);
  } else if (config) {
    defaultFactory.configure(config);
  }
  return defaultFactory;
}

export function createStoryWritingFactory(config?: Partial<FactoryConfig>): StoryWritingFactory {
  return new StoryWritingFactory(config);
}

export default StoryWritingFactory;
