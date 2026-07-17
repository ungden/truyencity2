#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { z } from 'zod';
import {
  FLAGSHIP_V3_PROMPT_VERSION,
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  QualityVerdictV3ModelSchema,
  RollingPlanWindowDraftV3Schema,
  V3_ROLLING_PLANNER_PROMPT_VERSION,
  V3_ROLLING_PLANNER_SYSTEM,
  WriterOutputV3Schema,
  buildPlannerLedgerV3,
  buildV3PlannerContext,
  materializeRollingWindowV3,
  runOfflinePlannedWindowV3,
  validateLaunchPackV3,
  validateRollingWindowV3,
  type FlagshipV3ModelCall,
  type OfflineOpeningModelResponseV3,
  type OfflineOpeningRunV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const args = process.argv.slice(2);
const value = (name: string): string | null => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] || null : null; };
const launchPackPath = value('--launch-pack');
const routesPath = value('--routes');
const outputDir = value('--output');
const requestedChapters = Number(value('--chapters') || '10');
const targetWordCount = Number(value('--target-words') || '1800');
if (!launchPackPath || !routesPath || !outputDir) throw new Error('--launch-pack, --routes and --output are required.');
if (requestedChapters !== 5 && requestedChapters !== 10) throw new Error('Calibration run supports exactly 5 or 10 chapters.');

const launchPack = FlagshipLaunchPackV3Schema.parse(JSON.parse(readFileSync(path.resolve(launchPackPath), 'utf8')));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
validateLaunchPackV3(launchPack);
const target = path.resolve(outputDir);
const checkpointRoot = path.join(target, 'checkpoints');
mkdirSync(checkpointRoot, { recursive: true });

type ModelCheckpoint = OfflineOpeningModelResponseV3 & {
  schemaVersion: 3;
  promptVersion: string;
  routeVersion: string;
  promptDigest: string;
  chapterNumber: number;
  role: string;
  contractValid?: boolean;
  contractError?: unknown;
};

const cleanJson = (raw: string): unknown => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
const digest = (valueToDigest: unknown): string => createHash('sha256').update(JSON.stringify(valueToDigest)).digest('hex');

function schemaFor(call: FlagshipV3ModelCall): z.ZodTypeAny {
  return call.role === 'writer' || call.role === 'writer_revision' ? WriterOutputV3Schema : QualityVerdictV3ModelSchema;
}

async function invokeChapter(chapterNumber: number, model: string, call: FlagshipV3ModelCall): Promise<OfflineOpeningModelResponseV3> {
  const chapterDir = path.join(checkpointRoot, `chapter-${chapterNumber}`);
  mkdirSync(chapterDir, { recursive: true });
  const file = path.join(chapterDir, `${call.role}.response.json`);
  const promptDigest = digest({ chapterNumber, model, call, promptVersion: FLAGSHIP_V3_PROMPT_VERSION, routeVersion: routes.routeVersion });
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as ModelCheckpoint;
    if (saved.promptDigest === promptDigest && saved.model === model && saved.routeVersion === routes.routeVersion
      && saved.promptVersion === FLAGSHIP_V3_PROMPT_VERSION && schemaFor(call).safeParse(cleanJson(saved.content)).success) {
      return { ...saved, reused: true };
    }
  }
  const schema = schemaFor(call);
  const response = await callFlagshipModel(call.userPrompt, {
    model,
    temperature: call.role === 'writer' || call.role === 'writer_revision' ? 0.75 : 0.15,
    maxTokens: call.role === 'writer' || call.role === 'writer_revision' ? 32768 : 16384,
    systemPrompt: call.systemPrompt,
    responseJsonSchema: toGeminiResponseJsonSchema(schema as never),
  }, { jsonMode: true, schemaName: `flagship_v3_calibration_ch${chapterNumber}_${call.role}` });
  const parsed = schema.safeParse(cleanJson(response.content));
  const saved: ModelCheckpoint = {
    schemaVersion: 3, promptVersion: FLAGSHIP_V3_PROMPT_VERSION, routeVersion: routes.routeVersion,
    promptDigest, chapterNumber, role: call.role, model,
    promptTokens: response.promptTokens, completionTokens: response.completionTokens,
    estimatedCostUsd: Number(response.estimatedCostUsd || 0), finishReason: response.finishReason,
    content: response.content, contractValid: parsed.success,
    contractError: parsed.success ? undefined : parsed.error.issues,
  };
  writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`);
  if (!parsed.success) throw new Error(`${call.role} violated its exact calibration output contract: ${parsed.error.message}`);
  return { ...saved, reused: false };
}

async function planSecondWindow(state: OfflineOpeningRunV3['finalState']) {
  const context = buildV3PlannerContext({ kernel: launchPack.kernel, arc: launchPack.arc, state });
  const startChapter = state.chapterNumber + 1;
  const userPrompt = `START_CHAPTER=${startChapter}\nAUTHORITATIVE_LEDGER=${JSON.stringify(buildPlannerLedgerV3(state))}\nROLE_CONTEXT=${context.text}\nTạo plan chương ${startChapter}-${startChapter + 4}. Trước khi trả JSON, tự mô phỏng tuần tự cả năm plan trên AUTHORITATIVE_LEDGER.`;
  const file = path.join(checkpointRoot, `planner-${startChapter}-${startChapter + 4}.response.json`);
  const promptDigest = digest({ model: routes.planner, systemPrompt: V3_ROLLING_PLANNER_SYSTEM, userPrompt, promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION, routeVersion: routes.routeVersion });
  let raw: string; let estimatedCostUsd = 0;
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as ModelCheckpoint;
    const parsed = saved.promptDigest === promptDigest && saved.model === routes.planner
      ? RollingPlanWindowDraftV3Schema.safeParse(cleanJson(saved.content)) : null;
    if (parsed?.success) { raw = saved.content; estimatedCostUsd = saved.estimatedCostUsd; }
    else ({ raw, estimatedCostUsd } = await callPlanner(file, promptDigest, userPrompt, startChapter));
  } else ({ raw, estimatedCostUsd } = await callPlanner(file, promptDigest, userPrompt, startChapter));
  const draft = RollingPlanWindowDraftV3Schema.parse(cleanJson(raw));
  if (draft.startChapter !== startChapter) throw new Error('Planner changed the calibration window identity.');
  const window = materializeRollingWindowV3({ kernel: launchPack.kernel, arc: launchPack.arc, state, draft });
  validateRollingWindowV3({ kernel: launchPack.kernel, arc: launchPack.arc, state, window });
  return { window, estimatedCostUsd };
}

async function callPlanner(file: string, promptDigest: string, userPrompt: string, startChapter: number) {
  const response = await callFlagshipModel(userPrompt, {
    model: routes.planner, temperature: 0.2, maxTokens: 32768,
    systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
    responseJsonSchema: toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema),
  }, { jsonMode: true, schemaName: `flagship_v3_calibration_plan_${startChapter}` });
  const parsed = RollingPlanWindowDraftV3Schema.safeParse(cleanJson(response.content));
  const saved: ModelCheckpoint = {
    schemaVersion: 3, promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION, routeVersion: routes.routeVersion,
    promptDigest, chapterNumber: startChapter, role: 'planner', model: routes.planner,
    promptTokens: response.promptTokens, completionTokens: response.completionTokens,
    estimatedCostUsd: Number(response.estimatedCostUsd || 0), finishReason: response.finishReason,
    content: response.content, contractValid: parsed.success,
    contractError: parsed.success ? undefined : parsed.error.issues,
  };
  writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`);
  if (!parsed.success) throw new Error(`Planner violated calibration contract: ${parsed.error.message}`);
  return { raw: response.content, estimatedCostUsd: saved.estimatedCostUsd };
}

