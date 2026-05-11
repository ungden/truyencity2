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
  const { data } = await db
    .from('ai_story_projects')
    .select('id')
    .eq('pause_reason', 'phase_l_100ideas_2026-05-11');
  if (!data) return;
  const ids = data.map((p) => p.id);
  console.log(`Phase L projects: ${ids.length}`);
  const { count: cbCount } = await db
    .from('chapter_blueprints')
    .select('*', { count: 'exact', head: true })
    .in('project_id', ids);
  console.log(`Chapter blueprints: ${cbCount} / ${ids.length * 1000} expected`);
  console.log(`Progress: ${((cbCount ?? 0) / (ids.length * 1000) * 100).toFixed(1)}%`);
}

main().catch((e) => { console.error(e); process.exit(1); });
