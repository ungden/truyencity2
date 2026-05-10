/**
 * Vạn Linh Phổ — full novel blueprint export.
 *
 * Used by `scripts/sync-blueprint.ts` and `scripts/spawn-novel.ts`.
 * MC arc + pet portfolio + family tree milestones documented in arc-skeleton.ts.
 */

import type { NovelBlueprint } from '../../src/services/story-engine/blueprint/types';
import { VAN_LINH_PHO_ARC_SKELETON } from './arc-skeleton';
import { ARC1_BRIEFS_PRELUDE_CH1_5 } from './arc-1-prelude';
import { ARC1_BRIEFS_CH6_50 } from './arc-1-detail';
import { ARC2_BRIEFS_CH51_150 } from './arc-2-detail';
import { ARC3_BRIEFS_CH151_300 } from './arc-3-detail';
import { ARC4_BRIEFS_CH301_500 } from './arc-4-detail';
import { ARC5_BRIEFS_CH501_700 } from './arc-5-detail';
import { ARC6_BRIEFS_CH701_900 } from './arc-6-detail';
import { ARC7_BRIEFS_CH901_1000 } from './arc-7-detail';

export const VAN_LINH_PHO_BLUEPRINT: NovelBlueprint = {
  id: 'van-linh-pho-gia-toc',
  title: 'Vạn Linh Phổ: Phế Thú Tiến Hóa, Phục Hưng Gia Tộc',
  slug: 'van-linh-pho-phe-thu-phuc-hung-gia-toc',
  genre: 'ngu-thu-tien-hoa',
  totalChapters: 1000,
  arcs: [
    { arc: VAN_LINH_PHO_ARC_SKELETON[0], briefs: [...ARC1_BRIEFS_PRELUDE_CH1_5, ...ARC1_BRIEFS_CH6_50] },
    { arc: VAN_LINH_PHO_ARC_SKELETON[1], briefs: ARC2_BRIEFS_CH51_150 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[2], briefs: ARC3_BRIEFS_CH151_300 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[3], briefs: ARC4_BRIEFS_CH301_500 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[4], briefs: ARC5_BRIEFS_CH501_700 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[5], briefs: ARC6_BRIEFS_CH701_900 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[6], briefs: ARC7_BRIEFS_CH901_1000 },
  ],
  extraBannedPatterns: [
    'CẤM em gái Cố Tiểu Đào / quản gia Hà Thúc / đệ tử trẻ biết về Vạn Linh Phổ',
    'CẤM pet evolve công khai trước người khác — pet evolution PHẢI trong phòng tu luyện cũ tổ phụ dưới gốc bồ đề',
    'CẤM tiết lộ cấp thật của pet — public chỉ show cấp thấp hơn 1-2 tier so với cấp thật',
    'CẤM Cố Khiếu/Trường Khải/Vân Kiếm xuất hiện trong chương breathing (xem cluster pattern)',
  ],
  toneDirectives: [
    'MC Cố Diệp tone: lạnh đạm + tự tin + tính toán. Public face thiếu niên 16 tuổi may mắn.',
    'Mode lão lục tuyệt đối: giấu Vạn Linh Phổ, giấu xuyên hồn, giấu cấp pet thật.',
  ],
  // Auto-derived item bans — sync auto-adds these to forbidden_terms[] of
  // every chapter < introChapter. Replaces manual BAN_RESOURCES whack-a-mole.
  itemLedger: [
    { name: 'Vòng Linh Tinh', introChapter: 10, aliases: ['vòng đeo tổ phụ', 'vòng linh'] },
    { name: 'bản đồ Bắc Vực', introChapter: 50, aliases: ['mảnh bản đồ', 'bản đồ tổ phụ'] },
    { name: 'sách Vạn Linh Hỏa Pháp', introChapter: 50, aliases: ['Vạn Linh Hỏa Pháp Quyết'] },
    { name: 'Linh Tinh Ngọc', introChapter: 35, aliases: ['mảnh ngọc Linh Tinh'] },
    { name: 'Phượng Linh Đan', introChapter: 14, aliases: ['Phượng Linh Đan cấp B'] },
    // chìa khóa = generic but caught in early chapters; introduce officially ch.50 (kho di sản)
    { name: 'chìa khóa kho di sản', introChapter: 50, aliases: ['chìa khóa kho', 'chìa khóa tổ phụ'] },
  ],
  // Cosmic-tier elements (Vạn Linh Phổ origin Trái Đất, thần thú thượng cổ)
  // are planned for arc 6 (ch.701+). Default 70% × 1000 = ch.701 — explicit.
  cosmicArcStartChapter: 701,
  // Use UNIVERSAL_COSMIC_PATTERNS default (Vietnamese tu-tiên cosmology
  // matches this novel's setting). No override needed.
};
