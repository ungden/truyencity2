import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  DEFAULT_MODEL_ROUTES,
  ModelRoutesSchema,
  ResearchSnapshotSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_SEQUENTIAL_PROTOCOL,
  STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
  StoryCommissionSchema,
  StoryFactoryError,
  WriterBakeoffCorpusSchema,
  assessSequentialContinuity,
  digestArtifact,
  planRollingWindow,
  reviewFiveChapterWindow,
  runConceptLab,
  writeStoryChapter,
  type ModelRoutes,
  type PlanQualifiedWriterBrief,
  type PortfolioSignature,
  type ProviderUsage,
  type SequentialBenchmarkCorpus,
  type SetupCheckpoint,
  type StoryState,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const suitePath = path.resolve(value('--suite') ?? 'factory/benchmark-v2/suite.json');
const outputPath = path.resolve(value('--output') ?? '/tmp/truyencity-sequential-v1-corpus.json');
const writerCorpusPath = path.resolve(value('--writer-corpus') ?? '/tmp/truyencity-writer-bakeoff-v2-corpus.json');
const progressPath = path.resolve(value('--progress') ?? `${outputPath}.progress.json`);
const candidateRoutesPath = value('--candidate-routes');
if (!candidateRoutesPath) throw new Error('--candidate-routes is required so sequential survival cannot silently test the wrong route.');
const candidateRoutes = ModelRoutesSchema.parse(JSON.parse(readFileSync(path.resolve(candidateRoutesPath), 'utf8')));
const continuityJudgeModel = value('--continuity-judge') ?? 'gemini-2.5-pro';

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
  setupCheckpoints: Record<string, SetupCheckpoint>;
  windowReviews: Array<{ lane: string; status: 'pass' }>;
  failure: null | { lane: string; stage: string; message: string; code: string | null; evidence: unknown };
};

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
  const limits = [3, 3, 2, 2];
  return laneOrder.flatMap((lane, index) => all.filter(brief => brief.lane === lane).slice(0, limits[index]));
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

