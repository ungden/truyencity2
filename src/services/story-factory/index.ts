/**
 * Story Factory - Hệ thống công xưởng truyện AI
 *
 * Cho phép viết hàng trăm đầu truyện cùng lúc với chất lượng cao
 *
 * @example
 * ```typescript
 * import { createStoryFactory } from './story-factory';
 *
 * const factory = createStoryFactory({
 *   primaryProvider: 'deepseek',
 *   maxWorkers: 10
 * });
 *
 * // Tạo batch 100 truyện
 * const batch = await factory.createBatch({
 *   quantity: 100,
 *   genres: ['tien-hiep', 'do-thi', 'huyen-huyen'],
 *   targetChapters: 200,
 *   dailyChaptersPerStory: 3
 * });
 *
 * // Theo dõi tiến độ
 * factory.onEvent(async (event) => {
 *   console.log('Event:', event);
 * });
 *
 * // Xem dashboard
 * const dashboard = factory.getDashboard();
 * console.log(`Active: ${dashboard.activeWorkers} workers`);
 * console.log(`Quality: ${dashboard.qualityScore}/10`);
 * ```
 */

// Main exports
export { StoryFactory, createStoryFactory, IdeaGenerator, DEFAULT_FACTORY_CONFIG } from './story-factory';
export { BlueprintGenerator, blueprintGenerator } from './blueprint-generator';
export { ProductionPipeline, WorkerPool, ProductionQueue, BatchManager, createProductionPipeline } from './production-pipeline';
export { QualityGate, ContentAnalyzer, BatchQualityChecker, qualityGate, contentAnalyzer } from './quality-gate';

// Genre templates
export {
  GENRE_TEMPLATES,
  PROTAGONIST_TEMPLATES,
  ANTAGONIST_TEMPLATES,
  POWER_SYSTEMS,
  DOPAMINE_PATTERNS,
  getGenreTemplate,
  getRandomProtagonist,
  getRandomAntagonist,
  getPowerSystem,
  getDopaminePattern
} from './genre-templates';

// Types
export type {
  // Core types
  StoryIdea,
  StoryBlueprint,
  GenreType,
  StoryFactoryConfig,

  // Character types
  CharacterArchetype,
  ProtagonistTemplate,
  AntagonistTemplate,
  SupportingCharacterTemplate,
  GeneratedCharacter,

  // World types
  SettingTemplate,
  PowerSystemTemplate,
  PowerLevel,
  GeneratedWorld,
  GeneratedPowerSystem,

  // Plot types
  PlotOutline,
  GeneratedArc,
  PlannedTwist,
  ArcTemplate,

  // Production types
  ProductionJob,
  ProductionBatch,
  WorkerStatus,

  // Quality types
  QualityReport,
  QualityIssue,

  // Style types
  WritingStyle,
  ChapterFormula,
  PacingGuide,
  GenreTemplate,

  // Event types
  FactoryEvent,
  FactoryEventHandler,

  // Publishing types
  PublishingConfig,
  PublishingJob,

  // Analytics types
  StoryAnalytics
} from './types';

/**
 * Quick start function
 */
export async function quickStart(options: {
  genres?: Array<'tien-hiep' | 'do-thi' | 'huyen-huyen'>;
  storyCount?: number;
  chaptersPerStory?: number;
}) {
  const {
    genres = ['tien-hiep'],
    storyCount = 1,
    chaptersPerStory = 100
  } = options;

  const { createStoryFactory } = await import('./story-factory');

  const factory = createStoryFactory({
    primaryProvider: 'gemini',
    maxWorkers: 5
  });

  const batch = await factory.createBatch({
    quantity: storyCount,
    genres: genres as any[],
    targetChapters: chaptersPerStory,
    dailyChaptersPerStory: 5
  });

  return { factory, batch };
}

/**
 * Generate sample ideas for testing
 */
export function generateSampleIdeas(genre: 'tien-hiep' | 'do-thi' | 'huyen-huyen' = 'tien-hiep', count: number = 5) {
  const { IdeaGenerator } = require('./story-factory');
  const generator = new IdeaGenerator();
  return generator.generateIdeas(genre, count);
}

/**
 * Create a single story blueprint for preview
 */
export async function previewBlueprint(genre: 'tien-hiep' | 'do-thi' | 'huyen-huyen' = 'tien-hiep') {
  const { IdeaGenerator } = require('./story-factory');
  const { BlueprintGenerator } = require('./blueprint-generator');

  const ideaGen = new IdeaGenerator();
  const blueprintGen = new BlueprintGenerator();

  const [idea] = ideaGen.generateIdeas(genre, 1);
  const blueprint = await blueprintGen.generateBlueprint(idea);

  return {
    idea,
    blueprint,
    summary: {
      title: idea.title,
      genre: idea.genre,
      premise: idea.premise,
      protagonist: blueprint.protagonist.name,
      totalArcs: blueprint.arcs.length,
      totalTwists: blueprint.plannedTwists.length,
      targetChapters: blueprint.targetChapters
    }
  };
}
