/**
 * Template instantiation tests — verify {{TOKEN}} replacement, missing-var
 * detection, unknown-var detection, and end-to-end concretion of the
 * tien-hiep returning-expert template.
 */

import {
  instantiateTemplate,
  findUsedPlaceholders,
  type TemplateBlueprint,
} from '../../services/story-engine/blueprint/template-instantiate';
import { TIEN_HIEP_RETURNING_EXPERT_TEMPLATE } from '../../../blueprints/_templates/tien-hiep-returning-expert';
import { TIEN_HIEP_PHAM_NHAN_TEMPLATE } from '../../../blueprints/_templates/tien-hiep-pham-nhan-slow-burn';
import { TIEN_HIEP_LAO_TO_TEMPLATE } from '../../../blueprints/_templates/tien-hiep-lao-to-simulator';
import { DO_THI_REBORN_GENIUS_TEMPLATE } from '../../../blueprints/_templates/do-thi-modern-reborn-genius';
import { DO_THI_THAP_NIEN_TEMPLATE } from '../../../blueprints/_templates/do-thi-thap-nien-80';
import { DO_THI_THAN_HAO_TEMPLATE } from '../../../blueprints/_templates/do-thi-than-hao-system';
import { DO_THI_PHUC_THU_TEMPLATE } from '../../../blueprints/_templates/do-thi-trong-sinh-phuc-thu';
import { HUYEN_HUYEN_BLOODLINE_TEMPLATE } from '../../../blueprints/_templates/huyen-huyen-bloodline-war';
import { HUYEN_HUYEN_HAC_AM_TEMPLATE } from '../../../blueprints/_templates/huyen-huyen-hac-am-villain';
import { HUYEN_HUYEN_MO_PHONG_TEMPLATE } from '../../../blueprints/_templates/huyen-huyen-mo-phong-gacha';
import { LICH_SU_QUAN_TRUONG_TEMPLATE } from '../../../blueprints/_templates/lich-su-xuyen-quan-truong';
import { LICH_SU_TUONG_QUAN_TEMPLATE } from '../../../blueprints/_templates/lich-su-tuong-quan-chinh-chien';
import { KHOA_HUYEN_TECH_FUSION_TEMPLATE } from '../../../blueprints/_templates/khoa-huyen-tech-fusion';
import { KHOA_HUYEN_TINH_TE_TEMPLATE } from '../../../blueprints/_templates/khoa-huyen-tinh-te-galactic';
import { DONG_NHAN_REWRITE_TEMPLATE } from '../../../blueprints/_templates/dong-nhan-author-rewrite';
import { DONG_NHAN_NARUTO_TEMPLATE } from '../../../blueprints/_templates/dong-nhan-naruto-system';
import { VONG_DU_TOP_PLAYER_TEMPLATE } from '../../../blueprints/_templates/vong-du-top-player-rebirth';
import { VONG_DU_TOAN_DAN_TEMPLATE } from '../../../blueprints/_templates/vong-du-toan-dan-chuyen-chuc';
import { DI_GIOI_LORD_BUILDER_TEMPLATE } from '../../../blueprints/_templates/di-gioi-lord-builder';
import { LINH_DI_CORONER_TEMPLATE } from '../../../blueprints/_templates/linh-di-folk-horror-coroner';
import { LINH_DI_QUY_TAC_TEMPLATE } from '../../../blueprints/_templates/linh-di-quy-tac-quai-dam';
import { MAT_THE_HOARDER_TEMPLATE } from '../../../blueprints/_templates/mat-the-doomsday-hoarder';
import { MAT_THE_THIEN_TAI_TEMPLATE } from '../../../blueprints/_templates/mat-the-thien-tai-trong-cay';
import { KIEM_HIEP_SWORD_SAINT_TEMPLATE } from '../../../blueprints/_templates/kiem-hiep-sword-saint';
import { NGON_TINH_CEO_SOFT_TEMPLATE } from '../../../blueprints/_templates/ngon-tinh-ceo-soft';
import { NGON_TINH_PHUC_THU_TEMPLATE } from '../../../blueprints/_templates/ngon-tinh-trong-sinh-phuc-thu';
import { NGON_TINH_KHOAI_XUYEN_TEMPLATE } from '../../../blueprints/_templates/ngon-tinh-khoai-xuyen';
import { QUAN_TRUONG_BUREAUCRAT_TEMPLATE } from '../../../blueprints/_templates/quan-truong-modern-bureaucrat';
import { FALOO_QUOC_VAN_TEMPLATE } from '../../../blueprints/_templates/faloo-quoc-van-prompt';
import { FALOO_TONG_MAN_TEMPLATE } from '../../../blueprints/_templates/faloo-tong-man-reaction';
import { HUYEN_HUYEN_OCCULT_TEMPLATE } from '../../../blueprints/_templates/huyen-huyen-occult-steampunk';
import { TIEN_HIEP_META_COMEDY_TEMPLATE } from '../../../blueprints/_templates/tien-hiep-meta-comedy';
import { LICH_SU_CORONER_TEMPLATE } from '../../../blueprints/_templates/lich-su-coroner-mystery';
import { KHOA_HUYEN_TIME_LOOP_TEMPLATE } from '../../../blueprints/_templates/khoa-huyen-time-loop-thriller';
import { NGON_TINH_MA_GIAP_TEMPLATE } from '../../../blueprints/_templates/ngon-tinh-ma-giap-reveal';
import { NGON_TINH_CO_NGON_TEMPLATE } from '../../../blueprints/_templates/ngon-tinh-co-ngon-trach-dau';
import { DO_THI_Y_TE_TEMPLATE } from '../../../blueprints/_templates/do-thi-y-te-he-thong';
import { COZY_FANTASY_TEMPLATE } from '../../../blueprints/_templates/cozy-fantasy-slice-of-life';
import { COZY_SCIFI_TEMPLATE } from '../../../blueprints/_templates/cozy-sci-fi-space-bakery';
import { DI_GIOI_MUSHOKU_TEMPLATE } from '../../../blueprints/_templates/di-gioi-mushoku-slow-growth';
import { ROMANTASY_THRILLER_TEMPLATE } from '../../../blueprints/_templates/romantasy-thriller-hybrid';

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  'lich-su-xuyen-quan-truong': {
    MC_NAME: 'Triệu Tử Long', MC_FAMILY: 'Triệu', MC_PAST_NAME: 'Lý Văn Minh', HOMETOWN: 'Lâm An phủ',
    DYNASTY_NAME: 'Đại Tống', CAPITAL_CITY: 'Biện Kinh', ANTAGONIST_FAMILY: 'Tần', FOREIGN_ENEMY: 'Kim quốc',
    CONSORT_NAME: 'Vân Linh công chúa', REFORM_BANNER: 'Tân Pháp Phú Quốc', LOYAL_GENERAL: 'Trần Khánh Dư',
    ENDING_GOAL: 'thống nhất thiên hạ',
  },
  'khoa-huyen-tech-fusion': {
    MC_NAME: 'Lý Tinh Vũ', MC_FAMILY: 'Lý', HOMETOWN: 'Tinh Hà thành',
    LAB_NAME: 'Tinh Vũ Lab', AI_FAMILIAR: 'Linh Tâm AI',
    ANTAGONIST_CORP: 'Hắc Tinh Corp', ANCIENT_ENEMY: 'Hỗn Độn Cổ Trí',
    SIGNATURE_DEVICE: 'Linh Khí Quantum Generator', ACADEMY_NAME: 'Tinh Hà Học Viện',
    COMPANION_NAME: 'Tô Linh', WORLD_NAME: 'Tinh Hà Liên Bang',
    ENDING_GOAL: 'Cosmic Architect đỉnh',
  },
  'dong-nhan-author-rewrite': {
    MC_NAME: 'Diệp Phong', MC_PAST_NAME: 'Lý Khang',
    SOURCE_NOVEL: 'Vạn Cổ Thần Vương', ORIGINAL_PROTAGONIST: 'Diệp Phàm',
    FAVORITE_CHARACTER: 'Tô Lăng', ANTAGONIST_CANON: 'Hắc Đế',
    POWER_SYSTEM: 'Võ đạo cửu tầng', HUB_SPACE_NAME: 'Vô Hạn Thư Viện',
    SECONDARY_NOVEL: 'Linh Vực Đại Đế', COMPANION_NAME: 'Tô Linh',
    ENDING_GOAL: 'multi-world author đỉnh',
  },
  'vong-du-top-player-rebirth': {
    MC_NAME: 'Lý Phong', MC_FAMILY: 'Lý', HOMETOWN: 'Hà Nội',
    GAME_NAME: 'Cửu Châu Online', MC_GAME_CLASS: 'Kiếm sĩ', MC_GAME_NAME: 'Vô Cực Kiếm',
    REBIRTH_YEAR: '2025', GUILD_NAME: 'Vô Cực Hội', RIVAL_GUILD: 'Hắc Long Hội',
    ANTAGONIST_PRO: 'Hắc Long', COMPANION_NAME: 'Tô Linh',
    ANCIENT_LORE_NAME: 'Cửu Châu Tổ Tiên', ENDING_GOAL: 'World champion + cosmic admin lord',
  },
  'di-gioi-lord-builder': {
    MC_NAME: 'Lý Phong', MC_FAMILY: 'Lý', HOMETOWN: 'Hà Nội',
    TERRITORY_NAME: 'Vô Cực Lãnh', SYSTEM_NAME: 'Lãnh Chúa Vô Hạn System',
    ANTAGONIST_KINGDOM: 'Hắc Long Quốc', ANCIENT_DEMON: 'Cổ Ma Vương',
    HERO_RECRUIT: 'Thánh Kỵ Sĩ Arthur', COMPANION_NAME: 'Elaine',
    CONTINENT_NAME: 'Aetheria', ENDING_GOAL: 'Cosmic Lord overlord',
  },
  'linh-di-folk-horror-coroner': {
    MC_NAME: 'Cố Diệp', MC_FAMILY: 'Cố', HOMETOWN: 'Cố thị làng',
    ANCESTOR_NAME: 'Cố Tổ', LINEAGE_NAME: 'Cố thị Âm Dương',
    SIGNATURE_TOOL: 'Tử La Bàn', ANTAGONIST_LINEAGE: 'Hắc Liên giáo',
    ANCIENT_EVIL: 'Cửu U Tà Đế', COMPANION_NAME: 'Tô Linh',
    CITY_NAME: 'Lâm An phủ', ENDING_GOAL: 'Thiên sư cosmic guardian',
  },
  'mat-the-doomsday-hoarder': {
    MC_NAME: 'Trần Phong', MC_FAMILY: 'Trần', HOMETOWN: 'Hà Nội',
    DOOMSDAY_DATE: '20/6/2025', SAFE_ZONE_NAME: 'Vô Cực Cứ Điểm',
    ANTAGONIST_FACTION: 'Hắc Long Hội', COSMIC_THREAT: 'Cổ Ma Tinh Tộc',
    COMPANION_NAME: 'Tô Linh', CITY_NAME: 'Sài Gòn',
    ENDING_GOAL: 'Cosmic Guardian + nhân loại reborn',
  },
  'kiem-hiep-sword-saint': {
    MC_NAME: 'Lý Tiêu Dao', MC_FAMILY: 'Lý', HOMETOWN: 'Lâm An phủ',
    SECT_NAME: 'Thanh Vân Phái', SIGNATURE_SWORD: 'Cửu Kiếm Quyết',
    ANTAGONIST_SECT: 'Hắc Long Bang', ANCIENT_DEMON: 'Vạn Cổ Ma Tổ',
    LIFE_PARTNER: 'Tô Linh', LOYAL_FRIEND: 'Trương Khải',
    JIANGHU_REGION: 'Trung Nguyên', ENDING_GOAL: 'Kiếm thánh đỉnh + võ lâm minh chủ',
  },
  'ngon-tinh-ceo-soft': {
    FEMALE_MC: 'Tô Tử Linh', FEMALE_MC_FAMILY: 'Tô',
    MALE_MC: 'Trần Mộ Dao', MALE_MC_FAMILY: 'Trần',
    COMPANY_NAME: 'Mộ Dao Tập Đoàn', HOMETOWN: 'Hà Nội', CITY_NAME: 'Sài Gòn',
    RIVAL_LOVER: 'Lý Vy', INTERFERING_FAMILY: 'Lý gia',
    PAST_TRAUMA: 'MC bị fiancé phản bội năm 18', ENDING_GOAL: 'vợ chồng bá đạo + family empire stable',
  },
  'quan-truong-modern-bureaucrat': {
    MC_NAME: 'Trần Văn Minh', MC_FAMILY: 'Trần', HOMETOWN: 'Hà Tĩnh — xã Vĩnh Lộc',
    PROVINCE_NAME: 'Hà Tĩnh', CAPITAL_CITY: 'Hà Nội',
    ANTAGONIST_FAMILY: 'Lý phái', CORRUPT_OFFICIAL: 'Hoàng X',
    LIFE_PARTNER: 'Phạm Lan', REFORM_BANNER: 'Thanh Liêm Tân Chính',
    LOYAL_FRIEND: 'Trương Đại', COUNTRY_NAME: 'Việt Nam',
    ENDING_GOAL: 'Tổng bí thư + cải cách quốc gia thành công',
  },
  'tien-hiep-pham-nhan-slow-burn': {
    MC_NAME: 'Hàn Lập', MC_FAMILY: 'Hàn', HOMETOWN: 'Bảy Tinh Trấn',
    SECT_NAME: 'Hoàng Phong Cốc', SECT_REGION: 'Đông Nhạc',
    LOW_RIVAL_NAME: 'Mặc Đại Vũ', MID_RIVAL_NAME: 'Vương Hư', HIGH_RIVAL_NAME: 'Hắc Sơn Lão Tổ',
    SIGNATURE_TECHNIQUE: 'Đại Diễn Quyết', HIDDEN_TREASURE: 'Hồ Lô Tổ Tiên',
    COMPANION_NAME: 'Mặc Lan Sương', ENDING_GOAL: 'phi thăng tiên giới',
  },
  'tien-hiep-lao-to-simulator': {
    MC_NAME: 'Lăng Hoàn Tổ', MC_TITLE: 'Vạn Cổ Tổ', SECT_NAME: 'Vạn Cổ Tông',
    FIRST_DISCIPLE_NAME: 'Lăng Phong', FAVORITE_GENERATION: 'gen 7',
    ANCIENT_ENEMY: 'Hắc Hoàn Đế Tổ', COMPANION_NAME: 'Sương Ngọc Tổ',
    ENDING_GOAL: 'Vạn Cổ tổ peak + đại lục cosmic peace',
  },
  'do-thi-thap-nien-80': {
    MC_NAME: 'Trần Đông Hải', MC_FAMILY: 'Trần', HOMETOWN: 'Hà Tĩnh',
    REBIRTH_YEAR: '1992', DECADE_2: 'cuối 1990s', DECADE_3: '2005', DECADE_4: '2010',
    DECADE_5: '2015', DECADE_6: '2020',
    ANTAGONIST_FAMILY: 'Lý phái', COMPETITION_BRAND: 'Đại Phát',
    LIFE_PARTNER: 'Phạm Lan', COUNTRY_NAME: 'Việt Nam',
    ENDING_GOAL: 'tài phiệt #1 thế giới',
  },
  'do-thi-than-hao-system': {
    MC_NAME: 'Lý Phong', MC_FAMILY: 'Lý', HOMETOWN: 'Sài Gòn',
    COUNTRY_NAME: 'Việt Nam', ANTAGONIST_FAMILY: 'Trần phái',
    LIFE_PARTNER: 'Phạm Lan Anh', ENDING_GOAL: 'cosmic-tier philanthropist',
  },
  'do-thi-trong-sinh-phuc-thu': {
    MC_NAME: 'Trần Đông', MC_FAMILY: 'Trần', HOMETOWN: 'Hà Nội',
    COUNTRY_NAME: 'Việt Nam',
    TRAITOR_FRIEND: 'Lý Khang', TRAITOR_FIANCEE: 'Phạm Vi', TRAITOR_BOSS: 'Hoàng Đại Lão',
    LIFE_PARTNER_REAL: 'Nguyễn Lan Anh', REVENGE_MODE: 'active',
    ENDING_GOAL: 'tài phiệt #1 + cosmic philanthropist',
  },
  'huyen-huyen-hac-am-villain': {
    MC_NAME: 'Mặc Hắc Ảnh', MC_FAMILY: 'Mặc',
    TA_PHAI_NAME: 'Hắc Liên giáo',
    COMPANION_NAME: 'Cô Cô Hắc Sương', ENDING_GOAL: 'Tà Đạo Đại Đế cosmic peak',
  },
  'huyen-huyen-mo-phong-gacha': {
    MC_NAME: 'Lý Toán Tử', MC_FAMILY: 'Lý',
    SIMULATOR_NAME: 'Vạn Đạo Mô Phỏng Bàn', SECT_NAME: 'Cổ Đạo Tông',
    COMPANION_NAME: 'Lăng Sương', ENDING_GOAL: 'vạn giới Đại Đạo Tổ',
  },
  'lich-su-tuong-quan-chinh-chien': {
    MC_NAME: 'Triệu Tử Long', MC_FAMILY: 'Triệu', DYNASTY_NAME: 'Đại Đường', CAPITAL_CITY: 'Trường An',
    ANTAGONIST_FAMILY: 'Tần', FOREIGN_ENEMY: 'Đột Quyết', LOYAL_OFFICER: 'Trần Khánh Dư',
    ENDING_GOAL: 'đại đế thống nhất thiên hạ',
  },
  'khoa-huyen-tinh-te-galactic': {
    MC_NAME: 'Lý Tinh Vũ', MC_FAMILY: 'Lý',
    COMPANION_NAME: 'Tô Linh', LOW_RIVAL: 'Hắc Vũ', ANTAGONIST_CORP: 'Hắc Tinh Corp',
    ENDING_GOAL: 'multi-galaxy emperor + cosmic peace',
  },
  'dong-nhan-naruto-system': {
    MC_NAME: 'Trục Vũ', VILLAGE_NAME: 'Konoha', CANON_MENTOR: 'Hatake Kakashi',
    FAVORITE_CHARACTER: 'Uchiha Itachi', COMPANION_NAME: 'Hayate Tsuki',
    ENDING_GOAL: 'multi-canon shinobi cosmic peace',
  },
  'vong-du-toan-dan-chuyen-chuc': {
    MC_NAME: 'Lý Phong', MC_FAMILY: 'Lý', HOMETOWN: 'Hà Nội', COUNTRY_NAME: 'Việt Nam',
    HIDDEN_CLASS: 'Vô Hạn Sword Saint', NATIONAL_RIVAL: 'Hắc Vũ',
    COMPANION_NAME: 'Tô Linh', ENDING_GOAL: 'cosmic-tier divine class + multi-realm peace',
  },
  'linh-di-quy-tac-quai-dam': {
    MC_NAME: 'Trần Vũ', MC_FAMILY: 'Trần',
    COMPANION_NAME: 'Tô Linh', ANTAGONIST_NPC: 'Hắc Y NPC',
    ENDING_GOAL: 'system escape + true freedom',
  },
  'mat-the-thien-tai-trong-cay': {
    MC_NAME: 'Lý Hân', MC_FAMILY: 'Lý', HOMETOWN: 'Hà Tĩnh',
    ANTAGONIST_FACTION: 'Hắc Long Hội', COMPANION_NAME: 'Tô Linh',
    ENDING_GOAL: 'đại lục cooperation peace + nhân loại reborn',
  },
  'ngon-tinh-trong-sinh-phuc-thu': {
    FEMALE_MC: 'Tô Tử Linh', FEMALE_MC_FAMILY: 'Tô', HOMETOWN: 'Hà Nội', COUNTRY_NAME: 'Việt Nam',
    TRAITOR_FEMALE: 'Lý Vy', TRAITOR_HUSBAND: 'Trần Hắc', TRAITOR_FAMILY: 'Lý gia',
    TRUE_LOVE: 'Nguyễn Minh', REVENGE_MODE: 'active',
    ENDING_GOAL: 'vợ chồng bá đạo + family empire stable + cosmic peace',
  },
  'ngon-tinh-khoai-xuyen': {
    FEMALE_MC: 'Tô Linh', FEMALE_MC_FAMILY: 'Tô',
    ENDING_GOAL: 'system escape + chọn world favorite to retire với male lead',
  },
  'faloo-quoc-van-prompt': {
    MC_NAME: 'Lý Phong', MC_FAMILY: 'Lý', HOMETOWN: 'Sài Gòn', COUNTRY_NAME: 'Việt Nam',
    ANTAGONIST_NPC: 'Hắc Vũ', COMPANION_NAME: 'Tô Linh',
    ENDING_GOAL: 'cosmic-tier prompt master + multi-realm peace',
  },
  'faloo-tong-man-reaction': {
    MC_NAME: 'Diệp Phong', COMPANION_NAME: 'Tô Linh',
    ENDING_GOAL: 'cosmic author tier + multi-canon peace',
  },
  'huyen-huyen-occult-steampunk': {
    MC_NAME: 'Chu Minh Thụy', MC_FAMILY: 'Chu', CITY_NAME: 'Bắc Ngạn',
    ORDER_NAME: 'Đêm Thánh Đoàn', ANTAGONIST_NPC: 'Aurora Order leader',
    COMPANION_NAME: 'Audrey', ENDING_GOAL: 'Sequence 0 Divinity guardian',
  },
  'tien-hiep-meta-comedy': {
    MC_NAME: 'Lý Phong', MC_FAMILY: 'Lý', HOMETOWN: 'Lâm An phủ',
    FAKE_ORG_NAME: 'Vạn Cổ Thiên Đạo Tông', FIRST_FOLLOWER_NAME: 'Tiểu Lý',
    COMPANION_NAME: 'Tô Linh',
    ENDING_GOAL: 'cosmic comedic peak + multi-realm tu tiên peace',
  },
  'lich-su-coroner-mystery': {
    MC_NAME: 'Hứa Thất An', MC_FAMILY: 'Hứa', CAPITAL_CITY: 'Đại Phụng',
    DYNASTY_NAME: 'Đại Phụng', INSTITUTION_NAME: 'Đả Canh Tự',
    ANTAGONIST_FAMILY: 'Nguỵ', COMPANION_NAME: 'Trần Hữu',
    ENDING_GOAL: 'Tổ tỳ + triều đường an',
  },
  'khoa-huyen-time-loop-thriller': {
    MC_NAME: 'Lý Vinh', MC_FAMILY: 'Lý', CITY_NAME: 'Bắc Kinh',
    ORGANIZATION_NAME: 'Thiên Tài Câu Lạc Bộ', ADVERSARY_NAME: 'Tổ Thời Gian Đế',
    COMPANION_NAME: 'Tô Linh',
    ENDING_GOAL: 'Loop closed + multi-realm peace',
  },
  'ngon-tinh-ma-giap-reveal': {
    FEMALE_MC: 'Tô Tô', FEMALE_MC_FAMILY: 'Tô', HOMETOWN: 'Hà Nội', COUNTRY_NAME: 'Việt Nam',
    MALE_LEAD: 'Trần Mộ Dao', RIVAL_FEMALE: 'Lý Vy', RIVAL_MALE: 'Hắc Vũ',
    ENDING_GOAL: 'cosmic-tier family empire + wedding + all mã giáp revealed warmly',
  },
  'ngon-tinh-co-ngon-trach-dau': {
    FEMALE_MC: 'Tô Nhược', FEMALE_MC_FAMILY: 'Tô', FAMILY_NAME: 'Tô gia',
    DYNASTY_NAME: 'Đại Đường', MALE_LEAD: 'Lý Mộ Bạch',
    ENDING_GOAL: 'Hoàng hậu + thái tử kế thừa + thiên hạ thái bình',
  },
  'do-thi-y-te-he-thong': {
    MC_NAME: 'Lý Tinh Vũ', MC_FAMILY: 'Lý',
    HOSPITAL_NAME: 'Bệnh viện 108 Hà Nội', COUNTRY_NAME: 'Việt Nam',
    COMPANION_NAME: 'Tô Linh', LIFE_PARTNER: 'Phạm Lan',
    ENDING_GOAL: 'Nobel + cosmic medical pioneer + retire to teach',
  },
  'cozy-fantasy-slice-of-life': {
    MC_NAME: 'Lan', SHOP_NAME: 'Bakery Ánh Sáng', VILLAGE_NAME: 'Cây Trắc Bá',
    COMPANION_NAME: 'Mèo Sương',
    ENDING_GOAL: 'Shop legacy + multi-kingdom community + peaceful retirement',
  },
  'cozy-sci-fi-space-bakery': {
    MC_NAME: 'Lin', SHOP_NAME: 'Space Bakery Ánh Sao',
    STATION_NAME: 'Trạm Vũ Trụ Aurora', COMPANION_NAME: 'AURA-7 AI',
    ENDING_GOAL: 'Multi-galaxy shop legacy + peaceful retirement',
  },
  'di-gioi-mushoku-slow-growth': {
    MC_NAME: 'Rudeus', MC_FAMILY: 'Greyrat', HOMETOWN: 'Buena Village',
    COMPANION_NAME: 'Eris', LIFE_PARTNER: 'Sylphiette',
    ENDING_GOAL: 'Legacy + peaceful death + apprentice inheritance',
  },
  'romantasy-thriller-hybrid': {
    FEMALE_MC: 'Aria Stormwind', LOVE_INTEREST: 'Lord Castor',
    CITY_NAME: 'Argentum', KINGDOM_NAME: 'Kingdom of Silverhold',
    ENDING_GOAL: 'Kingdom peace + cosmic conspiracy defeated + happy ending với love',
  },
};

