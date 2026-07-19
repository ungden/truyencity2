import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { callFlagshipModel } from '../flagship/provider';
import { toGeminiResponseJsonSchema } from '../flagship/setup-response-schemas';
import { getSupabase } from '../utils/supabase';
import {
  ArcPlanV3Schema,
  ChapterPlanV3Schema,
  RollingPlanWindowV3Schema,
  RollingPlanWindowDraftV3Schema,
  StoryKernelV3Schema,
  StoryStateV3Schema,
  parseV3,
  type RollingPlanWindowV3,
  type RollingPlanWindowDraftV3,
  type StoryStateV3,
} from './contracts';
import { buildV3PlannerContext } from './context';
import { requireFlagshipModelRoutesV3 } from './model-routes';
import { FlagshipV3Error } from './pipeline';
import { assertFlagshipReleaseV3, FLAGSHIP_V3_ROLLING_PLANNER_VERSION } from './release';
import { getFlagshipReleaseManifestV3 } from './release';
import { loadPlannerLedgerMemoryV3, mergePlannerLedgerMemoryV3 } from './memory';
import { applyChapterStateV3 } from './state-transition';
import { validateV3Artifacts } from './validation';

export const V3_ROLLING_PLANNER_PROMPT_VERSION = FLAGSHIP_V3_ROLLING_PLANNER_VERSION;
export const V3_ROLLING_PLANNER_RULES = `Tạo đúng năm ChapterPlanV3 liên tiếp, mỗi chương có 1-5 scene theo nhu cầu nhân quả; không ép thêm scene phụ để đủ số lượng. Không một scene nào được có requiredDeltaIds=[]; từng scene phải liệt kê ít nhất một ID có thật trong requiredDeltas của chính chương đó.
Mỗi scene phải có participantIds chứa ít nhất povCharacterId; tuyệt đối không để participantIds rỗng và không đặt POV ngoài participants.
Mọi required delta bắt buộc evidenceRequired=true và phải được đúng một hoặc nhiều scene thực hiện.
chapterPromise là một câu tiếng Việt cụ thể dài ít nhất 20 ký tự mô tả lời hứa nội dung của chương với độc giả; không được điền promise ID như prom_house. Promise ID chỉ xuất hiện trong delta kind=promise. learnedFrom phải là mô tả nguồn học có nguyên nhân dài ít nhất 8 ký tự, không chỉ là tên trần của một nhân vật.
Mỗi plan chỉ ghi elapsedMinutesSincePreviousChapter, durationMinutes và travelMinutesFromPrevious. Không tự tạo startMinute; engine sẽ cộng timeline tuyệt đối theo thứ tự scene.
preconditions chỉ được tham chiếu fact đang có trong AUTHORITATIVE_LEDGER.facts và expectedValue phải chép đúng value hiện tại của fact đó; nếu không cần điều kiện thì trả mảng rỗng, không đoán giá trị cũ hoặc tương lai.
Với resource_numeric, chỉ quyết định delta/source/sink/transactionKind/consideration; không tự trả before/after/unit. transactionKind phải đúng một trong gain, purchase, fee, transfer, consume, adjustment. Purchase bắt buộc liệt kê consideration gồm itemId/name/quantity/unit và chỉ được dùng item có trong exchangeAnchors của resource; các transaction khác phải có consideration=[]. Với resource_state, chỉ trả after/source. Với fact, chỉ trả valueAfter. Engine sẽ gắn before/after/unit/valueBefore từ ledger theo thứ tự năm chương. source và sink phải mô tả nguồn nhận/đích tiêu hao có nguyên nhân, mỗi trường ít nhất 8 ký tự; không dùng một từ trần như "quỹ", "kho" hoặc "mất".
AUTHORITATIVE_LEDGER.resources là sổ cái duy nhất: mỗi resource_numeric có amount hiện tại, minimumValue và maximumValue. Phải tự cộng tuần tự mọi delta của cả năm chương; sau từng delta, số dư không được thấp hơn minimumValue hoặc cao hơn maximumValue. Không được chi tiền/tài nguyên chưa kiếm được ở một delta trước đó, kể cả khi dự kiến sẽ thu lại ở scene hoặc chương sau.
Khi transactionKind=purchase, phải tính tổng giá theo exchangeAnchors riêng của truyện và tolerancePercent; plan nằm ngoài khoảng giá bị chặn trước Writer. Không tự bịa bảng giá chung và không dùng prose để chữa một giao dịch sai.
Scene gắn với resource_numeric phải để con số trong required delta; objective/obstacle/action không được đổi đơn vị hoặc dùng quy mô mơ hồ trái ledger.
Mọi knowledge change phải chỉ rõ nhân vật, fact và nguồn học. Fact mới dùng stable ID mới và phải được tạo trước hoặc cùng chương với lần học đầu tiên; engine tự gắn valueBefore.
Relationship delta chỉ ghi thay đổi về mức tin tưởng, nghĩa vụ hoặc hành vi có thể quan sát; không chỉ đạo cảm xúc/văn diễn như khóc vì hạnh phúc, vô cùng cảm động, sững sờ hay vỡ òa.
Character/resource/promise ID chỉ lấy từ kernel/state. Mọi ID và locationId theo mẫu [a-z][a-z0-9_-].
Mỗi scene chỉ có objective, obstacle và action: câu cơ học ngắn, cụ thể, tối đa 240 ký tự; không viết cảm xúc hộ nhân vật, không dùng ẩn dụ, khẩu hiệu, câu kết hoặc lời thoại mẫu. Kết quả, chi phí, tri thức và quan hệ phải nằm trong required delta thay vì được kể lại bằng prose.
Không được giả định nhân vật đã chuẩn bị, giấu sẵn hoặc đặt sẵn vật dụng ngoài timeline đã commit. Vật dụng phải đến từ ledger/fact hiện có hoặc được lấy, mua, mượn hay nhặt ngay trong scene với nguồn cụ thể. Không dùng các cụm như "đã chuẩn bị từ trước", "giấu sẵn từ chiều" để lấp nguồn vật thể.
Mọi vật thể nhân vật được cho, tặng, giao, nhặt, mượn, thu gom hoặc lấy được để dùng sau scene hiện tại phải có delta kind=fact trong chính scene ghi rõ quyền sở hữu/trạng thái vật thể. Delta relationship không thay thế inventory fact; lời action không được tự tạo vật thể ngoài ledger.
Nếu nhận hàng hoặc tiền trước rồi trả sau, chính scene đó phải có fact ghi rõ vật/hàng đã nhận, chủ nợ, khoản nợ và hạn trả; có thể dùng một fact duy nhất nếu nó chứa đủ cả inventory lẫn nghĩa vụ. Chương thanh toán phải trừ resource thật và cập nhật fact nợ. Uy tín, relationship hoặc lời hứa trong action không thay thế sổ này.
WriterBrief cơ học của từng chương có hard cap 5.000 ký tự và mục tiêu an toàn dưới 4.400 ký tự. Mặc định dùng tối đa 2 scene và 4 delta; chỉ vượt khi quan hệ nhân quả thật sự không thể biểu diễn ngắn hơn. Không tách scene hay tạo location/relationship/knowledge delta trang trí. Validator sẽ trả writer_brief_budget và yêu cầu tạo lại toàn bộ window nếu vượt cap.
worldClaimIds chỉ chứa ID quy tắc thực sự chi phối scene. hookIntent chỉ là enum hiệu ứng, không phải câu kết văn xuôi sẵn.`;

