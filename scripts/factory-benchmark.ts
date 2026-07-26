import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  PairwiseSequentialJudgmentSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_BENCHMARK_PROTOCOL,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_SEQUENTIAL_PROTOCOL,
  STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
  StoredPairwiseSequentialJudgmentSchema,
  ValidationManifestSchema,
  assertComparableSequentialCorpora,
  buildBlindReaderComparison,
  calculateComparativeValidationMetrics,
  digestArtifact,
  geminiProvider,
  validationPasses,
  type StoredPairwiseSequentialJudgment,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const corpusPath = value('--corpus');
const competitorCorpusPath = value('--competitor-corpus');
if (!corpusPath || !competitorCorpusPath) throw new Error('--corpus and --competitor-corpus are required.');
const writerBakeoffRunId = value('--writer-bakeoff-run-id');
const sequentialRunId = value('--sequential-run-id');
const competingSequentialRunId = value('--competing-sequential-run-id');
if (!writerBakeoffRunId || !sequentialRunId || !competingSequentialRunId) {
  throw new Error('--writer-bakeoff-run-id, --sequential-run-id and --competing-sequential-run-id are required.');
}
const uuid = z.string().uuid();
uuid.parse(writerBakeoffRunId);
uuid.parse(sequentialRunId);
uuid.parse(competingSequentialRunId);
const resolvedCorpusPath = path.resolve(corpusPath);
const resolvedCompetitorCorpusPath = path.resolve(competitorCorpusPath);
const checkpointPath = path.resolve(value('--checkpoint') ?? `${resolvedCorpusPath}.reader-judgments.json`);
const judgeModels = (process.env.FACTORY_JUDGE_MODELS
  ?? 'gemini-2.5-pro,gemini-3.5-flash,gemini-3.1-pro-preview')
  .split(',')
  .map(item => item.trim());
if (judgeModels.length !== 3 || new Set(judgeModels).size !== 3) {
  throw new Error('FACTORY_JUDGE_MODELS must contain three distinct Gemini routes.');
}

const checkpointSchema = z.object({
  protocolVersion: z.literal(STORY_FACTORY_BENCHMARK_PROTOCOL),
  release: z.string().min(4),
  candidateCorpusDigest: z.string().length(64),
  competitorCorpusDigest: z.string().length(64),
  judgmentCostUsd: z.number().nonnegative(),
  judgments: z.array(StoredPairwiseSequentialJudgmentSchema),
}).strict();

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
  if (existingDigest !== digest) throw new Error('Immutable validation artifact already exists with different bytes.');
}

