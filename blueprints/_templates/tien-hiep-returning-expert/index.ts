/**
 * Tien-hiep "returning-expert cultivator" master template.
 *
 * Archetype: Cường giả tu tiên kiếp trước (Hợp Thể / Đại Thừa) trọng sinh /
 * xuyên hồn vào thân thể thiếu niên 14-16t bị khinh thường, mang theo
 * kinh nghiệm + đan phương + công pháp đỉnh từ kiếp trước. Mode lão lục —
 * giấu cảnh giới thật, public face thiếu niên may mắn.
 *
 * Use this template khi novel có những yếu tố sau:
 *   - Tu tiên hệ thống (Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → ...)
 *   - MC trọng sinh / xuyên hồn / mang ký ức kiếp trước
 *   - Tông môn-based progression (ngoại môn → nội môn → chân truyền)
 *   - Đối thủ chính có tổ chức (gia tộc lớn / ma đạo / antagonist arc-spanning)
 *   - Đích cuối: phi thăng / chân tiên / bá chủ / hoàn thành phục thù
 *
 * Customize per novel via `instantiateTemplate()` with vars:
 *   - MC_NAME, MC_FAMILY, MC_PAST_NAME (nếu khác)
 *   - HOMETOWN, SECT_NAME, SECT_REGION
 *   - ANTAGONIST_FAMILY, ANCIENT_ENEMY
 *   - SIGNATURE_PILL, SIGNATURE_TECHNIQUE
 *   - HIDDEN_REALM, WORLD_NAME
 *   - DAOIST_COMPANION, ENDING_GOAL
 *
 * Sample binding: see `blueprints/_templates/tien-hiep-returning-expert/sample-binding.ts`
 * for an example of instantiating into a concrete novel.
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { TIEN_HIEP_RETURNING_EXPERT_ARC_SKELETON } from './arc-skeleton';
import { TIEN_HIEP_BRIEFS_BY_ARC } from './briefs';

export const TIEN_HIEP_RETURNING_EXPERT_TEMPLATE: TemplateBlueprint = {
  templateId: 'tien-hiep-returning-expert',
  description:
    'Returning-expert cultivator archetype — MC kiếp trước Hợp Thể / Đại Thừa trọng sinh vào thân thể thiếu niên, mode lão lục, tông môn progression, đối thủ {{ANTAGONIST_FAMILY}} thị + ANCIENT_ENEMY xuyên suốt 7 arcs.',
  genre: 'tien-hiep',
  totalChapters: 1000,
  arcs: TIEN_HIEP_RETURNING_EXPERT_ARC_SKELETON.map((arc, i) => ({
    arc,
    briefs: TIEN_HIEP_BRIEFS_BY_ARC[i],
  })),
  requiredVars: [
    'MC_NAME',
    'MC_FAMILY',
    'HOMETOWN',
    'SECT_NAME',
    'ANTAGONIST_FAMILY',
    'SIGNATURE_PILL',
    'SIGNATURE_TECHNIQUE',
    'HIDDEN_REALM',
    'ANCIENT_ENEMY',
    'WORLD_NAME',
    'DAOIST_COMPANION',
    'ENDING_GOAL',
  ],
  optionalVars: {
    MC_PAST_NAME: '{{MC_NAME}}', // default: MC_PAST_NAME = MC_NAME nếu cùng tên
    SECT_REGION: 'Tây Nam đại lục',
  },
  varGuidance: {
    MC_NAME: 'Họ + tên đầy đủ MC, kiểu Hán Việt — vd "Lý Trường Sinh", "Trần Vô Cực", "Tiêu Diệp Vũ"',
    MC_FAMILY: 'Họ MC (1 chữ) — vd "Lý", "Trần", "Tiêu"',
    MC_PAST_NAME: 'Tên kiếp trước (nếu khác MC_NAME) — vd "Lý Vô Cực Đạo Tổ"',
    HOMETOWN: 'Thị trấn / châu / quê quán — vd "Vân Châu Thành", "Bắc Hải trấn"',
    SECT_NAME: 'Tông môn ban đầu MC nhập — vd "Thanh Vân Tông", "Thiên Kiếm Sơn"',
    SECT_REGION: 'Khu vực địa lý tông môn — vd "Đông Nam đại lục", "Trung Châu cổ địa"',
    ANTAGONIST_FAMILY: 'Họ đối thủ early arc 1-3 — vd "Vương", "Hàn", "Mộ"',
    ANCIENT_ENEMY: 'Tên kẻ giết MC kiếp trước — vd "Thiên Ma Tổ", "Vạn Cổ Hắc Đế"',
    SIGNATURE_PILL: 'Tên đan dược MC luyện sớm để kiếm linh thạch — vd "Thanh Linh Đan", "Tụ Linh Đan"',
    SIGNATURE_TECHNIQUE: 'Tên công pháp / kiếm pháp signature — vd "Tử Tiêu Lôi Quyết", "Cửu U Kiếm Quyết"',
    HIDDEN_REALM: 'Bí cảnh / cổ vực kiếp trước có manh mối — vd "Thái Hư Cổ Vực", "Vạn Cổ Tiên Khâu"',
    WORLD_NAME: 'Đại lục — vd "Cửu Châu Đại Lục", "Hồng Hoang Đại Thiên"',
    DAOIST_COMPANION: 'Bạn đạo / pháp lữ nữ — vd "Tô Vân Linh", "Mộ Dung Tuyết"',
    ENDING_GOAL: 'Đích cuối arc 7 — vd "phi thăng tiên giới", "chân tiên đạo quả", "bá chủ Cửu Châu"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: lạnh đạm + tự tin + tính toán. Public face thiếu niên 14-16 tuổi may mắn.',
    'Mode lão lục TUYỆT ĐỐI: giấu cảnh giới thật, giấu kinh nghiệm kiếp trước, giấu công pháp đỉnh.',
    'Đối thủ ngắt quãng: {{ANTAGONIST_FAMILY}} thị xuất hiện không liên tục — ≥3 chương breathing giữa hai lần confront.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter, BIG WOW mỗi 5 chương, face-slap mass witness.',
  ],
  extraBannedPatterns: [
    'CẤM reveal MC là cường giả kiếp trước cho người không phải tâm phúc (sư phụ kiếp trước / {{DAOIST_COMPANION}} sau arc 5)',
    'CẤM tu vi thật của MC bị nhìn thấu — public chỉ show thấp hơn 2-3 tầng',
    'CẤM đối thủ {{ANTAGONIST_FAMILY}} thị + {{ANCIENT_ENEMY}} cùng xuất hiện trong chương breathing (ngắt quãng cluster)',
    'CẤM MC hành xử như thiếu niên thật — luôn có kế hoạch dài hạn từ kiếp trước',
  ],
  // Cosmic-tier elements (chân tướng kiếp trước, thượng cổ ruins, pháp tắc
  // thiên đạo) plant ở arc 6 (ch.701+). Default 70% × 1000 = 701.
  cosmicArcStartChapter: 701,
};
