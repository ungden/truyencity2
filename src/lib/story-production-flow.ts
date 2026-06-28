export type ProductionFlowAction =
  | 'skip'
  | 'init-prep'
  | 'init-write'
  | 'resume'
  | 'pause'
  | 'retry-later';

export interface ProductionFlowInput {
  projectId: string;
  status: string;
  currentChapter: number;
  totalPlannedChapters: number;
  hasNovel: boolean;
  quotaDue: boolean;
  quotaStatus?: string | null;
  retryCount?: number | null;
  maxRetries?: number;
  setupStage?: string | null;
  hasArcPlan?: boolean;
  hasFullSetup?: boolean;
  hasValidSetupKernel?: boolean;
  hasCanonAndPassedReview?: boolean;
  qualityHold?: boolean;
  costExceeded?: boolean;
  focusAllowed?: boolean;
}

export interface ProductionFlowDecision {
  action: ProductionFlowAction;
  tier?: 'resume' | 'init-prep' | 'init-write';
  reason: string;
  debug: Record<string, unknown>;
}

const STAGED_SETUP_STATES = new Set([
  'idea',
  'world',
  'character',
  'description',
  'master_outline',
  'story_outline',
  'canon_spawn',
  'arc_plan',
  'foundation_review',
]);

export function decideNextProductionAction(input: ProductionFlowInput): ProductionFlowDecision {
  const debug = { ...input };
  if (input.focusAllowed === false) return { action: 'skip', reason: 'focus_filter', debug };
  if (input.qualityHold) return { action: 'skip', reason: 'quality_hold', debug };
  if (!input.hasNovel) return { action: 'skip', reason: 'missing_novel', debug };
  if (input.status !== 'active' && input.status !== 'paused') return { action: 'skip', reason: `status_${input.status}`, debug };
  if (input.costExceeded) return { action: 'pause', reason: 'daily_cost_cap_exceeded', debug };
  if (!input.quotaDue) return { action: 'skip', reason: input.quotaStatus === 'completed' ? 'quota_completed' : 'quota_not_due', debug };

  const hardStop = input.totalPlannedChapters + 20;
  if (input.currentChapter >= hardStop) return { action: 'pause', reason: 'past_hard_stop', debug };

  const maxRetries = input.maxRetries ?? 5;
  if ((input.retryCount ?? 0) >= maxRetries) return { action: 'retry-later', reason: 'retry_backoff_or_circuit_breaker', debug };

  if (input.currentChapter > 0) {
    if (!input.hasValidSetupKernel) return { action: 'pause', reason: 'published_project_missing_setup_kernel', debug };
    return { action: 'resume', tier: 'resume', reason: 'due_resume_project', debug };
  }

  const stage = input.setupStage || 'idea';
  if (STAGED_SETUP_STATES.has(stage)) {
    return { action: 'init-prep', tier: 'init-prep', reason: `setup_stage_${stage}`, debug };
  }

  if (!input.hasArcPlan) return { action: 'init-prep', tier: 'init-prep', reason: 'missing_arc_plan', debug };
  if (!input.hasFullSetup) return { action: 'init-prep', tier: 'init-prep', reason: 'missing_full_setup', debug };
  if (!input.hasValidSetupKernel) return { action: 'init-prep', tier: 'init-prep', reason: 'missing_setup_kernel', debug };
  if (!input.hasCanonAndPassedReview) return { action: 'init-prep', tier: 'init-prep', reason: 'missing_canon_or_foundation_review', debug };

  return { action: 'init-write', tier: 'init-write', reason: 'ready_for_chapter_1', debug };
}
