#!/usr/bin/env tsx

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import {
  FLAGSHIP_V3_PROMPT_VERSION,
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  QualityVerdictV3ModelSchema,
  WriterOutputV3Schema,
  runOfflineOpeningV3,
  validateLaunchPackV3,
  type FlagshipV3ModelCall,
  type OfflineOpeningRunV3,
} from '../src/services/story-engine/flagship-v3';
import { callFlagshipModel } from '../src/services/story-engine/flagship/provider';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const launchPackPath = value('--launch-pack');
const routesPath = value('--routes');
const outputDir = value('--output');
const requestedChapters = Number(value('--chapters') || '3');
const targetWordCount = Number(value('--target-words') || '1800');
if (!launchPackPath || !routesPath || !outputDir) {
  throw new Error('--launch-pack, --routes and --output are required.');
}

const launchPack = FlagshipLaunchPackV3Schema.parse(JSON.parse(readFileSync(path.resolve(launchPackPath), 'utf8')));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
validateLaunchPackV3(launchPack);
const target = path.resolve(outputDir);
const checkpointRoot = path.join(target, 'checkpoints');
mkdirSync(checkpointRoot, { recursive: true });

type Checkpoint = {
  schemaVersion: 3;
  promptVersion: string;
  routeVersion: string;
  promptDigest: string;
  chapterNumber: number;
  role: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  finishReason: string;
  content: string;
};

const cleanJson = (raw: string): unknown => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
const digestCall = (chapterNumber: number, model: string, call: FlagshipV3ModelCall): string => createHash('sha256')
  .update(JSON.stringify({
    chapterNumber,
    model,
    role: call.role,
    systemPrompt: call.systemPrompt,
    userPrompt: call.userPrompt,
    promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
    routeVersion: routes.routeVersion,
  }))
  .digest('hex');

function responseSchema(call: FlagshipV3ModelCall): z.ZodTypeAny {
  return call.role === 'writer' || call.role === 'writer_revision'
    ? WriterOutputV3Schema
    : QualityVerdictV3ModelSchema;
}

function reusableCheckpoint(file: string, digest: string, model: string, call: FlagshipV3ModelCall): Checkpoint | null {
  if (!existsSync(file)) return null;
  try {
    const checkpoint = JSON.parse(readFileSync(file, 'utf8')) as Checkpoint;
    if (
      checkpoint.schemaVersion !== 3
      || checkpoint.promptVersion !== FLAGSHIP_V3_PROMPT_VERSION
      || checkpoint.routeVersion !== routes.routeVersion
      || checkpoint.promptDigest !== digest
      || checkpoint.model !== model
    ) return null;
    if (!responseSchema(call).safeParse(cleanJson(checkpoint.content)).success) return null;
    return checkpoint;
  } catch {
    return null;
  }
}

function readerPacket(run: OfflineOpeningRunV3): string {
  const sections = run.chapters.map(chapter => {
    const axes = chapter.verdict?.axes;
    const score = chapter.verdict
      ? `Gate: ${chapter.status}; quality=${chapter.verdict.weightedMean}; read-next=${axes?.desire_to_read_next}; naturalness=${axes?.prose_naturalness}`
      : `Gate: ${chapter.status}; error=${chapter.error || 'unknown'}`;
    return `## Chương ${chapter.chapterNumber}: ${chapter.title || 'Bản nháp không hợp lệ'}\n\n${score}\n\n${chapter.content || '_Không có prose đủ điều kiện để đọc._'}`;
  });
  return `# Offline opening review — ${run.title}\n\nĐây là artifact nội bộ, chưa xuất bản và không thay đổi canon production.\n\n${sections.join('\n\n---\n\n')}\n`;
}

async function main(): Promise<void> {
  const run = await runOfflineOpeningV3({ launchPack, routes, chapters: requestedChapters, targetWordCount }, {
    invoke: async ({ chapterNumber, model, call }) => {
      const chapterDir = path.join(checkpointRoot, `chapter-${chapterNumber}`);
      mkdirSync(chapterDir, { recursive: true });
      const checkpointFile = path.join(chapterDir, `${call.role}.response.json`);
      const promptDigest = digestCall(chapterNumber, model, call);
      const checkpoint = reusableCheckpoint(checkpointFile, promptDigest, model, call);
      if (checkpoint) return { ...checkpoint, reused: true };

      const schema = responseSchema(call);
      const response = await callFlagshipModel(call.userPrompt, {
        model,
        temperature: call.role === 'writer' || call.role === 'writer_revision' ? 0.75 : 0.15,
        maxTokens: call.role === 'writer' || call.role === 'writer_revision' ? 32768 : 16384,
        thinkingLevel: 'medium',
        systemPrompt: call.systemPrompt,
        responseJsonSchema: toGeminiResponseJsonSchema(schema as never),
      }, {
        jsonMode: true,
        schemaName: `flagship_v3_offline_ch${chapterNumber}_${call.role}`,
      });
      const parsed = schema.safeParse(cleanJson(response.content));
      if (!parsed.success) throw new Error(`${call.role} violated its exact offline output contract: ${parsed.error.message}`);
      const saved: Checkpoint = {
        schemaVersion: 3,
        promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
        routeVersion: routes.routeVersion,
        promptDigest,
        chapterNumber,
        role: call.role,
        model,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        estimatedCostUsd: Number(response.estimatedCostUsd || 0),
        finishReason: response.finishReason,
        content: response.content,
      };
      writeFileSync(checkpointFile, `${JSON.stringify(saved, null, 2)}\n`);
      return { ...saved, reused: false };
    },
  });

  writeFileSync(path.join(target, 'opening-run-v3.json'), `${JSON.stringify({ ...run, createdAt: new Date().toISOString() }, null, 2)}\n`);
  writeFileSync(path.join(target, 'opening-reader-packet.md'), readerPacket(run));
  const staleFailure = path.join(target, 'opening-failure-v3.json');
  if (existsSync(staleFailure)) unlinkSync(staleFailure);
  console.log(JSON.stringify({
    title: run.title,
    requestedChapters: run.requestedChapters,
    completedChapters: run.completedChapters,
    stoppedAtChapter: run.stoppedAtChapter,
    estimatedCostUsd: run.estimatedCostUsd,
    output: target,
  }, null, 2));
  if (run.stoppedAtChapter !== null) process.exitCode = 2;
}

main().catch(error => {
  writeFileSync(path.join(target, 'opening-failure-v3.json'), `${JSON.stringify({
    schemaVersion: 3,
    promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
    routeVersion: routes.routeVersion,
    error: error instanceof Error ? error.message : String(error),
    failedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
