import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { summarizeChapter } from '@/services/story-writing-factory/context-generators';
import { saveChapterSummary } from '@/services/story-writing-factory/context-loader';

dotenv.config({ path: '.env.local' });

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const ai = new AIProviderService({ gemini: getEnv('GEMINI_API_KEY') });

  const { data: projects, error: pErr } = await supabase
    .from('ai_story_projects')
    .select('id,novel_id,main_character')
    .eq('status', 'active');
  if (pErr) throw new Error(`Load projects failed: ${pErr.message}`);

  let filled = 0;
  for (const p of projects || []) {
    const [{ data: chapters, error: cErr }, { data: sums, error: sErr }] = await Promise.all([
      supabase
        .from('chapters')
        .select('chapter_number,title,content')
        .eq('novel_id', p.novel_id),
      supabase
        .from('chapter_summaries')
        .select('chapter_number')
        .eq('project_id', p.id),
    ]);
    if (cErr) throw new Error(`Load chapters failed for ${p.id}: ${cErr.message}`);
    if (sErr) throw new Error(`Load summaries failed for ${p.id}: ${sErr.message}`);

    const have = new Set((sums || []).map((x) => x.chapter_number));
    const missing = (chapters || [])
      .filter((ch) => !have.has(ch.chapter_number))
      .sort((a, b) => a.chapter_number - b.chapter_number);

    for (const ch of missing) {
      const res = await summarizeChapter(
        ai,
        p.id,
        ch.chapter_number,
        ch.title || `Chương ${ch.chapter_number}`,
        ch.content || '',
        p.main_character || 'MC',
      );
      await saveChapterSummary(
        p.id,
        ch.chapter_number,
        ch.title || `Chương ${ch.chapter_number}`,
        res.summary,
        res.openingSentence,
        res.mcState,
        res.cliffhanger,
      );
      filled++;
      console.log(`[OK ${p.id.slice(0, 8)}] summary ch.${ch.chapter_number}`);
    }
  }

  console.log(`Done. Filled summaries: ${filled}`);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
