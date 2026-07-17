import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import { finishWriteRun, startWriteRun, updateWriteRunTelemetry, type WriteRunHandle } from '../pipeline/write-run-ledger';
import { callFlagshipModel } from '../flagship/provider';
import { toGeminiResponseJsonSchema } from '../flagship/setup-response-schemas';
import { getSupabase } from '../utils/supabase';
import { ArcPlanV3Schema, ChapterPlanV3Schema, StoryKernelV3Schema, StoryStateV3Schema, parseV3 } from './contracts';
import { buildV3RoleContexts } from './context';
import { requireFlagshipModelRoutesV3 } from './model-routes';
import {
  FlagshipV3Error,
  WriterOutputV3Schema,
  executeFlagshipV3Pipeline,
  type FlagshipV3ModelCall,
} from './pipeline';
import { FLAGSHIP_V3_PROMPT_VERSION } from './prompts';
import { QualityVerdictV3ModelSchema } from './quality';
import { applyChapterStateV3 } from './state-transition';

interface ProjectRowV3 {
  id: string;
  status: string;
  novel_id: string;
  current_chapter: number | null;
  target_chapter_length: number | null;
  temperature: number | null;
  style_directives: unknown;
  story_kernel_v3: unknown;
  arc_plan_v3: unknown;
  story_state_v3: unknown;
  flagship_v3_status: string | null;
  novels: { id: string; title: string } | Array<{ id: string; title: string }> | null;
}

