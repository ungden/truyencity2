// Run blueprint delta-detection on a project's recent chapters.
// Compares chapter_summaries + character_states + plot_threads (actual)
// against chapter_blueprints (planned). Persists deltas to
// chapter_blueprints.actual_summary_delta JSONB for forward propagation.
//
// Usage:
//   PROJECT_ID=<uuid> NOVEL_ID=<uuid> [FROM=N] [TO=M] npx tsx scripts/run-delta-detection.ts

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { runDeltaDetection, persistDeltaReport, formatDeltaReport, loadProjectWideCast } from '../src/services/story-engine/blueprint/delta-detector';

async function main() {
  const projectId = process.env.PROJECT_ID;
  const novelId = process.env.NOVEL_ID;
  const fromCh = Number(process.env.FROM || '1');
  const toCh = Number(process.env.TO || '0');
  if (!projectId) { console.error('PROJECT_ID env required'); process.exit(1); }
  if (!novelId) { console.error('NOVEL_ID env required'); process.exit(1); }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: project } = await db.from('ai_story_projects')
    .select('current_chapter, total_planned_chapters')
    .eq('id', projectId)
    .maybeSingle();
  const current = project?.current_chapter ?? 0;
  const total = project?.total_planned_chapters ?? 1000;
  const targetTo = toCh > 0 ? toCh : current;
  const projectWideCast = await loadProjectWideCast(db, projectId);
  console.log(`Loaded project-wide cast: ${projectWideCast.length} characters\n`);

  let totalHard = 0;
  let totalMedium = 0;
  let totalSoft = 0;
  for (let ch = fromCh; ch <= targetTo; ch++) {
    const report = await runDeltaDetection(db, projectId, ch, total, novelId, { projectWideCast });
    if (report.deltas.length === 0) {
      console.log(`ch.${ch}: no deltas`);
      continue;
    }
    console.log(formatDeltaReport(report));
    await persistDeltaReport(db, report);
    totalHard += report.hardCount;
    totalMedium += report.mediumCount;
    totalSoft += report.softCount;
  }
  console.log(`\n=== TOTAL ch.${fromCh}-${targetTo} ===`);
  console.log(`hard=${totalHard} medium=${totalMedium} soft=${totalSoft}`);
  if (totalHard > 0) {
    console.log('\n⚠ HARD deltas detected — manual review recommended');
    process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
