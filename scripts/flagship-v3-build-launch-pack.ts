#!/usr/bin/env tsx

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  ArcPlanV3Schema,
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  MarketResearchSnapshotV3Schema,
  RollingPlanWindowDraftV3Schema,
  StoryKernelV3Schema,
  StoryStateV3Schema,
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
const snapshotPath = value('--snapshot');
const tournamentPath = value('--tournament');
const routesPath = value('--routes');
const outputPath = value('--output');
const requiredTitle = value('--title');
if (!snapshotPath || !tournamentPath || !routesPath || !outputPath || !requiredTitle) {
  throw new Error('--snapshot, --tournament, --routes, --output and --title are required.');
}

const snapshot = MarketResearchSnapshotV3Schema.parse(JSON.parse(readFileSync(path.resolve(snapshotPath), 'utf8')));
const tournament = JSON.parse(readFileSync(path.resolve(tournamentPath), 'utf8')) as {
  selected: { id?: string };
  openingTrials: Array<{ candidateId: string }>;
  openingReviews: unknown[];
};
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')));
const PROMPT_VERSIONS: Record<string, string> = {
  kernel_architect: 'flagship-v3-kernel-2026-07-17.7',
  state_seeder: 'flagship-v3-state-seeder-2026-07-17.5',
  arc_architect: 'flagship-v3-arc-2026-07-16.2',
  initial_rolling_planner: V3_ROLLING_PLANNER_PROMPT_VERSION,
};
if (!tournament.selected?.id) throw new Error('Tournament has no selected concept.');
const opening = tournament.openingTrials.find(item => item.candidateId === tournament.selected.id);
if (!opening) throw new Error('Selected concept has no opening trial.');
const resolvedOutput = path.resolve(outputPath);
const checkpointDir = `${resolvedOutput}.checkpoints`;
mkdirSync(path.dirname(resolvedOutput), { recursive: true });
mkdirSync(checkpointDir, { recursive: true });

const calls: Array<{
  role: string;
  model: string;
  estimatedCostUsd: number;
  promptTokens: number;
  completionTokens: number;
  finishReason: string;
  reused: boolean;
}> = [];

function parseJson<T>(raw: string, schema: { parse(value: unknown): T }): T {
  return schema.parse(JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')));
}

async function invoke<T>(input: {
  role: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: { parse(value: unknown): T; _def: unknown };
}): Promise<T> {
  const checkpointPath = path.join(checkpointDir, `${input.role}.response.json`);
  const promptVersion = PROMPT_VERSIONS[input.role];
  if (!promptVersion) throw new Error(`Missing prompt version for ${input.role}.`);
  const promptDigest = createHash('sha256').update(JSON.stringify({
    role: input.role,
    model: input.model,
    routeVersion: routes.routeVersion,
    promptVersion,
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
  })).digest('hex');
  if (existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf8')) as {
      model?: string;
      routeVersion?: string;
      promptVersion?: string;
      promptDigest?: string;
      estimatedCostUsd?: number;
      promptTokens?: number;
      completionTokens?: number;
      finishReason?: string;
      content?: string;
    };
    if (
      checkpoint.model === input.model
      && checkpoint.routeVersion === routes.routeVersion
      && checkpoint.promptVersion === promptVersion
      && checkpoint.promptDigest === promptDigest
      && checkpoint.content
    ) {
      try {
        const parsed = parseJson(checkpoint.content, input.schema);
        calls.push({
          role: input.role,
          model: input.model,
          estimatedCostUsd: Number(checkpoint.estimatedCostUsd || 0),
          promptTokens: Number(checkpoint.promptTokens || 0),
          completionTokens: Number(checkpoint.completionTokens || 0),
          finishReason: checkpoint.finishReason || 'UNKNOWN',
          reused: true,
        });
        return parsed;
      } catch {
        // A schema or prompt version change invalidates only this checkpoint.
      }
    }
  }
  const response = await callFlagshipModel(input.userPrompt, {
    model: input.model,
    temperature: 0.15,
    maxTokens: 32768,
    thinkingLevel: 'medium',
    systemPrompt: input.systemPrompt,
    responseJsonSchema: toGeminiResponseJsonSchema(input.schema as never),
  }, { jsonMode: true, schemaName: `flagship_v3_${input.role}` });
  const metadata = {
    role: input.role,
    model: input.model,
    routeVersion: routes.routeVersion,
    promptVersion,
    promptDigest,
    estimatedCostUsd: response.estimatedCostUsd || 0,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    finishReason: response.finishReason,
    reused: false,
  };
  calls.push(metadata);
  writeFileSync(checkpointPath, `${JSON.stringify({
    ...metadata,
    content: response.content,
  }, null, 2)}\n`);
  return parseJson(response.content, input.schema);
}

