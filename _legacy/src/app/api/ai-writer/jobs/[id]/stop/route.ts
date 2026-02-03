import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = id;
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await client
      .from('ai_writing_jobs')
      .update({ 
        status: 'stopped',
        step_message: 'Tác vụ đã được người dùng dừng lại.',
        progress: 100
      })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'running']);

    if (error) {
      return NextResponse.json({ error: 'Failed to stop job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Job stopped successfully.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to stop job';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}