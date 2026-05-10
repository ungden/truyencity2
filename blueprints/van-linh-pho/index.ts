/**
 * Vạn Linh Phổ — full novel blueprint export.
 *
 * Used by `scripts/sync-blueprint.ts` and `scripts/spawn-novel.ts`.
 * MC arc + pet portfolio + family tree milestones documented in arc-skeleton.ts.
 */

import type { NovelBlueprint } from '../../src/services/story-engine/blueprint/types';
import { VAN_LINH_PHO_ARC_SKELETON } from './arc-skeleton';
import { ARC1_BRIEFS_CH6_50 } from './arc-1-detail';
import { ARC2_BRIEFS_CH51_150 } from './arc-2-detail';
import { ARC3_BRIEFS_CH151_300 } from './arc-3-detail';

export const VAN_LINH_PHO_BLUEPRINT: NovelBlueprint = {
  id: 'van-linh-pho-gia-toc',
  title: 'Vạn Linh Phổ: Phế Thú Tiến Hóa, Phục Hưng Gia Tộc',
  slug: 'van-linh-pho-phe-thu-phuc-hung-gia-toc',
  genre: 'ngu-thu-tien-hoa',
  totalChapters: 1000,
  arcs: [
    { arc: VAN_LINH_PHO_ARC_SKELETON[0], briefs: ARC1_BRIEFS_CH6_50 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[1], briefs: ARC2_BRIEFS_CH51_150 },
    { arc: VAN_LINH_PHO_ARC_SKELETON[2], briefs: ARC3_BRIEFS_CH151_300 },
    // Arc 4-7 briefs pending.
    { arc: VAN_LINH_PHO_ARC_SKELETON[3], briefs: [] },
    { arc: VAN_LINH_PHO_ARC_SKELETON[4], briefs: [] },
    { arc: VAN_LINH_PHO_ARC_SKELETON[5], briefs: [] },
    { arc: VAN_LINH_PHO_ARC_SKELETON[6], briefs: [] },
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
};