export const V3_ROLLING_PLANNER_SYSTEM = `Bạn là Rolling Planner của đúng một bộ truyện. Không viết prose, không sửa kernel/state/arc và chỉ trả JSON RollingPlanWindowV3.
${V3_ROLLING_PLANNER_RULES}`;

export interface PlanAttemptV3 {
  attempt: 1 | 2;
  artifactDigest: string;
  modelRoute: string;
  estimatedCostUsd: number;
  validationEvidence: unknown[];
  result: 'valid' | 'invalid';
}

export function buildPlannerRepairPromptV3(input: {
  startChapter: number;
  previousDraft: unknown;
  ledger: unknown;
  validationIssues: unknown[];
  roleContext: string;
}): string {
  const evidenceText = JSON.stringify(input.validationIssues);
  const budgetRepair = evidenceText.includes('writer_brief_budget')
    ? '\nBUDGET_REPAIR: Chỉ ở chapterNumber được nêu trong VALIDATION_ISSUES, giảm còn tối đa 1-2 scene, tối đa 3 delta nếu có thể, bỏ participant không hành động, bỏ relationship/knowledge/location delta trang trí, và rút objective/obstacle/action/source/sink/valueAfter xuống câu cơ học ngắn nhất vẫn đủ nghĩa. Không làm phình chương khác.'
    : '';
  return `REPAIR_ATTEMPT=2_OF_2
START_CHAPTER=${input.startChapter}
AUTHORITATIVE_LEDGER=${JSON.stringify(input.ledger)}
PREVIOUS_INVALID_DRAFT=${JSON.stringify(input.previousDraft)}
VALIDATION_ISSUES=${JSON.stringify(input.validationIssues)}
ROLE_CONTEXT=${input.roleContext}
Tạo lại toàn bộ window chương ${input.startChapter}-${input.startChapter + 4}. Không vá số bằng cách clamp, không đổi ID và không bỏ delta bắt buộc để né lỗi. Tự mô phỏng tuần tự trước khi trả JSON.${budgetRepair}`;
}

