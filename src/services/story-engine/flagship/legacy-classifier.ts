export type LegacyDisposition = 'continue_candidate' | 'rewrite_from_ch1' | 'archive';

export interface LegacyProjectSnapshot {
  currentChapter: number;
  recentPassRate: number;
  averageQualityScore: number;
  criticalContinuityCount: number;
  setupV2Ready: boolean;
  readerSignals?: number;
}

export function classifyLegacyProject(snapshot: LegacyProjectSnapshot): { disposition: LegacyDisposition; reasons: string[] } {
  const reasons: string[] = [];
  if (snapshot.criticalContinuityCount > 0) reasons.push('critical continuity violations');
  if (!snapshot.setupV2Ready) reasons.push('missing flagship-compatible setup');
  if (snapshot.recentPassRate < 0.6) reasons.push('recent pass rate below 60%');
  if (snapshot.averageQualityScore < 70) reasons.push('average quality below 70');

  if (snapshot.currentChapter === 0) return { disposition: 'archive', reasons: [...reasons, 'no published chapters'] };
  if (snapshot.criticalContinuityCount === 0 && snapshot.setupV2Ready && snapshot.recentPassRate >= 0.8 && snapshot.averageQualityScore >= 82) {
    return { disposition: 'continue_candidate', reasons: ['strong recent window and compatible setup'] };
  }
  if (snapshot.readerSignals && snapshot.readerSignals > 0) return { disposition: 'rewrite_from_ch1', reasons: [...reasons, 'reader signal justifies salvage'] };
  return snapshot.currentChapter <= 30
    ? { disposition: 'rewrite_from_ch1', reasons }
    : { disposition: 'archive', reasons: [...reasons, 'long weak legacy run is unsafe to migrate'] };
}
