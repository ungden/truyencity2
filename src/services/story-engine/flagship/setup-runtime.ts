import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { callGemini } from '../utils/gemini';
import { getSupabase } from '../utils/supabase';
import {
  ConceptTournamentArtifactV2Schema,
  FlagshipSetupBriefV2Schema,
  HumanConceptSelectionV2Schema,
} from './setup-contracts';
import {
  FlagshipSetupError,
  generateConceptTournamentV2,
  materializeFlagshipLaunchPackV2,
  type FlagshipSetupCall,
} from './setup';
import { finishFlagshipSetupRun, startFlagshipSetupRun } from './setup-ledger';
import { FLAGSHIP_SETUP_PROMPT_VERSION } from './setup-prompts';
import { FlagshipModelRoutesV2Schema, requireFlagshipModelRoutes, type FlagshipModelRoutesV2 } from './model-routes';

interface SetupProjectRow {
  id: string;
  status: string;
  current_chapter: number | null;
  style_directives: { pipeline_version?: string; flagship_model_routes?: unknown } | null;
  flagship_setup_brief_v2: unknown;
  flagship_concept_tournament_v2: unknown;
}

async function loadProject(db: SupabaseClient, projectId: string): Promise<SetupProjectRow> {
  const { data, error } = await db.from('ai_story_projects')
    .select('id,status,current_chapter,style_directives,flagship_setup_brief_v2,flagship_concept_tournament_v2')
    .eq('id', projectId).single();
  if (error || !data) throw new FlagshipSetupError('setup_blocked', error?.message || 'Flagship project not found.');
  const project = data as SetupProjectRow;
  if (project.style_directives?.pipeline_version !== 'flagship_v2') throw new FlagshipSetupError('setup_blocked', 'Project is not flagship_v2.');
  if (project.status !== 'paused' || Number(project.current_chapter || 0) !== 0) throw new FlagshipSetupError('setup_blocked', 'Flagship setup only runs manually on a paused, unwritten project.');
  requireFlagshipModelRoutes(project.style_directives);
  return project;
}

