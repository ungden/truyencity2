/**
 * Backfill Phase 27 canons for existing novels — Phase 28 TIER 6.
 *
 * Existing projects (created before Phase 27) lack:
 *   - power_system_canon (W2.4)
 *   - worldbuilding_canon (W3.3)
 *   - plot_twists rows (W3.1)
 *   - story_themes rows (W3.2)
 *   - voice_anchors rows (W4.2) — only if ch.1-3 exist
 *
 * This script idempotently generates each missing canon for active projects.
 * Each generator is idempotent: skips if already populated.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/backfill-canons.ts                    # all active projects
 *   ./node_modules/.bin/tsx scripts/backfill-canons.ts <projectId>         # single project
 *   ./node_modules/.bin/tsx scripts/backfill-canons.ts --limit=20          # cap to 20 projects
 *
 * Cost: ~$0.020 per project (4 setup AI calls). For 100 projects = $2.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface BackfillStats {
  scanned: number;
  power_canon: { needed: number; created: number };
  worldbuilding_canon: { needed: number; created: number };
  plot_twists: { needed: number; created: number };
  themes: { needed: number; created: number };
  voice_anchors: { needed: number; created: number };
  errors: string[];
}

async function main() {
  const args = process.argv.slice(2);
  const singleProjectId = args.find(a => !a.startsWith('--'));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  console.log(`[backfill-canons] Starting. ${singleProjectId ? `Single project: ${singleProjectId}` : `All active, limit ${limit}`}`);

  const stats: BackfillStats = {
    scanned: 0,
    power_canon: { needed: 0, created: 0 },
    worldbuilding_canon: { needed: 0, created: 0 },
    plot_twists: { needed: 0, created: 0 },
    themes: { needed: 0, created: 0 },
    voice_anchors: { needed: 0, created: 0 },
    errors: [],
  };

  // Load projects to backfill.
  const projectQuery = supabase
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,total_planned_chapters,power_system_canon,worldbuilding_canon,current_chapter,status')
    .eq('status', 'active')
    .gte('current_chapter', 3); // Need ch.3 written for voice anchor capture

  const { data: projects } = singleProjectId
    ? await projectQuery.eq('id', singleProjectId)
    : await projectQuery.limit(limit);

  if (!projects?.length) {
    console.log('[backfill-canons] No projects to backfill.');
    return;
  }

  console.log(`[backfill-canons] Scanning ${projects.length} projects...`);

  const { DEFAULT_CONFIG } = await import('../src/services/story-engine/types');
  const config = { ...DEFAULT_CONFIG, model: 'deepseek-v4-flash' };

  for (const p of projects) {
    stats.scanned++;
    console.log(`\n[${stats.scanned}/${projects.length}] Project ${p.id.slice(0, 8)} (${p.genre}, ch.${p.current_chapter})`);

    if (!p.world_description) {
      stats.errors.push(`${p.id}: missing world_description, skip all canon generation`);
      continue;
    }

    // 1. Power system canon
    if (!p.power_system_canon) {
      stats.power_canon.needed++;
      try {
        const { generatePowerSystemCanon } = await import('../src/services/story-engine/canon/power-system');
        const canon = await generatePowerSystemCanon(
          p.id,
          p.genre,
          p.world_description,
          p.story_outline ? JSON.stringify(p.story_outline) : null,
          config,
        );
        if (canon) {
          stats.power_canon.created++;
          console.log(`  ✓ power_system_canon: ${canon.ladder?.length ?? 0} tiers`);
        }
      } catch (e) {
        stats.errors.push(`${p.id} power_canon: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 2. Worldbuilding canon
    if (!p.worldbuilding_canon) {
      stats.worldbuilding_canon.needed++;
      try {
        const { generateWorldbuildingCanon } = await import('../src/services/story-engine/canon/worldbuilding');
        const canon = await generateWorldbuildingCanon(
          p.id,
          p.genre,
          p.world_description,
          p.story_outline ? JSON.stringify(p.story_outline) : null,
          config,
        );
        if (canon) {
          stats.worldbuilding_canon.created++;
          console.log(`  ✓ worldbuilding_canon: ${canon.regions?.length ?? 0} regions`);
        }
      } catch (e) {
        stats.errors.push(`${p.id} worldbuilding: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 3. Plot twists
    const { count: twistCount } = await supabase
      .from('plot_twists')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', p.id);
    if ((twistCount ?? 0) === 0 && p.master_outline) {
      stats.plot_twists.needed++;
      try {
        const { generatePlotTwists } = await import('../src/services/story-engine/plan/plot-twists');
        const result = await generatePlotTwists(
          p.id,
          p.genre,
          p.total_planned_chapters || 1000,
          p.world_description,
          JSON.stringify(p.master_outline).slice(0, 4000),
          config,
        );
        if (result.created > 0) {
          stats.plot_twists.created++;
          console.log(`  ✓ plot_twists: ${result.created} twists`);
        }
      } catch (e) {
        stats.errors.push(`${p.id} plot_twists: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 4. Story themes
    const { count: themeCount } = await supabase
      .from('story_themes')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', p.id);
    if ((themeCount ?? 0) === 0) {
      stats.themes.needed++;
      try {
        const { generateStoryThemes } = await import('../src/services/story-engine/plan/themes');
        const result = await generateStoryThemes(
          p.id,
          p.genre,
          p.world_description,
          p.story_outline ? JSON.stringify(p.story_outline).slice(0, 3000) : null,
          config,
        );
        if (result.created > 0) {
          stats.themes.created++;
          console.log(`  ✓ themes: ${result.created} themes`);
        }
      } catch (e) {
        stats.errors.push(`${p.id} themes: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 5. Voice anchors (if ch.1-3 exist)
    const { count: anchorCount } = await supabase
      .from('voice_anchors')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', p.id);
    if ((anchorCount ?? 0) === 0) {
      stats.voice_anchors.needed++;
      const { data: ch13 } = await supabase
        .from('chapters')
        .select('chapter_number,content')
        .eq('novel_id', p.novel_id)
        .lte('chapter_number', 3)
        .order('chapter_number', { ascending: true });
      if (ch13?.length) {
        try {
          const { captureVoiceAnchors } = await import('../src/services/story-engine/memory/voice-anchor');
          const result = await captureVoiceAnchors(p.id, ch13);
          if (result.captured > 0) {
            stats.voice_anchors.created++;
            console.log(`  ✓ voice_anchors: ${result.captured} snippets`);
          }
        } catch (e) {
          stats.errors.push(`${p.id} voice_anchors: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Throttle so we don't blast DeepSeek API.
    if (stats.scanned % 5 === 0) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n[backfill-canons] === SUMMARY ===');
  console.log(JSON.stringify(stats, null, 2));
  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => {
  console.error('[backfill-canons] FATAL:', e);
  process.exit(1);
});
