/**
 * Toggle `style_directives.production_enabled` for a project (Phase Q gate).
 * Project must be `status='active'` AND production_enabled=true to be picked
 * up by the daily-quota cron (50 ch/day default).
 *
 * Usage:
 *   npx tsx scripts/toggle-production.ts <projectId> on
 *   npx tsx scripts/toggle-production.ts <projectId> off
 *   npx tsx scripts/toggle-production.ts list                 # show all enabled
 *   npx tsx scripts/toggle-production.ts list --status=active
 *
 * Side effects when turning ON:
 *   - status → 'active' (also clears pause_reason if set)
 *   - ai_model → gemini-3.1-flash-lite (if currently a DeepSeek model)
 *   - production_daily_chapter_quota → 50 (if not set)
 *   - Today's project_daily_quotas row seeded at target=50 if missing
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DAILY_TARGET = 50;

function vietnamDate(): string {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
}

async function listEnabled(filterStatus?: string) {
  const q = s.from('ai_story_projects')
    .select('id, status, ai_model, current_chapter, total_planned_chapters, style_directives, novels!ai_story_projects_novel_id_fkey(title)')
    .filter('style_directives->>production_enabled', 'eq', 'true')
    .order('updated_at', { ascending: false });
  const r = filterStatus ? await q.eq('status', filterStatus) : await q;
  if (r.error) { console.error(r.error.message); return; }
  const rows = r.data || [];
  console.log(`━━ ${rows.length} project(s) with production_enabled=true${filterStatus ? ' status=' + filterStatus : ''} ━━`);
  for (const p of rows) {
    const n = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    const sd = p.style_directives as Record<string, unknown> | null;
    const quota = sd?.production_daily_chapter_quota ?? '(default)';
    console.log(`  ${p.id} | ${p.status.padEnd(8)} | ${p.ai_model?.padEnd(24)} | ch.${p.current_chapter}/${p.total_planned_chapters} | quota=${quota} | ${n?.title}`);
  }
}

async function setFlag(projectId: string, enabled: boolean) {
  const { data: cur, error: getErr } = await s.from('ai_story_projects')
    .select('id, status, pause_reason, ai_model, style_directives, current_chapter, novel_id, novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', projectId)
    .single();
  if (getErr || !cur) {
    console.error(`Project ${projectId} not found: ${getErr?.message}`);
    process.exit(1);
  }
  const novelTitle = (Array.isArray(cur.novels) ? cur.novels[0] : cur.novels)?.title;
  const existing = (cur.style_directives as Record<string, unknown> | null) || {};

  const nextDirectives: Record<string, unknown> = { ...existing, production_enabled: enabled };
  if (enabled && existing.production_daily_chapter_quota == null) {
    nextDirectives.production_daily_chapter_quota = DAILY_TARGET;
  }

  const updates: Record<string, unknown> = { style_directives: nextDirectives };

  if (enabled) {
    if (cur.status !== 'active') updates.status = 'active';
    if (cur.pause_reason) updates.pause_reason = null;
    if (cur.ai_model?.startsWith('deepseek-')) updates.ai_model = 'gemini-3.1-flash-lite';
  }

  const upd = await s.from('ai_story_projects').update(updates).eq('id', projectId);
  if (upd.error) { console.error(upd.error.message); process.exit(1); }

  console.log(`${enabled ? '✓ ENABLED' : '✓ DISABLED'} production for ${projectId} (${novelTitle})`);
  if (enabled) {
    // Seed today's quota row if missing.
    const date = vietnamDate();
    const existingQuota = await s.from('project_daily_quotas')
      .select('vn_date, target_chapters, written_chapters, status')
      .eq('project_id', projectId).eq('vn_date', date).maybeSingle();
    if (!existingQuota.data) {
      const ins = await s.from('project_daily_quotas').insert({
        project_id: projectId,
        vn_date: date,
        target_chapters: DAILY_TARGET,
        written_chapters: cur.current_chapter ?? 0,
        status: 'active',
      });
      if (ins.error) console.warn(`(quota insert failed: ${ins.error.message})`);
      else console.log(`  ↳ seeded today's quota: target=${DAILY_TARGET}, written=${cur.current_chapter ?? 0}`);
    } else if (existingQuota.data.status === 'completed') {
      console.log(`  ↳ today's quota already completed (written=${existingQuota.data.written_chapters}/${existingQuota.data.target_chapters})`);
    } else {
      console.log(`  ↳ today's quota: ${existingQuota.data.written_chapters}/${existingQuota.data.target_chapters} (${existingQuota.data.status})`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'list') {
    const statusArg = args.find((a) => a.startsWith('--status='));
    await listEnabled(statusArg ? statusArg.split('=')[1] : undefined);
    return;
  }

  // Toggle form: <projectId> <on|off>
  const projectId = cmd;
  const action = (args[1] || '').toLowerCase();
  if (!projectId.match(/^[0-9a-f-]{36}$/i)) {
    console.error(`Invalid project id "${projectId}". Usage: npx tsx scripts/toggle-production.ts <uuid> [on|off]`);
    process.exit(1);
  }
  if (action !== 'on' && action !== 'off') {
    console.error(`Action must be "on" or "off". Got "${action}".`);
    process.exit(1);
  }
  await setFlag(projectId, action === 'on');
  await listEnabled('active');
}

main().catch((e) => { console.error(e); process.exit(1); });
