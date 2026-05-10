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
