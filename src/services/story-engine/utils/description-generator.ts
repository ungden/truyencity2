/**
 * Reader-facing novel description generator.
 *
 * WHY THIS EXISTS:
 * Multiple spawn scripts (spawn-pure-game-studio, spawn-literary-genesis,
 * spawn-aniki, spawn-phase20-representatives, realign-2-drift-novels) each
 * hand-typed their `seed.description` field. Result: descriptions read like
 * engineering briefs with leaked jargon ("face-slap qua chương mới",
 * "Tone: realistic + cozy + numbers-driven", "ex-QA studio AAA bị burnout",
 * "KHÔNG combat, KHÔNG harem, KHÔNG huyền bí" — those are anti-pattern flags
 * for the engine, not reader copy).
 *
 * User feedback (2026-04-29): "cái giới thiệu nó thế đéo nào ấy, tao cần
 * mày fix lại hệ thống chứ lần nào tạo giới thiệu cũng dở".
 *
 * Root cause: no shared generator + no validator. Each spawn script invented
 * its own description and human eye missed jargon leak.
 *
 * This module provides:
 *   1. `generateNovelDescription()` — canonical DeepSeek call with
 *      reader-facing prompt (3-4 short paragraphs, hook → MC → conflict →
 *      teaser, no jargon, no anti-pattern flags exposed, 200-500 words).
 *   2. `validateDescription()` — detect jargon/leak signatures from
 *      historical bad outputs. Caller can throw or auto-regenerate.
 *
 * USAGE PATTERN (in spawn scripts):
 *   const desc = await generateNovelDescription({title, genre, sub_genres,
 *     main_character, world_description, tone_profile, starting_archetype});
 *   // Validator runs inside; throws on jargon leak.
 *   await s.from('novels').insert({title, description: desc, ...});
 */
import { callGemini } from './gemini';
import type { GeminiConfig, GenreType } from '../types';

export interface DescriptionGeneratorInput {
  title: string;
  genre: GenreType;
  subGenres?: string[];
  mainCharacter: string;
  worldDescription: string;
  toneProfile?: string;       // optional, e.g. "pragmatic" | "cozy" | "epic"
  startingArchetype?: string; // optional, e.g. "professional" | "phe-vat"
}

export interface DescriptionValidationIssue {
  severity: 'error' | 'warning';
  pattern: string;
  message: string;
  excerpt?: string;
}

// Patterns that signal craft/internal jargon leaked into reader-facing copy.
// These are HARD ERRORS — description must NOT contain them.
const JARGON_LEAK_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(face[- ]slap|vả mặt|đập mặt)\b/i, label: 'craft term "face-slap" — internal term, replace with story event' },
  { re: /\bTone\s*:|tone profile|cozy[- ]trend|slow[- ]burn growth|narrative voice|grounded realism\b/i, label: 'craft term "Tone:/tone profile" — describes craft, not story' },
  { re: /\bAnti[- ]pattern|KHÔNG combat,? KHÔNG|harem|huyền bí\)?,\s*KHÔNG\b/i, label: 'anti-pattern flag enumeration — these are engine prohibitions, not reader signals' },
  // Tech jargon: must have BOTH a prefix (ex-/cựu) AND/OR a context suffix (studio/dev/crunch/burnout).
  // Standalone "QA" alone is too generic to flag (could be QA tester in any field).
  { re: /\b(?:ex-|cựu)\s*(?:QA|AAA|UI|UX|backend|frontend|MMO)\b|\b(?:QA|AAA|UI|UX|backend|frontend|MMO)\s+(?:studio|developer|crunch|burnout)\b/i, label: 'Tech industry jargon — "ex-QA / QA studio / studio AAA" reads like CV bullets, not novel hook' },
  { re: /\bphase\s*\d|Phase\s*[1234]\b/i, label: 'roadmap phase mention — internal planning artifact' },
  { re: /\b(disable_chapter_split|sub_genres|world_description|story_outline|master_outline|requiresVndCurrency)\b/i, label: 'engine field name leaked into description' },
  { re: /\b(M[Cc] = AUTHOR|MC = chef|MC = creator)\b/i, label: 'MC = X equation pattern — reader description not formula' },
  { re: /\b\d+[\d.,]*\s*(xu|nguyên)\b(?!\s*(tử|thủy|tắc|liệu|chất|bản|nhân|thái|thủ|hình|sơ|nịnh))/i, label: 'VND currency leak — should be "đồng" not "xu/nguyên" for VN-set' },
  { re: /\b(numbers[- ]driven|stat[- ]heavy|word[- ]count target|2800 từ)\b/i, label: 'craft metric leaked' },
  { re: /\b(N1\+|JLPT|level [-]? \d+|trình độ \w+ \d+)\b/, label: 'precise certification number — too jargon for hook' },
  { re: /\bsetup\s*[\s,;:]+payoff|hook → MC → conflict\b/i, label: 'narrative beat structure exposed' },
];

