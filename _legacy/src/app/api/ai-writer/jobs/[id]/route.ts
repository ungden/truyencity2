import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const jobId = id;
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { data: job, error } = await client
      .from('ai_writing_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Watchdog: nếu pending/running quá lâu → fail (timeout)
    if (['pending', 'running'].includes(job.status)) {
      const last = job.updated_at ? new Date(job.updated_at).getTime() : new Date(job.created_at).getTime();
      if (Date.now() - last > TIMEOUT_MS) {
        const { data: updated, error: updErr } = await client
          .from('ai_writing_jobs')
          .update({
            status: 'failed',
            step_message: 'Tác vụ hết thời gian chờ.',
            error_message: 'Timeout after 15 minutes.',
            progress: 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('user_id', user.id)
          .select('*')
          .single();
        if (!updErr && updated) {
          job = updated;
        }
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job status';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};