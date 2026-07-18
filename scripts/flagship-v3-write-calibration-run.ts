#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { z } from 'zod';
import {
  FLAGSHIP_V3_PROMPT_VERSION,
  FlagshipV3Error,
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  EditorAssessmentV3Schema,
  RollingPlanWindowDraftV3Schema,
  V3_ROLLING_PLANNER_PROMPT_VERSION,
  V3_ROLLING_PLANNER_SYSTEM,
  WriterOutputV3Schema,
  buildPlannerLedgerV3,
  buildRollingPlannerResponseJsonSchemaV3,
  buildV3PlannerContext,
  getFlagshipReleaseManifestV3,
  generateRollingWindowWithOneRepairV3,
  materializeRollingWindowV3,
  runOfflinePlannedWindowV3,
  validateLaunchPackV3,
  validateRollingWindowV3,
  type FlagshipV3ModelCall,
  type OfflineOpeningModelResponseV3,
  type OfflineOpeningChapterV3,
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

function validateJsonContract(schema: z.ZodTypeAny, raw: string): { valid: boolean; error?: unknown } {
  try {
    const parsed = schema.safeParse(cleanJson(raw));
    return parsed.success ? { valid: true } : { valid: false, error: parsed.error.issues };
  } catch (caught) {
    return { valid: false, error: caught instanceof Error ? caught.message : String(caught) };
  }
}

function schemaFor(call: FlagshipV3ModelCall): z.ZodTypeAny {
  return call.role === 'writer' || call.role === 'writer_revision' ? WriterOutputV3Schema : EditorAssessmentV3Schema;
}

async function invokeChapter(chapterNumber: number, model: string, call: FlagshipV3ModelCall): Promise<OfflineOpeningModelResponseV3> {
  const chapterDir = path.join(checkpointRoot, `chapter-${chapterNumber}`);
  mkdirSync(chapterDir, { recursive: true });
  const file = path.join(chapterDir, `${call.role}.response.json`);
  const schema = schemaFor(call);
  const responseJsonSchema = call.responseJsonSchema || toGeminiResponseJsonSchema(schema as never);
  const isWriter = call.role === 'writer' || call.role === 'writer_revision';
  const transport = {
    temperature: isWriter ? 0.75 : 0.15,
    maxTokens: isWriter ? 32768 : 16384,
    thinkingLevel: isWriter ? 'low' as const : 'medium' as const,
  };
  const promptDigest = digest({ chapterNumber, model, call, responseJsonSchema, transport, promptVersion: FLAGSHIP_V3_PROMPT_VERSION, routeVersion: routes.routeVersion });
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as ModelCheckpoint;
    const contract = validateJsonContract(schemaFor(call), saved.content);
    if (saved.promptDigest === promptDigest && saved.model === model && saved.routeVersion === routes.routeVersion
      && saved.promptVersion === FLAGSHIP_V3_PROMPT_VERSION && contract.valid) {
      return { ...saved, reused: true };
    }
  }
  const response = await callFlagshipModel(call.userPrompt, {
    model,
    ...transport,
    systemPrompt: call.systemPrompt,
    responseJsonSchema,
  }, { jsonMode: true, schemaName: `flagship_v3_calibration_ch${chapterNumber}_${call.role}` });
  const contract = validateJsonContract(schema, response.content);
  const saved: ModelCheckpoint = {
    schemaVersion: 3, promptVersion: FLAGSHIP_V3_PROMPT_VERSION, routeVersion: routes.routeVersion,
    promptDigest, chapterNumber, role: call.role, model,
    promptTokens: response.promptTokens, completionTokens: response.completionTokens,
    estimatedCostUsd: Number(response.estimatedCostUsd || 0), finishReason: response.finishReason,
    content: response.content, contractValid: contract.valid,
    contractError: contract.error,
  };
  writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`);
  if (!contract.valid) throw new Error(`${call.role} violated its exact calibration output contract: ${JSON.stringify(contract.error)}`);
  return { ...saved, reused: false };
}

async function planSecondWindow(state: OfflineOpeningRunV3['finalState']) {
  const context = buildV3PlannerContext({ kernel: launchPack.kernel, arc: launchPack.arc, state });
  const startChapter = state.chapterNumber + 1;
  const userPrompt = `START_CHAPTER=${startChapter}\nAUTHORITATIVE_LEDGER=${JSON.stringify(buildPlannerLedgerV3(state, launchPack.kernel))}\nROLE_CONTEXT=${context.text}\nTạo plan chương ${startChapter}-${startChapter + 4}. Trước khi trả JSON, tự mô phỏng tuần tự cả năm plan trên AUTHORITATIVE_LEDGER.`;
  const responseJsonSchema = buildRollingPlannerResponseJsonSchemaV3(launchPack.kernel, state);
  return generateRollingWindowWithOneRepairV3({
    kernel: launchPack.kernel,
    arc: launchPack.arc,
    state,
    startChapter,
    basePrompt: userPrompt,
    roleContext: context.text,
    ledger: buildPlannerLedgerV3(state, launchPack.kernel),
    modelRoute: routes.planner,
    invoke: async (prompt, attempt) => {
      const file = path.join(checkpointRoot, `planner-${startChapter}-${startChapter + 4}-attempt-${attempt}.response.json`);
      const promptDigest = digest({ model: routes.planner, systemPrompt: V3_ROLLING_PLANNER_SYSTEM, userPrompt: prompt, responseJsonSchema, promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION, routeVersion: routes.routeVersion, attempt });
      if (existsSync(file)) {
        const saved = JSON.parse(readFileSync(file, 'utf8')) as ModelCheckpoint;
        const contract = validateJsonContract(RollingPlanWindowDraftV3Schema, saved.content);
        if (saved.promptDigest === promptDigest && saved.model === routes.planner && contract.valid) {
          return { raw: saved.content, estimatedCostUsd: saved.estimatedCostUsd };
        }
      }
      return callPlanner(file, promptDigest, prompt, startChapter, responseJsonSchema);
    },
  }).then(result => ({ window: result.window, estimatedCostUsd: result.estimatedCostUsd }));
}

async function callPlanner(
  file: string,
  promptDigest: string,
  userPrompt: string,
  startChapter: number,
  responseJsonSchema: Record<string, unknown>,
) {
  const response = await callFlagshipModel(userPrompt, {
    model: routes.planner, temperature: 0.2, maxTokens: 32768,
    thinkingLevel: 'medium',
    systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
    responseJsonSchema,
  }, { jsonMode: true, schemaName: `flagship_v3_calibration_plan_${startChapter}` });
  const contract = validateJsonContract(RollingPlanWindowDraftV3Schema, response.content);
  const saved: ModelCheckpoint = {
    schemaVersion: 3, promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION, routeVersion: routes.routeVersion,
    promptDigest, chapterNumber: startChapter, role: 'planner', model: routes.planner,
    promptTokens: response.promptTokens, completionTokens: response.completionTokens,
    estimatedCostUsd: Number(response.estimatedCostUsd || 0), finishReason: response.finishReason,
    content: response.content, contractValid: contract.valid,
    contractError: contract.error,
  };
  writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`);
  if (!contract.valid) throw new Error(`Planner violated calibration contract: ${JSON.stringify(contract.error)}`);
  return { raw: response.content, estimatedCostUsd: saved.estimatedCostUsd };
}

