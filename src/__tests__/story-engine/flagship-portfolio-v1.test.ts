import { readFileSync } from 'fs';
import path from 'path';
import {
  FLAGSHIP_FIRST_30_MANIFEST,
  FLAGSHIP_MARKET_RESEARCH_V1,
} from '@/services/story-engine/flagship/portfolio-data';
import {
  FlagshipSetupBriefV2Schema,
  validatePortfolioResearch,
} from '@/services/story-engine/flagship';

describe('flagship first-30 portfolio', () => {
  const validated = validatePortfolioResearch(FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1);

  it('locks the 30-story allocation and 30-to-9 cohort', () => {
    const slots = validated.manifest.slots;
    expect(slots).toHaveLength(30);
    expect(slots.filter(slot => slot.audience === 'male')).toHaveLength(30);
    expect(slots.every(slot => /^(HX|TH|DT)-\d{2}$/.test(slot.slotId))).toBe(true);
    expect(slots.filter(slot => slot.portfolioGroup === 'fantasy')).toHaveLength(12);
    expect(slots.filter(slot => slot.portfolioGroup === 'urban_era_dual_world')).toHaveLength(18);
    expect(slots.filter(slot => slot.promotionCohort === 'opening_tournament')).toHaveLength(9);
  });

  it('keeps all lanes and causal fingerprints distinct', () => {
    const slots = validated.manifest.slots;
    expect(new Set(slots.map(slot => slot.genreLane)).size).toBe(30);
    expect(new Set(slots.map(slot => slot.distinctnessFingerprint)).size).toBe(30);
  });

  it('uses the bounded advantage mix instead of one universal setup', () => {
    const counts = validated.manifest.slots.reduce<Record<string, number>>((result, slot) => {
      result[slot.advantageFamily] = (result[slot.advantageFamily] || 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({ native: 11, bounded_system: 3, transmigration: 4, rebirth: 6, simulation_loop: 2, script_awareness: 2, dual_world: 2 });
  });

  it('gives every selected lane source-backed upstream cards', () => {
    const cards = new Map(validated.registry.cards.map(card => [card.id, card]));
    for (const slot of validated.manifest.slots) {
      for (const cardId of slot.laneCardIds) {
        expect(cards.get(cardId)?.sourceIds.length).toBeGreaterThanOrEqual(3);
        expect(cards.get(cardId)).toMatchObject({ usage: 'upstream_concept_lab_only', mustNeverReachWriter: true });
      }
    }
  });

  it('forbids portfolio and market-card modules from the chapter role prompts', () => {
    const prompts = readFileSync(path.join(process.cwd(), 'src/services/story-engine/flagship/prompts.ts'), 'utf8');
    expect(prompts).not.toContain("from './portfolio'");
    expect(prompts).not.toContain("from './portfolio-data'");
    expect(prompts).not.toContain('MARKET_CARD');
    expect(prompts).not.toContain('PORTFOLIO_SLOT');
  });

  it('keeps the two old pilot briefs as lab references outside the first 30', () => {
    for (const directory of ['flagship-coastal-era-pilot', 'flagship-urban-business-pilot']) {
      const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'blueprints', directory, 'setup-brief-v2.json'), 'utf8'));
      const brief = FlagshipSetupBriefV2Schema.parse(raw);
      expect(brief.promotionCohort).toBe('lab_reference');
    }
  });

  it('has no production mutation in the preparation commands', () => {
    const promote = readFileSync(path.join(process.cwd(), 'scripts/flagship-portfolio-promote.ts'), 'utf8');
    expect(promote).toContain('databaseWrites: 0');
    expect(promote).toContain('SETUP_BLOCKED');
    expect(promote).not.toContain('getSupabase');
  });
});
