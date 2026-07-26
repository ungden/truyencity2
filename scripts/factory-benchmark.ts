import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  ReaderJudgmentSchema,
  SequentialBenchmarkCorpusSchema,
  STORY_FACTORY_BENCHMARK_PROTOCOL,
  STORY_FACTORY_RELEASE,
  STORY_FACTORY_SEQUENTIAL_PROTOCOL,
  STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL,
  StoredReaderJudgmentSchema,
  ValidationManifestSchema,
  buildBlindReaderInput,
  calculateValidationMetrics,
  digestArtifact,
  geminiProvider,
  validationPasses,
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
const writerBakeoffRunId = value('--writer-bakeoff-run-id');
const sequentialRunId = value('--sequential-run-id');
if (!writerBakeoffRunId || !sequentialRunId) {
  throw new Error('--writer-bakeoff-run-id and --sequential-run-id are required.');
}
const uuid = z.string().uuid();
uuid.parse(writerBakeoffRunId);
uuid.parse(sequentialRunId);
const resolvedCorpusPath = path.resolve(corpusPath);
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
  if (existingDigest !== digest) throw new Error('Immutable validation artifact already exists with different bytes.');
}

async function verifyPrerequisites(db: SupabaseClient, corpusDigest: string, writer: string) {
  const [writerRun, sequentialRun] = await Promise.all([
    db.from('story_factory_runs')
      .select('id,status,engine_release,benchmark_protocol_version,input_artifact,output_artifact')
      .eq('id', writerBakeoffRunId)
      .single(),
    db.from('story_factory_runs')
      .select('id,status,engine_release,benchmark_protocol_version,output_artifact,model_routes')
      .eq('id', sequentialRunId)
      .single(),
  ]);
  if (writerRun.error) throw writerRun.error;
  if (sequentialRun.error) throw sequentialRun.error;
  if (writerRun.data.status !== 'passed'
    || writerRun.data.engine_release !== STORY_FACTORY_RELEASE
    || writerRun.data.benchmark_protocol_version !== STORY_FACTORY_WRITER_BAKEOFF_PROTOCOL
    || writerRun.data.output_artifact?.recommended !== writer
    || typeof writerRun.data.output_artifact?.corpusDigest !== 'string') {
    throw new Error('Plan-qualified Writer bake-off does not authorize this Writer route.');
  }
  if (!sequentialRun.data
    || sequentialRun.data.status !== 'passed'
    || sequentialRun.data.engine_release !== STORY_FACTORY_RELEASE
    || sequentialRun.data.benchmark_protocol_version !== STORY_FACTORY_SEQUENTIAL_PROTOCOL
    || sequentialRun.data.output_artifact?.corpusDigest !== corpusDigest
    || sequentialRun.data.model_routes?.route?.writer !== writer) {
    throw new Error('Sequential survival run does not authorize this corpus and Writer route.');
  }
  return { writerCorpusDigest: writerRun.data.output_artifact.corpusDigest as string };
}

async function main() {
  const corpus = SequentialBenchmarkCorpusSchema.parse(JSON.parse(readFileSync(resolvedCorpusPath, 'utf8')));
  if (corpus.engineRelease !== STORY_FACTORY_RELEASE) {
    throw new Error(`Sequential corpus release ${corpus.engineRelease} does not match ${STORY_FACTORY_RELEASE}.`);
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
    throw new Error('Reader checkpoint does not match the current release and sequential corpus.');
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
  const prerequisites = db
    ? await verifyPrerequisites(db, corpusDigest, corpus.route.writer)
    : { writerCorpusDigest: '0'.repeat(64) };
  let runId: string | null = null;
  if (db) {
    const inserted = await db.from('story_factory_runs').insert({
      kind: 'benchmark',
      status: 'running',
      engine_release: STORY_FACTORY_RELEASE,
      benchmark_protocol_version: STORY_FACTORY_BENCHMARK_PROTOCOL,
      artifact_digest: corpusDigest,
      model_routes: {
        route: corpus.route,
        continuityJudge: corpus.continuityJudgeModel,
        judges: judgeModels,
      },
      input_artifact: {
        protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
        corpusDigest,
        launchPackDigests: corpus.launchPackDigests,
        samplesExpected: 20,
        writerBakeoffRunId,
        writerCorpusDigest: prerequisites.writerCorpusDigest,
        sequentialRunId,
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
        const result = await geminiProvider.json({
          model,
          system: `Bạn là độc giả blind của truyện dài tiếng Việt.
Chỉ đọc premise ngắn, đoạn cuối chương trước và prose hiện tại.
Không suy đoán model, không đòi tuân thủ plan ẩn và không thưởng checklist kỹ thuật.
Trả wantsNext=true chỉ khi với tư cách độc giả bạn thực sự muốn mở chương kế tiếp.`,
          prompt: JSON.stringify(buildBlindReaderInput({ sample })),
          schema: ReaderJudgmentSchema,
          temperature: 0.4,
        });
        return StoredReaderJudgmentSchema.parse({
          sampleId: sample.id,
          model,
          blinded: true,
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

    const metrics = calculateValidationMetrics({
      corpus,
      judgments,
      judgeModels,
      judgmentCostUsd,
    });
    const passed = validationPasses(metrics);
    const archive = gzipSync(Buffer.from(JSON.stringify({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      corpus,
      judgments,
      writerBakeoffRunId,
      writerCorpusDigest: prerequisites.writerCorpusDigest,
      sequentialRunId,
    })));
    const artifactSha256 = createHash('sha256').update(archive).digest('hex');
    const artifactStorageKey = `benchmarks/validation-v3/${STORY_FACTORY_RELEASE}/${corpusDigest}-${artifactSha256}.json.gz`;
    const manifest = ValidationManifestSchema.parse({
      protocolVersion: STORY_FACTORY_BENCHMARK_PROTOCOL,
      engineRelease: STORY_FACTORY_RELEASE,
      route: corpus.route,
      continuityJudgeModel: corpus.continuityJudgeModel,
      judgeModels,
      launchPackDigests: corpus.launchPackDigests,
      writerBakeoffRunId,
      sequentialRunId,
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
        error_code: passed ? null : 'validation_gate_failed',
        error_message: passed ? null : 'Sequential reader validation did not satisfy every promotion gate.',
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
        error_code: infra ? 'infra_blocked' : 'validation_execution_failed',
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