function modelInvoker(project: SetupProjectRow, projectId: string) {
  const routes = requireFlagshipModelRoutes(project.style_directives);
  return async (call: FlagshipSetupCall): Promise<string> => {
    try {
      const response = await callGemini(call.userPrompt, {
        model: call.role === 'concept_judge' ? routes.setupJudge : routes.setupCreative,
        temperature: call.role === 'opening_simulator' ? 0.7 : 0.35,
        maxTokens: ['concept_lab', 'concept_judge', 'opening_simulator', 'launch_architect'].includes(call.role) ? 32768 : 24576,
        thinkingLevel: call.role === 'concept_lab' ? 'low' : call.role === 'concept_judge' ? 'high' : 'medium',
        responseJsonSchema: call.responseJsonSchema,
        systemPrompt: call.systemPrompt,
      }, { jsonMode: true, disableRouting: true, tracking: { projectId, task: `flagship_setup_${call.role}` } });
      if (response.finishReason === 'MAX_TOKENS') {
        throw new FlagshipSetupError('infra_blocked', `${call.role} output hit the configured token ceiling before its typed artifact completed.`);
      }
      return response.content;
    } catch (error) {
      if (error instanceof FlagshipSetupError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (classifyStoryFailure(message) === 'infrastructure') throw new FlagshipSetupError('infra_blocked', message);
      throw new FlagshipSetupError('setup_blocked', `${call.role} failed without fallback: ${message}`);
    }
  };
}

async function markFailure(db: SupabaseClient, projectId: string, error: FlagshipSetupError): Promise<void> {
  await db.from('ai_story_projects').update({
    flagship_setup_status: error.code === 'infra_blocked' ? 'infra_blocked' : error.code === 'human_gate' ? 'concept_review' : 'setup_blocked',
    setup_stage_error: error.message.slice(0, 500),
    setup_stage_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', projectId);
}

export async function runFlagshipConceptTournamentForProject(
  projectId: string,
  dependencies: { db?: SupabaseClient; invoke?: (call: FlagshipSetupCall) => Promise<string> } = {},
) {
  const db = dependencies.db || getSupabase();
  let runId: string | null = null;
  let callRoles: string[] = [];
  try {
    const project = await loadProject(db, projectId);
    const brief = FlagshipSetupBriefV2Schema.safeParse(project.flagship_setup_brief_v2);
    if (!brief.success) throw new FlagshipSetupError('setup_blocked', 'FlagshipSetupBriefV2 missing or invalid.', brief.error.issues);
    const routes = requireFlagshipModelRoutes(project.style_directives);
    runId = await startFlagshipSetupRun({ db, projectId, phase: 'concept_tournament', model: routes.setupCreative, modelRoutes: routes, promptVersion: FLAGSHIP_SETUP_PROMPT_VERSION });
    await db.from('ai_story_projects').update({ flagship_setup_status: 'tournament_generating', updated_at: new Date().toISOString() }).eq('id', projectId);
    const baseInvoke = dependencies.invoke || modelInvoker(project, projectId);
    const result = await generateConceptTournamentV2(brief.data, { invoke: async call => { callRoles.push(call.role); return baseInvoke(call); } });
    const { error } = await db.rpc('save_flagship_concept_tournament_v2', { p_project_id: projectId, p_tournament: result.artifact });
    if (error) throw new FlagshipSetupError('setup_blocked', `Could not persist concept tournament: ${error.message}`);
    await finishFlagshipSetupRun({ db, runId, status: 'saved', callRoles, artifact: result.artifact });
    return result;
  } catch (caught) {
    const error = caught instanceof FlagshipSetupError ? caught : new FlagshipSetupError('setup_blocked', caught instanceof Error ? caught.message : String(caught));
    await markFailure(db, projectId, error);
    await finishFlagshipSetupRun({ db, runId, status: error.code, callRoles, errorMessage: error.message });
    throw error;
  }
}

export async function installFlagshipSetupBriefForProject(
  projectId: string,
  rawBrief: unknown,
  rawModelRoutes: unknown,
  db: SupabaseClient = getSupabase(),
): Promise<void> {
  const brief = FlagshipSetupBriefV2Schema.safeParse(rawBrief);
  if (!brief.success) throw new FlagshipSetupError('setup_blocked', 'FlagshipSetupBriefV2 is invalid.', brief.error.issues);
  const routes = FlagshipModelRoutesV2Schema.safeParse(rawModelRoutes);
  if (!routes.success) throw new FlagshipSetupError('setup_blocked', 'Explicit flagship model routes are invalid.', routes.error.issues);
  const { error } = await db.rpc('install_flagship_setup_brief_v2', { p_project_id: projectId, p_brief: brief.data, p_model_routes: routes.data });
  if (error) throw new FlagshipSetupError('setup_blocked', `Could not install flagship setup brief: ${error.message}`);
}

export async function materializeFlagshipSetupForProject(
  projectId: string,
  rawSelection: unknown,
  dependencies: { db?: SupabaseClient; invoke?: (call: FlagshipSetupCall) => Promise<string> } = {},
) {
  const db = dependencies.db || getSupabase();
  let runId: string | null = null;
  let callRoles: string[] = [];
  try {
    const project = await loadProject(db, projectId);
    const brief = FlagshipSetupBriefV2Schema.safeParse(project.flagship_setup_brief_v2);
    if (!brief.success) throw new FlagshipSetupError('setup_blocked', 'FlagshipSetupBriefV2 missing or invalid.', brief.error.issues);
    const tournament = ConceptTournamentArtifactV2Schema.safeParse(project.flagship_concept_tournament_v2);
    if (!tournament.success) throw new FlagshipSetupError('setup_blocked', 'ConceptTournamentArtifactV2 missing or invalid.', tournament.error.issues);
    const selection = HumanConceptSelectionV2Schema.safeParse(rawSelection);
    if (!selection.success) throw new FlagshipSetupError('human_gate', 'A typed human concept selection is required.', selection.error.issues);
    const routes = requireFlagshipModelRoutes(project.style_directives);
    runId = await startFlagshipSetupRun({ db, projectId, phase: 'launch_pack', model: routes.setupCreative, modelRoutes: routes, promptVersion: FLAGSHIP_SETUP_PROMPT_VERSION });
    await db.from('ai_story_projects').update({ flagship_setup_status: 'kernel_generating', updated_at: new Date().toISOString() }).eq('id', projectId);
    const baseInvoke = dependencies.invoke || modelInvoker(project, projectId);
    const result = await materializeFlagshipLaunchPackV2({ brief: brief.data, tournament: tournament.data, selection: selection.data }, { invoke: async call => { callRoles.push(call.role); return baseInvoke(call); } });
    const { error } = await db.rpc('commit_flagship_launch_pack_v2', {
      p_project_id: projectId,
      p_selection: selection.data,
      p_launch_pack: result.launchPack,
      p_foundation_score: result.foundationScore,
    });
    if (error) throw new FlagshipSetupError('setup_blocked', `Could not commit launch pack: ${error.message}`);
    await finishFlagshipSetupRun({ db, runId, status: 'saved', callRoles, artifact: result.launchPack });
    return result;
  } catch (caught) {
    const error = caught instanceof FlagshipSetupError ? caught : new FlagshipSetupError('setup_blocked', caught instanceof Error ? caught.message : String(caught));
    await markFailure(db, projectId, error);
    await finishFlagshipSetupRun({ db, runId, status: error.code, callRoles, errorMessage: error.message });
    throw error;
  }
}

export async function approveFlagshipStorySpecForProject(
  projectId: string,
  reviewerRef: string,
  evidence: unknown[] = [],
  db: SupabaseClient = getSupabase(),
): Promise<void> {
  if (reviewerRef.trim().length < 2) throw new FlagshipSetupError('human_gate', 'reviewerRef is required.');
  const { error } = await db.rpc('approve_flagship_story_spec_v2', { p_project_id: projectId, p_reviewer_ref: reviewerRef, p_evidence: evidence });
  if (error) throw new FlagshipSetupError('setup_blocked', `StorySpec approval failed: ${error.message}`);
}

export async function approveFlagshipCheckpointForProject(
  projectId: string,
  stage: 'chapter_3' | 'chapter_10' | 'chapter_30' | 'chapter_50',
  reviewerRef: string,
  review: { scores?: Record<string, number>; evidence?: unknown[] } = {},
  db: SupabaseClient = getSupabase(),
): Promise<void> {
  if (reviewerRef.trim().length < 2) throw new FlagshipSetupError('human_gate', 'reviewerRef is required.');
  const { error } = await db.rpc('approve_flagship_checkpoint_v2', {
    p_project_id: projectId,
    p_stage: stage,
    p_reviewer_ref: reviewerRef,
    p_scores: review.scores || {},
    p_evidence: review.evidence || [],
  });
  if (error) throw new FlagshipSetupError('human_gate', `Checkpoint approval failed: ${error.message}`);
}
