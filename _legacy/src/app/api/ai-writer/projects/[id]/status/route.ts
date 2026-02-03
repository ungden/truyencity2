import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const projectId = id;
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();
    if (!['active', 'paused'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const { data: updatedProject, error: updateError } = await client
      .from('ai_story_projects')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id) // Security check
      .select(`
        *,
        novel:novels(id, title, author)
      `)
      .single();

    if (updateError) {
      console.error('Status update error:', updateError);
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found or permission denied' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 });
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}