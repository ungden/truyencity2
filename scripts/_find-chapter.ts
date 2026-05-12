import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const PID = 'c97b1d28-3421-44bb-bcfe-98055c44943a';
  const { data: proj } = await s.from('ai_story_projects').select('novel_id, current_chapter, setup_stage, status').eq('id', PID).single();
  console.log('project novel_id:', proj?.novel_id, 'current_chapter:', proj?.current_chapter, 'setup_stage:', proj?.setup_stage, 'status:', proj?.status);
  const { data: chs, count } = await s.from('chapters')
    .select('id, chapter_number, title, word_count, created_at', { count: 'exact' })
    .eq('novel_id', proj?.novel_id)
    .order('chapter_number');
  console.log(`chapters count: ${count}`);
  for (const c of chs || []) {
    console.log(`  ch.${c.chapter_number} | ${c.word_count}w | ${c.title} | id=${c.id}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
