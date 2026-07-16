#!/usr/bin/env tsx

import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  ConceptBatchV3Schema,
  ConceptPairwiseJudgeV3Schema,
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
if (!snapshotPath || !routesPath || !outputDir) throw new Error('--snapshot, --routes and --output are required.');

const snapshot = MarketResearchSnapshotV3Schema.parse(JSON.parse(readFileSync(path.resolve(snapshotPath), 'utf8')));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
let estimatedCostUsd = 0;
const calls: Array<{ role: string; index: number; model: string; estimatedCostUsd: number }> = [];

const schemaFor = (role: string) => role === 'concept_generator'
  ? ConceptBatchV3Schema
  : role === 'concept_judge'
    ? ConceptPairwiseJudgeV3Schema
    : role === 'opening_simulator'
      ? OpeningTrialV3Schema
      : OpeningReviewV3Schema;

const result = await runConceptTournamentV3({
  snapshot,
  invoke: async call => {
    const model = call.role === 'concept_generator'
      ? routes.setupGenerators[call.index]
      : call.role === 'concept_judge' || call.role === 'opening_judge'
        ? routes.setupJudges[call.index]
        : routes.openingSimulator;
    const response = await callFlagshipModel(call.prompt, {
      model,
      temperature: call.role === 'concept_generator' ? 0.85 : call.role === 'opening_simulator' ? 0.75 : 0.15,
      maxTokens: call.role === 'concept_judge' ? 65536 : 32768,
      systemPrompt: call.role === 'concept_generator'
        ? 'Tạo concept độc lập, không sao chép tác phẩm nguồn và chỉ trả JSON.'
        : call.role === 'opening_simulator'
          ? 'Viết opening thử nghiệm theo concept, không tạo setup ngoài concept và chỉ trả JSON.'
          : 'Bạn là giám khảo blind độc lập, chấm cơ chế và chất lượng đọc thay vì tên model; chỉ trả JSON.',
      responseJsonSchema: toGeminiResponseJsonSchema(schemaFor(call.role)),
    }, { jsonMode: true, schemaName: `flagship_v3_${call.role}_${call.index}` });
    const callCost = Number(response.estimatedCostUsd || 0);
    estimatedCostUsd += callCost;
    calls.push({ role: call.role, index: call.index, model, estimatedCostUsd: callCost });
    return response.content;
  },
});

const target = path.resolve(outputDir);
mkdirSync(target, { recursive: true });
writeFileSync(path.join(target, 'tournament-v3.json'), `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(path.join(target, 'tournament-run-v3.json'), `${JSON.stringify({
  schemaVersion: 3,
  snapshotId: snapshot.snapshotId,
  routeVersion: routes.routeVersion,
  selectedConceptId: result.selected.id,
  callCount: calls.length,
  estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
  calls,
  createdAt: new Date().toISOString(),
}, null, 2)}\n`);
console.log(JSON.stringify({
  selectedConceptId: result.selected.id,
  title: result.selected.title,
  callCount: calls.length,
  estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
  output: target,
}, null, 2));
