import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main(): Promise<void> {
  const { data } = await s.from('ai_story_projects')
    .select('id,genre,topic_id,status,style_directives,total_planned_chapters,novels!ai_story_projects_novel_id_fkey(title,slug)')
    .in('genre', ['quy-tac-quai-dam', 'ngu-thu-tien-hoa', 'khoai-xuyen'])
    .eq('status', 'active');

  console.log(`\n━━━ NEW TOP-LEVEL GENRES ACTIVE: ${data?.length} ━━━\n`);
  for (const p of data || []) {
    const n: any = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    const sd: any = p.style_directives;
    console.log(`📚 ${n?.title}`);
    console.log(`   /truyen/${n?.slug}`);
    console.log(`   genre=${p.genre} topic=${p.topic_id ?? '-'} | uncut=${sd?.disable_chapter_split === true}`);
  }

  const { data: topics } = await s.from('ai_story_projects')
    .select('id,genre,topic_id,status,novels!ai_story_projects_novel_id_fkey(title,slug)')
    .in('topic_id', ['do-thi-doan-tuyet-quan-he', 'do-thi-giai-tri-luu', 'do-thi-thanh-chu-luu', 'do-thi-group-chat-vu-tru', 'tien-hiep-cau-dao-truong-sinh', 'tien-hiep-lao-to-luu', 'linh-di-dan-tuc-ngo-tac'])
    .eq('status', 'active');

  console.log(`\n━━━ NEW TOPICS ACTIVE: ${topics?.length} ━━━\n`);
  for (const p of topics || []) {
    const n: any = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    console.log(`📚 ${n?.title} [${p.topic_id}]`);
    console.log(`   /truyen/${n?.slug}`);
  }

  // Confirm fixed novels are active + clean
  const { data: fixed } = await s.from('novels')
    .select('id,title,slug,chapter_count')
    .or('title.ilike.%Trở Về Năm 2000%,title.ilike.%Trọng Sinh 1991%');
  console.log(`\n━━━ FIXED NOVELS ━━━\n`);
  for (const n of fixed || []) {
    const { data: proj } = await s.from('ai_story_projects')
      .select('current_chapter,status')
      .eq('novel_id', n.id as string)
      .maybeSingle();
    console.log(`📚 ${n.title}`);
    console.log(`   /truyen/${n.slug}`);
    console.log(`   chapter_count=${n.chapter_count} | current=${proj?.current_chapter} status=${proj?.status}`);
  }
}
main().catch(console.error);
