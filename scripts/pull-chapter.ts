import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const novelId = process.argv[2] || 'cc2970d5-7f26-4230-817f-98a3389418b9';

(async () => {
  const { data: novel } = await s.from('novels').select('title,slug').eq('id', novelId).single();
  console.log('Novel:', novel);
  const { data: chapters } = await s.from('chapters')
    .select('chapter_number,title,content')
    .eq('novel_id', novelId)
    .order('chapter_number');
  for (const c of chapters || []) {
    const content = c.content as string;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Chương ${c.chapter_number}: ${c.title}`);
    console.log(`Length: ${content.length} chars, ${content.split(/\s+/).filter(Boolean).length} words`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(content.slice(0, 2500));
    console.log('\n[...middle cut...]\n');
    console.log(content.slice(-1500));
  }
})();
