/**
 * Post-write context generators (Phase 28 TIER 2 — extracted from context/assembler.ts).
 *
 * AI-driven generators called AFTER chapter is written:
 *   - saveChapterSummary / generateChapterSummary: per-chapter summary
 *   - generateSummaryAndCharacters: combined extraction (single AI call)
 *   - generateSynopsis: rolling synopsis update (every 5 chapters)
 *   - generateArcPlan: arc plan generation at boundaries
 *   - generateStoryBible: bible refresh (ch.3, then tiered)
 *
 * Pure refactor — no behavior change. Imports preserved as re-exports from
 * assembler.ts so existing callers (orchestrator, summary-orchestrator,
 * memory modules) keep working.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getArchitectVoiceHint } from '../templates/genre-voice-anchors';
import { getGenreArchitectGuide } from '../templates/genre-process-blueprints';
import { GOLDEN_CHAPTER_REQUIREMENTS, UNIVERSAL_ANTI_SEEDS, SUB_GENRE_RULES } from '../templates';
import { extractMainCharacterNameFromWorld } from '../plan/setup-quality-gate';
import { safeStringTrim } from '../pipeline/chapter-writer-helpers';
import type { ChapterSummary, GenreType, GeminiConfig, StoryKernel } from '../types';

// AI response interfaces (used internally by generators)
interface CombinedAIResponse {
  summary?: unknown;
  openingSentence?: unknown;
  mcState?: unknown;
  cliffhanger?: unknown;
  characters?: Array<{
    character_name: string;
    status: string;
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>;
}

interface SynopsisAIResponse {
  synopsis_text?: string;
  mc_current_state?: string;
  active_allies?: string[];
  active_enemies?: string[];
  open_threads?: string[];
}

interface ArcSubArcEntry {
  sub_arc_number: number;
  start_chapter: number;
  end_chapter: number;
  theme: string;
  mini_payoff: string;
}

interface ArcPlanAIResponse {
  arc_theme?: string;
  plan_text?: string;
  sub_arcs?: ArcSubArcEntry[];
  chapter_briefs?: Array<{ chapterNumber: number; brief: string; sub_arc_number?: number; mcBenefit?: string }>;
  threads_to_advance?: string[];
  threads_to_resolve?: string[];
  new_threads?: string[];
}

const ARC_SECRET_LEAK_RE = /(tổ\s*chức|thế\s*lực|người\s*lạ|kẻ\s*lạ|đối\s*thủ|nhân\s*vật\s+bí\s*ẩn)[^.!?\n]{0,100}(theo\s*dõi|biết|phát\s*hiện|nhận\s*ra|săn\s*lùng)[^.!?\n]{0,100}(trọng\s*sinh|hệ\s*thống|bàn\s*tay\s*vàng|golden\s*finger|bí\s*mật|năng\s*lực\s+thật)/i;
// 2026-05-12 (Phase Q): widened to match BENEFIT_KEYWORDS in
// setup-quality-gate.ts (PR #57). Previous narrow set was rejecting valid
// chapter briefs for di-gioi/writer/lord/mat-the novels where Pro setup
// model uses terms like "lợi nhuận / văn khí / tinh thạch / lãnh địa /
// danh tiếng" that weren't matched. Same root cause as the setup kernel
// validator — keep the two regexes in sync.
const CONCRETE_BENEFIT_RE = /(tiền|doanh\s*thu|doanh\s*số|lợi\s*nhuận|lợi\s*ích|thù\s*lao|tài\s*nguyên|tài\s*sản|wealth|gold|vàng|skill|kỹ\s*năng|kỹ\s*thuật|công\s*thức|bản\s*đồ|tin\s*tức|công\s*nhận|tín\s*nhiệm|uy\s*tín|danh\s*tiếng|fame|quan\s*hệ|quan\s*chức|chức\s*vụ|địa\s*vị|network|thông\s*tin|insight|manh\s*mối|đột\s*phá|level|cảnh\s*giới|khách|cửa\s*hàng|đơn\s*hàng|hợp\s*đồng|hàng\s*hóa|sản\s*phẩm|thị\s*trường|kinh\s*tế|vật\s*phẩm|item|kinh\s*nghiệm|lương\s*thực|nhu\s*yếu\s*phẩm|đồ\s*ăn|thuốc|vũ\s*khí|đạn|súng|nước\s+sạch|năng\s*lượng|an\s*toàn|bảo\s*hộ|bảo\s*vệ|lãnh\s*thổ|lãnh\s*địa|địa\s*bàn|mảnh\s*đất|lương\s*dân|trung\s*thành|loyalty|đệ\s*tử|đồ\s*đệ|độc\s*giả|fan|fanbase|kho|hầm|công\s*nghệ|drone|cảm\s*biến|linh\s*khí|linh\s*lực|nội\s*lực|pháp\s*bảo|công\s*pháp|huyết\s*mạch|đan\s*dược|đan|linh\s*thạch|tinh\s*thạch|khí\s*vận|quặng|khoáng|văn\s*khí|văn\s*đạo|văn\s*chương|sách|spirit|mana|aura)/i;

function coerceText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map(coerceText).filter(Boolean).join('; ').trim();
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).map(coerceText).filter(Boolean).join('; ').trim();
  }
  return String(value).trim();
}

// ── Template Pattern Detection (Phase Q 2026-05-13 root-cause fix) ───────────
//
// Why: AI summarizers happily captured "ego declaration" endings ("ván cờ sinh
// tử bắt đầu", "hắn là X, đây là thế giới của hắn") as cliffhanger, and
// "static reflection" states ("MC đang chuẩn bị tâm thế") as mcState. These
// then got fed forward into next chapter's bridge context, telling the next
// Architect "MC is in reflection mode, has to resolve abstract hook" — which
// produced static openings. Cycle compounds.
//
// Fix layer 1: prompts now require concrete physical extraction (see below).
// Fix layer 2 (this section): if AI still returns template, detect + scrub.

// Widened 2026-05-13 round 3 — calibrated against 16 production chapter audit.
// Single OR'd alternation covering all observed "ego declaration" patterns.
const TEMPLATE_CLIFFHANGER_RE = new RegExp([
  // "mới chính thức bắt đầu / khai màn / mở ra / bước vào"
  '(?:mới|chính\\s+thức|giờ\\s+(?:đây|này)?\\s*mới|bây\\s+giờ\\s+mới|giờ\\s+này\\s+mới)\\s+(?:chính\\s+thức\\s+)?(?:bắt\\s+đầu|khai\\s+(?:màn|mở)|mở\\s+ra|bước\\s+vào)',
  // "là X, đây là thế giới của hắn"
  'là\\s+[A-ZÀ-Ỵ][^,.!?\\n]{0,40},?\\s+(?:và\\s+)?đây\\s+là\\s+(?:thế\\s+giới|cuộc\\s+đời|tương\\s+lai|vận\\s+mệnh|sân\\s+chơi|lãnh\\s+thổ)\\s+của\\s+(?:hắn|y|cô|nàng|anh|chàng|gã|ta)',
  // "đối với X, đây chỉ mới là khởi đầu"
  'đối\\s+với\\s+[A-ZÀ-Ỵ][^,.!?\\n]{0,40},?\\s+(?:đây|tất\\s+cả|chuyện\\s+này)\\s+(?:chỉ\\s+)?mới\\s+(?:là|chỉ\\s+là)\\s+(?:khởi\\s+đầu|bắt\\s+đầu|sự\\s+khởi\\s+đầu)',
  // "tương lai còn dài"
  'tương\\s+lai\\s+(?:còn\\s+dài|vẫn\\s+còn\\s+dài|vẫn\\s+ở\\s+phía\\s+trước|đang\\s+chờ)',
  // "ván cờ / trò chơi / cuộc chiến (sinh tử) [đã/mới/giờ đây mới] (chính thức) bắt đầu / khai mở / chuyển sang"
  '(?:ván\\s+cờ|trò\\s+chơi|cuộc\\s+chiến|cuộc\\s+phiêu\\s+lưu|hành\\s+trình|bước\\s+đi|cuộc\\s+chơi|chiến\\s+tranh)\\s+(?:sinh\\s+tử|thật\\s+sự|thực\\s+sự|lớn|đích\\s+thực|văn\\s+học|này|vĩ\\s+đại)?\\s*(?:của\\s+\\S+\\s+)?(?:(?:đã|vừa|mới|bây\\s+giờ\\s+mới|giờ\\s+đây\\s+mới)\\s+)?(?:chính\\s+thức\\s+)?(?:bắt\\s+đầu|khai\\s+(?:màn|mở)|mở\\s+ra|chuyển\\s+sang)',
  // "kỷ nguyên mới ... bắt đầu / được viết"
  'kỷ\\s+nguyên\\s+mới(?:[^.!?\\n]{0,80})(?:bắt\\s+đầu|chính\\s+thức|được\\s+viết)',
  // "một chương / kỷ nguyên / thời đại mới ... chuẩn bị bắt đầu / sắp đến"
  'một\\s+(?:chương|kỷ\\s+nguyên|thời\\s+đại)\\s+mới(?:[^.!?\\n]{0,100})(?:chuẩn\\s+bị\\s+bắt\\s+đầu|sắp\\s+bắt\\s+đầu|đang\\s+đến|sắp\\s+đến)',
  // "thời đại mới ... sẽ được viết nên / được mở ra"
  'thời\\s+đại\\s+mới(?:[^.!?\\n]{0,60})(?:sẽ\\s+được\\s+viết|sắp\\s+đến|sắp\\s+bắt\\s+đầu|đang\\s+đến|được\\s+mở\\s+ra)',
  // "(thời đại / kỷ nguyên) mới ... sẽ được viết nên" (broader, reversed)
  '(?:thời\\s+đại|kỷ\\s+nguyên|trang\\s+sử)(?:[^.!?\\n]{0,30})(?:sẽ\\s+được\\s+viết\\s+nên|sẽ\\s+ra\\s+đời|đang\\s+đến)',
  // "cái tên sẽ sớm trở thành biểu tượng / truyền thuyết / huyền thoại"
  'cái\\s+tên\\s+(?:sẽ\\s+)?(?:sớm\\s+)?(?:trở\\s+thành|được\\s+ghi\\s+nhớ\\s+là)\\s+(?:biểu\\s+tượng|truyền\\s+thuyết|huyền\\s+thoại)',
  // "X – cái tên sẽ trở thành biểu tượng" — match noun even without "cái tên"
  '[A-ZÀ-Ỵ][a-zà-ỹ]+(?:\\s+[A-ZÀ-Ỵ][a-zà-ỹ]+){1,3}\\s*[–-]\\s*cái\\s+tên',
  // "sẵn sàng cho [những/cuộc/trận] X [lớn hơn/cuối cùng/sắp tới/mới]"
  'sẵn\\s+sàng\\s+cho\\s+(?:những\\s+|cuộc\\s+|trận\\s+|một\\s+)?[a-zà-ỹ]+(?:\\s+[a-zà-ỹ]+){0,4}\\s+(?:cuối\\s+cùng|lớn(?:\\s+hơn)?|hơn|mới|kế\\s+tiếp|sắp\\s+tới|tiếp\\s+theo|kinh\\s+hoàng|vĩ\\s+đại|khốc\\s+liệt(?:\\s+hơn)?)',
  // "X sẽ là người định đoạt / đặt ra luật lệ / viết tiếp"
  '(?:\\S+)\\s+(?:sẽ\\s+)?là\\s+người\\s+(?:định\\s+đoạt|đặt\\s+(?:ra\\s+)?luật\\s+lệ|viết\\s+tiếp|viết\\s+nên|làm\\s+chủ\\s+cuộc\\s+chơi)',
  // "bây giờ, chỉ cần chờ đợi thời điểm"
  'bây\\s+giờ,?\\s+chỉ\\s+(?:cần\\s+)?chờ\\s+(?:đợi\\s+)?thời\\s+điểm',
  // "bản hùng ca / giao hưởng / sử thi ... sẽ được viết"
  'bản\\s+(?:hùng\\s+ca|giao\\s+hưởng|sử\\s+thi|anh\\s+hùng\\s+ca)(?:[^.!?\\n]{0,40})(?:sẽ|đang|đã)\\s+(?:được\\s+)?(?:viết|cất\\s+lên|bắt\\s+đầu)',
  // "kẻ săn mồi / kẻ thù / đối thủ ... cuối cùng đã lộ diện"
  '(?:kẻ\\s+săn\\s+mồi|kẻ\\s+thù|đối\\s+thủ|kẻ\\s+địch|đối\\s+phương)[^.!?\\n]{0,40}(?:cuối\\s+cùng\\s+)?(?:đã|vừa)\\s+lộ\\s+diện',
  // "cuối cùng đã lộ diện" (bare)
  'cuối\\s+cùng\\s+(?:đã|cũng|cũng\\s+đã)\\s+lộ\\s+diện',
].join('|'), 'i');

const TEMPLATE_MCSTATE_RE = new RegExp([
  'chuẩn\\s+bị\\s+tâm\\s+thế',
  'sẵn\\s+sàng\\s+(?:bước\\s+vào|đối\\s+mặt|nghênh\\s+đón|chiến\\s+đấu)',
  'nhếch\\s+(?:mép|môi)\\s+(?:cười)?\\s*[—,.]',
  'nhìn\\s+(?:xa\\s+xăm|về\\s+phía\\s+xa|về\\s+phía\\s+chân\\s+trời)',
  'trong\\s+lòng\\s+(?:thầm\\s+)?(?:tự\\s+nhủ|biết\\s+rằng|hiểu\\s+rằng|hạ\\s+quyết\\s+tâm)',
  'ánh\\s+mắt\\s+(?:sâu\\s+thẳm|kiên\\s+định|lạnh\\s+lùng|sắc\\s+lạnh|sắc\\s+bén|trở\\s+nên\\s+sắc)\\s+(?:nhìn|hướng|nhìn\\s+về)',
  'tâm\\s+(?:thế|trạng)\\s+(?:sẵn\\s+sàng|cảnh\\s+giác|hưng\\s+phấn|làm\\s+chủ|chủ\\s+động)',
  'trạng\\s+thái\\s+(?:sẵn\\s+sàng|tâm\\s+lý|tinh\\s+thần)\\s+(?:chiến\\s+đấu|hưng\\s+phấn|quyết\\s+đoán|cảnh\\s+giác)',
].join('|'), 'i');

// Static-opening detection — composed of TWO separate checks, both must hit
// within first 400 chars (covers ~80 từ Vietnamese — the "100 từ đầu" window).
// 1. Setting establishment: opening sentence is scenery/weather/space/sound,
//    NOT MC action.
// 2. Static MC pose: MC name followed by ngồi/đứng/tựa/nằm + optional adverb
//    (bất động/im lặng/lặng yên/lẽ/đó/thẳng tắp).
const OPENING_SETTING_RE = new RegExp([
  '^.{0,300}(?:',
  [
    'ánh\\s+(?:nắng|sáng|mặt\\s+trời|trăng|đèn|hoàng\\s+hôn|bình\\s+minh)',
    'không\\s+khí',
    'làn\\s+gió',
    'gió\\s+(?:đêm|sớm|lạnh|nhẹ|chiều|sáng)',
    'tia\\s+(?:nắng|sáng)',
    'buổi\\s+(?:sáng|chiều|tối|đêm)',
    'trời\\s+(?:đã|vừa|còn|mới)',
    'đồng\\s+hồ',
    'sương',
    'mùi\\s+(?:dầu|khói|máu|cá|gỗ|đặc\\s+trưng|của)',
    'tiếng\\s+(?:gió|còi|máy|chuông|tích\\s+tắc|động|hú)',
    'phòng\\s+\\S+',
    'thư\\s+phòng',
    'sảnh',
    'gian\\s+(?:phòng|nhà)',
    'sáu\\s+giờ',
    'năm\\s+giờ',
    'bốn\\s+giờ',
    'ngày\\s+thứ',
    'đêm\\s+(?:hôm|đó)',
  ].join('|'),
  ')',
].join(''), 'i');

const OPENING_STATIC_MC_RE = /[A-ZÀ-Ỵ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỵ][a-zà-ỹ]+){1,3}\s+(?:ngồi|đứng|nằm|tựa|dựa|nép|cúi)(?:\s+(?:bất\s+động|im\s+lặng|lặng\s+(?:yên|lẽ|im)|trầm\s+(?:mặc|ngâm)|yên\s+lặng|đó|thẳng\s+(?:tắp|đó)?|lẳng\s+lặng|chết\s+lặng))?/i;

/** True if string looks like the "ego declaration" template pattern. */
export function isTemplateCliffhanger(s: string | null | undefined): boolean {
  if (!s) return false;
  return TEMPLATE_CLIFFHANGER_RE.test(s);
}

