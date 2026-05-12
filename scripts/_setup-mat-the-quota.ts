/**
 * Seed today's project_daily_quotas row for Mạt Thế with target=50.
 * Cron will write toward this target until it hits 50.
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

const PID = 'c97b1d28-3421-44bb-bcfe-98055c44943a';

function vietnamDate(): string {
  // VN = UTC+7
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
}

async function main() {
  const date = vietnamDate();

  // Ensure project is active with Gemini routing.
  const { data: cur } = await s.from('ai_story_projects').select('status, style_directives, ai_model, current_chapter, novel_id').eq('id', PID).single();
  console.log('current state:', { status: cur?.status, ai_model: cur?.ai_model, current_chapter: cur?.current_chapter });

  await s.from('ai_story_projects').update({
    status: 'active',
    pause_reason: null,
    ai_model: 'gemini-3.1-flash-lite',
    setup_stage: 'writing',
    style_directives: { ...(cur?.style_directives || {}), require_full_chapter_blueprint: false, chapter_blueprint_version: null, disable_chapter_split: true, production_daily_chapter_quota: 50 },
  }).eq('id', PID);

  // Upsert today's quota row.
  const existing = await s.from('project_daily_quotas').select('*').eq('project_id', PID).eq('vn_date', date).maybeSingle();
  if (existing.data) {
    await s.from('project_daily_quotas').update({
      target_chapters: 50,
      status: 'active',
    }).eq('project_id', PID).eq('vn_date', date);
    console.log(`✓ Updated quota row for ${date} → target=50, status=active`);
  } else {
    const ins = await s.from('project_daily_quotas').insert({
      project_id: PID,
      vn_date: date,
      target_chapters: 50,
      written_chapters: cur?.current_chapter ?? 0,
      status: 'active',
    });
    if (ins.error) {
      console.warn('insert err:', ins.error.message);
    } else {
      console.log(`✓ Inserted quota row for ${date} → target=50, written=${cur?.current_chapter ?? 0}`);
    }
  }

  // Confirm
  const after = await s.from('project_daily_quotas').select('*').eq('project_id', PID).eq('vn_date', date).single();
  console.log('\nFinal quota row:', JSON.stringify(after.data, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
