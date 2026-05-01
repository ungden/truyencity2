/**
 * Seed Blueprint — strict schema for world_description so seeds are
 * production-grade out of the gate.
 *
 * Problem this fixes: content-seeder previously asked AI for a 120-220 từ
 * "worldDescription" string. Result: most seeds had vague setting + generic
 * golden finger + 0 named cast. Architect/Writer then had to invent missing
 * pieces ad-hoc, producing the "ngây ngô" execution the user complained about.
 *
 * Solution: enforce 9-section blueprint with concrete required fields, plus
 * per-genre addendum from genre-process-blueprints module. World descriptions
 * become 800-1500 từ structured docs that the engine can index deterministically.
 *
 * Validation: validateSeedStructure(text) returns { score, missingSections,
 * issues } so the seeder can regen if score < threshold.
 */

import type { GenreType } from '../types';
import { getGenreSetupRequirements } from '../templates/genre-process-blueprints';

/**
 * Returns the seed blueprint instructions, optionally augmented with
 * genre-specific cast roles + golden finger type + phase framework + world
 * rules focus. Seeder calls this with the active genre.
 */
export function buildSeedBlueprintInstructions(genre?: GenreType): string {
  const genreAddendum = genre ? getGenreSetupRequirements(genre) : '';
  return SEED_BLUEPRINT_INSTRUCTIONS + genreAddendum;
}

