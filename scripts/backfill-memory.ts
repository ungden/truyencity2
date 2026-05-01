/**
 * Backfill Memory — Phase 22 Continuity Overhaul
 *
 * For every active novel with current_chapter >= 50, backfill:
 *  1. character_bibles for top 10 characters per novel
 *  2. volume_summaries for every 100-chapter window already written
 *  3. mark stale foreshadowing hints (planted but >30 chapters past deadline) → abandoned
 *
 * Idempotent: skips entries already populated.
 *
 * Usage: ./node_modules/.bin/tsx scripts/backfill-memory.ts
 *        TARGET_PROJECTS="proj1,proj2" ./node_modules/.bin/tsx scripts/backfill-memory.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { refreshCharacterBibles } from '../src/services/story-engine/memory/character-bibles';
import { generateVolumeSummary } from '../src/services/story-engine/memory/volume-summaries';
import { DEFAULT_CONFIG } from '../src/services/story-engine/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

interface ProjectRow {
  id: string;
  novel_id: string;
  current_chapter: number;
  ai_model: string | null;
}

async function main() {
  const targetIds = process.env.TARGET_PROJECTS?.split(',').map(s => s.trim()).filter(Boolean);

  let query = supabase
    .from('ai_story_projects')
    .select('id, novel_id, current_chapter, ai_model')
    .gte('current_chapter', 50)
    .eq('status', 'active');

  if (targetIds?.length) {
    query = query.in('id', targetIds);
  }

  const { data: projects, error } = await query.order('current_chapter', { ascending: false });

  if (error) {
    console.error('Failed to load projects:', error.message);
    process.exit(1);
  }

  if (!projects?.length) {
    console.log('No projects to backfill.');
    return;
  }

  console.log(`Backfilling ${projects.length} projects...\n`);

  let totalBibles = 0;
  let totalVolumes = 0;
  let totalAbandoned = 0;

  for (const project of projects as ProjectRow[]) {
    console.log(`\n═══ Project ${project.id} (ch.${project.current_chapter}) ═══`);

    const config = {
      ...DEFAULT_CONFIG,
      model: project.ai_model || DEFAULT_CONFIG.model,
    };

    // 1. Character bibles — refresh at the highest milestone ≤ current_chapter
    try {
      const milestone = Math.floor(project.current_chapter / 50) * 50;
      if (milestone >= 50) {
        console.log(`  → Refreshing character bibles at ch.${milestone}...`);
        await refreshCharacterBibles(project.id, milestone, config);
        const { count } = await supabase
          .from('character_bibles')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id);
        if (count) totalBibles += count;
        console.log(`     ✓ ${count ?? 0} bibles in DB`);
      }
    } catch (e) {
      console.warn(`  ✗ Bible refresh failed:`, e instanceof Error ? e.message : String(e));
    }

    // 2. Volume summaries — generate one for each completed 100-chapter window
    try {
      const completedVolumes = Math.floor(project.current_chapter / 100);
      for (let v = 1; v <= completedVolumes; v++) {
        const milestone = v * 100;
        console.log(`  → Generating volume ${v} summary (ch.${milestone})...`);
        await generateVolumeSummary(project.id, milestone, config);
        totalVolumes++;
      }
    } catch (e) {
      console.warn(`  ✗ Volume summary failed:`, e instanceof Error ? e.message : String(e));
    }

    // 3. Auto-abandon foreshadowing hints with deadline >30 chapters past
    try {
      const cutoff = project.current_chapter - 30;
      const { data: stale } = await supabase
        .from('foreshadowing_plans')
        .select('id')
        .eq('project_id', project.id)
        .eq('status', 'planted')
        .lt('payoff_chapter', cutoff);
      if (stale?.length) {
        await supabase
          .from('foreshadowing_plans')
          .update({ status: 'abandoned' })
          .in('id', stale.map(s => s.id));
        totalAbandoned += stale.length;
        console.log(`  → Abandoned ${stale.length} stale foreshadowing hints`);
      }
    } catch (e) {
      console.warn(`  ✗ Foreshadowing cleanup failed:`, e instanceof Error ? e.message : String(e));
    }
  }

  console.log(`\n═══ DONE ═══`);
  console.log(`Total character bibles in DB: ${totalBibles}`);
  console.log(`Total volume summaries generated: ${totalVolumes}`);
  console.log(`Total foreshadowing hints abandoned: ${totalAbandoned}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
