/**
 * Drive Phase O Pro-tier setup pipeline directly on test novel 1ef4aba8.
 * Bypasses cron focus + production-pause gates. Calls runOneStage in a loop
 * until setup advances past arc_plan or hits an error.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { installModelTierRouting } from '@/services/story-engine/utils/model-tier';
import { runOneStage } from '@/services/story-engine/pipeline/setup-pipeline';

const PROJECT_ID = '1ef4aba8-12b3-4b42-bf8d-15d19f04804b';
const STAGED = new Set(['idea', 'world', 'character', 'description', 'master_outline', 'story_outline', 'arc_plan']);
const MAX_STEPS = 10;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function fetchStageProj() {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,story_bible,total_planned_chapters,setup_stage,setup_stage_attempts,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', PROJECT_ID)
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  installModelTierRouting();
  console.log('[drive] Pro-tier routing installed');

  for (let i = 0; i < MAX_STEPS; i++) {
    const p = await fetchStageProj();
    console.log(`\n[step ${i + 1}/${MAX_STEPS}] setup_stage=${p.setup_stage} attempts=${p.setup_stage_attempts}`);

    if (!STAGED.has(p.setup_stage)) {
      console.log(`[drive] stopped — setup_stage=${p.setup_stage} no longer staged. Done.`);
      break;
    }

    const t0 = Date.now();
    const advanced = await runOneStage(p as Parameters<typeof runOneStage>[0]);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[step ${i + 1}] runOneStage → advanced=${advanced} (${dt}s)`);

    if (!advanced) {
      console.log('[drive] stage failed — inspect setup_stage_error');
      const { data: errRow } = await db
        .from('ai_story_projects')
        .select('setup_stage_error, setup_stage_attempts')
        .eq('id', PROJECT_ID)
        .single();
      console.log(`[drive] error=${errRow?.setup_stage_error} attempts=${errRow?.setup_stage_attempts}`);
      break;
    }
  }

  // Final state dump
  const final = await fetchStageProj();
  console.log(`\n━━━━ FINAL STATE ━━━━`);
  console.log(`setup_stage=${final.setup_stage} attempts=${final.setup_stage_attempts}`);
  console.log(`main_character: ${final.main_character || '(empty)'}`);
  console.log(`world_description: ${(final.world_description ?? '').length} chars`);
  console.log(`story_outline: ${final.story_outline ? 'populated' : 'empty'}`);
  console.log(`master_outline: ${final.master_outline ? 'populated' : 'empty'}`);
}

main().catch((e) => { console.error('[drive] FATAL', e); process.exit(1); });
