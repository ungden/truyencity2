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

/**
 * qualityAttemptsForChapter counts failed full-draft executions already
 * persisted for the current chapter. Zero therefore means the factory may
 * discard this draft and try one fresh draft; one means the two-draft budget
 * is exhausted. Provider/model and immutable artifacts do not change.
 */
export function decideFactoryV3QualityRecovery(qualityAttemptsForChapter: number): FactoryV3QualityRecovery {
  return qualityAttemptsForChapter < 1 ? 'retry_fresh_draft' : 'quality_blocked';
}
