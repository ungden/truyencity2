import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { supabase } from '@/integrations/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { client: userClient, token } = createSupabaseFromAuthHeader(request);
    if (!userClient || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, novelId } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Create a job record in the database
    const { data: job, error: jobError } = await userClient
      .from('ai_image_jobs')
      .insert({
        user_id: user.id,
        novel_id: novelId, // This can be null for new novels
        prompt: prompt,
        status: 'pending',
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('Failed to create image job record:', jobError);
      return NextResponse.json({ error: 'Failed to create image job' }, { status: 500 });
    }

    // Invoke the edge function asynchronously (fire-and-forget)
    supabase.functions.invoke('gemini-cover-generate', {
      body: { jobId: job.id, prompt },
    }).catch(err => {
      console.error("Error invoking edge function (fire-and-forget):", err);
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start image generation';
    console.error('Error in POST /api/ai-image/jobs:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}