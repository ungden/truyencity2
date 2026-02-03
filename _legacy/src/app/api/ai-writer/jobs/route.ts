import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

export async function POST(request: NextRequest) {
  console.log('[JOB API] Received request to start a new writing job.');
  try {
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      console.error('[JOB API] Unauthorized: Missing client or token.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      console.error('[JOB API] Unauthorized: Could not get user.', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      console.error('[JOB API] Bad Request: Project ID is required.');
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    console.log(`[JOB API] Project ID: ${projectId}`);

    const { data: project, error: projectError } = await client
      .from('ai_story_projects')
      .select('*, novel:novels(id, title, author)')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error(`[JOB API] Project not found or permission denied for project ${projectId}.`, projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.log(`[JOB API] Project "${project.novel?.title}" found. Status: ${project.status}`);

    if (project.status !== 'active') {
      console.warn(`[JOB API] Project ${projectId} is not active.`);
      return NextResponse.json({ error: 'Project is not active' }, { status: 400 });
    }

    const { data: existingJob } = await client
      .from('ai_writing_jobs')
      .select('id,status')
      .eq('project_id', projectId)
      .in('status', ['pending', 'running'])
      .limit(1)
      .maybeSingle();

    if (existingJob?.id) {
      console.warn(`[JOB API] An active job (${existingJob.id}) already exists for this project.`);
      return NextResponse.json({ error: 'Đã có một tác vụ đang chạy cho dự án này' }, { status: 409 });
    }

    console.log(`[JOB API] Creating job record for chapter ${project.current_chapter + 1}...`);
    const { data: job, error: jobError } = await client
      .from('ai_writing_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        chapter_number: project.current_chapter + 1,
        status: 'pending',
        step_message: 'Đang khởi tạo tác vụ...',
        progress: 2,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[JOB API] FAILED to create job record in Supabase:', jobError);
      return NextResponse.json({ error: 'Failed to create writing job' }, { status: 500 });
    }
    console.log(`[JOB API] Successfully created job record with ID: ${job.id}`);

    // Start the writing process asynchronously ("fire-and-forget")
    (async () => {
      try {
        console.log(`[JOB API] [Async Job ${job.id}] Importing AIStoryWriter...`);
        const { AIStoryWriter } = await import('@/services/ai-story-writer');
        console.log(`[JOB API] [Async Job ${job.id}] Instantiating AIStoryWriter with user client...`);
        // Pass the user-auth client so we can operate under the user's RLS permissions
        const writer = new AIStoryWriter(project as any, job.id as string, client);
        console.log(`[JOB API] [Async Job ${job.id}] Calling writeNextChapter...`);
        await writer.writeNextChapter();
        console.log(`[JOB API] [Async Job ${job.id}] writeNextChapter process finished.`);
      } catch (err) {
        console.error(`[JOB API] [Async Job ${job.id}] Unhandled error in background writer process:`, err);
        // Attempt to mark the job as failed in the database
        const again = createSupabaseFromAuthHeader(request).client;
        if (again && job.id) {
          await again.from('ai_writing_jobs').update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown async error',
            step_message: 'Lỗi nghiêm trọng khi thực thi tác vụ.',
            progress: 100,
          }).eq('id', job.id);
        }
      }
    })();

    console.log(`[JOB API] Returning success response to client for job ${job.id}. The job will run in the background.`);
    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start writing job';
    console.error('[JOB API] SYNC Unhandled error in POST handler:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}