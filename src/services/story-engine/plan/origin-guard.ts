import type { StoryKernel } from '../types';

/**
 * MC-origin single-source-of-truth guard.
 *
 * `stage_idea` chốt `setupKernel.mcOrigin` đúng MỘT LẦN. Các stage sinh outline sau
 * (master_outline là call Gemini RIÊNG, dễ bịa) PHẢI tuân theo. Module này cung cấp:
 *   - buildMcOriginLockBlock(): chèn ràng buộc gốc gác MC vào prompt (soft enforce).
 *   - detectOriginContradiction(): scan text outline tìm token mâu thuẫn (hard, fail-closed).
 *
 * Token list cố ý CONSERVATIVE — chỉ những cụm rõ ràng chỉ gốc gác MC — để tránh
 * false-positive làm kẹt novel (vd "năng lượng tái sinh" KHÔNG bị tính là trọng sinh).
 */

export type McOrigin = NonNullable<StoryKernel['mcOrigin']>;

/** Cụm từ chỉ MC đến từ thế giới khác (xuyên không / xuyên việt). */
const TRANSMIGRATION_TOKENS = [
  'xuyên không',
  'xuyên việt',
  'kẻ xuyên',
  'người xuyên không',
  'đến từ trái đất',
  'từ thế giới hiện đại',
];

/** Cụm từ chỉ MC tái sinh / mang ký ức kiếp trước (trọng sinh). */
const REINCARNATION_TOKENS = [
  'trọng sinh',
  'kiếp trước',
  'tiền kiếp',
  'đầu thai',
  'chuyển kiếp',
];

/** Nhãn tiếng Việt cho từng origin (dùng trong prompt + thông báo lỗi). */
const ORIGIN_LABEL: Record<McOrigin, string> = {
  native: 'người bản địa trong thế giới truyện (KHÔNG xuyên không, KHÔNG trọng sinh)',
  transmigrator: 'kẻ xuyên không từ một thế giới khác (vd Trái Đất hiện đại)',
  reincarnated: 'trọng sinh/tái sinh trong CÙNG thế giới, giữ ký ức kiếp trước',
  'system-bestowed': 'người bản địa được Hệ Thống/golden finger ban tặng (nguồn IN-WORLD)',
  returnee: 'người bản địa hồi quy (từng rời đi rồi quay lại), KHÔNG phải xuyên không/trọng sinh',
};

/**
 * Với mỗi origin, trả về danh sách token BỊ CẤM xuất hiện trong outline.
 * - native / system-bestowed / returnee → cấm cả xuyên không lẫn trọng sinh.
 * - transmigrator → chỉ cấm trọng sinh (xuyên không hợp lệ).
 * - reincarnated → chỉ cấm xuyên không (trọng sinh hợp lệ).
 */
function forbiddenTokensFor(origin: McOrigin): string[] {
  switch (origin) {
    case 'transmigrator':
      return REINCARNATION_TOKENS;
    case 'reincarnated':
      return TRANSMIGRATION_TOKENS;
    case 'native':
    case 'system-bestowed':
    case 'returnee':
    default:
      return [...TRANSMIGRATION_TOKENS, ...REINCARNATION_TOKENS];
  }
}

/**
 * Build a prompt block khoá gốc gác MC. Empty string nếu không có kernel/mcOrigin
 * (không ràng buộc gì để tránh over-constrain legacy data).
 */
export function buildMcOriginLockBlock(kernel?: StoryKernel | null): string {
  const origin = kernel?.mcOrigin;
  if (!origin) return '';
  const forbidden = forbiddenTokensFor(origin);
  const lockNote = kernel?.originLockNote ? `\nGhi chú khoá: ${kernel.originLockNote}` : '';
  return `[KHOÁ GỐC GÁC MC — TUYỆT ĐỐI TUÂN THỦ]
Gốc gác MC đã được chốt ở giai đoạn ý tưởng: **${origin}** — ${ORIGIN_LABEL[origin]}.
Mọi volume/sub-arc/beat PHẢI nhất quán với gốc gác này.
CẤM dùng các cụm mâu thuẫn: ${forbidden.map((t) => `"${t}"`).join(', ')}.${lockNote}`;
}

/**
 * Scan toàn bộ text của outline (JSON.stringify để bắt mọi field lồng nhau: mainPlotline,
 * volume/sub-arc descriptions, beats...) tìm token mâu thuẫn với mcOrigin đã chốt.
 *
 * @returns null nếu OK, hoặc 1 câu mô tả vi phạm (origin + token tìm thấy) nếu mâu thuẫn.
 *          Trả null khi không có kernel/mcOrigin (không ràng buộc → không chặn).
 */
export function detectOriginContradiction(
  kernel: StoryKernel | null | undefined,
  outline: unknown,
): string | null {
  const origin = kernel?.mcOrigin;
  if (!origin || !outline) return null;
  const forbidden = forbiddenTokensFor(origin);
  if (forbidden.length === 0) return null;

  const haystack = JSON.stringify(outline).toLowerCase();
  const hits = forbidden.filter((token) => haystack.includes(token));
  if (hits.length === 0) return null;

  return `mcOrigin='${origin}' nhưng master_outline chứa cụm mâu thuẫn: ${hits
    .map((t) => `"${t}"`)
    .join(', ')}`;
}
