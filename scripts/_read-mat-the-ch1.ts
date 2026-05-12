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
  const NID = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';
  const { data: chs } = await s.from('chapters')
    .select('chapter_number, title, word_count, content')
    .eq('novel_id', NID)
    .order('chapter_number');
  if (!chs || chs.length === 0) {
    console.log('(no chapters)');
    return;
  }
  for (const c of chs) {
    console.log(`\n━━━━ Ch.${c.chapter_number}: ${c.title} (${c.word_count}w) ━━━━`);
    console.log(c.content);
    console.log('\n━━━━ END ━━━━');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
