/**
 * Story Engine — Post-Write Validator (Phase R+1, 2026-05-15).
 *
 * Inspired by InkOS post-write-validator architecture: deterministic
 * regex/substring rules that run AFTER chapter generation, catching prose-
 * layer violations that prompt-only rules cannot guarantee.
 *
 * Separation from canon-enforcement.ts:
 *   - canon-enforcement: state/canon/timeline/POV/voice — references DB
 *   - post-write-validator: prose surface only — pure text, zero DB, zero LLM
 *
 * 8 rules ported (Vietnamese-adapted from InkOS Chinese patterns):
 *   1. Paragraph length uniformity (CV < 0.15)
 *   2. Hedge density (có lẽ / dường như / hình như / có vẻ / như thể / có
 *      thể / chắc là / chắc hẳn) cap 3 per 1K chars
 *   3. Meta-narration ban (tiếp theo sẽ là / đến đây.../ câu chuyện đến
 *      đây / phía sau sẽ / về sau sẽ / sau này sẽ) — critical
 *   4. Analysis-report terms ban (động cơ cốt lõi / lợi ích tối đa /
 *      ranh giới thông tin / vùng nhận thức / tâm lý phản kháng / hành vi
 *      quy luật / cân bằng quyền lực) — critical
 *   5. Author-sermon ban (hiển nhiên / không cần nói / ai cũng biết /
 *      không nghi ngờ / điều đó cho thấy / rõ ràng là / dĩ nhiên là)
 *      — moderate
 *   6. Crowd-shock collective reactions (cả hội trường + chấn động /
 *      tất cả mọi người + sững sờ / toàn bộ khán đài + im lặng) — moderate
 *   7. Chapter-number references in body (Chương \d+) — critical
 *   8. Surprise marker density (đột nhiên / bỗng / chợt / không ngờ /
 *      bất ngờ / quả nhiên / thình lình) cap 1 per 3K chars — moderate
 *
 * Each rule returns CriticIssue[]. The runner merges all rule outputs and
 * lets the writer-pipeline decide REWRITE/REVISE based on aggregate severity.
 */

import type { CriticIssue } from '../types';

// ── Word lists ───────────────────────────────────────────────────────────────

const HEDGE_WORDS = [
  'có lẽ',
  'dường như',
  'hình như',
  'có vẻ',
  'như thể',
  'có thể',
  'chắc là',
  'chắc hẳn',
  'phảng phất',
  'hình như là',
  'có thể là',
];

const SURPRISE_MARKERS = [
  'đột nhiên',
  'bỗng nhiên',
  'bỗng dưng',
  'bỗng',
  'chợt',
  'không ngờ',
  'bất ngờ',
  'quả nhiên',
  'thình lình',
  'thoáng chốc',
];

const META_NARRATION_PATTERNS: RegExp[] = [
  /tiếp\s+theo\s+sẽ\s+là/i,
  /đến\s+đây[,，]?\s+(?:thì|là|coi|tạm|gần|đã|đã\s+xong)/i,
  /câu\s+chuyện\s+(?:đến\s+đây|tới\s+đây|đã\s+đến)/i,
  /(?:phía\s+sau|về\s+sau|sau\s+này)\s+(?:sẽ|còn|sẽ\s+có)/i,
  /(?:nói\s+đến\s+đây|kể\s+đến\s+đây)[,，]?\s+(?:thì|là|cũng)/i,
  /chuyện\s+này\s+(?:tạm\s+gác|tạm\s+dừng|để\s+sau)/i,
  /độc\s+giả\s+(?:có\s+thể|chắc\s+là|sẽ)/i,
];

const ANALYSIS_REPORT_TERMS = [
  'động cơ cốt lõi',
  'lợi ích tối đa',
  'lợi ích cốt lõi',
  'ranh giới thông tin',
  'lệch thông tin',
  'vùng nhận thức',
  'tâm lý phản kháng',
  'hành vi quy luật',
  'cân bằng quyền lực',
  'biên độ rủi ro',
  'điểm chốt cảm xúc',
  'điểm neo cảm xúc',
  'phễu cảm xúc',
  'hệ số nhân quả',
  'lan truyền ảnh hưởng',
];

