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
Mọi required delta bắt buộc evidenceRequired=true và phải được đúng một hoặc nhiều scene thực hiện.
Mỗi plan chỉ ghi elapsedMinutesSincePreviousChapter, durationMinutes và travelMinutesFromPrevious. Không tự tạo startMinute; engine sẽ cộng timeline tuyệt đối theo thứ tự scene.
Với resource_numeric, chỉ quyết định delta/source/sink; không tự trả before/after/unit. Với resource_state, chỉ trả after/source. Với fact, chỉ trả valueAfter. Engine sẽ gắn before/after/unit/valueBefore từ ledger theo thứ tự năm chương.
Scene gắn với resource_numeric phải dùng cùng amount/unit trong cost/payoff/irreversibleChange; không đổi đơn vị hoặc dùng tính từ quy mô mơ hồ trái ledger.
Mọi knowledge change phải chỉ rõ nhân vật, fact và nguồn học. Fact mới dùng stable ID mới và phải được tạo trước hoặc cùng chương với lần học đầu tiên; engine tự gắn valueBefore.
Character/resource/promise ID chỉ lấy từ kernel/state. Mọi ID và locationId theo mẫu [a-z][a-z0-9_-].
desire, opposition, tactic, cost, payoff, irreversibleChange và informationDelta là câu đầy đủ có nguyên nhân và hậu quả.
hookIntent chỉ là enum hiệu ứng; unresolvedQuestion không được viết như câu kết văn xuôi sẵn.`;

export const V3_ROLLING_PLANNER_SYSTEM = `Bạn là Rolling Planner của đúng một bộ truyện. Không viết prose, không sửa kernel/state/arc và chỉ trả JSON RollingPlanWindowV3.
${V3_ROLLING_PLANNER_RULES}`;

export function buildPlannerLedgerV3(state: StoryStateV3): unknown {
  return {
    chapterNumber: state.chapterNumber,
    facts: state.facts.map(fact => ({ id: fact.id, value: fact.value })),
    characterKnowledge: state.characters.map(character => ({
      characterId: character.characterId,
      locationId: character.locationId,
      factIds: character.knowledge.map(item => item.factId),
    })),
    resources: state.resources.map(resource => ({ resourceId: resource.resourceId, value: resource.value })),
    promises: state.promises.map(promise => ({ promiseId: promise.promiseId, status: promise.status })),
  };
}

export function materializeRollingWindowV3(input: {
  kernel: ReturnType<typeof StoryKernelV3Schema.parse>;
  arc: ReturnType<typeof ArcPlanV3Schema.parse>;
  state: StoryStateV3;
  draft: RollingPlanWindowDraftV3;
}): RollingPlanWindowV3 {
  let state = input.state;
  const plans = input.draft.plans.map(draftPlan => {
    const requiredDeltas = draftPlan.requiredDeltas.map(delta => {
      if (delta.kind === 'fact') {
        const current = state.facts.find(item => item.id === delta.factId);
        return { ...delta, valueBefore: current?.value ?? null };
      }
      if (delta.kind === 'resource_numeric') {
        const current = state.resources.find(item => item.resourceId === delta.resourceId);
        if (!current || current.value.mode !== 'numeric') {
          throw new FlagshipV3Error('plan_blocked', `Numeric resource ${delta.resourceId} is missing from committed state.`);
        }
        return {
          ...delta,
          before: current.value.amount,
          after: current.value.amount + delta.delta,
          unit: current.value.unit,
        };
      }
      if (delta.kind === 'resource_state') {
        const current = state.resources.find(item => item.resourceId === delta.resourceId);
        if (!current || current.value.mode !== 'state') {
          throw new FlagshipV3Error('plan_blocked', `State resource ${delta.resourceId} is missing from committed state.`);
        }
        return { ...delta, before: current.value.value };
      }
      return delta;
    });
    const plan = ChapterPlanV3Schema.parse({ ...draftPlan, requiredDeltas });
    const issues = validateV3Artifacts({ kernel: input.kernel, arc: input.arc, state, plan });
    if (issues.length) {
      throw new FlagshipV3Error('plan_blocked', `Chapter ${plan.chapterNumber} is inconsistent after deterministic ledger binding.`, issues);
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
AUTHORITATIVE_LEDGER=${JSON.stringify(buildPlannerLedgerV3(state))}
ROLE_CONTEXT=${context.text}
Tạo plan chương ${startChapter}-${startChapter + 4}. Trước khi trả JSON, tự mô phỏng tuần tự cả năm plan trên AUTHORITATIVE_LEDGER.`;
  let raw: string;
  let estimatedCostUsd = 0;
  try {
    raw = dependencies.invoke
      ? await dependencies.invoke(V3_ROLLING_PLANNER_SYSTEM, userPrompt)
      : await (async () => {
        const response = await callFlagshipModel(userPrompt, {
        model: routes.planner,
        temperature: 0.2,
        maxTokens: 32768,
        systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
        responseJsonSchema: toGeminiResponseJsonSchema(RollingPlanWindowDraftV3Schema),
      }, {
        jsonMode: true,
        schemaName: 'flagship_v3_rolling_window',
        tracking: { projectId, chapterNumber: startChapter, task: 'flagship_v3_rolling_planner' },
        });
        if (!Number.isFinite(response.estimatedCostUsd)) throw new Error('Planner provider did not return a cost estimate.');
        estimatedCostUsd = Number(response.estimatedCostUsd);
        return response.content;
      })();
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    const failure = classifyStoryFailure(message);
    throw new FlagshipV3Error(failure === 'setup' ? 'setup_blocked' : 'infra_blocked', message);
  }
  let value: unknown;
  try {
    value = cleanJson(raw);
  } catch (caught) {
    throw new FlagshipV3Error('infra_blocked', 'Rolling Planner returned invalid JSON.', String(caught));
  }
  const draft = parseRequired('RollingPlanWindowDraftV3', RollingPlanWindowDraftV3Schema, value);
  if (draft.startChapter !== startChapter) throw new FlagshipV3Error('plan_blocked', 'Rolling Planner changed the requested window identity.');
  const window = materializeRollingWindowV3({ kernel, arc, state, draft });
  validateRollingWindowV3({ kernel, arc, state, window });
  const { error: commitError } = await db.rpc('commit_flagship_rolling_window_release_v3', {
    p_project_id: projectId,
    p_expected_current_chapter: startChapter - 1,
    p_window: window,
    p_prompt_version: V3_ROLLING_PLANNER_PROMPT_VERSION,
    p_model_route: routes,
    p_context_manifest: context.manifest,
    p_engine_release_id: getFlagshipReleaseManifestV3().releaseId,
    p_estimated_cost_usd: estimatedCostUsd,
  });
  if (commitError) throw new FlagshipV3Error('commit_failed', `Could not commit RollingPlanWindowV3: ${commitError.message}`);
  return window;
}
