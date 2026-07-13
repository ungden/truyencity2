import { FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1 } from '../src/services/story-engine/flagship/portfolio-data';
import { validatePortfolioResearch } from '../src/services/story-engine/flagship/portfolio';
import { FLAGSHIP_CHINESE_BENCHMARKS_V1 } from '../src/services/story-engine/flagship/chinese-benchmark-data';
import { validateBenchmarkCoverage } from '../src/services/story-engine/flagship/chinese-benchmark';

const { manifest, registry } = validatePortfolioResearch(FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1);
const benchmarks = validateBenchmarkCoverage(manifest, FLAGSHIP_CHINESE_BENCHMARKS_V1);
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
  chineseBenchmarkPacks: benchmarks.packs.length,
  chineseComparableWorks: benchmarks.packs.reduce((total, pack) => total + pack.comparables.length, 0),
  quotas: {
    audience: count('audience'),
    groups: count('portfolioGroup'),
    advantages: count('advantageFamily'),
    cohorts: count('promotionCohort'),
  },
  openingTournament: manifest.slots
    .filter(slot => slot.promotionCohort === 'opening_tournament')
    .map(slot => ({
      slotId: slot.slotId,
      label: slot.workingLabel,
      genreLane: slot.genreLane,
      benchmarkId: benchmarks.packs.find(pack => pack.slotId === slot.slotId)?.id,
    })),
  productionMutation: false,
}, null, 2));
