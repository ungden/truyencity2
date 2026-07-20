import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase credentials');

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const apply = process.argv.includes('--apply');
  const { data: live, error } = await db.from('story_factory_jobs')
    .select('id,status,stage,current_chapter,novels(title)')
    .in('status', ['setup', 'ready', 'writing', 'finale']);
  if (error) throw error;
  console.log(`Factory jobs able to run: ${live?.length ?? 0}`);
  for (const job of live ?? []) console.log(`  ${job.id} ${job.status}/${job.stage} chapter=${job.current_chapter}`);
  if (!apply) {
    console.log('Dry run. Re-run with --apply to cancel all runnable factory jobs.');
    return;
  }
  const now = new Date().toISOString();
  const { error: updateError } = await db.from('story_factory_jobs').update({
    status: 'cancelled',
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    last_error: `manual_pause_all_writing_${now.slice(0, 10)}`,
    updated_at: now,
  }).in('status', ['setup', 'ready', 'writing', 'finale']);
  if (updateError) throw updateError;
  console.log('All runnable Story Factory jobs are cancelled.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
