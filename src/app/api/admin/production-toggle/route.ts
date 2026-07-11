/**
 * Admin endpoint: list / toggle `style_directives.production_enabled` on
 * `ai_story_projects`. Mirrors scripts/toggle-production.ts.
 *
 * GET  → list enabled novels + today's quota + recent write rate.
 * POST { projectId, enabled } → flip flag (and side-effects when turning on).
 *
 * Auth: requires admin (isAuthorizedAdmin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getVietnamDayBounds } from '@/lib/utils/vietnam-time';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DAILY_TARGET = 50;

const toggleSchema = z.object({
  projectId: z.string().uuid(),
  enabled: z.boolean(),
});

interface ProjectStyleDirectives {
  production_enabled?: boolean;
  production_daily_chapter_quota?: number;
  [k: string]: unknown;
}

interface ProductionRow {
  id: string;
  status: string;
  ai_model: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  style_directives: ProjectStyleDirectives | null;
  pause_reason: string | null;
  novels: { title: string | null }[] | { title: string | null } | null;
}

function vnDate(): string {
  return getVietnamDayBounds(new Date()).vnDate;
}

function flattenNovels(row: ProductionRow): string {
  const n = Array.isArray(row.novels) ? row.novels[0] : row.novels;
  return n?.title ?? '(untitled)';
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getSupabaseAdmin();
    const date = vnDate();

    const projectsRes = await db
      .from('ai_story_projects')
      .select('id, status, ai_model, current_chapter, total_planned_chapters, style_directives, pause_reason, updated_at, novels!ai_story_projects_novel_id_fkey(title)')
      .filter('style_directives->>production_enabled', 'eq', 'true')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (projectsRes.error) return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });

    const projects = (projectsRes.data || []) as ProductionRow[];
    const projectIds = projects.map((p) => p.id);

    // Today's quotas
    const quotaRes = projectIds.length
      ? await db.from('project_daily_quotas')
        .select('project_id, target_chapters, written_chapters, status, next_due_at, last_error')
        .in('project_id', projectIds)
        .eq('vn_date', date)
      : { data: [], error: null };
    if (quotaRes.error) return NextResponse.json({ error: quotaRes.error.message }, { status: 500 });
    const quotaMap = new Map<string, { target: number; written: number; status: string; next_due_at: string | null; last_error: string | null }>();
    for (const q of quotaRes.data || []) {
      quotaMap.set(q.project_id, {
        target: q.target_chapters,
        written: q.written_chapters,
        status: q.status,
        next_due_at: q.next_due_at,
        last_error: q.last_error,
      });
    }

    const rows = projects.map((p) => {
      const q = quotaMap.get(p.id);
      const directives = p.style_directives || {};
      return {
        projectId: p.id,
        title: flattenNovels(p),
        status: p.status,
        pauseReason: p.pause_reason,
        aiModel: p.ai_model,
        currentChapter: p.current_chapter ?? 0,
        totalPlanned: p.total_planned_chapters ?? 0,
        quota: directives.production_daily_chapter_quota ?? DAILY_TARGET,
        today: q ? { target: q.target, written: q.written, status: q.status, lastError: q.last_error } : null,
      };
    });

    return NextResponse.json({
      date,
      defaultDailyTarget: DAILY_TARGET,
      enabledCount: rows.length,
      rows,
    });
  } catch (e) {
    console.error('[admin/production-toggle GET] error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { projectId, enabled } = parsed.data;

    const db = getSupabaseAdmin();
    const { data: cur, error: getErr } = await db
      .from('ai_story_projects')
      .select('id, status, pause_reason, ai_model, style_directives, current_chapter, novels!ai_story_projects_novel_id_fkey(title)')
      .eq('id', projectId)
      .single();
    if (getErr || !cur) {
      return NextResponse.json({ error: `Project ${projectId} not found` }, { status: 404 });
    }

    const existing = (cur.style_directives as ProjectStyleDirectives | null) || {};
    if (enabled && cur.pause_reason?.startsWith('legacy_archived_')) {
      return NextResponse.json({ error: 'legacy_archived_project_cannot_enable_production' }, { status: 409 });
    }
    const nextDirectives: ProjectStyleDirectives = { ...existing, production_enabled: enabled };
    if (enabled && existing.production_daily_chapter_quota == null) {
      nextDirectives.production_daily_chapter_quota = DAILY_TARGET;
    }

    const updates: Record<string, unknown> = { style_directives: nextDirectives };
    if (enabled) {
      if (cur.status !== 'active') updates.status = 'active';
      if (cur.pause_reason) updates.pause_reason = null;
      if (cur.ai_model?.startsWith('deepseek-')) updates.ai_model = 'gemini-3.1-flash-lite';
    }

    const upd = await db.from('ai_story_projects').update(updates).eq('id', projectId);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    // Seed today's quota row on enable (idempotent).
    let quotaInfo: { seeded?: boolean; row?: unknown } = {};
    if (enabled) {
      const date = vnDate();
      const existingQuota = await db
        .from('project_daily_quotas')
        .select('vn_date, target_chapters, written_chapters, status')
        .eq('project_id', projectId).eq('vn_date', date).maybeSingle();
      if (!existingQuota.data) {
        const ins = await db.from('project_daily_quotas').insert({
          project_id: projectId,
          vn_date: date,
          target_chapters: DAILY_TARGET,
          written_chapters: cur.current_chapter ?? 0,
          status: 'active',
        });
        if (!ins.error) quotaInfo = { seeded: true };
      } else {
        quotaInfo = { row: existingQuota.data };
      }
    }

    const title = (Array.isArray(cur.novels) ? cur.novels[0] : cur.novels)?.title;
    return NextResponse.json({
      projectId,
      enabled,
      title,
      quota: quotaInfo,
    });
  } catch (e) {
    console.error('[admin/production-toggle POST] error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
