#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  BlindMachineJudgmentOutputV3Schema,
  MachineCalibrationPairCorpusV3Schema,
  SequentialSurvivalCorpusV3Schema,
  computeMachineCalibrationMetricsV3,
  runMachineEnsembleV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';
import { getSupabase } from '../src/services/story-engine/utils/supabase';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const arg = (name: string): string | null => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || null : null;
};
const has = (name: string): boolean => process.argv.includes(`--${name}`);
const inputPath = arg('input');
const sequentialPath = arg('sequential');
const outputPath = arg('output');
if (!inputPath || !sequentialPath || !outputPath) throw new Error('--input, --sequential and --output are required.');
const inputFile = inputPath;
const sequentialFile = sequentialPath;
const outputFile = outputPath;

const cleanJson = (raw: string): unknown => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));

function assertMachineJudgeCredentials(): void {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error('CALIBRATION_BLOCKED: GEMINI_API_KEY is required for the three pinned independent Gemini judge routes. No judge call was made.');
  }
}

async function main(): Promise<void> {
  assertMachineJudgeCredentials();
  const pairCorpus = MachineCalibrationPairCorpusV3Schema.parse(JSON.parse(readFileSync(path.resolve(inputFile), 'utf8')));
  const sequentialCorpus = SequentialSurvivalCorpusV3Schema.parse(JSON.parse(readFileSync(path.resolve(sequentialFile), 'utf8')));
  const outputSchema = toGeminiResponseJsonSchema(BlindMachineJudgmentOutputV3Schema);
  const corpus = await runMachineEnsembleV3(pairCorpus, sequentialCorpus, {
    judge: async ({ lineage, prompt }) => {
      const raw = (await callFlagshipModel(prompt, {
          model: lineage.replace(/^google\//, ''),
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
