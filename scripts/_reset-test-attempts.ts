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
  await db.from('ai_story_projects').update({
    setup_stage_attempts: 0,
    setup_stage_error: null,
    setup_stage_updated_at: new Date().toISOString(),
  }).eq('id', '1ef4aba8-12b3-4b42-bf8d-15d19f04804b');
  console.log('Reset attempts → 0');
}

main().catch((e) => { console.error(e); process.exit(1); });
