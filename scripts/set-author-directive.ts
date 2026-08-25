/**
 * Author steering directive — set / read / clear the free-text instruction the
 * factory injects into the Planner payload of a RUNNING novel
 * (ai_story_projects.author_directive). Plot steering never reaches the Writer
 * verbatim: the resolved rolling plan is its only plot contract. Updating a
 * directive drops any uncommitted rolling tail so it truly applies from the
 * next chapter; already-published chapters are untouched.
 *
 * Usage:
 *   npx tsx scripts/set-author-directive.ts list
 *   npx tsx scripts/set-author-directive.ts <projectId> get
 *   npx tsx scripts/set-author-directive.ts <projectId> set "Giảm tuyến phụ, dồn nhịp về xung đột chính."
 *   npx tsx scripts/set-author-directive.ts <projectId> clear
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const MAX_DIRECTIVE_CHARS = 1_500;

function titleOf(row: { novels?: unknown }): string {
  const novel = Array.isArray(row.novels) ? row.novels[0] : row.novels;
  return (novel as { title?: string } | undefined)?.title ?? '(unknown novel)';
}

async function list() {
  const result = await db.from('ai_story_projects')
    .select('id, author_directive, novels!ai_story_projects_novel_id_fkey(title)')
    .not('author_directive', 'is', null)
    .order('updated_at', { ascending: false });
  if (result.error) throw result.error;
  const rows = (result.data ?? []).filter(row => row.author_directive?.trim());
  console.log(`${rows.length} project(s) with an author directive`);
  for (const row of rows) {
    const directive = row.author_directive!.replace(/\s+/g, ' ');
    console.log(`  ${row.id} | ${titleOf(row)}\n    ↳ "${directive.length > 90 ? `${directive.slice(0, 90)}…` : directive}"`);
  }
}

async function load(projectId: string) {
  const result = await db.from('ai_story_projects')
    .select('id, author_directive, novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', projectId)
    .single();
  if (result.error || !result.data) throw new Error(`Project ${projectId} not found: ${result.error?.message}`);
  return result.data;
}

async function main() {
  const [first, command, ...rest] = process.argv.slice(2);
  if (first === 'list') return list();
  if (!first || !command) {
    throw new Error('Usage: set-author-directive.ts list | <projectId> get|set "<text>"|clear');
  }
  const project = await load(first);
  if (command === 'get') {
    console.log(`${titleOf(project)} (${project.id})`);
    console.log(project.author_directive?.trim()
      ? `\n${project.author_directive.trim()}`
      : '\n(no author directive set)');
    return;
  }
  if (command === 'set' || command === 'clear') {
    const text = command === 'clear' ? null : rest.join(' ').trim().slice(0, MAX_DIRECTIVE_CHARS) || null;
    if (command === 'set' && !text) throw new Error('set requires a non-empty directive text.');
    const jobs = await db.from('story_factory_jobs')
      .select('id,status,stage,current_chapter,lease_token')
      .eq('project_id', project.id);
    if (jobs.error) throw jobs.error;
    const mutableJobs = (jobs.data ?? []).filter(job => !['completed', 'cancelled'].includes(job.status));
    const leased = mutableJobs.find(job => job.lease_token !== null);
    if (leased) throw new Error(`Job ${leased.id} is currently leased; retry after its active tick finishes.`);
    const update = await db.from('ai_story_projects')
      .update({ author_directive: text })
      .eq('id', project.id);
    if (update.error) throw update.error;
    for (const job of mutableJobs) {
      const jobUpdate = await db.from('story_factory_jobs').update({
        rolling_plan: null,
        plan_feedback: null,
        stage: job.current_chapter > 0 ? 'plan' : 'setup',
        status: job.status === 'writing' ? 'ready' : job.status,
        retry_count: 0,
        next_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', job.id).is('lease_token', null);
      if (jobUpdate.error) throw jobUpdate.error;
    }
    console.log(text
      ? `Directive set for ${titleOf(project)} — uncommitted plans cleared; applies from the next chapter:\n${text}`
      : `Directive cleared for ${titleOf(project)}.`);
    return;
  }
  throw new Error(`Unknown command ${command}. Use get | set | clear | list.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
