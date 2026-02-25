/**
 * Story Runner Project API
 * 
 * GET: Get project status, chapters, logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const supabase = getSupabaseAdmin();

    // Pagination params for chapters (default: last 100)
    const limitParam = request.nextUrl.searchParams.get('limit');
    const offsetParam = request.nextUrl.searchParams.get('offset');
    const chapterLimit = Math.min(Number(limitParam) || 100, 500);
    const chapterOffset = Number(offsetParam) || 0;

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('ai_story_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get total chapter count (DB-level, no row fetching)
    const { count: totalChapterCount } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })
      .eq('novel_id', project.novel_id);

    // Get chapters (paginated)
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, chapter_number, title, created_at')
      .eq('novel_id', project.novel_id)
      .order('chapter_number', { ascending: true })
      .range(chapterOffset, chapterOffset + chapterLimit - 1);

    // Get quality data
    const { data: styleData } = await supabase
      .from('writing_style_analytics')
      .select('chapter_number, overall_score')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: true });

    // Get character profiles
    const { data: characters } = await supabase
      .from('character_depth_profiles')
      .select('name, role, primary_motivation, first_appearance')
      .eq('project_id', projectId);

    // Get battle records
    const { data: battles } = await supabase
      .from('battle_records')
      .select('chapter_number, battle_type, outcome, variety_score')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: true });

    const total = totalChapterCount ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        project,
        chapters: chapters || [],
        qualityScores: styleData || [],
        characters: characters || [],
        battles: battles || [],
        pagination: {
          total,
          limit: chapterLimit,
          offset: chapterOffset,
        },
        stats: {
          totalChapters: total,
          targetChapters: project.total_planned_chapters,
          progress: total
            ? Math.round((total / project.total_planned_chapters) * 100)
            : 0,
          avgQuality: styleData?.length
            ? Math.round(styleData.reduce((sum, s) => sum + (s.overall_score || 0), 0) / styleData.length)
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('[API] Story runner project error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