export function buildPlannerLedgerV3(
  state: StoryStateV3,
  kernel: ReturnType<typeof StoryKernelV3Schema.parse>,
): unknown {
  const definitions = new Map(kernel.resources.map(resource => [resource.id, resource]));
  return {
    chapterNumber: state.chapterNumber,
    facts: state.facts.map(fact => ({ id: fact.id, value: fact.value })),
    characterKnowledge: state.characters.map(character => ({
      characterId: character.characterId,
      locationId: character.locationId,
      factIds: character.knowledge.map(item => item.factId),
    })),
    resources: state.resources.map(resource => {
      const definition = definitions.get(resource.resourceId);
      return {
        resourceId: resource.resourceId,
        value: resource.value,
        minimumValue: definition?.minimumValue ?? null,
        maximumValue: definition?.maximumValue ?? null,
        sourceRules: definition?.sourceRules ?? [],
        spendRules: definition?.spendRules ?? [],
        exchangeAnchors: definition?.exchangeAnchors ?? [],
      };
    }),
    promises: state.promises.map(promise => ({ promiseId: promise.promiseId, status: promise.status })),
  };
}

type JsonSchemaNode = Record<string, unknown>;

function childSchema(node: JsonSchemaNode, ...path: string[]): JsonSchemaNode {
  let current = node;
  for (const segment of path) {
    const next = current[segment];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      throw new Error(`Rolling Planner JSON schema is missing ${path.join('.')}.`);
    }
    current = next as JsonSchemaNode;
  }
  return current;
}

function unionBranchByKind(node: JsonSchemaNode, kind: string): JsonSchemaNode {
  const branches = node.anyOf;
  if (!Array.isArray(branches)) throw new Error('Rolling Planner delta schema is missing anyOf branches.');
  const branch = branches.find(candidate => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    const properties = (candidate as JsonSchemaNode).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return false;
    const kindNode = (properties as JsonSchemaNode).kind;
    return !!kindNode && typeof kindNode === 'object' && !Array.isArray(kindNode)
      && Array.isArray((kindNode as JsonSchemaNode).enum)
      && ((kindNode as JsonSchemaNode).enum as unknown[]).includes(kind);
  });
  if (!branch || typeof branch !== 'object' || Array.isArray(branch)) {
    throw new Error(`Rolling Planner delta schema is missing ${kind}.`);
  }
  return branch as JsonSchemaNode;
}

