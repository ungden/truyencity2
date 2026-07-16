#!/usr/bin/env tsx

import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  MarketResearchSnapshotV3Schema,
  validateLaunchPackV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const snapshotPath = value('--snapshot');
const tournamentPath = value('--tournament');
const routesPath = value('--routes');
const outputPath = value('--output');
if (!snapshotPath || !tournamentPath || !routesPath || !outputPath) {
  throw new Error('--snapshot, --tournament, --routes and --output are required.');
}
const snapshot = MarketResearchSnapshotV3Schema.parse(JSON.parse(readFileSync(path.resolve(snapshotPath), 'utf8')));
const tournament = JSON.parse(readFileSync(path.resolve(tournamentPath), 'utf8')) as {
  selected: unknown;
  openingTrials: Array<{ candidateId: string }>;
  openingReviews: unknown[];
};
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
const selected = tournament.selected as { id?: string };
if (!selected?.id) throw new Error('Tournament has no selected concept.');
const opening = tournament.openingTrials.find(item => item.candidateId === selected.id);
if (!opening) throw new Error('Selected concept has no opening trial.');

const response = await callFlagshipModel(
  `MARKET_SIGNAL_PROVENANCE=${JSON.stringify({ snapshotId: snapshot.snapshotId, signals: snapshot.signals })}
SELECTED_CONCEPT=${JSON.stringify(tournament.selected)}
APPROVED_OPENING=${JSON.stringify(opening)}
BLIND_OPENING_REVIEWS=${JSON.stringify(tournament.openingReviews)}

Tạo FlagshipLaunchPackV3. Kernel chỉ chứa quyết định riêng của truyện, không chứa taxonomy thị trường hoặc tên tác phẩm nguồn.
Arc đầu phải có 20-30 chương. InitialState chapterNumber=0 phải bao phủ toàn bộ character/resource/promise.
InitialWindow phải có đúng ChapterPlanV3 chương 1-5, resource arithmetic liên tục và không có câu exitHook viết sẵn.`,
  {
    model: routes.launchArchitect,
    temperature: 0.2,
    maxTokens: 65536,
    systemPrompt: 'Bạn là Launch Architect. Bảo toàn concept đã chọn, tạo đúng bốn artifact v3 và chỉ trả JSON theo schema.',
    responseJsonSchema: toGeminiResponseJsonSchema(FlagshipLaunchPackV3Schema),
  },
  { jsonMode: true, schemaName: 'flagship_v3_launch_pack' },
);
const pack = FlagshipLaunchPackV3Schema.parse(JSON.parse(response.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')));
if (pack.selectedConceptId !== selected.id) throw new Error('Launch Architect changed selected concept identity.');
validateLaunchPackV3(pack);
mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
writeFileSync(path.resolve(outputPath), `${JSON.stringify(pack, null, 2)}\n`);
console.log(JSON.stringify({
  valid: true,
  title: pack.kernel.title,
  selectedConceptId: pack.selectedConceptId,
  model: routes.launchArchitect,
  estimatedCostUsd: response.estimatedCostUsd || 0,
  output: path.resolve(outputPath),
}, null, 2));
