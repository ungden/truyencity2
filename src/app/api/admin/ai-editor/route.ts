import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { aiEditorService } from '@/services/story-writing-factory/ai-editor';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Number(request.nextUrl.searchParams.get('limit') || '25');
    const dashboard = await aiEditorService.getDashboard(limit);

    return NextResponse.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action === 'scan') {
      const result = await aiEditorService.runDailyScan({
        maxProjects: 250,
        lowScoreThreshold: 65,
      });
      return NextResponse.json({ success: true, action, result });
    }

    if (action === 'rewrite') {
      const result = await aiEditorService.processRewriteWorker({
        maxJobs: 1,
        maxChaptersPerJob: 2,
      });
      return NextResponse.json({ success: true, action, result });
    }

    if (action === 'cancel_job') {
      const jobId = body?.jobId as string | undefined;
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('rewrite_chain_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .in('status', ['pending', 'running']);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action, jobId });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