/** Bind story-owned cast IDs into the provider schema so the planner cannot invent participants. */
export function buildRollingPlannerResponseJsonSchemaV3(
  kernel: ReturnType<typeof StoryKernelV3Schema.parse>,
  state: StoryStateV3,
): Record<string, unknown> {
  const schema = toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema);
  const plansSchema = childSchema(schema, 'properties', 'plans');
  // Gemini 3.1 rejects bounds on an array whose item contains the seven-way
  // delta union, and also rejects bounds on that union array itself. Retain
  // bounds on every smaller nested array; application Zod validation still
  // requires exactly five plans and 1-24 deltas before semantic validation.
  delete plansSchema.minItems;
  delete plansSchema.maxItems;
  const scenesSchema = childSchema(schema, 'properties', 'plans', 'items', 'properties', 'scenes');
  // Gemini 3.1 also returns INVALID_ARGUMENT when the outer scene-array bound
  // is combined with this nested seven-way delta union. Keep the more useful
  // participant/delta/consideration bounds in provider decoding and enforce
  // the exact 1-5 scene contract again with Zod after the response.
  delete scenesSchema.minItems;
  delete scenesSchema.maxItems;
  const characterIds = [...new Set([
    ...kernel.characters.map(character => character.id),
    ...state.characters.map(character => character.characterId),
  ])].sort();
  if (characterIds.length === 0) throw new Error('Rolling Planner requires at least one authoritative character ID.');
  const sceneProperties = childSchema(scenesSchema, 'items', 'properties');
  childSchema(sceneProperties, 'povCharacterId').enum = characterIds;
  const participantsSchema = childSchema(sceneProperties, 'participantIds');
  childSchema(participantsSchema, 'items').enum = characterIds;
  participantsSchema.maxItems = characterIds.length;
  // Provider bounds follow the chapter contract instead of the much looser
  // global Zod ceiling. Large nested array ceilings make Gemini's constrained
  // decoder explode before the Planner receives a prompt.
  childSchema(sceneProperties, 'requiredDeltaIds').maxItems = 12;
  const factIds = state.facts.map(fact => fact.id).sort();
  const preconditionsSchema = childSchema(schema, 'properties', 'plans', 'items', 'properties', 'preconditions');
  preconditionsSchema.maxItems = Math.min(factIds.length, 8);
  if (factIds.length > 0) {
    childSchema(preconditionsSchema, 'items', 'properties', 'factId').enum = factIds;
  }
  const numericResourceIds = [...new Set([
    ...kernel.resources.filter(resource => resource.mode === 'numeric').map(resource => resource.id),
    ...state.resources.filter(resource => resource.value.mode === 'numeric').map(resource => resource.resourceId),
  ])].sort();
  const stateResourceIds = [...new Set([
    ...kernel.resources.filter(resource => resource.mode === 'state').map(resource => resource.id),
    ...state.resources.filter(resource => resource.value.mode === 'state').map(resource => resource.resourceId),
  ])].sort();
  const promiseIds = [...new Set([
    ...kernel.promises.map(promise => promise.id),
    ...state.promises.map(promise => promise.promiseId),
  ])].sort();
  const deltaSchema = childSchema(schema, 'properties', 'plans', 'items', 'properties', 'requiredDeltas', 'items');
  const requiredDeltasSchema = childSchema(schema, 'properties', 'plans', 'items', 'properties', 'requiredDeltas');
  delete requiredDeltasSchema.minItems;
  delete requiredDeltasSchema.maxItems;
  for (const kind of ['character_location', 'character_knowledge', 'relationship']) {
    childSchema(unionBranchByKind(deltaSchema, kind), 'properties', 'characterId').enum = characterIds;
  }
  childSchema(unionBranchByKind(deltaSchema, 'resource_numeric'), 'properties', 'resourceId').enum = numericResourceIds;
  // Gemini generateContent accepts minimum/maximum but rejects the draft
  // schema's exclusiveMinimum keyword with a generic 400. Zod still enforces
  // quantity > 0 after constrained decoding, so omit only that unsupported
  // provider keyword instead of weakening application validation.
  const considerationQuantity = childSchema(
    unionBranchByKind(deltaSchema, 'resource_numeric'),
    'properties', 'consideration', 'items', 'properties', 'quantity',
  );
  delete considerationQuantity.exclusiveMinimum;
  childSchema(unionBranchByKind(deltaSchema, 'resource_state'), 'properties', 'resourceId').enum = stateResourceIds;
  childSchema(unionBranchByKind(deltaSchema, 'promise'), 'properties', 'promiseId').enum = promiseIds;
  return schema;
}

