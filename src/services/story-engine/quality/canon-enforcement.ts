/**
 * Story Engine v2 — Canon Enforcement (Phase 28 TIER 1, extended Phase 30).
 *
 * Centralizes all DETERMINISTIC post-Critic gates that verify chapter content
 * against canon/state. Phase 27 added 11 canon/state context blocks for the
 * Architect to read, but Critic only enforced ~3. This module closes that gap.
 *
 * Gates run AFTER Critic AI returns. Each gate appends issues to the parsed
 * critic output. Critical/major issues automatically force requiresRewrite=true.
 *
 * Design: deterministic only (no AI calls — fast, free). Uses existing canon/
 * state queries + regex/substring matching. AI judgment is delegated to the
 * Critic prompt rules updated in chapter-writer.ts runCritic.
 *
 * Gates included:
 *   1. Cast roster — invented characters not in roster
 *   2. Timeline violations — time reversal / age regression
 *   3. POV consistency — wrong-viewpoint thoughts in 3rd-limited
 *   4. Voice drift — fingerprint deviation from ch.1-3 anchor
 *   5. Sensory floor — sensory balance score
 *   6. Hook floor — opening/closing hook strength
 *
 * Phase 30 — 3 new gates pre-empting the 3 user-reported reader-killing patterns:
 *   7. Antagonist scale — major villain marker before ch.30 not in master_outline
 *   8. MC profitability — MC chõ mồm vô lợi (intervene without 5-profit benefit)
 *   9. System cadence — golden finger silent ≥10 chương / power scaling stall
 *
 * Items, themes, factions, plot twists, worldbuilding/power-system common
 * violations are handled in Critic AI prompt rules (added separately) —
 * they need semantic judgment that regex can't reliably do.
 */

