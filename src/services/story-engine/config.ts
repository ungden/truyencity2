/**
 * Story Engine v2 — Configuration
 *
 * Re-exports genre templates, style bibles, and boundaries.
 * Migrated from v1 story-writing-factory (Phase 7 cleanup).
 */

export {
  DOPAMINE_PATTERNS,
  GENRE_STYLES,
  GENRE_BOUNDARIES,
  POWER_SYSTEMS,
  ENGAGEMENT_CHECKLIST,
  GOLDEN_CHAPTER_REQUIREMENTS,
  CHAPTER_TITLE_RULES,
  SCENE_EXPANSION_RULES,
  ANTI_CLICHE_RULES,
  SUBTEXT_DIALOGUE_RULES,
  getStyleByGenre,
  getGenreBoundaryText,
  getPowerSystemByGenre,
  getDopaminePatternsByGenre,
  buildTitleRulesPrompt,
} from './templates';

export type { DopaminePattern } from './templates';