/** True if string looks like static "reflection mode" mcState pattern. */
export function isTemplateMcState(s: string | null | undefined): boolean {
  if (!s) return false;
  return TEMPLATE_MCSTATE_RE.test(s);
}

/** True if opening sentence(s) match static "MC observes/reflects" template.
 *  Two-stage detection: setting-establishment phrase + static MC pose, both
 *  within first 400 chars (~80 từ — the "100 từ đầu" window).
 */
export function isTemplateOpening(s: string | null | undefined): boolean {
  if (!s) return false;
  const head = s.slice(0, 500);
  return OPENING_SETTING_RE.test(head) && OPENING_STATIC_MC_RE.test(head);
}

/**
 * Scan chapter tail for the LAST CONCRETE EVENT (action verb + named entity /
 * concrete object / specific sound/sight). Returns a usable cliffhanger string
 * derived from real events, not abstract narration.
 *
 * Used when AI returns an "ego declaration" cliffhanger we want to replace.
 */
export function extractConcreteEventFromTail(content: string): string | null {
  const tail = content.slice(-3000).trim();
  if (!tail) return null;

  // Split into sentences, walk BACKWARD looking for concrete event before any
  // template/abstract declarations.
  const sentenceMatches = tail.match(/[^.!?。！？\n]+[.!?。！？]/g) || [];
  const sentences = sentenceMatches.map(s => s.trim()).filter(Boolean);
  if (sentences.length === 0) return null;

  // Concrete-event signals (priority order):
  // 1. Named entity + action verb (someone DID something specific)
  // 2. Specific external sound/sight/object appearing
  // 3. Quoted dialogue (— "...")
  // 4. Specific time + location commitment
  const concreteVerbs = /(nói|hỏi|đáp|gọi|kêu|hét|gào|thì\s+thầm|cười|gật|lắc|đứng\s+dậy|ngồi\s+xuống|bước|chạy|đi\s+tới|đi\s+đến|đẩy\s+cửa|mở\s+cửa|đóng\s+cửa|cầm|nắm|đặt|ném|đập|gõ|bấm|nhấn|ký|viết|đưa|nhận|trao|móc|rút|bắn|đâm|nhảy|té|ngã|ôm|kéo|đẩy|chỉ|chìa|với\s+tay|đưa\s+tay|giơ\s+lên|hạ\s+xuống|chìa\s+ra|chia\s+sẻ|tuyên\s+bố|công\s+bố|ra\s+lệnh|hô|báo|nhắn|gửi|đặt\s+xuống|tỉnh\s+lại|ngất\s+đi|kéo\s+xuống|kéo\s+lên|đẩy\s+mạnh)/i;
  const externalSignal = /(điện\s+thoại|chuông|tiếng\s+(động|gõ|đập|hét|cười|chuông|kêu|nổ|súng|còi|còn|nói)|bóng\s+(đen|người|dáng)|cánh\s+cửa|cửa\s+sổ|màn\s+hình|tin\s+nhắn|email|thư|gói\s+hàng|hộp|chìa\s+khóa|giấy\s+tờ|hợp\s+đồng|văn\s+kiện|báo\s+cáo|file)/i;
  const dialogueMarker = /^—|^"|^"|^"/;
  const timeCommit = /(ngày\s+mai|sáng\s+mai|tối\s+nay|chiều\s+nay|tuần\s+sau|tháng\s+sau|\d+\s*h(?:\s+sáng|\s+chiều|\s+tối)?|\d+\s+giờ)[^.!?\n]{0,100}(gặp|đến|tới|đi|sẽ\s+đi|sẽ\s+tới|sẽ\s+gặp|hẹn|chờ)/i;

  // Walk last 8 sentences (ignore the final 1-2 if they're template).
  const candidates = sentences.slice(-8);
  // Score each: dialogue 4, timeCommit 4, externalSignal 3, concreteVerb 2.
  let best: { sentence: string; score: number; idx: number } | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const s = candidates[i];
    if (isTemplateCliffhanger(s)) continue; // skip the ego-declaration sentence
    let score = 0;
    if (dialogueMarker.test(s)) score += 4;
    if (timeCommit.test(s)) score += 4;
    if (externalSignal.test(s)) score += 3;
    if (concreteVerbs.test(s)) score += 2;
    // Prefer LATER concrete events
    if (score > 0 && (!best || score >= best.score)) best = { sentence: s, score, idx: i };
  }

  if (best) return best.sentence;

  // No concrete signal — return last non-template sentence as last resort.
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (!isTemplateCliffhanger(candidates[i])) return candidates[i];
  }
  return null;
}

