/**
 * Pure helper functions for chapter-writer (Phase 28 TIER 2 — extracted).
 *
 * No async, no AI calls, no DB. Pure functions: content cleaning, title
 * extraction, repetition detection, signal analysis, MC name flip detection,
 * etc. Re-imported by chapter-writer.ts.
 */

import type { ChapterOutline, CriticIssue, SceneOutline } from '../types';
import type { WriteChapterOptions } from './chapter-writer';
import { titleChecker } from '../quality/title-checker';
import { getConstraintExtractor } from '../canon/constraint-extractor';

export interface QualitySignals {
  comedyCount: number;
  innerCount: number;
  slowCount: number;
  subtextCount: number;
  dialogueRatio: number;
}

// ── Type-safe utilities ──────────────────────────────────────────────────────

/**
 * Safely trim a value that may be a string. AI sometimes returns non-string
 * values (object, array, null, number) for fields typed as string. Calling
 * `.trim()` on those crashes the pipeline (e.g., "N.cliffhanger?.trim is not
 * a function"). This helper returns empty string for non-string inputs.
 */
export function safeStringTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// ── Content Cleaning ─────────────────────────────────────────────────────────

export function cleanContent(content: string): string {
  let cleaned = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^(?:Scene|Cảnh|SCENE)\s*\d+\s*[:：]\s*/gm, '')
    .replace(/\bCliffhanger\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Strip repetition loops
  cleaned = cleaned.replace(/(\S+(?:\s+\S+){1,5}?)(?:\s+\1){2,}/g, '$1');
  cleaned = cleaned.replace(/(\S{2,})(?:\s+\1){2,}/g, '$1');

  return cleaned;
}

// ── Title Extraction ─────────────────────────────────────────────────────────

export function extractTitle(
  content: string,
  chapterNumber: number,
  outlineTitle: string,
  previousTitles: string[],
): string {
  // Try outline title first
  if (outlineTitle && outlineTitle.length >= 4 && outlineTitle.length <= 60) {
    if (!previousTitles.slice(0, 20).includes(outlineTitle)) {
      return outlineTitle;
    }
  }

  // Try extracting from content
  const lines = content.split('\n').slice(0, 8);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^Chương\s+\d+\s*[:\-–—]\s*(.+)/i);
    if (match && match[1].length >= 4 && match[1].length <= 60) {
      return match[1].trim();
    }
  }

  // Title similarity check - if too similar, generate unique fallback
  let finalTitle = outlineTitle || `Chương ${chapterNumber}`;
  if (previousTitles.length > 0) {
    const { similarity } = titleChecker.findMostSimilar(finalTitle, previousTitles);
    if (similarity >= 0.7) {
      // Generate fallback from content
      const sentences = content.slice(0, 500).match(/[^.!?。！？]+[.!?。！？]/g) || [];
      const shortSentence = sentences.find(s => {
        const trimmed = s.trim();
        return trimmed.length >= 5 && trimmed.length <= 40
          && !trimmed.startsWith('—') && !trimmed.startsWith('-')
          && !trimmed.startsWith('"') && !trimmed.startsWith('「');
      });
      finalTitle = shortSentence
        ? shortSentence.trim().replace(/^["'"「『\s]+|["'"」』\s.!?。！？]+$/g, '')
        : `Chương ${chapterNumber}`;
    }
  }

  return finalTitle;
}

export function synthesizeFallbackCliffhanger(outline: ChapterOutline): string {
  const lastScene = outline.scenes?.[outline.scenes.length - 1];
  const conflict = lastScene?.conflict?.trim();
  const resolution = lastScene?.resolution?.trim();

  if (conflict && conflict.length > 8) {
    return `Mâu thuẫn cuối chương vẫn chưa khép: ${conflict}`;
  }

  if (resolution && resolution.length > 8) {
    return `Sau khi ${resolution.toLowerCase()}, một biến cố mới bất ngờ xuất hiện.`;
  }

  return 'Khi mọi thứ tưởng như đã yên, một nguy cơ mới đột ngột xuất hiện ngay trước mắt.';
}

export function hasCliffhangerSignal(content: string): boolean {
  const tail = content.slice(-500).toLowerCase();
  const signals = [
    // Action / Suspense
    '?', '...', '…', 'bất ngờ', 'đột nhiên', 'bỗng', 'sững sờ', 'kinh hãi',
    'ngay lúc đó', 'vừa khi', 'tiếng động', 'cánh cửa', 'bóng đen', 'khựng lại',
    'không thể tin', 'run lên', 'hô lớn',
    // Business / Curiosity / Chill
    'chờ đợi', 'kết quả', 'ngày mai', 'sáng mai', 'mỉm cười', 'thú vị',
    'bắt đầu', 'chuẩn bị', 'mong đợi', 'thành quả', 'thu hoạch', 'giá trị',
    'chưa biết', 'bí ẩn', 'rốt cuộc', 'suy nghĩ'
  ];

  let score = 0;
  for (const signal of signals) {
    if (tail.includes(signal)) score += 1;
  }

  return score >= 2;
}