import { getSupabase } from '../utils/supabase';
import { detectTimelineViolations } from '../state/timeline';
import { checkPovConsistency } from './pov-check';
import { analyzeSensoryBalance } from './sensory-balance';
import { evaluateHooks } from './hook-strength';
import { causalIssuesToCriticIssues, checkCausalLogicFast } from './causal-logic-check';
import { genreContractIssuesToCriticIssues, validateGenreChapterContract } from './genre-contract-validator';
import type { CriticIssue } from '../types';
import type { GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanonEnforcementInput {
  projectId: string;
  chapterNumber: number;
  content: string;
  protagonistName: string;
  /** Primary genre enables typed genre-contract gates. */
  genre?: GenreType;
  /** Cast names allowed to appear (from Architect outline + recent activity). */
  expectedCharacters: string[];
  /** Optional POV setting from project (vd '1st' / '3rd-limited' / '3rd-omniscient'). */
  expectedPov?: '1st' | '3rd-limited' | '3rd-omniscient';
  /**
   * Phase 30 G7 — antagonist scale gate. master_outline.antagonist_schedule
   * lists pre-planned antagonist tier appearances. If chapter introduces a
   * major-tier marker (sect master, secret org) before ch.30 with no entry
   * in this schedule, gate flags critical.
   */
  antagonistSchedule?: Array<{ ch: number; tier: string }>;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run all deterministic canon gates. Returns issues to be merged into Critic
 * output. Each gate is non-fatal — failure to run one doesn't block others.
 */
export async function enforceCanonGates(
  input: CanonEnforcementInput,
): Promise<CriticIssue[]> {
  const issues: CriticIssue[] = [];
  const promises: Array<Promise<CriticIssue[]>> = [];

  // 1. Cast roster — flag named entities not in expected cast.
  promises.push(checkCastRoster(input).catch(() => []));

  // 2. Timeline violations — time reversal, age regression.
  promises.push(checkTimelineViolations(input).catch(() => []));

  // 3. POV consistency — only if expectedPov provided.
  if (input.expectedPov) {
    promises.push(checkPovGate(input).catch(() => []));
  }

  // 4. Voice drift vs anchor — compare current chapter metrics to ch.1-3.
  promises.push(checkVoiceDrift(input).catch(() => []));

  // 5. Sensory + hook gates — soft (moderate) issues only.
  promises.push(checkSensoryFloor(input).catch(() => []));
  promises.push(checkHookFloor(input).catch(() => []));

  // Phase 30 — 3 new gates for user-reported pain points.
  // 7. Antagonist scale — major villain before ch.30 not in master_outline.
  promises.push(checkAntagonistScale(input).catch(() => []));
  // 8. MC profitability — MC interferes in random affairs without 5-profit benefit.
  promises.push(checkMcProfitability(input).catch(() => []));
  // 9. System cadence — golden finger silent / power scaling stall.
  promises.push(checkSystemCadence(input).catch(() => []));
  // 10. Hard causal logic — authority/access/resource/arc-rail violations.
  promises.push(checkCausalLogicGate(input).catch(() => []));
  // 11. Typed genre contract — root-level genre grammar gates.
  if (input.genre) {
    promises.push(checkGenreContractGate(input).catch(() => []));
  }

  const results = await Promise.all(promises);
  for (const r of results) issues.push(...r);
  return issues;
}

async function checkGenreContractGate(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  if (!input.genre) return [];
  const issues = validateGenreChapterContract({
    genre: input.genre,
    chapterNumber: input.chapterNumber,
    content: input.content,
  });
  return genreContractIssuesToCriticIssues(issues);
}

async function checkCausalLogicGate(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const issues = await checkCausalLogicFast(input.projectId, input.chapterNumber, input.content, {
    protagonistName: input.protagonistName,
  });
  return causalIssuesToCriticIssues(issues);
}

// ── Gate 1: Cast roster ──────────────────────────────────────────────────────

/**
 * Detect named characters in chapter content that are NOT in the expected
 * cast roster. If chapter introduces 5+ new named characters in 1 chapter,
 * flag (likely AI inventing characters that drift from canon cast).
 *
 * Heuristic: extract Vietnamese capitalized 2-3-word noun phrases that look
 * like character names; subtract known cast + protagonist; if remainder ≥5,
 * flag major issue.
 */
async function checkCastRoster(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const issues: CriticIssue[] = [];

  // Extract candidate names from content via Vietnamese capitalized noun pattern.
  // Match 2-4 capitalized words (Đào Lệ Băng, Nguyễn Văn A, Lý Phong, ...).
  const NAME_RE = /\b[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:[ \t]+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+){1,3}\b/g;

  const candidates = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = NAME_RE.exec(input.content)) !== null) {
    const name = m[0].trim();
    // Filter out 1-word matches and likely place names / titles.
    if (name.split(/\s+/).length < 2) continue;
    if (NON_NAME_START_WORDS.some(w => name.startsWith(`${w} `))) continue;
    if (PLACE_PREFIXES.some(p => name.startsWith(p))) continue;
    if (TITLE_WORDS.some(t => name.includes(t))) continue;
    if (isLikelyWorldTermCandidate(name)) continue;
    candidates.add(name);
  }

  // Also subtract: protagonist + expected characters + recent cast roster.
  const allowed = new Set<string>([input.protagonistName, ...input.expectedCharacters]);
  // Pull current roster from character_states for fuller allowlist.
  try {
    const db = getSupabase();
    const { data } = await db
      .from('character_states')
      .select('character_name')
      .eq('project_id', input.projectId)
      .lt('chapter_number', input.chapterNumber);
    if (data) {
      for (const r of data) if (r.character_name) allowed.add(r.character_name);
    }
  } catch {
    // Non-fatal — work with what we have.
  }

  const allowedLower = new Set([...allowed].map(s => s.toLowerCase()));
  const novel = [...candidates].filter(c => !allowedLower.has(c.toLowerCase()));
  const softCastRosterOnly = await shouldTreatCastRosterAsSoft(input.projectId);

  // Drop English-only "names" (e.g. Military Grade, Blue Mountain, System Check,
  // Offline Mode) — Vietnamese fiction often uses uppercased English technical
  // terms or product labels that are NOT characters. (2026-05-12)
  const looksEnglishOnly = (s: string): boolean => /^[A-Za-z][A-Za-z0-9\s'-]+$/.test(s);
  const filteredNovel = novel.filter(n => !looksEnglishOnly(n));

  // Tolerance: ≥5 new named entities = sus; ≥10 = major.
  // Chapter 1 naturally introduces institutions, places, skill names and cast,
  // so keep this as a soft warning unless the extraction goes wildly off-track.
  if (input.chapterNumber > 1 && filteredNovel.length >= 10 && !softCastRosterOnly) {
    issues.push({
      type: 'continuity',
      severity: 'major',
      description: `${filteredNovel.length} tên nhân vật MỚI xuất hiện trong chương này không có trong cast roster: ${filteredNovel.slice(0, 8).join(', ')}. Có thể AI đang invent characters drift khỏi canon. Verify: chỉ giữ characters đã establish + characters MỚI có narrative reason.`,
    });
  } else if (filteredNovel.length >= 5) {
    issues.push({
      type: 'quality',
      severity: 'moderate',
      description: `${filteredNovel.length} tên có thể là nhân vật mới (chưa từng appear): ${filteredNovel.slice(0, 5).join(', ')}. Verify cần thiết hay drift.`,
    });
  }

  return issues;
}

export function shouldSoftCastRosterForFocusKey(focusKey?: string | null): boolean {
  return focusKey === 'thien-dao-thu-vien' || focusKey === 'sang-the-than-minh';
}

async function shouldTreatCastRosterAsSoft(projectId: string): Promise<boolean> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('ai_story_projects')
      .select('style_directives')
      .eq('id', projectId)
      .maybeSingle();
    const styleDirectives = data?.style_directives as { focus_key?: string | null } | null | undefined;
    return shouldSoftCastRosterForFocusKey(styleDirectives?.focus_key);
  } catch {
    return false;
  }
}

