import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

// POST: Create AI project from outline
export async function POST(request: NextRequest) {
  console.log('[CREATE PROJECT API] Received request.');
  try {
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      outline_id,
      writing_style,
      ai_model,
      temperature,
      target_chapter_length
    } = body;

    if (!outline_id) {
      return NextResponse.json({ error: 'outline_id is required' }, { status: 400 });
    }

    // Verify outline exists and belongs to user
    const { data: outline, error: outlineError } = await client
      .from('story_outlines')
      .select('id, status, ai_project_id')
      .eq('id', outline_id)
      .eq('user_id', user.id)
      .single();

    if (outlineError || !outline) {
      return NextResponse.json({ error: 'Outline not found' }, { status: 404 });
    }

    if (outline.ai_project_id) {
      return NextResponse.json({
        error: 'Outline đã được tạo thành project',
        projectId: outline.ai_project_id
      }, { status: 409 });
    }

    // Create job record
    const { data: job, error: jobError } = await client
      .from('inspiration_jobs')
      .insert({
        user_id: user.id,
        job_type: 'write_chapter',
        outline_id,
        status: 'pending',
        step_message: 'Đang tạo project từ outline...',
        progress: 2
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[CREATE PROJECT API] Failed to create job:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    console.log(`[CREATE PROJECT API] Created job ${job.id}`);

    // Start project creation asynchronously
    (async () => {
      try {
        const { AIStoryInspiration } = await import('@/services/ai-story-inspiration');
        const creator = new AIStoryInspiration(job.id, client);
        await creator.createProjectFromOutline(outline_id, user.id, {
          writing_style,
          ai_model,
          temperature,
          target_chapter_length
        });
        console.log(`[CREATE PROJECT API] Project creation completed for job ${job.id}`);
      } catch (err) {
        console.error(`[CREATE PROJECT API] Error in async creation:`, err);
        const again = createSupabaseFromAuthHeader(request).client;
        if (again && job.id) {
          await again.from('inspiration_jobs').update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
            step_message: 'Lỗi khi tạo project.'
          }).eq('id', job.id);
        }
      }
    })();

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    console.error('[CREATE PROJECT API] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