/**
 * Scan chapter tail for MC's CONCRETE PHYSICAL STATE (location, what holding,
 * recent action) at end of chapter. Returns a usable mcState string.
 *
 * Used when AI returns abstract "reflection mode" mcState.
 */
export function extractConcreteMcStateFromTail(content: string, protagonistName: string): string | null {
  const tail = content.slice(-2000);
  if (!tail) return null;

  const mcRe = new RegExp(protagonistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const sentenceMatches = tail.match(/[^.!?。！？\n]+[.!?。！？]/g) || [];
  const sentences = sentenceMatches.map(s => s.trim()).filter(Boolean);

  // Physical-state signals: location prep + concrete action verb + concrete object
  const locationPrep = /(tại|trong|ngoài|trên|dưới|trước|sau|cạnh|bên|ở|đứng\s+trong|ngồi\s+trong|đi\s+vào|đi\s+ra|về|đến|rời\s+khỏi|trở\s+về)/i;
  const concreteObject = /(bàn|ghế|cửa|phòng|sảnh|xe|văn\s+phòng|toà\s+nhà|lầu|tầng|hành\s+lang|ban\s+công|sân|đường|tiệm|cửa\s+hàng|kho|hầm|hợp\s+đồng|tài\s+liệu|máy|điện\s+thoại|laptop|màn\s+hình|tách|chén|ly|cốc|bút|sách|giấy|ấm\s+trà|cốc\s+cà\s+phê|vũ\s+khí|kiếm|đao|súng|đạn|đan|linh\s+thạch|tiền|vàng|chứng\s+từ)/i;

  // Walk backward, find sentence with MC + physical signal (NOT template)
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    if (isTemplateMcState(s)) continue;
    if (!mcRe.test(s)) continue;
    if (locationPrep.test(s) || concreteObject.test(s)) {
      // Trim to first 150 chars + protagonist prefix
      const cleaned = s.replace(/^\s*[—-]\s*/, '').slice(0, 150).trim();
      return cleaned;
    }
  }
  return null;
}

// ── Post-Write: Save Chapter Summary ─────────────────────────────────────────

export async function saveChapterSummary(
  projectId: string,
  chapterNumber: number,
  title: string,
  summary: ChapterSummary,
): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from('chapter_summaries').upsert({
    project_id: projectId,
    chapter_number: chapterNumber,
    title,
    summary: summary.summary,
    opening_sentence: summary.openingSentence,
    mc_state: summary.mcState,
    cliffhanger: summary.cliffhanger,
  }, { onConflict: 'project_id,chapter_number' });

  if (error) {
    console.warn(`[ContextAssembler] Failed to save chapter ${chapterNumber} summary: ${error.message}`);
  }
}

// ── Post-Write: Generate Summary via AI ──────────────────────────────────────