async function main() {
  const suiteEntries = loadSuite();
  const laneOrder = suiteEntries.map(entry => entry.commission.genreLane);
  const progress: Progress = {
    protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
    engineRelease: STORY_FACTORY_RELEASE,
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
    setupCheckpoints: {},
    windowReviews: [],
    failure: null,
  };
  const persist = () => writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
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
      benchmark_protocol_version: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
      model_routes: {
        route: runtimeRoute(candidateRoutes),
        continuityJudge: continuityJudgeModel,
      },
      input_artifact: {
        protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
        lanes: laneOrder,
        samplesExpected: 20,
      },
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    runId = inserted.data.id;
  }
  const heartbeat = async (unbookedSetupCost = 0) => {
    if (!db || !runId) return;
    const updated = await db.from('story_factory_runs').update({
      output_artifact: {
        protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
        progress: {
          setupSuccesses: progress.setupSuccesses,
          planSuccesses: progress.planSuccesses,
          samplesCompleted: progress.samples.length,
          activeCheckpoints: Object.fromEntries(
            Object.entries(progress.setupCheckpoints).map(([lane, checkpoint]) => [lane, Object.keys(checkpoint)]),
          ),
        },
      },
      estimated_cost_usd: progress.buildCostUsd + unbookedSetupCost,
    }).eq('id', runId).eq('status', 'running');
    if (updated.error) throw updated.error;
  };

  try {
    for (const entry of suiteEntries) {
      const lane = entry.commission.genreLane;
      let stage = 'setup';
      try {
        const setup = await runConceptLab({
          commission: entry.commission,
          research: entry.research,
          routes: candidateRoutes,
          existingSignatures: signatures,
          onCheckpoint: async checkpoint => {
            progress.setupCheckpoints[lane] = checkpoint;
            persist();
            await heartbeat(Object.values(checkpoint).reduce(
              (sum, artifact) => sum + (artifact?.usage?.costUsd ?? 0),
              0,
            ));
          },
        });
        const setupCost = usageCost(setup.usages);
        progress.buildCostUsd += setupCost;
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
        const planned = await planRollingWindow({
          kernel: setup.launchPack.kernel,
          arc: setup.launchPack.arc,
          state: setup.launchPack.initialState,
          routes: candidateRoutes,
          requiredWindowSize: 5,
        });
        const planCost = usageCost(planned.usages);
        progress.buildCostUsd += planCost;
        if (planned.assessment.status !== 'pass'
          || planned.rollingPlan.plans.length !== 5
          || planned.rollingPlan.plans.some((plan, index) => plan.chapterNumber !== index + 1)) {
          throw new StoryFactoryError('plan_blocked', 'Current Planner and Plan Judge must pass exactly chapters 1-5.', {
            assessment: planned.assessment,
            chapterNumbers: planned.rollingPlan.plans.map(plan => plan.chapterNumber),
          });
        }
        progress.planSuccesses += 1;
        persist();
        await heartbeat();

        stage = 'chapters';
        let state: StoryState = setup.launchPack.initialState;
        let previous = '';
        const laneSamples: SequentialBenchmarkCorpus['samples'] = [];
        const chapters: Array<{ chapterNumber: number; title: string; content: string }> = [];
        for (const plan of planned.rollingPlan.plans) {
          const stateBefore = state;
          const previousTail = previous ? tailWords(previous) : null;
          const planDigest = digestArtifact(plan);
          progress.writerBriefs.push({
            id: `${entry.commission.slotKey.toLowerCase()}-ch${plan.chapterNumber}`,
            lane,
            launchPackDigest,
            planDigest,
            kernel: setup.launchPack.kernel,
            state: stateBefore,
            plan,
            previousTail,
            planAssessment: planned.assessment,
          });
          persist();

          let candidate;
          try {
            candidate = await writeStoryChapter({
              kernel: setup.launchPack.kernel,
              state: stateBefore,
              plan,
              previousChapter: previous || undefined,
              routes: candidateRoutes,
            });
          } catch (error) {
            progress.generationFailures += 1;
            throw error;
          }
          const generationCost = usageCost(candidate.usages);
          progress.buildCostUsd += generationCost;

          stage = 'continuity';
          const continuity = await assessSequentialContinuity({
            kernel: setup.launchPack.kernel,
            plan,
            stateBefore,
            stateAfter: candidate.stateAfter,
            previousTail,
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
            allInCostUsd: generationCost + continuity.usage.costUsd + (setupCost + planCost) / 5,
            revisionCount: candidate.revisionCount,
            planAssessment: planned.assessment,
            continuityAssessment: continuity.assessment,
            stateBeforeDigest: digestArtifact(stateBefore),
            stateAfterDigest: digestArtifact(candidate.stateAfter),
          } as const;
          laneSamples.push(sample);
          progress.samples.push(sample);
          state = candidate.stateAfter;
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

        stage = 'window_review';
        const reviewed = await reviewFiveChapterWindow({
          kernel: setup.launchPack.kernel,
          arc: setup.launchPack.arc,
          state,
          chapters,
          routes: candidateRoutes,
        });
        progress.buildCostUsd += reviewed.usage.costUsd;
        if (reviewed.review.status === 'block') {
          progress.windowReviewFailures += 1;
          throw new Error(`Five-chapter window failed: ${JSON.stringify(reviewed.review.issues)}`);
        }
        progress.windowReviews.push({ lane, status: 'pass' });
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
        if (stage === 'setup') {
          const checkpoint = progress.setupCheckpoints[lane] ?? {};
          const checkpointCost = Object.values(checkpoint).reduce((sum, artifact) => (
            sum + (artifact?.usage?.costUsd ?? 0)
          ), 0);
          progress.buildCostUsd += checkpointCost + failedUsageCost(record.evidence);
        } else {
          progress.buildCostUsd += failedUsageCost(record.evidence);
        }
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

    const corpus = SequentialBenchmarkCorpusSchema.parse({
      protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
      engineRelease: STORY_FACTORY_RELEASE,
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
      builtAt: new Date().toISOString(),
      planner: candidateRoutes.planner,
      planJudge: candidateRoutes.planJudge,
      sourceSequentialDigest: corpusDigest,
      samples: selectWriterBriefs(progress.writerBriefs, laneOrder),
    });
    writeFileSync(outputPath, `${JSON.stringify(corpus, null, 2)}\n`);
    writeFileSync(writerCorpusPath, `${JSON.stringify(writerCorpus, null, 2)}\n`);

    let audit: null | { runId: string; storageKey: string; sha256: string } = null;
    if (db && runId) {
      await ensureAuditBucket(db);
      const archive = gzipSync(Buffer.from(JSON.stringify({ corpus, writerCorpus })));
      const sha256 = createHash('sha256').update(archive).digest('hex');
      const storageKey = `benchmarks/sequential-v1/${STORY_FACTORY_RELEASE}/${corpusDigest}-${sha256}.json.gz`;
      await uploadImmutable(db, storageKey, archive, sha256);
      const updated = await db.from('story_factory_runs').update({
        status: 'passed',
        artifact_digest: sha256,
        output_artifact: {
          protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
          corpusDigest,
          writerCorpusDigest: digestArtifact(writerCorpus),
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
      const storageKey = `benchmarks/sequential-v1-failed/${STORY_FACTORY_RELEASE}/${runId}-${sha256}.json.gz`;
      await uploadImmutable(db, storageKey, archive, sha256);
      const infra = progress.providerFailures > 0;
      const updated = await db.from('story_factory_runs').update({
        status: infra ? 'infra_blocked' : 'failed',
        error_code: infra ? 'infra_blocked' : 'sequential_survival_failed',
        error_message: error instanceof Error ? error.message : String(error),
        artifact_digest: sha256,
        output_artifact: {
          protocolVersion: STORY_FACTORY_SEQUENTIAL_PROTOCOL,
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
