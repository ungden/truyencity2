import { FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1 } from '../src/services/story-engine/flagship/portfolio-data';
import { validatePortfolioResearch } from '../src/services/story-engine/flagship/portfolio';

const apply = process.argv.includes('--apply');
const { manifest } = validatePortfolioResearch(FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_MARKET_RESEARCH_V1);
const cohort = manifest.slots.filter(slot => slot.promotionCohort === 'opening_tournament');

if (apply) {
  throw new Error('SETUP_BLOCKED: portfolio promotion cannot create production rows before each slot has its own typed FlagshipSetupBriefV2 and approved concept. There is deliberately no fallback or placeholder project creation.');
}

console.log(JSON.stringify({
  mode: 'dry_run',
  funnelStage: '30_to_9',
  selectedCount: cohort.length,
  selectedSlots: cohort.map(slot => ({
    slotId: slot.slotId,
    workingLabel: slot.workingLabel,
    audience: slot.audience,
    genre: slot.genre,
    genreLane: slot.genreLane,
    laneCardIds: slot.laneCardIds,
    nextGate: 'typed_story_specific_brief_then_20_concepts_and_3_openings',
  })),
  databaseWrites: 0,
  existingPilotsChanged: false,
}, null, 2));
