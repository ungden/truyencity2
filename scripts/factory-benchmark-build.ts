import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  DEFAULT_MODEL_ROUTES,
  CAUSAL_VALIDATOR_VERSION,
  ModelRoutesSchema,
  ResearchSnapshotSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_REVISION,
  STORY_FACTORY_SEQUENTIAL_PROTOCOL,
  STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
  StoryCommissionSchema,
  StoryFactoryError,
  WriterBakeoffCorpusSchema,
  assessSequentialContinuity,
  buildContinuityPacketFromEvents,
  bookSetupCheckpointCost,
  checkpointCost,
  digestArtifact,
  flattenContinuityPacket,
  memoryEntityIdsForArc,
  memoryEntityIdsForPlan,
  planRollingWindow,
  prepareDiscoveryResume,
  reviewFiveChapterWindow,
  runConceptLab,
  writeStoryChapter,
  type ModelRoutes,
  type ChapterAttemptTelemetry,
  type PlanAssessment,
  type PlanQualifiedWriterBrief,
  type PortfolioSignature,
  type ProviderUsage,
  type SequentialBenchmarkCorpus,
  type SetupCheckpoint,
  type RollingPlan,
  type DiscoveryResumeLineage,
  type StoryState,
  type StateEvent,
  type WindowReview,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const discoveryOnly = args.includes('--discovery-only');
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const suitePath = path.resolve(value('--suite') ?? 'factory/benchmark-v2/suite.json');
const outputPath = path.resolve(value('--output') ?? '/tmp/truyencity-sequential-v3-corpus.json');
const writerCorpusPath = path.resolve(value('--writer-corpus') ?? '/tmp/truyencity-writer-bakeoff-v4-corpus.json');
const progressPath = path.resolve(value('--progress') ?? `${outputPath}.progress.json`);
const candidateRoutesPath = value('--candidate-routes');
if (!candidateRoutesPath) throw new Error('--candidate-routes is required so sequential survival cannot silently test the wrong route.');
const candidateRoutes = ModelRoutesSchema.parse(JSON.parse(readFileSync(path.resolve(candidateRoutesPath), 'utf8')));
const continuityJudgeModel = value('--continuity-judge') ?? 'gemini-2.5-pro';
const frozenProgressPath = value('--frozen-discovery-progress');
const compatibleSetupResumePath = value('--compatible-setup-resume');
if (frozenProgressPath && compatibleSetupResumePath) {
  throw new Error('--frozen-discovery-progress and --compatible-setup-resume are mutually exclusive.');
}
if (compatibleSetupResumePath && !discoveryOnly) {
  throw new Error('--compatible-setup-resume is only allowed for discovery; sequential survival requires frozen current-release evidence.');
}

const suiteSchema = z.object({
  suiteVersion: z.literal(1),
  entries: z.array(z.object({
    commissionPath: z.string().trim().min(3),
    researchPath: z.string().trim().min(3),
  }).strict()).length(4),
}).strict();

const suiteEntrySchema = z.object({
  commission: StoryCommissionSchema,
  research: ResearchSnapshotSchema,
}).strict();

function loadSuite() {
  const suite = suiteSchema.parse(JSON.parse(readFileSync(suitePath, 'utf8')));
  const base = path.dirname(suitePath);
  const entries = suite.entries.map(entry => suiteEntrySchema.parse({
    commission: JSON.parse(readFileSync(path.resolve(base, entry.commissionPath), 'utf8')),
    research: JSON.parse(readFileSync(path.resolve(base, entry.researchPath), 'utf8')),
  }));
  const lanes = entries.map(entry => entry.commission.genreLane);
  if (new Set(lanes).size !== 4) throw new Error('Sequential survival requires four distinct lanes.');
  entries.forEach((entry, index) => {
    if (entry.commission.genreLane !== entry.research.lane) {
      throw new Error(`Research lane must match commission lane at suite entry ${index}.`);
    }
  });
  return entries;
}

