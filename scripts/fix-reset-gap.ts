import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TITLES_TO_FIX = ['Trở Về Năm 2000', 'Trọng Sinh 1991'];

async function main(): Promise<void> {
  for (const title of TITLES_TO_FIX) {
    console.log(`\n▶ Fixing: ${title}`);
    const { data: novels } = await s.from('novels')
      .select('id,title')
      .ilike('title', `%${title}%`);
    if (!novels || novels.length === 0) {
      console.log(`  ✗ NOT FOUND`);
      continue;
    }
    for (const n of novels) {
      const novelId = n.id as string;
      console.log(`  novel: ${n.title} (${novelId})`);

      // Pause project first
      const { error: pauseErr } = await s.from('ai_story_projects')
        .update({ status: 'paused' })
        .eq('novel_id', novelId);
      if (pauseErr) {
        console.log(`  ✗ pause failed: ${pauseErr.message}`);
        continue;
      }
      console.log(`  ✓ paused project`);

      // Wipe all chapters
      const { count: before } = await s.from('chapters')
        .select('id', { count: 'exact', head: true })
        .eq('novel_id', novelId);
      const { error: delErr } = await s.from('chapters')
        .delete()
        .eq('novel_id', novelId);
      if (delErr) {
        console.log(`  ✗ chapter delete failed: ${delErr.message}`);
        continue;
      }
      console.log(`  ✓ wiped ${before ?? 0} chapters`);

      // Wipe per-project memory tables that reference chapter_number
      const memoryTables = [
        'chapter_summaries',
        'character_states',
        'story_memory_chunks',
        'beat_usage',
      ];
      const { data: projectRow } = await s.from('ai_story_projects')
        .select('id')
        .eq('novel_id', novelId)
        .maybeSingle();
      const projectId = projectRow?.id as string | undefined;
      if (projectId) {
        for (const tbl of memoryTables) {
          const { error: e } = await s.from(tbl).delete().eq('project_id', projectId);
          if (e) console.log(`    ⚠ ${tbl} clear failed: ${e.message}`);
          else console.log(`    ✓ cleared ${tbl}`);
        }
      }

      // Reset project pointer
      const { error: resetErr } = await s.from('ai_story_projects')
        .update({ current_chapter: 0 })
        .eq('novel_id', novelId);
      if (resetErr) {
        console.log(`  ✗ current_chapter reset failed: ${resetErr.message}`);
        continue;
      }
      console.log(`  ✓ current_chapter = 0`);

      // Verify chapter_count denormalized
      const { count: after } = await s.from('chapters')
        .select('id', { count: 'exact', head: true })
        .eq('novel_id', novelId);
      const { data: novelAfter } = await s.from('novels')
        .select('chapter_count')
        .eq('id', novelId)
        .single();
      console.log(`  verify: chapters_in_db=${after} novel.chapter_count=${novelAfter?.chapter_count}`);

      // Reactivate
      const { error: actErr } = await s.from('ai_story_projects')
        .update({ status: 'active' })
        .eq('novel_id', novelId);
      if (actErr) {
        console.log(`  ✗ reactivate failed: ${actErr.message}`);
        continue;
      }
      console.log(`  ✓ reactivated — cron will write from chapter 1`);
    }
  }
}
main().catch(console.error);
