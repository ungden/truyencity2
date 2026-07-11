export interface ConceptCandidateV2 {
  id: string;
  premise: string;
  protagonistEngine: string;
  conflictEngine: string;
  domain: string;
  judgeScores?: number[];
}

export interface ConceptTournamentResult {
  finalists: ConceptCandidateV2[];
  rejectedAsNearDuplicates: string[];
  ranking: Array<{ id: string; score: number }>;
}

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter(token => token.length > 3));
}

export function conceptSimilarity(a: ConceptCandidateV2, b: ConceptCandidateV2): number {
  const left = tokens(`${a.premise} ${a.protagonistEngine} ${a.conflictEngine} ${a.domain}`);
  const right = tokens(`${b.premise} ${b.protagonistEngine} ${b.conflictEngine} ${b.domain}`);
  const intersection = [...left].filter(token => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 1;
}

export function runConceptTournament(candidates: ConceptCandidateV2[], finalistCount = 3, minimumCandidates = 20): ConceptTournamentResult {
  if (candidates.length < Math.max(finalistCount, minimumCandidates)) {
    throw new Error(`Concept tournament requires at least ${Math.max(finalistCount, minimumCandidates)} candidates.`);
  }
  const unique: ConceptCandidateV2[] = [];
  const rejectedAsNearDuplicates: string[] = [];
  for (const candidate of candidates) {
    if (unique.some(existing => conceptSimilarity(existing, candidate) >= 0.62)) rejectedAsNearDuplicates.push(candidate.id);
    else unique.push(candidate);
  }
  const ranking = unique.map(candidate => {
    const scores = candidate.judgeScores || [];
    const judgeMean = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const disagreementPenalty = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 2;
    const specificity = Math.min(10, tokens(`${candidate.premise} ${candidate.conflictEngine}`).size / 5);
    return { id: candidate.id, score: Number((judgeMean * 0.75 + specificity * 0.25 - disagreementPenalty * 0.1).toFixed(3)) };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const byId = new Map(unique.map(candidate => [candidate.id, candidate]));
  return { finalists: ranking.slice(0, finalistCount).map(item => byId.get(item.id)!), rejectedAsNearDuplicates, ranking };
}
