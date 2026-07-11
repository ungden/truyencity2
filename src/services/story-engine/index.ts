/**
 * Story Engine v2 — Public API
 *
 * Single entry point for all consumers (cron routes, API routes).
 * Usage:
 *
 *   import { writeChapterForProject } from '@/services/story-engine';
 *   const result = await writeChapterForProject({ projectId: '...' });
 */

export { writeChapterForProject, writeChapterForProject as writeOneChapter, writeLegacyChapter } from './dispatch';
export type { OrchestratorResult, OrchestratorOptions } from './pipeline/orchestrator';

// Re-export types that consumers might need
export type {
  WriteChapterInput,
  WriteChapterResult,
  GenreType,
} from './types';

/**
 * Convenience alias — write a single chapter for a project.
 * This is the main function that cron routes and API routes should call.
 */
// Quality-first flagship v2 contracts and offline pilot tooling.
export * from './flagship';
