import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { getSupabase } from '../utils/supabase';
import { parseArcPlanV2, parseStorySpecV2, parseStoryStateV2, ArcPlanV2Schema, type ArcPlanV2 } from './contracts';
import { FlagshipSetupError } from './setup';
import { requireFlagshipModelRoutes } from './model-routes';
import { callFlagshipModel } from './provider';
import { toGeminiResponseJsonSchema } from './setup-response-schemas';

export const FLAGSHIP_ARC_PLANNER_PROMPT_VERSION = 'flagship-arc-planner-v2.0';
const SYSTEM = `Bạn là Arc Director của đúng một bộ truyện flagship.
Mở một arc mới nối nhân quả với StoryState đã commit và arc vừa kết thúc. Giữ nguyên kernel, cast, resource economy và promise ledger; không tạo sức mạnh hay tài sản ngoài source of truth.
Arc dài 20-30 chương, có xung đột tăng dần, lựa chọn phải trả giá và terminal change rõ ràng. Chỉ trả JSON đúng ArcPlanV2, không outline từng chương.`;

function prompt(input: { spec: unknown; state: unknown; previousArc: unknown; startChapter: number }): string {
  return `STORY_KERNEL=${JSON.stringify(input.spec)}\nCOMMITTED_STATE=${JSON.stringify(input.state)}\nPREVIOUS_ARC=${JSON.stringify(input.previousArc)}\nSTART_CHAPTER=${input.startChapter}\nOUTPUT_CONTRACT=${JSON.stringify({ schemaVersion: 2, arcId: 'arc_slug', startChapter: input.startChapter, endChapter: input.startChapter + 24, direction: '...', terminalChange: '...', activeConflicts: [{ actor: '...', objective: '...', leverage: '...', nextMove: '...' }], duePromises: [], rollingBeats: [{ chapterRange: `${input.startChapter}-${input.startChapter + 9}`, pressure: '...', causalChange: '...' }] })}`;
}

export async function extendFlagshipArcForFactory(
  projectId: string,
  dependencies: { db?: SupabaseClient; invoke?: (systemPrompt: string, userPrompt: string) => Promise<string> } = {},
): Promise<ArcPlanV2> {
  const db = dependencies.db || getSupabase();
  const { data, error } = await db.from('ai_story_projects').select('id,status,current_chapter,style_directives,story_spec_v2,story_state_v2,arc_plan_v2,flagship_setup_status').eq('id', projectId).single();
  if (error || !data) throw new FlagshipSetupError('setup_blocked', error?.message || 'Factory project not found.');
  const style = data.style_directives as Record<string, unknown> | null;
  if (style?.pipeline_version !== 'flagship_v2' || style.publication_mode !== 'automatic' || style.factory_enabled !== true) throw new FlagshipSetupError('setup_blocked', 'Arc extension requires explicit factory opt-in.');
  if (data.status !== 'paused' || data.flagship_setup_status !== 'ready_to_write') throw new FlagshipSetupError('setup_blocked', 'Arc extension requires a paused ready flagship project.');
  const spec = parseStorySpecV2(data.story_spec_v2);
  const state = parseStoryStateV2(data.story_state_v2);
  const previous = parseArcPlanV2(data.arc_plan_v2);
  if (!spec.success || !state.success || !previous.success) throw new FlagshipSetupError('setup_blocked', 'StorySpecV2, StoryStateV2 and ArcPlanV2 are required for arc extension.');
  const startChapter = Number(data.current_chapter || 0) + 1;
  const routes = requireFlagshipModelRoutes(style);
  let raw: string;
  try {
    raw = dependencies.invoke
      ? await dependencies.invoke(SYSTEM, prompt({ spec: spec.data, state: state.data, previousArc: previous.data, startChapter }))
      : (await callFlagshipModel(prompt({ spec: spec.data, state: state.data, previousArc: previous.data, startChapter }), {
        model: routes.planner,
        temperature: 0.25,
        maxTokens: 16384,
        systemPrompt: SYSTEM,
        responseJsonSchema: toGeminiResponseJsonSchema(ArcPlanV2Schema),
      }, { jsonMode: true, schemaName: 'flagship_arc_extension', tracking: { projectId, chapterNumber: startChapter, task: 'flagship_arc_extension' } })).content;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    throw new FlagshipSetupError(classifyStoryFailure(message) === 'infrastructure' ? 'infra_blocked' : 'setup_blocked', message);
  }
  let parsed: ArcPlanV2;
  try {
    const value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    const result = ArcPlanV2Schema.safeParse(value);
    if (!result.success) throw new FlagshipSetupError('setup_blocked', 'Arc Director violated ArcPlanV2.', result.error.issues);
    parsed = result.data;
  } catch (caught) {
    if (caught instanceof FlagshipSetupError) throw caught;
    throw new FlagshipSetupError('setup_blocked', `Arc Director returned invalid JSON: ${caught instanceof Error ? caught.message : String(caught)}`);
  }
  if (parsed.startChapter !== startChapter || parsed.endChapter < startChapter + 4 || parsed.endChapter > startChapter + 29) throw new FlagshipSetupError('setup_blocked', 'Arc Director returned a non-contiguous or oversized arc.');
  const { error: commitError } = await db.rpc('commit_flagship_arc_v2', { p_project_id: projectId, p_expected_current_chapter: startChapter - 1, p_arc_plan: parsed });
  if (commitError) throw new FlagshipSetupError('setup_blocked', `Could not commit autonomous arc: ${commitError.message}`);
  return parsed;
}