async function main(): Promise<void> {
  const first = await runOfflinePlannedWindowV3({
    title: launchPack.kernel.title, kernel: launchPack.kernel, arc: launchPack.arc,
    state: launchPack.initialState, plans: launchPack.initialWindow.plans, routes, targetWordCount,
  }, { invoke: ({ chapterNumber, model, call }) => invokeChapter(chapterNumber, model, call) });
  let chapters = first.chapters; let finalState = first.finalState; let plannerCost = 0;
  if (requestedChapters === 10 && first.completedChapters === 5) {
    const planned = await planSecondWindow(first.finalState);
    plannerCost = planned.estimatedCostUsd;
    const second = await runOfflinePlannedWindowV3({
      title: launchPack.kernel.title, kernel: launchPack.kernel, arc: launchPack.arc,
      state: first.finalState, plans: planned.window.plans, routes, targetWordCount,
    }, { invoke: ({ chapterNumber, model, call }) => invokeChapter(chapterNumber, model, call) });
    const amortized = plannerCost / planned.window.plans.length;
    chapters = [...first.chapters, ...second.chapters.map(chapter => ({
      ...chapter, estimatedCostUsd: Number((chapter.estimatedCostUsd + amortized).toFixed(6)),
    }))];
    finalState = second.finalState;
  }
  const failed = chapters.find(chapter => chapter.status !== 'publish');
  const run: OfflineOpeningRunV3 & { planningCostUsd: number; enginePromptVersion: string } = {
    schemaVersion: 3, title: launchPack.kernel.title, routeVersion: routes.routeVersion,
    requestedChapters, completedChapters: chapters.filter(chapter => chapter.status === 'publish').length,
    stoppedAtChapter: failed?.chapterNumber ?? (chapters.length < requestedChapters ? chapters.length + 1 : null),
    estimatedCostUsd: Number((chapters.reduce((sum, chapter) => sum + chapter.estimatedCostUsd, 0)).toFixed(6)),
    chapters, finalState, planningCostUsd: plannerCost, enginePromptVersion: FLAGSHIP_V3_PROMPT_VERSION,
  };
  writeFileSync(path.join(target, 'opening-run-v3.json'), `${JSON.stringify(run, null, 2)}\n`);
  console.log(JSON.stringify({ output: target, routeVersion: routes.routeVersion, requestedChapters,
    completedChapters: run.completedChapters, stoppedAtChapter: run.stoppedAtChapter,
    estimatedCostUsd: run.estimatedCostUsd, planningCostUsd: plannerCost }, null, 2));
  if (run.completedChapters !== requestedChapters) process.exitCode = 2;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