async function verifyPrerequisites(input: {
  db: SupabaseClient;
  candidateCorpusDigest: string;
  competitorCorpusDigest: string;
  writer: string;
  competitorWriter: string;
}) {
  const [writerRun, sequentialRun, competingSequentialRun] = await Promise.all([
    input.db.from('story_factory_runs')
      .select('id,status,engine_release,benchmark_protocol_version,input_artifact,output_artifact,estimated_cost_usd')
      .eq('id', writerBakeoffRunId)
      .single(),
    input.db.from('story_factory_runs')
      .select('id,status,engine_release,benchmark_protocol_version,output_artifact,model_routes,estimated_cost_usd')
      .eq('id', sequentialRunId)
      .single(),
    input.db.from('story_factory_runs')
      .select('id,status,engine_release,benchmark_protocol_version,output_artifact,model_routes,estimated_cost_usd')
      .eq('id', competingSequentialRunId)
      .single(),
  ]);
  if (writerRun.error) throw writerRun.error;
  if (sequentialRun.error) throw sequentialRun.error;
  if (competingSequentialRun.error) throw competingSequentialRun.error;
  if (writerRun.data.status !== 'passed'
    || writerRun.data.engine_release !== STORY_FACTORY_RELEASE
    || writerRun.data.benchmark_protocol_version !== STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL
    || !Array.isArray(writerRun.data.output_artifact?.topTwoWriters)
    || !writerRun.data.output_artifact.topTwoWriters.includes(input.writer)
    || !writerRun.data.output_artifact.topTwoWriters.includes(input.competitorWriter)
    || typeof writerRun.data.output_artifact?.corpusDigest !== 'string') {
    throw new Error('Plan-qualified Writer discovery did not select this route for sequential survival.');
  }
  if (!sequentialRun.data
    || sequentialRun.data.status !== 'passed'
    || sequentialRun.data.engine_release !== STORY_FACTORY_RELEASE
    || sequentialRun.data.benchmark_protocol_version !== STORY_FACTORY_SEQUENTIAL_PROTOCOL
    || sequentialRun.data.output_artifact?.corpusDigest !== input.candidateCorpusDigest
    || sequentialRun.data.output_artifact?.sourceDiscoveryDigest
      !== writerRun.data.input_artifact?.sourceDiscoveryDigest
    || sequentialRun.data.model_routes?.route?.writer !== input.writer) {
    throw new Error('Sequential survival run does not authorize this corpus and Writer route.');
  }
  if (!competingSequentialRun.data
    || competingSequentialRun.data.status !== 'passed'
    || competingSequentialRun.data.engine_release !== STORY_FACTORY_RELEASE
    || competingSequentialRun.data.benchmark_protocol_version !== STORY_FACTORY_SEQUENTIAL_PROTOCOL
    || competingSequentialRun.data.output_artifact?.corpusDigest !== input.competitorCorpusDigest
    || competingSequentialRun.data.output_artifact?.sourceDiscoveryDigest
      !== writerRun.data.input_artifact?.sourceDiscoveryDigest
    || competingSequentialRun.data.model_routes?.route?.writer !== input.competitorWriter) {
    throw new Error('Competing sequential survival run does not authorize its corpus and Writer route.');
  }
  return {
    writerCorpusDigest: writerRun.data.output_artifact.corpusDigest as string,
    campaignOverheadCostUsd: Number(writerRun.data.estimated_cost_usd ?? 0),
  };
}

