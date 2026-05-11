/**
 * Master template registry — 28 templates, 13 genres × 1-3 archetypes.
 *
 * Used by mass-instantiate script to pick the right template for each
 * reset project based on:
 *   1. `ai_story_projects.genre` (filter to candidates)
 *   2. Title keyword routing (vd "Trọng Sinh" → trọng sinh archetype)
 *   3. Fallback to default archetype if no keyword match
 *
 * Architecture diversity: 8 narrative patterns covering full spectrum
 * of sảng văn TQ research (cluster-dopamine / linear-grind / time-skip
 * macro / villain-shadow / domain-shop / phó-bản / decade-jumps /
 * simulator-loop).
 */

import type { TemplateBlueprint } from '../../src/services/story-engine/blueprint/template-instantiate';
import { TIEN_HIEP_RETURNING_EXPERT_TEMPLATE } from './tien-hiep-returning-expert';
import { TIEN_HIEP_PHAM_NHAN_TEMPLATE } from './tien-hiep-pham-nhan-slow-burn';
import { TIEN_HIEP_LAO_TO_TEMPLATE } from './tien-hiep-lao-to-simulator';
import { DO_THI_REBORN_GENIUS_TEMPLATE } from './do-thi-modern-reborn-genius';
import { DO_THI_THAP_NIEN_TEMPLATE } from './do-thi-thap-nien-80';
import { DO_THI_THAN_HAO_TEMPLATE } from './do-thi-than-hao-system';
import { DO_THI_PHUC_THU_TEMPLATE } from './do-thi-trong-sinh-phuc-thu';
import { HUYEN_HUYEN_BLOODLINE_TEMPLATE } from './huyen-huyen-bloodline-war';
import { HUYEN_HUYEN_HAC_AM_TEMPLATE } from './huyen-huyen-hac-am-villain';
import { HUYEN_HUYEN_MO_PHONG_TEMPLATE } from './huyen-huyen-mo-phong-gacha';
import { LICH_SU_QUAN_TRUONG_TEMPLATE } from './lich-su-xuyen-quan-truong';
import { LICH_SU_TUONG_QUAN_TEMPLATE } from './lich-su-tuong-quan-chinh-chien';
import { KHOA_HUYEN_TECH_FUSION_TEMPLATE } from './khoa-huyen-tech-fusion';
import { KHOA_HUYEN_TINH_TE_TEMPLATE } from './khoa-huyen-tinh-te-galactic';
import { DONG_NHAN_REWRITE_TEMPLATE } from './dong-nhan-author-rewrite';
import { DONG_NHAN_NARUTO_TEMPLATE } from './dong-nhan-naruto-system';
import { VONG_DU_TOP_PLAYER_TEMPLATE } from './vong-du-top-player-rebirth';
import { VONG_DU_TOAN_DAN_TEMPLATE } from './vong-du-toan-dan-chuyen-chuc';
import { DI_GIOI_LORD_BUILDER_TEMPLATE } from './di-gioi-lord-builder';
import { LINH_DI_CORONER_TEMPLATE } from './linh-di-folk-horror-coroner';
import { LINH_DI_QUY_TAC_TEMPLATE } from './linh-di-quy-tac-quai-dam';
import { MAT_THE_HOARDER_TEMPLATE } from './mat-the-doomsday-hoarder';
import { MAT_THE_THIEN_TAI_TEMPLATE } from './mat-the-thien-tai-trong-cay';
import { KIEM_HIEP_SWORD_SAINT_TEMPLATE } from './kiem-hiep-sword-saint';
import { NGON_TINH_CEO_SOFT_TEMPLATE } from './ngon-tinh-ceo-soft';
import { NGON_TINH_PHUC_THU_TEMPLATE } from './ngon-tinh-trong-sinh-phuc-thu';
import { NGON_TINH_KHOAI_XUYEN_TEMPLATE } from './ngon-tinh-khoai-xuyen';
import { QUAN_TRUONG_BUREAUCRAT_TEMPLATE } from './quan-truong-modern-bureaucrat';
// Phase H batch 1-3 — 13 new archetype templates spanning 8 narrative patterns
import { FALOO_QUOC_VAN_TEMPLATE } from './faloo-quoc-van-prompt';
import { FALOO_TONG_MAN_TEMPLATE } from './faloo-tong-man-reaction';
import { HUYEN_HUYEN_OCCULT_TEMPLATE } from './huyen-huyen-occult-steampunk';
import { TIEN_HIEP_META_COMEDY_TEMPLATE } from './tien-hiep-meta-comedy';
import { LICH_SU_CORONER_TEMPLATE } from './lich-su-coroner-mystery';
import { KHOA_HUYEN_TIME_LOOP_TEMPLATE } from './khoa-huyen-time-loop-thriller';
import { NGON_TINH_MA_GIAP_TEMPLATE } from './ngon-tinh-ma-giap-reveal';
import { NGON_TINH_CO_NGON_TEMPLATE } from './ngon-tinh-co-ngon-trach-dau';
import { DO_THI_Y_TE_TEMPLATE } from './do-thi-y-te-he-thong';
import { COZY_FANTASY_TEMPLATE } from './cozy-fantasy-slice-of-life';
import { COZY_SCIFI_TEMPLATE } from './cozy-sci-fi-space-bakery';
import { DI_GIOI_MUSHOKU_TEMPLATE } from './di-gioi-mushoku-slow-growth';
import { ROMANTASY_THRILLER_TEMPLATE } from './romantasy-thriller-hybrid';