export async function generateChapterSummary(
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
  options?: { allowEmptyCliffhanger?: boolean; projectId?: string },
): Promise<ChapterSummary> {
  // Token-optimized: reduced from 3K+3K=6K to 2K+2K=4K chars
  const headSnippet = content.slice(0, 2000);
  const tailSnippet = content.slice(-2000);

  const prompt = `Tóm tắt chương truyện sau. Trả về JSON:
{
  "summary": "tóm tắt 2-3 câu",
  "openingSentence": "câu mở đầu chương (nguyên văn từ nội dung)",
  "mcState": "VẬT LÝ — ${protagonistName} ĐANG Ở ĐÂU + ĐANG CẦM/LÀM GÌ + AI ĐỨNG CẠNH (cuối chương). KHÔNG mô tả tâm trạng/cảm xúc/suy nghĩ — chỉ position + active object/action.",
  "cliffhanger": "SỰ KIỆN BÊN NGOÀI cụ thể vừa xảy ra ở cuối chương: ai vừa nói/làm gì cụ thể, hoặc vật/sound/sight bất ngờ xuất hiện, hoặc MC vừa quyết định hành động với thời gian+địa điểm+người cụ thể, hoặc tin nhắn/cú điện thoại nội dung gì."
}

Chương ${chapterNumber}: "${title}"

[MỞ ĐẦU]
${headSnippet}

[KẾT CHƯƠNG]
${tailSnippet}

QUY TẮC mcState (CONCRETE PHYSICAL):
- ĐÚNG: "${protagonistName} đang đứng trong phòng họp tầng 32 toà Vạn Thái, tay cầm hợp đồng vừa ký, đối diện CEO Phạm An đang gật đầu."
- ĐÚNG: "${protagonistName} ngồi trên giường bệnh viện, băng tay trái, mẹ ngồi ghế cạnh giường, bác sĩ vừa rời phòng."
- SAI: "${protagonistName} đang chuẩn bị tâm thế bước vào cuộc chiến mới." (tâm trạng, không phải vật lý)
- SAI: "${protagonistName} nhìn xa xăm, trong lòng tự nhủ sẽ thành công." (nội tâm, không phải vị trí)

QUY TẮC cliffhanger (CONCRETE EVENT):
- Nếu không phải finale, KHÔNG để rỗng.
- ĐÚNG: "Trợ lý gõ cửa, đưa ra phong bì niêm phong từ chủ tịch Lý Vạn Lâm."
- ĐÚNG: "Điện thoại reo. Trên màn hình hiện tên 'Phụng' — vợ ${protagonistName} đã 3 năm không liên lạc."
- ĐÚNG: "${protagonistName} quyết định 7h sáng mai sẽ tới biệt thự Lý gia gặp lão Lý để chốt deal."
- SAI: "Ván cờ sinh tử bây giờ mới thật sự bắt đầu." (tuyên ngôn trừu tượng — KHÔNG được lấy làm cliffhanger)
- SAI: "Hắn là ${protagonistName}, đây là thế giới của hắn." (ego declaration — KHÔNG lấy)
- SAI: "Đối với ${protagonistName}, đây chỉ mới là khởi đầu." (abstract — KHÔNG lấy)
- Nếu chương kết bằng tuyên ngôn trừu tượng → trích sự kiện cụ thể TRƯỚC tuyên ngôn đó (đoạn 2-3 trên cùng).
- Chỉ cho phép rỗng khi chương đã khép hoàn toàn theo chủ đích finale.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.1, maxTokens: 1024 }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'chapter_summary', chapterNumber } : undefined });
  const parsed = parseJSON<ChapterSummary>(res.content);

  if (!parsed || !parsed.summary?.trim()) {
    throw new Error(`Chapter ${chapterNumber} summary: JSON parse failed — raw: ${res.content.slice(0, 200)}`);
  }

  const allowEmptyCliffhanger = options?.allowEmptyCliffhanger === true;

  if (!parsed.openingSentence?.trim()) {
    parsed.openingSentence = content.slice(0, 160).trim();
  }

  if (!safeStringTrim(parsed.mcState)) {
    // Fallback: extract MC state from the tail of the chapter
    parsed.mcState = extractFallbackMcState(content, protagonistName);
  } else if (isTemplateMcState(parsed.mcState)) {
    // AI returned abstract reflection — replace with concrete physical extract
    const concrete = extractConcreteMcStateFromTail(content, protagonistName);
    if (concrete) parsed.mcState = concrete;
    else parsed.mcState = extractFallbackMcState(content, protagonistName);
  }

  if (!allowEmptyCliffhanger && !safeStringTrim(parsed.cliffhanger)) {
    parsed.cliffhanger = extractFallbackCliffhanger(content);
  } else if (!allowEmptyCliffhanger && isTemplateCliffhanger(parsed.cliffhanger)) {
    // AI returned ego-declaration — replace with concrete event from tail
    const concrete = extractConcreteEventFromTail(content);
    if (concrete) parsed.cliffhanger = concrete;
    else parsed.cliffhanger = extractFallbackCliffhanger(content);
  }

  return parsed;
}

function extractFallbackCliffhanger(content: string): string {
  const tail = content.slice(-900).trim();
  if (!tail) return 'Biến cố cuối chương vẫn chưa ngã ngũ.';

  const sentenceMatches = tail.match(/[^.!?。！？\n]+[.!?。！？]?/g) || [];
  const sentences = sentenceMatches
    .map(s => s.trim())
    .filter(Boolean)
    .slice(-5);

  const hookKeywords = [
    'bất ngờ', 'đột nhiên', 'bỗng', 'kinh hãi', 'sững sờ', 'không thể tin',
    'ngay lúc đó', 'tiếng động', 'bóng đen', 'cánh cửa', 'hô lớn',
  ];

  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    const lower = s.toLowerCase();
    if (lower.includes('?') || lower.includes('...') || hookKeywords.some(k => lower.includes(k))) {
      return s;
    }
  }

  return sentences[sentences.length - 1] || 'Biến cố cuối chương vẫn chưa ngã ngũ.';
}

/**
 * Extract a basic MC state from the chapter tail when AI fails to provide one.
 * Looks for cultivation/power keywords, location hints, and condition markers.
 */
function extractFallbackMcState(content: string, protagonistName: string): string {
  const tail = content.slice(-2000).toLowerCase();

  // Try to find cultivation/power level mentions
  const powerKeywords = [
    'cảnh giới', 'đột phá', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh',
    'hóa thần', 'luyện hư', 'độ kiếp', 'đại thừa', 'tiên nhân',
    'cấp bậc', 'rank', 'level', 'bậc',
  ];
  const locationKeywords = ['đang ở', 'tại', 'quay về', 'rời khỏi', 'đến'];
  const conditionKeywords = ['bị thương', 'hồi phục', 'mệt mỏi', 'tỉnh lại', 'ngất', 'khỏe mạnh'];

  const parts: string[] = [];

  // Check for power/cultivation state
  for (const kw of powerKeywords) {
    const idx = tail.lastIndexOf(kw);
    if (idx >= 0) {
      // Extract surrounding context (up to 80 chars)
      const start = Math.max(0, idx - 20);
      const end = Math.min(tail.length, idx + kw.length + 60);
      const snippet = content.slice(content.length - 2000 + start, content.length - 2000 + end).trim();
      if (snippet.length > 10) {
        parts.push(snippet.replace(/\n/g, ' ').slice(0, 100));
        break;
      }
    }
  }

  // Check for condition
  for (const kw of conditionKeywords) {
    if (tail.includes(kw)) {
      parts.push(kw);
      break;
    }
  }

  if (parts.length > 0) {
    return `${protagonistName}: ${parts.join(', ')}`;
  }

  // Last resort: generic state
  return `${protagonistName} cuối chương — xem nội dung để biết chi tiết`;
}

// ── Post-Write: Combined Summary + Character Extraction (single AI call) ─────

export interface CombinedSummaryAndCharacters {
  summary: ChapterSummary;
  characters: Array<{
    character_name: string;
    status: 'alive' | 'dead' | 'missing' | 'unknown';
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>;
}

/**
 * Generate chapter summary AND extract character states in a single AI call.
 * Saves ~1 AI call per chapter compared to separate generateChapterSummary + extractAndSaveCharacterStates.
 */
export async function generateSummaryAndCharacters(
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
  options?: { allowEmptyCliffhanger?: boolean; projectId?: string },
): Promise<CombinedSummaryAndCharacters> {
  // Token-optimized: reduced from 4K+4K+3K=11K to 2K+2K+1K=5K chars
  // Gemini can extract summary + characters from smaller snippets effectively
  const headSnippet = content.slice(0, 2000);
  const tailSnippet = content.slice(-2000);
  // Mid section for character extraction context
  const midStart = Math.floor(content.length * 0.3);
  const midSnippet = content.length > 8000
    ? content.slice(midStart, midStart + 1000)
    : '';

  const prompt = `Phân tích chương truyện sau, thực hiện 2 nhiệm vụ ĐỒNG THỜI. Trả về JSON:
{
  "summary": "tóm tắt 2-3 câu",
  "openingSentence": "câu mở đầu chương (nguyên văn)",
  "mcState": "VẬT LÝ — ${protagonistName} ĐANG Ở ĐÂU + ĐANG CẦM/LÀM GÌ + AI ĐỨNG CẠNH (cuối chương). KHÔNG mô tả tâm trạng/cảm xúc/suy nghĩ — chỉ position + active object/action.",
  "cliffhanger": "SỰ KIỆN BÊN NGOÀI cụ thể vừa xảy ra ở cuối chương: ai vừa nói/làm gì cụ thể, hoặc vật/sound/sight bất ngờ xuất hiện, hoặc MC vừa quyết định hành động với thời gian+địa điểm+người cụ thể, hoặc tin nhắn/cú điện thoại nội dung gì.",
  "characters": [
    {
      "character_name": "TÊN RIÊNG đầy đủ (VD: 'Lâm Phong', 'Aria'). CẤM số, mã code, nhãn chung",
      "status": "alive|dead|missing|unknown",
      "power_level": "cảnh giới/sức mạnh hoặc null",
      "power_realm_index": null,
      "location": "vị trí cuối chương hoặc null",
      "personality_quirks": "đặc điểm tính cách nổi bật hoặc null",
      "notes": "TRỌNG TÂM: trust/relationship state đối với MC ở cuối chương + bất kỳ thay đổi trong chương này. VD đúng: 'Vừa convinced bởi MC ở scene 4, chuyển từ skeptical sang tin tưởng', 'Đệ tử trung thành đã build trust 5 chương, mới swear loyalty', 'Đối thủ thương trường vừa bị MC face-slap, hostility tăng'. CẤM ghi chung chung kiểu 'Thủ hạ' / 'Bạn MC' / 'Đồng minh'."
    }
  ]
}

Chương ${chapterNumber}: "${title}"
Nhân vật chính: ${protagonistName}

[MỞ ĐẦU]
${headSnippet}
${midSnippet ? `\n[GIỮA CHƯƠNG]\n${midSnippet}` : ''}

[KẾT CHƯƠNG]
${tailSnippet}

QUY TẮC mcState (CONCRETE PHYSICAL):
- ĐÚNG: "${protagonistName} đang đứng trong phòng họp tầng 32 toà Vạn Thái, tay cầm hợp đồng vừa ký, đối diện CEO Phạm An gật đầu."
- ĐÚNG: "${protagonistName} ngồi giường bệnh viện, băng tay trái, mẹ ngồi ghế cạnh giường, bác sĩ vừa rời phòng."
- SAI: "${protagonistName} đang chuẩn bị tâm thế bước vào cuộc chiến mới." (tâm trạng — KHÔNG được lấy)
- SAI: "${protagonistName} nhìn xa xăm, trong lòng tự nhủ..." (nội tâm — KHÔNG được lấy)

QUY TẮC cliffhanger (CONCRETE EVENT):
- Nếu không phải finale, KHÔNG để rỗng.
- ĐÚNG: "Trợ lý gõ cửa, đưa phong bì niêm phong từ chủ tịch Lý Vạn Lâm."
- ĐÚNG: "Điện thoại reo, màn hình hiện tên 'Phụng' — vợ ${protagonistName} đã 3 năm không liên lạc."
- ĐÚNG: "${protagonistName} quyết định 7h sáng mai sẽ tới biệt thự Lý gia gặp lão Lý chốt deal."
- SAI: "Ván cờ sinh tử bây giờ mới thật sự bắt đầu." (tuyên ngôn trừu tượng — KHÔNG được lấy)
- SAI: "Hắn là ${protagonistName}, đây là thế giới của hắn." (ego declaration — KHÔNG lấy)
- SAI: "Đối với ${protagonistName}, đây chỉ mới là khởi đầu." (abstract — KHÔNG lấy)
- Nếu chương kết bằng tuyên ngôn trừu tượng → trích sự kiện cụ thể 2-3 đoạn TRƯỚC tuyên ngôn đó.

CHARACTERS: Chỉ nhân vật CÓ TÊN RIÊNG thực sự. CẤM số, mã code, mô tả chung.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.1, maxTokens: 2048 }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'combined_summary', chapterNumber } : undefined });
  const parsed = parseJSON<CombinedAIResponse>(res.content);

  const parsedSummary = coerceText(parsed?.summary);
  if (!parsed || !parsedSummary) {
    throw new Error(`Chapter ${chapterNumber} combined summary: JSON parse failed — raw: ${res.content.slice(0, 200)}`);
  }

  const allowEmptyCliffhanger = options?.allowEmptyCliffhanger === true;
  const openingSentence = coerceText(parsed.openingSentence);
  const rawMcState = coerceText(parsed.mcState);
  const rawCliffhanger = coerceText(parsed.cliffhanger);

  // Phase Q 2026-05-13 root-cause fix: sanitize template patterns so they don't
  // propagate forward into next chapter's bridge context. Without this, AI's
  // tendency to write "ego declaration" endings + capture them as cliffhanger
  // creates a compounding cycle (template ending → template cliffhanger →
  // bridge tells next architect to continue reflection → static opening).
  let finalMcState = rawMcState;
  if (!rawMcState) {
    finalMcState = extractFallbackMcState(content, protagonistName);
  } else if (isTemplateMcState(rawMcState)) {
    const concrete = extractConcreteMcStateFromTail(content, protagonistName);
    finalMcState = concrete || extractFallbackMcState(content, protagonistName);
  }

  let finalCliffhanger = rawCliffhanger;
  if (!rawCliffhanger) {
    finalCliffhanger = allowEmptyCliffhanger ? '' : extractFallbackCliffhanger(content);
  } else if (!allowEmptyCliffhanger && isTemplateCliffhanger(rawCliffhanger)) {
    const concrete = extractConcreteEventFromTail(content);
    finalCliffhanger = concrete || extractFallbackCliffhanger(content);
  }

  // Build summary — use safeStringTrim because AI may return non-string values
  // for fields typed as string (object/array/null) which would crash .trim().
  const summary: ChapterSummary = {
    summary: parsedSummary,
    openingSentence: openingSentence || content.slice(0, 160).trim(),
    mcState: finalMcState,
    cliffhanger: finalCliffhanger,
  };

  return {
    summary,
    characters: Array.isArray(parsed.characters) ? parsed.characters.map(c => ({
      ...c,
      status: (c.status || 'unknown') as 'alive' | 'dead' | 'missing' | 'unknown',
    })) : [],
  };
}

