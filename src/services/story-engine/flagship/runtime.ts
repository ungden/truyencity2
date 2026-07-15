import type { SupabaseClient } from '@supabase/supabase-js';
import { finishWriteRun, startWriteRun, updateWriteRunTelemetry, type WriteRunHandle } from '../pipeline/write-run-ledger';
import type { StyleDirectives } from '../types';
import { callGemini } from '../utils/gemini';
import { getSupabase } from '../utils/supabase';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { assembleFlagshipRoleContexts } from './context';
import {
  parseArcPlanV2,
  parseChapterPlanV2,
  parseStorySpecV2,
  parseStoryStateV2,
} from './contracts';
import { executeFlagshipPipeline, FlagshipPipelineError, type FlagshipModelCall } from './pipeline';
import { canPublishFlagshipChapter } from './policy';
import { FLAGSHIP_PROMPT_VERSION } from './prompts';
import { applyChapterStateDelta } from './state-transition';
import { requireFlagshipModelRoutes } from './model-routes';

interface FlagshipProjectRow {
  id: string;
  status: string;
  novel_id: string;
  current_chapter: number | null;
  target_chapter_length: number | null;
  temperature: number | null;
  style_directives: StyleDirectives | null;
  story_spec_v2: unknown;
  arc_plan_v2: unknown;
  story_state_v2: unknown;
  flagship_setup_status: string | null;
  novels: { id: string; title: string } | Array<{ id: string; title: string }> | null;
}

export interface FlagshipWriteResult {
  chapterNumber: number;
  title: string;
  wordCount: number;
  qualityScore: number;
  projectId: string;
  novelId: string;
  duration: number;
  chaptersCreated: 1;
  lastChapterNumber: number;
}

export interface FlagshipWriteOptions {
  projectId: string;
  temperature?: number;
  targetWordCount?: number;
  model?: string;
}

function issues(label: string, parsed: { success: false; issues: Array<{ path: string; message: string }> }): FlagshipPipelineError {
  return new FlagshipPipelineError('setup_blocked', `${label} invalid: ${parsed.issues.map(issue => `${issue.path}:${issue.message}`).join('; ')}`);
}

function linkedNovel(project: FlagshipProjectRow): { id: string; title: string } | null {
  return Array.isArray(project.novels) ? project.novels[0] || null : project.novels;
}

function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

async function finishFailure(run: WriteRunHandle | null, error: FlagshipPipelineError, contextSize = 0): Promise<void> {
  const status = error.code === 'infra_blocked' ? 'infra_blocked'
    : error.code === 'quality_rejected' ? 'quality_rejected'
      : error.code === 'human_gate' ? 'human_gate'
        : 'failed';
  const failureClass = error.code === 'infra_blocked' ? 'infrastructure'
    : error.code === 'quality_rejected' || error.code === 'human_gate' ? 'quality'
      : error.code === 'setup_blocked' ? 'setup'
        : 'unknown';
  await finishWriteRun(run, status, {
    contextSizeChars: contextSize,
    errorMessage: error.message,
    failureClass,
    publicationDecision: error.code === 'human_gate' ? 'human_gate' : error.code === 'quality_rejected' ? 'reject' : null,
  });
}

