import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const PID = 'c97b1d28-3421-44bb-bcfe-98055c44943a';
  const NID = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';

  const { data: project } = await s.from('ai_story_projects')
    .select('id, setup_stage, setup_stage_error, status, main_character, world_description, master_outline, story_outline')
    .eq('id', PID).single();
  if (!project) return;

  console.log('━━━ PROJECT STATE ━━━');
  console.log('setup_stage:', project.setup_stage, 'status:', project.status);
  console.log('setup_stage_error:', project.setup_stage_error);
  console.log('MC:', project.main_character);
  console.log('world_description length:', project.world_description?.length ?? 0);

  console.log('\n━━━ MASTER OUTLINE keys ━━━');
  if (project.master_outline) {
    const mo = project.master_outline as Record<string, unknown>;
    console.log(Object.keys(mo).join(', '));
    if (Array.isArray(mo.volumes)) {
      console.log(`volumes: ${(mo.volumes as unknown[]).length}`);
      console.log('volume[0] sample:', JSON.stringify((mo.volumes as unknown[])[0], null, 2).slice(0, 1200));
    } else if (Array.isArray(mo.arcs)) {
      console.log(`arcs: ${(mo.arcs as unknown[]).length}`);
      console.log('arc[0] sample:', JSON.stringify((mo.arcs as unknown[])[0], null, 2).slice(0, 1200));
    }
  } else {
    console.log('(null)');
  }

  console.log('\n━━━ STORY OUTLINE ━━━');
  if (project.story_outline) {
    const so = project.story_outline as Record<string, unknown>;
    console.log('keys:', Object.keys(so).join(', '));
    console.log(JSON.stringify(so, null, 2).slice(0, 2500));
  } else {
    console.log('(null)');
  }

  console.log('\n━━━ COST TRACKING (last 30) ━━━');
  const { data: costs } = await s.from('cost_tracking')
    .select('task, model, total_cost_usd, created_at')
    .eq('project_id', PID)
    .order('created_at', { ascending: false }).limit(30);
  if (costs) {
    let total = 0;
    for (const c of costs) {
      total += c.total_cost_usd || 0;
      console.log(`  ${c.created_at.slice(11, 19)}  ${c.task.padEnd(20)} ${c.model.padEnd(28)} $${(c.total_cost_usd || 0).toFixed(5)}`);
    }
    console.log(`\nTotal (last 30): $${total.toFixed(4)}`);
  }

  console.log('\n━━━ CHAPTERS ━━━');
  const { data: ch } = await s.from('chapters').select('chapter_number, title, content, word_count').eq('novel_id', NID).order('chapter_number');
  if (ch && ch.length) {
    for (const c of ch) {
      console.log(`ch.${c.chapter_number} | ${c.word_count}w | ${c.title?.slice(0, 60)}`);
    }
  } else {
    console.log('(no chapters written)');
  }

  console.log('\n━━━ FAILED MEMORY TASKS ━━━');
  const { data: failed } = await s.from('failed_memory_tasks').select('task, error, created_at').eq('project_id', PID).order('created_at', { ascending: false }).limit(10);
  if (failed?.length) {
    for (const f of failed) console.log(`  ${f.created_at.slice(11, 19)} ${f.task}: ${f.error?.slice(0, 120)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