type Progress = {
  protocolVersion: string;
  engineRelease: string;
  engineRevision?: string;
  route: ReturnType<typeof runtimeRoute>;
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
  samples: SequentialBenchmarkCorpus['samples'];
  writerBriefs: PlanQualifiedWriterBrief[];
  stateEventsByLane: Record<string, StateEvent[]>;
  chapterAttempts: Array<{
    id: string;
    lane: string;
    chapterNumber: number;
    outcome: 'published' | 'failed';
    errorCode: string | null;
    telemetry: ChapterAttemptTelemetry;
  }>;
  setupCheckpoints: Record<string, SetupCheckpoint>;
  plannedWindows: Record<string, { rollingPlan: RollingPlan; assessment: PlanAssessment }>;
  followupPlannedWindows: Record<string, { rollingPlan: RollingPlan; assessment: PlanAssessment }>;
  windowReviews: Array<{
    lane: string;
    chapterNumbers: number[];
    chapterDigest: string;
    review: WindowReview;
    usage: ProviderUsage;
  }>;
  failure: null | { lane: string; stage: string; message: string; code: string | null; evidence: unknown };
  bookedSetupCostUsdByLane: Record<string, number>;
  resumeLineage: DiscoveryResumeLineage[];
};

type PassedPlanAssessment = Extract<PlanAssessment, { status: 'pass' }>;
type PassedPlanWindow = { rollingPlan: RollingPlan; assessment: PassedPlanAssessment };

function runtimeRoute(routes: ModelRoutes) {
  return {
    planner: routes.planner,
    planJudge: routes.planJudge,
    writer: routes.writer,
    editor: routes.editor,
    routeVersion: routes.routeVersion,
  };
}

function usageCost(usages: ProviderUsage[]): number {
  return usages.reduce((sum, usage) => sum + usage.costUsd, 0);
}

function tailWords(content: string, maximumWords = 600): string {
  const paragraphs = content.trim().split(/\n\s*\n/u);
  const selected: string[] = [];
  let words = 0;
  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const paragraphWords = paragraphs[index].trim().split(/\s+/u).filter(Boolean).length;
    if (selected.length > 0 && words + paragraphWords > maximumWords) break;
    selected.unshift(paragraphs[index].trim());
    words += paragraphWords;
  }
  return selected.join('\n\n');
}

async function ensureAuditBucket(db: SupabaseClient): Promise<void> {
  const buckets = await db.storage.listBuckets();
  if (buckets.error) throw buckets.error;
  const existing = buckets.data.find(bucket => bucket.id === 'factory-audit');
  if (existing) {
    if (existing.public) throw new Error('factory-audit bucket must remain private.');
    return;
  }
  const created = await db.storage.createBucket('factory-audit', {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024,
    allowedMimeTypes: ['application/gzip', 'application/json'],
  });
  if (created.error) throw created.error;
}

async function uploadImmutable(db: SupabaseClient, key: string, bytes: Buffer, digest: string): Promise<void> {
  const uploaded = await db.storage.from('factory-audit').upload(key, bytes, {
    contentType: 'application/gzip',
    upsert: false,
  });
  if (!uploaded.error) return;
  if (!/already exists|duplicate/iu.test(uploaded.error.message)) throw uploaded.error;
  const existing = await db.storage.from('factory-audit').download(key);
  if (existing.error) throw existing.error;
  const existingDigest = createHash('sha256').update(Buffer.from(await existing.data.arrayBuffer())).digest('hex');
  if (existingDigest !== digest) throw new Error('Immutable sequential artifact already exists with different bytes.');
}

function selectWriterBriefs(all: PlanQualifiedWriterBrief[], laneOrder: string[]): PlanQualifiedWriterBrief[] {
  return laneOrder.flatMap(lane => all.filter(brief => brief.lane === lane).slice(0, 1));
}

function failedUsageCost(evidence: unknown): number {
  if (!evidence || typeof evidence !== 'object') return 0;
  if (Array.isArray(evidence)) return evidence.reduce((sum, item) => sum + failedUsageCost(item), 0);
  const record = evidence as Record<string, unknown>;
  let total = 0;
  if (record.usage && typeof record.usage === 'object') {
    const cost = (record.usage as { costUsd?: unknown }).costUsd;
    if (typeof cost === 'number' && Number.isFinite(cost)) total += cost;
  }
  if (Array.isArray(record.usages)) {
    total += record.usages.reduce((sum, usage) => {
      const cost = usage && typeof usage === 'object' ? (usage as { costUsd?: unknown }).costUsd : null;
      return sum + (typeof cost === 'number' && Number.isFinite(cost) ? cost : 0);
    }, 0);
  }
  for (const key of ['cause', 'pipelineTelemetry', 'validation']) {
    total += failedUsageCost(record[key]);
  }
  return total;
}