const PLACE_PREFIXES = [
  'Đại Lục', 'Sơn', 'Thành', 'Quận', 'Phường', 'Xã', 'Phố',
  'Đường', 'Hồ', 'Sông', 'Núi', 'Đảo', 'Tầng', 'Hang', 'Động',
  'Học Viện', 'Liên Minh', 'Lớp',
  'Đông', 'Tây', 'Nam', 'Bắc', 'Trung', 'Hà Nội', 'Sài Gòn', 'TP',
  // Modern + apocalypse settings (mat-the/do-thi):
  'Royal', 'Times', 'Vincom', 'KĐT', 'Khu', 'Trại', 'Sảnh', 'Hầm', 'Bệnh Viện',
  'Sân Bay', 'Cảng', 'Nhà Máy', 'Kho', 'Trạm', 'Quảng Trường', 'Hệ Phái', 'Bộ Tư',
  // Countries / regions:
  'Phù Tang', 'Tây Âu', 'Đông Á', 'Đại Hàn', 'Hoa Kỳ', 'Trung Quốc', 'Nhật Bản',
  // Plans / concepts (capitalised noun phrases that are NOT characters):
  'Kế Hoạch', 'Chiến Dịch', 'Phương Án', 'Dự Án', 'Phiên Bản', 'Mã Hiệu',
  'Hầm Trú', 'Hầm Trú Ẩn', 'Apocalypse',
];
const NON_NAME_START_WORDS = [
  'Nhưng', 'Và', 'Còn', 'Khi', 'Nếu', 'Vì', 'Do', 'Từ', 'Trong', 'Ngoài',
  'Trên', 'Dưới', 'Việc', 'Một', 'Mỗi', 'Các', 'Có', 'Không',
  'Giọng', 'Mặt', 'Ánh', 'Bóng', 'Tiếng', 'Hơi',
  // 2026-05-12: Vietnamese verbs/quantifiers often capitalised at sentence start —
  // they prefix a real proper noun (Thấy Lương Hạo = "Saw Lương Hạo") and got
  // miscounted as a 2-word character name. Strip the leading capitalised verb so
  // the inner name re-extracts cleanly elsewhere.
  'Thấy', 'Nhìn', 'Nghe', 'Gặp', 'Hỏi', 'Đáp', 'Gọi', 'Nói', 'Trông', 'Chạy',
  'Đi', 'Đến', 'Tới', 'Bước', 'Ngồi', 'Đứng', 'Lại', 'Quay', 'Theo', 'Cùng',
  'Nhân Vật', 'Bạn', 'Người',
  // Familial/honorific prefixes — speaker addressing established character:
  'Cậu', 'Chú', 'Bác', 'Anh', 'Chị', 'Em', 'Cô', 'Ông', 'Bà',
  'Cha', 'Mẹ', 'Bố',
];
const TITLE_WORDS = [
  'Sư Phụ', 'Đại Sư', 'Tổ Sư', 'Trưởng Lão', 'Trưởng Tộc', 'Gia Chủ', 'Chủ Tịch',
  'Tổng Giám Đốc', 'Bộ Trưởng', 'Thị Trưởng', 'Sở Trưởng',
  // Modern brand / corp suffixes — phrase like "Yusen Logistics" / "Ford Ranger"
  // is product/company, never a character. Match by inclusion.
  'Logistics', 'Ranger', 'Submariner', 'Hermle', 'Hermès', 'Rolex',
  'Inc', 'Ltd', 'Corp', 'Group', 'Vinmart', 'Apple', 'Samsung',
  'Đảo Quốc', 'Liên Minh', 'Vương Quốc', 'Đế Quốc', 'Cộng Hòa',
];
const WORLD_TERM_WORDS = [
  'Thần Vực', 'Vạn Tượng', 'Biên Niên', 'Khởi Nguyên', 'Ký Ức',
  'Thiên Đạo Thư Viện', 'Thiên Đạo', 'Thư Viện', 'Vạn Văn', 'Trái Đất',
  'Đại Diễn', 'Diễn Giới', 'Tác Gia', 'Bạch Bút', 'Thanh Bút', 'Kim Bút',
  'Văn Thánh', 'Thiên Đạo Tác Gia', 'Bảng Tân Tác Gia', 'Sơn Hà Xạ Nhật',
  'Mưu Dưới Ánh Trăng', 'Phục Ma Thập Bát Chưởng', 'Phục Ma Thập', 'Bát Chưởng',
  'Loạn Thế Mưu Vương', 'Cửu Thiên Hỏa Chủng', 'Huyết Án Bạch Ngọc Lâu',
  'Hoang Mạc', 'Khai Sơn', 'Thập Nhị', 'Phá Vân Chưởng',
  'Anh Hùng Xạ Điêu', 'Quách Tĩnh', 'Thất Quái', 'Võ Lâm', 'Võ Lâm Xạ Điêu',
  'Tam Quốc', 'Cửu Âm Chân Kinh', 'Huyền Âm Chân Giải', 'Thượng Hải', 'Hy Lạp',
  'Lưới Sương', 'Bẫy Sương', 'Mạch Sương', 'Hạt Bụi', 'Mộc Linh',
  'Thanh Nha', 'Hốc Tro', 'Long Tích', 'Kiến Đá', 'Thiết Sa',
  'Đất Sống', 'Vạt Rêu', 'Rêu Thử', 'Hồ Mặn', 'Kết Tinh Sương',
  'Sa Tinh', 'Mảnh Đất', 'Phù Sa', 'Hỏa Văn', 'Luyện Hỏa',
  'Tường Đá', 'Bẫy Hắc', 'Hỏa Lô', 'Khiên Hợp Kim',
  'Tinh Thể Băng', 'Lõi Pháp Tắc', 'Pháp Tắc Băng', 'Thiên Đình',
  'Băng Nguyên', 'Sơ Thủy', 'Xương Thú Băng',
];
const WORLD_MARKER_WORDS = new Set([
  'Thần', 'Vực', 'Tượng', 'Ký', 'Ức', 'Biên', 'Niên', 'Sương', 'Mạch',
  'Luật', 'Tín', 'Ngưỡng', 'Loài', 'Chủng', 'Sinh', 'Thái', 'Hang',
  'Động', 'Đất', 'Phù', 'Sa', 'Tinh', 'Tính', 'Hỏa', 'Văn', 'Luyện',
  'Linh', 'Long', 'Rêu', 'Hồ', 'Mặn', 'Cấp', 'Mầm', 'Hạt', 'Đá',
  'Kiên', 'Bẫy', 'Hắc', 'Diện', 'Lô', 'Cộng', 'Đồng', 'Khiên',
  'Hợp', 'Kim', 'Bán', 'Thể', 'Băng', 'Lõi', 'Pháp', 'Tắc',
  'Thiên', 'Đình', 'Nguyên', 'Sơ', 'Thủy', 'Xương', 'Thú',
  'Thư', 'Viện', 'Vạn', 'Đạo', 'Trái', 'Đất', 'Đại', 'Diễn', 'Giới',
  'Tác', 'Gia', 'Bạch', 'Bút', 'Thanh', 'Kim', 'Văn', 'Thánh',
  'Bảng', 'Tân', 'Sơn', 'Hà', 'Xạ', 'Nhật', 'Hoang', 'Mạc',
  'Khai', 'Thập', 'Nhị', 'Phá', 'Vân', 'Chưởng',
]);

