import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
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

const sampleSchema = z.object({
  id: z.string().min(2),
  brief: z.unknown(),
  control: z.string().min(20),
  candidate: z.string().min(20),
}).strict();
const corpusSchema = z.object({ samples: z.array(sampleSchema).length(20) }).strict();
const judgmentSchema = z.object({
  preference: z.enum(['A', 'B', 'tie']),
  criticalContinuityViolation: z.boolean(),
  wantsNext: z.boolean(),
  reason: z.string().trim().min(5).max(800),
}).strict();

async function main() {
  const corpus = corpusSchema.parse(JSON.parse(readFileSync(corpusPath!, 'utf8')));
  const judgeModels = (process.env.FACTORY_JUDGE_MODELS || 'gemini-2.5-pro,gemini-3.5-flash,gemini-3.1-pro-preview').split(',').map(item => item.trim());
  if (judgeModels.length !== 3 || new Set(judgeModels).size !== 3) throw new Error('FACTORY_JUDGE_MODELS must contain three distinct Gemini routes.');
  const judgments: unknown[] = [];
  let majorityWins = 0;
  let majorityWantsNext = 0;
  let criticalViolations = 0;
  let totalCost = 0;
  for (const sample of corpus.samples) {
    const votes: Array<{ candidatePreferred: boolean; critical: boolean; wantsNext: boolean }> = [];
    for (const model of judgeModels) {
      const swap = parseInt(createHash('sha256').update(`${sample.id}:${model}`).digest('hex').slice(0, 2), 16) % 2 === 0;
      const a = swap ? sample.candidate : sample.control;
      const b = swap ? sample.control : sample.candidate;
      const result = await geminiProvider.json({
        model,
        system: 'Bạn là giám khảo blind cho truyện dài tiếng Việt. Không suy đoán model; ưu tiên tính nối tiếp, nhân quả, giọng nhân vật và ham muốn đọc tiếp.',
        prompt: JSON.stringify({ brief: sample.brief, versionA: a, versionB: b }),
        schema: judgmentSchema,
        temperature: 0.4,
      });
      totalCost += result.usage.costUsd;
      const candidatePreferred = result.value.preference === (swap ? 'A' : 'B');
      votes.push({ candidatePreferred, critical: result.value.criticalContinuityViolation, wantsNext: result.value.wantsNext });
      judgments.push({ sampleId: sample.id, model, blinded: true, swap, ...result.value, usage: result.usage });
    }
    if (votes.filter(vote => vote.candidatePreferred).length >= 2) majorityWins += 1;
    if (votes.filter(vote => vote.wantsNext).length >= 2) majorityWantsNext += 1;
    if (votes.filter(vote => vote.critical).length >= 2) criticalViolations += 1;
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
    model_routes: { judges: judgeModels }, input_artifact: { corpusDigest: createHash('sha256').update(JSON.stringify(corpus)).digest('hex') },
    output_artifact: { metrics, judgments }, estimated_cost_usd: totalCost, finished_at: new Date().toISOString(),
  });
  if (inserted.error) throw inserted.error;
  if (!passed) process.exitCode = 2;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
