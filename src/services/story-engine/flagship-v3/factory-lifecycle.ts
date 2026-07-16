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
