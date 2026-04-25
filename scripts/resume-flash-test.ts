/**
 * Resume Flash test from last written chapter.
 * Usage: npx tsx scripts/resume-flash-test.ts <projectId> [--target 20]
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';
process.env.DEBUG_ROUTING = '1';

import { createClient } from '@supabase/supabase-js';
import { writeOneChapter } from '@/services/story-engine/pipeline/orchestrator';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const projectId = process.argv[2];
if (!projectId) { console.error('Usage: resume-flash-test.ts <projectId> [--target N]'); process.exit(1); }
const targetIdx = process.argv.indexOf('--target');
const TARGET = targetIdx > 0 ? Number(process.argv[targetIdx + 1]) : 20;

const ALL_TASKS = [
  'master_outline', 'story_outline', 'story_bible', 'synopsis', 'arc_plan',
  'architect', 'writer', 'writer_continuation', 'critic', 'auto_revision',
  'chapter_summary', 'combined_summary', 'character_knowledge', 'character_arc',
  'power_system', 'voice_fingerprint', 'world_expansion', 'location_bible',
  'pacing', 'foreshadowing', 'plot_tracker',
];
const routing: Record<string, string> = {};
for (const t of ALL_TASKS) routing[t] = 'deepseek-v4-flash';
(globalThis as { __MODEL_ROUTING__?: Record<string, string> }).__MODEL_ROUTING__ = routing;

async function main() {
  const { data: proj } = await s.from('ai_story_projects').select('current_chapter,total_planned_chapters,status').eq('id', projectId).single();
  if (!proj) throw new Error('Project not found');
  console.log(`▶ Project ${projectId}: current=${proj.current_chapter}, target=${TARGET}, status=${proj.status}`);

  const start = (proj.current_chapter as number || 0) + 1;
  let written = 0, failed = 0;
  const t0 = Date.now();
  for (let i = start; i <= TARGET; i++) {
    const tc0 = Date.now();
    try {
      const r = await writeOneChapter({ projectId });
      console.log(`  ✓ Ch.${r.chapterNumber}: "${r.title}" — ${r.wordCount}w Q${r.qualityScore} ${Math.round((Date.now() - tc0) / 1000)}s`);
      written++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ Ch.${i} FAILED: ${msg.slice(0, 200)}`);
      failed++;
      // Backoff on consecutive failures
      if (failed >= 3) {
        console.log(`  [retry-sleep] ${failed} consecutive fails — sleeping 60s before continuing`);
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }
  console.log(`\n▶ Done: ${written} written, ${failed} failed, ${Math.round((Date.now() - t0) / 1000)}s total`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
