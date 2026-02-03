import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

// GET: List user's story outlines
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
    const id = searchParams.get('id');

    if (id) {
      // Get specific outline with full details
      const { data: outline, error } = await client
        .from('story_outlines')
        .select(`
          *,
          story_analysis(
            id,
            detected_genre,
            full_plot_summary,
            characters,
            source_stories(title, author)
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !outline) {
        return NextResponse.json({ error: 'Outline not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: outline });
    }

    // List all outlines
    const { data: outlines, error } = await client
      .from('story_outlines')
      .select(`
        id,
        title,
        tagline,
        genre,
        main_character_name,
        total_planned_chapters,
        status,
        ai_project_id,
        novel_id,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: outlines });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch outlines';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove an outline
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Outline ID is required' }, { status: 400 });
    }

    const { error } = await client
      .from('story_outlines')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete outline';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