export const SEED_BLUEPRINT_INSTRUCTIONS = `
‼️ SẢNG VĂN — ANTI-TỰ-NGƯỢC HARD BANS (TUYỆT ĐỐI — VI PHẠM = REJECT):
- MC trọng sinh/xuyên không là DUY NHẤT. KHÔNG có "đám trọng sinh khác", KHÔNG "5 đồng hương xuyên không cùng MC". World NGÂY THƠ về golden finger MC.
- Phase 1 (ch.1-100) MAX 1 antagonist active. Antagonist mới chỉ unlock sau khi conflict cũ xong. KHÔNG mở 3 phe đối kháng cùng arc 1.
- KHÔNG "tổ chức bí ẩn theo dõi MC" từ ch.1-50. Tổ chức notice MC chỉ sau MC có thành tựu visible (≥arc 2). Trước đó world IGNORES MC hoàn toàn.
- KHÔNG "MC vừa làm X đã bị Y phát hiện ngay". Mỗi MC action scale 1 tầng nhận thức world (xã → huyện → tỉnh → quốc):
  * Mua đồ cấp xã → KHÔNG ai ngoài chợ biết.
  * Mở shop cấp huyện → vài người notice (hàng xóm, supplier).
  * Ký hợp đồng cấp tỉnh → tầng 1 enemy bắt đầu react.
  KHÔNG SKIP TẦNG. KHÔNG có "MC mới mua sắm ít đồ đã bị 5 thằng chú ý".
- ANTAGONIST trong CAST roster phải distribute introduceArc theo timeline:
  * 30% antagonists arc 1-2 (LOCAL scale: hàng xóm, đồng nghiệp, chợ)
  * 30% antagonists arc 3-5 (REGIONAL: tỉnh, ngành)
  * 40% antagonists arc 6+ (NATIONAL/COSMIC). KHÔNG được all introduce arc 1.
- KHÔNG "kẻ thù kiếp trước theo MC qua thời gian/không gian". Kiếp trước enemy là KÝ ỨC MC, KHÔNG follow physically sang kiếp này.
- WARM BASELINE 5 chương đầu: MC flex skill OK, nhưng KHÔNG ai ACTIVE đe dọa MC. Reader cần warm-up time để root for MC. Chương 1-5 = MC trong domain nhỏ của mình, làm việc routine, ZERO stalker / ZERO bí ẩn / ZERO sát thủ.


WORLD_DESCRIPTION BLUEPRINT (BẮT BUỘC — Nếu thiếu bất kỳ section nào, output sẽ bị reject):

worldDescription PHẢI là chuỗi 800-1500 từ chia thành 9 section đánh dấu rõ ràng bằng tiêu đề viết hoa:

### BỐI CẢNH
[2-3 câu: Thời gian + địa điểm cụ thể. Vd: "Năm 2025, Phượng Đô (tựa Hà Nội), MC sống trong căn trọ tầng 2 đường Nguyễn Huệ."]

### NHÂN VẬT CHÍNH
- Tên: [họ + tên đầy đủ]
- Tuổi: [con số cụ thể]
- Nghề/Trạng thái: [cụ thể, vd "sinh viên năm 4 Đại Học Bách Khoa thất nghiệp 6 tháng"]
- Tài sản hiện tại: [số liệu cụ thể, vd "tài khoản Techcombank 1.8 triệu đồng, nợ trọ 4.5 triệu sắp đáo hạn"]
- Tính cách: [3-5 trait cụ thể, vd "trầm tính, IQ 138 nhưng giấu, tự ti với gia đình"]
- Điểm yếu: [1-2 weakness — KHÔNG được perfect, vd "không có kỹ năng giao tiếp đám đông, sợ thuyết trình"]

### GOLDEN FINGER
- Tên hệ thống/năng lực: [tên cụ thể, vd "Hệ Thống Đô Thị" / "Tuyến Tiến Hóa Ẩn"]
- Cơ chế hoạt động: [3-5 câu mô tả CỤ THỂ — hệ thống làm gì, hiển thị thông tin gì, MC tương tác ra sao]
- Trigger kích hoạt: [khi nào golden finger active, vd "khi MC chạm vào trứng động vật" / "khi MC nấu món mới"]
- Đường tăng trưởng: [Sơ → Trung → Cao → Đại Sư hoặc Cấp 1-99 — concrete tier system]
- Điểm yếu: [1-2 weakness — KHÔNG omnipotent, vd "không thể dùng quá 3 lần/ngày", "tiêu hao 1 năm tuổi thọ mỗi lần"]

### CAST CHÍNH (≥4 nhân vật named)
Mỗi nhân vật một dòng theo format:
- [Tên đầy đủ] — [vai trò] — [quan hệ với MC] — [intersect cụ thể]
Vd:
- Khánh — bạn cùng quê Hà Nam — bạn thân từ cấp 3 — làm bảo vệ tòa nhà gần đó, sau thành đối tác kinh doanh từ chương 30
- Chị Lan (cô Lan) — chủ quầy thịt cá chợ Bình Tân — đối tác cung ứng — cung cấp nguyên liệu giá hữu nghị, sau giúp MC mở rộng chuỗi

### ANTAGONISTS (≥2 đối thủ named)
Mỗi đối thủ:
- [Tên/Tổ chức] — [động cơ] — [thời điểm escalation]
Vd:
- Chuỗi cơm văn phòng "Cơm Phượng" — cạnh tranh giá rẻ — xuất hiện chương 20, đối đầu trực tiếp chương 50
- Tập đoàn Hoa Sao Group — copy concept + lobby health authority — chương 200+ sau khi MC scale lên chuỗi

### PHASE ROADMAP (4 phase × chương range)
PHASE 1 (1-100): [Tên phase] — Goal: [...] — Milestone cuối: [...] — Stakes: [...]
PHASE 2 (101-300): [Tên phase] — Goal: [...] — Milestone: [...] — Stakes: [...]
PHASE 3 (301-700): [Tên phase] — Goal: [...] — Milestone: [...] — Stakes: [...]
PHASE 4 (701-1000): [Tên phase] — Goal: [...] — Milestone cuối truyện: [...]

### OPENING SCENE (Chương 1 cụ thể)
- Location: [địa điểm cụ thể, không generic]
- MC đang làm gì khi mở chương: [hành động cụ thể — phải show competence ngay, KHÔNG rock-bottom]
- Hook event đầu chương: [opportunity-driven — KHÔNG threat-driven]
- Câu mở đầu mẫu (1 câu): [câu cụ thể anchor voice]

### WORLD RULES (3-5 quy tắc thế giới)
Mỗi rule một dòng — quy tắc concrete định hình narrative.
Vd cho do-thi:
- Hệ Thống chỉ active khi MC đứng trong bếp, ngoài bếp không có hỗ trợ
- Tiền thưởng từ Hệ Thống chỉ đổi được skill cooking + business, không có tiền mặt
- Nâng cấp tier nấu nướng cần MC tự nấu thật 100 lần món đó

### TONE & ANTI-PATTERNS
- TONE: [proactive ratio %, comedy density: low/med/high, pacing: slow/med/fast]
- ANTI-PATTERNS (3-5 dòng — những gì truyện này KHÔNG làm):
  • KHÔNG combat (MC = đầu bếp + doanh nhân, không võ sĩ)
  • KHÔNG harem (single love interest)
  • KHÔNG tu tiên / linh thạch / cảnh giới
  • KHÔNG instant master — skill cần thời gian + nhiệm vụ
  • KHÔNG copy paste công thức Earth → MC adapt + thử + sửa

CRITICAL CHECKS:
1. CAST ≥4 named, mỗi người có concrete intersect (KHÔNG generic "bạn thân").
2. ANTAGONISTS ≥2 named, mỗi đối thủ có timing escalation cụ thể (KHÔNG generic "kẻ thù").
3. PHASE ROADMAP có 4 phase, mỗi phase có goal + milestone + stakes.
4. GOLDEN FINGER có cơ chế CỤ THỂ + trigger + tier growth + weakness (KHÔNG omnipotent).
5. OPENING SCENE warm baseline (MC đã có golden finger active + competence visible) — KHÔNG rock-bottom.
6. ANTI-PATTERNS có ít nhất 3 dòng concrete bans cho genre này.
7. Tổng độ dài 800-1500 từ. Nếu < 800 → reject.

CẤM:
- KHÔNG dùng tên truyện nổi tiếng có thật làm reference (Quỷ Bí Chi Chủ, Đấu Phá Thương Khung, etc.)
- KHÔNG generic "MC" / "nhân vật chính" / "main" — luôn dùng tên đầy đủ
- KHÔNG vague stakes "thay đổi vận mệnh" — luôn cụ thể (con số, thời hạn, đối thủ tên)
`;

