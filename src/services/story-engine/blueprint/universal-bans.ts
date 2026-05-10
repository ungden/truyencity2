/**
 * Universal banned patterns — applied to EVERY chapter brief of EVERY novel
 * using the blueprint approach. Catches default AI drift patterns observed
 * across multiple novels (paranoia cliffhanger, MC chõ mồm, double-evolve,
 * cosmic-tier antagonist too early).
 *
 * Per-novel `extraBannedPatterns` (in NovelBlueprint) extend this list.
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