const minimalTemplate: TemplateBlueprint = {
  templateId: 'test-minimal',
  description: 'minimal test',
  genre: 'tien-hiep',
  totalChapters: 5,
  arcs: [
    {
      arc: {
        arcNumber: 1,
        range: [1, 5],
        theme: '{{HERO}} on {{WORLD}}',
        corePayoff: '{{HERO}} wins',
        subArcs: [{ number: 1, range: [1, 5], theme: '{{HERO}} setup', payoff: '{{HERO}} ready' }],
      },
      briefs: Array.from({ length: 5 }, (_, i) => ({
        n: i + 1,
        beat: 'setup' as const,
        goal: '{{HERO}} explores {{WORLD}}',
        payoff: '{{HERO}} grows',
        cast: ['{{HERO}}'],
        scenes: ['{{HERO}} arrives at {{WORLD}}'],
        mcBenefit: 'tài nguyên ban đầu',
      })),
    },
  ],
  requiredVars: ['HERO', 'WORLD'],
  optionalVars: { TONE: 'lạnh đạm' },
};

describe('instantiateTemplate', () => {
  it('replaces {{TOKEN}} placeholders with vars throughout the blueprint', () => {
    const novel = instantiateTemplate(minimalTemplate, {
      novelId: 'test-novel',
      title: 'Test Novel',
      slug: 'test-novel',
      vars: { HERO: 'Lý Trường Sinh', WORLD: 'Cửu Châu' },
    });

    expect(novel.id).toBe('test-novel');
    expect(novel.title).toBe('Test Novel');
    expect(novel.arcs[0].arc.theme).toBe('Lý Trường Sinh on Cửu Châu');
    expect(novel.arcs[0].arc.corePayoff).toBe('Lý Trường Sinh wins');
    expect(novel.arcs[0].briefs[0].goal).toBe('Lý Trường Sinh explores Cửu Châu');
    expect(novel.arcs[0].briefs[0].cast).toEqual(['Lý Trường Sinh']);
  });

  it('throws when a required var is missing', () => {
    expect(() =>
      instantiateTemplate(minimalTemplate, {
        novelId: 'x',
        title: 'X',
        slug: 'x',
        vars: { HERO: 'A' }, // missing WORLD
      }),
    ).toThrow(/requires vars: WORLD/);
  });

  it('throws when an unknown var is supplied (catches typos)', () => {
    expect(() =>
      instantiateTemplate(minimalTemplate, {
        novelId: 'x',
        title: 'X',
        slug: 'x',
        vars: { HERO: 'A', WORLD: 'B', WROLD: 'typo' },
      }),
    ).toThrow(/unknown vars: WROLD/);
  });

  it('uses optionalVar default when not overridden', () => {
    const tpl: TemplateBlueprint = {
      ...minimalTemplate,
      arcs: [
        {
          arc: { ...minimalTemplate.arcs[0].arc, theme: '{{HERO}} {{TONE}}' },
          briefs: minimalTemplate.arcs[0].briefs,
        },
      ],
    };
    const novel = instantiateTemplate(tpl, {
      novelId: 'x',
      title: 'X',
      slug: 'x',
      vars: { HERO: 'A', WORLD: 'B' },
    });
    expect(novel.arcs[0].arc.theme).toBe('A lạnh đạm');
  });

  it('throws when a placeholder leaks through (uses var not in vars or optionalVars)', () => {
    const leaky: TemplateBlueprint = {
      ...minimalTemplate,
      arcs: [
        {
          arc: { ...minimalTemplate.arcs[0].arc, theme: '{{HERO}} {{LEAK_TOKEN}}' },
          briefs: minimalTemplate.arcs[0].briefs,
        },
      ],
    };
    expect(() =>
      instantiateTemplate(leaky, {
        novelId: 'x',
        title: 'X',
        slug: 'x',
        vars: { HERO: 'A', WORLD: 'B' },
      }),
    ).toThrow(/placeholders with no replacement: LEAK_TOKEN/);
  });
});

