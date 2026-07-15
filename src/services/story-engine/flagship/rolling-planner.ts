import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { getSupabase } from '../utils/supabase';
import { parseArcPlanV2, parseStorySpecV2, parseStoryStateV2, validateChapterPlanSemantics, validatePleasureWindow, type PleasureProfileV2 } from './contracts';
import { RollingPlanWindowV2Schema, type RollingPlanWindowV2 } from './setup-contracts';
import { FlagshipSetupError } from './setup';
import { finishFlagshipSetupRun, startFlagshipSetupRun } from './setup-ledger';
import { requireFlagshipModelRoutes } from './model-routes';
import { callFlagshipModel } from './provider';
import { toGeminiResponseJsonSchema } from './setup-response-schemas';

export const ROLLING_PLANNER_PROMPT_VERSION = 'flagship-rolling-v2.0';
export const ROLLING_PLANNER_SYSTEM = `Bạn là rolling planner của đúng một bộ truyện.
Lập đúng năm ChapterPlanV2 liên tiếp từ state đã commit. Mỗi scene phải có desire, opposition, tactic, cost và irreversible change.
Hậu quả chương trước phải trở thành stateBefore và áp lực thật của chương sau. Không tạo canon, cast, tài nguyên, promise hoặc quyền lực ngoài kernel/state.
Không dùng outline, template hay genre playbook legacy. Chỉ trả JSON đúng RollingPlanWindowV2.`;

const json = (value: unknown) => JSON.stringify(value);

export function buildRollingPlannerPrompt(input: { storySpec: unknown; arcPlan: unknown; storyState: unknown; startChapter: number }): string {
  return `STORY_KERNEL=${json(input.storySpec)}\nARC=${json(input.arcPlan)}\nCOMMITTED_STATE=${json(input.storyState)}\nSTART_CHAPTER=${input.startChapter}\n\nChỉ dùng promise đến hạn và xung đột đang active. Trong năm chương phải có ít nhất hai payoff năng lực kiếm được, một payoff đời sống đúng comfortLoop và một bước tiến cụ thể trong progressionSignals. Áp lực không được giữ nhân vật chính bất lực lâu hơn setbackRecoveryWindow. Nếu là cửa sổ 1-5: chương 1 phải có hành động chủ động dùng advantage và chậm nhất chương 3 phải đổi một resource bằng thành quả vật chất. Trả năm plan từ chương ${input.startChapter} đến ${input.startChapter + 4}.`;
}

export function validateRollingPlanWindow(window: RollingPlanWindowV2, pleasureProfile?: PleasureProfileV2): void {
  const issues = window.plans.flatMap((plan, index) => validateChapterPlanSemantics(plan).map(issue => ({ ...issue, path: `plans.${index}.${issue.path}` })));
  if (pleasureProfile) issues.push(...validatePleasureWindow(window.plans, pleasureProfile));
  if (issues.length) throw new FlagshipSetupError('setup_blocked', 'Rolling planner returned inert scenes.', issues);
}