export function materializeRollingWindowV3(input: {
  kernel: ReturnType<typeof StoryKernelV3Schema.parse>;
  arc: ReturnType<typeof ArcPlanV3Schema.parse>;
  state: StoryStateV3;
  draft: RollingPlanWindowDraftV3;
}): RollingPlanWindowV3 {
  let state = input.state;
  const plans = input.draft.plans.map(draftPlan => {
    // Bind ledger values in the exact order emitted by the planner. A chapter
    // can legitimately earn and then spend the same resource; every later
    // delta must therefore observe the result of the previous delta instead
    // of the chapter-start snapshot.
    const workingFacts = new Map(state.facts.map(item => [item.id, item.value]));
    const workingResources = new Map(state.resources.map(item => [item.resourceId, item.value]));
    const requiredDeltas = draftPlan.requiredDeltas.map(delta => {
      if (delta.kind === 'fact') {
        const before = workingFacts.get(delta.factId) ?? null;
        workingFacts.set(delta.factId, delta.valueAfter);
        return { ...delta, valueBefore: before };
      }
      if (delta.kind === 'resource_numeric') {
        const current = workingResources.get(delta.resourceId);
        if (!current || current.mode !== 'numeric') {
          throw new FlagshipV3Error('plan_blocked', `Numeric resource ${delta.resourceId} is missing from committed state.`);
        }
        const after = current.amount + delta.delta;
        workingResources.set(delta.resourceId, { ...current, amount: after });
        return {
          ...delta,
          before: current.amount,
          after,
          unit: current.unit,
        };
      }
      if (delta.kind === 'resource_state') {
        const current = workingResources.get(delta.resourceId);
        if (!current || current.mode !== 'state') {
          throw new FlagshipV3Error('plan_blocked', `State resource ${delta.resourceId} is missing from committed state.`);
        }
        workingResources.set(delta.resourceId, { ...current, value: delta.after });
        return { ...delta, before: current.value };
      }
      return delta;
    });
    const plan = ChapterPlanV3Schema.parse({ ...draftPlan, requiredDeltas });
    const issues = validateV3Artifacts({ kernel: input.kernel, arc: input.arc, state, plan });
    if (issues.length) {
      throw new FlagshipV3Error('plan_blocked', `Chapter ${plan.chapterNumber} is inconsistent after deterministic ledger binding.`, [{
        chapterNumber: plan.chapterNumber,
        issues,
      }]);
    }
    state = applyChapterStateV3({
      state,
      plan,
      title: `planned-${plan.chapterNumber}`,
      content: '',
      realizedDeltaIds: plan.requiredDeltas.map(item => item.id),
    });
    return plan;
  });
  return RollingPlanWindowV3Schema.parse({
    schemaVersion: 3,
    startChapter: input.draft.startChapter,
    plans,
  });
}

