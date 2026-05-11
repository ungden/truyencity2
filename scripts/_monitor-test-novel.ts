/**
 * Monitor end-to-end test novel: Đại Việt Án Bộ (e0723bd9).
 * Polls setup_stage + chapter count every poll.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const PROJECT_ID = 'e0723bd9-bfec-4bc4-939a-37e12e784ca0';
const NOVEL_TITLE = 'Đại Việt Án Bộ: Pháp Y Vợ Tể Tướng Thăng Long';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: project } = await db
    .from('ai_story_projects')
    .select('id, status, setup_stage, setup_stage_attempts, setup_stage_error, current_chapter, novel_id, story_outline, master_outline, world_description, main_character')
    .eq('id', PROJECT_ID)
    .single();
  if (!project) {
    console.log('Project not found');
    return;
  }

  const { count: chapterCount } = await db
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', project.novel_id);
  const { count: versionCount } = await db
    .from('chapter_versions')
    .select('*', { count: 'exact', head: true })
    .eq('chapter_id', project.novel_id);
  const { count: blueprintCount } = await db
    .from('chapter_blueprints')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', PROJECT_ID);
  const { data: costs } = await db
    .from('cost_tracking')
    .select('task, total_cost_usd, model, created_at')
    .eq('project_id', PROJECT_ID)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\n━━━━ ${NOVEL_TITLE.slice(0, 60)} ━━━━`);
  console.log(`Status:            ${project.status}`);
  console.log(`Setup stage:       ${project.setup_stage}  (attempts: ${project.setup_stage_attempts ?? 0})`);
  if (project.setup_stage_error) console.log(`Setup error:       ${project.setup_stage_error}`);
  console.log(`MC:                ${project.main_character}`);
  console.log(`World desc:        ${(project.world_description ?? '').length} chars`);
  console.log(`story_outline:     ${project.story_outline ? '✓ populated' : '✗ empty'}`);
  console.log(`master_outline:    ${project.master_outline ? '✓ populated' : '✗ empty'}`);
  console.log(`Chapter blueprints:${blueprintCount ?? 0}`);
  console.log(`Current chapter:   ${project.current_chapter}`);
  console.log(`Chapters in DB:    ${chapterCount ?? 0}`);
  console.log(`Versions logged:   ${versionCount ?? 0}`);

  if (costs && costs.length > 0) {
    const total = costs.reduce((s, c) => s + (c.total_cost_usd || 0), 0);
    console.log(`\nRecent costs (latest 10, total $${total.toFixed(4)}):`);
    for (const c of costs) {
      console.log(`  ${c.created_at.slice(11, 19)}  ${c.task.padEnd(22)} ${c.model.padEnd(22)} $${(c.total_cost_usd || 0).toFixed(4)}`);
    }
  } else {
    console.log(`\nNo cost_tracking rows yet — cron chưa pickup hoặc setup chưa fire.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
