/**
 * Drive setup pipeline v3 directly on a given project. Bypasses cron focus +
 * production-pause gates. Calls runOneStage in a loop until setup advances
 * past foundation_review OR hits an error.
 *
 * Usage:
 *   npx tsx scripts/_drive-setup-v3.ts <project_id>           # default 30 steps
 *   npx tsx scripts/_drive-setup-v3.ts <project_id> 50         # custom max steps
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { installModelTierRouting } from '@/services/story-engine/utils/model-tier';
import { runOneStage } from '@/services/story-engine/pipeline/setup-pipeline';

const STAGED = new Set([
  'idea',
  'world',
  'character',
  'description',
  'master_outline',
  'story_outline',
  'canon_spawn',
  'arc_plan',
  'foundation_review',
]);

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function fetchStageProj(projectId: string) {
  const { data, error } = await db
    .from('ai_story_projects')
    .select(
      'id,novel_id,genre,main_character,world_description,master_outline,story_outline,story_bible,total_planned_chapters,setup_stage,setup_stage_attempts,sub_genres,novels!ai_story_projects_novel_id_fkey(id,title)',
    )
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const projectId = process.argv[2];
  const maxSteps = parseInt(process.argv[3] || '30', 10);
  if (!projectId) {
    console.error('Usage: _drive-setup-v3.ts <project_id> [max_steps]');
    process.exit(1);
  }

  installModelTierRouting();
  console.log(`[drive] Pro-tier routing installed; project=${projectId}; max ${maxSteps} steps`);

  for (let i = 0; i < maxSteps; i++) {
    const p = await fetchStageProj(projectId);
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    console.log(
      `\n[step ${i + 1}/${maxSteps}] novel="${novel?.title}" setup_stage=${p.setup_stage} attempts=${p.setup_stage_attempts}`,
    );

    if (!STAGED.has(p.setup_stage)) {
      console.log(`[drive] stopped — setup_stage=${p.setup_stage} no longer staged. Done.`);
      break;
    }

    const t0 = Date.now();
    let advanced = false;
    try {
      advanced = await runOneStage(p as Parameters<typeof runOneStage>[0]);
    } catch (e) {
      console.error(`[step ${i + 1}] runOneStage threw:`, e instanceof Error ? e.message : String(e));
      break;
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[step ${i + 1}] runOneStage → advanced=${advanced} (${dt}s)`);

    if (!advanced) {
      const { data: errRow } = await db
        .from('ai_story_projects')
        .select('setup_stage_error, setup_stage_attempts, kernel_repair_attempts')
        .eq('id', projectId)
        .single();
      console.log(
        `[drive] stage failed — error=${(errRow?.setup_stage_error || '').slice(0, 500)} attempts=${errRow?.setup_stage_attempts} kernel_repair_attempts=${errRow?.kernel_repair_attempts}`,
      );
      // If we got rewound by foundation review, continue (it changes setup_stage)
      const recheck = await fetchStageProj(projectId);
      if (recheck.setup_stage !== p.setup_stage) {
        console.log(`[drive] stage was rewound to ${recheck.setup_stage} — continuing`);
        continue;
      }
      if ((errRow?.setup_stage_attempts as number) >= 5) {
        console.log('[drive] reached MAX_ATTEMPTS=5 — admin must investigate');
      }
      break;
    }
  }

  // Final state dump
  const final = await fetchStageProj(projectId);
  console.log(`\n━━━━ FINAL STATE ━━━━`);
  console.log(`setup_stage: ${final.setup_stage}`);
  console.log(`attempts: ${final.setup_stage_attempts}`);
  console.log(`main_character: ${final.main_character || '(empty)'}`);
  console.log(`world_description: ${(final.world_description ?? '').length} chars`);
  console.log(`story_outline: ${final.story_outline ? 'populated' : 'empty'}`);
  console.log(`master_outline: ${final.master_outline ? 'populated' : 'empty'}`);

  // Show canon row counts
  const [factions, fore, twists, themes, anchors] = await Promise.all([
    db.from('factions').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
    db.from('foreshadowing_agenda').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
    db.from('plot_twists').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
    db.from('story_themes').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
    db.from('voice_anchors').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
  ]);
  console.log(`canon: factions=${factions.count} foreshadowing=${fore.count} plot_twists=${twists.count} themes=${themes.count} voice_anchors=${anchors.count}`);

  // Foundation review latest
  const { data: pRow } = await db
    .from('ai_story_projects')
    .select('style_directives')
    .eq('id', projectId)
    .single();
  const sd = (pRow?.style_directives as Record<string, unknown>) || {};
  const review = sd.foundation_review_latest as { passed?: boolean; totalScore?: number; avgScore?: number; minDimScore?: number } | undefined;
  if (review) {
    console.log(`foundation_review: passed=${review.passed} total=${review.totalScore}/140 avg=${review.avgScore} min=${review.minDimScore}/10`);
  }
}

main().catch((e) => {
  console.error('[drive] FATAL', e);
  process.exit(1);
});
