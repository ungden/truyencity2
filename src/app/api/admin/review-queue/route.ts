/**
 * Quality Overhaul 1.4/1.5 — admin review queue endpoint.
 *
 * GET  → pending review queue rows + projects currently under quality_hold.
 * PATCH { id, status } → resolve/dismiss a queue row.
 * POST { action: 'clear_quality_hold', projectId } → admin Resume button:
 *   clears style_directives.quality_hold so the write cron picks the project
 *   back up on its next tick.
 *
 * Auth: requires admin (isAuthorizedAdmin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
});

const postSchema = z.object({
  action: z.literal('clear_quality_hold'),
  projectId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const [queue, held] = await Promise.all([
      supabase
        .from('admin_review_queue')
        .select('id, project_id, novel_id, chapter_number, reason, detail, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('ai_story_projects')
        .select('id, current_chapter, style_directives, novels!ai_story_projects_novel_id_fkey(title)')
        .eq('style_directives->>quality_hold', 'true'),
    ]);
    if (queue.error) throw queue.error;
    return NextResponse.json({
      queue: queue.data || [],
      heldProjects: held.data || [],
    });
  } catch (e) {
    console.error('[admin/review-queue] GET failed:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = patchSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = { status: body.data.status };
    if (body.data.status === 'resolved' || body.data.status === 'dismissed') {
      update.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('admin_review_queue')
      .update(update)
      .eq('id', body.data.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/review-queue] PATCH failed:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = postSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: project, error: loadErr } = await supabase
      .from('ai_story_projects')
      .select('style_directives')
      .eq('id', body.data.projectId)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const directives = (project.style_directives as Record<string, unknown> | null) || {};
    delete directives.quality_hold;
    const { error } = await supabase
      .from('ai_story_projects')
      .update({ style_directives: directives, updated_at: new Date().toISOString() })
      .eq('id', body.data.projectId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/review-queue] POST failed:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