export async function planNextFlagshipWindowForProject(
  projectId: string,
  dependencies: { db?: SupabaseClient; invoke?: (systemPrompt: string, userPrompt: string) => Promise<string> } = {},
): Promise<RollingPlanWindowV2> {
  const db = dependencies.db || getSupabase();
  const { data, error } = await db.from('ai_story_projects')
    .select('status,current_chapter,style_directives,flagship_setup_status,story_spec_v2,arc_plan_v2,story_state_v2')
    .eq('id', projectId).single();
  if (error || !data) throw new FlagshipSetupError('setup_blocked', error?.message || 'Flagship project not found.');
  const style = data.style_directives as { pipeline_version?: string } | null;
  if (style?.pipeline_version !== 'flagship_v2' || data.flagship_setup_status !== 'ready_to_write') throw new FlagshipSetupError('setup_blocked', 'Project has no approved flagship setup.');
  if (data.status !== 'paused') throw new FlagshipSetupError('setup_blocked', 'Rolling planning is manual-only and requires a paused project.');
  const modelRoutes = requireFlagshipModelRoutes(data.style_directives);
  const spec = parseStorySpecV2(data.story_spec_v2);
  const arc = parseArcPlanV2(data.arc_plan_v2);
  const state = parseStoryStateV2(data.story_state_v2);
  if (!spec.success || !arc.success || !state.success) throw new FlagshipSetupError('setup_blocked', 'StorySpecV2, ArcPlanV2 and StoryStateV2 are required; no fallback is allowed.', { spec, arc, state });
  const startChapter = Number(data.current_chapter || 0) + 1;
  if (state.data.chapterNumber !== startChapter - 1) throw new FlagshipSetupError('setup_blocked', 'Committed state does not match current_chapter.');
  if (startChapter + 4 > arc.data.endChapter) throw new FlagshipSetupError('human_gate', 'Current arc has fewer than five chapters remaining; approve the next arc before planning.');

  const systemPrompt = ROLLING_PLANNER_SYSTEM;
  const userPrompt = buildRollingPlannerPrompt({ storySpec: spec.data, arcPlan: arc.data, storyState: state.data, startChapter });
  const runId = await startFlagshipSetupRun({ db, projectId, phase: 'rolling_plan', model: modelRoutes.planner, modelRoutes, promptVersion: ROLLING_PLANNER_PROMPT_VERSION });
  let raw: string;
  try {
    if (dependencies.invoke) raw = await dependencies.invoke(systemPrompt, userPrompt);
    else {
      const response = await callFlagshipModel(userPrompt, {
        model: modelRoutes.planner,
        temperature: 0.3,
        maxTokens: 32768,
        systemPrompt,
        responseJsonSchema: toGeminiResponseJsonSchema(RollingPlanWindowV2Schema),
      }, { jsonMode: true, schemaName: 'flagship_rolling_planner', tracking: { projectId, chapterNumber: startChapter, task: 'flagship_rolling_planner' } });
      raw = response.content;
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    const failure = new FlagshipSetupError(classifyStoryFailure(message) === 'infrastructure' ? 'infra_blocked' : 'setup_blocked', message);
    await finishFlagshipSetupRun({ db, runId, status: failure.code, callRoles: ['rolling_planner'], errorMessage: failure.message });
    throw failure;
  }
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let value: unknown;
    try { value = JSON.parse(cleaned); } catch (caught) { throw new FlagshipSetupError('setup_blocked', 'Rolling planner returned invalid JSON.', String(caught)); }
    const parsed = RollingPlanWindowV2Schema.safeParse(value);
    if (!parsed.success) throw new FlagshipSetupError('setup_blocked', 'Rolling planner violated its typed contract.', parsed.error.issues);
    if (parsed.data.startChapter !== startChapter) throw new FlagshipSetupError('setup_blocked', 'Rolling planner changed requested window identity.');
    validateRollingPlanWindow(parsed.data, spec.data.pleasureProfile);
    const { error: commitError } = await db.rpc('commit_flagship_rolling_window_v2', { p_project_id: projectId, p_expected_current_chapter: startChapter - 1, p_window: parsed.data });
    if (commitError) throw new FlagshipSetupError('setup_blocked', `Could not commit rolling plans: ${commitError.message}`);
    await finishFlagshipSetupRun({ db, runId, status: 'saved', callRoles: ['rolling_planner'], artifact: parsed.data });
    return parsed.data;
  } catch (caught) {
    const failure = caught instanceof FlagshipSetupError ? caught : new FlagshipSetupError('setup_blocked', caught instanceof Error ? caught.message : String(caught));
    await finishFlagshipSetupRun({ db, runId, status: failure.code, callRoles: ['rolling_planner'], errorMessage: failure.message });
    throw failure;
  }
}
