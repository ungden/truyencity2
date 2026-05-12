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
    .select('id, status, setup_stage, setup_stage_attempts, setup_stage_error, setup_stage_updated_at, pause_reason, main_character, world_description')
    .eq('id', '1ef4aba8-12b3-4b42-bf8d-15d19f04804b')
    .single();
  console.log(JSON.stringify({
    ...data,
    world_description_len: data?.world_description?.length ?? 0,
    world_description: undefined,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
