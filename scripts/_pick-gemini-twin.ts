/**
 * Pick a 2nd test novel similar to 1ef4aba8 (Toàn Cầu Thủ Hộ):
 *   - genre: vong-du
 *   - status: paused (reset_for_re_blueprint)
 *   - empty main_character + world_description
 *   - chapter_blueprints exist
 *
 * Prints candidates so we can pick one to activate as Gemini twin.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: projects } = await db
    .from('ai_story_projects')
    .select('id, novel_id, genre, main_character, world_description, pause_reason, status, novels!ai_story_projects_novel_id_fkey(title)')
    .eq('genre', 'vong-du')
    .like('pause_reason', 'reset%')
    .limit(50);

  if (!projects) return;

  const candidates = projects.filter((p) => {
    const mc = (p.main_character ?? '').trim();
    const wd = (p.world_description ?? '').trim();
    return mc.length === 0 && wd.length === 0 && p.id !== '1ef4aba8-12b3-4b42-bf8d-15d19f04804b';
  });

  console.log(`Found ${candidates.length} empty-seed vong-du candidates:`);
  for (const c of candidates.slice(0, 10)) {
    const n = Array.isArray(c.novels) ? c.novels[0] : c.novels;
    console.log(`  ${c.id} → ${n?.title}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
