import { FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1 } from '../src/services/story-engine/flagship/portfolio-data';
import { validatePortfolioResearch } from '../src/services/story-engine/flagship/portfolio';

const { manifest, registry } = validatePortfolioResearch(FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1);
const count = (key: 'audience' | 'portfolioGroup' | 'advantageFamily' | 'promotionCohort') =>
  manifest.slots.reduce<Record<string, number>>((result, slot) => {
    result[slot[key]] = (result[slot[key]] || 0) + 1;
    return result;
  }, {});

console.log(JSON.stringify({
  portfolioId: manifest.portfolioId,
  valid: true,
  totalSlots: manifest.slots.length,
  cards: registry.cards.length,
  datedSources: registry.sources.length,
  quotas: {
    audience: count('audience'),
    groups: count('portfolioGroup'),
    advantages: count('advantageFamily'),
    cohorts: count('promotionCohort'),
  },
  openingTournament: manifest.slots
    .filter(slot => slot.promotionCohort === 'opening_tournament')
    .map(slot => ({ slotId: slot.slotId, label: slot.workingLabel, genreLane: slot.genreLane })),
  productionMutation: false,
}, null, 2));
