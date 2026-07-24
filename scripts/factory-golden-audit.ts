import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_MODEL_ROUTES,
  assessRollingPlan,
  assessStoryDraft,
  geminiProvider,
  reviewFiveChapterWindow,
  type ProviderUsage,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const jobId = value('--job-id');
if (!jobId) throw new Error('Usage: tsx scripts/factory-golden-audit.ts --job-id <uuid>');
const planModel = value('--plan-model') ?? DEFAULT_MODEL_ROUTES.planJudge;
const editorModel = value('--editor-model') ?? DEFAULT_MODEL_ROUTES.editor;
const planOnly = args.includes('--plan-only');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function cost(usages: ProviderUsage[]): number {
  return usages.reduce((total, usage) => total + usage.costUsd, 0);
}

async function main() {
  const jobResult = await db.from('story_factory_jobs')
    .select('id,project_id,novel_id,current_chapter,status')
    .eq('id', jobId!)
    .single();
  if (jobResult.error) throw jobResult.error;
  const job = jobResult.data;
  if (job.status !== 'cancelled') throw new Error('Golden audit only accepts a cancelled negative-corpus job.');

  const [projectResult, runResult, chapterResult] = await Promise.all([
    db.from('ai_story_projects').select('story_kernel,arc_plan,story_state').eq('id', job.project_id).single(),
    db.from('story_factory_runs')
      .select('kind,chapter_number,status,input_artifact,output_artifact')
      .eq('job_id', job.id)
      .order('started_at'),
    db.from('chapters')
      .select('chapter_number,title,content')
      .eq('novel_id', job.novel_id)
      .order('chapter_number'),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (runResult.error) throw runResult.error;
  if (chapterResult.error) throw chapterResult.error;

  const runs = runResult.data ?? [];
  const setupRun = runs.find(run => run.kind === 'setup' && run.status === 'passed');
  const planRun = runs.find(run => run.kind === 'plan' && run.status === 'passed');
  const launchPack = (setupRun?.output_artifact as { launchPack?: {
    kernel: unknown; arc: unknown; initialState: unknown;
  } } | null)?.launchPack;
  const rollingPlan = planRun?.output_artifact as { plans?: unknown[] } | null;
  if (!launchPack || !rollingPlan?.plans?.length) throw new Error('Negative corpus is missing its immutable launch pack or rolling plan.');

  const usages: ProviderUsage[] = [];
  const judged = await assessRollingPlan({
    provider: geminiProvider,
    kernel: launchPack.kernel as never,
    arc: launchPack.arc as never,
    state: launchPack.initialState as never,
    rollingPlan: rollingPlan as never,
    model: planModel,
  });
  usages.push(judged.usage);
  if (planOnly) {
    console.log(JSON.stringify({
      jobId,
      routes: { planJudge: planModel },
      planAssessment: judged.assessment,
      costUsd: Number(cost(usages).toFixed(6)),
    }, null, 2));
    return;
  }

  const chapterRuns = new Map(runs
    .filter(run => run.kind === 'chapter' && run.status === 'published' && run.chapter_number)
    .map(run => [run.chapter_number as number, run]));
  const plans = new Map((rollingPlan.plans as Array<{ chapterNumber: number }>).map(plan => [plan.chapterNumber, plan]));
  const chapters = chapterResult.data ?? [];
  const chapterAssessments = [];
  for (const chapterNumber of [1, 2, 3, 5]) {
    const chapter = chapters.find(item => item.chapter_number === chapterNumber);
    const plan = plans.get(chapterNumber);
    const previousState = chapterNumber === 1
      ? launchPack.initialState
      : (chapterRuns.get(chapterNumber - 1)?.output_artifact as { stateAfter?: unknown } | null)?.stateAfter;
    if (!chapter?.content || !plan || !previousState) throw new Error(`Golden corpus chapter ${chapterNumber} is incomplete.`);
    const assessed = await assessStoryDraft({
      provider: geminiProvider,
      model: editorModel,
      kernel: launchPack.kernel,
      state: previousState,
      plan: plan as never,
      draft: { title: chapter.title, content: chapter.content },
    });
    usages.push(assessed.usage);
    chapterAssessments.push({
      chapterNumber,
      status: assessed.assessment.status,
      issues: assessed.assessment.status === 'revise' ? assessed.assessment.issues : [],
    });
  }

  const reviewed = await reviewFiveChapterWindow({
    kernel: launchPack.kernel as never,
    arc: launchPack.arc as never,
    state: projectResult.data.story_state as never,
    chapters: chapters.slice(0, 5).map(chapter => ({
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content ?? '',
    })),
    routes: { ...DEFAULT_MODEL_ROUTES, editor: editorModel },
  });
  usages.push(reviewed.usage);

  console.log(JSON.stringify({
    jobId,
    routes: { planJudge: planModel, editor: editorModel },
    planAssessment: judged.assessment,
    chapterAssessments,
    windowReview: reviewed.review,
    costUsd: Number(cost(usages).toFixed(6)),
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
