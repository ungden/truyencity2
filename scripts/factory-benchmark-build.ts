import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  DEFAULT_MODEL_ROUTES,
  ModelRoutesSchema,
  ResearchSnapshotSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_BENCHMARK_PROTOCOL,
  STORY_FACTORY_RELEASE,
  StoryCommissionSchema,
  digestArtifact,
  planRollingWindow,
  reviewFiveChapterWindow,
  runConceptLab,
  writeStoryChapter,
  type ModelRoutes,
  type PortfolioSignature,
  type ProviderUsage,
  type SequentialBenchmarkCorpus,
  type StoryState,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const suitePath = path.resolve(value('--suite') ?? 'factory/benchmark-v2/suite.json');
const outputPath = path.resolve(value('--output') ?? '/tmp/truyencity-benchmark-v2-corpus.json');
const progressPath = path.resolve(value('--progress') ?? `${outputPath}.progress.json`);
const candidateRoutesPath = value('--candidate-routes');
if (!candidateRoutesPath) throw new Error('--candidate-routes is required so the benchmark cannot silently test the wrong Writer route.');
const candidateRoutes = ModelRoutesSchema.parse(JSON.parse(readFileSync(path.resolve(candidateRoutesPath), 'utf8')));
const controlWriter = value('--control-writer') ?? 'gemini-3.6-flash';
const controlRoutes = ModelRoutesSchema.parse({
  ...candidateRoutes,
  writer: controlWriter,
  routeVersion: `${candidateRoutes.routeVersion}:control:${controlWriter}`,
});

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
  if (new Set(lanes).size !== 4) {
    throw new Error('Sequential benchmark requires four distinct lanes.');
  }
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
  candidateRoute: ReturnType<typeof runtimeRoute>;
  controlRoute: ReturnType<typeof runtimeRoute>;
  startedAt: string;
  setupSuccesses: number;
  planSuccesses: number;
  providerFailures: number;
  generationFailures: number;
  buildCostUsd: number;
  launchPackDigests: string[];
  samples: SequentialBenchmarkCorpus['samples'];
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

async function main() {
  const suiteEntries = loadSuite();
  const progress: Progress = {
    protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
    engineRelease: STORY_FACTORY_RELEASE,
    candidateRoute: runtimeRoute(candidateRoutes),
    controlRoute: runtimeRoute(controlRoutes),
    startedAt: new Date().toISOString(),
    setupSuccesses: 0,
    planSuccesses: 0,
    providerFailures: 0,
    generationFailures: 0,
    buildCostUsd: 0,
    launchPackDigests: [],
    samples: [],
    failure: null,
  };
  const persist = () => writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
  const signatures: PortfolioSignature[] = [];

  for (const entry of suiteEntries) {
    const lane = entry.commission.genreLane;
    let stage = 'setup';
    try {
      const setup = await runConceptLab({
        commission: entry.commission,
        research: entry.research,
        routes: candidateRoutes,
        existingSignatures: signatures,
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

      stage = 'plan';
      const planned = await planRollingWindow({
        kernel: setup.launchPack.kernel,
        arc: setup.launchPack.arc,
        state: setup.launchPack.initialState,
        routes: candidateRoutes,
      });
      if (planned.rollingPlan.plans.length !== 5
        || planned.rollingPlan.plans.some((plan, index) => plan.chapterNumber !== index + 1)) {
        throw new Error('Planner must return exactly chapters 1-5 for sequential survival.');
      }
      const planCost = usageCost(planned.usages);
      progress.buildCostUsd += planCost;
      progress.planSuccesses += 1;
      persist();

      stage = 'chapters';
      let state: StoryState = setup.launchPack.initialState;
      let previous = '';
      const laneSamples: SequentialBenchmarkCorpus['samples'] = [];
      const chapters: Array<{ chapterNumber: number; title: string; content: string }> = [];
      for (const plan of planned.rollingPlan.plans) {
        const stateBefore = state;
        const previousTail = previous ? tailWords(previous) : null;
        const [candidate, control] = await Promise.all([
          writeStoryChapter({
            kernel: setup.launchPack.kernel,
            state: stateBefore,
            plan,
            previousChapter: previous || undefined,
            routes: candidateRoutes,
          }),
          writeStoryChapter({
            kernel: setup.launchPack.kernel,
            state: stateBefore,
            plan,
            previousChapter: previous || undefined,
            routes: controlRoutes,
          }),
        ]);
        const candidateGenerationCost = usageCost(candidate.usages);
        const controlGenerationCost = usageCost(control.usages);
        progress.buildCostUsd += candidateGenerationCost + controlGenerationCost;
        laneSamples.push({
          id: `${entry.commission.slotKey.toLowerCase()}-ch${plan.chapterNumber}`,
          lane,
          launchPackDigest,
          readerBrief: {
            premise: setup.launchPack.kernel.description,
            chapterNumber: plan.chapterNumber,
            previousTail,
          },
          control: control.draft.content,
          candidate: candidate.draft.content,
          candidateTitle: candidate.draft.title,
          candidateCostUsd: candidateGenerationCost + (setupCost + planCost) / 5,
          candidateRevisionCount: candidate.revisionCount,
          continuityPassed: true,
        });
        state = candidate.stateAfter;
        previous = candidate.draft.content;
        chapters.push({
          chapterNumber: plan.chapterNumber,
          title: candidate.draft.title,
          content: candidate.draft.content,
        });
        progress.samples.push(laneSamples[laneSamples.length - 1]);
        persist();
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
        throw new Error(`Five-chapter window failed: ${JSON.stringify(reviewed.review.issues)}`);
      }
      for (const sample of laneSamples) {
        sample.candidateCostUsd += reviewed.usage.costUsd / 5;
      }
      persist();
    } catch (error) {
      const record = error && typeof error === 'object' ? error as {
        message?: unknown;
        code?: unknown;
        evidence?: unknown;
      } : {};
      progress.generationFailures += 1;
      if (record.code === 'infra_blocked') progress.providerFailures += 1;
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
    protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
    engineRelease: STORY_FACTORY_RELEASE,
    builtAt: new Date().toISOString(),
    candidateRoute: runtimeRoute(candidateRoutes),
    controlRoute: runtimeRoute(controlRoutes),
    launchPackDigests: progress.launchPackDigests,
    setupSuccesses: progress.setupSuccesses,
    planSuccesses: progress.planSuccesses,
    providerFailures: progress.providerFailures,
    generationFailures: progress.generationFailures,
    buildCostUsd: progress.buildCostUsd,
    samples: progress.samples,
  });
  writeFileSync(outputPath, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(JSON.stringify({
    protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
    release: STORY_FACTORY_RELEASE,
    outputPath,
    progressPath,
    corpusDigest: digestArtifact(corpus),
    samples: corpus.samples.length,
    buildCostUsd: corpus.buildCostUsd,
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
