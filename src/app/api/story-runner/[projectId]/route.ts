/**
 * Story Runner Project API
 * 
 * GET: Get project status, chapters, logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabaseAdmin();

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

    // Get chapters
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, chapter_number, title, created_at')
      .eq('novel_id', project.novel_id)
      .order('chapter_number', { ascending: true });

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

    return NextResponse.json({
      success: true,
      data: {
        project,
        chapters: chapters || [],
        qualityScores: styleData || [],
        characters: characters || [],
        battles: battles || [],
        stats: {
          totalChapters: chapters?.length || 0,
          targetChapters: project.total_planned_chapters,
          progress: chapters?.length
            ? Math.round((chapters.length / project.total_planned_chapters) * 100)
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
