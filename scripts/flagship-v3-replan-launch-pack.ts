#!/usr/bin/env tsx

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  FLAGSHIP_V3_PROMPT_VERSION,
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  RollingPlanWindowDraftV3Schema,
  V3_ROLLING_PLANNER_PROMPT_VERSION,
  V3_ROLLING_PLANNER_SYSTEM,
  buildPlannerLedgerV3,
  materializeRollingWindowV3,
  validateLaunchPackV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const basePath = value('--base');
const routesPath = value('--routes');
const outputPath = value('--output');
if (!basePath || !routesPath || !outputPath) throw new Error('--base, --routes and --output are required.');

const base = FlagshipLaunchPackV3Schema.parse(JSON.parse(readFileSync(path.resolve(basePath), 'utf8')));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
const output = path.resolve(outputPath);
const failurePath = `${output}.replan-failure.json`;
const runPath = `${output}.replan-run.json`;
const userPrompt = `STORY_KERNEL_V3=${JSON.stringify(base.kernel)}
ARC_PLAN_V3=${JSON.stringify(base.arc)}
STORY_STATE_V3=${JSON.stringify(base.initialState)}
AUTHORITATIVE_LEDGER=${JSON.stringify(buildPlannerLedgerV3(base.initialState, base.kernel))}

Tạo RollingPlanWindowV3 chương 1-5. Tự mô phỏng tuần tự cả năm plan trên AUTHORITATIVE_LEDGER; chapter 1 dùng đúng ledger, chapter sau dùng postcondition chapter trước. Không tự lặp lại before/after/unit/valueBefore vì compiler sẽ gắn chúng.`;
const digest = createHash('sha256').update(JSON.stringify({
  promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION,
  model: routes.planner,
  routeVersion: routes.routeVersion,
  baseKernel: base.kernel,
  baseArc: base.arc,
  baseState: base.initialState,
  systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
  userPrompt,
})).digest('hex');

async function main(): Promise<void> {
  if (existsSync(failurePath)) {
    const previous = JSON.parse(readFileSync(failurePath, 'utf8')) as { digest?: string };
    if (previous.digest === digest) {
      throw new Error('This exact setup repair already failed; change model route, prompt version or foundation artifact before reopening.');
    }
  }
  const response = await callFlagshipModel(userPrompt, {
    model: routes.planner,
    temperature: 0.15,
    maxTokens: 32768,
    systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
    responseJsonSchema: toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema),
  }, { jsonMode: true, schemaName: 'flagship_v3_replan_launch_pack' });
  const raw = JSON.parse(response.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  const draft = RollingPlanWindowDraftV3Schema.parse(raw);
  const initialWindow = materializeRollingWindowV3({
    kernel: base.kernel,
    arc: base.arc,
    state: base.initialState,
    draft,
  });
  const pack = FlagshipLaunchPackV3Schema.parse({ ...base, initialWindow });
  validateLaunchPackV3(pack);
  writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`);
  writeFileSync(runPath, `${JSON.stringify({
    schemaVersion: 3,
    promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION,
    runtimePromptVersion: FLAGSHIP_V3_PROMPT_VERSION,
    routeVersion: routes.routeVersion,
    model: routes.planner,
    digest,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    finishReason: response.finishReason,
    repairedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  if (existsSync(failurePath)) unlinkSync(failurePath);
  console.log(JSON.stringify({ valid: true, title: pack.kernel.title, model: routes.planner, routeVersion: routes.routeVersion, estimatedCostUsd: response.estimatedCostUsd }, null, 2));
}

main().catch(error => {
  writeFileSync(failurePath, `${JSON.stringify({
    schemaVersion: 3,
    promptVersion: V3_ROLLING_PLANNER_PROMPT_VERSION,
    routeVersion: routes.routeVersion,
    model: routes.planner,
    digest,
    error: error instanceof Error ? error.message : String(error),
    detail: error && typeof error === 'object' && 'detail' in error ? (error as { detail?: unknown }).detail : null,
    failedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
