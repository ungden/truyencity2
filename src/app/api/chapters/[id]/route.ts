import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';
import { revalidatePath } from 'next/cache';

export const maxDuration = 30;

export const DELETE = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params;
    const chapterId = id;
    const { client, token } = createSupabaseFromAuthHeader(request);

    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chapter info early
    const { data: chapter, error: chapterErr } = await client
      .from('chapters')
      .select('novel_id, chapter_number')
      .eq('id', chapterId)
      .single();

    if (chapterErr || !chapter) {
      return NextResponse.json({ error: 'Không tìm thấy chương' }, { status: 404 });
    }

    // Check role
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // If not admin, allow project owner of this novel to delete
    let isAllowed = profile?.role === 'admin';
    if (!isAllowed) {
      const { data: ownerProject } = await client
        .from('ai_story_projects')
        .select('id')
        .eq('user_id', user.id)
        .eq('novel_id', chapter.novel_id)
        .limit(1)
        .maybeSingle();
      isAllowed = !!ownerProject?.id;
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa chương' }, { status: 403 });
    }

    // Cleanup references first
    await Promise.all([
      client.from('reading_progress').delete().eq('chapter_id', chapterId),
      client.from('chapter_reads').delete().eq('chapter_id', chapterId),
      client.from('reading_sessions').delete().eq('chapter_id', chapterId),
      client.from('comments').delete().eq('chapter_id', chapterId),
    ]);

    // Delete chapter
    const { error: deleteError } = await client.from('chapters').delete().eq('id', chapterId);
    if (deleteError) {
      console.error('[chapters] Delete error:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa chương' }, { status: 500 });
    }

    // Delete story graph from this chapter number
    const { data: projects } = await client
      .from('ai_story_projects')
      .select('id')
      .eq('novel_id', chapter.novel_id);

    if (projects && projects.length > 0) {
      const projectIds = projects.map((p: { id: string }) => p.id);

      await client
        .from('story_graph_nodes')
        .delete()
        .eq('chapter_number', chapter.chapter_number)
        .in('project_id', projectIds);

      await client
        .from('story_graph_edges')
        .delete()
        .or(`from_chapter.eq.${chapter.chapter_number},to_chapter.eq.${chapter.chapter_number}`)
        .in('project_id', projectIds);
    }

    // Sync current_chapter to max remaining
    const { data: remainingChapters } = await client
      .from('chapters')
      .select('chapter_number')
      .eq('novel_id', chapter.novel_id)
      .order('chapter_number', { ascending: false })
      .limit(1);

    const maxChapterNumber = remainingChapters?.[0]?.chapter_number || 0;

    await client
      .from('ai_story_projects')
      .update({
        current_chapter: maxChapterNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('novel_id', chapter.novel_id);

    revalidatePath(`/admin/novels/${chapter.novel_id}`);
    revalidatePath('/admin/novels');
    revalidatePath('/admin/ai-writer');

    return NextResponse.json({
      success: true,
      message: `Đã xóa chương ${chapter.chapter_number}, dọn dữ liệu liên quan và đồng bộ tiến độ dự án`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};