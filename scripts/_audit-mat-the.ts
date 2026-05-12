import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const NID = '2fe03cf2-34fe-45b5-8fa6-26dcd13ca468';
  const r = await s.from('chapters').select('chapter_number,title,content').eq('novel_id', NID).order('chapter_number');
  if (!r.data) { console.log('no data'); return; }

  fs.mkdirSync('tmp/mat-the-audit', { recursive: true });

  for (const c of r.data) {
    const path = `tmp/mat-the-audit/ch${String(c.chapter_number).padStart(2, '0')}.txt`;
    fs.writeFileSync(path, `═══ Ch.${c.chapter_number}: ${c.title} ═══\n\n${c.content}\n`);
    console.log(`wrote ${path} (${c.content.length} chars)`);
  }

  // Aggregate metrics
  console.log('\n━━━━ METRICS ━━━━');
  for (const c of r.data) {
    const content = c.content || '';
    const wc = content.trim().split(/\s+/).length;
    const charCount = content.length;
    const dialogLines = (content.match(/^—\s/gm) || []).length;
    const cliffhangerHint = /(?:bắt đầu|chính thức|còn|chờ|sẽ|sắp|mới|đầu tiên).{0,50}\.$/m.test(content);
    console.log(`ch.${c.chapter_number}: ${wc}w / ${charCount}c / ${dialogLines} dialog lines / end-hook=${cliffhangerHint ? 'Y' : 'N'}`);
  }

  // Word repetition across all chapters
  console.log('\n━━━━ TOP REPETITIONS (all 5 chapters) ━━━━');
  const all = r.data.map(c => c.content).join('\n');
  const lowerAll = all.toLowerCase();
  const check = ['lương hạo', 'royal city', 'phượng đô', 'hà nội', 'yusen logistics', 'vinmart',
                 'lương', 'hạo', 'hương', 'chú vinh', 'lão hoàng', 'phạm đăng linh', 'đan linh',
                 't-aurora', 'mưa axit', 'kho chứa', 'quét', 'rút', 'hầm trú ẩn',
                 'là một', 'bắt đầu', 'mang theo', 'tỏa ra', 'đôi mắt', 'như thể', 'dường như',
                 'kinh hoàng', 'sững sờ', 'rực rỡ', 'mờ ảo', 'lạnh lẽo', 'run rẩy',
                 'xu ', 'nguyên ', 'đồng', 'lượng vàng',
                 '168 giờ', '24 giờ', '7 ngày', 'bảy ngày', 'sáu giờ'];
  for (const w of check) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const n = (lowerAll.match(re) || []).length;
    if (n > 0) console.log(`  "${w}": ${n}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
