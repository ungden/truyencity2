import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { STORY_FACTORY_RELEASE } from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });
const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const required = ['ai_story_projects', 'story_factory_jobs', 'story_factory_runs', 'story_state_events'];
  for (const table of required) {
    const result = await db.from(table).select('*', { head: true, count: 'exact' });
    if (result.error) throw new Error(`${table}: ${result.error.message}`);
  }
  console.log(JSON.stringify({ dryRun: !apply, release: STORY_FACTORY_RELEASE, schema: required }, null, 2));
  if (!apply) return;
  const slug = `factory-smoke-${Date.now()}`;
  const novel = await db.from('novels').insert({ title: 'Factory Smoke', slug, hidden: true, genres: ['smoke'] }).select('id').single();
  if (novel.error) throw novel.error;
  try {
    const project = await db.from('ai_story_projects').insert({
      novel_id: novel.data.id, genre: 'smoke', status: 'paused', engine_release: STORY_FACTORY_RELEASE,
      model_routes: { smoke: true }, story_state: { schemaVersion: 2, chapterNumber: 0, recentOutcomes: [] },
    }).select('id').single();
    if (project.error) throw project.error;
    const leaseToken = randomUUID();
    const job = await db.from('story_factory_jobs').insert({
      project_id: project.data.id, novel_id: novel.data.id, status: 'writing', stage: 'write', setup_input: { smoke: true },
      lease_owner: 'factory-smoke', lease_token: leaseToken, lease_until: new Date(Date.now() + 300_000).toISOString(),
    }).select('id').single();
    if (job.error) throw job.error;
    const run = await db.from('story_factory_runs').insert({
      job_id: job.data.id, project_id: project.data.id, novel_id: novel.data.id,
      kind: 'smoke', chapter_number: 1, status: 'running', engine_release: STORY_FACTORY_RELEASE,
    }).select('id').single();
    if (run.error) throw run.error;
    const params = {
      p_job_id: job.data.id,
      p_lease_token: leaseToken,
      p_run_id: run.data.id,
      p_expected_chapter: 1,
      p_title: 'Smoke Chapter',
      p_content: 'Nội dung smoke chỉ tồn tại trong transaction test rồi được xóa.',
      p_state_after: {
        schemaVersion: 2,
        chapterNumber: 1,
        recentOutcomes: [{
          chapterNumber: 1,
          title: 'Smoke Chapter',
          event: 'Một transaction smoke được thực hiện.',
          result: 'Chương và state được ghi đồng thời.',
          method: 'transaction database',
          endingSituation: 'Dữ liệu sẵn sàng để kiểm tra rồi xóa.',
          evidenceSpans: ['Nội dung smoke'],
        }],
      },
      p_remaining_plan: { schemaVersion: 1, startChapter: 2, plans: [] },
      p_events: [{ deltaId: 'smoke_event', kind: 'fact', entityId: 'smoke_fact', before: null, after: 'committed', source: 'smoke' }],
      p_assessment: {
        status: 'pass',
        issues: [],
        deltaChecks: [{ deltaId: 'smoke_event', realized: true, evidence: 'smoke' }],
        outcome: {
          event: 'Một transaction smoke được thực hiện.',
          result: 'Chương và state được ghi đồng thời.',
          method: 'transaction database',
          endingSituation: 'Dữ liệu sẵn sàng để kiểm tra rồi xóa.',
          evidenceSpans: ['Nội dung smoke'],
        },
      },
      p_context_manifest: [],
      p_usage: [],
      p_cost_usd: 0,
      p_word_count: 10,
      p_revision_count: 0,
      p_engine_release: STORY_FACTORY_RELEASE,
    };
    const skipped = await db.rpc('commit_story_factory_chapter', {
      ...params,
      p_expected_chapter: 2,
      p_state_after: {
        schemaVersion: 2,
        chapterNumber: 2,
        recentOutcomes: [{
          chapterNumber: 2,
          title: 'Skipped Smoke Chapter',
          event: 'Một chương bị cố nhảy số.',
          result: 'Transaction phải từ chối.',
          method: null,
          endingSituation: 'Không có dữ liệu được commit.',
          evidenceSpans: ['Nội dung smoke'],
        }],
      },
    });
    if (!skipped.error) throw new Error('Out-of-sequence chapter commit unexpectedly succeeded.');
    const committed = await db.rpc('commit_story_factory_chapter', params);
    if (committed.error) throw committed.error;

    const [chapters, events, state, publishedRun] = await Promise.all([
      db.from('chapters').select('id', { count: 'exact' }).eq('novel_id', novel.data.id),
      db.from('story_state_events').select('id', { count: 'exact' }).eq('project_id', project.data.id),
      db.from('ai_story_projects').select('current_chapter,story_state').eq('id', project.data.id).single(),
      db.from('story_factory_runs').select('status').eq('id', run.data.id).single(),
    ]);
    if (chapters.error || chapters.count !== 1 || events.error || events.count !== 1
      || state.error || state.data.current_chapter !== 1 || state.data.story_state?.chapterNumber !== 1
      || publishedRun.error || publishedRun.data.status !== 'published') {
      throw new Error('Transactional chapter commit did not persist exactly one coherent transition.');
    }
    const duplicate = await db.rpc('commit_story_factory_chapter', params);
    if (!duplicate.error) throw new Error('Duplicate commit unexpectedly succeeded.');
    const remainingChapters = await db.from('chapters').select('id', { count: 'exact', head: true }).eq('novel_id', novel.data.id);
    if (remainingChapters.error || remainingChapters.count !== 1) throw new Error('Duplicate commit changed public chapter state.');
  } finally {
    await db.from('novels').delete().eq('id', novel.data.id);
  }
  const remaining = await db.from('novels').select('id', { head: true, count: 'exact' }).eq('slug', slug);
  if (remaining.error || remaining.count !== 0) throw new Error('Smoke cleanup failed.');
  console.log(JSON.stringify({ smoke: 'passed', transactionalCommit: 'passed', skippedChapter: 'rejected', duplicateCommit: 'rejected', cleanup: 'passed' }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
