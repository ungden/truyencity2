import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';
import { getSupabase } from '../src/services/story-engine/utils/supabase';
import { readFileSync } from 'fs';
import path from 'path';

const CONFIRMATION = 'START_FLAGSHIP_FIRST_5';
const PORTFOLIO_ID = 'flagship-first-30';
const DAILY_QUOTA = 20;
const SELECTED_SLOTS = ['HX-04', 'TH-01', 'DT-11', 'DT-01', 'HX-01'] as const;

type ProjectRow = {
  id: string;
  novel_id: string;
  status: string;
  current_chapter: number | null;
  flagship_setup_status: string | null;
  pause_reason: string | null;
  style_directives: Record<string, unknown> | null;
  novels: { title?: string } | Array<{ title?: string }> | null;
};

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function vietnamDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function vietnamDayBounds(date: string): { start: string; end: string } {
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0));
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}

function title(project: ProjectRow): string {
  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  return novel?.title || '(untitled)';
}

async function loadPortfolio(): Promise<ProjectRow[]> {
  const { data, error } = await getSupabase().from('ai_story_projects')
    .select('id,novel_id,status,current_chapter,flagship_setup_status,pause_reason,style_directives,novels!ai_story_projects_novel_id_fkey(title)')
    .eq('style_directives->>pipeline_version', 'flagship_v2')
    .eq('style_directives->>portfolio_id', PORTFOLIO_ID)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ProjectRow[];
}