export function isLikelyWorldTermCandidate(name: string): boolean {
  if (WORLD_TERM_WORDS.some(t => name.includes(t))) return true;
  const words = name.split(/\s+/);
  const markerHits = words.filter((word) => WORLD_MARKER_WORDS.has(word)).length;
  return markerHits >= 2;
}

// ── Gate 2: Timeline violations ──────────────────────────────────────────────

async function checkTimelineViolations(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const violations = await detectTimelineViolations(input.projectId, input.chapterNumber);
  return violations.map(desc => ({
    type: 'continuity' as const,
    severity: 'major' as const,
    description: desc,
  }));
}

// ── Gate 3: POV consistency ──────────────────────────────────────────────────

async function checkPovGate(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  if (!input.expectedPov) return [];
  const violations = checkPovConsistency(input.content, {
    expectedPov: input.expectedPov,
    protagonistName: input.protagonistName,
    allowedPovCharacters: input.expectedCharacters.slice(0, 5),
  });
  return violations.map(v => ({
    type: 'quality' as const,
    severity: v.severity === 'major' ? 'major' as const : v.severity === 'moderate' ? 'moderate' as const : 'minor' as const,
    description: `POV violation [${v.type}]: ${v.description}`,
  }));
}

// ── Gate 4: Voice drift vs anchor ────────────────────────────────────────────

