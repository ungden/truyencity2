/**
 * Story Engine v2 — Configuration
 *
 * Re-exports genre templates, style bibles, and boundaries.
 * Only exports that are actively imported by v2 modules.
 */

export {
  ENGAGEMENT_CHECKLIST,
  GOLDEN_CHAPTER_REQUIREMENTS,
  getStyleByGenre,
  getGenreBoundaryText,
  buildTitleRulesPrompt,
} from './templates';