// Length errors — HARD limits (was soft warnings, but generator kept producing
// 1500-2000 char descriptions). Card display + reader UX both suffer past 1300.
const LENGTH_ERROR_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /^[\s\S]{1301,}$/, label: 'description too long (>1300 chars) — homepage card cuts off, target 250-380 từ (~800-1250 chars). Trim hook detail, keep narrative voice.' },
  { re: /^[\s\S]{0,400}$/, label: 'description too short (<400 chars) — lacks hook + MC + conflict tease. Add concrete details.' },
];

// Soft warnings: not strictly forbidden but indicate awkward style.
const STYLE_WARN_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\(.{0,30}=.{0,40}\)/, label: 'parenthetical "(X = Y)" definition — kanji/term explanation OK once but excessive looks like glossary' },
  { re: /(\b\w+\b\s+){0,3}\w+ → \w+ → \w+ → \w+/, label: 'arrow chain "X → Y → Z → W" reads like roadmap, not narrative' },
];

export function validateDescription(text: string): DescriptionValidationIssue[] {
  const issues: DescriptionValidationIssue[] = [];

  for (const { re, label } of JARGON_LEAK_PATTERNS) {
    const match = text.match(re);
    if (match) {
      issues.push({
        severity: 'error',
        pattern: re.source,
        message: label,
        excerpt: match[0].slice(0, 80),
      });
    }
  }

  for (const { re, label } of LENGTH_ERROR_PATTERNS) {
    if (re.test(text)) {
      issues.push({
        severity: 'error',
        pattern: re.source,
        message: label,
      });
    }
  }

  for (const { re, label } of STYLE_WARN_PATTERNS) {
    if (re.test(text)) {
      issues.push({
        severity: 'warning',
        pattern: re.source,
        message: label,
      });
    }
  }

  return issues;
}

const SYSTEM_PROMPT = `Bạn là biên tập "Giới Thiệu Truyện" cho TruyenCity — một độc giả truyện mạng tiếng Việt đọc câu mở đầu phải MUỐN ĐỌC TIẾP. Văn phong tự nhiên, không convert thô.`;

const USER_PROMPT = (input: DescriptionGeneratorInput): string => `NHIỆM VỤ: viết phần GIỚI THIỆU TRUYỆN tiếng Việt cho ngoài bìa. Reader đọc trên card homepage hoặc trang novel detail — câu đầu là HOOK, đọc xong muốn click "Đọc chương 1".

THÔNG TIN TRUYỆN:
- Tên: "${input.title}"
- Thể loại: ${input.genre}${input.subGenres?.length ? ` (sub: ${input.subGenres.join(', ')})` : ''}
- Nhân vật chính: ${input.mainCharacter}
${input.toneProfile ? `- Tone: ${input.toneProfile}` : ''}
${input.startingArchetype ? `- MC archetype: ${input.startingArchetype}` : ''}

WORLD + CONCEPT (đọc kỹ để hiểu setting + golden finger + main conflict):
${input.worldDescription.slice(0, 4500)}

YÊU CẦU OUTPUT (LENGTH ĐẶC BIỆT QUAN TRỌNG):
- 3-4 đoạn ngắn, mỗi đoạn 2-3 câu. KHOẢNG 250-350 từ (≈ 900-1250 ký tự).
- ⚠ CỨNG: tổng output PHẢI dưới 1280 ký tự. Quá 1300 sẽ bị reject + retry. Đếm ký tự khi viết — nếu thấy gần 1200 hãy KẾT NGAY.
- Đếm ký tự ≠ đếm từ. 1 ký tự = 1 character. Tiếng Việt trung bình 5 ký tự/từ → 250 từ ≈ 1250 ký tự.
- Cách giảm length: cắt details không essential, gộp 2 câu thành 1, dùng câu ngắn 8-15 chữ thay vì câu dài 20-30 chữ.
- Đoạn 1 — HOOK: tình huống mở đầu cụ thể + câu hỏi/tension. Ví dụ tốt: "Đêm 15 tháng Ba, máy bay hạ cánh Tân Sơn Nhất. Long bước xuống — và nhận ra mọi người đang đợi anh ở cổng arrival không biết rằng anh từng chết một lần ở Kabukicho."
- Đoạn 2 — GIỚI THIỆU MC + năng lực/edge. Cụ thể nhưng không list-style. Ví dụ tốt: "9 năm ký ức Tokyo còn nguyên trong đầu Long: từng đường dao lạng cá ở Hanamaru Asakusa, từng cuộc gặp đêm với Aniki Tanaka trong izakaya Shinjuku."
- Đoạn 3 — TEASE conflict + journey. Cụ thể chứ không generic. Ví dụ: "Mặt bằng 112 Trần Khắc Chân chỉ đợi chữ ký bà Sáu. Một chuỗi sushi giả Sài Gòn đang dòm ngó concept Aniki còn chưa khai trương. Và đâu đó ở Tokyo, kẻ từng đầu độc anh vẫn còn sống."
- Đoạn 4 (tùy chọn) — câu kết invite reader. 1-2 câu, không sến.

CẤM TUYỆT ĐỐI (engine craft jargon — reader KHÔNG được thấy):
- "face-slap", "vả mặt", "đập mặt"
- "Tone:", "tone profile", "slow-burn growth", "cozy-trend"
- "KHÔNG combat, KHÔNG harem, KHÔNG huyền bí" (đây là engine flags, reader không cần biết — tả setting tự khắc reader hiểu)
- "ex-QA", "AAA studio", "crunch", "burnout" (CV jargon)
- "Phase 1/2/3/4", "roadmap", "arc"
- "disable_chapter_split", "sub_genres", "story_outline" (field names)
- "MC = AUTHOR thuần", "MC = creator" (formula style)
- "X xu", "X nguyên" (currency leak — VN-set phải dùng "đồng")
- "N1+", "JLPT level X", "trình độ tiếng Nhật cấp 1+" (precise certification)
- "setup → payoff", "hook → MC → conflict" (narrative beat structure)
- Arrow chain "X → Y → Z → W" 4+ items (roadmap style — viết thành câu narrative thay vì)

PHONG CÁCH:
- Tiếng Việt tự nhiên, sentences ngắn-dài xen kẽ, có nhịp điệu.
- KHÔNG văn mẫu AI ("khẽ nhếch mép", "ánh mắt phức tạp", "không khỏi", "đáy lòng").
- Cụ thể > trừu tượng. Tên + địa điểm + chi tiết > generic adjective.
- Tone match thể loại: cozy = ấm; pragmatic = calculating; epic = hùng tráng; mystery = ám ảnh.
- KHÔNG mention "Truyện City", "AI", "engine".
- KHÔNG spoiler ending — chỉ tease.

CHỈ TRẢ VỀ phần giới thiệu (text thuần). KHÔNG meta comment, KHÔNG markdown headers, KHÔNG quote ngoặc kép bao quanh.`;