function failedChapterTelemetry(error: unknown): ChapterAttemptTelemetry | null {
  if (!(error instanceof StoryFactoryError) || !error.evidence || typeof error.evidence !== 'object') return null;
  const telemetry = (error.evidence as { pipelineTelemetry?: unknown }).pipelineTelemetry;
  if (!telemetry || typeof telemetry !== 'object' || !Array.isArray((telemetry as { usages?: unknown }).usages)) return null;
  return telemetry as ChapterAttemptTelemetry;
}

async function main() {
  const suiteEntries = loadSuite();
  const laneOrder = suiteEntries.map(entry => entry.commission.genreLane);
  const buildProtocol = discoveryOnly ? STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL : STORY_FACTORY_SEQUENTIAL_PROTOCOL;
  const frozenProgress = frozenProgressPath
    ? JSON.parse(readFileSync(path.resolve(frozenProgressPath), 'utf8')) as Progress
    : null;
  if (frozenProgress
    && (frozenProgress.protocolVersion !== STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL
      || frozenProgress.engineRelease !== STORY_FACTORY_RELEASE
      || frozenProgress.engineRevision !== STORY_FACTORY_REVISION
      || frozenProgress.route.planner !== candidateRoutes.planner
      || frozenProgress.route.planJudge !== candidateRoutes.planJudge
      || frozenProgress.continuityJudgeModel !== continuityJudgeModel
      || Object.keys(frozenProgress.setupCheckpoints).length !== 4
      || Object.keys(frozenProgress.plannedWindows ?? {}).length !== 4)) {
    throw new Error('Frozen discovery progress does not match this release, Planner, Plan Judge, Continuity Judge, or four-lane campaign.');
  }
  const freshProgress: Progress = {
    protocolVersion: buildProtocol,
    engineRelease: STORY_FACTORY_RELEASE,
    engineRevision: STORY_FACTORY_REVISION,
    route: runtimeRoute(candidateRoutes),
    continuityJudgeModel,
    startedAt: new Date().toISOString(),
    setupSuccesses: 0,
    planSuccesses: 0,
    providerFailures: 0,
    generationFailures: 0,
    continuityFailures: 0,
    windowReviewFailures: 0,
    buildCostUsd: 0,
    launchPackDigests: [],
    samples: [],
    writerBriefs: [],
    stateEventsByLane: {},
    chapterAttempts: [],
    setupCheckpoints: {},
    plannedWindows: {},
    followupPlannedWindows: {},
    windowReviews: [],
    failure: null,
    bookedSetupCostUsdByLane: {},
    resumeLineage: [],
  };
  const compatibleSetupProgress = compatibleSetupResumePath
    ? JSON.parse(readFileSync(path.resolve(compatibleSetupResumePath), 'utf8')) as Progress
    : null;
  const existingProgress = compatibleSetupProgress ?? (
    discoveryOnly && !frozenProgress && existsSync(progressPath)
      ? JSON.parse(readFileSync(progressPath, 'utf8')) as Progress
      : null
  );
  const progress: Progress = existingProgress
    ? prepareDiscoveryResume({
      progress: existingProgress,
      protocolVersion: buildProtocol,
      engineRelease: STORY_FACTORY_RELEASE,
    engineRevision: STORY_FACTORY_REVISION,
      route: runtimeRoute(candidateRoutes),
      continuityJudgeModel,
      compatibleSetupOnly: Boolean(compatibleSetupProgress),
    })
    : freshProgress;
  progress.followupPlannedWindows ??= {};
  progress.stateEventsByLane ??= {};
  const persist = () => writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
  persist();
  const signatures: PortfolioSignature[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = apply && url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  if (apply && !db) throw new Error('Supabase server environment is missing.');
  let runId: string | null = null;
  if (db) {
    const inserted = await db.from('story_factory_runs').insert({
      kind: 'benchmark',
      status: 'running',
      engine_release: STORY_FACTORY_RELEASE,
      benchmark_protocol_version: buildProtocol,
      model_routes: {
        route: runtimeRoute(candidateRoutes),
        continuityJudge: continuityJudgeModel,
      },
      input_artifact: {
        protocolVersion: buildProtocol,
        lanes: laneOrder,
        samplesExpected: discoveryOnly ? 4 : 20,
        resumeLineage: progress.resumeLineage,
      },
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    runId = inserted.data.id;
  }
  const heartbeat = async () => {
    if (!db || !runId) return;
    const updated = await db.from('story_factory_runs').update({
      output_artifact: {
        protocolVersion: buildProtocol,
        progress: {
          setupSuccesses: progress.setupSuccesses,
          planSuccesses: progress.planSuccesses,
          samplesCompleted: progress.samples.length,
          activeCheckpoints: Object.fromEntries(
            Object.entries(progress.setupCheckpoints).map(([lane, checkpoint]) => [lane, Object.keys(checkpoint)]),
          ),
        },
      },
      estimated_cost_usd: progress.buildCostUsd,
    }).eq('id', runId).eq('status', 'running');
    if (updated.error) throw updated.error;
  };

  try {
    for (const entry of suiteEntries) {
      const lane = entry.commission.genreLane;
      let stage = 'setup';
      try {
        const setupCostBefore = progress.buildCostUsd;
        const setup = await runConceptLab({
          commission: entry.commission,
          research: entry.research,
          routes: candidateRoutes,
          existingSignatures: signatures,
          resume: frozenProgress?.setupCheckpoints[lane] ?? progress.setupCheckpoints[lane],
          onCheckpoint: async checkpoint => {
            progress.setupCheckpoints[lane] = checkpoint;
            if (!frozenProgress) {
              const booked = bookSetupCheckpointCost({
                buildCostUsd: progress.buildCostUsd,
                bookedSetupCostUsdByLane: progress.bookedSetupCostUsdByLane,
                lane,
                checkpointCostUsd: checkpointCost(checkpoint),
              });
              progress.buildCostUsd = booked.buildCostUsd;
              progress.bookedSetupCostUsdByLane = booked.bookedSetupCostUsdByLane;
            }
            persist();
            await heartbeat();
          },
        });
        const setupCost = frozenProgress ? 0 : progress.buildCostUsd - setupCostBefore;
        progress.setupSuccesses += 1;
        const launchPackDigest = digestArtifact(setup.launchPack);
        progress.launchPackDigests.push(launchPackDigest);
        signatures.push({
          mechanismFingerprint: setup.launchPack.kernel.mechanismFingerprint,
          rewardLoopFingerprint: setup.launchPack.kernel.rewardLoopFingerprint,
          conflictEconomyFingerprint: setup.launchPack.kernel.conflictEconomyFingerprint,
        });
        persist();
        await heartbeat();

        stage = 'plan';
        let planned: { rollingPlan: RollingPlan; assessment: PlanAssessment };
        let planCost = 0;
        if (frozenProgress) {
          planned = frozenProgress.plannedWindows[lane];
        } else if (progress.plannedWindows[lane]) {
          planned = progress.plannedWindows[lane];
        } else {
          const generatedPlan = await planRollingWindow({
            kernel: setup.launchPack.kernel,
            arc: setup.launchPack.arc,
            state: setup.launchPack.initialState,
            routes: candidateRoutes,
            requiredWindowSize: 3,
            reviewMode: 'offline_judge',
          });
          planned = generatedPlan;
          planCost = usageCost(generatedPlan.usages);
        }
        progress.buildCostUsd += planCost;
        if (planned.assessment.status !== 'pass') {
          throw new StoryFactoryError('plan_blocked', 'Current Planner and Plan Judge rejected chapters 1-3.', {
            assessment: planned.assessment,
            chapterNumbers: planned.rollingPlan.plans.map(plan => plan.chapterNumber),
          });
        }
        if (planned.rollingPlan.plans.length !== 3
          || planned.rollingPlan.plans.some((plan, index) => plan.chapterNumber !== index + 1)) {
          throw new StoryFactoryError('plan_blocked', 'Current Planner and Plan Judge must pass exactly chapters 1-3.', {
            assessment: planned.assessment,
            chapterNumbers: planned.rollingPlan.plans.map(plan => plan.chapterNumber),
          });
        }
        const acceptedInitialWindow = {
          rollingPlan: planned.rollingPlan,
          assessment: planned.assessment,
        };
        progress.plannedWindows[lane] = {
          rollingPlan: acceptedInitialWindow.rollingPlan,
          assessment: acceptedInitialWindow.assessment,
        };
        if (discoveryOnly) progress.planSuccesses += 1;
        persist();
        await heartbeat();

        if (discoveryOnly) {
          const firstPlan = planned.rollingPlan.plans[0];
          const planDigest = digestArtifact(firstPlan);
          progress.writerBriefs.push({
            id: `${entry.commission.slotKey.toLowerCase()}-ch1`,
            lane,
            launchPackDigest,
            planDigest,
            kernel: setup.launchPack.kernel,
            state: setup.launchPack.initialState,
            plan: firstPlan,
            nextPlan: planned.rollingPlan.plans[1],
            previousTail: null,
            continuityEvidence: null,
            planAssessment: acceptedInitialWindow.assessment,
            causalValidation: {
              validatorVersion: CAUSAL_VALIDATOR_VERSION,
              mechanicUseCount: firstPlan.mechanicUses.length,
              digest: digestArtifact({
                validatorVersion: CAUSAL_VALIDATOR_VERSION,
                planDigest,
                mechanicUses: firstPlan.mechanicUses,
              }),
            },
          });
          persist();
          continue;
        }

        stage = 'chapters';
        let state: StoryState = setup.launchPack.initialState;
        let previous = '';
        const eventLedger = progress.stateEventsByLane[lane] ?? [];
        progress.stateEventsByLane[lane] = eventLedger;
        const laneSamples: SequentialBenchmarkCorpus['samples'] = [];
        const chapters: Array<{ chapterNumber: number; title: string; content: string }> = [];
        const writePlannedWindow = async (
          window: PassedPlanWindow,
          windowPlanCost: number,
        ) => {
          for (const [planIndex, plan] of window.rollingPlan.plans.entries()) {
            const stateBefore = state;
            const previousTail = previous ? tailWords(previous) : null;
            const continuityPacket = buildContinuityPacketFromEvents({
              state: stateBefore,
              entityIds: memoryEntityIdsForPlan(setup.launchPack.kernel, plan),
              events: eventLedger,
            });
            const flattenedContinuity = flattenContinuityPacket(continuityPacket);
            const planDigest = digestArtifact(plan);
            const causalValidation = {
              validatorVersion: CAUSAL_VALIDATOR_VERSION,
              mechanicUseCount: plan.mechanicUses.length,
              digest: digestArtifact({
                validatorVersion: CAUSAL_VALIDATOR_VERSION,
                planDigest,
                mechanicUses: plan.mechanicUses,
              }),
            };
            progress.writerBriefs.push({
              id: `${entry.commission.slotKey.toLowerCase()}-ch${plan.chapterNumber}`,
              lane,
              launchPackDigest,
              planDigest,
              kernel: setup.launchPack.kernel,
              state: stateBefore,
              plan,
              nextPlan: window.rollingPlan.plans[planIndex + 1] ?? null,
              previousTail,
              continuityEvidence: {
                digest: digestArtifact(continuityPacket),
                transitionCount: flattenedContinuity.length,
                recentOutcomeCount: continuityPacket.recentOutcomes.length,
              },
              planAssessment: window.assessment,
              causalValidation,
            });
            persist();

            let candidate;
            try {
              candidate = await writeStoryChapter({
                kernel: setup.launchPack.kernel,
                state: stateBefore,
                plan,
                nextPlan: window.rollingPlan.plans[planIndex + 1],
                previousChapter: previous || undefined,
                continuityPacket,
                routes: candidateRoutes,
              });
            } catch (error) {
              progress.generationFailures += 1;
              const telemetry = failedChapterTelemetry(error);
              if (telemetry) {
                progress.chapterAttempts.push({
                  id: `${entry.commission.slotKey.toLowerCase()}-ch${plan.chapterNumber}`,
                  lane,
                  chapterNumber: plan.chapterNumber,
                  outcome: 'failed',
                  errorCode: error instanceof StoryFactoryError ? error.code : null,
                  telemetry,
                });
                persist();
              }
              throw error;
            }
            const generationCost = usageCost(candidate.usages);
            progress.buildCostUsd += generationCost;
            progress.chapterAttempts.push({
              id: `${entry.commission.slotKey.toLowerCase()}-ch${plan.chapterNumber}`,
              lane,
              chapterNumber: plan.chapterNumber,
              outcome: 'published',
              errorCode: null,
              telemetry: candidate.attemptTelemetry,
            });
            persist();

            stage = 'continuity';
            const continuity = await assessSequentialContinuity({
              kernel: setup.launchPack.kernel,
              plan,
              stateBefore,
              stateAfter: candidate.stateAfter,
              previousTail,
              continuityPacket,
              content: candidate.draft.content,
              model: continuityJudgeModel,
            });
            progress.buildCostUsd += continuity.usage.costUsd;
            if (continuity.assessment.status !== 'pass') {
              progress.continuityFailures += 1;
              throw new Error(`Continuity Judge failed ${lane} chapter ${plan.chapterNumber}: ${JSON.stringify(continuity.assessment.issues)}`);
            }

            const sample = {
              id: `${entry.commission.slotKey.toLowerCase()}-ch${plan.chapterNumber}`,
              lane,
              launchPackDigest,
              planDigest,
              readerBrief: {
                premise: setup.launchPack.kernel.description,
                chapterNumber: plan.chapterNumber,
                previousTail,
              },
              content: candidate.draft.content,
              title: candidate.draft.title,
              allInCostUsd: generationCost
                + continuity.usage.costUsd
                + setupCost / 5
                + windowPlanCost / window.rollingPlan.plans.length,
              revisionCount: candidate.revisionCount,
              planAssessment: window.assessment,
              causalValidation,
              continuityAssessment: continuity.assessment,
              stateBeforeDigest: digestArtifact(stateBefore),
              stateAfterDigest: digestArtifact(candidate.stateAfter),
            } as const;
            laneSamples.push(sample);
            progress.samples.push(sample);
            state = candidate.stateAfter;
            eventLedger.push(...candidate.stateEvents);
            previous = candidate.draft.content;
            chapters.push({
              chapterNumber: plan.chapterNumber,
              title: candidate.draft.title,
              content: candidate.draft.content,
            });
            stage = 'chapters';
            persist();
            await heartbeat();
          }
        };

        await writePlannedWindow(acceptedInitialWindow, planCost);

        stage = 'followup_plan';
        const followupPlan = await planRollingWindow({
          kernel: setup.launchPack.kernel,
          arc: setup.launchPack.arc,
          state,
          continuityPacket: buildContinuityPacketFromEvents({
            state,
            entityIds: memoryEntityIdsForArc(setup.launchPack.kernel, setup.launchPack.arc, state),
            events: eventLedger,
          }),
          routes: candidateRoutes,
          requiredWindowSize: 2,
          reviewMode: 'offline_judge',
        });
        const followupPlanCost = usageCost(followupPlan.usages);
        progress.buildCostUsd += followupPlanCost;
        if (followupPlan.assessment.status !== 'pass') {
          throw new StoryFactoryError('plan_blocked', 'Current Planner and Plan Judge rejected chapters 4-5 from committed chapter-3 state.', {
            assessment: followupPlan.assessment,
            chapterNumbers: followupPlan.rollingPlan.plans.map(plan => plan.chapterNumber),
            stateChapterNumber: state.chapterNumber,
          });
        }
        if (followupPlan.rollingPlan.plans.length !== 2
          || followupPlan.rollingPlan.plans.some((plan, index) => plan.chapterNumber !== index + 4)) {
          throw new StoryFactoryError('plan_blocked', 'Current Planner and Plan Judge must pass exactly chapters 4-5 from committed chapter-3 state.', {
            assessment: followupPlan.assessment,
            chapterNumbers: followupPlan.rollingPlan.plans.map(plan => plan.chapterNumber),
            stateChapterNumber: state.chapterNumber,
          });
        }
        const acceptedFollowupWindow = {
          rollingPlan: followupPlan.rollingPlan,
          assessment: followupPlan.assessment,
        };
        progress.followupPlannedWindows[lane] = {
          rollingPlan: acceptedFollowupWindow.rollingPlan,
          assessment: acceptedFollowupWindow.assessment,
        };
        progress.planSuccesses += 1;
        persist();
        await heartbeat();

        stage = 'chapters';
        await writePlannedWindow(acceptedFollowupWindow, followupPlanCost);

        stage = 'window_review';
        const reviewed = await reviewFiveChapterWindow({
          kernel: setup.launchPack.kernel,
          arc: setup.launchPack.arc,
          state,
          chapters,
          routes: candidateRoutes,
        });
        progress.buildCostUsd += reviewed.usage.costUsd;
        progress.windowReviews.push({
          lane,
          chapterNumbers: chapters.map(chapter => chapter.chapterNumber),
          chapterDigest: digestArtifact(chapters),
          review: reviewed.review,
          usage: reviewed.usage,
        });
        persist();
        if (reviewed.review.status === 'block') {
          progress.windowReviewFailures += 1;
          persist();
          throw new Error(`Five-chapter window failed: ${JSON.stringify(reviewed.review.issues)}`);
        }
        for (const sample of laneSamples) sample.allInCostUsd += reviewed.usage.costUsd / 5;
        persist();
        await heartbeat();
      } catch (error) {
        const record = error && typeof error === 'object' ? error as {
          message?: unknown;
          code?: unknown;
          evidence?: unknown;
        } : {};
        if (record.code === 'infra_blocked') progress.providerFailures += 1;
        progress.buildCostUsd += failedUsageCost(record.evidence);
        progress.failure = {
          lane,
          stage,
          message: String(record.message ?? error),
          code: typeof record.code === 'string' ? record.code : null,
          evidence: record.evidence ?? null,
        };
        persist();
        throw error;
      }
    }

    if (discoveryOnly) {
      const samples = selectWriterBriefs(progress.writerBriefs, laneOrder);
      const discoveryDigest = digestArtifact({
        release: STORY_FACTORY_RELEASE,
        launchPackDigests: progress.launchPackDigests,
        samples,
      });
      const writerCorpus = WriterBakeoffCorpusSchema.parse({
        protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
        engineRelease: STORY_FACTORY_RELEASE,
    engineRevision: STORY_FACTORY_REVISION,
        builtAt: new Date().toISOString(),
        planner: candidateRoutes.planner,
        planJudge: candidateRoutes.planJudge,
        sourceDiscoveryDigest: discoveryDigest,
        discoveryCostUsd: progress.buildCostUsd,
        samples,
      });
      writeFileSync(writerCorpusPath, `${JSON.stringify(writerCorpus, null, 2)}\n`);
      if (db && runId) {
        await ensureAuditBucket(db);
        const archive = gzipSync(Buffer.from(JSON.stringify({
          writerCorpus,
          resumeLineage: progress.resumeLineage,
          bookedSetupCostUsdByLane: progress.bookedSetupCostUsdByLane,
        })));
        const sha256 = createHash('sha256').update(archive).digest('hex');
        const storageKey = `benchmarks/writer-discovery-v4/${discoveryDigest}-${sha256}.json.gz`;
        await uploadImmutable(db, storageKey, archive, sha256);
        const finished = await db.from('story_factory_runs').update({
          status: 'passed',
          artifact_digest: sha256,
          output_artifact: {
            protocolVersion: buildProtocol,
            storageKey,
            sha256,
            discoveryDigest,
            samplesCompleted: samples.length,
            resumeCount: progress.resumeLineage.length,
          },
          estimated_cost_usd: progress.buildCostUsd,
          finished_at: new Date().toISOString(),
        }).eq('id', runId).eq('status', 'running');
        if (finished.error) throw finished.error;
      }
      console.log(JSON.stringify({
        mode: 'writer-discovery',
        writerCorpusPath,
        discoveryDigest,
        samples: samples.length,
        costUsd: progress.buildCostUsd,
      }, null, 2));
      return;
    }

    const corpus = SequentialBenchmarkCorpusSchema.parse({
      protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
      engineRelease: STORY_FACTORY_RELEASE,
    engineRevision: STORY_FACTORY_REVISION,
      builtAt: new Date().toISOString(),
      route: runtimeRoute(candidateRoutes),
      continuityJudgeModel,
      launchPackDigests: progress.launchPackDigests,
      setupSuccesses: progress.setupSuccesses,
      planSuccesses: progress.planSuccesses,
      providerFailures: progress.providerFailures,
      generationFailures: progress.generationFailures,
      continuityFailures: progress.continuityFailures,
      windowReviewFailures: progress.windowReviewFailures,
      buildCostUsd: progress.buildCostUsd,
      samples: progress.samples,
      windowReviews: progress.windowReviews,
    });
    const corpusDigest = digestArtifact(corpus);
    const writerCorpus = WriterBakeoffCorpusSchema.parse({
      protocolVersion: STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
      engineRelease: STORY_FACTORY_RELEASE,
    engineRevision: STORY_FACTORY_REVISION,
      builtAt: new Date().toISOString(),
      planner: candidateRoutes.planner,
      planJudge: candidateRoutes.planJudge,
      sourceDiscoveryDigest: digestArtifact({
        release: STORY_FACTORY_RELEASE,
        launchPackDigests: progress.launchPackDigests,
        samples: selectWriterBriefs(progress.writerBriefs, laneOrder),
      }),
      discoveryCostUsd: frozenProgress?.buildCostUsd ?? progress.buildCostUsd,
      samples: selectWriterBriefs(progress.writerBriefs, laneOrder),
    });
    writeFileSync(outputPath, `${JSON.stringify(corpus, null, 2)}\n`);
    writeFileSync(writerCorpusPath, `${JSON.stringify(writerCorpus, null, 2)}\n`);

    let audit: null | { runId: string; storageKey: string; sha256: string } = null;
    if (db && runId) {
      await ensureAuditBucket(db);
      const archive = gzipSync(Buffer.from(JSON.stringify({
        corpus,
        writerCorpus,
        chapterAttempts: progress.chapterAttempts,
      })));
      const sha256 = createHash('sha256').update(archive).digest('hex');
      const storageKey = `benchmarks/sequential-v3/${STORY_FACTORY_RELEASE}/${corpusDigest}-${sha256}.json.gz`;
      await uploadImmutable(db, storageKey, archive, sha256);
      const updated = await db.from('story_factory_runs').update({
        status: 'passed',
        artifact_digest: sha256,
        output_artifact: {
              protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
              corpusDigest,
              writerCorpusDigest: digestArtifact(writerCorpus),
              sourceDiscoveryDigest: writerCorpus.sourceDiscoveryDigest,
              launchPackDigests: corpus.launchPackDigests,
          storageKey,
          sha256,
          samplesCompleted: 20,
          planSuccesses: 4,
          continuityFailures: 0,
          windowReviewFailures: 0,
        },
        estimated_cost_usd: corpus.buildCostUsd,
        first_pass: corpus.samples.every(sample => sample.revisionCount === 0),
        finished_at: new Date().toISOString(),
      }).eq('id', runId).eq('status', 'running');
      if (updated.error) throw updated.error;
      audit = { runId, storageKey, sha256 };
    }
    console.log(JSON.stringify({
      protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
      release: STORY_FACTORY_RELEASE,
      outputPath,
      writerCorpusPath,
      corpusDigest,
      writerCorpusDigest: digestArtifact(writerCorpus),
      samples: corpus.samples.length,
      buildCostUsd: corpus.buildCostUsd,
      audit,
    }, null, 2));
  } catch (error) {
    if (db && runId) {
      await ensureAuditBucket(db);
      const archive = gzipSync(Buffer.from(JSON.stringify({ progress })));
      const sha256 = createHash('sha256').update(archive).digest('hex');
      const failureKind = discoveryOnly ? 'writer-discovery-v4' : 'sequential-v3';
      const storageKey = `benchmarks/${failureKind}-failed/${STORY_FACTORY_RELEASE}/${runId}-${sha256}.json.gz`;
      await uploadImmutable(db, storageKey, archive, sha256);
      const infra = progress.providerFailures > 0;
      const updated = await db.from('story_factory_runs').update({
        status: infra ? 'infra_blocked' : 'failed',
        error_code: infra ? 'infra_blocked' : 'sequential_survival_failed',
        error_message: error instanceof Error ? error.message : String(error),
        artifact_digest: sha256,
        output_artifact: {
          protocolVersion: buildProtocol,
          storageKey,
          sha256,
          setupSuccesses: progress.setupSuccesses,
          planSuccesses: progress.planSuccesses,
          samplesCompleted: progress.samples.length,
          providerFailures: progress.providerFailures,
          generationFailures: progress.generationFailures,
          continuityFailures: progress.continuityFailures,
          windowReviewFailures: progress.windowReviewFailures,
          failure: progress.failure,
          resumeCount: progress.resumeLineage.length,
        },
        estimated_cost_usd: progress.buildCostUsd,
        finished_at: new Date().toISOString(),
      }).eq('id', runId).eq('status', 'running');
      if (updated.error) throw updated.error;
    }
    throw error;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
