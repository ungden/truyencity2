import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { callFlagshipModel } from '../flagship/provider';
import { toGeminiResponseJsonSchema } from '../flagship/setup-response-schemas';
import { getSupabase } from '../utils/supabase';
import {
  ArcPlanV3Schema,
  RollingPlanWindowV3Schema,
  StoryKernelV3Schema,
  StoryStateV3Schema,
  parseV3,
  type RollingPlanWindowV3,
} from './contracts';
import { buildV3PlannerContext } from './context';
import { requireFlagshipModelRoutesV3 } from './model-routes';
import { FlagshipV3Error } from './pipeline';
import { applyChapterStateV3 } from './state-transition';
import { validateV3Artifacts } from './validation';

export const V3_ROLLING_PLANNER_PROMPT_VERSION = 'flagship-v3.1-rolling-five-fact-create';
export const V3_ROLLING_PLANNER_SYSTEM = `Bạn là Rolling Planner của đúng một bộ truyện.
Tạo đúng năm ChapterPlanV3 liên tiếp. Không viết văn xuôi và không tạo canon mới.
Mỗi scene phải có thời gian, địa điểm, người tham gia, desire, opposition, tactic, cost, payoff và irreversibleChange.
Mọi resource transaction phải khớp before + delta = after và tiếp nối plan trước.
Mọi knowledge change phải chỉ rõ nhân vật, fact và nguồn học.
Fact mới được phép tạo bằng stable factId với valueBefore=null; fact đã tồn tại phải ghi valueBefore khớp state.
hookIntent chỉ là enum hiệu ứng; unresolvedQuestion không được viết như câu kết văn xuôi sẵn.
Character/resource/promise ID chỉ được lấy từ kernel/state; fact ID mới phải theo mẫu stable ID. Trả đúng JSON RollingPlanWindowV3.`;

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
  const style = data.style_directives as { pipeline_version?: string } | null;
  if (style?.pipeline_version !== 'flagship_v3' || data.status !== 'paused' || data.flagship_v3_status !== 'ready_to_write') {
    throw new FlagshipV3Error('setup_blocked', 'Rolling Planner requires an approved paused flagship_v3 project.');
  }
  const routes = requireFlagshipModelRoutesV3(data.style_directives);
  const kernel = parseRequired('StoryKernelV3', StoryKernelV3Schema, data.story_kernel_v3);
  const arc = parseRequired('ArcPlanV3', ArcPlanV3Schema, data.arc_plan_v3);
  const state = parseRequired('StoryStateV3', StoryStateV3Schema, data.story_state_v3);
  const startChapter = Number(data.current_chapter || 0) + 1;
  if (state.chapterNumber !== startChapter - 1) throw new FlagshipV3Error('setup_blocked', 'Committed StoryStateV3 is stale.');
  if (startChapter + 4 > arc.endChapter) throw new FlagshipV3Error('plan_blocked', 'Current ArcPlanV3 has fewer than five chapters remaining.');
  const context = buildV3PlannerContext({ kernel, arc, state });
  const userPrompt = `START_CHAPTER=${startChapter}\nROLE_CONTEXT=${context.text}\nTạo plan chương ${startChapter}-${startChapter + 4}.`;
  let raw: string;
  try {
    raw = dependencies.invoke
      ? await dependencies.invoke(V3_ROLLING_PLANNER_SYSTEM, userPrompt)
      : (await callFlagshipModel(userPrompt, {
        model: routes.planner,
        temperature: 0.2,
        maxTokens: 32768,
        systemPrompt: V3_ROLLING_PLANNER_SYSTEM,
        responseJsonSchema: toGeminiResponseJsonSchema(RollingPlanWindowV3Schema),
      }, {
        jsonMode: true,
        schemaName: 'flagship_v3_rolling_window',
        tracking: { projectId, chapterNumber: startChapter, task: 'flagship_v3_rolling_planner' },
      })).content;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    throw new FlagshipV3Error(classifyStoryFailure(message) === 'infrastructure' ? 'infra_blocked' : 'plan_blocked', message);
  }
  let value: unknown;
  try {
    value = cleanJson(raw);
  } catch (caught) {
    throw new FlagshipV3Error('infra_blocked', 'Rolling Planner returned invalid JSON.', String(caught));
  }
  const window = parseRequired('RollingPlanWindowV3', RollingPlanWindowV3Schema, value);
  if (window.startChapter !== startChapter) throw new FlagshipV3Error('plan_blocked', 'Rolling Planner changed the requested window identity.');
  validateRollingWindowV3({ kernel, arc, state, window });
  const { error: commitError } = await db.rpc('commit_flagship_rolling_window_v3', {
    p_project_id: projectId,
    p_expected_current_chapter: startChapter - 1,
    p_window: window,
    p_prompt_version: V3_ROLLING_PLANNER_PROMPT_VERSION,
    p_model_route: routes,
    p_context_manifest: context.manifest,
  });
  if (commitError) throw new FlagshipV3Error('commit_failed', `Could not commit RollingPlanWindowV3: ${commitError.message}`);
  return window;
}
