import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main(): Promise<void> {
  // Find all novels active or paused, check for the gap pattern (first chapter > 1)
  const { data: projects } = await s.from('ai_story_projects')
    .select('id,novel_id,current_chapter,status,total_planned_chapters,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,chapter_count)')
    .in('status', ['active', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(40);

  if (!projects) return;
  console.log(`Checking ${projects.length} active/paused projects...\n`);

  for (const p of projects) {
    const novel: { id: string; title: string; chapter_count: number } | null = Array.isArray(p.novels) ? p.novels[0] : (p.novels as any);
    if (!novel) continue;
    const novelId = novel.id as string;
    const { data: firstCh } = await s.from('chapters')
      .select('chapter_number')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: true })
      .limit(1)
      .maybeSingle();
    const { data: lastCh } = await s.from('chapters')
      .select('chapter_number')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const firstNum = firstCh?.chapter_number;
    const lastNum = lastCh?.chapter_number;
    const gap = firstNum && firstNum > 1;
    const tag = gap ? '⚠️ GAP' : '✓';
    console.log(`${tag} ${novel.title}`);
    console.log(`   ch_count=${novel.chapter_count} | first=${firstNum ?? 'n/a'} last=${lastNum ?? 'n/a'} | current_ch=${p.current_chapter} | status=${p.status}`);
  }
}
main().catch(console.error);
