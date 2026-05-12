/**
 * Safety pause: pause all 100 Phase L novels while user picks subset.
 * Reversible — selected novels will be re-activated next.
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

const APPLY = process.argv.includes('--apply');

async function main() {
  const { data: projects } = await db
    .from('ai_story_projects')
    .select('id, status')
    .eq('genre', null)
    .or('pause_reason.is.null,pause_reason.eq.');
  // The above is brittle. Use slugs from spawn script instead — query active Phase L novels.

  // Simpler: query novels created in last 1h via timestamp.
  const { data: candidates, error } = await db
    .from('ai_story_projects')
    .select('id, status, pause_reason, created_at, novels!ai_story_projects_novel_id_fkey(title)')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .eq('status', 'active');
  if (error || !candidates) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Found ${candidates.length} active Phase L novels (created last hour, status=active)`);

  if (!APPLY) {
    console.log('DRY RUN — pass --apply to pause');
    return;
  }

  const ids = candidates.map((p) => p.id);
  const { error: updErr } = await db
    .from('ai_story_projects')
    .update({
      status: 'paused',
      pause_reason: 'phase_l_awaiting_user_pick_2026-05-11',
    })
    .in('id', ids);
  if (updErr) {
    console.error('Update error:', updErr);
    process.exit(1);
  }
  console.log(`✓ ${ids.length} Phase L novels paused (pause_reason='phase_l_awaiting_user_pick_2026-05-11')`);
}

main().catch((e) => { console.error(e); process.exit(1); });