async function snapshot() {
  const db = getSupabase();
  const projects = await loadPortfolio();
  const ids = projects.map(project => project.id);
  const today = vietnamDate();
  const [{ data: jobs, error: jobsError }, { data: quotas, error: quotasError }] = await Promise.all([
    ids.length ? db.from('story_factory_jobs').select('project_id,status,stage,current_chapter,attempt,last_error,lease_until').in('project_id', ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? db.from('project_daily_quotas').select('project_id,target_chapters,written_chapters,status,next_due_at,last_error').in('project_id', ids).eq('vn_date', today) : Promise.resolve({ data: [], error: null }),
  ]);
  if (jobsError) throw jobsError;
  if (quotasError) throw quotasError;
  const jobByProject = new Map((jobs || []).map(job => [job.project_id, job]));
  const quotaByProject = new Map((quotas || []).map(quota => [quota.project_id, quota]));
  return {
    today,
    projects: projects.map(project => ({
      slotId: String(project.style_directives?.portfolio_slot_id || ''),
      projectId: project.id,
      title: title(project),
      selected: SELECTED_SLOTS.includes(String(project.style_directives?.portfolio_slot_id || '') as typeof SELECTED_SLOTS[number]),
      projectStatus: project.status,
      setupStatus: project.flagship_setup_status,
      chapter: Number(project.current_chapter || 0),
      factoryEnabled: project.style_directives?.factory_enabled === true,
      quotaSetting: project.style_directives?.production_daily_chapter_quota ?? null,
      job: jobByProject.get(project.id) || null,
      quota: quotaByProject.get(project.id) || null,
    })),
  };
}

async function countToday(novelId: string, date: string): Promise<number> {
  const bounds = vietnamDayBounds(date);
  const { count, error } = await getSupabase().from('chapters').select('id', { count: 'exact', head: true })
    .eq('novel_id', novelId).gte('created_at', bounds.start).lt('created_at', bounds.end);
  if (error) throw error;
  return Number(count || 0);
}

async function applyStart(): Promise<void> {
  const db = getSupabase();
  const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(
    path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/model-routes-v2.json'), 'utf8',
  )));
  if (routes.writer !== 'gpt-5.6-luna') throw new Error('First-five start requires official gpt-5.6-luna standard as Writer.');
  const projects = await loadPortfolio();
  const bySlot = new Map(projects.map(project => [String(project.style_directives?.portfolio_slot_id || ''), project]));
  const missing = SELECTED_SLOTS.filter(slot => !bySlot.has(slot));
  if (missing.length) throw new Error(`Provision selected slots before start: ${missing.join(', ')}`);

  for (const project of projects) {
    const slot = String(project.style_directives?.portfolio_slot_id || '');
    const selected = SELECTED_SLOTS.includes(slot as typeof SELECTED_SLOTS[number]);
    const style = project.style_directives || {};
    if (!selected) {
      const { error } = await db.from('ai_story_projects').update({
        status: 'paused',
        pause_reason: 'flagship_first_five_not_selected',
        paused_at: new Date().toISOString(),
        style_directives: { ...style, factory_enabled: false, production_enabled: false },
        updated_at: new Date().toISOString(),
      }).eq('id', project.id);
      if (error) throw error;
      const cancelled = await db.from('story_factory_jobs').update({
        status: 'cancelled', lease_owner: null, lease_token: null, lease_until: null,
        last_error: 'Not selected for first-five canary', updated_at: new Date().toISOString(),
      }).eq('project_id', project.id).neq('status', 'completed');
      if (cancelled.error) throw cancelled.error;
      continue;
    }

    if (Number(project.current_chapter || 0) !== 0) {
      throw new Error(`${slot} already has chapters; refusing to reset its job or quota.`);
    }
    const { error } = await db.from('ai_story_projects').update({
      status: 'paused',
      pause_reason: 'flagship_first_five_armed',
      paused_at: new Date().toISOString(),
      style_directives: {
        ...style,
        pipeline_version: 'flagship_v2',
        portfolio_id: PORTFOLIO_ID,
        portfolio_slot_id: slot,
        publication_mode: 'automatic',
        factory_enabled: true,
        flagship_setup_mode: 'autonomous_factory',
        production_enabled: false,
        production_daily_chapter_quota: DAILY_QUOTA,
        flagship_model_routes: routes,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id);
    if (error) throw error;
    const resetJob = await db.from('story_factory_jobs').update({
      status: 'queued', stage: 'setup', current_chapter: 0, attempt: 0,
      lease_owner: null, lease_token: null, lease_until: null,
      failure_class: null, last_error: null, updated_at: new Date().toISOString(),
    }).eq('project_id', project.id).neq('status', 'completed');
    if (resetJob.error) throw resetJob.error;
    const writtenToday = await countToday(project.novel_id, vietnamDate());
    const quota = await db.from('project_daily_quotas').upsert({
      project_id: project.id,
      vn_date: vietnamDate(),
      target_chapters: DAILY_QUOTA,
      written_chapters: writtenToday,
      status: writtenToday >= DAILY_QUOTA ? 'completed' : 'active',
      next_due_at: writtenToday >= DAILY_QUOTA ? null : new Date().toISOString(),
      slot_seed: [...project.id].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) | 0, 0) & 0x7fffffff,
      retry_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,vn_date' });
    if (quota.error) throw quota.error;
  }
}

async function main(): Promise<void> {
  const before = await snapshot();
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'dry_run', selectedSlots: SELECTED_SLOTS, dailyQuota: DAILY_QUOTA, ...before, next: `rerun with --apply --confirm=${CONFIRMATION}` }, null, 2));
    return;
  }
  if (arg('confirm') !== CONFIRMATION) throw new Error(`Refusing production start. Pass --confirm=${CONFIRMATION}.`);
  await applyStart();
  const after = await snapshot();
  const selected = after.projects.filter(project => project.selected && project.factoryEnabled);
  if (selected.length !== SELECTED_SLOTS.length || after.projects.some(project => !project.selected && project.factoryEnabled)) {
    throw new Error('Post-start verification failed: factory enablement is not exactly the selected five.');
  }
  if (selected.some(project => project.quotaSetting !== DAILY_QUOTA || project.quota?.target_chapters !== DAILY_QUOTA)) {
    throw new Error('Post-start verification failed: daily quota is not exactly 20 for every selected project.');
  }
  console.log(JSON.stringify({ mode: 'applied', selectedSlots: SELECTED_SLOTS, dailyQuota: DAILY_QUOTA, ...after }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
