import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const NID = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';
  const r = await s.from('chapters').select('*').eq('novel_id', NID).order('chapter_number');
  console.log('count:', r.data?.length, 'err:', r.error?.message);
  if (r.data?.[0]) {
    const c = r.data[0];
    console.log('keys:', Object.keys(c).join(', '));
    console.log('ch.', c.chapter_number, c.title);
    console.log('content length:', (c.content || '').length);
    console.log('\n━━━ CONTENT ━━━\n');
    console.log(c.content);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
