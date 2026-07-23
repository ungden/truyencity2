import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_MODEL_ROUTES,
  type ChapterPlan,
  type ModelRoutes,
  type ProviderUsage,
  planRollingWindow,
  writeStoryChapter,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

function sumCost(usages: ProviderUsage[]): number {
  return usages.reduce((total, usage) => total + usage.costUsd, 0);
}

function usageSummary(usages: ProviderUsage[]) {
  return usages.map(usage => ({
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: Number(usage.costUsd.toFixed(6)),
    finishReason: usage.finishReason,
  }));
}

async function loadJob(jobId: string) {
  const jobResult = await db.from('story_factory_jobs')
    .select('id,project_id,novel_id,current_chapter')
    .eq('id', jobId)
    .single();
  if (jobResult.error) throw jobResult.error;
  const job = jobResult.data;
  const projectResult = await db.from('ai_story_projects')
    .select('story_kernel,arc_plan,story_state,model_routes')
    .eq('id', job.project_id)
    .single();
  if (projectResult.error) throw projectResult.error;
  const previousChapterNumber = Math.max(1, job.current_chapter);
  const previousResult = await db.from('chapters')
    .select('content')
    .eq('novel_id', job.novel_id)
    .eq('chapter_number', previousChapterNumber)
    .single();
  if (previousResult.error) throw previousResult.error;
  return { job, project: projectResult.data, previousChapter: previousResult.data.content };
}

async function main() {
  const jobId = value('--job-id');
  if (!jobId) throw new Error('Usage: factory:model-bakeoff -- --job-id <uuid>');
  const flashModel = value('--flash-model') || 'gemini-3.6-flash';
  const editorBaseline = value('--editor-baseline') || 'gemini-2.5-pro';
  const writerBaseline = value('--writer-baseline') || DEFAULT_MODEL_ROUTES.writer;
  const plannerBaseline = value('--planner-baseline') || DEFAULT_MODEL_ROUTES.planner;
  const { job, project, previousChapter } = await loadJob(jobId);
  const baseRoutes = { ...DEFAULT_MODEL_ROUTES, ...(project.model_routes as ModelRoutes) };

  const plannerRoutes = [
    { label: 'baseline_planner', model: plannerBaseline },
    { label: 'flash_planner', model: flashModel },
  ];
  const planResults: Array<{
    label: string;
    model: string;
    ok: boolean;
    plan?: ChapterPlan;
    chapters?: number;
    costUsd?: number;
    usages?: ReturnType<typeof usageSummary>;
    error?: string;
  }> = [];

  for (const planner of plannerRoutes) {
    console.error(`[model-bakeoff] planning ${planner.label} with ${planner.model}`);
    try {
      const routes = { ...baseRoutes, planner: planner.model };
      const result = await planRollingWindow({
        kernel: project.story_kernel,
        arc: project.arc_plan,
        state: project.story_state,
        routes,
      });
      planResults.push({
        label: planner.label,
        model: planner.model,
        ok: true,
        plan: result.rollingPlan.plans[0],
        chapters: result.rollingPlan.plans.length,
        costUsd: Number(sumCost(result.usages).toFixed(6)),
        usages: usageSummary(result.usages),
      });
      console.error(`[model-bakeoff] plan passed ${planner.label}`);
    } catch (error) {
      planResults.push({
        label: planner.label,
        model: planner.model,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[model-bakeoff] plan failed ${planner.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const successfulPlans = planResults.filter((result): result is typeof result & { plan: ChapterPlan } => !!result.ok && !!result.plan);
  const chapterResults = [];
  for (const planResult of successfulPlans) {
    for (const writer of [writerBaseline, flashModel]) {
      for (const editor of [editorBaseline, flashModel]) {
        const label = `${planResult.label}__writer_${writer}__editor_${editor}`;
        console.error(`[model-bakeoff] writing ${label}`);
        try {
          const routes = { ...baseRoutes, planner: planResult.model, writer, editor };
          const result = await writeStoryChapter({
            kernel: project.story_kernel,
            state: project.story_state,
            plan: planResult.plan,
            previousChapter,
            routes,
          });
          chapterResults.push({
            label,
            planSource: planResult.label,
            writer,
            editor,
            ok: true,
            decision: result.decision,
            editorStatus: result.assessment.status,
            title: result.draft.title,
            wordCount: result.wordCount,
            revisionCount: result.revisionCount,
            costUsd: Number(sumCost(result.usages).toFixed(6)),
            usages: usageSummary(result.usages),
            opening: result.draft.content.slice(0, 420),
            ending: result.draft.content.slice(-420),
          });
          console.error(`[model-bakeoff] chapter passed ${label}`);
        } catch (error) {
          chapterResults.push({
            label,
            planSource: planResult.label,
            writer,
            editor,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
          console.error(`[model-bakeoff] chapter failed ${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  console.log(JSON.stringify({
    jobId,
    currentChapter: job.current_chapter,
    nextChapter: job.current_chapter + 1,
    testedAt: new Date().toISOString(),
    flashModel,
    baseline: { planner: plannerBaseline, writer: writerBaseline, editor: editorBaseline },
    note: 'Offline bake-off only: no chapter, state, run, or job rows are committed.',
    plans: planResults.map(({ plan, ...rest }) => rest),
    chapters: chapterResults,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
