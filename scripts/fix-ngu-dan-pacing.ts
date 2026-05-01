/**
 * Fix Ngư Dân 1992 pacing + repetition issues:
 *  1. total_planned 1500 → 600 (more readable, arcs of 120-150 ch)
 *  2. Regenerate master_outline with 4-5 dense arcs (don't wipe chapters)
 *  3. Enable disable_chapter_split for future chapters (won't affect existing 18)
 *
 * NOT wiping chapters — they're decent quality, just slow pacing. Cron will
 * write next chapters with denser pacing under new master_outline.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/plan/master-outline';
import type { GeminiConfig } from '@/services/story-engine/types';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main(): Promise<void> {
  const novelId = 'a7a8f881-2d63-42c6-950a-875b1a5ca77b';
  const { data: n } = await s.from('novels').select('id,title').eq('id', novelId).single();
  const { data: p } = await s.from('ai_story_projects').select('id,world_description,style_directives').eq('novel_id', novelId).single();

  console.log(`▶ ${n!.title}`);

  // 1. Reduce total_planned_chapters
  const NEW_TOTAL = 600;

  // 2. Update style_directives to enable chapter split disable + add anti-repetition hint
  const oldDirectives = (p!.style_directives as Record<string, unknown>) || {};
  const newDirectives = {
    ...oldDirectives,
    disable_chapter_split: true, // future chapters will be 1 reader chapter each (~2800 từ)
    anti_repetition_strict: true, // hint to engine
  };

  await s.from('ai_story_projects').update({
    total_planned_chapters: NEW_TOTAL,
    style_directives: newDirectives,
  }).eq('id', p!.id as string);
  console.log(`  ✓ total_planned 1500 → ${NEW_TOTAL}`);
  console.log(`  ✓ disable_chapter_split = true (future chapters denser)`);
  console.log(`  ✓ anti_repetition_strict flag added`);

  // 3. Regenerate master_outline with new total — engine will create denser arcs
  console.log(`  → regenerating master_outline (${NEW_TOTAL} ch, 4-5 dense arcs)...`);
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096 };
  const master = await generateMasterOutline(
    p!.id as string,
    n!.title as string,
    'do-thi',
    p!.world_description as string,
    NEW_TOTAL,
    cfg,
  );
  if (!master) {
    console.error('  ✗ master_outline regen failed');
    return;
  }
  console.log(`  ✓ master_outline regenerated (${master.majorArcs.length} arcs)`);
  for (const a of master.majorArcs) {
    console.log(`    Arc: "${a.arcName}" ch.${a.startChapter}-${a.endChapter} (${a.endChapter - a.startChapter + 1} chương)`);
  }

  // 4. Pre-flight validation in orchestrator will auto-sync total_planned to
  //    master_outline coverage at next chapter write — already deployed.
}
main().catch(console.error);