export interface SeedValidationResult {
  score: number;        // 0-100
  passed: boolean;      // score >= 70
  missingSections: string[];
  issues: string[];
  wordCount: number;
}

const REQUIRED_SECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'BỐI CẢNH', pattern: /###\s*BỐI\s*CẢNH/i },
  { name: 'NHÂN VẬT CHÍNH', pattern: /###\s*NHÂN\s*VẬT\s*CHÍNH/i },
  { name: 'GOLDEN FINGER', pattern: /###\s*GOLDEN\s*FINGER/i },
  { name: 'CAST CHÍNH', pattern: /###\s*CAST/i },
  { name: 'ANTAGONISTS', pattern: /###\s*ANTAGONIST/i },
  { name: 'PHASE ROADMAP', pattern: /###\s*PHASE\s*ROADMAP|PHASE\s*1\s*\(/i },
  { name: 'OPENING SCENE', pattern: /###\s*OPENING\s*SCENE/i },
  { name: 'WORLD RULES', pattern: /###\s*WORLD\s*RULES/i },
  { name: 'TONE & ANTI-PATTERNS', pattern: /###\s*TONE|ANTI-?PATTERN/i },
];

/**
 * Validate seed structure. Returns score 0-100 + missing sections + issues.
 * passed = score >= 70 (sweet spot — accepts seeds with minor gaps but rejects
 * generic blob output).
 */
export function validateSeedStructure(worldDescription: string): SeedValidationResult {
  const issues: string[] = [];
  const missingSections: string[] = [];

  if (!worldDescription || typeof worldDescription !== 'string') {
    return {
      score: 0,
      passed: false,
      missingSections: REQUIRED_SECTION_PATTERNS.map(s => s.name),
      issues: ['empty or non-string world_description'],
      wordCount: 0,
    };
  }

  const text = worldDescription.trim();
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  // Section presence: 9 sections, 5 points each = 45 max from structure.
  let structureScore = 0;
  for (const sec of REQUIRED_SECTION_PATTERNS) {
    if (sec.pattern.test(text)) {
      structureScore += 5;
    } else {
      missingSections.push(sec.name);
    }
  }

  // Length: 25 points max. Hits at 800+ từ; partial credit 400-799.
  let lengthScore = 0;
  if (wordCount >= 800) lengthScore = 25;
  else if (wordCount >= 400) lengthScore = 15;
  else if (wordCount >= 200) lengthScore = 8;
  else issues.push(`world_description too short (${wordCount} từ, target 800-1500)`);

  // Cast count: 15 points. Looks for ≥4 dash-prefixed character lines under CAST section.
  let castScore = 0;
  const castMatch = text.match(/###\s*CAST[^#]*/i);
  if (castMatch) {
    const castLines = castMatch[0].match(/^\s*-\s+\S+/gm) || [];
    if (castLines.length >= 4) castScore = 15;
    else if (castLines.length >= 2) castScore = 8;
    else issues.push(`CAST section has only ${castLines.length} named characters (need ≥4)`);
  }

  // Antagonist count: 10 points. ≥2 lines under ANTAGONISTS.
  let antagScore = 0;
  const antagMatch = text.match(/###\s*ANTAGONIST[^#]*/i);
  if (antagMatch) {
    const antagLines = antagMatch[0].match(/^\s*-\s+\S+/gm) || [];
    if (antagLines.length >= 2) antagScore = 10;
    else if (antagLines.length >= 1) antagScore = 5;
    else issues.push(`ANTAGONISTS section has only ${antagLines.length} named (need ≥2)`);
  }

  // Phase roadmap: 5 points. ≥3 PHASE entries.
  let phaseScore = 0;
  const phaseMatches = text.match(/PHASE\s*[1-4]\s*\([\d-]+\):/g) || [];
  if (phaseMatches.length >= 4) phaseScore = 5;
  else if (phaseMatches.length >= 2) phaseScore = 2;
  else issues.push(`PHASE ROADMAP missing or has only ${phaseMatches.length} phases (need 4)`);

  // P-A3: Sảng văn anti-tự-ngược pattern detection. Each violation = -15 score penalty.
  // Catches setups encoding tự ngược that bypass blueprint structural checks.
  let tunguocPenalty = 0;
  const TU_NGUOC_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
    { regex: /(các|nhiều|đám|một số|vài)\s+(người|nhân vật|kẻ)\s+(trọng sinh|xuyên không)/i,
      reason: 'multiple trọng sinh in world (only MC should be unique)' },
    { regex: /(tổ chức|thế lực|phe phái|hội|liên minh)\s+(bí ẩn|ẩn|ngầm|đen|đặc biệt).{0,50}(theo dõi|chú ý|nhắm|săn|săn lùng).{0,50}(MC|nhân vật chính|chủ)/i,
      reason: 'mysterious organization tracking MC from start' },
    { regex: /vừa\s+\w{1,15}\s+(đã|liền|bị)\s+\w{1,15}\s+(phát hiện|chú ý|theo dõi|nhắm)/i,
      reason: '"vừa X đã bị Y" — instant attention pattern' },
    { regex: /\d+\s+(thằng|kẻ|tên|người|nhân vật|đối thủ).{0,60}(theo dõi|chú ý|nhắm|săn).{0,30}(ngay|từ đầu|chương 1|đầu truyện)/i,
      reason: 'multiple attackers from chapter 1' },
    { regex: /(stalker|sát thủ|ám sát|truy sát).{0,50}(chương 1|đầu truyện|từ đầu|ngay)/i,
      reason: 'stalker/assassin in opening chapters' },
    { regex: /(kẻ thù|enemy)\s+(kiếp trước|tiền kiếp).{0,30}(theo|đuổi|truy)/i,
      reason: 'past-life enemy following MC physically' },
  ];
  for (const p of TU_NGUOC_PATTERNS) {
    if (p.regex.test(text)) {
      tunguocPenalty += 15;
      issues.push(`SẢNG VĂN VIOLATION: ${p.reason}`);
    }
  }

  const score = Math.max(0, Math.min(100, structureScore + lengthScore + castScore + antagScore + phaseScore - tunguocPenalty));

  return {
    score,
    passed: score >= 70,
    missingSections,
    issues,
    wordCount,
  };
}