// ── Post-Write: Generate Synopsis ────────────────────────────────────────────

export async function generateSynopsis(
  projectId: string,
  oldSynopsis: string | undefined,
  arcSummaries: Array<{ chapter_number: number; title: string; summary: string }>,
  genre: GenreType,
  protagonistName: string,
  lastChapter: number,
  config: GeminiConfig,
): Promise<void> {
  const summaryText = arcSummaries
    .map(s => `Ch.${s.chapter_number} "${s.title}": ${s.summary}`)
    .join('\n');

  // P2.4: MC name lock prepended to prompt — prevents synopsis regen drifting MC name
  // when chapter summaries contain wrong name (e.g. due to upstream Writer bug).
  // Synopsis is the canonical "what happened" used by future chapter contexts; if
  // synopsis says "Trần Vũ" instead of "Lê Minh", the drift propagates indefinitely.
  const mcLock = `[QUY TẮC TUYỆT ĐỐI — MC NAME LOCK]
Nhân vật chính của truyện này TÊN = "${protagonistName}". KHÔNG dùng bất kỳ tên nào khác để chỉ MC.
Nếu chapter summaries phía dưới có tên khác (do bug chương trước drift), SỬA về "${protagonistName}" khi viết synopsis.
Synopsis output PHẢI chứa "${protagonistName}" ít nhất 5 lần và KHÔNG chứa tên khác như nhân vật chính.

`;

  const prompt = `${mcLock}Bạn là biên tập viên truyện ${genre}. Viết TỔNG QUAN CỐT TRUYỆN cập nhật.

${oldSynopsis ? `Synopsis cũ:\n${oldSynopsis}\n\n` : ''}Các chương mới:\n${summaryText}

Trả về JSON:
{
  "synopsis_text": "tổng quan 500-800 từ, bao gồm tất cả sự kiện quan trọng — gọi MC bằng '${protagonistName}'",
  "mc_current_state": "trạng thái hiện tại của ${protagonistName}",
  "active_allies": ["danh sách đồng minh"],
  "active_enemies": ["danh sách kẻ thù"],
  "open_threads": ["các tuyến truyện đang mở"]
}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 2048 }, { jsonMode: true, tracking: { projectId, task: 'synopsis' } });
  const parsed = parseJSON<SynopsisAIResponse>(res.content);
  if (!parsed || !parsed.synopsis_text?.trim()) {
    throw new Error(`Synopsis generation failed: JSON parse error — raw: ${res.content.slice(0, 200)}`);
  }

  // P2.4 verification: synopsis MUST contain the expected MC name. If it doesn't,
  // the AI ignored the MC lock — likely drift in upstream summaries propagated.
  // Don't save the bad synopsis; throw to surface the issue + retry on next cron tick.
  const synopsisText = parsed.synopsis_text;
  if (!synopsisText.includes(protagonistName)) {
    throw new Error(`Synopsis missing MC name "${protagonistName}" — possible name drift; not saving. First 200 chars: ${synopsisText.slice(0, 200)}`);
  }

  const db = getSupabase();
  const { error: synopsisErr } = await db.from('story_synopsis').upsert({
    project_id: projectId,
    synopsis_text: parsed.synopsis_text || '',
    mc_current_state: parsed.mc_current_state || '',
    active_allies: parsed.active_allies || [],
    active_enemies: parsed.active_enemies || [],
    open_threads: parsed.open_threads || [],
    last_updated_chapter: lastChapter,
  }, { onConflict: 'project_id' });

  if (synopsisErr) {
    console.warn(`[ContextAssembler] Failed to save synopsis for project ${projectId}: ${synopsisErr.message}`);
  }
}

// ── Post-Write: Generate Arc Plan ────────────────────────────────────────────

export async function generateArcPlan(
  projectId: string,
  arcNumber: number,
  genre: GenreType,
  protagonistName: string,
  synopsis: string | undefined,
  storyBible: string | undefined,
  totalPlanned: number,
  config: GeminiConfig,
  storyVision?: { endingVision?: string; majorPlotPoints?: string[]; mainConflict?: string; endGoal?: string; setupKernel?: StoryKernel },
  worldDescription?: string,  // 2026-04-29 audit fix: anchor arc plan to canonical premise (same pattern as chapter-writer Layer -1).
  masterOutline?: unknown,
): Promise<void> {
  const startChapter = (arcNumber - 1) * 20 + 1;
  const endChapter = Math.min(arcNumber * 20, totalPlanned);

  if (!worldDescription?.trim() || worldDescription.trim().length < 500) {
    throw new Error(`Arc plan generation refused: world_description missing/incomplete for project ${projectId}`);
  }
  const worldMc = extractMainCharacterNameFromWorld(worldDescription);
  if (worldMc && protagonistName.trim() && worldMc !== protagonistName.trim()) {
    throw new Error(`Arc plan generation refused: protagonist mismatch world="${worldMc}" project="${protagonistName.trim()}"`);
  }
  const parsedMasterOutline = typeof masterOutline === 'string'
    ? parseJSON<{ volumes?: unknown[]; majorArcs?: unknown[] }>(masterOutline)
    : masterOutline;
  const hasMasterOutline = !!parsedMasterOutline && typeof parsedMasterOutline === 'object' && (
    (Array.isArray((parsedMasterOutline as { volumes?: unknown[] }).volumes) && (parsedMasterOutline as { volumes?: unknown[] }).volumes!.length > 0)
    || (Array.isArray((parsedMasterOutline as { majorArcs?: unknown[] }).majorArcs) && (parsedMasterOutline as { majorArcs?: unknown[] }).majorArcs!.length > 0)
    || Object.values(parsedMasterOutline as Record<string, unknown>).some((entry) => (
      !!entry
      && typeof entry === 'object'
      && typeof (entry as { chapters?: unknown }).chapters === 'string'
      && typeof (entry as { coreProblem?: unknown }).coreProblem === 'string'
      && typeof (entry as { payoff?: unknown }).payoff === 'string'
    ))
  );
  if (!hasMasterOutline) {
    throw new Error(`Arc plan generation refused: master_outline missing/incomplete for project ${projectId}`);
  }
  if (arcNumber === 1 && !storyVision?.setupKernel) {
    throw new Error(`Arc plan generation refused: StoryKernel missing for project ${projectId}`);
  }

  // 2026-04-30 fix: Arc 1 plan covers chương 1-20 — without warm-baseline rule
  // injection, AI was emitting rock-bottom openings (chủ nhà giục trả tiền, MC
  // bế tắc, etc.) that conflict with WRITER_SYSTEM warm-baseline rule. Inject
  // golden chapter requirements + universal anti-seeds + voice anchor when
  // arc 1 is being planned so chapter 1-3 briefs are bestseller-grade.
  let openingRulesBlock = '';
  if (arcNumber === 1) {
    const ch1Must = GOLDEN_CHAPTER_REQUIREMENTS.chapter1.mustHave.map(r => `  • ${r}`).join('\n');
    const ch1Avoid = GOLDEN_CHAPTER_REQUIREMENTS.chapter1.avoid.map(r => `  ✗ ${r}`).join('\n');
    const ch2Must = GOLDEN_CHAPTER_REQUIREMENTS.chapter2.mustHave.map(r => `  • ${r}`).join('\n');
    const ch3Must = GOLDEN_CHAPTER_REQUIREMENTS.chapter3.mustHave.map(r => `  • ${r}`).join('\n');
    const antiSeeds = UNIVERSAL_ANTI_SEEDS.slice(0, 12).map(s => `  ✗ ${s}`).join('\n');
    const voiceHint = getArchitectVoiceHint(genre);
    openingRulesBlock = `\n[GOLDEN CHAPTER REQUIREMENTS — ARC 1 ONLY, BẮT BUỘC ALIGN]
Chương 1 PHẢI tuân thủ:
${ch1Must}
Chương 1 CẤM:
${ch1Avoid}
Chương 2 PHẢI:
${ch2Must}
Chương 3 PHẢI:
${ch3Must}

[UNIVERSAL ANTI-SEEDS — CẤM TUYỆT ĐỐI cho mọi chapter brief trong arc 1]:
${antiSeeds}
${voiceHint}

→ chapter_briefs cho chương 1-3 PHẢI propose scenes thỏa mãn các rule trên.
   CẤM TUYỆT ĐỐI brief mở chương 1 với "MC nghèo đói / chủ nhà giục / bế tắc / tự tử".
   MC PHẢI mở chương 1 với golden finger ACTIVE + competence visible + opportunity-driven hook.

[SẢNG VĂN ARC 1 HARD BANS — TUYỆT ĐỐI]:
   ✗ ZERO mysterious organization tracking MC trong arc 1. Tổ chức bí ẩn defer arc 4+.
   ✗ KHÔNG "MC vừa làm X đã bị Y phát hiện". Mỗi MC milestone scale 1 tầng nhận thức world (xã→huyện→tỉnh→quốc — KHÔNG SKIP TẦNG).
   ✗ MAX 1 antagonist active arc 1 (LOCAL scale: hàng xóm/đồng nghiệp/chợ). Antagonist mới chỉ unlock sau khi MC kết thúc xung đột với cái cũ.
   ✗ KHÔNG "world full of trọng sinh khác". MC trọng sinh là DUY NHẤT — world NGÂY THƠ về golden finger MC.
   ✗ WARM BASELINE 5 chương đầu: ZERO active threat. MC làm việc routine trong domain nhỏ. KHÔNG có stalker / sát thủ / tổ chức bí ẩn / kẻ thù kiếp trước follow-through ở chương 1-5.
   ✗ "Vừa mua sắm ít đồ đã bị 5 thằng chú ý" = REJECT. Reader cần warm-up time để root for MC.
   ✗ KHÔNG ai ngoài MC biết trọng sinh/hệ thống/golden finger trong arc 1. Người ngoài chỉ thấy kết quả MC tạo ra.
\n`;
  }

  const isClosingPhase = endChapter >= totalPlanned * 0.8;
  const closingInstruction = isClosingPhase ? 
    `\n\nCHÚ Ý QUAN TRỌNG (GIAI ĐOẠN ĐÓNG TRUYỆN): Truyện đang ở ${Math.round((endChapter/totalPlanned)*100)}% tiến độ.
Yêu cầu:
- BẮT ĐẦU ĐÓNG CÁC PLOT THREADS: Đưa các tuyến truyện phụ, ân oán cũ vào danh sách "threads_to_resolve".
- KHÔNG MỞ THÊM THREAD MỚI LỚN ("new_threads" chỉ nên là các tình tiết dẫn tới final boss/climax).
- Gom các nhân vật lại gần nhau để chuẩn bị cho đại chiến/sự kiện cuối cùng.` : '';

  // 2026-04-29 audit fix: WORLD DESCRIPTION anchor (Layer -1) — same defense as
  // chapter-writer pipeline. If synopsis is shallow or storyBible missing or
  // storyVision is empty (story_outline schema bug), this guarantees arc plan
  // still has the canonical premise to ground future chapter_briefs against.
  let worldBlock = '';
  if (worldDescription?.trim()) {
    // Phase Q (2026-05-12): bumped 4000 → 8000 to match assembler.ts chapter
    // writing slice. Some world_descriptions (esp. with power-system canon
    // sections appended) exceed 4000 and were getting truncated at arc_plan
    // gen, so subsequent chapter briefs missed the power-progression hints.
    worldBlock = `[WORLD DESCRIPTION — PREMISE GỐC, ARC PLAN PHẢI BÁM SÁT]\n${worldDescription.slice(0, 8000)}\n\n`;
  }

  const masterBlock = `[MASTER OUTLINE — KHUNG TOÀN TRUYỆN, ARC PLAN PHẢI KHỚP]\n${JSON.stringify(parsedMasterOutline).slice(0, 4000)}\n\n`;

  // StoryVision injection for directional coherence
  let visionBlock = '';
  if (storyVision) {
    const vParts: string[] = ['[STORY VISION — HƯỚNG ĐI TỔNG THỂ]'];
    if (storyVision.setupKernel) {
      const kernel = storyVision.setupKernel;
      vParts.push('[STORY KERNEL — ARC PLAN PHẢI ĐẺ BRIEFS THEO LOOP NÀY]');
      vParts.push(`Reader fantasy: ${kernel.readerFantasy}`);
      vParts.push(`Protagonist engine: ${kernel.protagonistEngine}`);
      vParts.push(`Pleasure loop: ${kernel.pleasureLoop?.join(' → ')}`);
      vParts.push(`System: ${kernel.systemMechanic?.name} | input ${kernel.systemMechanic?.input} | output ${kernel.systemMechanic?.output} | limit ${kernel.systemMechanic?.limit} | reward ${kernel.systemMechanic?.reward}`);
      vParts.push(`MC secret: ${kernel.mcSecret?.secret} | outside only knows ${kernel.mcSecret?.outsideWorldKnowledge} | reveal ${kernel.mcSecret?.revealRule}`);
      vParts.push(`Benefit loop: goal ${kernel.benefitLoop?.goal} | action ${kernel.benefitLoop?.action} | benefit ${kernel.benefitLoop?.benefit} | cadence ${kernel.benefitLoop?.cadence}`);
      vParts.push(`Intervention rule: ${kernel.interventionRule}`);
      vParts.push(`Social reactor: ${kernel.socialReactor?.witnesses?.join(', ')} | ${kernel.socialReactor?.reactionModes?.join(', ')}`);
      vParts.push(`Novelty ladder: ${kernel.noveltyLadder?.map(n => `${n.chapterRange}: ${n.newToy}`).join(' / ')}`);
      vParts.push(`Control: ${kernel.controlRules?.payoffCadence}; ${kernel.controlRules?.attentionGradient}; open ${kernel.controlRules?.openThreadsPerArc}, close ${kernel.controlRules?.closeThreadsPerArc}/arc.`);
    }
    if (storyVision.mainConflict) vParts.push(`Xung đột chính: ${storyVision.mainConflict}`);
    if (storyVision.endGoal) vParts.push(`Mục tiêu cuối: ${storyVision.endGoal}`);
    if (storyVision.endingVision) vParts.push(`Kết cục: ${storyVision.endingVision}`);
    if (storyVision.majorPlotPoints?.length) {
      vParts.push('Plot points: ' + storyVision.majorPlotPoints.slice(0, 6).join(' → '));
    }
    visionBlock = vParts.join('\n') + '\n\n';
  }

  // Per-genre process blueprint — scene types + arc template + quality floor + creative space.
  // Always inject for arc plans regardless of arc number, since these are stable per-genre rules.
  const genreArchGuide = getGenreArchitectGuide(genre);

  const prompt = `Bạn là Story Architect cho truyện ${genre}.

${worldBlock}${masterBlock}${visionBlock}${synopsis ? `TỔNG QUAN:\n${synopsis}\n\n` : ''}${storyBible ? `STORY BIBLE:\n${storyBible.slice(0, 2000)}\n\n` : ''}${genreArchGuide}${openingRulesBlock}
Lập kế hoạch ARC ${arcNumber} (chương ${startChapter}-${endChapter}) cho ${protagonistName}.
Tổng dự kiến: ${totalPlanned} chương.${closingInstruction}

CẤU TRÚC SUB-ARC (HYPERPOP 2024-2026 STANDARD):
- Chia arc 20 chương thành 2-4 SUB-ARCS, mỗi sub-arc 5-10 chương resolve TỰ THÂN.
- Mỗi sub-arc có "mini-payoff" (kết quả cụ thể MC đạt được, conflict resolve, milestone) ở chương cuối.
- Sub-arc liên kết tuyến với nhau (cliffhanger cuối sub-arc 1 dẫn vào sub-arc 2) NHƯNG mỗi sub-arc đứng được độc lập như 1 mini-story.
- Đây là chuẩn modern (微短剧 IP adaptation): reader có thể đọc 5-10 chương 1 lần và cảm thấy có closure, không cần đọc 30 chương mới hiểu.

THREAD RETIREMENT QUOTA (LONG-FORM SUSTAINABILITY):
- Mỗi arc PHẢI mark ≥1 thread "to_resolve" (close existing plot thread). Tránh thread accumulation.
- Nếu open_threads > 8 (truyện đã có nhiều thread chưa đóng) → arc này PHẢI resolve ≥2 oldest threads trước khi open new.
- "new_threads" tối đa 2-3 mỗi arc (không quá load).
- Reader fatigue compounds nếu thread cứ open mà không close — engine phải force closure.

Phase 22 Stage 2 Q4: chapter_briefs phải SCENE-LEVEL không chỉ 1 dòng.
Mỗi chapter brief phải liệt kê 3-5 scenes với goal/conflict cụ thể, callbacks tới hint cũ,
và mini-payoff dự kiến. Đây là blueprint Architect dùng từng chương.
Mỗi chapter brief BẮT BUỘC có "mcBenefit": lợi ích cụ thể MC nhận trong chương
(tài nguyên/tiền/thông tin/quan hệ/uy tín/skill/bảo vệ circle). Nếu không có lợi ích,
đổi brief thành opportunity/payoff local; KHÔNG tạo threat bí ẩn để kéo chương.

Trả về JSON:
{
  "arc_theme": "foundation|conflict|growth|...",
  "plan_text": "mô tả arc 500-800 từ — gồm hook arc, escalation curve, climax, payoff",
  "sub_arcs": [
    {"sub_arc_number": 1, "start_chapter": ${startChapter}, "end_chapter": ${startChapter + 6}, "theme": "tên sub-arc (vd: Khởi nghiệp tại quán net Net Việt)", "mini_payoff": "MC đạt được gì cụ thể cuối sub-arc (vd: Quán net có 50 khách/ngày)"},
    ...
  ],
  "chapter_briefs": [
    {
      "chapterNumber": ${startChapter},
      "brief": "1-2 câu high-level summary",
      "sub_arc_number": 1,
      "mcBenefit": "Lợi ích cụ thể MC nhận trong chương này: tài nguyên/tiền/thông tin/quan hệ/uy tín/skill/bảo vệ circle",
      "scenes": [
        {"order": 1, "goal": "MC làm gì", "conflict": "đối kháng từ ai/cái gì", "resolution": "kết quả scene", "estimated_words": 700, "characters": ["MC", "X"]},
        {"order": 2, "goal": "...", "conflict": "...", "resolution": "...", "estimated_words": 700, "characters": [...]},
        ...
      ],
      "callbacks": ["nhắc về scene/sự kiện ch.X (nếu có)"],
      "foreshadow_plant": ["hint mới gieo (nếu có)"],
      "foreshadow_payoff": ["hint cũ payoff (nếu có)"],
      "mini_dopamine": "1 face-slap / harvest / recognition / breakthrough"
    },
    ...
  ],
  "threads_to_advance": ["thread cần đẩy"],
  "threads_to_resolve": ["thread cần giải quyết"],
  "new_threads": ["thread mới"]
}`;

  // Phase 23 fix: bumped 4096 → 16384. Q4 scene-level schema (chapter_briefs with scenes[],
  // callbacks, foreshadow_plant/payoff per chapter) easily exceeds 4096 tokens for 20-chapter
  // arc → JSON parse error from truncated output. 16K fits comfortably.
  // Phase Q (2026-05-12): bumped 16384 → 32768 — saw Hoang Cổ truncate mid
  // plan_text at ~16K with gemini-3.1-flash-lite. Flash Lite supports 65K
  // output so 32K gives 2x headroom for verbose Vietnamese arc descriptions.
  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 32768 }, { jsonMode: true, tracking: { projectId, task: 'arc_plan' } });
  const parsed = parseJSON<ArcPlanAIResponse>(res.content);
  if (!parsed || !parsed.plan_text?.trim()) {
    throw new Error(`Arc plan generation failed: JSON parse error — raw: ${res.content.slice(0, 200)}`);
  }
  const arcPlanText = JSON.stringify(parsed);
  if (arcNumber === 1 && ARC_SECRET_LEAK_RE.test(arcPlanText)) {
    throw new Error('Arc plan generation refused: arc 1 leaks MC secret or adds mysterious tracking organization');
  }
  // Phase Q (2026-05-12): the mcBenefit gate previously threw and forced a
  // retry on ANY brief with short/unrecognized benefit text. With 20 briefs
  // per arc that's 20 chances to fail; AI variance pushes legit novels to
  // attempts=5 → pause despite 19/20 briefs being fine. Relaxed to:
  //   (a) shorter floor (6 chars vs 12)
  //   (b) soft warning instead of throw — imperfect briefs still saved and
  //       downstream writer agent handles missing context fine
  // Hard rejection only if EVERY brief lacks mcBenefit (clear sign AI
  // ignored the prompt entirely).
  const weakBenefits = (parsed.chapter_briefs || []).filter((brief) => {
    const benefit = (brief.mcBenefit || '').trim();
    return benefit.length < 6 || !CONCRETE_BENEFIT_RE.test(benefit);
  });
  const totalBriefs = (parsed.chapter_briefs || []).length;
  if (totalBriefs > 0 && weakBenefits.length === totalBriefs) {
    throw new Error(`Arc plan generation refused: ALL ${totalBriefs} briefs missing concrete mcBenefit — AI ignored mcBenefit field`);
  }
  if (weakBenefits.length > 0) {
    console.warn(`[arc_plan] ${projectId.slice(0, 8)} arc ${arcNumber}: ${weakBenefits.length}/${totalBriefs} briefs have weak mcBenefit (chapters: ${weakBenefits.map((b) => b.chapterNumber).join(',')}). Continuing anyway.`);
  }

  const db = getSupabase();

  // Phase M.2 (2026-05-12): nếu project có chapter_blueprints rows, đó là
  // source of truth cho chapter_briefs — skip ghi đè qua arc_plan.
  // Chỉ giữ plan_text / sub_arcs / threads_to_* trong arc_plans (high-level).
  const { count: blueprintCount } = await db
    .from('chapter_blueprints')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);
  const hasBlueprints = (blueprintCount ?? 0) > 0;

  const { error: arcErr } = await db.from('arc_plans').upsert({
    project_id: projectId,
    arc_number: arcNumber,
    start_chapter: startChapter,
    end_chapter: endChapter,
    arc_theme: parsed.arc_theme || 'growth',
    plan_text: parsed.plan_text || '',
    sub_arcs: parsed.sub_arcs || [],
    // chapter_briefs: chỉ write khi không có chapter_blueprints. Khi có,
    // chapter_blueprints (template-instantiate, 1000 briefs/novel) là canonical.
    chapter_briefs: hasBlueprints ? [] : (parsed.chapter_briefs || []),
    threads_to_advance: parsed.threads_to_advance || [],
    threads_to_resolve: parsed.threads_to_resolve || [],
    new_threads: parsed.new_threads || [],
  }, { onConflict: 'project_id,arc_number' });

  if (arcErr) {
    console.warn(`[ContextAssembler] Failed to save arc plan ${arcNumber} for project ${projectId}: ${arcErr.message}`);
  }
}

// ── Post-Write: Generate/Refresh Story Bible ─────────────────────────────────

export async function generateStoryBible(
  projectId: string,
  genre: GenreType,
  protagonistName: string,
  worldDescription: string,
  chapters: string[],
  config: GeminiConfig,
  synopsis?: string,
): Promise<void> {
  // Use synopsis + recent chapters if available (for refresh), otherwise use first chapters
  const chapterText = chapters.slice(0, 3).map((c, i) => `Ch.${i + 1}:\n${c.slice(0, 3000)}`).join('\n\n');

  const prompt = `Phân tích ${synopsis ? 'các chương gần đây' : 'các chương đầu'} của truyện ${genre} và tạo/cập nhật STORY BIBLE.

Thế giới: ${worldDescription}
Nhân vật chính: ${protagonistName}
${synopsis ? `\nTỔNG QUAN HIỆN TẠI:\n${synopsis.slice(0, 2000)}\n` : ''}

NỘI DUNG CHƯƠNG:
${chapterText}

Viết Story Bible bao gồm:
1. Hệ thống thế giới (tu luyện/phép thuật/công nghệ)
2. Nhân vật chính: tính cách, mục tiêu, sức mạnh
3. Nhân vật phụ quan trọng
4. Quy tắc thế giới (KHÔNG được vi phạm)
5. Phong cách viết (giọng văn, xưng hô)
6. Bối cảnh chính

Viết dạng text thuần, 800-1500 từ.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 4096 }, { tracking: { projectId, task: 'story_bible' } });
  if (!res.content || res.content.length < 100) return;

  const db = getSupabase();
  const { error: bibleErr } = await db.from('ai_story_projects').update({ story_bible: res.content }).eq('id', projectId);

  if (bibleErr) {
    console.warn(`[ContextAssembler] Failed to save story bible for project ${projectId}: ${bibleErr.message}`);
  }
}
