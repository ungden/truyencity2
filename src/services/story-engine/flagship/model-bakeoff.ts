export interface BlindPreferenceBallot {
  briefId: string;
  preferredAnonymousId: string | 'tie';
  reviewerId: string;
}

export interface ModelBakeoffResult {
  winner: string | null;
  preferenceRates: Record<string, number>;
  decisiveBallots: number;
  passed65PercentGate: boolean;
}

export function scoreBlindBakeoff(ballots: BlindPreferenceBallot[], anonymousIds: string[]): ModelBakeoffResult {
  const validIds = new Set(anonymousIds);
  const decisive = ballots.filter(ballot => ballot.preferredAnonymousId !== 'tie' && validIds.has(ballot.preferredAnonymousId));
  const rates = Object.fromEntries(anonymousIds.map(id => [id, decisive.length
    ? decisive.filter(ballot => ballot.preferredAnonymousId === id).length / decisive.length
    : 0]));
  const ranked = Object.entries(rates).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const winner = ranked[0]?.[1] > (ranked[1]?.[1] ?? 0) ? ranked[0][0] : null;
  return {
    winner,
    preferenceRates: rates,
    decisiveBallots: decisive.length,
    passed65PercentGate: !!winner && rates[winner] >= 0.65 && decisive.length >= 10,
  };
}
