#!/usr/bin/env tsx

import 'dotenv/config';
import { createHash } from 'node:crypto';
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
  conceptCallPromptVersionV3,
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
const requestedPromptVersion = value('--prompt-version');
if (!snapshotPath || !routesPath || !outputDir) throw new Error('--snapshot, --routes and --output are required.');

const snapshot = MarketResearchSnapshotV3Schema.parse(JSON.parse(readFileSync(path.resolve(snapshotPath), 'utf8')));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
const promptVersion = requestedPromptVersion || FLAGSHIP_V3_CONCEPT_PROMPT_VERSION;
const historicalPromptResume = promptVersion !== FLAGSHIP_V3_CONCEPT_PROMPT_VERSION;
let historicalResumeVerified = false;
if (resumeRun) {
  const manifestPath = ['tournament-run-v3.json', 'tournament-failure-v3.json']
    .map(name => path.join(path.resolve(resumeRun), name))
    .find(candidate => existsSync(candidate));
  if (!manifestPath) throw new Error('Historical resume requires its original run or failure manifest.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    snapshotId?: string;
    routeVersion?: string;
    promptVersion?: string;
  };
  if (manifest.snapshotId !== snapshot.snapshotId || manifest.routeVersion !== routes.routeVersion) {
    throw new Error('Resume manifest does not match snapshot and route version.');
  }
  if (historicalPromptResume) {
    if (manifest.promptVersion !== promptVersion) {
      throw new Error('Historical resume manifest does not match the requested prompt version.');
    }
    historicalResumeVerified = true;
  }
}
let estimatedCostUsd = 0;
const calls: Array<{
  role: string;
  index: number;
  batchIndex: number | null;
  model: string;
  thinkingLevel: 'low' | 'high';
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

const thinkingLevelFor = (role: string): 'low' | 'high' =>
  role === 'concept_generator' || role === 'opening_simulator' ? 'high' : 'low';

const temperatureFor = (role: string): number =>
  role === 'concept_generator' ? 0.85 : role === 'opening_simulator' ? 0.75 : 0.15;

const callDigest = (prompt: string, model: string, role: string): string => createHash('sha256')
  .update(JSON.stringify({
    prompt,
    model,
    temperature: temperatureFor(role),
    maxTokens: 32768,
    thinkingLevel: thinkingLevelFor(role),
  }))
  .digest('hex');

function checkpointContentValid(
  role: string,
  content: string,
  pairs?: Array<{ leftId: string; rightId: string }>,
): boolean {
  try {
    const value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    if (!schemaFor(role).safeParse(value).success) return false;
    if (role === 'concept_judge' && pairs) {
      const batch = ConceptPairwiseBatchV3Schema.parse(value);
      const expected = new Set(pairs.map(pair => [pair.leftId, pair.rightId].sort().join(':')));
      return batch.comparisons.length === pairs.length && batch.comparisons.every(comparison =>
        [comparison.leftId, comparison.rightId].includes(comparison.winnerId)
        && expected.has([comparison.leftId, comparison.rightId].sort().join(':')),
      );
    }
    if (role === 'opening_judge') {
      const review = OpeningReviewV3Schema.parse(value);
      return new Set(review.ranking).size === review.ranking.length;
    }
    return true;
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
          promptDigest?: string;
          estimatedCostUsd?: number;
          content?: string;
        };
        const promptDigest = callDigest(call.prompt, model, call.role);
        const checkpointPromptVersion = requestedPromptVersion || conceptCallPromptVersionV3(call.role);
        if (
          checkpoint.model === model
          && checkpoint.promptVersion === checkpointPromptVersion
          && (checkpoint.promptDigest === promptDigest || historicalResumeVerified)
          && checkpoint.content
          && checkpointContentValid(call.role, checkpoint.content, call.pairs)
        ) {
          const checkpointCost = Number(checkpoint.estimatedCostUsd || 0);
          estimatedCostUsd += checkpointCost;
          calls.push({
            role: call.role,
            index: call.index,
            batchIndex: call.batchIndex ?? null,
            model,
            thinkingLevel: thinkingLevelFor(call.role),
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
      if (historicalPromptResume && call.role === 'concept_generator') {
        throw new Error(`Historical prompt ${promptVersion} can only reuse an existing valid generator checkpoint.`);
      }
      const response = await callFlagshipModel(call.prompt, {
        model,
        temperature: temperatureFor(call.role),
        maxTokens: 32768,
        thinkingLevel: thinkingLevelFor(call.role),
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
        thinkingLevel: thinkingLevelFor(call.role),
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
          promptVersion: requestedPromptVersion || conceptCallPromptVersionV3(call.role),
          promptDigest: callDigest(call.prompt, model, call.role),
          thinkingLevel: thinkingLevelFor(call.role),
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
    promptVersion,
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
    promptVersion,
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