async function main(): Promise<void> {
  const first = await runOfflinePlannedWindowV3({
    title: launchPack.kernel.title, kernel: launchPack.kernel, arc: launchPack.arc,
    state: launchPack.initialState, plans: launchPack.initialWindow.plans, routes, targetWordCount,
  }, { invoke: ({ chapterNumber, model, call }) => invokeChapter(chapterNumber, model, call) });
  let chapters = first.chapters; let finalState = first.finalState; let plannerCost = 0;
  if (requestedChapters === 10 && first.completedChapters === 5) {
    try {
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
    } catch (caught) {
      const plannerFile = path.join(checkpointRoot, `planner-${first.finalState.chapterNumber + 1}-${first.finalState.chapterNumber + 5}.response.json`);
      if (existsSync(plannerFile)) {
        const saved = JSON.parse(readFileSync(plannerFile, 'utf8')) as ModelCheckpoint;
        plannerCost = Number(saved.estimatedCostUsd || 0);
      }
      const status: OfflineOpeningChapterV3['status'] = caught instanceof FlagshipV3Error && caught.code === 'plan_blocked'
        ? 'plan_blocked' : 'infra_blocked';
      chapters = [...first.chapters, {
        chapterNumber: first.finalState.chapterNumber + 1,
        status, title: null, content: null, verdict: null, callRoles: [], calls: [],
        estimatedCostUsd: plannerCost, stateAfter: null,
        error: caught instanceof Error ? caught.message : String(caught),
        detail: caught instanceof FlagshipV3Error ? caught.detail ?? null : null,
      }];
    }
  }
  const failed = chapters.find(chapter => chapter.status !== 'publish');
  const run: OfflineOpeningRunV3 & { planningCostUsd: number; enginePromptVersion: string; engineReleaseId: string } = {
    schemaVersion: 3, title: launchPack.kernel.title, routeVersion: routes.routeVersion,
    requestedChapters, completedChapters: chapters.filter(chapter => chapter.status === 'publish').length,
    stoppedAtChapter: failed?.chapterNumber ?? (chapters.length < requestedChapters ? chapters.length + 1 : null),
    estimatedCostUsd: Number((chapters.reduce((sum, chapter) => sum + chapter.estimatedCostUsd, 0)).toFixed(6)),
    chapters, finalState, planningCostUsd: plannerCost, enginePromptVersion: FLAGSHIP_V3_PROMPT_VERSION,
    engineReleaseId: getFlagshipReleaseManifestV3().releaseId,
  };
  writeFileSync(path.join(target, 'opening-run-v3.json'), `${JSON.stringify(run, null, 2)}\n`);
  console.log(JSON.stringify({ output: target, routeVersion: routes.routeVersion, requestedChapters,
    completedChapters: run.completedChapters, stoppedAtChapter: run.stoppedAtChapter,
    estimatedCostUsd: run.estimatedCostUsd, planningCostUsd: plannerCost }, null, 2));
  if (run.completedChapters !== requestedChapters) process.exitCode = 2;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