export function analyzeQualitySignals(content: string): QualitySignals {
  const lower = content.toLowerCase();
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const dialogueLines = lines.filter(l => l.startsWith('—') || l.startsWith('-')).length;
  const dialogueRatio = lines.length > 0 ? dialogueLines / lines.length : 0;

  const comedySignals = [
    'tự giễu', 'mỉa mai', 'khô khan', 'ngớ ngẩn', 'buồn cười',
    'não bổ', 'vô sỉ', 'tỉnh bơ', 'lật lọng', 'dở khóc dở cười', 'ngượng',
  ];
  const innerSignals = [
    'thầm nghĩ', 'trong lòng', 'tâm trí', 'nội tâm', 'sâu thẳm',
    'không dám thừa nhận', 'nỗi sợ', 'khao khát',
  ];
  const slowSignals = [
    'yên tĩnh', 'bình yên', 'nhắm mắt', 'hít thở', 'uống trà', 'nghỉ ngơi',
    'gió nhẹ', 'nhìn bầu trời',
  ];
  const subtextSignals = [
    'im lặng', 'khựng lại', 'không trả lời', 'chỉ cười', 'đổi chủ đề',
    'ánh mắt', 'nói một đằng',
  ];

  const countByPresence = (signals: string[]) => signals.filter(s => lower.includes(s)).length;

  return {
    comedyCount: countByPresence(comedySignals),
    innerCount: countByPresence(innerSignals),
    slowCount: countByPresence(slowSignals),
    subtextCount: countByPresence(subtextSignals),
    dialogueRatio,
  };
}

