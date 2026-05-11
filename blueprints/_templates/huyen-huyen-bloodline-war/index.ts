/**
 * Huyen-huyen "bloodline-continental-war" master template.
 *
 * Archetype: MC từ phế vật mang huyết mạch tổ tiên {{BLOODLINE_NAME}}
 * bị phong ấn, leo từ Võ Đồ → Võ Thần qua 7 huyết mạch tầng + đại lục
 * thống nhất + thượng cổ ruins reveal + final battle {{ANCIENT_ENEMY}}.
 *
 * Combat genre — physical battle là core. Khác tien-hiep: không tông
 * môn cố định trải dài, đại lục sprawling với nhiều thế lực, conflict
 * combat trực diện (giết / chém), huyết mạch là gimmick power.
 *
 * Use this template khi novel có:
 *   - Setup võ đạo / võ giả / võ vương / võ thần progression
 *   - MC mang huyết mạch / bloodline / cổ tộc descendant
 *   - Đại lục sprawling với nhiều thế lực (gia tộc / đế đô / cổ tộc)
 *   - Combat trực diện làm A-plot
 *   - Đích cuối: thống nhất đại lục / Võ Thần / phá phong ấn / siêu thoát
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { HUYEN_HUYEN_BLOODLINE_ARC_SKELETON } from './arc-skeleton';
import { HUYEN_HUYEN_BRIEFS_BY_ARC } from './briefs';

export const HUYEN_HUYEN_BLOODLINE_TEMPLATE: TemplateBlueprint = {
  templateId: 'huyen-huyen-bloodline-war',
  description:
    'Bloodline continental-war archetype — MC mang huyết mạch {{BLOODLINE_NAME}} tổ tiên {{ANCESTOR_NAME}}, leo từ Võ Đồ → Võ Thần qua 7 tầng huyết mạch, thống nhất {{CONTINENT_NAME}}, thượng cổ ruins reveal, final battle {{ANCIENT_ENEMY}} qua 7 arcs.',
  genre: 'huyen-huyen',
  totalChapters: 1000,
  arcs: HUYEN_HUYEN_BLOODLINE_ARC_SKELETON.map((arc, i) => ({
    arc,
    briefs: HUYEN_HUYEN_BRIEFS_BY_ARC[i],
  })),
  requiredVars: [
    'MC_NAME',
    'MC_FAMILY',
    'HOMETOWN',
    'CONTINENT_NAME',
    'BLOODLINE_NAME',
    'ANCESTOR_NAME',
    'ANTAGONIST_FAMILY',
    'ANCIENT_ENEMY',
    'SIGNATURE_TECHNIQUE',
    'ACADEMY_NAME',
    'COMPANION_NAME',
    'ENDING_GOAL',
  ],
  optionalVars: {
    HIDDEN_REALM: 'Cổ Vực phong ấn',
  },
  varGuidance: {
    MC_NAME: 'Họ + tên MC, kiểu Hán Việt huyền huyễn — vd "Tiêu Diệp", "Lâm Phong", "Diệp Phàm"',
    MC_FAMILY: 'Họ MC — vd "Tiêu", "Lâm", "Diệp", "Mộ Dung"',
    HOMETOWN: 'Quê quán / thị trấn nhỏ — vd "Tiêu Gia trấn", "Lâm phủ"',
    CONTINENT_NAME: 'Đại lục — vd "Đẩu Khí Đại Lục", "Hỗn Nguyên Đại Thiên", "Cửu Châu"',
    BLOODLINE_NAME: 'Tên huyết mạch — vd "Phượng Hoàng huyết", "Hỗn Độn long", "Tử Tinh"',
    ANCESTOR_NAME: 'Tổ tiên huyết mạch — vd "Phượng Tổ", "Long Tổ", "Hỗn Nguyên Đế"',
    ANTAGONIST_FAMILY: 'Họ gia tộc đối thủ early — vd "Vân Lan tông", "Hắc Hổ gia"',
    ANCIENT_ENEMY: 'Kẻ phong ấn tổ tiên — vd "Hắc Ám Cổ Đế", "Cửu U Ma Tổ"',
    SIGNATURE_TECHNIQUE: 'Công pháp signature MC — vd "Phần Quyết Cửu Tầng", "Cửu Long Phần Thiên Quyết"',
    ACADEMY_NAME: 'Học viện / tông môn — vd "Cổ Hà Học Viện", "Thiên Vũ Tông"',
    COMPANION_NAME: 'Bạn đồng hành — vd "Tiêu Huân", "Lăng Linh"',
    ENDING_GOAL: 'Đích cuối arc 7 — vd "Võ Thần đỉnh", "thống nhất Cửu Châu", "siêu thoát luân hồi"',
    HIDDEN_REALM: 'Bí cảnh nơi tộc nhân bị giam — vd "Cổ Long Vực", "Hỗn Nguyên Phong Ấn"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: kiêu hãnh nhưng kín đáo. Huyết mạch là gia bảo — luôn nói "tổ tiên truyền lại".',
    'Huyết mạch reveal: public tầng luôn thấp hơn tầng thực 1, chỉ unleash khi đối thủ đáng.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter, BIG WOW mỗi 5 chương — battle peak / huyết mạch unleash / face-slap mass.',
    'Đối thủ ngắt quãng: {{ANTAGONIST_FAMILY}} + cổ tộc đối lập + {{ANCIENT_ENEMY}} ngắt quãng ≥3 chương breathing.',
  ],
  extraBannedPatterns: [
    'CẤM lộ tầng huyết mạch cao hơn tầng thực — public tầng luôn thấp hơn 1.',
    'CẤM tài nguyên không nguồn (đan vô danh, công pháp ngẫu nhiên rơi từ trời) — mọi thứ phải có ledger.',
    'CẤM {{ANTAGONIST_FAMILY}} + cổ tộc đối lập + {{ANCIENT_ENEMY}} cùng xuất hiện trong chương breathing.',
    'CẤM MC tự ngược / lương thiện thái quá — sảng văn cần MC quyết đoán face-slap đối thủ.',
    'CẤM tổ tiên di niệm xuất hiện ngẫu nhiên — phải có trigger (di vật / mật cảnh / huyết mạch tầng).',
  ],
  cosmicArcStartChapter: 701, // Arc 6 thượng cổ ruins là cosmic-tier reveal
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'medium',
  spiceLevel: 1,
};
