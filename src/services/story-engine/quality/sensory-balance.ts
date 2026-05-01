/**
 * Story Engine v2 — Sensory Balance Check (Phase 27 W5.2)
 *
 * Counts references to each of the 5 senses (sight, sound, touch, taste, smell)
 * + body sensation (proprioception). Chapters with only sight references feel
 * flat; balanced chapters with all 5 senses feel immersive.
 *
 * Đại thần workflow mapping:
 *   Show, don't tell. Top web novel authors weave 3-5 senses per scene to
 *   create immersion. AI default tends to over-rely on sight (visual descriptions)
 *   and dialog, missing other senses.
 *
 * Heuristic-only — fast keyword/pattern matching.
 */

export interface SensoryBalanceReport {
  sightHits: number;
  soundHits: number;
  touchHits: number;
  tasteHits: number;
  smellHits: number;
  bodyHits: number;
  totalChars: number;
  balanceScore: number; // 0-10, 10 = balanced (all 5+ senses present), 0 = single-sense
  flatSenses: string[]; // senses with <2 hits per 5K chars (need more)
}

const SIGHT_PATTERNS = /\b(?:nhìn|thấy|trông|màu|sáng|tối|rực|lấp lánh|chói|bóng|hình ảnh|cảnh|nhăn mặt|mở mắt|nhắm mắt|chớp mắt|liếc|nháy mắt|quan sát)\b/gi;
const SOUND_PATTERNS = /\b(?:nghe|tiếng|âm thanh|kêu|hét|gào|thầm|lảnh lót|ầm ầm|rì rào|xào xạc|răn rắc|loảng xoảng|líu lo|ù ù|im lặng|tĩnh mịch|vang|vọng|ồn ào)\b/gi;
const TOUCH_PATTERNS = /\b(?:chạm|sờ|nắm|cảm thấy|lạnh|nóng|ấm|mát|ướt|khô|cứng|mềm|trơn|nhám|gai|đau|nhói|tê|run|đè|ép|vuốt ve|ôm)\b/gi;
const TASTE_PATTERNS = /\b(?:nếm|vị|ngọt|đắng|mặn|chua|cay|chát|nhạt|tanh|béo|bùi|thơm ngon|nuốt|trở vị)\b/gi;
const SMELL_PATTERNS = /\b(?:ngửi|mùi|hương|thơm|tanh|hôi|nồng|thoang thoảng|nức mũi|hương thơm|khét|hôi thối)\b/gi;
const BODY_PATTERNS = /\b(?:tim đập|nhịp tim|thở|hơi thở|run rẩy|rùng mình|rùng rợn|nóng bừng|lạnh sống lưng|tê dại|mệt mỏi|kiệt sức|đầu óc|chân tay|cơ thể|nhẹ nhàng|nặng nề)\b/gi;

export function analyzeSensoryBalance(content: string): SensoryBalanceReport {
  const totalChars = content.length;
  const hits = (re: RegExp) => (content.match(re) || []).length;

  const sightHits = hits(SIGHT_PATTERNS);
  const soundHits = hits(SOUND_PATTERNS);
  const touchHits = hits(TOUCH_PATTERNS);
  const tasteHits = hits(TASTE_PATTERNS);
  const smellHits = hits(SMELL_PATTERNS);
  const bodyHits = hits(BODY_PATTERNS);

  // Per 5K chars threshold for "present" (≥2 hits).
  const charsPer5K = Math.max(1, totalChars / 5000);
  const minHits = 2 * charsPer5K;

  const sensesPresent = [
    sightHits >= minHits,
    soundHits >= minHits,
    touchHits >= minHits,
    tasteHits >= minHits,
    smellHits >= minHits,
  ].filter(Boolean).length;

  const flatSenses: string[] = [];
  if (soundHits < minHits) flatSenses.push('sound');
  if (touchHits < minHits) flatSenses.push('touch');
  if (tasteHits < minHits) flatSenses.push('taste');
  if (smellHits < minHits) flatSenses.push('smell');
  if (bodyHits < minHits) flatSenses.push('body');

  // Score: 0-10. 5 senses + body = 10. Sight only = 2.
  const balanceScore = Math.min(10, sensesPresent * 2 + (bodyHits >= minHits ? 1 : 0));

  return {
    sightHits, soundHits, touchHits, tasteHits, smellHits, bodyHits,
    totalChars, balanceScore, flatSenses,
  };
}

/**
 * Format sensory analysis for Critic prompt.
 */
export function formatSensoryReport(report: SensoryBalanceReport): string {
  const lines = [
    `[SENSORY BALANCE — score ${report.balanceScore}/10]`,
    `  sight=${report.sightHits} sound=${report.soundHits} touch=${report.touchHits} taste=${report.tasteHits} smell=${report.smellHits} body=${report.bodyHits}`,
  ];
  if (report.flatSenses.length > 0) {
    lines.push(`  ⚠️ Thiếu giác quan: ${report.flatSenses.join(', ')} — chương cảm giác phẳng, thêm sensory details để immersion.`);
  }
  return lines.join('\n');
}
