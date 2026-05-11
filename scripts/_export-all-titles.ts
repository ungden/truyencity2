/**
 * Export all 1164 novels' title + description + world_preview to JSON.
 * Read-only. Output: tmp/title-audit/all-novels.json
 */
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface Row {
  project_id: string;
  novel_id: string;
  old_title: string;
  old_slug: string;
  genre: string | null;
  main_character: string | null;
  current_chapter: number;
  description: string;
  world_description: string;
  pause_reason: string | null;
  bucket: string;
}

function bucketOf(pauseReason: string | null): string {
  if (!pauseReason) return 'active_or_other';
  if (pauseReason.startsWith('phase_h_archetype')) return 'phase_j_40';
  if (pauseReason.startsWith('phase_l_')) return 'phase_l_100';
  if (pauseReason.startsWith('user_explicit_pause')) return 'phase_j_paused_by_user';
  if (pauseReason.startsWith('reset_for_re_blueprint')) return 'reset_672';
  if (pauseReason.startsWith('dropped_')) return 'dropped_349';
  if (pauseReason.startsWith('auto_paused')) return 'auto_paused';
  return 'other';
}

async function main() {
  const all: Row[] = [];
  const pageSize = 500;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from('ai_story_projects')
      .select('id, novel_id, genre, main_character, world_description, current_chapter, pause_reason, novels!ai_story_projects_novel_id_fkey(title, slug, description)')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data) {
      const n = Array.isArray(p.novels) ? p.novels[0] : p.novels;
      if (!n) continue;
      all.push({
        project_id: p.id,
        novel_id: p.novel_id,
        old_title: n.title || '',
        old_slug: n.slug || '',
        genre: p.genre,
        main_character: p.main_character,
        current_chapter: p.current_chapter ?? 0,
        description: (n.description || '').slice(0, 400),
        world_description: (p.world_description || '').slice(0, 400),
        pause_reason: p.pause_reason,
        bucket: bucketOf(p.pause_reason),
      });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const outDir = path.resolve(__dirname, '../tmp/title-audit');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'all-novels.json');
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));

  const byBucket = new Map<string, number>();
  for (const r of all) byBucket.set(r.bucket, (byBucket.get(r.bucket) ?? 0) + 1);

  console.log(`Wrote ${all.length} novels → ${outPath}`);
  console.log('Bucket distribution:');
  for (const [b, c] of [...byBucket.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${b.padEnd(28)} ${c}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
