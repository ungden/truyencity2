export type FactoryV3Status =
  | 'ready'
  | 'writing'
  | 'finale'
  | 'quality_blocked'
  | 'plan_blocked'
  | 'infra_blocked'
  | 'completed'
  | 'cancelled';

const TRANSITIONS: Record<FactoryV3Status, readonly FactoryV3Status[]> = {
  ready: ['writing', 'cancelled'],
  writing: ['ready', 'finale', 'quality_blocked', 'plan_blocked', 'infra_blocked', 'completed'],
  finale: ['writing', 'quality_blocked', 'plan_blocked', 'infra_blocked', 'completed'],
  quality_blocked: [],
  plan_blocked: [],
  infra_blocked: ['ready', 'writing', 'plan_blocked', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionFactoryV3(from: FactoryV3Status, to: FactoryV3Status): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export type FactoryV3QualityRecovery = 'retry_fresh_draft' | 'quality_blocked';

const PLAN_COUPLED_EDITOR_CODES = new Set([
  'editor_canon',
  'editor_timeline',
  'editor_resource_causality',
  'editor_character_knowledge',
  'editor_authority',
  'editor_plan_fidelity',
]);

function evidenceCodes(evidence: unknown[]): Set<string> {
  return new Set(evidence.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const code = (item as { code?: unknown }).code;
    return typeof code === 'string' ? [code] : [];
  }));
}

/**
 * Two independent full drafts failing the same objective continuity gate are
 * evidence that the immutable plan, not the prose, is under-specified. The
 * factory may then spend its single rolling-window regeneration budget.
 */
export function repeatedPlanCoupledGateV3(previousEvidence: unknown[], currentEvidence: unknown[]): string | null {
  const previous = evidenceCodes(previousEvidence);
  const current = evidenceCodes(currentEvidence);
  for (const code of PLAN_COUPLED_EDITOR_CODES) {
    if (previous.has(code) && current.has(code)) return code;
  }
  return null;
}

/**
 * qualityAttemptsForChapter counts failed full-draft executions already
 * persisted for the current chapter. Zero therefore means the factory may
 * discard this draft and try one fresh draft; one means the two-draft budget
 * is exhausted. Provider/model and immutable artifacts do not change.
 */
export function decideFactoryV3QualityRecovery(qualityAttemptsForChapter: number): FactoryV3QualityRecovery {
  return qualityAttemptsForChapter < 1 ? 'retry_fresh_draft' : 'quality_blocked';
}