export function buildSignalReport(content: string): string {
  const s = analyzeQualitySignals(content);
  return [
    `- Comedy signals: ${s.comedyCount}`,
    `- Inner-monologue signals: ${s.innerCount}`,
    `- Slow-scene signals: ${s.slowCount}`,
    `- Subtext signals: ${s.subtextCount}`,
    `- Dialogue ratio: ${Math.round(s.dialogueRatio * 100)}%`,
  ].join('\n');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Hard-fail gate. Cheap regex check that catches the "Writer ignored the
 * brief and padded with rebirth/golden-finger monologue" failure mode
 * without spending Critic tokens. Returns a non-empty reason string when
 * the chapter must be regenerated, or empty string when content passes.
 *
 * Caller (writeChapter loop) treats non-empty as a "force regen" signal
 * and feeds the reason back to Writer as rewriteInstructions before
 * Critic is even invoked. This is intentionally stricter than the Critic
 * rule: Critic measures relative quality, this gate measures absolute
 * floors. Writer can recover by following the brief.
 *
 * Floors (per-chapter, not per-arc):
 *   - rebirth phrases ("kiếp trước", "30 năm tương lai", "ký ức tiền kiếp",
 *     "tương lai biết trước"): >5 occurrences = fail
 *   - common golden-finger names: >7 occurrences = fail. We sniff a small
 *     dictionary of project-specific names from the world_description /
 *     story_outline so e.g. "Hải Tâm" in a Ngư Dân chapter triggers, not
 *     all golden fingers everywhere.
 *
 * The thresholds are deliberately above the Writer-side rule (3 / 5) so
 * mild over-shooting still passes; only egregious padding fails.
 */
export function detectHardFallback(content: string, options?: WriteChapterOptions): string {
  // Politically charged terms — content-safety hard cap. Any single hit
  // forces regen; this is not a density check. The list covers Vietnamese
  // diaspora politics (post-1975 refugee identity / anti-communist press)
  // and home-country political ideology — neither belongs in entertainment
  // fiction on this platform. Common false-positives mitigated by case
  // sensitivity (we match exact phrasing, not loose substrings).
  const POLITICAL_TERMS = [
    /\bNgười Việt Tự Do\b/,
    /\bNgười Việt(?= báo| tạp chí| nhật báo| weekly)/i,  // "Người Việt báo" etc.
    /\bViệt Nam Cộng Hòa\b/,
    /\bVNCH\b/,
    /\bMặt Trận(?:\s+(?:Quốc Gia|Giải Phóng|Tổ Quốc|Dân Tộc))/,
    /\bVăn Bút Hải Ngoại\b/,
    /\bSài Gòn Nhỏ\b/,
    /\bLittle Saigon\b/,
    /\btỵ nạn chính trị\b/,
    /\bthuyền nhân\b/i,
    /\bvượt biên\b/i,
    /\btháng tư đen\b/i,
    /\bgiải phóng miền Nam\b/i,
    /\bcộng sản\b/i,
    /\b30[\/\.\s\-]?4[\/\.\s\-]?1975\b/,
    /\b1975(?:[^\d]|$).{0,40}(?:di cư|tỵ nạn|chiến tranh|sụp đổ|giải phóng|chính trị)/i,
    /\bdi cư\b.{0,60}\b(?:sau chiến tranh|chính trị|1975|tỵ nạn)\b/i,
  ];
  for (const re of POLITICAL_TERMS) {
    const match = content.match(re);
    if (match) {
      return `political content (matched "${match[0].slice(0, 50)}") — banned by content-safety guard`;
    }
  }

  const REBIRTH_PHRASES = [
    /\bkiếp trước\b/gi,
    /\b30 năm tương lai\b/gi,
    /\bký ức tiền kiếp\b/gi,
    /\btương lai biết trước\b/gi,
    /\bba mươi năm tương lai\b/gi,
  ];
  let rebirthCount = 0;
  for (const re of REBIRTH_PHRASES) {
    rebirthCount += (content.match(re) ?? []).length;
  }
  if (rebirthCount > 5) {
    return `setup repetition (rebirth phrases ${rebirthCount}× in chapter, max 3 allowed in WRITER_SYSTEM, hard fail >5)`;
  }

  // VND CURRENCY hard check (added 2026-04-29 sweep): for VN-set genres,
  // any "X xu" / "X nguyên" pattern (digit + currency unit) is a deterministic
  // fail. AI-side Critic was missing some leaks; this regex check is independent
  // of AI verdict and forces Writer regen with explicit instruction.
  // KEEP: "xu nịnh" (flatter), "nguyên tử/thủy/tắc/liệu" (Vietnamese compounds).
  // BLOCK: "127.000 xu", "5 triệu xu", "350 nghìn xu", "1000 nguyên".
  if (options?.worldDescription) {
    const isVnSet = /Đại Nam|Hải Long Đô|Phượng Đô|Trung Đô|Sài Gòn|Hà Nội|Việt Nam|Dân Quốc|Đại Việt/i.test(options.worldDescription);
    if (isVnSet) {
      // Match digit (with optional commas/dots) immediately followed by xu OR
      // numeric quantifier (triệu/nghìn/trăm/tỷ/ngàn) followed by xu.
      const xuLeak = content.match(/\d[\d.,]*\s*xu\b|(?:triệu|nghìn|trăm|tỷ|ngàn)\s+xu\b/);
      if (xuLeak) {
        return `VND currency leak: "${xuLeak[0]}" — VN-set novel must use "đồng" not "xu" for daily transactions. Banned for do-thi/quan-truong + VN-marker world_description.`;
      }
      // Match digit + nguyên but exclude common Vietnamese compounds
      // (nguyên tử / nguyên thủy / nguyên tắc / nguyên liệu / nguyên chất / nguyên bản / nguyên nhân / nguyên thái / nguyên thủ / nguyên hình / nguyên sơ).
      const nguyenLeak = content.match(/\d[\d.,]*\s*nguyên(?!\s*(?:tử|thủy|tắc|liệu|chất|bản|nhân|thái|thủ|hình|sơ|tháng|năm|đán|tiêu))/);
      if (nguyenLeak) {
        return `VND currency leak: "${nguyenLeak[0]}" — VN-set novel must use "đồng" not "nguyên" for currency.`;
      }
    }
  }

  // Sniff golden-finger name from world_description. Common patterns:
  //   "Bàn Tay Vàng — <Name>" or "golden finger ... <Name>"
  //   '"<Name>" — passive cảm nhận'
  //   "Hệ thống <Name>" or "<Name> — <ability>"
  // Cap at the ones we've seen leak: Hải Tâm, Hệ Thống Nhắc Nhở, etc.
  // For deterministic check we extract any 1-2 word capitalised phrase
  // marked with em-dash in the world_description.
  const world = options?.worldDescription || '';
  const goldenFingerCandidates = new Set<string>();
  // pattern: '"Hải Tâm" — passive...' or '"Hệ Thống Nhắc Nhở" cấp...'
  const quotedRe = /[""]([A-ZÀÁÂÃĐÈÉÊÌÍÒÓÔÕÙÚĂẠ-Ỹ][^""]{2,30})[""]\s*[—\-–:]/g;
  let m: RegExpExecArray | null;
  while ((m = quotedRe.exec(world)) !== null) {
    goldenFingerCandidates.add(m[1].trim());
  }
  // pattern: 'Bàn Tay Vàng (...): "Tên đặc biệt"' or 'Cheat: <Name>'
  const cheatRe = /(?:Bàn Tay Vàng|Cheat|Golden Finger|Hệ thống|Hệ Thống)[^.\n]{0,80}?[""]([^""]{2,30})[""]/g;
  while ((m = cheatRe.exec(world)) !== null) {
    goldenFingerCandidates.add(m[1].trim());
  }
  // Common literal names that leak across novels — check generically too
  const COMMON_GF = ['Hệ Thống Nhắc Nhở', 'Bàn Tay Vàng', 'Hệ Thống', 'Hải Tâm', 'Đồ Giám Yêu Ma', 'Sổ Sinh Tử'];
  for (const name of COMMON_GF) {
    if (world.includes(name)) goldenFingerCandidates.add(name);
  }

  for (const name of goldenFingerCandidates) {
    if (!name || name.length < 3) continue;
    // Whole-word-ish match to avoid matching substrings
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escapedName, 'g');
    const count = (content.match(re) ?? []).length;
    if (count > 7) {
      return `golden-finger name "${name}" appears ${count}× in chapter (max 5 allowed in WRITER_SYSTEM, hard fail >7)`;
    }
  }

  return '';
}

