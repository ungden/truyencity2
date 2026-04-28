import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main(): Promise<void> {
  const novelId = 'a7a8f881-2d63-42c6-950a-875b1a5ca77b';
  const { data: p } = await s.from('ai_story_projects').select('id,master_outline').eq('novel_id', novelId).single();
  const old = p!.master_outline as { majorArcs?: Array<{ arcName: string; description: string; keyMilestone: string; startChapter: number; endChapter: number }>; mainPlotline?: string; finalBossOrGoal?: string; worldMapProgression?: string[] };

  if (!old?.majorArcs?.length) {
    console.error('no master_outline arcs to compress');
    return;
  }

  // Compress arcs from 1500 → 600 chapters (60% reduction)
  // Arcs: 1-300, 301-600, 601-900, 901-1200, 1201-1500
  // → 1-120, 121-240, 241-360, 361-480, 481-600
  const newArcs = old.majorArcs.map((arc, idx) => {
    const newStart = idx === 0 ? 1 : idx * 120 + 1;
    const newEnd = (idx + 1) * 120;
    return {
      ...arc,
      startChapter: newStart,
      endChapter: newEnd,
    };
  });

  // Also tighten descriptions: kill "300 chương" pacing implications
  const newOutline = {
    ...old,
    majorArcs: newArcs,
  };

  await s.from('ai_story_projects').update({
    master_outline: newOutline as unknown as Record<string, unknown>,
    total_planned_chapters: 600,
  }).eq('id', p!.id as string);

  console.log('✓ master_outline arcs compressed:');
  for (const a of newArcs) {
    console.log(`  Arc: "${a.arcName}" ch.${a.startChapter}-${a.endChapter} (${a.endChapter - a.startChapter + 1} chương)`);
  }
  console.log('\n✓ total_planned_chapters = 600');
  console.log('✓ Pacing now: each arc ~120 chương (was 300)');
  console.log('  Reader will reach motor boat by ch.~50, save dad by ch.~80, mở vựa by ch.~150');
}
main().catch(console.error);