/**
 * Compare current chapter's voice metrics to the ch.1-3 anchor metrics.
 * If drift exceeds threshold, flag.
 */
async function checkVoiceDrift(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  if (input.chapterNumber < 50) return []; // Need enough writing to expect drift.
  if (input.chapterNumber % 50 !== 0 && input.chapterNumber < 500) return []; // Cadence.

  try {
    const db = getSupabase();
    const { data: anchors } = await db
      .from('voice_anchors')
      .select('snippet_type,voice_metrics')
      .eq('project_id', input.projectId)
      .in('snippet_type', ['opening', 'narration']);

    if (!anchors?.length) return [];

    // Compute current chapter metrics from the same text.
    const currentMetrics = computeMetrics(input.content);

    // Compare to anchor average.
    const anchorMetrics = anchors
      .map(a => a.voice_metrics as { avgSentenceLength?: number; dialogueRatio?: number; emDashCount?: number; exclamationRatio?: number } | null)
      .filter(Boolean);
    if (anchorMetrics.length === 0) return [];

    const anchorAvg = {
      avgSentenceLength: avg(anchorMetrics.map(m => m!.avgSentenceLength || 0)),
      dialogueRatio: avg(anchorMetrics.map(m => m!.dialogueRatio || 0)),
      exclamationRatio: avg(anchorMetrics.map(m => m!.exclamationRatio || 0)),
    };

    const issues: CriticIssue[] = [];
    const sentenceDrift = Math.abs(currentMetrics.avgSentenceLength - anchorAvg.avgSentenceLength) / Math.max(1, anchorAvg.avgSentenceLength);
    const dialogueDrift = Math.abs(currentMetrics.dialogueRatio - anchorAvg.dialogueRatio);
    const exclamationDrift = Math.abs(currentMetrics.exclamationRatio - anchorAvg.exclamationRatio);

    if (sentenceDrift > 0.5) {
      issues.push({
        type: 'quality',
        severity: 'major',
        description: `Voice drift major: avg sentence length ${currentMetrics.avgSentenceLength.toFixed(0)} vs ch.1-3 anchor ${anchorAvg.avgSentenceLength.toFixed(0)} (${(sentenceDrift * 100).toFixed(0)}% deviation). Re-read voice anchor + restore cadence.`,
      });
    } else if (sentenceDrift > 0.3) {
      issues.push({
        type: 'quality',
        severity: 'moderate',
        description: `Voice drift: sentence length ${currentMetrics.avgSentenceLength.toFixed(0)} vs anchor ${anchorAvg.avgSentenceLength.toFixed(0)} (${(sentenceDrift * 100).toFixed(0)}% deviation).`,
      });
    }

    if (dialogueDrift > 0.3) {
      issues.push({
        type: 'dialogue',
        severity: 'moderate',
        description: `Dialogue ratio drift: ${(currentMetrics.dialogueRatio * 100).toFixed(0)}% vs anchor ${(anchorAvg.dialogueRatio * 100).toFixed(0)}%. Possible style shift.`,
      });
    }

    if (exclamationDrift > 0.2) {
      issues.push({
        type: 'quality',
        severity: 'minor',
        description: `Punctuation drift: exclamation ratio ${(currentMetrics.exclamationRatio * 100).toFixed(0)}% vs anchor ${(anchorAvg.exclamationRatio * 100).toFixed(0)}%.`,
      });
    }

    return issues;
  } catch {
    return [];
  }
}

