import { z } from 'zod';
import type { CompletionReadinessReport } from '../codex-automation/completion-readiness';

/**
 * Control-plane state for the unattended story factory.  This is deliberately
 * separate from ai_story_projects.status: the latter still owns the legacy
 * fleet and must not be used as a queue or retry signal.
 */
export const FactoryJobStatusSchema = z.enum([
  'queued', 'setup', 'ready', 'writing', 'finale', 'blocked',
  'infra_blocked', 'completed', 'cancelled',
]);
export type FactoryJobStatus = z.infer<typeof FactoryJobStatusSchema>;

export const FactoryJobStageSchema = z.enum([
  'setup', 'plan', 'write', 'review', 'commit', 'completion',
]);
export type FactoryJobStage = z.infer<typeof FactoryJobStageSchema>;

export const FactoryFailureClassSchema = z.enum([
  'setup', 'quality', 'continuity', 'infrastructure', 'completion', 'unknown',
]);
export type FactoryFailureClass = z.infer<typeof FactoryFailureClassSchema>;

export const FactoryJobV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  projectId: z.string().min(1),
  novelId: z.string().min(1),
  pipelineVersion: z.literal('flagship_v2'),
  status: FactoryJobStatusSchema,
  stage: FactoryJobStageSchema,
  currentChapter: z.number().int().min(0),
  forecastChapters: z.number().int().min(1),
  maxChapters: z.number().int().min(1).max(5000),
  completionMode: z.enum(['narrative_ending', 'hard_cap']),
  attempt: z.number().int().min(0),
  leaseToken: z.string().nullable().optional(),
  leaseUntil: z.string().nullable().optional(),
  lastRunId: z.string().nullable().optional(),
  failureClass: FactoryFailureClassSchema.nullable().optional(),
  lastError: z.string().max(2000).nullable().optional(),
}).strict();
export type FactoryJobV1 = z.infer<typeof FactoryJobV1Schema>;

export const FactoryCheckpointV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  jobId: z.string().min(1),
  projectId: z.string().min(1),
  stage: FactoryJobStageSchema,
  chapterNumber: z.number().int().min(0),
  attempt: z.number().int().min(0),
  status: z.enum(['started', 'passed', 'failed', 'skipped']),
  inputDigest: z.string().min(8),
  outputDigest: z.string().min(8).nullable().optional(),
  evidence: z.array(z.unknown()).max(50),
  failureClass: FactoryFailureClassSchema.nullable().optional(),
}).strict();
export type FactoryCheckpointV1 = z.infer<typeof FactoryCheckpointV1Schema>;

const transitions: Record<FactoryJobStatus, readonly FactoryJobStatus[]> = {
  queued: ['setup', 'cancelled'],
  setup: ['setup', 'ready', 'blocked', 'infra_blocked', 'cancelled'],
  ready: ['writing', 'cancelled'],
  writing: ['writing', 'ready', 'finale', 'completed', 'blocked', 'infra_blocked'],
  finale: ['writing', 'completed', 'blocked', 'infra_blocked'],
  blocked: ['setup', 'ready', 'writing', 'cancelled'],
  infra_blocked: ['infra_blocked', 'queued', 'setup', 'ready', 'writing', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Fail closed on unknown transitions; no implicit retry or legacy fallback. */
export function canTransitionFactoryJob(from: FactoryJobStatus, to: FactoryJobStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertFactoryTransition(from: FactoryJobStatus, to: FactoryJobStatus): void {
  if (!canTransitionFactoryJob(from, to)) {
    throw new Error(`FACTORY_INVALID_TRANSITION: ${from} -> ${to}`);
  }
}

export interface FactoryProjectEligibility {
  pipelineVersion?: string | null;
  /** Canonical unattended opt-in. Do not reuse legacy production_enabled. */
  factoryEnabled?: boolean | null;
  publicationMode?: string | null;
  setupStatus?: string | null;
  currentChapter?: number | null;
}

/**
 * Eligibility is intentionally strict. A project has to opt into the factory
 * explicitly; legacy projects, manual pilots and rejected kernels never enter
 * the queue by accident.
 */
export function factoryEligibility(project: FactoryProjectEligibility): { eligible: boolean; reason: string } {
  if (project.pipelineVersion !== 'flagship_v2') return { eligible: false, reason: 'pipeline_version is not flagship_v2' };
  if (project.factoryEnabled !== true) return { eligible: false, reason: 'factory_enabled=true is required' };
  if (project.publicationMode !== 'automatic') return { eligible: false, reason: 'publication_mode=automatic is required' };
  if (project.setupStatus === 'rejected') return { eligible: false, reason: 'setup is rejected' };
  if ((project.currentChapter ?? 0) < 0) return { eligible: false, reason: 'current chapter is invalid' };
  return { eligible: true, reason: 'explicit flagship factory opt-in' };
}

export interface FactoryChapterDecision {
  status: FactoryJobStatus;
  stage: FactoryJobStage;
  forecastChapters?: number;
  reason: string;
}

/** Decide the next control-plane state after a committed chapter. */
export function decideAfterChapter(
  report: CompletionReadinessReport,
  currentChapter: number,
  maxChapters: number,
): FactoryChapterDecision {
  if (currentChapter >= maxChapters) {
    return { status: 'completed', stage: 'completion', reason: 'safety hard cap reached' };
  }
  if (report.verdict === 'repair') {
    return { status: 'blocked', stage: 'review', reason: report.blockers.join('; ') || 'quality repair required' };
  }
  if (report.verdict === 'complete') {
    return { status: 'completed', stage: 'completion', reason: report.reasons.join('; ') || 'ending closed cleanly' };
  }
  if (report.verdict === 'enter_finale') {
    return { status: 'finale', stage: 'completion', reason: report.reasons.join('; ') || 'ending readiness passed' };
  }
  return {
    status: 'ready',
    stage: 'plan',
    forecastChapters: report.shouldExtendForecast ? report.nextForecastChapters : report.forecastChapters,
    reason: report.reasons.join('; ') || 'continue sequential production',
  };
}