export interface FlagshipV3WriteResult {
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

export interface FlagshipV3WriteOptions {
  projectId: string;
  temperature?: number;
  targetWordCount?: number;
}

const linkedNovel = (project: ProjectRowV3): { id: string; title: string } | null =>
  Array.isArray(project.novels) ? project.novels[0] || null : project.novels;

const wordCount = (content: string): number => content.trim().split(/\s+/).filter(Boolean).length;

function parseRequired<T>(label: string, schema: Parameters<typeof parseV3<T>>[0], value: unknown): T {
  const parsed = parseV3(schema, value);
  if (!parsed.success) throw new FlagshipV3Error('setup_blocked', `${label} is missing or invalid.`, parsed.issues);
  return parsed.data;
}

function failureDetail(error: FlagshipV3Error): {
  verdict: unknown;
  evidence: unknown[];
  revisionLineage: unknown[];
  draft: { title?: string; content?: string } | null;
} {
  const detail = error.detail && typeof error.detail === 'object' ? error.detail as Record<string, unknown> : {};
  const verdict = detail.verdict && typeof detail.verdict === 'object' ? detail.verdict : {};
  const verdictRecord = verdict as Record<string, unknown>;
  return {
    verdict,
    evidence: Array.isArray(verdictRecord.evidence) ? verdictRecord.evidence : [],
    revisionLineage: Array.isArray(detail.revisionLineage) ? detail.revisionLineage : [],
    draft: detail.draft && typeof detail.draft === 'object' ? detail.draft as { title?: string; content?: string } : null,
  };
}

async function finishAttempt(
  db: SupabaseClient,
  attemptId: string | null,
  input: {
    status: 'published' | 'quality_blocked' | 'plan_blocked' | 'setup_blocked' | 'infra_blocked' | 'commit_failed';
    title?: string | null;
    content?: string | null;
    verdict?: unknown;
    evidence?: unknown[];
    revisionLineage?: unknown[];
    errorMessage?: string | null;
    estimatedCostUsd?: number;
  },
): Promise<void> {
  if (!attemptId) return;
  const { error } = await db.from('story_chapter_attempts').update({
    status: input.status,
    draft_title: input.title || null,
    draft_content: input.content || null,
    quality_verdict: input.verdict || {},
    editor_evidence: input.evidence || [],
    revision_lineage: input.revisionLineage || [],
    error_message: input.errorMessage ? input.errorMessage.slice(0, 2000) : null,
    estimated_cost_usd: input.estimatedCostUsd || 0,
    finished_at: new Date().toISOString(),
  }).eq('id', attemptId);
  if (error) throw new FlagshipV3Error('commit_failed', `Could not finish immutable chapter attempt: ${error.message}`);
}

async function finishFailure(
  db: SupabaseClient,
  run: WriteRunHandle | null,
  attemptId: string | null,
  error: FlagshipV3Error,
  contextSize: number,
  estimatedCostUsd: number,
): Promise<void> {
  const details = failureDetail(error);
  const runStatus = error.code === 'infra_blocked' ? 'infra_blocked'
    : error.code === 'quality_blocked' ? 'quality_rejected'
      : 'failed';
  const failureClass = error.code === 'infra_blocked' ? 'infrastructure'
    : error.code === 'quality_blocked' ? 'quality'
      : 'setup';
  await finishWriteRun(run, runStatus, {
    contextSizeChars: contextSize,
    errorMessage: error.message,
    estimatedCostUsd,
    failureClass,
    publicationDecision: error.code === 'quality_blocked' ? 'reject' : null,
    criticEvidence: details.evidence,
    revisionLineage: details.revisionLineage,
    qualityVerdict: details.verdict,
  });
  await finishAttempt(db, attemptId, {
    status: error.code === 'quality_blocked' ? 'quality_blocked'
      : error.code === 'plan_blocked' ? 'plan_blocked'
        : error.code === 'infra_blocked' ? 'infra_blocked'
          : error.code === 'commit_failed' ? 'commit_failed'
            : 'setup_blocked',
    title: details.draft?.title,
    content: details.draft?.content,
    verdict: details.verdict,
    evidence: details.evidence,
    revisionLineage: details.revisionLineage,
    errorMessage: error.message,
    estimatedCostUsd,
  });
}

export async function writeFlagshipV3Chapter(
  options: FlagshipV3WriteOptions,
  dependencies: { db?: SupabaseClient; invoke?: (call: FlagshipV3ModelCall) => Promise<string> } = {},
): Promise<FlagshipV3WriteResult> {
  const startedAt = Date.now();
  const db = dependencies.db || getSupabase();
  const { data, error } = await db.from('ai_story_projects')
    .select('id,status,novel_id,current_chapter,target_chapter_length,temperature,style_directives,story_kernel_v3,arc_plan_v3,story_state_v3,flagship_v3_status,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', options.projectId)
    .single();
  if (error || !data) throw new FlagshipV3Error('setup_blocked', error?.message || 'Flagship v3 project not found.');
  const project = data as unknown as ProjectRowV3;
  const style = project.style_directives as { pipeline_version?: string } | null;
  if (style?.pipeline_version !== 'flagship_v3') throw new FlagshipV3Error('setup_blocked', 'Project is not flagship_v3.');
  if (project.status !== 'paused') throw new FlagshipV3Error('setup_blocked', 'Flagship v3 keeps project status paused; the factory job owns production state.');
  if (project.flagship_v3_status !== 'ready_to_write') throw new FlagshipV3Error('setup_blocked', 'Flagship v3 setup is not approved.');
  const novel = linkedNovel(project);
  if (!novel) throw new FlagshipV3Error('setup_blocked', 'Project has no linked novel.');
  const routes = requireFlagshipModelRoutesV3(project.style_directives);
  const kernel = parseRequired('StoryKernelV3', StoryKernelV3Schema, project.story_kernel_v3);
  const arc = parseRequired('ArcPlanV3', ArcPlanV3Schema, project.arc_plan_v3);
  const state = parseRequired('StoryStateV3', StoryStateV3Schema, project.story_state_v3);
  const nextChapter = Number(project.current_chapter || 0) + 1;
  if (state.chapterNumber !== nextChapter - 1) throw new FlagshipV3Error('setup_blocked', 'StoryStateV3 does not match current_chapter.');
  const targetWordCount = options.targetWordCount || project.target_chapter_length;
  if (!targetWordCount || targetWordCount < 1000) throw new FlagshipV3Error('setup_blocked', 'Flagship v3 requires target_chapter_length >= 1000.');

  const { data: blueprint, error: blueprintError } = await db.from('chapter_blueprints')
    .select('meta').eq('project_id', project.id).eq('chapter_number', nextChapter).maybeSingle();
  if (blueprintError) throw new FlagshipV3Error('plan_blocked', `ChapterPlanV3 lookup failed: ${blueprintError.message}`);
  const plan = parseRequired(
    'ChapterPlanV3',
    ChapterPlanV3Schema,
    (blueprint?.meta as { chapterPlanV3?: unknown } | null)?.chapterPlanV3,
  );
  const contexts = buildV3RoleContexts({ kernel, arc, state, plan });
  let contextManifest = contexts.used().flatMap(context => context.manifest);
  let contextSize = contexts.used().reduce((sum, context) => sum + context.chars, 0);
  let run: WriteRunHandle | null = null;
  let attemptId: string | null = null;
  let estimatedCostUsd = 0;

  try {
    run = await startWriteRun({
      projectId: project.id,
      novelId: novel.id,
      chapterNumber: nextChapter,
      model: routes.writer,
      targetWordCount,
      pipelineVersion: 'flagship_v3',
      promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
      modelRoute: routes,
      contextManifest,
      contextSizeChars: contextSize,
      required: true,
    });
    if (!run) throw new FlagshipV3Error('setup_blocked', 'Required write-run telemetry was not created.');
    attemptId = randomUUID();
    const { error: attemptError } = await db.from('story_chapter_attempts').insert({
      id: attemptId,
      run_id: run.id,
      project_id: project.id,
      novel_id: novel.id,
      chapter_number: nextChapter,
      attempt_no: await latestAttemptNumber(db, project.id, nextChapter),
      pipeline_version: 'flagship_v3',
      status: 'running',
      prompt_version: FLAGSHIP_V3_PROMPT_VERSION,
      model_route: routes,
      context_manifest: contextManifest,
      estimated_cost_usd: 0,
    });
    if (attemptError) throw new FlagshipV3Error('setup_blocked', `Could not create immutable chapter attempt: ${attemptError.message}`);
    await updateWriteRunTelemetry(run, {
      contextSizeChars: contextSize,
      contextManifest,
      promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
      modelRoute: routes,
    });

    const invoke = dependencies.invoke || (async (call: FlagshipV3ModelCall): Promise<string> => {
      const model = call.role === 'writer' || call.role === 'writer_revision' ? routes.writer : routes.editor;
      const responseSchema = call.role === 'writer' || call.role === 'writer_revision'
        ? toGeminiResponseJsonSchema(WriterOutputV3Schema)
        : toGeminiResponseJsonSchema(QualityVerdictV3ModelSchema);
      const response = await callFlagshipModel(call.userPrompt, {
        model,
        temperature: call.role === 'writer' || call.role === 'writer_revision'
          ? (options.temperature ?? project.temperature ?? 0.75)
          : 0.15,
        maxTokens: call.role === 'writer' || call.role === 'writer_revision' ? 32768 : 16384,
        systemPrompt: call.systemPrompt,
        responseJsonSchema: responseSchema,
      }, {
        jsonMode: true,
        schemaName: `flagship_v3_${call.role}`,
        tracking: { projectId: project.id, chapterNumber: nextChapter, task: `flagship_v3_${call.role}` },
      });
      if (!Number.isFinite(response.estimatedCostUsd)) {
        throw new FlagshipV3Error('infra_blocked', `Provider did not return a cost estimate for ${model}.`);
      }
      estimatedCostUsd += Number(response.estimatedCostUsd);
      if (estimatedCostUsd > routes.maxPublishedChapterCostUsd) {
        throw new FlagshipV3Error(
          'infra_blocked',
          `COST_CAP_BLOCKED: estimated $${estimatedCostUsd.toFixed(4)} exceeds route cap $${routes.maxPublishedChapterCostUsd.toFixed(4)}.`,
          { estimatedCostUsd, capUsd: routes.maxPublishedChapterCostUsd },
        );
      }
      return response.content;
    });

    let generated;
    try {
      generated = await executeFlagshipV3Pipeline({
        kernel,
        arc,
        state,
        plan,
        targetWordCount,
        contexts,
      }, { invoke });
      contextManifest = contexts.used().flatMap(context => context.manifest);
      contextSize = contexts.used().reduce((sum, context) => sum + context.chars, 0);
      await updateWriteRunTelemetry(run, {
        contextSizeChars: contextSize,
        contextManifest,
        promptVersion: FLAGSHIP_V3_PROMPT_VERSION,
        modelRoute: routes,
      });
    } catch (caught) {
      if (caught instanceof FlagshipV3Error) throw caught;
      const message = caught instanceof Error ? caught.message : String(caught);
      const failure = classifyStoryFailure(message);
      throw new FlagshipV3Error(failure === 'infrastructure' ? 'infra_blocked' : 'quality_blocked', message);
    }

    const nextState = applyChapterStateV3({
      state,
      plan,
      title: generated.title,
      content: generated.content,
      realizedDeltaIds: generated.verdict.realizedDeltaEvidence.map(item => item.deltaId),
    });
    const { error: commitError } = await db.rpc('commit_flagship_chapter_v3', {
      p_project_id: project.id,
      p_novel_id: novel.id,
      p_expected_current_chapter: nextChapter - 1,
      p_chapter_number: nextChapter,
      p_title: generated.title,
      p_content: generated.content,
      p_quality_score: generated.verdict.weightedMean,
      p_story_state: nextState,
      p_run_id: run.id,
      p_attempt_id: attemptId,
      p_context_manifest: contextManifest,
      p_editor_evidence: generated.verdict.evidence,
      p_realized_delta_evidence: generated.verdict.realizedDeltaEvidence,
      p_revision_lineage: generated.revisionLineage,
      p_quality_verdict: generated.verdict,
      p_prompt_version: FLAGSHIP_V3_PROMPT_VERSION,
      p_model_route: routes,
      p_estimated_cost_usd: estimatedCostUsd,
    });
    if (commitError) throw new FlagshipV3Error('commit_failed', commitError.message);

    return {
      chapterNumber: nextChapter,
      title: generated.title,
      wordCount: wordCount(generated.content),
      qualityScore: generated.verdict.weightedMean,
      projectId: project.id,
      novelId: novel.id,
      duration: Date.now() - startedAt,
      chaptersCreated: 1,
      lastChapterNumber: nextChapter,
    };
  } catch (caught) {
    const error = caught instanceof FlagshipV3Error
      ? caught
      : new FlagshipV3Error(
        classifyStoryFailure(caught instanceof Error ? caught.message : String(caught)) === 'infrastructure' ? 'infra_blocked' : 'setup_blocked',
        caught instanceof Error ? caught.message : String(caught),
      );
    await finishFailure(db, run, attemptId, error, contextSize, estimatedCostUsd);
    throw error;
  }
}

async function latestAttemptNumber(db: SupabaseClient, projectId: string, chapterNumber: number): Promise<number> {
  const { data, error } = await db.from('story_chapter_attempts').select('attempt_no')
    .eq('project_id', projectId).eq('chapter_number', chapterNumber)
    .order('attempt_no', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new FlagshipV3Error('setup_blocked', `Attempt sequence lookup failed: ${error.message}`);
  return Number(data?.attempt_no || 0) + 1;
}