const AUTHOR_SERMON_WORDS = [
  'hiển nhiên',
  'không cần nói',
  'ai cũng biết',
  'không nghi ngờ',
  'điều đó cho thấy',
  'rõ ràng là',
  'dĩ nhiên là',
  'lẽ tất nhiên',
  'không thể phủ nhận',
  'chẳng cần bàn cãi',
];

const CROWD_SHOCK_PATTERNS: RegExp[] = [
  /(?:cả|toàn bộ)\s+(?:hội\s+trường|sân\s+khấu|phòng|khán\s+đài|đám\s+đông)[,，]?\s*(?:đều|cùng|nhất\s+loạt|tất\s+thảy)?\s*(?:chấn\s+động|sững\s+sờ|im\s+phăng\s+phắc|im\s+lặng|nín\s+thở|kinh\s+ngạc|hoảng\s+sợ)/i,
  /tất\s+cả\s+(?:mọi\s+người|những\s+người)\s+(?:đều|cùng|nhất\s+loạt)\s*(?:sững\s+sờ|chấn\s+động|kinh\s+ngạc|há\s+hốc|tròn\s+mắt)/i,
  /(?:mọi\s+người|đám\s+đông|đám\s+người)\s+(?:đều|cùng|nhất\s+loạt)\s+(?:há\s+hốc|tròn\s+xoe|thở\s+dốc|tái\s+mặt|rúng\s+động)/i,
  /(?:toàn|cả)\s+(?:thiên\s+hạ|thế\s+gian|thành\s+phố)\s+(?:chấn\s+động|chấn\s+kinh|rúng\s+động)/i,
];

// ── Public API ───────────────────────────────────────────────────────────────

export interface PostWriteValidatorInput {
  readonly content: string;
}

/**
 * Run all post-write validator rules. Returns CriticIssue[] to be merged
 * into Critic output. Each rule is independent — they don't share state.
 *
 * Pure function: no DB, no LLM, no async. Sub-ms runtime.
 */
export function runPostWriteValidator(input: PostWriteValidatorInput): CriticIssue[] {
  const content = input.content;
  if (!content || content.length < 200) return [];

  const issues: CriticIssue[] = [];

  pushAll(issues, detectParagraphUniformity(content));
  pushAll(issues, detectHedgeDensity(content));
  pushAll(issues, detectMetaNarration(content));
  pushAll(issues, detectAnalysisReportTerms(content));
  pushAll(issues, detectAuthorSermon(content));
  pushAll(issues, detectCrowdShock(content));
  pushAll(issues, detectChapterNumberRef(content));
  pushAll(issues, detectSurpriseDensity(content));

  return issues;
}

function pushAll<T>(target: T[], src: T[]): void {
  for (const x of src) target.push(x);
}

// ── Rule 1: Paragraph length uniformity ──────────────────────────────────────

/**
 * AI tends to produce paragraphs of similar length. Compute coefficient of
 * variation (stddev / mean) of paragraph lengths. CV < 0.15 with ≥3
 * paragraphs = unnaturally uniform sizing.
 *
 * Threshold derived from InkOS ai-tells.ts. Pure statistical analysis.
 */