function computeMetrics(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const exclamations = (text.match(/!/g) || []).length;
  const dialogueParagraphs = paragraphs.filter(p => p.includes('—')).length;
  return {
    avgSentenceLength: sentences.length > 0 ? text.length / sentences.length : 0,
    dialogueRatio: paragraphs.length > 0 ? dialogueParagraphs / paragraphs.length : 0,
    exclamationRatio: sentences.length > 0 ? exclamations / sentences.length : 0,
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Gate 5: Sensory floor ────────────────────────────────────────────────────

/**
 * Soft gate: if sensory balance score ≤3, flag moderate. Below 2 = major.
 */
async function checkSensoryFloor(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const report = analyzeSensoryBalance(input.content);
  if (report.balanceScore <= 2) {
    return [{
      type: 'quality',
      severity: 'major',
      description: `Sensory balance ${report.balanceScore}/10 — chương quá flat (chỉ ${report.flatSenses.length === 5 ? 'có 1 giác quan' : `thiếu ${report.flatSenses.join(', ')}`}). Thêm sensory details cho immersion.`,
    }];
  }
  if (report.balanceScore <= 4 && input.content.length >= 5000) {
    return [{
      type: 'quality',
      severity: 'moderate',
      description: `Sensory balance ${report.balanceScore}/10 — thiếu giác quan: ${report.flatSenses.join(', ')}.`,
    }];
  }
  return [];
}

// ── Gate 6: Hook floor ───────────────────────────────────────────────────────

// ── Gate 7: Antagonist scale (Phase 30) ──────────────────────────────────────

/**
 * Pre-empt "kẻ thần bí" / major villain appearing in early chapters knowing
 * MC's secrets. Architect rule C1 forbids major-tier antagonists before ch.30
 * unless master_outline.antagonist_schedule lists them.
 *
 * Implementation: regex scan content for major-tier markers. If chapter < 30
 * and any marker hits, check schedule. If no schedule entry covers this
 * chapter, fire critical.
 */
const MAJOR_VILLAIN_MARKERS = [
  // Cultivation/wuxia hierarchy
  /\b(đại\s+tông\s+chủ|tông\s+môn\s+chủ|môn\s+chủ\s+thượng\s+vị)\b/i,
  /\b(thái\s+thượng\s+trưởng\s+lão|trưởng\s+lão\s+tối\s+cao|cố\s+vấn\s+tối\s+cao)\b/i,
  /\b(thiên\s+đạo\s+kim\s+bảng|thiên\s+ý\s+kim\s+bảng)\b/i,
  /\b(ma\s+giáo\s+giáo\s+chủ|tà\s+giáo\s+chủ|thái\s+thượng\s+ma\s+tôn)\b/i,
  // Modern hidden orgs
  /\b(tổ\s+chức\s+bí\s+mật\s+(toàn\s+cầu|xuyên\s+thiên|toàn\s+thế\s+giới))\b/i,
  /\b(tập\s+đoàn\s+xuyên\s+thiên|tập\s+đoàn\s+đa\s+quốc\s+gia\s+bí\s+ẩn)\b/i,
  /\b(hội\s+kín\s+(toàn\s+cầu|quốc\s+tế|huyền\s+bí))\b/i,
  /\b(cơ\s+quan\s+tình\s+báo\s+(siêu\s+nhiên|huyền\s+bí|bí\s+mật))\b/i,
  // Mystery-knower pattern (the canonical "kẻ thần bí biết bí mật MC")
  /\b(kẻ\s+(thần\s+bí|bí\s+ẩn|lạ\s+mặt))\s+(biết|đã\s+biết|hiểu\s+rõ|nắm\s+rõ)\s+(bí\s+mật|thân\s+phận|trọng\s+sinh|hệ\s+thống)/i,
];

async function checkAntagonistScale(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  // Only enforce in early chapters — ladder allows major after ch.30.
  if (input.chapterNumber >= 30) return [];

  const matches: string[] = [];
  for (const re of MAJOR_VILLAIN_MARKERS) {
    const m = input.content.match(re);
    if (m) matches.push(m[0]);
  }
  if (matches.length === 0) return [];

  // Check if master_outline.antagonist_schedule allows it.
  const schedule = input.antagonistSchedule || [];
  const allowedTiers = new Set(['major', 'world', 'region', 'cosmic']);
  const matchingEntry = schedule.find(s =>
    s.ch <= input.chapterNumber && allowedTiers.has(s.tier?.toLowerCase()),
  );
  if (matchingEntry) return [];

  // Not allowed by schedule — fire critical.
  return [{
    type: 'pacing',
    severity: 'critical',
    description: `Major villain marker xuất hiện tại ch.${input.chapterNumber} không có trong master_outline.antagonist_schedule (Axis C1 — antagonist phải leo dần peer→faction→region→world). Markers detected: ${matches.slice(0, 3).join(' | ')}. Phase 1 (ch.1-15) chỉ peer-level; Phase 2 (ch.15-50) faction-level. Major villain trước ch.30 cần master_outline justify.`,
    suggestion: 'Hạ scale antagonist xuống peer-level (đệ tử cùng tông / customer khó tính / peer competitor) hoặc remove khỏi chương này.',
  }];
}

// ── Gate 8: MC profitability (Phase 30) ──────────────────────────────────────

/**
 * Pre-empt "MC chõ mồm vô lợi" — MC bênh vực/cứu/dạy NPC mà không có 1 trong
 * 5 lợi ích (resource/network/info/setup'd-payoff/family). Heuristic regex:
 * detect altruistic action verbs paired with unknown NPCs (not in cast roster).
 *
 * Implementation: count altruistic-verb sentences where the target appears to
 * be a stranger (no proper name OR proper name not in expectedCharacters/cast).
 * Threshold: ≥2 instances per chapter = moderate, ≥3 = major.
 */
const MC_NOSY_VERB_PATTERNS = [
  // MC actively intervenes in stranger's affairs
  /(?:bênh\s+vực|đứng\s+ra\s+bênh|ra\s+tay\s+cứu|cứu\s+giúp|giúp\s+đỡ|chỉ\s+dẫn|dạy\s+bảo|khuyên\s+nhủ|chỉ\s+điểm)\s+(?:cho\s+)?(?:một|gã|tên|cô|bà|ông|đứa|người|vị|kẻ)\s+(?:lạ|qua\s+đường|nghèo|ăn\s+xin|ăn\s+mày|tủi\s+thân|đáng\s+thương|tội\s+nghiệp)/i,
  // MC lectures/preaches to random NPCs
  /(?:thuyết\s+giảng|giảng\s+đạo|răn\s+dạy|lên\s+lớp|chỉ\s+giáo)\s+(?:cho\s+)?(?:một|gã|tên|đám|bọn|người|kẻ)\s+(?:lạ|qua\s+đường|tầm\s+thường|bình\s+thường)/i,
  // MC unprompted helps random with no setup
  /(?:tự\s+nhiên|đột\s+nhiên|bất\s+chợt|tình\s+cờ)\s+.{0,30}\s+(?:bênh\s+vực|cứu\s+giúp|ra\s+tay|chen\s+vào|xen\s+vào|can\s+thiệp)/i,
];

async function checkMcProfitability(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  let hits = 0;
  const samples: string[] = [];
  for (const re of MC_NOSY_VERB_PATTERNS) {
    // Use global flag scan — count all matches.
    const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(input.content)) !== null) {
      hits++;
      if (samples.length < 3) samples.push(m[0].slice(0, 80));
      if (hits >= 6) break; // cap
    }
    if (hits >= 6) break;
  }

  if (hits === 0) return [];

  if (hits >= 3) {
    return [{
      type: 'quality',
      severity: 'major',
      description: `MC chõ mồm vô lợi pattern: ${hits} scenes MC can thiệp giúp người lạ random (Axis B2 violation — MC chỉ can thiệp khi đạt ≥1 trong 5 lợi ích: resource/network/info/setup'd-payoff/family). Samples: ${samples.join(' | ')}.`,
      suggestion: 'Mỗi scene MC can thiệp PHẢI trả lời "MC nhận được gì cụ thể từ (a)-(e)?" — không trả lời được → bỏ scene hoặc chuyển MC sang observer.',
    }];
  }

  if (hits >= 2) {
    return [{
      type: 'quality',
      severity: 'moderate',
      description: `MC chõ mồm pattern detected: ${hits} scene MC can thiệp giúp người lạ. Verify mỗi scene có 1 trong 5 lợi ích (resource/network/info/setup'd-payoff/family). Samples: ${samples.join(' | ')}.`,
    }];
  }

  return [];
}

