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
    .select('novel_id, novels!ai_story_projects_novel_id_fkey(title, cover_url)')
    .eq('pause_reason', 'phase_l_awaiting_user_pick_2026-05-11');
  if (!projects) return;
  let withCover = 0, withoutCover = 0;
  const missing: string[] = [];
  for (const p of projects) {
    const n = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    if (n?.cover_url) withCover++;
    else { withoutCover++; if (missing.length < 10) missing.push(n?.title ?? '(no title)'); }
  }
  console.log(`Phase L novels: ${projects.length}`);
  console.log(`With cover_url: ${withCover}`);
  console.log(`Without cover_url: ${withoutCover}`);
  if (withoutCover > 0) {
    console.log('First 10 missing:');
    for (const t of missing) console.log(`  - ${t}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