export function detectParagraphUniformity(content: string): CriticIssue[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  if (paragraphs.length < 3) return [];

  const lengths = paragraphs.map(p => p.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean <= 0) return [];

  const variance = lengths.reduce((sum, l) => sum + (l - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  if (cv >= 0.15) return [];

  return [
    {
      type: 'quality',
      severity: cv < 0.10 ? 'major' : 'moderate',
      description: `Độ dài đoạn quá đồng đều (CV=${cv.toFixed(3)}, ngưỡng <0.15, tổng ${paragraphs.length} đoạn). Đây là pattern AI: paragraphs cùng kích thước. Cần đa dạng — đoạn ngắn cho impact/nhịp, đoạn dài cho immersion/chi tiết.`,
      suggestion: 'Đoạn ngắn 1-2 câu xen kẽ với đoạn dài 4-6 câu để tạo rhythm. Action beats nên là 1-line. Mô tả cảnh có thể nhiều dòng.',
    },
  ];
}

// ── Rule 2: Hedge density ────────────────────────────────────────────────────

/**
 * "Hedge" = words signalling uncertainty / tentativeness. AI prose loves
 * them: "có lẽ / dường như / hình như / có vẻ". Cap at 3 per 1K chars.
 */
export function detectHedgeDensity(content: string): CriticIssue[] {
  const totalChars = content.length;
  if (totalChars < 500) return [];

  let total = 0;
  const counts: Record<string, number> = {};
  for (const w of HEDGE_WORDS) {
    const re = new RegExp(escapeRegex(w), 'gi');
    const n = (content.match(re) || []).length;
    if (n > 0) {
      counts[w] = n;
      total += n;
    }
  }

  const density = total / (totalChars / 1000);
  if (density <= 3) return [];

  const topHits = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `"${k}"×${v}`)
    .join(', ');

  return [
    {
      type: 'quality',
      severity: density > 6 ? 'major' : 'moderate',
      description: `Hedge density ${density.toFixed(1)}/1K chars (ngưỡng ≤3). Tổng ${total} hedge words: ${topHits}. Giọng prose thiếu chắc chắn — AI tic.`,
      suggestion: 'Thay hedge bằng narration cứng. Thay "Hắn có lẽ đã đoán đúng" bằng "Hắn đoán đúng" hoặc chi tiết cụ thể chứng minh suy luận.',
    },
  ];
}

// ── Rule 3: Meta-narration ban ───────────────────────────────────────────────

/**
 * Editorial / stage-direction phrasing. Author commenting on flow of story.
 * Hard ban — these never belong in fiction prose.
 */
export function detectMetaNarration(content: string): CriticIssue[] {
  const matches: string[] = [];
  for (const re of META_NARRATION_PATTERNS) {
    const m = content.match(re);
    if (m) matches.push(m[0]);
  }
  if (matches.length === 0) return [];

  return [
    {
      type: 'quality',
      severity: 'critical',
      description: `Meta-narration / editorial voice: ${matches.map(m => `"${m.slice(0, 60)}"`).join(', ')}. Cấm tuyệt đối — narrator không được tự thuật về flow truyện ("tiếp theo sẽ là..." / "câu chuyện đến đây...").`,
      suggestion: 'Xoá phần meta-narration. Cảnh nên kết thúc bằng action/dialogue/cliffhanger cụ thể, không "transition tag" của tác giả.',
    },
  ];
}

// ── Rule 4: Analysis-report terms ban ────────────────────────────────────────

/**
 * Reasoning-leak: AI sometimes uses analytical / business / psychology
 * jargon in prose. These belong in pre-write reasoning, not chapter text.
 */
export function detectAnalysisReportTerms(content: string): CriticIssue[] {
  const found: string[] = [];
  const lower = content.toLowerCase();
  for (const t of ANALYSIS_REPORT_TERMS) {
    if (lower.includes(t)) found.push(t);
  }
  if (found.length === 0) return [];

  return [
    {
      type: 'quality',
      severity: 'critical',
      description: `Phrase phân tích / report leak vào prose: ${found.map(f => `"${f}"`).join(', ')}. Các cụm này thuộc reasoning layer, không nên xuất hiện trong narration.`,
      suggestion: 'Thay bằng diễn đạt tự nhiên: "động cơ cốt lõi" → "lý do thật", "lợi ích tối đa" → "lời nhiều nhất", "cân bằng quyền lực" → "ai đang nắm thế".',
    },
  ];
}

// ── Rule 5: Author-sermon ────────────────────────────────────────────────────

/**
 * Author talking down to reader. Vietnamese: "hiển nhiên / không cần nói /
 * ai cũng biết". Soft ban — flag moderate.
 */
export function detectAuthorSermon(content: string): CriticIssue[] {
  const found: string[] = [];
  const lower = content.toLowerCase();
  for (const w of AUTHOR_SERMON_WORDS) {
    if (lower.includes(w)) found.push(w);
  }
  if (found.length === 0) return [];

  return [
    {
      type: 'quality',
      severity: found.length >= 3 ? 'major' : 'moderate',
      description: `Author-sermon words: ${found.map(f => `"${f}"`).join(', ')}. Reader tự nhận ra, không cần narrator giải thích.`,
      suggestion: 'Xoá sermon words. Để chi tiết cụ thể trong scene tự nói. "Hiển nhiên hắn đã thắng" → mô tả chiến thắng cụ thể.',
    },
  ];
}

// ── Rule 6: Crowd-shock collective reactions ────────────────────────────────

/**
 * Lazy collective reaction: "cả hội trường chấn động / tất cả mọi người
 * sững sờ". Replace with specific 1-2 character reaction.
 */
export function detectCrowdShock(content: string): CriticIssue[] {
  const matches: string[] = [];
  for (const re of CROWD_SHOCK_PATTERNS) {
    const m = content.match(re);
    if (m) matches.push(m[0]);
  }
  if (matches.length === 0) return [];

  return [
    {
      type: 'quality',
      severity: matches.length >= 2 ? 'major' : 'moderate',
      description: `Crowd-shock collective reaction: ${matches.map(m => `"${m.slice(0, 80)}"`).join(' | ')}. Lazy reaction — không có character cụ thể nào phản ứng.`,
      suggestion: 'Thay bằng 1-2 reaction cụ thể của character có tên (cử chỉ cụ thể, dialogue ngắn, body language). Ví dụ: "Lão Vương vỡ chén trà, bà Bảy lùi một bước".',
    },
  ];
}

// ── Rule 7: Chapter-number reference in body ────────────────────────────────

/**
 * Character don't know they're in chapter N. "Chương 33" inside body =
 * narrator breaking 4th wall.
 */
export function detectChapterNumberRef(content: string): CriticIssue[] {
  // Skip first 100 chars (could be a heading we missed stripping)
  const body = content.slice(100);
  const re = /(?:Chương|chapter|Chapter)\s+\d+/g;
  const matches = body.match(re);
  if (!matches || matches.length === 0) return [];

  const unique = [...new Set(matches)];
  return [
    {
      type: 'quality',
      severity: 'critical',
      description: `Chapter number reference trong body: ${unique.map(u => `"${u}"`).join(', ')}. Character không biết mình ở chương mấy — narrator break 4th wall.`,
      suggestion: 'Thay bằng tham chiếu tự nhiên: "đêm hôm đó", "sự kiện kho cảng cháy", "lần đầu gặp ở quán nước".',
    },
  ];
}

// ── Rule 8: Surprise marker density ──────────────────────────────────────────

/**
 * AI overuses "đột nhiên / bỗng / chợt / không ngờ" to manufacture
 * surprise. Cap at 1 per 3K chars.
 */
export function detectSurpriseDensity(content: string): CriticIssue[] {
  const totalChars = content.length;
  if (totalChars < 1500) return [];

  const counts: Record<string, number> = {};
  let total = 0;
  for (const w of SURPRISE_MARKERS) {
    const re = new RegExp(`(?:^|[^\\p{L}])${escapeRegex(w)}(?![\\p{L}])`, 'giu');
    const n = (content.match(re) || []).length;
    if (n > 0) {
      counts[w] = n;
      total += n;
    }
  }

  const cap = Math.max(1, Math.floor(totalChars / 3000));
  if (total <= cap) return [];

  const topHits = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `"${k}"×${v}`)
    .join(', ');

  return [
    {
      type: 'quality',
      severity: total >= cap * 3 ? 'major' : 'moderate',
      description: `Surprise marker density ${total} lần (cap ${cap}/${totalChars} chars = 1 per 3K). Top: ${topHits}. AI manufacture surprise bằng từ thay vì sự kiện thật.`,
      suggestion: 'Thay surprise marker bằng action/sensory detail chuyển scene. "Đột nhiên cánh cửa mở" → "Cánh cửa bật ra, đập vào tường".',
    },
  ];
}

// ── Utility ──────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Strip metadata lines ────────────────────────────────────────────────────

/**
 * Helper for post-write cleanup. Removes editorial markers that pipeline
 * agents (polisher/reviser/writer) may emit at end of chapter as notes.
 *
 * Patterns:
 *   [polisher-note] ...
 *   [writer-note] ...
 *   [reviser-note] ...
 *   [reviewer-note] ...
 *   [Editor's note] ...
 *   [润色备注] ... (Chinese — InkOS native)
 *   [备注] ...
 *   [Note] ...
 */
export function stripPostWriteMetaLines(content: string): string {
  const lines = content.split(/\r?\n/);
  const filtered = lines.filter(
    line =>
      !/^\s*\[(?:polisher|writer|reviser|reviewer|editor's?)\s*[-_]?\s*note\]\s*/i.test(line) &&
      !/^\s*\[(?:润色|写作|修订|审稿|备注)\s*[备注:：]?\s*\]\s*/.test(line) &&
      !/^\s*\[Note\]\s*/i.test(line),
  );
  return filtered.join('\n').trimEnd();
}
