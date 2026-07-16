import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { getSupabase } from '../src/services/story-engine/utils/supabase';
import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';
import { readFileSync } from 'fs';
import path from 'path';

const CONFIRMATION = 'REQUEUE_FLAGSHIP_QUALITY_BLOCKED';
const PORTFOLIO_ID = 'flagship-first-30';
const SELECTED_SLOTS = ['HX-04', 'TH-01', 'DT-11', 'DT-01', 'HX-01'] as const;

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function vietnamDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

async function snapshot() {
  const db = getSupabase();
  const { data: projects, error } = await db.from('ai_story_projects')
    .select('id,current_chapter,status,pause_reason,style_directives')
    .eq('style_directives->>pipeline_version', 'flagship_v2')
    .eq('style_directives->>portfolio_id', PORTFOLIO_ID)
    .eq('style_directives->>factory_enabled', 'true');
  if (error) throw error;
  const selected = (projects || []).filter(project => SELECTED_SLOTS.includes(
    String((project.style_directives as Record<string, unknown> | null)?.portfolio_slot_id || '') as typeof SELECTED_SLOTS[number],
  ));
  const ids = selected.map(project => project.id);
  const { data: jobs, error: jobsError } = ids.length
    ? await db.from('story_factory_jobs').select('id,project_id,status,stage,current_chapter,failure_class,last_error,lease_until').in('project_id', ids)
    : { data: [], error: null };
  if (jobsError) throw jobsError;
  const jobByProject = new Map((jobs || []).map(job => [job.project_id, job]));
  return selected.map(project => ({
    slot: String((project.style_directives as Record<string, unknown> | null)?.portfolio_slot_id || ''),
    projectId: project.id,
    projectChapter: Number(project.current_chapter || 0),
    projectStatus: project.status,
    pauseReason: project.pause_reason,
    editorModel: ((project.style_directives as Record<string, unknown> | null)?.flagship_model_routes as Record<string, unknown> | undefined)?.editor || null,
    job: jobByProject.get(project.id) || null,
  })).sort((a, b) => a.slot.localeCompare(b.slot));
}

async function main(): Promise<void> {
  const before = await snapshot();
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'dry_run', before, next: `--apply --confirm=${CONFIRMATION}` }, null, 2));
    return;
  }
  if (arg('confirm') !== CONFIRMATION) throw new Error(`Pass --confirm=${CONFIRMATION}`);
  if (before.length !== SELECTED_SLOTS.length) throw new Error(`Expected exactly ${SELECTED_SLOTS.length} selected projects, found ${before.length}.`);
  const invalid = before.filter(item => item.job?.status !== 'blocked' || item.job?.failure_class !== 'quality');
  if (invalid.length) throw new Error(`Only quality-blocked jobs may be requeued: ${invalid.map(item => item.slot).join(', ')}`);
  const leased = before.filter(item => item.job?.lease_until && new Date(item.job.lease_until).getTime() > Date.now());
  if (leased.length) throw new Error(`Refusing to steal active leases: ${leased.map(item => item.slot).join(', ')}`);

  const db = getSupabase();
  const ids = before.map(item => item.projectId);
  const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(
    path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/model-routes-v2.json'), 'utf8',
  )));
  if (routes.writer !== 'gpt-5.6-luna' || routes.editor !== 'gemini-3.1-pro-preview') {
    throw new Error('Requeue requires Luna Writer and Gemini Pro independent Editor.');
  }
  const { data: projectRows, error: projectReadError } = await db.from('ai_story_projects')
    .select('id,style_directives')
    .eq('style_directives->>pipeline_version', 'flagship_v2')
    .eq('style_directives->>portfolio_id', PORTFOLIO_ID);
  if (projectReadError) throw projectReadError;
  if ((projectRows || []).length !== 30) throw new Error(`Expected all 30 portfolio routes, found ${(projectRows || []).length}.`);
  for (const project of projectRows || []) {
    const { error: routeError } = await db.from('ai_story_projects').update({
      style_directives: {
        ...((project.style_directives || {}) as Record<string, unknown>),
        flagship_model_routes: routes,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id);
    if (routeError) throw routeError;
  }
  const { error: jobError } = await db.from('story_factory_jobs').update({
    status: 'ready', stage: 'plan', lease_owner: null, lease_token: null, lease_until: null,
    failure_class: null, last_error: null, updated_at: new Date().toISOString(),
  }).in('project_id', ids).eq('status', 'blocked').eq('failure_class', 'quality');
  if (jobError) throw jobError;

  const { error: quotaError } = await db.from('project_daily_quotas').update({
    status: 'active', retry_count: 0, failure_class: null, last_error: null,
    next_due_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).in('project_id', ids).eq('vn_date', vietnamDate());
  if (quotaError) throw quotaError;

  const after = await snapshot();
  if (after.some(item => item.job?.status !== 'ready' || item.job?.stage !== 'plan' || item.editorModel !== routes.editor)) {
    throw new Error('Post-requeue verification failed.');
  }
  console.log(JSON.stringify({ mode: 'applied', after }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