const cleanJson = (raw: string): unknown => JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));

function parseRequired<T>(label: string, schema: Parameters<typeof parseV3<T>>[0], value: unknown): T {
  const parsed = parseV3(schema, value);
  if (!parsed.success) throw new FlagshipV3Error('setup_blocked', `${label} is missing or invalid.`, parsed.issues);
  return parsed.data;
}

export function validateRollingWindowV3(input: {
  kernel: ReturnType<typeof StoryKernelV3Schema.parse>;
  arc: ReturnType<typeof ArcPlanV3Schema.parse>;
  state: ReturnType<typeof StoryStateV3Schema.parse>;
  window: RollingPlanWindowV3;
}): void {
  let state = input.state;
  const issues: unknown[] = [];
  for (const plan of input.window.plans) {
    const planIssues = validateV3Artifacts({ kernel: input.kernel, arc: input.arc, state, plan });
    if (planIssues.length) issues.push({ chapterNumber: plan.chapterNumber, issues: planIssues });
    if (planIssues.length === 0) {
      state = applyChapterStateV3({
        state,
        plan,
        title: `planned-${plan.chapterNumber}`,
        content: '',
        realizedDeltaIds: plan.requiredDeltas.map(delta => delta.id),
      });
    }
  }
  if (issues.length) throw new FlagshipV3Error('plan_blocked', 'Rolling Planner produced a state-inconsistent five-chapter window.', issues);
}

export async function generateRollingWindowWithOneRepairV3(input: {
  kernel: ReturnType<typeof StoryKernelV3Schema.parse>;
  arc: ReturnType<typeof ArcPlanV3Schema.parse>;
  state: ReturnType<typeof StoryStateV3Schema.parse>;
  startChapter: number;
  basePrompt: string;
  roleContext: string;
  ledger: unknown;
  modelRoute: string;
  invoke: (prompt: string, attempt: 1 | 2) => Promise<{ raw: string; estimatedCostUsd: number }>;
  onAttempt?: (attempt: PlanAttemptV3) => Promise<void>;
}): Promise<{ window: RollingPlanWindowV3; attempts: PlanAttemptV3[]; estimatedCostUsd: number }> {
  const attempts: PlanAttemptV3[] = [];
  let prompt = input.basePrompt;
  let totalCost = 0;
  for (const attemptNumber of [1, 2] as const) {
    const response = await input.invoke(prompt, attemptNumber);
    totalCost += response.estimatedCostUsd;
    let value: unknown;
    try {
      value = cleanJson(response.raw);
    } catch (caught) {
      throw new FlagshipV3Error('infra_blocked', 'Rolling Planner returned invalid JSON.', String(caught));
    }
    const parsedDraft = RollingPlanWindowDraftV3Schema.safeParse(value);
    const digest = createHash('sha256').update(JSON.stringify(value)).digest('hex');
    if (!parsedDraft.success) {
      const validationEvidence = parsedDraft.error.issues.map(issue => ({
        code: 'planner_contract',
        path: issue.path.join('.'),
        message: issue.message,
      }));
      const attempt: PlanAttemptV3 = {
        attempt: attemptNumber,
        artifactDigest: digest,
        modelRoute: input.modelRoute,
        estimatedCostUsd: response.estimatedCostUsd,
        validationEvidence,
        result: 'invalid',
      };
      attempts.push(attempt);
      await input.onAttempt?.(attempt);
      if (attemptNumber === 2) {
        throw new FlagshipV3Error('plan_blocked', 'Rolling Planner remained schema-invalid after its single evidence-guided repair.', attempts);
      }
      prompt = buildPlannerRepairPromptV3({
        startChapter: input.startChapter,
        previousDraft: value,
        ledger: input.ledger,
        validationIssues: validationEvidence,
        roleContext: input.roleContext,
      });
      continue;
    }
    const draft = parsedDraft.data;
    let window: RollingPlanWindowV3 | null = null;
    let validationEvidence: unknown[] = [];
    try {
      if (draft.startChapter !== input.startChapter) {
        throw new FlagshipV3Error('plan_blocked', 'Rolling Planner changed the requested window identity.', [{
          code: 'window_identity', path: 'startChapter', message: `Expected ${input.startChapter}, received ${draft.startChapter}.`,
        }]);
      }
      window = materializeRollingWindowV3({ kernel: input.kernel, arc: input.arc, state: input.state, draft });
      validateRollingWindowV3({ kernel: input.kernel, arc: input.arc, state: input.state, window });
    } catch (caught) {
      if (!(caught instanceof FlagshipV3Error) || caught.code !== 'plan_blocked') throw caught;
      validationEvidence = Array.isArray(caught.detail) ? caught.detail : [{ message: caught.message, detail: caught.detail }];
    }
    const attempt: PlanAttemptV3 = {
      attempt: attemptNumber,
      artifactDigest: digest,
      modelRoute: input.modelRoute,
      estimatedCostUsd: response.estimatedCostUsd,
      validationEvidence,
      result: window ? 'valid' : 'invalid',
    };
    attempts.push(attempt);
    await input.onAttempt?.(attempt);
    if (window) return { window, attempts, estimatedCostUsd: totalCost };
    if (attemptNumber === 2) {
      throw new FlagshipV3Error('plan_blocked', 'Rolling Planner remained invalid after its single evidence-guided repair.', attempts);
    }
    prompt = buildPlannerRepairPromptV3({
      startChapter: input.startChapter,
      previousDraft: draft,
      ledger: input.ledger,
      validationIssues: validationEvidence,
      roleContext: input.roleContext,
    });
  }
  throw new FlagshipV3Error('plan_blocked', 'Rolling Planner repair budget exhausted.');
}