// ── Gate 9: System cadence (Phase 30) ────────────────────────────────────────

/**
 * Pre-empt "system yếu, MC vẫn vất vả 10+ chương". Architect rule B3 requires
 * golden finger to buff MC visibly every 5-10 chapters. Track power_state
 * deltas over the last 10 chapters via mc_power_states table. If MC's tier /
 * resource / capability didn't improve on ANY axis in the last 10 chapters,
 * fire moderate (or major if regressed).
 *
 * Skip for chapters <10 (not enough history to measure cadence).
 */
async function checkSystemCadence(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  if (input.chapterNumber < 10) return [];

  try {
    const db = getSupabase();
    // Pull MC power state at current and 10-chapters-ago marks.
    const { data: states } = await db
      .from('mc_power_states')
      .select('chapter_number,cultivation_tier,wealth_tier,network_size,skill_count,knowledge_tier,faction_tier')
      .eq('project_id', input.projectId)
      .lte('chapter_number', input.chapterNumber)
      .gte('chapter_number', Math.max(1, input.chapterNumber - 12))
      .order('chapter_number', { ascending: true });

    if (!states || states.length < 2) return []; // Not enough data.

    const baseline = states[0];
    const current = states[states.length - 1];

    // Compare numeric tiers across all axes; check if ANY improved.
    const axes: Array<keyof typeof baseline> = [
      'cultivation_tier', 'wealth_tier', 'network_size',
      'skill_count', 'knowledge_tier', 'faction_tier',
    ];
    let anyImproved = false;
    let anyRegressed = false;
    const deltas: string[] = [];
    for (const axis of axes) {
      const b = Number(baseline[axis] || 0);
      const c = Number(current[axis] || 0);
      if (c > b) {
        anyImproved = true;
        deltas.push(`${axis}: ${b}→${c}`);
      } else if (c < b) {
        anyRegressed = true;
        deltas.push(`${axis}: ${b}→${c} (REGRESSED)`);
      }
    }

    const span = current.chapter_number - baseline.chapter_number;
    if (span < 5) return []; // Need ≥5 chapters span to be meaningful.

    if (anyRegressed) {
      return [{
        type: 'continuity',
        severity: 'major',
        description: `MC power state REGRESSED giữa ch.${baseline.chapter_number} và ch.${current.chapter_number} (${span} chương). Axis B3 violation — power scaling NON-DECREASING. Deltas: ${deltas.join(', ')}.`,
        suggestion: 'Khôi phục power state bị mất hoặc giải thích reasonable trong narrative (vd: tu vi tạm phong ấn vì plot reason ghi rõ trong outline).',
      }];
    }

    if (!anyImproved && span >= 10) {
      return [{
        type: 'pacing',
        severity: 'moderate',
        description: `Power scaling stall — ${span} chương liên tiếp không tier-up bất kỳ axis (cultivation/wealth/network/skill/knowledge/faction). Axis B3 violation — golden finger phải buff MC visible mỗi 5-10 chương. Reader sẽ cảm thấy "system yếu, MC vẫn vất vả".`,
        suggestion: 'Thêm 1 cải tiến đo được trong 1-2 chương tới: tier-up cultivation, skill mới, deal kinh doanh tier mới, network tier-up.',
      }];
    }

    return [];
  } catch {
    return []; // Non-fatal — table missing or query failed.
  }
}

// ── Hook floor (existing) ────────────────────────────────────────────────────

/**
 * Soft gate: opening hook score ≤3 OR closing ≤3 = moderate. Both ≤3 = major.
 */
async function checkHookFloor(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const report = evaluateHooks(input.content);
  const issues: CriticIssue[] = [];

  if (report.openingScore <= 3 && report.closingScore <= 3) {
    issues.push({
      type: 'quality',
      severity: 'major',
      description: `Cả opening (${report.openingScore}/10 ${report.openingType}) lẫn closing (${report.closingScore}/10 ${report.closingType}) đều yếu. Reader rủi ro bỏ chương.`,
    });
  } else {
    if (report.openingScore <= 3) {
      issues.push({
        type: 'quality',
        severity: 'moderate',
        description: `Opening yếu (${report.openingScore}/10 ${report.openingType}) — cần action / mystery / dialogue mạnh hơn.`,
      });
    }
    if (report.closingScore <= 3) {
      issues.push({
        type: 'quality',
        severity: 'moderate',
        description: `Closing yếu (${report.closingScore}/10 ${report.closingType}) — cần cliffhanger / reveal / mystery hook.`,
      });
    }
  }
  return issues;
}