async function main(): Promise<void> {
  const kernel = await invoke({
    role: 'kernel_architect',
    model: routes.launchArchitect,
    schema: StoryKernelV3Schema,
    systemPrompt: 'Bạn là Kernel Architect. Chỉ tạo bản sắc truyện, cast, causal world, resource, promise và ending contract; chỉ trả JSON đúng schema.',
    userPrompt: `STORY_COMMISSION=${JSON.stringify(snapshot.commission)}
MARKET_SIGNAL_PROVENANCE=${JSON.stringify({ snapshotId: snapshot.snapshotId, signals: snapshot.signals })}
REQUIRED_DATABASE_TITLE=${JSON.stringify(requiredTitle)}
SELECTED_CONCEPT=${JSON.stringify(tournament.selected)}
APPROVED_OPENING=${JSON.stringify(opening)}
BLIND_OPENING_REVIEWS=${JSON.stringify(tournament.openingReviews)}

Tạo StoryKernelV3. title phải khớp tuyệt đối REQUIRED_DATABASE_TITLE.
Không chứa taxonomy thị trường, prompt benchmark hoặc tên tác phẩm tham khảo.
Cần ít nhất 4 nhân vật có agenda/voice riêng, 4 world claim có nguồn và ngoại lệ, 3 resource, 4 promise.
Mỗi resource numeric phải có referenceScale gồm 1-5 mốc so sánh nội bộ có số cụ thể, cùng minimumValue và maximumValue hữu hạn phù hợp cơ chế riêng của truyện. Tiền/vật tư thường min=0; chỉ số nợ, thiện ác hoặc nhiệt độ được phép âm nếu kernel định nghĩa rõ. Resource state bắt buộc referenceScale/minimumValue/maximumValue đều null.
Trong voice của từng nhân vật: positiveExamples có 2-5 câu và forbiddenPatterns có 2-8 câu; MỖI câu phải dài ít nhất 8 ký tự, không dùng nhãn cụt như "nói đùa".
endingContract.promisesThatMustClose chỉ chứa stable ID ASCII đã xuất hiện trong promises[].id; tuyệt đối không điền mô tả lời hứa hoặc tạo ID mới.
Mục tiêu kết thúc mặc định 800-1200 chương, forecast khoảng 900, nhưng không kéo dài vô hạn.`,
  });
  if (kernel.title !== requiredTitle) throw new Error('Kernel Architect changed the deterministic database title.');

  const initialState = await invoke({
    role: 'state_seeder',
    model: routes.launchArchitect,
    schema: StoryStateV3Schema,
    systemPrompt: 'Bạn là State Seeder. Chỉ tạo StoryStateV3 chapter zero bao phủ chính xác kernel; không viết outline hoặc prose.',
    userPrompt: `STORY_KERNEL_V3=${JSON.stringify(kernel)}

Tạo StoryStateV3 chapterNumber=0.
Phải có đúng một state entry cho mọi characterId, resourceId và promiseId trong kernel.
Mọi resource numeric có amount/unit/source hữu hạn; state value phải mô tả rõ trạng thái ban đầu.
Mọi knowledge[].source, resource.source và promise.pressure phải là mô tả có nghĩa dài ít nhất 8 ký tự; không dùng nhãn cụt như "bẩm sinh", "ban đầu", "không rõ".
Mọi timeline[].locationId và characters[].locationId phải là stable ID ASCII theo mẫu [a-z][a-z0-9_-], ví dụ san_toc_duong; tuyệt đối không dùng tên có dấu, dấu cách hoặc chữ Hán.
Không thêm character/resource/promise ngoài kernel.`,
  });

  const arc = await invoke({
    role: 'arc_architect',
    model: routes.launchArchitect,
    schema: ArcPlanV3Schema,
    systemPrompt: 'Bạn là Arc Architect. Chỉ tạo arc hiện tại 20-30 chương từ kernel và state đã commit; không lập 1000 chương.',
    userPrompt: `STORY_KERNEL_V3=${JSON.stringify(kernel)}
STORY_STATE_V3=${JSON.stringify(initialState)}
SELECTED_CONCEPT=${JSON.stringify(tournament.selected)}

Tạo ArcPlanV3 bắt đầu chương 1, dài 20-30 chương.
Actor ID, promise ID và progression signal phải lấy từ kernel.
Terminal change phải hữu hình về vật chất, quan hệ hoặc thế giới; conflict actor có agenda/leverage/next move thật.`,
  });

  const initialWindowDraft = await invoke({
    role: 'initial_rolling_planner',
    model: routes.planner,
    schema: RollingPlanWindowDraftV3Schema,
    systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
    userPrompt: `STORY_KERNEL_V3=${JSON.stringify(kernel)}
ARC_PLAN_V3=${JSON.stringify(arc)}
STORY_STATE_V3=${JSON.stringify(initialState)}
AUTHORITATIVE_LEDGER=${JSON.stringify(buildPlannerLedgerV3(initialState, kernel))}

Tạo RollingPlanWindowV3 chương 1-5.
Trước khi trả JSON, tự mô phỏng tuần tự cả năm plan trên AUTHORITATIVE_LEDGER; chapter 1 dùng đúng ledger, chapter sau dùng postcondition chapter trước. Không tự lặp lại before/after/unit/valueBefore vì compiler sẽ gắn chúng.
source, sink, learnedFrom và mọi state value phải là cụm có nghĩa ít nhất 8 ký tự, không dùng nhãn cụt như "chợ", "bán", "mua".`,
  });
  const initialWindow = materializeRollingWindowV3({
    kernel,
    arc,
    state: initialState,
    draft: initialWindowDraft,
  });

  const pack = FlagshipLaunchPackV3Schema.parse({
    schemaVersion: 3,
    selectedConceptId: tournament.selected.id,
    kernel,
    arc,
    initialState,
    initialWindow,
  });
  validateLaunchPackV3(pack);
  writeFileSync(resolvedOutput, `${JSON.stringify(pack, null, 2)}\n`);
  writeFileSync(`${resolvedOutput}.run.json`, `${JSON.stringify({
    schemaVersion: 3,
    selectedConceptId: pack.selectedConceptId,
    title: pack.kernel.title,
    routeVersion: routes.routeVersion,
    calls,
    estimatedCostUsd: Number(calls.reduce((sum, call) => sum + call.estimatedCostUsd, 0).toFixed(6)),
    createdAt: new Date().toISOString(),
  }, null, 2)}\n`);
  const staleFailure = `${resolvedOutput}.failure.json`;
  if (existsSync(staleFailure)) unlinkSync(staleFailure);
  console.log(JSON.stringify({
    valid: true,
    title: pack.kernel.title,
    selectedConceptId: pack.selectedConceptId,
    callCount: calls.length,
    estimatedCostUsd: Number(calls.reduce((sum, call) => sum + call.estimatedCostUsd, 0).toFixed(6)),
    output: resolvedOutput,
  }, null, 2));
}

main().catch(error => {
  writeFileSync(`${resolvedOutput}.failure.json`, `${JSON.stringify({
    routeVersion: routes.routeVersion,
    calls,
    estimatedCostUsd: Number(calls.reduce((sum, call) => sum + call.estimatedCostUsd, 0).toFixed(6)),
    error: error instanceof Error ? error.message : String(error),
    detail: error && typeof error === 'object'
      ? 'detail' in error ? error.detail : 'issues' in error ? error.issues : null
      : null,
    failedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