export async function planNextFlagshipV3Window(
  projectId: string,
  dependencies: { db?: SupabaseClient; invoke?: (systemPrompt: string, userPrompt: string) => Promise<string> } = {},
): Promise<RollingPlanWindowV3> {
  const db = dependencies.db || getSupabase();
  const { data, error } = await db.from('ai_story_projects')
    .select('status,current_chapter,style_directives,flagship_v3_status,story_kernel_v3,arc_plan_v3,story_state_v3')
    .eq('id', projectId).single();
  if (error || !data) throw new FlagshipV3Error('setup_blocked', error?.message || 'Flagship v3 project not found.');
  const style = data.style_directives as { pipeline_version?: string; flagship_release_v3?: unknown } | null;
  if (style?.pipeline_version !== 'flagship_v3' || data.status !== 'paused' || data.flagship_v3_status !== 'ready_to_write') {
    throw new FlagshipV3Error('setup_blocked', 'Rolling Planner requires an approved paused flagship_v3 project.');
  }
  try { assertFlagshipReleaseV3(style.flagship_release_v3); } catch (caught) {
    throw new FlagshipV3Error('setup_blocked', caught instanceof Error ? caught.message : String(caught));
  }
  const routes = requireFlagshipModelRoutesV3(data.style_directives);
  const kernel = parseRequired('StoryKernelV3', StoryKernelV3Schema, data.story_kernel_v3);
  const arc = parseRequired('ArcPlanV3', ArcPlanV3Schema, data.arc_plan_v3);
  let state = parseRequired('StoryStateV3', StoryStateV3Schema, data.story_state_v3);
  const startChapter = Number(data.current_chapter || 0) + 1;
  if (state.chapterNumber !== startChapter - 1) throw new FlagshipV3Error('setup_blocked', 'Committed StoryStateV3 is stale.');
  if (startChapter + 4 > arc.endChapter) throw new FlagshipV3Error('plan_blocked', 'Current ArcPlanV3 has fewer than five chapters remaining.');
  let ledgerMemory;
  try {
    ledgerMemory = await loadPlannerLedgerMemoryV3(db, projectId);
    state = mergePlannerLedgerMemoryV3(state, ledgerMemory);
  } catch (caught) {
    throw new FlagshipV3Error('infra_blocked', caught instanceof Error ? caught.message : String(caught));
  }
  const context = buildV3PlannerContext({ kernel, arc, state, ledgerMemory: { knowledge: ledgerMemory.knowledge } });
  const userPrompt = `START_CHAPTER=${startChapter}
AUTHORITATIVE_LEDGER=${JSON.stringify(buildPlannerLedgerV3(state, kernel))}
ROLE_CONTEXT=${context.text}
Tạo plan chương ${startChapter}-${startChapter + 4}. Trước khi trả JSON, tự mô phỏng tuần tự cả năm plan trên AUTHORITATIVE_LEDGER.`;
  let generated: Awaited<ReturnType<typeof generateRollingWindowWithOneRepairV3>>;
  try {
    generated = await generateRollingWindowWithOneRepairV3({
      kernel,
      arc,
      state,
      startChapter,
      basePrompt: userPrompt,
      roleContext: context.text,
      ledger: buildPlannerLedgerV3(state, kernel),
      modelRoute: routes.planner,
      invoke: async (prompt) => dependencies.invoke
        ? { raw: await dependencies.invoke(V3_ROLLING_PLANNER_SYSTEM, prompt), estimatedCostUsd: 0 }
        : await (async () => {
        const response = await callFlagshipModel(prompt, {
        model: routes.planner,
        temperature: 0.2,
        maxTokens: 32768,
        thinkingLevel: 'medium',
        systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
        responseJsonSchema: buildRollingPlannerResponseJsonSchemaV3(kernel, state),
      }, {
        jsonMode: true,
        schemaName: 'flagship_v3_rolling_window',
        tracking: { projectId, chapterNumber: startChapter, task: 'flagship_v3_rolling_planner' },
        });
        if (!Number.isFinite(response.estimatedCostUsd)) throw new Error('Planner provider did not return a cost estimate.');
        return { raw: response.content, estimatedCostUsd: Number(response.estimatedCostUsd) };
      })(),
      onAttempt: async attempt => {
        const { error: attemptError } = await db.from('story_plan_attempts_v3').insert({
          project_id: projectId,
          start_chapter: startChapter,
          attempt_no: attempt.attempt,
          artifact_digest: attempt.artifactDigest,
          model_route: attempt.modelRoute,
          estimated_cost_usd: attempt.estimatedCostUsd,
          validation_evidence: attempt.validationEvidence,
          result: attempt.result,
          engine_release_id: getFlagshipReleaseManifestV3().releaseId,
        });
        if (attemptError) throw new FlagshipV3Error('infra_blocked', `Could not persist immutable PlanAttemptV3: ${attemptError.message}`);
      },
    });
  } catch (caught) {
    if (caught instanceof FlagshipV3Error) throw caught;
    const message = caught instanceof Error ? caught.message : String(caught);
    const failure = classifyStoryFailure(message);
    throw new FlagshipV3Error(failure === 'setup' ? 'setup_blocked' : 'infra_blocked', message);
  }
  const { error: commitError } = await db.rpc('commit_flagship_rolling_window_release_v3', {
    p_project_id: projectId,
    p_expected_current_chapter: startChapter - 1,
    p_window: generated.window,
    p_prompt_version: V3_ROLLING_PLANNER_PROMPT_VERSION,
    p_model_route: routes,
    p_context_manifest: context.manifest,
    p_engine_release_id: getFlagshipReleaseManifestV3().releaseId,
    p_estimated_cost_usd: generated.estimatedCostUsd,
  });
  if (commitError) throw new FlagshipV3Error('commit_failed', `Could not commit RollingPlanWindowV3: ${commitError.message}`);
  return generated.window;
}
