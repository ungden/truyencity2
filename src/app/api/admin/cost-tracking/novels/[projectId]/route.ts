/**
 * GET /api/admin/cost-tracking/novels/[projectId]
 *
 * Per-novel detail: chapter-by-chapter cost breakdown + task/model breakdown.
 * Returns:
 *   - chapters: rows from get_chapter_costs(projectId)
 *   - tasks: rows from get_novel_cost_detail(projectId)
 *   - novel: title, current_chapter, total_cost
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
      return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const [chaptersRes, tasksRes, projectRes] = await Promise.all([
      supabase.rpc('get_chapter_costs', { p_project_id: projectId }),
      supabase.rpc('get_novel_cost_detail', { p_project_id: projectId }),
      supabase
        .from('ai_story_projects')
        .select('id,novel_id,current_chapter,status,ai_model,novels!ai_story_projects_novel_id_fkey(id,title,slug)')
        .eq('id', projectId)
        .single(),
    ]);

    if (projectRes.error || !projectRes.data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectRes.data;
    const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;

    const chapters = (chaptersRes.data || []) as Array<{
      chapter_number: number;
      total_cost: string;
      input_tokens: number;
      output_tokens: number;
      call_count: number;
      models: Record<string, number>;
      tasks: Record<string, number>;
    }>;

    const tasks = (tasksRes.data || []) as Array<{
      task: string;
      model: string;
      call_count: number;
      input_tokens: number;
      output_tokens: number;
      total_cost: string;
    }>;

    const grandTotal = tasks.reduce((s, t) => s + Number(t.total_cost), 0);

    return NextResponse.json({
      success: true,
      novel: {
        project_id: project.id,
        novel_id: novel?.id,
        title: novel?.title,
        slug: novel?.slug,
        current_chapter: project.current_chapter,
        status: project.status,
        ai_model: project.ai_model,
      },
      summary: {
        total_cost: Math.round(grandTotal * 10000) / 10000,
        chapters_with_cost: chapters.length,
        avg_cost_per_chapter: chapters.length > 0
          ? Math.round((grandTotal / chapters.length) * 10000) / 10000
          : 0,
      },
      chapters: chapters.map(c => ({
        ...c,
        total_cost: Number(c.total_cost),
      })),
      tasks: tasks.map(t => ({
        ...t,
        total_cost: Number(t.total_cost),
      })),
    });
  } catch (error) {
    console.error('[NovelCostDetail] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
