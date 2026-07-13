import type { StorySpecV2 } from './contracts';

export type FoundationDimension =
  | 'story_identity'
  | 'premise_interest'
  | 'reader_pleasure_engine'
  | 'protagonist_engine'
  | 'cast_agency'
  | 'causal_world'
  | 'resource_economy'
  | 'conflict_escalation'
  | 'promise_payoff'
  | 'runway_sustainability';

export interface FoundationScoreV2 {
  total: number;
  passed: boolean;
  dimensions: Record<FoundationDimension, number>;
  issues: string[];
  source: 'computed_v2';
}

function concrete(text: string): boolean {
  const lower = text.toLowerCase();
  const generic = ['thành công', 'trưởng thành', 'đối mặt thử thách', 'thay đổi số phận', 'trở nên mạnh mẽ'];
  return text.trim().length >= 30 && !generic.some(value => lower === value);
}

function boundedScore(points: number): number {
  return Math.max(0, Math.min(10, Math.round(points)));
}

export function computeFoundationScoreV2(spec: StorySpecV2): FoundationScoreV2 {
  const issues: string[] = [];
  const namedCast = new Set(spec.cast.map(member => member.name.trim().toLowerCase()));
  const distinctPayoffs = new Set(spec.promisePayoffLedger.map(item => item.payoff.trim().toLowerCase()));
  const distinctRunway = new Set(spec.runway30.map(item => item.irreversibleChange.trim().toLowerCase()));

  const dimensions: Record<FoundationDimension, number> = {
    story_identity: boundedScore(
      (concrete(spec.storyIdentity.uniqueMechanism) ? 3 : 0) +
      (concrete(spec.storyIdentity.emotionalCore) ? 2 : 0) +
      Math.min(2, spec.storyIdentity.domainTruthSources.length * 0.7) +
      Math.min(2, spec.storyIdentity.forbiddenGenericMoves.length * 0.4) +
      Math.min(1, spec.storyIdentity.similarityRisks.length * 0.35),
    ),
    premise_interest: boundedScore(
      (concrete(spec.premise) ? 4 : 1) +
      (concrete(spec.readerFantasy) ? 3 : 0) +
      (spec.premise.toLowerCase() !== spec.readerFantasy.toLowerCase() ? 3 : 0),
    ),
    reader_pleasure_engine: boundedScore(
      (concrete(spec.pleasureProfile.advantage) ? 2 : 0) +
      (concrete(spec.pleasureProfile.knowledgeLimit) ? 2 : 0) +
      Math.min(2, spec.pleasureProfile.primaryRewardLoop.length * 0.5) +
      Math.min(2, spec.pleasureProfile.comfortLoop.length) +
      Math.min(2, spec.pleasureProfile.progressionSignals.length * 0.4),
    ),
    protagonist_engine: boundedScore([
      spec.protagonist.desire,
      spec.protagonist.fear,
      spec.protagonist.contradiction,
      spec.protagonist.misbelief,
      spec.protagonist.competence,
      spec.protagonist.blindSpot,
      spec.protagonist.privateAgenda,
      spec.protagonist.leverage,
      spec.protagonist.moralBoundary,
      spec.protagonist.decisionSignature,
      spec.protagonist.changeTrigger,
    ].filter(concrete).length * (10 / 11)),
    cast_agency: boundedScore(
      Math.min(4, namedCast.size) +
      spec.cast.filter(member => [member.socialIdentity, member.agenda, member.leverage, member.moralBoundary, member.decisionSignature, member.relationshipBehavior].every(concrete)).length * 1.5,
    ),
    causal_world: boundedScore(
      Math.min(4, spec.causalWorldRules.length) +
      spec.causalWorldRules.filter(rule => [rule.beneficiary, rule.harmedParty, rule.enforcement, rule.cost, rule.consequence, rule.evidenceSource, rule.exceptions].every(concrete) && rule.sceneAffordances.length >= 2).length * 1.5,
    ),
    resource_economy: boundedScore(
      Math.min(5, spec.resourceEconomy.length * 1.5) +
      spec.resourceEconomy.filter(item => concrete(item.source) && concrete(item.scarcity)).length,
    ),
    conflict_escalation: boundedScore(
      Math.min(5, spec.conflictLadder.length * 1.5) +
      spec.conflictLadder.filter(item => concrete(item.escalationCause) && concrete(item.resolutionChanges)).length,
    ),
    promise_payoff: boundedScore(
      Math.min(5, spec.promisePayoffLedger.length) +
      Math.min(5, distinctPayoffs.size),
    ),
    runway_sustainability: boundedScore(
      Math.min(3, spec.runway30.length * 0.6) +
      Math.min(2, distinctRunway.size * 0.4) +
      (concrete(spec.serialityEngine.recurringSituation) ? 1 : 0) +
      Math.min(2, spec.serialityEngine.variationAxes.length * 0.7) +
      Math.min(1, spec.serialityEngine.escalationVectors.length * 0.4) +
      Math.min(1, spec.progressionCurrencies.length * 0.35),
    ),
  };

  for (const [dimension, score] of Object.entries(dimensions)) {
    if (score < 7) issues.push(`${dimension} scored ${score}/10`);
  }
  if (namedCast.size !== spec.cast.length) issues.push('cast contains duplicate names');
  if (distinctPayoffs.size < Math.ceil(spec.promisePayoffLedger.length * 0.8)) issues.push('promise/payoff ledger repeats the same payoff');
  if (distinctRunway.size < spec.runway30.length) issues.push('30-chapter runway repeats irreversible changes');
  if (new Set(spec.progressionCurrencies.map(item => item.name.trim().toLowerCase())).size !== spec.progressionCurrencies.length) issues.push('progression currencies contain duplicate names');
  if (['huyen-huyen', 'tien-hiep'].includes(spec.genre) && spec.progressionCurrencies.filter(item => item.kind !== 'power').length < 2) issues.push('fantasy kernel needs at least two non-power progression currencies');
  if (spec.causalWorldRules.some(rule => rule.beneficiary.trim().toLowerCase() === rule.harmedParty.trim().toLowerCase())) {
    issues.push('causal world contains a rule whose beneficiary and harmed party are identical');
  }
  if (spec.cast.some(member => member.agenda.trim().toLowerCase() === member.conflictWithProtagonist.trim().toLowerCase())) {
    issues.push('cast agenda is copied from protagonist conflict instead of expressing independent agency');
  }

  const values = Object.values(dimensions);
  const total = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  return {
    total,
    passed: total >= 8 && Math.min(...values) >= 7 && issues.length === 0,
    dimensions,
    issues,
    source: 'computed_v2',
  };
}
