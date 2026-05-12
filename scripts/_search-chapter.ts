import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const NID = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';
  const PID = 'c97b1d28-3421-44bb-bcfe-98055c44943a';

  // chapters table by novel_id
  const r1 = await s.from('chapters').select('id, chapter_number, title, word_count, created_at').eq('novel_id', NID);
  console.log(`chapters (novel_id=${NID}): ${r1.data?.length ?? 0} err=${r1.error?.message ?? 'none'}`);

  // chapter_versions by novel_id
  const r2 = await s.from('chapter_versions').select('id, chapter_number, source, created_at, content').eq('novel_id', NID).order('created_at', { ascending: false }).limit(5);
  console.log(`chapter_versions (novel_id=${NID}): ${r2.data?.length ?? 0} err=${r2.error?.message ?? 'none'}`);
  for (const v of r2.data || []) {
    console.log(`  ${v.created_at} ch.${v.chapter_number} source=${v.source} content_len=${v.content?.length ?? 0}`);
  }

  // chapter_summaries by project_id
  const r3 = await s.from('chapter_summaries').select('chapter_number, title, summary, created_at').eq('project_id', PID).order('chapter_number', { ascending: false }).limit(5);
  console.log(`chapter_summaries: ${r3.data?.length ?? 0}`);
  for (const v of r3.data || []) console.log(`  ch.${v.chapter_number} ${v.title}: ${v.summary?.slice(0, 100)}`);

  // recent cost_tracking
  const r4 = await s.from('cost_tracking').select('task, model, total_cost_usd, created_at, chapter_number').eq('project_id', PID).order('created_at', { ascending: false }).limit(15);
  console.log(`cost_tracking last 15:`);
  let total = 0;
  for (const c of r4.data || []) {
    total += c.total_cost_usd || 0;
    console.log(`  ${c.created_at.slice(11, 19)} ch=${c.chapter_number ?? '-'} ${c.task.padEnd(22)} ${c.model.padEnd(28)} $${(c.total_cost_usd || 0).toFixed(5)}`);
  }
  console.log(`Total: $${total.toFixed(4)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
