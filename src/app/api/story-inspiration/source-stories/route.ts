import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

// GET: List user's source stories
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

    const { data: stories, error } = await client
      .from('source_stories')
      .select(`
        *,
        story_analysis(id, detected_genre, full_plot_summary)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: stories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch source stories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Import a new source story
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

    const body = await request.json();
    const { title, author, source_url, content, total_chapters } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const { data: story, error } = await client
      .from('source_stories')
      .insert({
        user_id: user.id,
        title,
        author,
        source_url,
        content,
        total_chapters: total_chapters || 1,
        analysis_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: story });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import source story';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove a source story
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
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    const { error } = await client
      .from('source_stories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete source story';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