/**
 * Generate a reader-facing novel description and validate it.
 * Throws if validator finds jargon leak (with descriptive error).
 * Retries up to 3 times if validator fails (generator self-corrects).
 */
export async function generateNovelDescription(input: DescriptionGeneratorInput): Promise<string> {
  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.75,
    maxTokens: 2048,
    systemPrompt: SYSTEM_PROMPT,
  };

  let lastErrors: DescriptionValidationIssue[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    // On retry, append explicit error feedback so DeepSeek self-corrects.
    const retryFeedback = lastErrors.length > 0
      ? `\n\n⚠ LẦN TRƯỚC BỊ TỪ CHỐI vì các lỗi sau (attempt ${attempt}/3 — phải sửa):\n${lastErrors.map(e => `- ${e.message}${e.excerpt ? ` (matched: "${e.excerpt}")` : ''}`).join('\n')}\n\nVIẾT LẠI hoàn toàn, KHÔNG lặp các pattern bị flagged trên.`
      : '';
    const res = await callGemini(USER_PROMPT(input) + retryFeedback, cfg);
    const text = (res.content || '').trim();

    const issues = validateDescription(text);
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    if (errors.length === 0) {
      // Log warnings for visibility but accept
      for (const w of warnings) {
        console.warn(`[description-generator] warning: ${w.message}`);
      }
      return text;
    }

    // Has errors — log + retry with explicit feedback next iteration
    console.warn(`[description-generator] attempt ${attempt}/3 failed validation:`);
    for (const e of errors) {
      console.warn(`  ✗ ${e.message}${e.excerpt ? ` (matched: "${e.excerpt}")` : ''}`);
    }
    lastErrors = errors;
    if (attempt === 3) {
      throw new Error(`Description generator failed validation after 3 attempts. Last issues: ${errors.map(e => e.message).join('; ')}`);
    }
  }

  throw new Error('Description generator exhausted retries without producing valid output');
}

/**
 * Convenience: validate-only mode for callers who already have a description
 * and want to check it before saving (e.g. backfill scripts).
 */
export function validateDescriptionOrThrow(text: string, context: string): void {
  const issues = validateDescription(text);
  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    throw new Error(`Invalid description (${context}): ${errors.map(e => `${e.message}${e.excerpt ? ` [${e.excerpt}]` : ''}`).join('; ')}`);
  }
}
