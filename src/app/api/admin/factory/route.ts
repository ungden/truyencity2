import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { STORY_FACTORY_RELEASE } from '@/services/story-factory';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['start', 'stop', 'release']),
  jobId: z.string().uuid(),
}).strict();

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('story_factory_jobs').select(`
    id, project_id, novel_id, execution_mode, status, stage, current_chapter,
    daily_target, chapters_today, quota_date, next_run_at, lease_until, last_error,
    ai_story_projects!story_factory_jobs_project_id_fkey(engine_release),
    novels!story_factory_jobs_novel_id_fkey(title, cover_url, hidden)
  `).order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: recentRuns } = await db.from('story_factory_runs')
    .select('id,job_id,kind,chapter_number,status,estimated_cost_usd,word_count,error_code,error_message,started_at,finished_at')
    .order('started_at', { ascending: false }).limit(50);
  return NextResponse.json({ release: STORY_FACTORY_RELEASE, jobs: data ?? [], recentRuns: recentRuns ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action', issues: parsed.error.issues }, { status: 400 });
  const db = getSupabaseAdmin();
  if (parsed.data.action === 'release') {
    const { data, error } = await db.rpc('promote_story_factory_canary', {
      p_job_id: parsed.data.jobId,
      p_engine_release: STORY_FACTORY_RELEASE,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(data);
  }
  const { data: job, error: lookupError } = await db.from('story_factory_jobs')
    .select('id,stage,status').eq('id', parsed.data.jobId).single();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 404 });
  const status = parsed.data.action === 'stop' ? 'cancelled' : (job.stage === 'setup' ? 'setup' : 'ready');
  const { error } = await db.from('story_factory_jobs').update({
    status,
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    next_run_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', job.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobId: job.id, status });
}
