import dotenv from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { geminiProvider, STORY_FACTORY_RELEASE } from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const corpusPath = value('--corpus');
if (!corpusPath) throw new Error('--corpus is required.');
const checkpointPath = value('--checkpoint') ?? `${corpusPath}.judgments.json`;

const sampleSchema = z.object({
  id: z.string().min(2),
  brief: z.unknown(),
  control: z.string().min(20),
  candidate: z.string().min(20),
}).strict();
const corpusSchema = z.object({
  sourceRef: z.string().min(4).optional(),
  engineRelease: z.string().min(4).optional(),
  builtAt: z.string().datetime().optional(),
  buildCostUsd: z.number().nonnegative().optional(),
  generationFailures: z.number().int().nonnegative().optional(),
  samples: z.array(sampleSchema).length(20),
}).strict();
const judgmentSchema = z.object({
  preference: z.enum(['A', 'B', 'tie']),
  criticalContinuityViolationA: z.boolean(),
  criticalContinuityViolationB: z.boolean(),
  wantsNextA: z.boolean(),
  wantsNextB: z.boolean(),
  reason: z.string().trim().min(5).max(2_000),
}).strict();
const storedJudgmentSchema = judgmentSchema.extend({
  sampleId: z.string().min(2),
  model: z.string().min(3),
  blinded: z.literal(true),
  swap: z.boolean(),
  usage: z.unknown(),
}).strict();
type StoredJudgment = z.infer<typeof storedJudgmentSchema>;
const checkpointSchema = z.object({
  release: z.string().min(4),
  corpusDigest: z.string().length(64),
  totalCostUsd: z.number().nonnegative(),
  judgments: z.array(storedJudgmentSchema),
}).strict();

async function main() {
  const corpus = corpusSchema.parse(JSON.parse(readFileSync(corpusPath!, 'utf8')));
  if (corpus.engineRelease && corpus.engineRelease !== STORY_FACTORY_RELEASE) {
    throw new Error(`Corpus release ${corpus.engineRelease} does not match ${STORY_FACTORY_RELEASE}.`);
  }
  if (new Set(corpus.samples.map(sample => sample.id)).size !== corpus.samples.length) {
    throw new Error('Benchmark sample ids must be unique.');
  }
  const judgeModels = (process.env.FACTORY_JUDGE_MODELS || 'gemini-2.5-pro,gemini-3.5-flash,gemini-3.1-pro-preview').split(',').map(item => item.trim());
  if (judgeModels.length !== 3 || new Set(judgeModels).size !== 3) throw new Error('FACTORY_JUDGE_MODELS must contain three distinct Gemini routes.');
  const corpusDigest = createHash('sha256').update(JSON.stringify(corpus)).digest('hex');
  const checkpoint = existsSync(checkpointPath)
    ? checkpointSchema.parse(JSON.parse(readFileSync(checkpointPath, 'utf8')))
    : { release: STORY_FACTORY_RELEASE, corpusDigest, totalCostUsd: 0, judgments: [] as StoredJudgment[] };
  if (checkpoint.release !== STORY_FACTORY_RELEASE || checkpoint.corpusDigest !== corpusDigest) {
    throw new Error('Benchmark checkpoint does not match the current release and corpus.');
  }
  const judgments: StoredJudgment[] = [...checkpoint.judgments];
  let majorityWins = 0;
  let majorityWantsNext = 0;
  let criticalViolations = 0;
  let totalCost = checkpoint.totalCostUsd;
  const persist = () => writeFileSync(checkpointPath, `${JSON.stringify({
    release: STORY_FACTORY_RELEASE,
    corpusDigest,
    totalCostUsd: totalCost,
    judgments,
  }, null, 2)}\n`);
  for (let batchStart = 0; batchStart < corpus.samples.length; batchStart += 5) {
    await Promise.all(corpus.samples.slice(batchStart, batchStart + 5).map(async sample => {
      const votes: Array<{ candidatePreferred: boolean; critical: boolean; wantsNext: boolean }> = [];
      for (const model of judgeModels) {
      const swap = parseInt(createHash('sha256').update(`${sample.id}:${model}`).digest('hex').slice(0, 2), 16) % 2 === 0;
      const a = swap ? sample.candidate : sample.control;
      const b = swap ? sample.control : sample.candidate;
      const existing = judgments.find(item => item.sampleId === sample.id && item.model === model);
      const judgment = existing ?? await (async () => {
        const result = await geminiProvider.json({
          model,
          system: `Bạn là giám khảo blind cho truyện dài tiếng Việt. Không suy đoán model.
Đánh giá riêng cả A và B về lỗi continuity nghiêm trọng và việc bạn có muốn đọc chương tiếp theo hay không.
Sau đó chọn bản tốt hơn dựa trên tính nối tiếp, nhân quả, giọng nhân vật, độ tự nhiên và sức kéo đọc tiếp.`,
          prompt: JSON.stringify({ brief: sample.brief, versionA: a, versionB: b }),
          schema: judgmentSchema,
          temperature: 0.4,
        });
        totalCost += result.usage.costUsd;
        const stored: StoredJudgment = { sampleId: sample.id, model, blinded: true, swap, ...result.value, usage: result.usage };
        judgments.push(stored);
        persist();
        console.log(JSON.stringify({ sampleId: sample.id, model, judgments: judgments.length }));
        return stored;
      })();
      const candidatePreferred = judgment.preference === (swap ? 'A' : 'B');
      const critical = swap ? judgment.criticalContinuityViolationA : judgment.criticalContinuityViolationB;
      const wantsNext = swap ? judgment.wantsNextA : judgment.wantsNextB;
      votes.push({ candidatePreferred, critical, wantsNext });
      }
      if (votes.filter(vote => vote.candidatePreferred).length >= 2) majorityWins += 1;
      if (votes.filter(vote => vote.wantsNext).length >= 2) majorityWantsNext += 1;
      if (votes.filter(vote => vote.critical).length >= 2) criticalViolations += 1;
    }));
  }
  const metrics = {
    samples: 20,
    majorityPreference: majorityWins / 20,
    desireToReadNext: majorityWantsNext / 20,
    criticalContinuityViolations: criticalViolations,
    totalCostUsd: totalCost,
  };
  const passed = metrics.majorityPreference >= 0.65 && metrics.desireToReadNext >= 0.7 && criticalViolations === 0;
  console.log(JSON.stringify({ dryRun: !apply, release: STORY_FACTORY_RELEASE, passed, metrics }, null, 2));
  if (!apply) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is missing.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const inserted = await db.from('story_factory_runs').insert({
    kind: 'benchmark', status: passed ? 'passed' : 'failed', engine_release: STORY_FACTORY_RELEASE,
    model_routes: { judges: judgeModels }, input_artifact: {
      corpusDigest,
      sourceRef: corpus.sourceRef ?? null,
      builtAt: corpus.builtAt ?? null,
      buildCostUsd: corpus.buildCostUsd ?? null,
      generationFailures: corpus.generationFailures ?? 0,
    },
    output_artifact: { metrics, judgments }, estimated_cost_usd: totalCost, finished_at: new Date().toISOString(),
  });
  if (inserted.error) throw inserted.error;
  if (!passed) process.exitCode = 2;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