export async function writeFlagshipChapter(
  options: FlagshipWriteOptions,
  dependencies: { db?: SupabaseClient; invoke?: (call: FlagshipModelCall) => Promise<string> } = {},
): Promise<FlagshipWriteResult> {
  const startedAt = Date.now();
  const db = dependencies.db || getSupabase();
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,status,novel_id,current_chapter,target_chapter_length,temperature,style_directives,story_spec_v2,arc_plan_v2,story_state_v2,flagship_setup_status,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', options.projectId)
    .single();
  if (error || !data) throw new FlagshipPipelineError('setup_blocked', error?.message || 'Flagship project not found.');

  const project = data as unknown as FlagshipProjectRow;
  if (project.style_directives?.pipeline_version !== 'flagship_v2') {
    throw new FlagshipPipelineError('setup_blocked', 'Project is not marked flagship_v2.');
  }
  if (project.flagship_setup_status !== 'ready_to_write') {
    throw new FlagshipPipelineError('setup_blocked', `Flagship setup is ${project.flagship_setup_status || 'missing'}, expected ready_to_write.`);
  }
  const autonomousFactory = project.style_directives?.publication_mode === 'automatic'
    && project.style_directives.factory_enabled === true;
  if (project.status !== 'paused' && !(autonomousFactory && project.status === 'active')) {
    throw new FlagshipPipelineError('setup_blocked', autonomousFactory
      ? 'Autonomous flagship factory requires project status=active or paused.'
      : 'Flagship manual write requires project status=paused.');
  }
  const novel = linkedNovel(project);
  if (!novel) throw new FlagshipPipelineError('setup_blocked', 'Project has no linked novel.');
  const nextChapter = Number(project.current_chapter || 0) + 1;
  let modelRoutes;
  try { modelRoutes = requireFlagshipModelRoutes(project.style_directives); }
  catch (caught) { throw new FlagshipPipelineError('setup_blocked', caught instanceof Error ? caught.message : String(caught)); }
  const targetWordCount = options.targetWordCount || project.target_chapter_length;
  if (!targetWordCount || targetWordCount < 1000) throw new FlagshipPipelineError('setup_blocked', 'Flagship requires an explicit target_chapter_length of at least 1000 words.');
  let run: WriteRunHandle | null = null;
  let contextSize = 0;

  try {
    run = await startWriteRun({
      projectId: project.id,
      novelId: novel.id,
      chapterNumber: nextChapter,
      model: modelRoutes.writer,
      targetWordCount,
      pipelineVersion: 'flagship_v2',
      promptVersion: FLAGSHIP_PROMPT_VERSION,
      modelRoute: modelRoutes,
      required: true,
    });
    if (!run) throw new FlagshipPipelineError('setup_blocked', 'Required write-run telemetry was not created.');

    const spec = parseStorySpecV2(project.story_spec_v2);
    if (!spec.success) throw issues('StorySpecV2', spec);
    const arc = parseArcPlanV2(project.arc_plan_v2);
    if (!arc.success) throw issues('ArcPlanV2', arc);
    const state = parseStoryStateV2(project.story_state_v2);
    if (!state.success) throw issues('StoryStateV2', state);
    if (state.data.chapterNumber !== Number(project.current_chapter || 0)) {
      throw new FlagshipPipelineError('setup_blocked', `StoryState chapter ${state.data.chapterNumber} does not match project current_chapter ${project.current_chapter || 0}.`);
    }
    const stateCast = new Set(state.data.cast.map(item => item.name));
    const missingCast = [spec.data.protagonist.name, ...spec.data.cast.map(item => item.name)].filter(name => !stateCast.has(name));
    const stateResources = new Set(state.data.resources.map(item => item.resource));
    const missingResources = spec.data.resourceEconomy.map(item => item.resource).filter(name => !stateResources.has(name));
    const statePromises = new Set(state.data.promises.map(item => item.id));
    const missingPromises = spec.data.promisePayoffLedger.map(item => item.id).filter(id => !statePromises.has(id));
    if (missingCast.length || missingResources.length || missingPromises.length) {
      throw new FlagshipPipelineError('setup_blocked', 'StoryStateV2 does not cover its own StorySpecV2.', { missingCast, missingResources, missingPromises });
    }
    if (nextChapter < arc.data.startChapter || nextChapter > arc.data.endChapter) {
      throw new FlagshipPipelineError('setup_blocked', `ArcPlanV2 does not cover chapter ${nextChapter}.`);
    }

    const { data: blueprint, error: blueprintError } = await db
      .from('chapter_blueprints')
      .select('meta')
      .eq('project_id', project.id)
      .eq('chapter_number', nextChapter)
      .maybeSingle();
    if (blueprintError) throw new FlagshipPipelineError('setup_blocked', `ChapterPlan lookup failed: ${blueprintError.message}`);
    const preparedPlan = parseChapterPlanV2((blueprint?.meta as { chapterPlanV2?: unknown } | null)?.chapterPlanV2);
    if (!preparedPlan.success) throw issues('ChapterPlanV2', preparedPlan);

    const voiceContract = {
      storyIdentity: spec.data.storyIdentity,
      pleasureProfile: spec.data.pleasureProfile,
      readerFantasy: spec.data.readerFantasy,
      premise: spec.data.premise,
      protagonist: spec.data.protagonist,
      cast: spec.data.cast,
      causalWorldRules: spec.data.causalWorldRules,
      resourceEconomy: spec.data.resourceEconomy,
    };
    // Keep Writer/Editor focused on the current window.  Long-range history
    // remains in StoryStateV2 for the Director, while only the recent delta
    // and the committed ending are sent to prose-oriented roles.
    const relevantState = {
      ...state.data,
      timeline: state.data.timeline.slice(-12),
      retrievalNotes: state.data.retrievalNotes.slice(-4),
    };
    // Each role receives only its own bounded context.  The same bundle is
    // never handed to all three calls, so budgets are enforceable in practice
    // and editor/revision instructions cannot leak into Writer input.
    const roleContexts = assembleFlagshipRoleContexts({
      director: [
        { id: 'story-spec-v2', layer: 'canon', priority: 100, required: true, content: JSON.stringify(spec.data), sourceRef: 'ai_story_projects.story_spec_v2' },
        { id: 'arc-plan-v2', layer: 'plan', priority: 100, required: true, content: JSON.stringify(arc.data), sourceRef: 'ai_story_projects.arc_plan_v2' },
        { id: 'chapter-plan-v2', layer: 'plan', priority: 95, required: true, content: JSON.stringify(preparedPlan.data), sourceRef: `chapter_blueprints:${nextChapter}` },
        { id: 'story-state-v2', layer: 'state', priority: 100, required: true, content: JSON.stringify(state.data), sourceRef: 'ai_story_projects.story_state_v2' },
      ],
      writer: [
        { id: 'voice-contract-v2', layer: 'canon', priority: 100, required: true, content: JSON.stringify(voiceContract), sourceRef: 'ai_story_projects.story_spec_v2:voice' },
        { id: 'chapter-plan-v2', layer: 'plan', priority: 100, required: true, content: JSON.stringify(preparedPlan.data), sourceRef: `chapter_blueprints:${nextChapter}` },
        { id: 'relevant-state-v2', layer: 'state', priority: 100, required: true, content: JSON.stringify(relevantState), sourceRef: 'ai_story_projects.story_state_v2:recent' },
      ],
      editor: [
        { id: 'editor-canon-v2', layer: 'canon', priority: 100, required: true, content: JSON.stringify({ protagonist: spec.data.protagonist, cast: spec.data.cast, rules: spec.data.causalWorldRules, economy: spec.data.resourceEconomy, pleasureProfile: spec.data.pleasureProfile }), sourceRef: 'ai_story_projects.story_spec_v2:editor' },
        { id: 'chapter-plan-v2', layer: 'plan', priority: 100, required: true, content: JSON.stringify(preparedPlan.data), sourceRef: `chapter_blueprints:${nextChapter}` },
        { id: 'relevant-state-v2', layer: 'state', priority: 100, required: true, content: JSON.stringify(relevantState), sourceRef: 'ai_story_projects.story_state_v2:recent' },
      ],
    });
    contextSize = roleContexts.totalChars;
    await updateWriteRunTelemetry(run, {
      contextSizeChars: roleContexts.totalChars,
      contextManifest: roleContexts.manifest,
      promptVersion: FLAGSHIP_PROMPT_VERSION,
      modelRoute: modelRoutes,
    });

    const invoke = dependencies.invoke || (async (call: FlagshipModelCall) => {
      const model = call.role === 'writer' || call.role === 'writer_revision' ? modelRoutes.writer
        : call.role === 'editor' ? modelRoutes.editor : modelRoutes.director;
      const response = await callGemini(call.userPrompt, {
        model,
        temperature: call.role === 'writer' || call.role === 'writer_revision' ? (options.temperature ?? project.temperature ?? 0.8) : 0.2,
        maxTokens: call.role === 'writer' || call.role === 'writer_revision' ? 32768 : 16384,
        systemPrompt: call.systemPrompt,
      }, { jsonMode: true, disableRouting: true, tracking: { projectId: project.id, chapterNumber: nextChapter, task: `flagship_${call.role}` } });
      return response.content;
    });

    let generated;
    try {
      generated = await executeFlagshipPipeline({
        storySpec: spec.data,
        arcPlan: arc.data,
      storyState: state.data,
      preparedPlan: preparedPlan.data,
      targetWordCount,
      roleContexts,
    }, { invoke });
    } catch (modelError) {
      if (modelError instanceof FlagshipPipelineError) throw modelError;
      const message = modelError instanceof Error ? modelError.message : String(modelError);
      if (classifyStoryFailure(message) === 'infrastructure') throw new FlagshipPipelineError('infra_blocked', message);
      throw new FlagshipPipelineError('quality_rejected', message);
    }

    const publication = canPublishFlagshipChapter({ verdict: generated.verdict, chapterNumber: nextChapter, style: project.style_directives });
    if (!publication.allowed) throw new FlagshipPipelineError('human_gate', publication.reason, generated.verdict);

    const nextState = applyChapterStateDelta({ state: state.data, plan: generated.chapterPlan, title: generated.title, content: generated.content });
    const qualityScore = Math.min(...Object.values(generated.verdict.axes));
    const { error: commitError } = await db.rpc('commit_flagship_chapter_v2', {
      p_project_id: project.id,
      p_novel_id: novel.id,
      p_expected_current_chapter: Number(project.current_chapter || 0),
      p_chapter_number: nextChapter,
      p_title: generated.title,
      p_content: generated.content,
      p_quality_score: qualityScore,
      p_story_state: nextState,
      p_cast_ledger: nextState.cast.filter(character => generated.content.includes(character.name)),
      p_resource_ledger: nextState.resources,
      p_promise_ledger: nextState.promises,
      p_run_id: run.id,
      p_context_manifest: roleContexts.manifest,
      p_editor_evidence: generated.editorEvidence,
      p_revision_lineage: generated.revisionLineage,
      p_prompt_version: FLAGSHIP_PROMPT_VERSION,
      p_model_route: modelRoutes,
    });
    if (commitError) throw new FlagshipPipelineError('commit_failed', commitError.message);

    // Close the run only after the canon RPC has committed. This records the
    // publication decision and evidence for checkpoint/telemetry consumers
    // without changing prose or state.
    await finishWriteRun(run, 'saved', {
      lastChapterNumber: nextChapter,
      qualityScore,
      contextSizeChars: contextSize,
      publicationDecision: 'publish',
      criticEvidence: generated.editorEvidence,
      revisionLineage: generated.revisionLineage,
    });

    return {
      chapterNumber: nextChapter,
      title: generated.title,
      wordCount: wordCount(generated.content),
      qualityScore,
      projectId: project.id,
      novelId: novel.id,
      duration: Date.now() - startedAt,
      chaptersCreated: 1,
      lastChapterNumber: nextChapter,
    };
  } catch (caught) {
    const error = caught instanceof FlagshipPipelineError
      ? caught
      : new FlagshipPipelineError(classifyStoryFailure(caught instanceof Error ? caught.message : String(caught)) === 'infrastructure' ? 'infra_blocked' : 'setup_blocked', caught instanceof Error ? caught.message : String(caught));
    await finishFailure(run, error, contextSize);
    throw error;
  }
}