describe('findUsedPlaceholders', () => {
  it('returns sorted unique placeholder tokens used in the template', () => {
    const found = findUsedPlaceholders(minimalTemplate);
    expect(found).toContain('HERO');
    expect(found).toContain('WORLD');
  });
});

describe('TIEN_HIEP_RETURNING_EXPERT_TEMPLATE end-to-end', () => {
  it('declares all placeholders it actually uses', () => {
    const used = findUsedPlaceholders(TIEN_HIEP_RETURNING_EXPERT_TEMPLATE);
    const declared = new Set([
      ...TIEN_HIEP_RETURNING_EXPERT_TEMPLATE.requiredVars,
      ...Object.keys(TIEN_HIEP_RETURNING_EXPERT_TEMPLATE.optionalVars || {}),
    ]);
    const undeclared = used.filter((t) => !declared.has(t));
    expect(undeclared).toEqual([]);
  });

  it('instantiates into a concrete 1000-chapter NovelBlueprint with no leaked placeholders', () => {
    const novel = instantiateTemplate(TIEN_HIEP_RETURNING_EXPERT_TEMPLATE, {
      novelId: 'sample-tien-hiep',
      title: 'Sample Tien Hiệp',
      slug: 'sample-tien-hiep',
      vars: {
        MC_NAME: 'Lý Trường Sinh',
        MC_FAMILY: 'Lý',
        HOMETOWN: 'Vân Châu Thành',
        SECT_NAME: 'Thanh Vân Tông',
        ANTAGONIST_FAMILY: 'Vương',
        SIGNATURE_PILL: 'Thanh Linh Đan',
        SIGNATURE_TECHNIQUE: 'Tử Tiêu Lôi Quyết',
        HIDDEN_REALM: 'Thái Hư Cổ Vực',
        ANCIENT_ENEMY: 'Thiên Ma Tổ',
        WORLD_NAME: 'Cửu Châu Đại Lục',
        DAOIST_COMPANION: 'Tô Vân Linh',
        ENDING_GOAL: 'phi thăng tiên giới',
      },
    });

    // Total chapters
    expect(novel.totalChapters).toBe(1000);
    const totalBriefs = novel.arcs.reduce((sum, a) => sum + a.briefs.length, 0);
    expect(totalBriefs).toBe(1000);

    // Arc count
    expect(novel.arcs.length).toBe(7);

    // No leaked placeholders anywhere
    const json = JSON.stringify(novel);
    expect(json).not.toMatch(/\{\{[A-Z_][A-Z0-9_]*\}\}/);

    // Verify token replacement happened
    expect(novel.arcs[3].arc.theme).toContain('Cửu Châu Đại Lục');
    expect(novel.arcs[6].arc.theme).toContain('phi thăng tiên giới');

    // Cosmic threshold preserved
    expect(novel.cosmicArcStartChapter).toBe(701);
  });
});

