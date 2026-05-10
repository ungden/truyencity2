/**
 * Universal banned content — applied to EVERY chapter brief of EVERY novel
 * using the blueprint approach. Two distinct mechanisms:
 *
 * 1. UNIVERSAL_FORBIDDEN_TERMS — literal strings auto-checked post-write
 *    by `evaluateBlueprintAlignment` (regex contains). If a chapter contains
 *    any of these, it's flagged as critical/blueprint_forbidden_term.
 *    These get composed into chapter_blueprints.forbidden_terms TEXT[].
 *
 * 2. UNIVERSAL_BANNED_PATTERNS — high-level guidance instructions injected
 *    into the writer prompt (sceneDirection + plan_text). Not auto-checked,
 *    relies on AI compliance.
 *
 * 3. UNIVERSAL_TONE_DIRECTIVES — tone instructions injected into prompt.
 *
 * Per-novel `extraBannedPatterns` / `extraForbiddenTerms` (in NovelBlueprint)
 * extend these.
 */

/**
 * Literal strings auto-checked post-write. Add cautiously — false positives
 * block chapters at the gate.
 *
 * Catches default AI drift patterns:
 *   - Paranoia cliffhanger — "có người theo dõi", "kẻ rình mò"
 *   - Drama-pile-on cliché phrases that signal AI default
 */
export const UNIVERSAL_FORBIDDEN_TERMS: string[] = [
  // (Empty by default — universal forbidden terms cause hard fails. Per-novel
  // forbiddenTerms are the safer default. Add here only after observing the
  // pattern across 3+ novels.)
];

/**
 * High-level guidance — instructions for the writer. Injected into prompt
 * as sceneDirection BAN list. Compliance via AI prompt-following, not regex.
 */
export const UNIVERSAL_BANNED_PATTERNS: string[] = [
  'CẤM cliffhanger "có người theo dõi/rình mò/biết bí mật MC" — MC TỰ TIN, KHÔNG paranoid',
  'CẤM cliffhanger "kẻ lạ/thế lực ngoài đột nhiên đến tìm MC" trừ khi blueprint ghi rõ trong arc plan',
  'CẤM "MC chõ mồm bênh người lạ ngẫu nhiên" — MC chỉ can thiệp khi đạt 1 trong 5 lợi ích (resource/network/info/setup-payoff/family-faction)',
  'CẤM tone paranoia tổng quát — tone MC lạnh đạm + tự tin + tính toán',
  'CẤM lặp scene đã có (ví dụ: pet đã evolve ở chương trước, KHÔNG re-evolve trong chương sau)',
  'CẤM cosmic-tier antagonist trước 70% novel length',
  'CẤM "MC khổ liên tục" — adversity:dopamine = 10:90, max 1-2 chương ngược trước face-slap + payoff',
  'CẤM "feed cường hóa rủi ro cao" — MC lão lục/thận trọng tránh rủi ro, chỉ làm khi chắc chắn',
  'CẤM NPC thường (đệ tử, customer, đồng môn, peer rival) khám phá bí mật MC ngẫu nhiên',
];

/**
 * Tone directives — appended to plan_text + every chapter sceneDirection.
 * Per-novel `toneDirectives` extend this list.
 */
export const UNIVERSAL_TONE_DIRECTIVES: string[] = [
  'TONE: MC lạnh đạm + tự tin + tính toán. Public face khiêm tốn. KHÔNG paranoid. KHÔNG tự khoe.',
  'DOPAMINE source ưu tiên phản ứng xã hội (bystander shock thầm + đối thủ kinh ngạc câm họng + NPC khen lén). KHÔNG MC tự khoe / tuyên bố / đắc ý.',
];

/**
 * Cosmic-tier patterns — flagged by delta-detector when appearing before
 * `cosmicArcStartChapter` (default 70% of totalChapters). Catches AI
 * inventing lore-origin elements too early in the story arc.
 *
 * Per-novel `cosmicTierPatterns` REPLACES this list (not extends).
 * Default list targets Vietnamese tu-tiên / huyền-huyễn cosmology.
 */
export const UNIVERSAL_COSMIC_PATTERNS: string[] = [
  'thần\\s*cách',
  'thần\\s*vật',
  'lõi\\s*pháp\\s*tắc',
  'thượng\\s*cổ',
  'huyết\\s*mạch\\s*thức\\s*tỉnh',
  'cánh\\s*cửa\\s*đá\\s*cổ',
  'thiên\\s*đạo',
  'pháp\\s*tắc\\s*nguyên\\s*thủy',
  'sáng\\s*thế\\s*chủ',
];

/**
 * Default fraction of totalChapters at which cosmic tier becomes permitted.
 * Per-novel `cosmicArcStartChapter` overrides.
 */
export const DEFAULT_COSMIC_ARC_START_FRACTION = 0.7;
