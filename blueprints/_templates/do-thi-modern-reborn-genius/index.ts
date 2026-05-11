/**
 * Do-thi (urban) "modern-reborn-genius" master template.
 *
 * Archetype: MC trọng sinh từ tương lai (vd 2026 → 2000) vào thân thể
 * chính mình, mang theo kinh nghiệm thị trường + công nghệ + sự kiện
 * lớn. Khởi nghiệp warm baseline → tài phiệt top quốc tế.
 *
 * NON_COMBAT — conflict resolve qua thị trường / M&A / lawsuit / PR /
 * talent poaching. KHÔNG bao giờ bạo lực vật lý.
 *
 * Use this template khi novel có:
 *   - Setup hiện đại / urban
 *   - MC trọng sinh / xuyên hồn từ tương lai (mang knowledge advantage)
 *   - Khởi nghiệp / business / tài phiệt arc
 *   - Conflict thị trường (KHÔNG combat)
 *   - Đích cuối: tài phiệt #1 / tech overlord / thay đổi thời đại
 */

import type { TemplateBlueprint } from '../../../src/services/story-engine/blueprint/template-instantiate';
import { DO_THI_REBORN_GENIUS_ARC_SKELETON } from './arc-skeleton';
import { DO_THI_BRIEFS_BY_ARC } from './briefs';

export const DO_THI_REBORN_GENIUS_TEMPLATE: TemplateBlueprint = {
  templateId: 'do-thi-modern-reborn-genius',
  description:
    'Modern reborn-genius archetype — MC trọng sinh từ tương lai vào thân thể chính mình, warm baseline venture đã operational, leo từ {{HOMETOWN}} thành tài phiệt #1 global qua 7 arcs. NON_COMBAT genre.',
  genre: 'do-thi',
  totalChapters: 1000,
  arcs: DO_THI_REBORN_GENIUS_ARC_SKELETON.map((arc, i) => ({
    arc,
    briefs: DO_THI_BRIEFS_BY_ARC[i],
  })),
  requiredVars: [
    'MC_NAME',
    'MC_FAMILY',
    'HOMETOWN',
    'CITY_NAME',
    'STARTING_BUSINESS',
    'SIGNATURE_VENTURE',
    'ANTAGONIST_FAMILY',
    'COMPETITION_BRAND',
    'LIFE_PARTNER',
    'COUNTRY_NAME',
    'REBIRTH_YEAR',
    'REBIRTH_FROM_YEAR',
    'ENDING_GOAL',
  ],
  optionalVars: {},
  varGuidance: {
    MC_NAME: 'Họ + tên MC, kiểu hiện đại Việt — vd "Trần Đông Hải", "Nguyễn Minh Tuấn"',
    MC_FAMILY: 'Họ MC — vd "Trần", "Nguyễn", "Lê"',
    HOMETOWN: 'Quê quán MC — vd "Hà Nội", "Hải Phòng", "Đà Nẵng"',
    CITY_NAME: 'Thành phố action chính sau khi mở rộng — vd "Sài Gòn", "Hà Nội"',
    STARTING_BUSINESS: 'Venture đầu của MC — vd "quán net", "studio game", "shop e-commerce", "cà phê Internet", "cửa hàng điện thoại"',
    SIGNATURE_VENTURE: 'Sản phẩm signature MC mang từ tương lai — vd "phần mềm chat", "platform e-commerce", "app gọi xe", "social network"',
    ANTAGONIST_FAMILY: 'Họ chaebol đối thủ — vd "Lý", "Đặng", "Hoàng"',
    COMPETITION_BRAND: 'Tên tập đoàn đối thủ quốc gia — vd "Đại Phát Tập Đoàn", "Hoàng Gia Group"',
    LIFE_PARTNER: 'Bạn đời / co-founder — vd "Nguyễn Lan Anh", "Phạm Thanh Mai"',
    COUNTRY_NAME: 'Quốc gia — vd "Việt Nam", "Trung Quốc"',
    REBIRTH_YEAR: 'Năm trọng sinh (quá khứ) — vd "năm 2000", "năm 1995"',
    REBIRTH_FROM_YEAR: 'Năm tương lai về — vd "năm 2026", "năm 2030"',
    ENDING_GOAL: 'Đích cuối arc 7 — vd "tài phiệt #1 thế giới", "tech overlord toàn cầu", "thay đổi thời đại Việt Nam"',
  },
  toneDirectives: [
    '{{MC_NAME}} tone: bình tĩnh + tự tin + tính toán. Public face thanh niên may mắn, không khoe khoang.',
    'Mode lão lục: dùng kiến thức tương lai một cách kín đáo, không alert quá sớm.',
    'Sảng văn cadence: ≥2 dopamine peaks per chapter, BIG WOW mỗi 5 chương — face-slap qua thị trường / PR / market share visible.',
    'Đối thủ ngắt quãng: {{ANTAGONIST_FAMILY}} thị + {{COMPETITION_BRAND}} ngắt quãng ≥3 chương breathing giữa hai lần confront.',
    'NON_COMBAT genre: tuyệt đối không bạo lực vật lý / huyết chiến / gangster ambush.',
  ],
  extraBannedPatterns: [
    'CẤM bạo lực vật lý / huyết chiến / "Huyết Chiến" trong title / gangster ambush — đây là NON_COMBAT genre.',
    'CẤM MC tham gia tournament đánh đấm / LAN gaming làm A-plot — đó là cliché không phù hợp do-thi.',
    'CẤM reveal MC trọng sinh từ tương lai cho người không phải tâm phúc ({{LIFE_PARTNER}} sau arc 3).',
    'CẤM MC ngất xỉu / đói lạnh / starving / mất việc ở chương 1-5 — warm baseline venture đã operational.',
    'CẤM dùng kiến thức tương lai trắng trợn (vd nhắc tên brand sẽ ra mắt) — phải gián tiếp.',
  ],
  cosmicArcStartChapter: 901, // Arc 7 endgame mới có cosmic-tier (black swan event lore)
  mood: ['sang-khoai', 'kich-tinh'],
  tempo: 'fast-paced',
  spiceLevel: 1,
};