interface ArchetypeRoute {
  template: TemplateBlueprint;
  /** Title keywords (case-insensitive substring match) → choose this archetype. */
  titleKeywords?: string[];
  /** Default archetype for genre? Tie-break when no keyword matches. */
  isDefault?: boolean;
}

/**
 * Per-genre archetype list. First archetype trong list = default if no
 * keyword matches.
 */
export const ARCHETYPES_BY_GENRE: Record<string, ArchetypeRoute[]> = {
  'tien-hiep': [
    { template: TIEN_HIEP_RETURNING_EXPERT_TEMPLATE, isDefault: true,
      titleKeywords: ['trọng sinh', 'trùng sinh', 'tái lai', 'tái sinh'] },
    { template: TIEN_HIEP_PHAM_NHAN_TEMPLATE,
      titleKeywords: ['phàm nhân', 'phàm nhập tu tiên', 'cẩu đạo', 'trường sinh', 'phàm tu', 'tản tu'] },
    { template: TIEN_HIEP_LAO_TO_TEMPLATE,
      titleKeywords: ['lão tổ', 'tổ sư', 'khai phái', 'gia tộc', 'chưởng môn', 'tông môn kinh doanh', 'sư tổ'] },
    { template: TIEN_HIEP_META_COMEDY_TEMPLATE,
      titleKeywords: ['bịa', 'hài', 'hiểu lầm', 'tưởng', 'eminence', 'meta', 'phản sáo lộ', 'shadow', 'comedy tu tiên'] },
  ],
  'do-thi': [
    { template: DO_THI_REBORN_GENIUS_TEMPLATE, isDefault: true,
      titleKeywords: ['trọng sinh', 'trùng sinh', 'tài phiệt', 'reborn'] },
    { template: DO_THI_THAP_NIEN_TEMPLATE,
      titleKeywords: [
        '1980', '1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989',
        '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999',
        '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008',
        'thập niên', 'năm 80', 'năm 90', 'ngư dân', 'rural', 'nông thôn',
        'trở về 19', 'trở về 20', 'trọng sinh 19', 'trọng sinh 20',
      ] },
    { template: DO_THI_THAN_HAO_TEMPLATE,
      titleKeywords: ['thần hào', 'tỷ tiền', 'sô số', 'sign-in', 'check-in', 'đại lão tiêu tiền', 'consumption'] },
    { template: DO_THI_PHUC_THU_TEMPLATE,
      titleKeywords: ['phục thù', 'báo thù', 'phản bội', 'bị hãm', 'revenge', 'hối hận'] },
    { template: DO_THI_Y_TE_TEMPLATE,
      titleKeywords: ['y tế', 'bác sĩ', 'thần y', 'medical', 'phẫu thuật', 'bệnh viện', 'doctor'] },
    { template: FALOO_QUOC_VAN_TEMPLATE,
      titleKeywords: ['quốc vận', 'prompt', 'hint', 'gợi ý', 'national event', 'tournament prompt'] },
  ],
  'huyen-huyen': [
    { template: HUYEN_HUYEN_BLOODLINE_TEMPLATE, isDefault: true,
      titleKeywords: ['huyết mạch', 'bloodline', 'tổ tiên', 'gia tộc', 'phế tài', 'phế vật'] },
    { template: HUYEN_HUYEN_HAC_AM_TEMPLATE,
      titleKeywords: ['phản phái', 'hắc ám', 'tà đạo', 'ma đạo', 'villain', 'đại phản phái', 'tà phái'] },
    { template: HUYEN_HUYEN_MO_PHONG_TEMPLATE,
      titleKeywords: ['mô phỏng', 'suy diễn', 'simulation', 'simulator', 'dự đoán', 'predict'] },
    { template: HUYEN_HUYEN_OCCULT_TEMPLATE,
      titleKeywords: ['quỷ bí', 'lord of mysteries', 'occult', 'cthulhu', 'steampunk', 'sequence', 'tà thần', 'cosmic horror', 'đạo đoàn', 'ritual'] },
    { template: ROMANTASY_THRILLER_TEMPLATE,
      titleKeywords: ['romantasy', 'lãng mạn pháp thuật', 'romance magic', 'romance thriller', 'pháp sư yêu nữ', 'magic mystery'] },
  ],
  'lich-su': [
    { template: LICH_SU_QUAN_TRUONG_TEMPLATE, isDefault: true,
      titleKeywords: ['quan trường', 'thư sinh', 'khoa cử', 'đệ nhất quán'] },
    { template: LICH_SU_TUONG_QUAN_TEMPLATE,
      titleKeywords: ['tướng quân', 'chiến thần', 'binh', 'chinh chiến', 'biên cương', 'tam quốc', 'general'] },
    { template: LICH_SU_CORONER_TEMPLATE,
      titleKeywords: ['ngỗ tác', 'phá án', 'đả canh', 'detective cổ', 'cẩm y vệ', 'điều tra triều', 'forensics'] },
  ],
  'khoa-huyen': [
    { template: KHOA_HUYEN_TECH_FUSION_TEMPLATE, isDefault: true,
      titleKeywords: ['tech', 'AI', 'lab', 'kỹ sư', 'engineer', 'tu chân hệ thống'] },
    { template: KHOA_HUYEN_TINH_TE_TEMPLATE,
      titleKeywords: ['tinh tế', 'cơ giáp', 'mech', 'galactic', 'space', 'vũ trụ', 'pilot'] },
    { template: KHOA_HUYEN_TIME_LOOP_TEMPLATE,
      titleKeywords: ['vòng lặp', 'time loop', 'thời gian', 'time travel', 'thriller', 'thiên tài câu lạc bộ'] },
    { template: COZY_SCIFI_TEMPLATE,
      titleKeywords: ['cozy', 'space bakery', 'tiệm vũ trụ', 'trạm vũ trụ', 'cosy sci-fi'] },
  ],
  'dong-nhan': [
    { template: DONG_NHAN_REWRITE_TEMPLATE, isDefault: true,
      titleKeywords: ['đồng nhân', 'fanfic', 'tổng mạn', 'multiverse', 'chư thiên'] },
    { template: DONG_NHAN_NARUTO_TEMPLATE,
      titleKeywords: ['naruto', 'hỏa ảnh', 'ninja', 'uchiha', 'senju', 'konoha', 'sharingan'] },
    { template: FALOO_TONG_MAN_TEMPLATE,
      titleKeywords: ['tổng mạn', 'phơi bày', '曝光', 'reaction', 'phá phòng', 'tổng cảm', 'reveal canon'] },
  ],
  'vong-du': [
    { template: VONG_DU_TOP_PLAYER_TEMPLATE, isDefault: true,
      titleKeywords: ['trọng sinh', 'top player', 'pro', 'esports', 'mạng du chi'] },
    { template: VONG_DU_TOAN_DAN_TEMPLATE,
      titleKeywords: ['toàn dân', 'chuyển chức', 'global', 'hidden class', 'thần cấp đồng bộ'] },
  ],
  'di-gioi': [
    { template: DI_GIOI_LORD_BUILDER_TEMPLATE, isDefault: true,
      titleKeywords: ['lãnh chúa', 'territory', 'đệ tứ thiên tai', 'lord', 'kingdom builder'] },
    { template: DI_GIOI_MUSHOKU_TEMPLATE,
      titleKeywords: ['tái sinh', 'reincarnation', 'mushoku', 'slow growth', 'từ nhỏ', 'isekai childhood'] },
    { template: COZY_FANTASY_TEMPLATE,
      titleKeywords: ['cozy fantasy', 'tiệm bánh', 'tiệm trà', 'bakery', 'tea house', 'slice of life', 'healing'] },
  ],
  'linh-di': [
    { template: LINH_DI_CORONER_TEMPLATE, isDefault: true,
      titleKeywords: ['ngỗ tác', 'coroner', 'thầy pháp', 'dân tục', 'đạo sĩ', 'âm dương sư', 'mao sơn'] },
    { template: LINH_DI_QUY_TAC_TEMPLATE,
      titleKeywords: ['quy tắc quái đàm', 'rules', 'phó bản', 'instance', 'vô hạn lưu', 'vô hạn khủng bố'] },
  ],
  'mat-the': [
    { template: MAT_THE_HOARDER_TEMPLATE, isDefault: true,
      titleKeywords: ['hoarder', 'hoard', 'tang thi', 'zombie', 'doomsday'] },
    { template: MAT_THE_THIEN_TAI_TEMPLATE,
      titleKeywords: ['thiên tai', 'natural disaster', 'trồng cấy', 'farming', 'space', 'không gian'] },
  ],
  'kiem-hiep': [
    { template: KIEM_HIEP_SWORD_SAINT_TEMPLATE, isDefault: true,
      titleKeywords: ['kiếm khách', 'kiếm thánh', 'wuxia', 'tổng vũ', 'võ lâm minh chủ', 'kim dung', 'cổ long'] },
  ],
  'ngon-tinh': [
    { template: NGON_TINH_CEO_SOFT_TEMPLATE, isDefault: true,
      titleKeywords: ['tổng tài', 'CEO', 'bá đạo', 'hào môn', 'romance'] },
    { template: NGON_TINH_PHUC_THU_TEMPLATE,
      titleKeywords: ['phục thù', 'trọng sinh phục thù', 'báo thù', 'đích nữ trọng sinh'] },
    { template: NGON_TINH_KHOAI_XUYEN_TEMPLATE,
      titleKeywords: ['khoái xuyên', 'pháo hôi', 'nữ phụ', 'phản phái nữ chủ', 'cứu nguyên chủ'] },
    { template: NGON_TINH_MA_GIAP_TEMPLATE,
      titleKeywords: ['mã giáp', 'rớt giáp', 'phu nhân', '马甲', 'hidden identity', 'identity reveal'] },
    { template: NGON_TINH_CO_NGON_TEMPLATE,
      titleKeywords: ['cổ ngôn', 'cung đấu', 'trạch đấu', 'điền văn', 'cung đình', 'hoàng hậu', 'phi tử', 'cổ đại trọng sinh'] },
  ],
  'quan-truong': [
    { template: QUAN_TRUONG_BUREAUCRAT_TEMPLATE, isDefault: true,
      titleKeywords: ['quan trường', 'cán bộ', 'thăng tiến', 'reborn quan trường', 'cấp cao'] },
  ],

  // Fallback genres mapped to closest archetype
  'khoai-xuyen': [{ template: NGON_TINH_KHOAI_XUYEN_TEMPLATE, isDefault: true }],
  'quy-tac-quai-dam': [{ template: LINH_DI_QUY_TAC_TEMPLATE, isDefault: true }],
  'ngu-thu-tien-hoa': [{ template: TIEN_HIEP_RETURNING_EXPERT_TEMPLATE, isDefault: true }],
};

