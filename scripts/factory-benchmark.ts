import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  BenchmarkManifestV2Schema,
  ReaderJudgmentSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_BENCHMARK_PROTOCOL,
  STORY_FACTORY_RELEASE,
  StoredReaderJudgmentSchema,
  benchmarkPasses,
  buildBlindReaderInput,
  calculateBenchmarkMetrics,
  digestArtifact,
  geminiProvider,
  type StoredReaderJudgment,
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
if (!corpusPath) throw new Error('--corpus is required.');
const resolvedCorpusPath = path.resolve(corpusPath);
const checkpointPath = path.resolve(value('--checkpoint') ?? `${resolvedCorpusPath}.judgments.json`);
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
  corpusDigest: z.string().length(64),
  judgmentCostUsd: z.number().nonnegative(),
  judgments: z.array(StoredReaderJudgmentSchema),
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
  if (existingDigest !== digest) throw new Error('Immutable benchmark artifact key already exists with different bytes.');
}

async function main() {
  const corpus = SequentialBenchmarkCorpusSchema.parse(JSON.parse(readFileSync(resolvedCorpusPath, 'utf8')));
  if (corpus.engineRelease !== STORY_FACTORY_RELEASE) {
    throw new Error(`Corpus release ${corpus.engineRelease} does not match ${STORY_FACTORY_RELEASE}.`);
  }
  const corpusDigest = digestArtifact(corpus);
  const checkpoint = existsSync(checkpointPath)
    ? checkpointSchema.parse(JSON.parse(readFileSync(checkpointPath, 'utf8')))
    : {
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      release: STORY_FACTORY_RELEASE,
      corpusDigest,
      judgmentCostUsd: 0,
      judgments: [] as StoredReaderJudgment[],
    };
  if (checkpoint.release !== STORY_FACTORY_RELEASE || checkpoint.corpusDigest !== corpusDigest) {
    throw new Error('Benchmark checkpoint does not match the current release and corpus.');
  }
  const judgments = [...checkpoint.judgments];
  let judgmentCostUsd = checkpoint.judgmentCostUsd;
  const persist = () => writeFileSync(checkpointPath, `${JSON.stringify({
    protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
    release: STORY_FACTORY_RELEASE,
    corpusDigest,
    judgmentCostUsd,
    judgments,
  }, null, 2)}\n`);

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
      benchmark_protocol_version: STORY_FACTORY_BENCHMARK_PROTOCOL,
      artifact_digest: corpusDigest,
      model_routes: {
        candidate: corpus.candidateRoute,
        control: corpus.controlRoute,
        judges: judgeModels,
      },
      input_artifact: {
        protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
        corpusDigest,
        launchPackDigests: corpus.launchPackDigests,
        samplesExpected: 20,
      },
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    runId = inserted.data.id;
  }

  try {
    for (const sample of corpus.samples) {
      const missingModels = judgeModels.filter(model => !judgments.some(item => (
        item.sampleId === sample.id && item.model === model
      )));
      const created = await Promise.all(missingModels.map(async model => {
        const swap = parseInt(createHash('sha256').update(`${sample.id}:${model}`).digest('hex').slice(0, 2), 16) % 2 === 0;
        const result = await geminiProvider.json({
          model,
          system: `Bạn là độc giả blind của truyện dài tiếng Việt.
Chỉ đánh giá hai bản prose như một độc giả: giọng nhân vật, độ tự nhiên, sức căng, cảm xúc, nhân quả thể hiện trong cảnh và việc có muốn đọc chương tiếp hay không.
Không suy đoán model, không đòi tuân thủ dàn ý ẩn và không thưởng cho checklist kỹ thuật.`,
          prompt: JSON.stringify(buildBlindReaderInput({ sample, swap })),
          schema: ReaderJudgmentSchema,
          temperature: 0.4,
        });
        return StoredReaderJudgmentSchema.parse({
          sampleId: sample.id,
          model,
          blinded: true,
          swap,
          ...result.value,
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

    const metrics = calculateBenchmarkMetrics({
      corpus,
      judgments,
      judgeModels,
      judgmentCostUsd,
    });
    const passed = benchmarkPasses(metrics);
    const archive = gzipSync(Buffer.from(JSON.stringify({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      corpus,
      judgments,
    })));
    const artifactSha256 = createHash('sha256').update(archive).digest('hex');
    const artifactStorageKey = `benchmarks/v2/${STORY_FACTORY_RELEASE}/${corpusDigest}-${artifactSha256}.json.gz`;
    const manifest = BenchmarkManifestV2Schema.parse({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      engineRelease: STORY_FACTORY_RELEASE,
      candidateRoute: corpus.candidateRoute,
      controlRoute: corpus.controlRoute,
      judgeModels,
      launchPackDigests: corpus.launchPackDigests,
      corpusDigest,
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
        error_code: passed ? null : 'benchmark_gate_failed',
        error_message: passed ? null : 'Benchmark V2 did not satisfy every promotion gate.',
        artifact_digest: artifactSha256,
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
        error_code: infra ? 'infra_blocked' : 'benchmark_execution_failed',
        error_message: error instanceof Error ? error.message : String(error),
        estimated_cost_usd: corpus.buildCostUsd + judgmentCostUsd,
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
