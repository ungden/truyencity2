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
import { DO_THI_REBORN_GENIUS_TEMPLATE } from '../../../blueprints/_templates/do-thi-modern-reborn-genius';
import { HUYEN_HUYEN_BLOODLINE_TEMPLATE } from '../../../blueprints/_templates/huyen-huyen-bloodline-war';
import { LICH_SU_QUAN_TRUONG_TEMPLATE } from '../../../blueprints/_templates/lich-su-xuyen-quan-truong';
import { KHOA_HUYEN_TECH_FUSION_TEMPLATE } from '../../../blueprints/_templates/khoa-huyen-tech-fusion';
import { DONG_NHAN_REWRITE_TEMPLATE } from '../../../blueprints/_templates/dong-nhan-author-rewrite';
import { VONG_DU_TOP_PLAYER_TEMPLATE } from '../../../blueprints/_templates/vong-du-top-player-rebirth';
import { DI_GIOI_LORD_BUILDER_TEMPLATE } from '../../../blueprints/_templates/di-gioi-lord-builder';
import { LINH_DI_CORONER_TEMPLATE } from '../../../blueprints/_templates/linh-di-folk-horror-coroner';
import { MAT_THE_HOARDER_TEMPLATE } from '../../../blueprints/_templates/mat-the-doomsday-hoarder';
import { KIEM_HIEP_SWORD_SAINT_TEMPLATE } from '../../../blueprints/_templates/kiem-hiep-sword-saint';
import { NGON_TINH_CEO_SOFT_TEMPLATE } from '../../../blueprints/_templates/ngon-tinh-ceo-soft';
import { QUAN_TRUONG_BUREAUCRAT_TEMPLATE } from '../../../blueprints/_templates/quan-truong-modern-bureaucrat';

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