/**
 * Detect severe word repetition and return CriticIssue objects.
 * Used for hard enforcement in runCritic.
 *
 * Words are categorized:
 * - 'generic': colors, adjectives, emotions — strict thresholds (5=moderate, 8=critical)
 * - 'plot_element': words that may naturally recur as plot elements — relaxed thresholds (8=moderate, 12=critical)
 */
/**
 * P2.2: Detect MC name flip — chapter content uses a DIFFERENT name as primary MC
 * than what project.main_character specifies. Returns severity + message.
 *
 * Heuristic:
 *   - Count occurrences of expected MC name + each token thereof (full name + last name + first name).
 *   - Find any other name candidate (Vietnamese 2-3 word capitalised proper noun, repeated ≥3 times).
 *   - If candidate count > expected name occurrences → name flip detected.
 *
 * Severity:
 *   - critical: candidate appears ≥5 times AND expected appears ≤2 times → DEFINITELY drifted
 *   - major: candidate appears ≥3 times AND > expected count → likely drift
 *   - none: expected name dominates
 */
export function detectMcNameFlip(
  content: string,
  expectedName: string,
): { severity: 'none' | 'major' | 'critical'; message: string } {
  // Build expected name variants: full name + first-name + last-name
  const tokens = expectedName.split(/\s+/).filter(t => t.length >= 2);
  const expectedVariants = new Set<string>([expectedName]);
  if (tokens.length >= 2) {
    expectedVariants.add(tokens[tokens.length - 1]); // last token = personal name (e.g. "Vũ")
    expectedVariants.add(tokens[0]); // first = surname (e.g. "Trần")
  }

  let expectedCount = 0;
  for (const v of expectedVariants) {
    const re = new RegExp(`\\b${escapeRegex(v)}\\b`, 'g');
    expectedCount += (content.match(re) || []).length;
  }

  // Vietnamese capitalised 2-3 word names (potential MC candidates).
  // Match patterns like "Trần Vũ", "Lý Tầm Hoan" — capitalised tokens with diacritics.
  const candidatePattern = /\b[A-ZĐ][a-zà-ỹĐđ]{1,15}(?:\s+[A-ZĐ][a-zà-ỹĐđ]{1,15}){1,2}\b/g;
  const counts = new Map<string, number>();
  let match: RegExpExecArray | null;
  while ((match = candidatePattern.exec(content)) !== null) {
    const name = match[0];
    if (expectedVariants.has(name)) continue;
    // Skip 2-word geographical / common phrases
    if (/^(Đại|Trung|Hà|Sài|Bắc|Nam|Đông|Tây|Phượng|Hải|Cố|Hoàng|Vạn|Thiên|Hệ|Cấm|Núi|Đường|Phố|Vực|Khu|Tập|Công|Văn|Quân|Sảng|Chương|Mã|Thần)/.test(name.split(/\s+/)[0])) {
      continue;
    }
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  // Find top candidate
  let topCandidate = '';
  let topCount = 0;
  for (const [name, c] of counts) {
    if (c > topCount) {
      topCandidate = name;
      topCount = c;
    }
  }

  if (!topCandidate || topCount < 3) {
    return { severity: 'none', message: '' };
  }

  if (topCount >= 5 && expectedCount <= 2) {
    return {
      severity: 'critical',
      message: `Tên MC dự kiến "${expectedName}" chỉ xuất hiện ${expectedCount} lần, nhưng "${topCandidate}" xuất hiện ${topCount} lần như nhân vật chính. Đây là NAME FLIP nghiêm trọng. PHẢI viết lại với tên MC = "${expectedName}" — đây là tên đã thiết lập từ chương trước, không được tự ý đổi.`,
    };
  }

  if (topCount >= 3 && topCount > expectedCount) {
    return {
      severity: 'major',
      message: `Tên "${topCandidate}" xuất hiện ${topCount} lần (≥ tên MC dự kiến "${expectedName}" = ${expectedCount} lần). Có khả năng name drift. Sửa: dùng "${expectedName}" làm tên MC consistently — chỉ dùng tên khác khi đó là supporting character đã được giới thiệu.`,
    };
  }

  return { severity: 'none', message: '' };
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vietnamese webnovel convention: narration uses FULL name (họ + tên — "Lương Hạo"),
 * not just personal name ("Hạo"). Helps reader memorize cast over 1000+ chapters.
 *
 * Detects short-form usage of MC name:
 *   - Counts occurrences of "Lương Hạo" (full) vs standalone "Hạo" (last token alone).
 *   - Flags if standalone last-token usage is ≥30% of total mentions — indicates
 *     Writer drifted to natural Vietnamese pattern instead of webnovel convention.
 *
 * Returns: { severity, message } — feed into Critic as moderate issue.
 *
 * Skips if MC name is single-word (no "họ tên" structure to enforce).
 */
export function detectShortFormCharacterName(
  content: string,
  fullName: string,
): { severity: 'none' | 'minor' | 'moderate'; message: string } {
  const tokens = fullName.trim().split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length < 2) return { severity: 'none', message: '' };

  const lastToken = tokens[tokens.length - 1];

  // Full-name occurrences ("Lương Hạo")
  const fullRe = new RegExp(`\\b${escapeRegex(fullName)}\\b`, 'g');
  const fullCount = (content.match(fullRe) || []).length;

  // Last-token alone occurrences ("Hạo" NOT preceded by another part of the name)
  // Match "Hạo" with word boundary on both sides, but exclude when previous word is part of fullName.
  const precedingTokenLookbehind = tokens.slice(0, -1).map(escapeRegex).join('|');
  const standaloneRe = new RegExp(`(?<!\\b(?:${precedingTokenLookbehind})\\s+)\\b${escapeRegex(lastToken)}\\b`, 'g');
  let standaloneCount = 0;
  try {
    standaloneCount = (content.match(standaloneRe) || []).length;
  } catch {
    // Older Node may not support lookbehind — fallback: subtract fullCount from total "last token" matches.
    const totalLast = (content.match(new RegExp(`\\b${escapeRegex(lastToken)}\\b`, 'g')) || []).length;
    standaloneCount = Math.max(0, totalLast - fullCount);
  }

  const totalMentions = fullCount + standaloneCount;
  if (totalMentions < 10) return { severity: 'none', message: '' };

  const shortRatio = standaloneCount / totalMentions;
  if (shortRatio >= 0.5) {
    return {
      severity: 'moderate',
      message: `Tên "${fullName}" bị cắt ngắn thành "${lastToken}" trong ${standaloneCount}/${totalMentions} lần (${Math.round(shortRatio * 100)}%). Webnovel convention: dùng họ+tên đầy đủ trong narration để reader nhớ tên qua 1000+ chương. Replace "${lastToken}" lone references trong narration bằng "${fullName}" (giữ tên cụt CHỈ trong dialogue thân mật vợ/anh em ruột moment cảm xúc cao).`,
    };
  }
  if (shortRatio >= 0.3) {
    return {
      severity: 'minor',
      message: `Tên "${fullName}" bị cắt ngắn thành "${lastToken}" trong ${standaloneCount}/${totalMentions} lần (${Math.round(shortRatio * 100)}%). Ưu tiên dùng họ+tên đầy đủ trong narration.`,
    };
  }
  return { severity: 'none', message: '' };
}

export function detectSevereRepetition(content: string): CriticIssue[] {
  const text = content.toLowerCase();
  const issues: CriticIssue[] = [];

  type Cat = 'generic' | 'plot_element' | 'structural_connective';
  const tracked: Record<string, { variants: string[]; category: Cat }> = {
    'tím sẫm': { variants: ['tím sẫm', 'tím đen', 'sắc tím'], category: 'generic' },
    'vàng kim': { variants: ['vàng kim', 'ánh vàng kim'], category: 'generic' },
    'đỏ rực': { variants: ['đỏ rực', 'đỏ thẫm'], category: 'generic' },
    'rực rỡ': { variants: ['rực rỡ'], category: 'generic' },
    'kinh hoàng': { variants: ['kinh hoàng', 'kinh hãi', 'kinh ngạc'], category: 'generic' },
    'sững sờ': { variants: ['sững sờ', 'sững người'], category: 'generic' },
    'mờ ảo': { variants: ['mờ ảo', 'mờ nhạt'], category: 'generic' },
    'đặc quánh': { variants: ['đặc quánh'], category: 'generic' },
    'bùng phát': { variants: ['bùng phát', 'bùng nổ'], category: 'generic' },
    'ken két': { variants: ['ken két'], category: 'generic' },
    // 2026-05-12: split structural Vietnamese connectives into their own category.
    // "là một", "bắt đầu", "mang theo" etc. are legitimate prose connectives that
    // recur naturally in any well-written 2800-word chapter. The previous
    // generic threshold (8 = critical) auto-rejected anything that wasn't actively
    // varied — too strict and hits valid Vietnamese narration. New threshold 16/22
    // catches real overuse without false-positive against natural prose.
    'là một': { variants: ['là một'], category: 'structural_connective' },
    'bắt đầu': { variants: ['bắt đầu'], category: 'structural_connective' },
    'mang theo': { variants: ['mang theo'], category: 'structural_connective' },
    'tỏa ra': { variants: ['tỏa ra'], category: 'structural_connective' },
    'đôi mắt': { variants: ['đôi mắt'], category: 'structural_connective' },
    'như thể': { variants: ['như thể'], category: 'structural_connective' },
    'dường như': { variants: ['dường như'], category: 'structural_connective' },
    // Real AI-tell cues — keep strict
    'lạnh lẽo': { variants: ['lạnh lẽo', 'lạnh buốt', 'lạnh lùng'], category: 'generic' },
    'run rẩy': { variants: ['run rẩy', 'run lên', 'run bần bật'], category: 'generic' },
    // Plot element words — naturally recur more often
    'pixel hóa': { variants: ['pixel hóa', 'pixel'], category: 'plot_element' },
    'rỉ sét': { variants: ['rỉ sét'], category: 'plot_element' },
    'linh khí': { variants: ['linh khí'], category: 'plot_element' },
    'đan điền': { variants: ['đan điền'], category: 'plot_element' },
  };

  for (const [groupName, { variants, category }] of Object.entries(tracked)) {
    let total = 0;
    for (const variant of variants) {
      const regex = new RegExp(variant, 'gi');
      const matches = text.match(regex);
      if (matches) total += matches.length;
    }

    const criticalThreshold = category === 'structural_connective' ? 22 : category === 'plot_element' ? 12 : 8;
    const moderateThreshold = category === 'structural_connective' ? 16 : category === 'plot_element' ? 8 : 5;

    if (total >= criticalThreshold) {
      issues.push({
        type: 'quality',
        description: `Lặp từ nghiêm trọng: "${groupName}" xuất hiện ${total} lần (${category === 'plot_element' ? 'plot keyword, ngưỡng cao' : 'generic'}). Thay bằng từ đồng nghĩa hoặc miêu tả gián tiếp.`,
        severity: 'critical',
      });
    } else if (total >= moderateThreshold) {
      issues.push({
        type: 'quality',
        description: `Lặp từ: "${groupName}" xuất hiện ${total} lần. Giảm xuống tối đa ${category === 'plot_element' ? '6' : '3'} lần, dùng từ thay thế.`,
        severity: 'moderate',
      });
    }
  }

  return issues;
}

/**
 * Analyze word repetition in chapter content.
 * Returns a human-readable report for the Critic to use.
 * Tracks colors, adjectives, and common AI-repetitive patterns.
 */
export function buildRepetitionReport(content: string): string {
  const text = content.toLowerCase();

  // Words/phrases to track for repetition
  const tracked: Record<string, string[]> = {
    // Colors
    'tím sẫm': ['tím sẫm', 'tím đen', 'sắc tím'],
    'vàng kim': ['vàng kim', 'ánh vàng kim'],
    'đỏ rực': ['đỏ rực', 'đỏ thẫm', 'đỏ rỉ sét'],
    'bạc trắng': ['bạc trắng', 'trắng bạc', 'bạc lạnh'],
    'đen ngòm': ['đen ngòm', 'đen kịt', 'đen tuyền'],
    // Adjectives
    'rực rỡ': ['rực rỡ'],
    'mờ ảo': ['mờ ảo', 'mờ nhạt'],
    'đặc quánh': ['đặc quánh'],
    'chập chờn': ['chập chờn'],
    // Emotions
    'kinh hoàng': ['kinh hoàng', 'kinh hãi', 'kinh ngạc'],
    'sững sờ': ['sững sờ', 'sững người'],
    // Sounds
    'ken két': ['ken két'],
    'rít lên': ['rít lên', 'rít'],
    // States
    'pixel hóa': ['pixel hóa', 'pixel'],
    'rỉ sét': ['rỉ sét'],
    'tan rã': ['tan rã', 'phân rã'],
    'bùng phát': ['bùng phát', 'bùng nổ'],
    'run rẩy': ['run rẩy', 'run lên', 'run bần bật'],
    // AI structural patterns — sentence constructions AI overuses
    'là một': ['là một'],
    'bắt đầu': ['bắt đầu'],
    'mang theo': ['mang theo'],
    'lạnh lẽo': ['lạnh lẽo', 'lạnh buốt', 'lạnh lùng'],
    'tỏa ra': ['tỏa ra'],
    'đôi mắt': ['đôi mắt'],
    'như thể': ['như thể'],
    'dường như': ['dường như'],
  };

  const counts: Array<{ group: string; count: number; variants: string }> = [];

  for (const [groupName, variants] of Object.entries(tracked)) {
    let total = 0;
    const found: string[] = [];
    for (const variant of variants) {
      const regex = new RegExp(variant, 'gi');
      const matches = text.match(regex);
      if (matches) {
        total += matches.length;
        found.push(`${variant}(${matches.length})`);
      }
    }
    if (total >= 3) {
      counts.push({ group: groupName, count: total, variants: found.join(', ') });
    }
  }

  if (counts.length === 0) {
    return 'Không phát hiện lặp từ nghiêm trọng.';
  }

  counts.sort((a, b) => b.count - a.count);
  const lines = counts.map(c => {
    const severity = c.count >= 8 ? '🔴 CRITICAL' : c.count >= 5 ? '🟡 MAJOR' : '⚪ MINOR';
    return `${severity}: "${c.group}" xuất hiện ${c.count} lần [${c.variants}]`;
  });

  return lines.join('\n');
}

export function generateMinimalScenes(count: number, wordsPerScene: number, defaultPOV: string): SceneOutline[] {
  return Array.from({ length: count }, (_, i) => ({
    order: i + 1,
    setting: '',
    characters: [],
    goal: `Scene ${i + 1}`,
    conflict: '',
    resolution: '',
    estimatedWords: wordsPerScene,
    pov: defaultPOV,
  }));
}

export async function loadConstraintSection(projectId: string, context: string, protagonistName: string): Promise<string> {
  try {
    const keywords: string[] = [protagonistName];

    // Extract potential character/location names from context
    const nameMatches = context.match(/[A-Z][a-zÀ-ỹ]+(?:\s+[A-Z][a-zÀ-ỹ]+)*/g) || [];
    for (const name of nameMatches.slice(0, 10)) {
      if (name.length > 2 && !keywords.includes(name)) {
        keywords.push(name);
      }
    }

    const extractor = getConstraintExtractor();
    const constraints = await extractor.getRelevantConstraints(projectId, keywords);

    if (constraints.length === 0) return '';

    const hard = constraints.filter(c => c.immutable);
    const soft = constraints.filter(c => !c.immutable);

    const parts: string[] = [];
    if (hard.length > 0) {
      parts.push('## RÀNG BUỘC CỨNG (TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM):');
      for (const c of hard) parts.push(`- ${c.context}`);
    }
    if (soft.length > 0) {
      parts.push('## TRẠNG THÁI HIỆN TẠI (có thể thay đổi nếu có lý do):');
      for (const c of soft) parts.push(`- ${c.context}`);
    }

    return '\n' + parts.join('\n') + '\n';
  } catch {
    return '';
  }
}

/**
 * Detect template chapter-ending ("ego declaration") + template static opening
 * in finished chapter content. Returns a non-empty reason string when caught,
 * empty string when content passes.
 *
 * Why: even with Architect rules + Critic gates, Gemini Flash Lite slides
 * back to the dominant TQ webnovel template ("X mới thật sự bắt đầu" +
 * "MC đứng bất động + quan sát + suy ngẫm") because training data is
 * saturated with this pattern. Deterministic post-write detection forces
 * a rewrite before content reaches the publish step.
 *
 * Implementation lives in context/generators.ts (regex shared with summary
 * sanitizer to keep template definitions in one place).
 */
export function detectChapterTemplatePatterns(content: string): string {
  if (!content || content.length < 200) return '';

  // Lazy require to avoid cycle with context/generators.ts at module load.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isTemplateCliffhanger, isTemplateOpening } = require('../context/generators') as {
    isTemplateCliffhanger: (s: string) => boolean;
    isTemplateOpening: (s: string) => boolean;
  };

  const reasons: string[] = [];

  // Check ending: last 500 chars contain ego declaration?
  const tail = content.slice(-500);
  // Split into last sentences, check each — match if ANY of the last 3 sentences fires.
  const tailSentences = (tail.match(/[^.!?。！？\n]+[.!?。！？]/g) || []).map(s => s.trim()).filter(Boolean);
  const lastThree = tailSentences.slice(-3);
  for (const s of lastThree) {
    if (isTemplateCliffhanger(s)) {
      reasons.push(`Ending câu "${s.slice(0, 80)}..." match template "ego declaration" (ván cờ / cuộc chiến / kỷ nguyên / cái tên / bản hùng ca / sẵn sàng cho ... mới thật sự / chính thức / chuẩn bị bắt đầu).`);
      break;
    }
  }

  // Check opening: first 500 chars match static template (setting + MC + static verb)?
  if (isTemplateOpening(content)) {
    reasons.push('Opening 100-150 từ đầu match template TĨNH: [Ánh sáng/không khí/đồng hồ/phòng tả thiết lập] + [MC] ngồi/đứng/tựa bất động/lặng + quan sát/suy ngẫm. Opening PHẢI ACTIVE — MC đang làm action cụ thể (đi/gọi/mở/ra lệnh/viết).');
  }

  return reasons.join(' | ');
}

