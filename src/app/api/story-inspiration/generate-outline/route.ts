import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { AIProviderType } from '@/lib/types/ai-providers';

// POST: Generate inspired outline from analysis
export async function POST(request: NextRequest) {
  console.log('[GENERATE OUTLINE API] Received request.');
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
      source_analysis_id,
      new_title,
      main_character_name,
      main_character_description,
      genre_override,
      total_chapters,
      transformation_style,
      config // New config object for AI settings
    } = body;

    if (!source_analysis_id || !new_title || !main_character_name) {
      return NextResponse.json({
        error: 'source_analysis_id, new_title, and main_character_name are required'
      }, { status: 400 });
    }

    // Verify analysis exists and user has access
    const { data: analysis, error: analysisError } = await client
      .from('story_analysis')
      .select('id, source_stories!inner(user_id)')
      .eq('id', source_analysis_id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Create job record
    const { data: job, error: jobError } = await client
      .from('inspiration_jobs')
      .insert({
        user_id: user.id,
        job_type: 'outline',
        status: 'pending',
        step_message: 'Đang khởi tạo tạo outline...',
        progress: 2
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[GENERATE OUTLINE API] Failed to create job:', jobError);
      return NextResponse.json({ error: 'Failed to create outline job' }, { status: 500 });
    }

    console.log(`[GENERATE OUTLINE API] Created job ${job.id}`);

    // Start outline generation asynchronously
    (async () => {
      try {
        const { AIStoryInspiration } = await import('@/services/ai-story-inspiration');
        const generator = new AIStoryInspiration(job.id, client);
        
        // Configure AI if params provided
        if (config) {
          generator.configureAI(
            config.provider || 'openrouter' as AIProviderType,
            config.model || 'deepseek/deepseek-chat-v3-0324',
            config.temperature
          );
        }

        await generator.generateInspiredOutline({
          source_analysis_id,
          new_title,
          main_character_name,
          main_character_description,
          genre_override,
          total_chapters: total_chapters || 100,
          transformation_style: transformation_style || 'similar'
        });
        console.log(`[GENERATE OUTLINE API] Outline generation completed for job ${job.id}`);
      } catch (err) {
        console.error(`[GENERATE OUTLINE API] Error in async generation:`, err);
        const again = createSupabaseFromAuthHeader(request).client;
        if (again && job.id) {
          await again.from('inspiration_jobs').update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
            step_message: 'Lỗi khi tạo outline.'
          }).eq('id', job.id);
        }
      }
    })();

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate outline';
    console.error('[GENERATE OUTLINE API] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}