async function main() {
  const corpus = SequentialBenchmarkCorpusSchema.parse(JSON.parse(readFileSync(resolvedCorpusPath, 'utf8')));
  const competitorCorpus = SequentialBenchmarkCorpusSchema.parse(
    JSON.parse(readFileSync(resolvedCompetitorCorpusPath, 'utf8')),
  );
  if (corpus.engineRelease !== STORY_FACTORY_RELEASE || competitorCorpus.engineRelease !== STORY_FACTORY_RELEASE) {
    throw new Error(`Sequential corpora must both match release ${STORY_FACTORY_RELEASE}.`);
  }
  assertComparableSequentialCorpora({ candidate: corpus, competitor: competitorCorpus });
  const candidateCorpusDigest = digestArtifact(corpus);
  const competitorCorpusDigest = digestArtifact(competitorCorpus);
  const checkpoint = existsSync(checkpointPath)
    ? checkpointSchema.parse(JSON.parse(readFileSync(checkpointPath, 'utf8')))
    : {
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      release: STORY_FACTORY_RELEASE,
      candidateCorpusDigest,
      competitorCorpusDigest,
      judgmentCostUsd: 0,
      judgments: [] as StoredPairwiseSequentialJudgment[],
    };
  if (checkpoint.release !== STORY_FACTORY_RELEASE
    || checkpoint.candidateCorpusDigest !== candidateCorpusDigest
    || checkpoint.competitorCorpusDigest !== competitorCorpusDigest) {
    throw new Error('Reader checkpoint does not match the current release and paired sequential corpora.');
  }
  const judgments = [...checkpoint.judgments];
  let judgmentCostUsd = checkpoint.judgmentCostUsd;
  const persist = () => writeFileSync(checkpointPath, `${JSON.stringify({
    protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
    release: STORY_FACTORY_RELEASE,
    candidateCorpusDigest,
    competitorCorpusDigest,
    judgmentCostUsd,
    judgments,
  }, null, 2)}\n`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = apply && url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  if (apply && !db) throw new Error('Supabase server environment is missing.');
  const prerequisites = db
    ? await verifyPrerequisites({
      db,
      candidateCorpusDigest,
      competitorCorpusDigest,
      writer: corpus.route.writer,
      competitorWriter: competitorCorpus.route.writer,
    })
    : { writerCorpusDigest: '0'.repeat(64), campaignOverheadCostUsd: 0 };
  let runId: string | null = null;
  if (db) {
    const inserted = await db.from('story_factory_runs').insert({
      kind: 'benchmark',
      status: 'running',
      engine_release: STORY_FACTORY_RELEASE,
      benchmark_protocol_version: STORY_FACTORY_BENCHMARK_PROTOCOL,
      artifact_digest: candidateCorpusDigest,
      model_routes: {
        route: corpus.route,
        continuityJudge: corpus.continuityJudgeModel,
        judges: judgeModels,
        competitorWriter: competitorCorpus.route.writer,
      },
      input_artifact: {
        protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
        corpusDigest: candidateCorpusDigest,
        competitorCorpusDigest,
        launchPackDigests: corpus.launchPackDigests,
        samplesExpected: 20,
        writerBakeoffRunId,
        writerCorpusDigest: prerequisites.writerCorpusDigest,
        sequentialRunId,
        competingSequentialRunId,
      },
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    runId = inserted.data.id;
  }

  try {
    for (const sample of corpus.samples) {
      const competitorSample = competitorCorpus.samples.find(item => item.id === sample.id)!;
      const missingModels = judgeModels.filter(model => !judgments.some(item => (
        item.sampleId === sample.id && item.model === model
      )));
      const created = await Promise.all(missingModels.map(async model => {
        const candidateIsA = parseInt(
          createHash('sha256').update(`${sample.id}:${model}:${candidateCorpusDigest}`).digest('hex').slice(0, 2),
          16,
        ) % 2 === 0;
        const result = await geminiProvider.json({
          model,
          system: `Bạn là độc giả blind của truyện dài tiếng Việt.
So sánh hai phiên bản được viết tuần tự từ cùng logic truyện. Mỗi phiên bản có đoạn cuối chương trước của chính nó.
Không suy đoán model, không đòi tuân thủ plan ẩn và không thưởng checklist kỹ thuật.
Chọn phiên bản đọc tự nhiên, nối chương và có sức kéo hơn; wantsNext phải phản ánh từng phiên bản độc lập.`,
          prompt: JSON.stringify(buildBlindReaderComparison({
            candidate: sample,
            competitor: competitorSample,
            candidateIsA,
          })),
          schema: PairwiseSequentialJudgmentSchema,
          temperature: 0.4,
        });
        return StoredPairwiseSequentialJudgmentSchema.parse({
          sampleId: sample.id,
          model,
          blinded: true,
          preference: result.value.preference === 'tie'
            ? 'tie'
            : result.value.preference === (candidateIsA ? 'A' : 'B') ? 'candidate' : 'competitor',
          wantsCandidate: candidateIsA ? result.value.wantsNextA : result.value.wantsNextB,
          wantsCompetitor: candidateIsA ? result.value.wantsNextB : result.value.wantsNextA,
          usage: result.usage,
        });
      }));
      for (const judgment of created) {
        judgments.push(judgment);
        const usage = judgment.usage as { costUsd?: unknown };
        if (typeof usage.costUsd === 'number') judgmentCostUsd += usage.costUsd;
      }
      persist();
      console.log(JSON.stringify({ sampleId: sample.id, judgments: judgments.length }));
    }

    const candidateMetrics = calculateComparativeValidationMetrics({
      candidate: corpus,
      competitor: competitorCorpus,
      judgments,
      judgeModels,
      judgmentCostUsd,
      campaignOverheadCostUsd: prerequisites.campaignOverheadCostUsd,
    });
    const reversedJudgments = judgments.map(judgment => ({
      ...judgment,
      preference: judgment.preference === 'candidate'
        ? 'competitor' as const
        : judgment.preference === 'competitor' ? 'candidate' as const : 'tie' as const,
      wantsCandidate: judgment.wantsCompetitor,
      wantsCompetitor: judgment.wantsCandidate,
    }));
    const competitorMetrics = calculateComparativeValidationMetrics({
      candidate: competitorCorpus,
      competitor: corpus,
      judgments: reversedJudgments,
      judgeModels,
      judgmentCostUsd,
      campaignOverheadCostUsd: prerequisites.campaignOverheadCostUsd,
    });
    const competitorWon = competitorMetrics.candidatePreference > candidateMetrics.candidatePreference;
    const selectedCorpus = competitorWon ? competitorCorpus : corpus;
    const rejectedCorpus = competitorWon ? corpus : competitorCorpus;
    const selectedCorpusDigest = competitorWon ? competitorCorpusDigest : candidateCorpusDigest;
    const rejectedCorpusDigest = competitorWon ? candidateCorpusDigest : competitorCorpusDigest;
    const selectedSequentialRunId = competitorWon ? competingSequentialRunId : sequentialRunId;
    const rejectedSequentialRunId = competitorWon ? sequentialRunId : competingSequentialRunId;
    const metrics = competitorWon ? competitorMetrics : candidateMetrics;
    const passed = validationPasses(metrics);
    const archive = gzipSync(Buffer.from(JSON.stringify({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      candidateCorpus: corpus,
      competitorCorpus,
      judgments,
      selection: {
        selectedWriter: selectedCorpus.route.writer,
        rejectedWriter: rejectedCorpus.route.writer,
        candidateMetrics,
        competitorMetrics,
      },
      writerBakeoffRunId,
      writerCorpusDigest: prerequisites.writerCorpusDigest,
      sequentialRunId,
      competingSequentialRunId,
    })));
    const artifactSha256 = createHash('sha256').update(archive).digest('hex');
    const artifactStorageKey = `benchmarks/validation-v5/${STORY_FACTORY_RELEASE}/${selectedCorpusDigest}-${artifactSha256}.json.gz`;
    const manifest = ValidationManifestSchema.parse({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      engineRelease: STORY_FACTORY_RELEASE,
      route: selectedCorpus.route,
      continuityJudgeModel: selectedCorpus.continuityJudgeModel,
      judgeModels,
      launchPackDigests: corpus.launchPackDigests,
      writerBakeoffRunId,
      writerCorpusDigest: prerequisites.writerCorpusDigest,
      sequentialRunId: selectedSequentialRunId,
      competingSequentialRunId: rejectedSequentialRunId,
      corpusDigest: selectedCorpusDigest,
      competingCorpusDigest: rejectedCorpusDigest,
      artifactStorageKey,
      artifactSha256,
      metrics,
      passed,
    });
    console.log(JSON.stringify({ dryRun: !apply, manifest }, null, 2));
    if (db && runId) {
      await ensureAuditBucket(db);
      await uploadImmutable(db, artifactStorageKey, archive, artifactSha256);
      const updated = await db.from('story_factory_runs').update({
        status: passed ? 'passed' : 'failed',
        error_code: passed ? null : 'validation_gate_failed',
        error_message: passed ? null : 'Sequential reader validation did not satisfy every promotion gate.',
        artifact_digest: artifactSha256,
        model_routes: {
          route: selectedCorpus.route,
          continuityJudge: selectedCorpus.continuityJudgeModel,
          judges: judgeModels,
          competitorWriter: rejectedCorpus.route.writer,
        },
        output_artifact: { manifest },
        estimated_cost_usd: metrics.totalCostUsd,
        first_pass: metrics.firstPassPublishRate === 1,
        finished_at: new Date().toISOString(),
      }).eq('id', runId).eq('status', 'running');
      if (updated.error) throw updated.error;
    }
    if (!passed) process.exitCode = 2;
  } catch (error) {
    if (db && runId) {
      const infra = error && typeof error === 'object' && 'code' in error
        && (error as { code?: unknown }).code === 'infra_blocked';
      await db.from('story_factory_runs').update({
        status: infra ? 'infra_blocked' : 'failed',
        error_code: infra ? 'infra_blocked' : 'validation_execution_failed',
        error_message: error instanceof Error ? error.message : String(error),
        estimated_cost_usd: corpus.buildCostUsd
          + competitorCorpus.buildCostUsd
          + prerequisites.campaignOverheadCostUsd
          + judgmentCostUsd,
        finished_at: new Date().toISOString(),
      }).eq('id', runId).eq('status', 'running');
    }
    throw error;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
