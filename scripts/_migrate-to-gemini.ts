/**
 * Migrate all projects with deepseek model names → gemini-3.1-flash-lite.
 * Also activates Mạt Thế and sets daily quota.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  // 1. Count projects per ai_model before migration
  const beforeCounts = await s.from('ai_story_projects').select('ai_model').not('ai_model', 'is', null);
  const tally = new Map<string, number>();
  for (const r of beforeCounts.data || []) tally.set(r.ai_model, (tally.get(r.ai_model) || 0) + 1);
  console.log('━━ BEFORE ━━');
  for (const [k, v] of tally) console.log(`  ${k}: ${v}`);

  // 2. Update deepseek → gemini-3.1-flash-lite
  const upd1 = await s.from('ai_story_projects').update({ ai_model: 'gemini-3.1-flash-lite' }).like('ai_model', 'deepseek-%').select('id');
  console.log(`\n✓ Updated ${upd1.data?.length ?? 0} projects: deepseek-* → gemini-3.1-flash-lite`);
  if (upd1.error) console.error('err:', upd1.error.message);

  // 3. Also clean any null ai_model on active projects
  const upd2 = await s.from('ai_story_projects').update({ ai_model: 'gemini-3.1-flash-lite' }).is('ai_model', null).eq('status', 'active').select('id');
  console.log(`✓ Updated ${upd2.data?.length ?? 0} active projects with null ai_model → gemini-3.1-flash-lite`);

  // 4. After counts
  const afterCounts = await s.from('ai_story_projects').select('ai_model').not('ai_model', 'is', null);
  const tally2 = new Map<string, number>();
  for (const r of afterCounts.data || []) tally2.set(r.ai_model, (tally2.get(r.ai_model) || 0) + 1);
  console.log('\n━━ AFTER ━━');
  for (const [k, v] of tally2) console.log(`  ${k}: ${v}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