/**
 * Deterministic content surgery for template chapter-ending + static opening.
 *
 * Phase Q 2026-05-13: PR #67 added detection + retry but Gemini Flash Lite's
 * template attractor is too strong — Writer reproduces same pattern across
 * 3 retries 92% of the time. This function applies surgical repair AFTER
 * Writer succeeds (regardless of retry count) so template patterns never
 * reach the published chapter.
 *
 * Strategy:
 *  1. ENDING REPAIR — strip last N consecutive sentences that match template
 *     ego-declaration pattern. Chapter ends 1-3 sentences earlier with the
 *     concrete event that came before the templated coda.
 *  2. OPENING REPAIR — if first paragraph matches static template, locate
 *     the first action sentence (MC + concrete verb) within first 1500 chars
 *     and START the chapter from there. Discards leading establishing shots
 *     + static reflection.
 *
 * Returns { content, endingRepaired, openingRepaired, lostChars }.
 */
export function repairChapterTemplatePatterns(content: string): {
  content: string;
  endingRepaired: boolean;
  openingRepaired: boolean;
  lostChars: number;
} {
  if (!content) return { content, endingRepaired: false, openingRepaired: false, lostChars: 0 };

  // Lazy require to avoid module cycle.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const gen = require('../context/generators') as {
    isTemplateCliffhanger: (s: string) => boolean;
    isTemplateOpening: (s: string) => boolean;
  };

  const original = content;
  let repaired = content;
  let endingRepaired = false;
  let openingRepaired = false;

  // ─── ENDING REPAIR ───────────────────────────────────────────────────────
  // Strip template sentences ANYWHERE in last 2000 chars (template may be
  // sandwich-buried — concrete sentence → template → concrete sentence as
  // wrap). User perceives buried template same as trailing template. Scan
  // all tail sentences, remove matches, rejoin keeping originals.
  const tailWindow = 2000;
  const preTail = repaired.length > tailWindow ? repaired.slice(0, repaired.length - tailWindow) : '';
  const tail = repaired.slice(-Math.min(tailWindow, repaired.length));
  const tailMatches = tail.match(/[^.!?。！？\n]+[.!?。！？]/g) || [];
  if (tailMatches.length > 0) {
    const wrapperGestureRe = /^[^.!?\n]{0,80}(?:hắn|y|cô|nàng|anh|chàng|gã|ta|[A-ZÀ-Ỵ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỵ][a-zà-ỹ]+){1,3})\s+(?:siết|nhếch|nắm|nghiến|cười\s+nhẹ|nhìn\s+(?:xa|về)|hít\s+(?:một\s+)?hơi|đặt\s+tay|gật\s+đầu)\s*[^.!?\n]{0,60}[.!?]?\s*$/i;

    const keptIndices: number[] = [];
    const stripIndices = new Set<number>();
    for (let i = 0; i < tailMatches.length; i++) {
      const s = tailMatches[i].trim();
      if (gen.isTemplateCliffhanger(s)) { stripIndices.add(i); continue; }
      // Strip wrapper-gesture sentence if NEXT sentence is template (preamble).
      const next = tailMatches[i + 1]?.trim() || '';
      if (next && gen.isTemplateCliffhanger(next) && wrapperGestureRe.test(s)) {
        stripIndices.add(i);
        continue;
      }
      keptIndices.push(i);
    }
    if (stripIndices.size > 0) {
      const newTail = keptIndices.map(i => tailMatches[i].trim()).join(' ').trim();
      repaired = (preTail + (preTail ? ' ' : '') + newTail).trimEnd();
      endingRepaired = true;
    }
  }

  // ─── OPENING REPAIR ──────────────────────────────────────────────────────
  // If first 500 chars match static template, locate the first sentence in
  // the first 2000 chars that contains MC + concrete action verb, and
  // restart the chapter from that sentence. The lost lead-in is purely
  // establishing scene description + MC static reflection — narrative loses
  // nothing by skipping it.
  if (gen.isTemplateOpening(repaired)) {
    const head = repaired.slice(0, 2000);
    const headMatches = head.match(/[^.!?。！？\n]+[.!?。！？]/g) || [];
    const headSents = headMatches.map(s => s.trim()).filter(Boolean);

    const concreteActionRe = /[A-ZÀ-Ỵ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỵ][a-zà-ỹ]+){0,3}\s+(?:đẩy|mở|đóng|kéo|gõ|bấm|nhấn|ký|viết|đưa|nhận|trao|móc|rút|bắn|đâm|nhảy|chạy|bước|đi\s+(?:tới|đến|vào|ra)|nói|hỏi|đáp|gọi|kêu|hét|gào|ra\s+lệnh|tuyên\s+bố|ném|đập|cầm|nắm|chỉ\s+vào|chìa|với\s+tay|đưa\s+tay|hạ\s+(?:xuống|tay)|thì\s+thầm|móc\s+ra|rút\s+ra|đặt\s+xuống|tỉnh\s+lại|ngẩng\s+lên|cúi\s+xuống|quỳ\s+xuống|nhảy\s+lên|lao\s+(?:tới|về)|tắt|bật|chộp|lướt|siết|tóm|kẹp|chạm|đặt|chỉ|hướng|thả|lùi|tiến|đáp|ra\s+hiệu|gật|lắc|xoay|quay|liếc|nhìn\s+thẳng|gạt|đè|đếm|ngừng|dừng|trao|kéo\s+ra|kéo\s+đến|kéo\s+về|chuyển)/i;

    // Find first sentence with concrete action, skip the first 1-2 establishing
    // sentences (those are the template). Keep at least sentence 3+ for safety.
    let restartIdx = -1;
    for (let i = 0; i < headSents.length; i++) {
      const s = headSents[i];
      // Skip pure scene-setting (no MC verb)
      if (!concreteActionRe.test(s)) continue;
      // Skip if this concrete action is itself static like "ngồi"/"đứng"
      if (/\s(?:ngồi|đứng|nằm|tựa)(?:\s+(?:bất\s+động|im\s+lặng|lặng|trầm))/i.test(s)) continue;
      restartIdx = i;
      break;
    }

    // Only repair if we found a concrete action AT LEAST 1 sentence in (so we
    // skip the templated lead-in) and not so deep that we lose plot content.
    if (restartIdx >= 1 && restartIdx <= 4) {
      const restartSentence = headSents[restartIdx];
      const idx = repaired.indexOf(restartSentence);
      if (idx > 50 && idx < 1800) {
        repaired = repaired.slice(idx).trimStart();
        openingRepaired = true;
      }
    }
  }

  return {
    content: repaired,
    endingRepaired,
    openingRepaired,
    lostChars: original.length - repaired.length,
  };
}
