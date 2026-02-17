/**
 * Story Engine v2 — Configuration
 *
 * Re-exports genre templates, style bibles, and boundaries from v1.
 * These are pure data (no logic) — will be migrated here during Phase 8.
 */

// Re-export all config data from v1 templates (pure data, no dependencies)
export {
  DOPAMINE_PATTERNS,
  GENRE_STYLES,
  GENRE_BOUNDARIES,
  POWER_SYSTEMS,
  ENGAGEMENT_CHECKLIST,
  GOLDEN_CHAPTER_REQUIREMENTS,
  CHAPTER_TITLE_RULES,
  getStyleByGenre,
  getGenreBoundaryText,
  getPowerSystemByGenre,
  getDopaminePatternsByGenre,
  buildTitleRulesPrompt,
} from '../story-writing-factory/templates';

export type { DopaminePattern } from '../story-writing-factory/templates';
