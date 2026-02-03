import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

// GET: Get job status by ID (via query param)
export async function GET(request: NextRequest) {
  try {
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      // List all recent jobs
      const { data: jobs, error } = await client
        .from('inspiration_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return NextResponse.json({ success: true, data: jobs });
    }

    // Get specific job
    const { data: job, error } = await client
      .from('inspiration_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Stop a running job
export async function POST(request: NextRequest) {
  try {
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, action } = await request.json();

    if (!jobId || action !== 'stop') {
      return NextResponse.json({ error: 'Job ID and action=stop required' }, { status: 400 });
    }

    const { error } = await client
      .from('inspiration_jobs')
      .update({ status: 'stopped', step_message: 'Đã dừng bởi người dùng' })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'running']);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to stop job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
