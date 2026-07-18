#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  BlindMachineJudgmentOutputV3Schema,
  MachineCalibrationPairCorpusV3Schema,
  computeMachineCalibrationMetricsV3,
  runMachineEnsembleV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';
import { getSupabase } from '../src/services/story-engine/utils/supabase';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RETRY_DELAYS = [2_000, 5_000, 10_000];

const arg = (name: string): string | null => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || null : null;
};
const has = (name: string): boolean => process.argv.includes(`--${name}`);
const inputPath = arg('input');
const outputPath = arg('output');
if (!inputPath || !outputPath) throw new Error('--input and --output are required.');
const inputFile = inputPath;
const outputFile = outputPath;

const cleanJson = (raw: string): unknown => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));

async function callGrok(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is required for the fixed Grok 4.5 calibration judge.');
  const schema = toGeminiResponseJsonSchema(BlindMachineJudgmentOutputV3Schema);
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://truyencity.com',
          'X-Title': 'TruyenCity Machine Calibration',
        },
        body: JSON.stringify({
          model: 'x-ai/grok-4.5',
          messages: [
            { role: 'system', content: 'Bạn là blind judge độc lập. Không đoán model, route, giá hoặc verdict. Chỉ trả JSON đúng schema.' },
            { role: 'user', content: prompt },
          ],
          reasoning: { effort: 'medium', exclude: true },
          max_tokens: 12_288,
          response_format: { type: 'json_schema', json_schema: { name: 'flagship_v3_machine_judgment', strict: true, schema } },
        }),
        signal: AbortSignal.timeout(360_000),
      });
      const retryable = [408, 409, 429].includes(response.status) || response.status >= 500;
      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (!response.ok || payload.error) {
        const error = new Error(`Grok 4.5 OpenRouter ${response.status}: ${payload.error?.message || 'unknown error'}`);
        if (retryable && attempt < RETRY_DELAYS.length) continue;
        throw error;
      }
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('Grok 4.5 returned no structured content.');
      return content;
    } catch (error) {
      const transport = error instanceof TypeError
        || (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name));
      if (!transport || attempt >= RETRY_DELAYS.length) throw error;
    }
  }
  throw new Error('Grok 4.5 transport retries exhausted.');
}

async function main(): Promise<void> {
  const pairCorpus = MachineCalibrationPairCorpusV3Schema.parse(JSON.parse(readFileSync(path.resolve(inputFile), 'utf8')));
  const outputSchema = toGeminiResponseJsonSchema(BlindMachineJudgmentOutputV3Schema);
  const corpus = await runMachineEnsembleV3(pairCorpus, {
    judge: async ({ lineage, prompt }) => {
      const raw = lineage === 'openrouter/x-ai/grok-4.5'
        ? await callGrok(prompt)
        : (await callFlagshipModel(prompt, {
          model: lineage === 'google/gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gpt-5.6-luna',
          temperature: 0.1,
          maxTokens: 12_288,
          thinkingLevel: 'medium',
          systemPrompt: 'Bạn là blind judge độc lập cho truyện dài tiếng Việt. Không đoán model, route, giá hoặc verdict. Chỉ trả JSON đúng schema.',
          responseJsonSchema: outputSchema,
        }, { jsonMode: true, schemaName: 'flagship_v3_machine_judgment' })).content;
      return BlindMachineJudgmentOutputV3Schema.parse(cleanJson(raw));
    },
  });
  const metrics = computeMachineCalibrationMetricsV3(corpus);
  writeFileSync(path.resolve(outputFile), `${JSON.stringify({ corpus, metrics }, null, 2)}\n`);
  if (has('persist')) {
    const { data, error } = await getSupabase().rpc('commit_flagship_machine_calibration_v3', {
      p_corpus: corpus,
      p_metrics: metrics,
    });
    if (error) throw new Error(`Could not persist machine calibration: ${error.message}`);
    console.log(JSON.stringify({ persisted: data, metrics }, null, 2));
  } else {
    console.log(JSON.stringify(metrics, null, 2));
  }
  if (!metrics.approved) process.exitCode = 2;
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