/**
 * Pick template for given genre based on title keywords. Scores each
 * archetype by number of keyword hits + longest-match bias; highest
 * score wins. Default archetype = score 0.5 baseline.
 *
 * Specific archetypes (variants) typically have ≥1 keyword hit which
 * beats default's 0.5. Tie-break favors specific archetypes via
 * declared order in ARCHETYPES_BY_GENRE.
 */
export function pickTemplateForGenre(genre: string, title?: string): TemplateBlueprint | null {
  const archetypes = ARCHETYPES_BY_GENRE[genre];
  if (!archetypes || archetypes.length === 0) return null;

  if (!title) {
    const def = archetypes.find((a) => a.isDefault) || archetypes[0];
    return def.template;
  }

  const titleLower = title.toLowerCase();
  let bestScore = 0;
  let bestArchetype = archetypes.find((a) => a.isDefault) || archetypes[0];

  for (const route of archetypes) {
    let score = route.isDefault ? 0.5 : 0; // default gets baseline 0.5

    if (route.titleKeywords) {
      for (const keyword of route.titleKeywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          // Score by keyword length — longer = more specific = higher score
          score += keyword.length;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = route;
    }
  }

  return bestArchetype.template;
}

export function listSupportedGenres(): string[] {
  return Object.keys(ARCHETYPES_BY_GENRE).sort();
}

export function listAllTemplates(): TemplateBlueprint[] {
  const seen = new Set<string>();
  const all: TemplateBlueprint[] = [];
  for (const archetypes of Object.values(ARCHETYPES_BY_GENRE)) {
    for (const route of archetypes) {
      if (!seen.has(route.template.templateId)) {
        seen.add(route.template.templateId);
        all.push(route.template);
      }
    }
  }
  return all;
}
