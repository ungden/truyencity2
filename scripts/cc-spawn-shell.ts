/**
 * cc-spawn-shell.ts — create empty ai_story_projects + novels shells for
 * Claude-Code-authored setups. Reads blueprints/_genre-trial/seeds.json,
 * skips slugs that already exist, writes blueprints/_genre-trial/projects.json
 * mapping {slug → {projectId, novelId, genre, mcOrigin}}.
 *
 * The shell is intentionally minimal: world_description is a placeholder
 * (cc-apply-setup overwrites it from world.md). status='paused' so the cron
 * ignores the shell until cc-apply-setup pushes it to ready_to_write.
 *
 *   npx tsx scripts/cc-spawn-shell.ts            # dry run
 *   npx tsx scripts/cc-spawn-shell.ts --apply    # create shells
 */
import { config } from 'dotenv';
config({ path: '.env.runtime' });
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const SEEDS_PATH = 'blueprints/_genre-trial/seeds.json';
const MAP_PATH = 'blueprints/_genre-trial/projects.json';

interface Seed {
  slug: string; genre: string; title: string;
  main_character: string; mcOrigin: string; premise: string; nonCombat: boolean;
}

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const seeds: Seed[] = JSON.parse(readFileSync(SEEDS_PATH, 'utf8'));
  const map: Record<string, { projectId: string; novelId: string; genre: string; mcOrigin: string }> =
    existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : {};

  console.log(`\n━━ cc-spawn-shell ${apply ? '[APPLY]' : '[DRY RUN]'} — ${seeds.length} seeds ━━\n`);
  const ownerId = apply ? await getOwnerId() : 'dry-run';

  for (const seed of seeds) {
    const { data: existing } = await s.from('novels').select('id').eq('slug', seed.slug).maybeSingle();
    if (existing) {
      // backfill map if needed
      const { data: proj } = await s.from('ai_story_projects').select('id').eq('novel_id', existing.id).maybeSingle();
      if (proj) map[seed.slug] = { projectId: proj.id, novelId: existing.id, genre: seed.genre, mcOrigin: seed.mcOrigin };
      console.log(`• ${seed.genre.padEnd(18)} ${seed.slug} — exists, skip (proj=${proj?.id ?? '?'})`);
      continue;
    }
    if (!apply) {
      console.log(`• ${seed.genre.padEnd(18)} ${seed.title}  [${seed.mcOrigin}]`);
      continue;
    }
    const { data: novel, error: nErr } = await s.from('novels').insert({
      title: seed.title, slug: seed.slug, author: 'Truyện City',
      description: seed.premise, genres: [seed.genre], status: 'Đang ra',
    }).select('id').single();
    if (nErr || !novel) throw new Error(`novel ${seed.slug}: ${nErr?.message}`);

    const { data: project, error: pErr } = await s.from('ai_story_projects').insert({
      novel_id: novel.id, user_id: ownerId, genre: seed.genre,
      main_character: seed.main_character,
      world_description: `[shell placeholder — replaced from world.md at cc-apply-setup] ${seed.premise}`,
      total_planned_chapters: 1000, current_chapter: 0,
      status: 'paused', pause_reason: 'cc_genre_trial_2026-05-29',
      setup_stage: 'idea', setup_stage_attempts: 0,
      temperature: 0.75, target_chapter_length: 2800,
      ai_model: 'gemini-3.1-flash-lite',
      style_directives: { setup_source: 'claude_code', production_daily_chapter_quota: 5, disable_chapter_split: true },
    }).select('id').single();
    if (pErr || !project) throw new Error(`project ${seed.slug}: ${pErr?.message}`);

    map[seed.slug] = { projectId: project.id, novelId: novel.id, genre: seed.genre, mcOrigin: seed.mcOrigin };
    console.log(`✓ ${seed.genre.padEnd(18)} proj=${project.id} novel=${novel.id}`);
  }

  if (apply) {
    writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
    console.log(`\n✓ wrote ${MAP_PATH} (${Object.keys(map).length} entries)\n`);
  } else {
    console.log(`\nDRY RUN. Pass --apply to create shells.\n`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
