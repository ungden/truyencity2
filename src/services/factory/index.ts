/**
 * Story Factory - Industrial Scale Story Generation
 * 
 * Main exports for the factory system
 */

// Types
export * from './types';

// Core Services
export {
  GeminiClient,
  getGeminiClient,
  createGeminiClient,
  type GeminiMessage,
  type GeminiResponse,
} from './gemini-client';

export {
  GeminiImageService,
  getGeminiImageService,
  createGeminiImageService,
  type ImageGenerationRequest,
} from './gemini-image';

export {
  IdeaBankService,
  getIdeaBankService,
  createIdeaBankService,
} from './idea-bank';

export {
  BlueprintFactoryService,
  getBlueprintFactoryService,
  createBlueprintFactoryService,
} from './blueprint-factory';

export {
  ChapterWriterService,
  getChapterWriterService,
  createChapterWriterService,
} from './chapter-writer';

export {
  ProductionManagerService,
  getProductionManagerService,
  createProductionManagerService,
} from './production-manager';

export {
  PublishingSchedulerService,
  getPublishingSchedulerService,
  createPublishingSchedulerService,
} from './publishing-scheduler';

export {
  QualityControllerService,
  getQualityControllerService,
  createQualityControllerService,
} from './quality-controller';

export {
  AuthorManagerService,
  getAuthorManagerService,
  createAuthorManagerService,
} from './author-manager';

export {
  ErrorHandlerService,
  getErrorHandlerService,
  createErrorHandlerService,
} from './error-handler';

// Main Orchestrator
export {
  FactoryOrchestrator,
  getFactoryOrchestrator,
  createFactoryOrchestrator,
} from './orchestrator';

/**
 * Quick start guide:
 * 
 * 1. Bootstrap with 100 stories:
 * ```typescript
 * import { getFactoryOrchestrator } from '@/services/factory';
 * 
 * const orchestrator = getFactoryOrchestrator();
 * await orchestrator.bootstrap({
 *   total_stories: 100,
 *   start_immediately: true,
 * });
 * ```
 * 
 * 2. Run daily tasks (call at midnight):
 * ```typescript
 * await orchestrator.runDailyTasks();
 * ```
 * 
 * 3. Run main loop (call every 5-10 minutes):
 * ```typescript
 * await orchestrator.runMainLoop();
 * ```
 * 
 * 4. Get dashboard stats:
 * ```typescript
 * const stats = await orchestrator.getDashboardStats();
 * ```
 * 
 * 5. Start/stop factory:
 * ```typescript
 * await orchestrator.start();
 * await orchestrator.stop();
 * ```
 */
