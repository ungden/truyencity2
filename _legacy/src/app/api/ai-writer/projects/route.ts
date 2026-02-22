import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { GENRE_CONFIG } from '@/lib/types/genre-config';
import { revalidatePath } from 'next/cache';
import { assignAuthorToStory } from '@/services/story-writing-factory/author-assigner';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';

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

    const { data: projects, error } = await client
      .from('ai_story_projects')
      .select(`
        *,
        novel:novels(id, title, author, cover_url)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    let {
      novel_id,
      novel_title,
      novel_author,
      novel_description,
      cover_url,
      genre = 'tien-hiep',
      topic,
      main_character,
      cultivation_system,
      magic_system,
      modern_setting,
      tech_level,
      historical_period,
      original_work,
      game_system,
      world_description,
      writing_style = 'webnovel_chinese',
      target_chapter_length = 2500,
      ai_model = 'deepseek/deepseek-chat-v3-0324',
      temperature = 0.7,
      total_planned_chapters = 100,
      ai_author_id,
    } = body;

    if (!GENRE_CONFIG[genre as keyof typeof GENRE_CONFIG]) {
      return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
    }

    // Auto-assign author if not provided
    let assignedAuthorId = ai_author_id;
    let assignedAuthorName = novel_author;

    if (!assignedAuthorId) {
      try {
        const authorResult = await assignAuthorToStory({
          genre,
          preferredAuthorId: ai_author_id,
          createIfNotFound: true,
          useAI: false, // Use quick generation for speed
        });

        if (authorResult) {
          assignedAuthorId = authorResult.authorId;
          assignedAuthorName = authorResult.authorName;
          console.log(`Auto-assigned author: ${authorResult.authorName} (${authorResult.isNewAuthor ? 'new' : 'existing'})`);
        }
      } catch (authorError) {
        console.warn('Auto-assign author failed (non-critical):', authorError);
        // Continue without author - not a blocking error
      }
    }

    if (!novel_id) {
      if (!novel_title) {
        return NextResponse.json({ error: 'Novel title is required for new novels' }, { status: 400 });
      }
      const { data: newNovel, error: novelInsertError } = await client
        .from('novels')
        .insert({
          title: novel_title,
          author: assignedAuthorName || null,
          description: novel_description || null,
          status: 'Đang ra',
          genres: [genre, topic].filter(Boolean) as string[],
          cover_url: cover_url || null,
          ai_author_id: assignedAuthorId || null,
        })
        .select('id')
        .single();

      if (novelInsertError || !newNovel?.id) {
        console.error('Novel insert error:', novelInsertError);
        // Trả lỗi cụ thể, ưu tiên báo quyền nếu nghi ngờ do RLS
        const errMsg =
          (novelInsertError?.message && novelInsertError.message.includes('row-level security'))
            ? 'Bạn không có quyền tạo truyện mới. Vui lòng chọn truyện có sẵn hoặc liên hệ admin.'
            : (novelInsertError?.message || 'Failed to create new novel');
        return NextResponse.json({ error: errMsg }, { status: 403 });
      }
      novel_id = newNovel.id;
    } else {
      // If linking to an existing novel, update its cover and author if needed
      if (cover_url || assignedAuthorId) {
        const updatePayload: Record<string, any> = {};
        if (cover_url) updatePayload.cover_url = cover_url;
        if (assignedAuthorId) {
          updatePayload.ai_author_id = assignedAuthorId;
          updatePayload.author = assignedAuthorName;
        }
        const { error: novelUpdateError } = await client
          .from('novels')
          .update(updatePayload)
          .eq('id', novel_id);

        if (novelUpdateError) {
          console.error('Novel update error on existing novel:', novelUpdateError);
          return NextResponse.json({ error: 'Failed to update novel' }, { status: 500 });
        }
      }
    }

    if (!novel_id || !main_character) {
      return NextResponse.json({ error: 'Novel ID and main character are required' }, { status: 400 });
    }

    const { data: novel, error: novelError } = await client
      .from('novels')
      .select('id, title, author, ai_author_id')
      .eq('id', novel_id)
      .single();

    if (novelError || !novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const { data: project, error: insertError } = await client
      .from('ai_story_projects')
      .insert({
        user_id: user.id,
        novel_id,
        genre,
        main_character,
        cultivation_system,
        magic_system,
        modern_setting,
        tech_level,
        historical_period,
        original_work,
        game_system,
        world_description,
        writing_style,
        target_chapter_length,
        ai_model,
        temperature,
        total_planned_chapters
      })
      .select(`
        *,
        novel:novels(id, title, author, cover_url)
      `)
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    revalidatePath('/admin/novels');
    revalidatePath('/admin/ai-writer');

    // Asynchronously generate Master Outline in the background
    // We don't await this because it can take 10-30 seconds and we don't want to block the UI
    const synopsis = world_description || `Truyện ${genre} về nhân vật chính ${main_character}. ${original_work || ''}`;
    generateMasterOutline(
      project.id,
      novel_title || novel.title,
      genre as any,
      synopsis,
      total_planned_chapters,
      { model: 'gemini-3-flash-preview', temperature: 0.7, maxTokens: 2048 }
    ).catch(e => console.error('Failed to generate master outline in background:', e));


    return NextResponse.json({ project });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
      projectId,
      genre,
      main_character,
      cultivation_system,
      magic_system,
      modern_setting,
      tech_level,
      historical_period,
      original_work,
      game_system,
      world_description,
      writing_style,
      target_chapter_length,
      ai_model,
      temperature,
      total_planned_chapters,
      cover_url,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required for update' }, { status: 400 });
    }

    // First, get the project to find its associated novel_id
    const { data: existingProject, error: fetchError } = await client
      .from('ai_story_projects')
      .select('novel_id, novel:novels(cover_url)')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found or permission denied' }, { status: 404 });
    }

    // If a new cover_url is provided and it's different, update the novel
    // The joined 'novel' can be an array, so we access the first element safely.
    if (cover_url && cover_url !== existingProject.novel?.[0]?.cover_url) {
      const { error: novelUpdateError } = await client
        .from('novels')
        .update({ cover_url: cover_url })
        .eq('id', existingProject.novel_id);

      if (novelUpdateError) {
        console.error('Novel cover update error:', novelUpdateError);
        return NextResponse.json({ error: 'Failed to update novel cover' }, { status: 500 });
      }
    }

    const { data: updatedProject, error: updateError } = await client
      .from('ai_story_projects')
      .update({
        genre,
        main_character,
        cultivation_system,
        magic_system,
        modern_setting,
        tech_level,
        historical_period,
        original_work,
        game_system,
        world_description,
        writing_style,
        target_chapter_length,
        ai_model,
        temperature,
        total_planned_chapters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select(`
        *,
        novel:novels(id, title, author, cover_url)
      `)
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found or permission denied' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}