describe('DO_THI_REBORN_GENIUS_TEMPLATE end-to-end', () => {
  it('declares all placeholders it actually uses', () => {
    const used = findUsedPlaceholders(DO_THI_REBORN_GENIUS_TEMPLATE);
    const declared = new Set([
      ...DO_THI_REBORN_GENIUS_TEMPLATE.requiredVars,
      ...Object.keys(DO_THI_REBORN_GENIUS_TEMPLATE.optionalVars || {}),
    ]);
    const undeclared = used.filter((t) => !declared.has(t));
    expect(undeclared).toEqual([]);
  });

  it('instantiates into 1000-chapter NovelBlueprint with no leaked placeholders', () => {
    const novel = instantiateTemplate(DO_THI_REBORN_GENIUS_TEMPLATE, {
      novelId: 'sample-do-thi',
      title: 'Sample Đô Thị',
      slug: 'sample-do-thi',
      vars: {
        MC_NAME: 'Trần Đông Hải',
        MC_FAMILY: 'Trần',
        HOMETOWN: 'Hà Nội',
        CITY_NAME: 'Sài Gòn',
        STARTING_BUSINESS: 'quán net',
        SIGNATURE_VENTURE: 'platform e-commerce',
        ANTAGONIST_FAMILY: 'Lý',
        COMPETITION_BRAND: 'Đại Phát Tập Đoàn',
        LIFE_PARTNER: 'Nguyễn Lan Anh',
        COUNTRY_NAME: 'Việt Nam',
        REBIRTH_YEAR: 'năm 2000',
        REBIRTH_FROM_YEAR: 'năm 2026',
        ENDING_GOAL: 'tài phiệt số 1 thế giới',
      },
    });

    expect(novel.totalChapters).toBe(1000);
    expect(novel.arcs.length).toBe(7);
    const totalBriefs = novel.arcs.reduce((sum, a) => sum + a.briefs.length, 0);
    expect(totalBriefs).toBe(1000);
    expect(JSON.stringify(novel)).not.toMatch(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
    expect(novel.genre).toBe('do-thi');
  });
});

describe('HUYEN_HUYEN_BLOODLINE_TEMPLATE end-to-end', () => {
  it('declares all placeholders it actually uses', () => {
    const used = findUsedPlaceholders(HUYEN_HUYEN_BLOODLINE_TEMPLATE);
    const declared = new Set([
      ...HUYEN_HUYEN_BLOODLINE_TEMPLATE.requiredVars,
      ...Object.keys(HUYEN_HUYEN_BLOODLINE_TEMPLATE.optionalVars || {}),
    ]);
    const undeclared = used.filter((t) => !declared.has(t));
    expect(undeclared).toEqual([]);
  });

  it('instantiates into 1000-chapter NovelBlueprint with no leaked placeholders', () => {
    const novel = instantiateTemplate(HUYEN_HUYEN_BLOODLINE_TEMPLATE, {
      novelId: 'sample-huyen-huyen',
      title: 'Sample Huyền Huyễn',
      slug: 'sample-huyen-huyen',
      vars: {
        MC_NAME: 'Tiêu Diệp',
        MC_FAMILY: 'Tiêu',
        HOMETOWN: 'Tiêu Gia trấn',
        CONTINENT_NAME: 'Đẩu Khí Đại Lục',
        BLOODLINE_NAME: 'Phượng Hoàng huyết',
        ANCESTOR_NAME: 'Phượng Tổ',
        ANTAGONIST_FAMILY: 'Vân Lan tông',
        ANCIENT_ENEMY: 'Hắc Ám Cổ Đế',
        SIGNATURE_TECHNIQUE: 'Phần Quyết Cửu Tầng',
        ACADEMY_NAME: 'Cổ Hà Học Viện',
        COMPANION_NAME: 'Tiêu Huân',
        ENDING_GOAL: 'Võ Thần đỉnh',
      },
    });

    expect(novel.totalChapters).toBe(1000);
    expect(novel.arcs.length).toBe(7);
    const totalBriefs = novel.arcs.reduce((sum, a) => sum + a.briefs.length, 0);
    expect(totalBriefs).toBe(1000);
    expect(JSON.stringify(novel)).not.toMatch(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
    expect(novel.genre).toBe('huyen-huyen');
  });
});

describe.each([
  ['lich-su-xuyen-quan-truong', LICH_SU_QUAN_TRUONG_TEMPLATE, 'lich-su'],
  ['khoa-huyen-tech-fusion', KHOA_HUYEN_TECH_FUSION_TEMPLATE, 'khoa-huyen'],
  ['dong-nhan-author-rewrite', DONG_NHAN_REWRITE_TEMPLATE, 'dong-nhan'],
  ['vong-du-top-player-rebirth', VONG_DU_TOP_PLAYER_TEMPLATE, 'vong-du'],
  ['di-gioi-lord-builder', DI_GIOI_LORD_BUILDER_TEMPLATE, 'di-gioi'],
  ['linh-di-folk-horror-coroner', LINH_DI_CORONER_TEMPLATE, 'linh-di'],
  ['mat-the-doomsday-hoarder', MAT_THE_HOARDER_TEMPLATE, 'mat-the'],
  ['kiem-hiep-sword-saint', KIEM_HIEP_SWORD_SAINT_TEMPLATE, 'kiem-hiep'],
  ['ngon-tinh-ceo-soft', NGON_TINH_CEO_SOFT_TEMPLATE, 'ngon-tinh'],
  ['quan-truong-modern-bureaucrat', QUAN_TRUONG_BUREAUCRAT_TEMPLATE, 'quan-truong'],
  ['tien-hiep-pham-nhan-slow-burn', TIEN_HIEP_PHAM_NHAN_TEMPLATE, 'tien-hiep'],
  ['tien-hiep-lao-to-simulator', TIEN_HIEP_LAO_TO_TEMPLATE, 'tien-hiep'],
  ['do-thi-thap-nien-80', DO_THI_THAP_NIEN_TEMPLATE, 'do-thi'],
  ['do-thi-than-hao-system', DO_THI_THAN_HAO_TEMPLATE, 'do-thi'],
  ['do-thi-trong-sinh-phuc-thu', DO_THI_PHUC_THU_TEMPLATE, 'do-thi'],
  ['huyen-huyen-hac-am-villain', HUYEN_HUYEN_HAC_AM_TEMPLATE, 'huyen-huyen'],
  ['huyen-huyen-mo-phong-gacha', HUYEN_HUYEN_MO_PHONG_TEMPLATE, 'huyen-huyen'],
  ['lich-su-tuong-quan-chinh-chien', LICH_SU_TUONG_QUAN_TEMPLATE, 'lich-su'],
  ['khoa-huyen-tinh-te-galactic', KHOA_HUYEN_TINH_TE_TEMPLATE, 'khoa-huyen'],
  ['dong-nhan-naruto-system', DONG_NHAN_NARUTO_TEMPLATE, 'dong-nhan'],
  ['vong-du-toan-dan-chuyen-chuc', VONG_DU_TOAN_DAN_TEMPLATE, 'vong-du'],
  ['linh-di-quy-tac-quai-dam', LINH_DI_QUY_TAC_TEMPLATE, 'linh-di'],
  ['mat-the-thien-tai-trong-cay', MAT_THE_THIEN_TAI_TEMPLATE, 'mat-the'],
  ['ngon-tinh-trong-sinh-phuc-thu', NGON_TINH_PHUC_THU_TEMPLATE, 'ngon-tinh'],
  ['ngon-tinh-khoai-xuyen', NGON_TINH_KHOAI_XUYEN_TEMPLATE, 'ngon-tinh'],
  ['faloo-quoc-van-prompt', FALOO_QUOC_VAN_TEMPLATE, 'do-thi'],
  ['faloo-tong-man-reaction', FALOO_TONG_MAN_TEMPLATE, 'dong-nhan'],
  ['huyen-huyen-occult-steampunk', HUYEN_HUYEN_OCCULT_TEMPLATE, 'huyen-huyen'],
  ['tien-hiep-meta-comedy', TIEN_HIEP_META_COMEDY_TEMPLATE, 'tien-hiep'],
  ['lich-su-coroner-mystery', LICH_SU_CORONER_TEMPLATE, 'lich-su'],
  ['khoa-huyen-time-loop-thriller', KHOA_HUYEN_TIME_LOOP_TEMPLATE, 'khoa-huyen'],
  ['ngon-tinh-ma-giap-reveal', NGON_TINH_MA_GIAP_TEMPLATE, 'ngon-tinh'],
  ['ngon-tinh-co-ngon-trach-dau', NGON_TINH_CO_NGON_TEMPLATE, 'ngon-tinh'],
  ['do-thi-y-te-he-thong', DO_THI_Y_TE_TEMPLATE, 'do-thi'],
  ['cozy-fantasy-slice-of-life', COZY_FANTASY_TEMPLATE, 'di-gioi'],
  ['cozy-sci-fi-space-bakery', COZY_SCIFI_TEMPLATE, 'khoa-huyen'],
  ['di-gioi-mushoku-slow-growth', DI_GIOI_MUSHOKU_TEMPLATE, 'di-gioi'],
  ['romantasy-thriller-hybrid', ROMANTASY_THRILLER_TEMPLATE, 'huyen-huyen'],
])('%s end-to-end', (templateId, template, expectedGenre) => {
  it('declares all placeholders it actually uses', () => {
    const used = findUsedPlaceholders(template);
    const declared = new Set([
      ...template.requiredVars,
      ...Object.keys(template.optionalVars || {}),
    ]);
    const undeclared = used.filter((t) => !declared.has(t));
    expect(undeclared).toEqual([]);
  });

  it('instantiates into 1000-chapter NovelBlueprint with no leaked placeholders', () => {
    const vars = SAMPLE_VARS[templateId];
    expect(vars).toBeDefined();
    const novel = instantiateTemplate(template, {
      novelId: `sample-${templateId}`,
      title: `Sample ${templateId}`,
      slug: `sample-${templateId}`,
      vars,
    });

    expect(novel.totalChapters).toBe(1000);
    expect(novel.arcs.length).toBe(7);
    const totalBriefs = novel.arcs.reduce((sum, a) => sum + a.briefs.length, 0);
    expect(totalBriefs).toBe(1000);
    expect(JSON.stringify(novel)).not.toMatch(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
    expect(novel.genre).toBe(expectedGenre);
  });
});
