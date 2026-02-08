import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { AIProviderType } from '@/lib/types/ai-providers';

// POST: Start analysis job for a source story
export async function POST(request: NextRequest) {
  console.log('[ANALYZE API] Received request to analyze source story.');
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
    const { sourceStoryId, config } = body;
    
    if (!sourceStoryId) {
      return NextResponse.json({ error: 'Source story ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: story, error: storyError } = await client
      .from('source_stories')
      .select('id, analysis_status')
      .eq('id', sourceStoryId)
      .eq('user_id', user.id)
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Source story not found' }, { status: 404 });
    }

    if (story.analysis_status === 'analyzing') {
      return NextResponse.json({ error: 'Analysis already in progress' }, { status: 409 });
    }

    // Check for existing running job
    const { data: existingJob } = await client
      .from('inspiration_jobs')
      .select('id')
      .eq('source_story_id', sourceStoryId)
      .in('status', ['pending', 'running'])
      .limit(1)
      .maybeSingle();

    if (existingJob?.id) {
      return NextResponse.json({ error: 'A job is already running for this story' }, { status: 409 });
    }

    // Create job record
    const { data: job, error: jobError } = await client
      .from('inspiration_jobs')
      .insert({
        user_id: user.id,
        job_type: 'analyze',
        source_story_id: sourceStoryId,
        status: 'pending',
        step_message: 'Đang khởi tạo phân tích...',
        progress: 2
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[ANALYZE API] Failed to create job:', jobError);
      return NextResponse.json({ error: 'Failed to create analysis job' }, { status: 500 });
    }

    console.log(`[ANALYZE API] Created job ${job.id} for source story ${sourceStoryId}`);

    // Start analysis asynchronously
    (async () => {
      try {
        const { AIStoryInspiration } = await import('@/services/ai-story-inspiration');
        const analyzer = new AIStoryInspiration(job.id, client);
        
        // Configure AI if params provided
        if (config) {
          analyzer.configureAI(
            config.provider || 'gemini' as AIProviderType,
            config.model || 'gemini-3-flash-preview',
            config.temperature
          );
        }
        
        await analyzer.analyzeSourceStory(sourceStoryId);
        console.log(`[ANALYZE API] Analysis completed for job ${job.id}`);
      } catch (err) {
        console.error(`[ANALYZE API] Error in async analysis:`, err);
        const again = createSupabaseFromAuthHeader(request).client;
        if (again && job.id) {
          await again.from('inspiration_jobs').update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
            step_message: 'Lỗi khi phân tích truyện.'
          }).eq('id', job.id);
        }
      }
    })();

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start analysis';
    console.error('[ANALYZE API] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}