#!/usr/bin/env tsx

import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  ConceptBatchV3Schema,
  ConceptPairwiseBatchV3Schema,
  FLAGSHIP_V3_CONCEPT_PROMPT_VERSION,
  FlagshipModelRoutesV3Schema,
  MarketResearchSnapshotV3Schema,
  OpeningReviewV3Schema,
  OpeningTrialV3Schema,
  runConceptTournamentV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const snapshotPath = value('--snapshot');
const routesPath = value('--routes');
const outputDir = value('--output');
const resumeRun = value('--resume-run');
if (!snapshotPath || !routesPath || !outputDir) throw new Error('--snapshot, --routes and --output are required.');

const snapshot = MarketResearchSnapshotV3Schema.parse(JSON.parse(readFileSync(path.resolve(snapshotPath), 'utf8')));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
let estimatedCostUsd = 0;
const calls: Array<{
  role: string;
  index: number;
  batchIndex: number | null;
  model: string;
  estimatedCostUsd: number;
  reused: boolean;
}> = [];
const target = path.resolve(outputDir);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(target, 'runs', runId);
const checkpointDir = path.join(runDir, 'checkpoints');
mkdirSync(checkpointDir, { recursive: true });

const schemaFor = (role: string) => role === 'concept_generator'
  ? ConceptBatchV3Schema
  : role === 'concept_judge'
    ? ConceptPairwiseBatchV3Schema
    : role === 'opening_simulator'
      ? OpeningTrialV3Schema
      : OpeningReviewV3Schema;

function checkpointContentValid(role: string, content: string): boolean {
  try {
    const value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    return schemaFor(role).safeParse(value).success;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const result = await runConceptTournamentV3({
    snapshot,
    invoke: async call => {
      const model = call.role === 'concept_generator'
        ? routes.setupGenerators[call.index]
        : call.role === 'concept_judge' || call.role === 'opening_judge'
          ? routes.setupJudges[call.index]
          : routes.openingSimulator;
      const resumeCheckpoint = resumeRun
        ? path.resolve(
            resumeRun,
            'checkpoints',
            `${call.role}-${call.index}${call.batchIndex === undefined ? '' : `-${call.batchIndex}`}.json`,
          )
        : null;
      if (resumeCheckpoint && existsSync(resumeCheckpoint)) {
        const checkpoint = JSON.parse(readFileSync(resumeCheckpoint, 'utf8')) as {
          model?: string;
          promptVersion?: string;
          estimatedCostUsd?: number;
          content?: string;
        };
        if (
          checkpoint.model === model
          && checkpoint.promptVersion === FLAGSHIP_V3_CONCEPT_PROMPT_VERSION
          && checkpoint.content
          && checkpointContentValid(call.role, checkpoint.content)
        ) {
          const checkpointCost = Number(checkpoint.estimatedCostUsd || 0);
          estimatedCostUsd += checkpointCost;
          calls.push({
            role: call.role,
            index: call.index,
            batchIndex: call.batchIndex ?? null,
            model,
            estimatedCostUsd: checkpointCost,
            reused: true,
          });
          writeFileSync(
            path.join(checkpointDir, `${call.role}-${call.index}${call.batchIndex === undefined ? '' : `-${call.batchIndex}`}.json`),
            `${JSON.stringify({ ...checkpoint, role: call.role, index: call.index, reusedFrom: resumeCheckpoint }, null, 2)}\n`,
          );
          return checkpoint.content;
        }
      }
      const response = await callFlagshipModel(call.prompt, {
        model,
        temperature: call.role === 'concept_generator' ? 0.85 : call.role === 'opening_simulator' ? 0.75 : 0.15,
        maxTokens: 32768,
        systemPrompt: call.role === 'concept_generator'
          ? 'Tạo concept độc lập, không sao chép tác phẩm nguồn và chỉ trả JSON.'
          : call.role === 'opening_simulator'
            ? 'Viết opening thử nghiệm theo concept, không tạo setup ngoài concept và chỉ trả JSON.'
            : 'Bạn là giám khảo blind độc lập, chấm cơ chế và chất lượng đọc thay vì tên model; chỉ trả JSON.',
        responseJsonSchema: toGeminiResponseJsonSchema(schemaFor(call.role)),
      }, {
        jsonMode: true,
        schemaName: `flagship_v3_${call.role}_${call.index}_${call.batchIndex ?? 0}`,
      });
      const callCost = Number(response.estimatedCostUsd || 0);
      estimatedCostUsd += callCost;
      calls.push({
        role: call.role,
        index: call.index,
        batchIndex: call.batchIndex ?? null,
        model,
        estimatedCostUsd: callCost,
        reused: false,
      });
      writeFileSync(
        path.join(checkpointDir, `${call.role}-${call.index}${call.batchIndex === undefined ? '' : `-${call.batchIndex}`}.json`),
        `${JSON.stringify({
          role: call.role,
          index: call.index,
          batchIndex: call.batchIndex ?? null,
          model,
          promptVersion: FLAGSHIP_V3_CONCEPT_PROMPT_VERSION,
          estimatedCostUsd: callCost,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          finishReason: response.finishReason,
          content: response.content,
        }, null, 2)}\n`,
      );
      return response.content;
    },
  });

  writeFileSync(path.join(target, 'tournament-v3.json'), `${JSON.stringify(result, null, 2)}\n`);
  const runManifest = {
    schemaVersion: 3,
    promptVersion: FLAGSHIP_V3_CONCEPT_PROMPT_VERSION,
    snapshotId: snapshot.snapshotId,
    routeVersion: routes.routeVersion,
    selectedConceptId: result.selected.id,
    callCount: calls.length,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    calls,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(path.join(runDir, 'tournament-run-v3.json'), `${JSON.stringify(runManifest, null, 2)}\n`);
  writeFileSync(path.join(target, 'tournament-run-v3.json'), `${JSON.stringify(runManifest, null, 2)}\n`);
  console.log(JSON.stringify({
    selectedConceptId: result.selected.id,
    title: result.selected.title,
    callCount: calls.length,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    output: target,
    runDir,
  }, null, 2));
}

main().catch(error => {
  writeFileSync(path.join(runDir, 'tournament-failure-v3.json'), `${JSON.stringify({
    schemaVersion: 3,
    promptVersion: FLAGSHIP_V3_CONCEPT_PROMPT_VERSION,
    snapshotId: snapshot.snapshotId,
    routeVersion: routes.routeVersion,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    calls,
    error: error instanceof Error ? error.message : String(error),
    detail: error && typeof error === 'object' && 'detail' in error ? error.detail : null,
    failedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
