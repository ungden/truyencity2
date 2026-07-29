export type BenchmarkFailure = {
  lane: string;
  stage: string;
  message: string;
  code: string | null;
  evidence: unknown;
};

type UsageArtifact = { usage?: { costUsd?: number } } | undefined;

export type DiscoveryResumeLineage = {
  resumedAt: string;
  priorStartedAt: string;
  priorEngineRelease: string;
  priorFailure: BenchmarkFailure | null;
  priorCostUsd: number;
  checkpointLanes: string[];
};

export type ResumableDiscoveryProgress = {
  protocolVersion: string;
  engineRelease: string;
  route: unknown;
  continuityJudgeModel: string;
  startedAt: string;
  setupSuccesses: number;
  planSuccesses: number;
  providerFailures: number;
  generationFailures: number;
  continuityFailures: number;
  windowReviewFailures: number;
  buildCostUsd: number;
  launchPackDigests: string[];
  samples: unknown[];
  writerBriefs: unknown[];
  chapterAttempts: unknown[];
  setupCheckpoints: Record<string, object>;
  plannedWindows: Record<string, unknown>;
  windowReviews: unknown[];
  failure: BenchmarkFailure | null;
  bookedSetupCostUsdByLane?: Record<string, number>;
  resumeLineage?: DiscoveryResumeLineage[];
};

function sameRoute(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every(key => left[key] === right[key]);
}

export function checkpointCost(checkpoint: object | undefined): number {
  if (!checkpoint) return 0;
  return (Object.values(checkpoint) as UsageArtifact[]).reduce((sum, artifact) => {
    const value = artifact?.usage?.costUsd;
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

export function prepareDiscoveryResume<T extends ResumableDiscoveryProgress>(input: {
  progress: T;
  protocolVersion: string;
  engineRelease: string;
  route: Record<string, unknown>;
  continuityJudgeModel: string;
  resumedAt?: string;
  compatibleSetupOnly?: boolean;
}): T & {
  bookedSetupCostUsdByLane: Record<string, number>;
  resumeLineage: DiscoveryResumeLineage[];
} {
  const { progress } = input;
  const releaseMatches = progress.engineRelease === input.engineRelease;
  if ((progress.protocolVersion !== input.protocolVersion && !input.compatibleSetupOnly)
    || (!releaseMatches && !input.compatibleSetupOnly)
    || !progress.route
    || typeof progress.route !== 'object'
    // In setup-only mode runConceptLab validates the immutable checkpoint
    // against its own commission, research, and setup-model provenance. Runtime
    // Planner/Writer/Editor routes are intentionally allowed to change so they
    // can be compared on the exact same launch packs.
    || (!input.compatibleSetupOnly && !sameRoute(progress.route as Record<string, unknown>, input.route))
    || progress.continuityJudgeModel !== input.continuityJudgeModel) {
    throw new Error('Existing benchmark progress does not match the current release, routes, protocol, or continuity judge.');
  }
  const compatibleSetupFailure = Boolean(input.compatibleSetupOnly);
  if (progress.failure && progress.failure.code !== 'infra_blocked' && !compatibleSetupFailure) {
    throw new Error('Only interrupted or infra_blocked discovery progress can resume.');
  }
  if (progress.samples.length || progress.chapterAttempts.length || progress.windowReviews.length) {
    throw new Error('Discovery resume cannot reuse chapter-generation or window-review output.');
  }

  const bookedSetupCostUsdByLane = progress.bookedSetupCostUsdByLane ?? Object.fromEntries(
    Object.entries(progress.setupCheckpoints).map(([lane, checkpoint]) => [lane, checkpointCost(checkpoint)]),
  );
  const checkpointTotal = Object.values(bookedSetupCostUsdByLane).reduce((sum, value) => sum + value, 0);
  const resumeLineage = [
    ...(progress.resumeLineage ?? []),
    {
      resumedAt: input.resumedAt ?? new Date().toISOString(),
      priorStartedAt: progress.startedAt,
      priorEngineRelease: progress.engineRelease,
      priorFailure: progress.failure,
      priorCostUsd: progress.buildCostUsd,
      checkpointLanes: Object.keys(progress.setupCheckpoints).sort(),
    },
  ];

  return {
    ...progress,
    protocolVersion: input.protocolVersion,
    engineRelease: input.engineRelease,
    route: input.route,
    continuityJudgeModel: input.continuityJudgeModel,
    setupSuccesses: 0,
    planSuccesses: 0,
    providerFailures: 0,
    generationFailures: 0,
    continuityFailures: 0,
    windowReviewFailures: 0,
    buildCostUsd: input.compatibleSetupOnly
      ? checkpointTotal
      : Math.max(progress.buildCostUsd, checkpointTotal),
    launchPackDigests: [],
    samples: [],
    writerBriefs: [],
    chapterAttempts: [],
    plannedWindows: {},
    windowReviews: [],
    failure: null,
    bookedSetupCostUsdByLane,
    resumeLineage,
  } as T & {
    bookedSetupCostUsdByLane: Record<string, number>;
    resumeLineage: DiscoveryResumeLineage[];
  };
}

export function bookSetupCheckpointCost(input: {
  buildCostUsd: number;
  bookedSetupCostUsdByLane: Record<string, number>;
  lane: string;
  checkpointCostUsd: number;
}): { buildCostUsd: number; bookedSetupCostUsdByLane: Record<string, number>; addedCostUsd: number } {
  const previouslyBooked = input.bookedSetupCostUsdByLane[input.lane] ?? 0;
  const addedCostUsd = Math.max(0, input.checkpointCostUsd - previouslyBooked);
  return {
    buildCostUsd: input.buildCostUsd + addedCostUsd,
    bookedSetupCostUsdByLane: {
      ...input.bookedSetupCostUsdByLane,
      [input.lane]: Math.max(previouslyBooked, input.checkpointCostUsd),
    },
    addedCostUsd,
  };
}
