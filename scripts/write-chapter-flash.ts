// Manually trigger writeOneChapter() for a project. Used to run ch.1-3 of a
// new novel before adding it to the cron FOCUSED_PROJECT_IDS allowlist.
//
// Usage: PROJECT_ID=<uuid> npx tsx scripts/write-chapter-flash.ts

import * as dotenv from 'dotenv';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { writeOneChapter } from '../src/services/story-engine/pipeline/orchestrator';

async function main() {
  const projectId = process.env.PROJECT_ID;
  if (!projectId) {
    console.error('PROJECT_ID env var required');
    process.exit(1);
  }
  console.log(`Triggering writeOneChapter() for project ${projectId} ...`);
  const t0 = Date.now();
  const result = await writeOneChapter({ projectId });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);
  console.log(JSON.stringify({
    success: true,
    chapterNumber: result.chapterNumber,
    chapterId: (result as any).chapterId,
    title: (result as any).title,
    wordCount: (result as any).wordCount,
    qualityScore: (result as any).qualityScore,
    errors: (result as any).errors ?? null,
    warnings: (result as any).warnings ?? null,
  }, null, 2));
}

main().catch((e) => {
  console.error('writeOneChapter FAILED:', e);
  process.exit(1);
});
