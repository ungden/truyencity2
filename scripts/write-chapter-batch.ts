// Sequential chapter writer — loop writeOneChapter() until target_chapter reached.
// Usage: PROJECT_ID=<uuid> TARGET_CHAPTER=13 npx tsx scripts/write-chapter-batch.ts

import * as dotenv from 'dotenv';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { writeOneChapter } from '../src/services/story-engine/pipeline/orchestrator';
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const projectId = process.env.PROJECT_ID;
  const targetChapter = Number(process.env.TARGET_CHAPTER || '13');
  if (!projectId) { console.error('PROJECT_ID env required'); process.exit(1); }

  while (true) {
    const { data: project } = await db.from('ai_story_projects').select('current_chapter').eq('id', projectId).maybeSingle();
    const current = project?.current_chapter ?? 0;
    if (current >= targetChapter) {
      console.log(`\n✓ Reached target ch.${targetChapter} (current=${current}). Stopping.`);
      break;
    }
    const next = current + 1;
    console.log(`\n========== Writing ch.${next} (target=${targetChapter}) ==========`);
    const t0 = Date.now();
    try {
      const result = await writeOneChapter({ projectId });
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`✓ ch.${(result as any).chapterNumber} "${(result as any).title}" — ${(result as any).wordCount}w, score=${(result as any).qualityScore}/10 (${elapsed}s)`);
    } catch (e) {
      console.error(`✗ ch.${next} FAILED:`, (e as Error).message);
      process.exit(1);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
