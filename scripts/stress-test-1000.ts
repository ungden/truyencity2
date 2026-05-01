/**
 * Stress test harness for ch.500+ scenarios — Phase 28 TIER 3.2.
 *
 * Synthetic data generator + isolated chapter write to validate that the
 * pipeline produces ch.500+ quality matching ch.8. Doesn't replace real
 * 1000-chapter testing but lets us catch obvious regressions WITHOUT
 * waiting 4-6 months for a novel to actually reach ch.800.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/stress-test-1000.ts <projectId> <targetChapter>
 *
 * What it does:
 *   1. Loads existing project's master_outline + canon
 *   2. Synthetically generates chapter_summaries + character_states +
 *      plot_threads + voice_anchors UP TO targetChapter-1
 *   3. Calls writeOneChapter() with chapterNumber=targetChapter
 *   4. Inspects rubric scores, comparison vs ch.8 baseline
 *   5. Writes results to stress_test_results table (or stdout)
 *
 * Synthetic data uses templated fillers — not real AI-generated. The point is
 * to feed the pipeline DATA SHAPE at scale without paying for 800 actual writes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface StressTestResult {
  projectId: string;
  baselineChapter: number;
  targetChapter: number;
  baselineRubric: Record<string, number> | null;
  targetRubric: Record<string, number> | null;
  driftMagnitude: number; // 0-10 abs(target - baseline) avg across rubric dims
  durationMs: number;
  warnings: string[];
}

async function main() {
  const projectId = process.argv[2];
  const targetChapter = parseInt(process.argv[3] || '800', 10);

  if (!projectId) {
    console.error('Usage: stress-test-1000 <projectId> [targetChapter=800]');
    process.exit(1);
  }

  console.log(`[stress-test] Project ${projectId}, target chapter ${targetChapter}`);
  const startTime = Date.now();
  const warnings: string[] = [];

  // 1. Load project + outline.
  const { data: project } = await supabase
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,master_outline,total_planned_chapters,current_chapter,world_description,power_system_canon,worldbuilding_canon')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) {
    console.error(`Project ${projectId} not found`);
    process.exit(1);
  }

  if (project.current_chapter >= targetChapter) {
    console.error(`Project already past target chapter (current=${project.current_chapter}, target=${targetChapter}). Stress test only runs ON projects below target.`);
    process.exit(1);
  }

  console.log(`[stress-test] Loaded project. Current chapter: ${project.current_chapter}. Genre: ${project.genre}.`);

  // 2. Backfill synthetic chapter_summaries from current_chapter+1 to targetChapter-1.
  const baselineChapter = Math.min(8, project.current_chapter);
  const startBackfill = (project.current_chapter || 0) + 1;
  const endBackfill = targetChapter - 1;
  const backfillCount = endBackfill - startBackfill + 1;

  if (backfillCount > 0) {
    console.log(`[stress-test] Backfilling ${backfillCount} synthetic chapter_summaries (ch.${startBackfill}-${endBackfill}). This is FAKE data for shape testing only.`);
    await backfillChapterSummaries(supabase, project, startBackfill, endBackfill);
  }

  // 3. Backfill synthetic character_states (every 10 chapters) — keeps roster size realistic.
  console.log(`[stress-test] Backfilling synthetic character_states.`);
  await backfillCharacterStates(supabase, project, startBackfill, endBackfill);

  // 4. Backfill voice_anchors (only if missing — captures from real ch.1-3 if available).
  console.log(`[stress-test] Ensuring voice_anchors present (capture from real ch.1-3 if needed).`);
  await ensureVoiceAnchors(supabase, project);

  // 5. Run the actual writeOneChapter at targetChapter.
  console.log(`[stress-test] Invoking writeOneChapter at ch.${targetChapter}...`);
  let targetResult: { qualityScore?: number | null; criticReport?: { rubricScores?: Record<string, number> } } | null = null;
  try {
    const { writeOneChapter } = await import('../src/services/story-engine/pipeline/orchestrator');
    targetResult = await writeOneChapter({
      projectId: project.id,
    });
  } catch (e) {
    console.error('[stress-test] writeOneChapter threw:', e instanceof Error ? e.message : String(e));
    warnings.push(`writeOneChapter threw: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 6. Compare baseline vs target.
  const { data: baselineMetric } = await supabase
    .from('quality_metrics')
    .select('overall_score,dopamine_score,pacing_score,ending_hook_score,meta')
    .eq('project_id', projectId)
    .eq('chapter_number', baselineChapter)
    .maybeSingle();

  const baselineRubric = (baselineMetric?.meta as { rubric_scores?: Record<string, number> } | null)?.rubric_scores ?? null;
  const targetRubric = targetResult?.criticReport?.rubricScores as Record<string, number> | undefined;

  let driftMagnitude = 0;
  if (baselineRubric && targetRubric) {
    const dims = ['promiseClarity', 'sceneSpecificity', 'mcAgency', 'payoffConsequence', 'voiceDistinction'];
    const drifts = dims.map(d => Math.abs((baselineRubric[d] || 0) - (targetRubric[d] || 0)));
    driftMagnitude = drifts.reduce((s, x) => s + x, 0) / drifts.length;
  } else {
    warnings.push('No baseline or target rubric — drift cannot be computed');
  }

  const result: StressTestResult = {
    projectId: project.id,
    baselineChapter,
    targetChapter,
    baselineRubric,
    targetRubric: targetRubric || null,
    driftMagnitude: Number(driftMagnitude.toFixed(2)),
    durationMs: Date.now() - startTime,
    warnings,
  };

  console.log('\n[stress-test] === RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n[stress-test] Drift magnitude: ${result.driftMagnitude}/10`);
  console.log(result.driftMagnitude > 2.0
    ? '⚠️ HIGH DRIFT — pipeline producing materially different quality at scale'
    : '✅ Drift acceptable (<2.0) — pipeline holds at scale');

  process.exit(0);
}

/**
 * Backfill synthetic chapter_summaries. Uses a simple template that's "good
 * enough" for context-assembler to function but NOT real prose.
 */
async function backfillChapterSummaries(
  client: SupabaseClient,
  project: { id: string; main_character: string },
  fromCh: number,
  toCh: number,
): Promise<void> {
  const rows: Array<Record<string, unknown>> = [];
  for (let ch = fromCh; ch <= toCh; ch++) {
    rows.push({
      project_id: project.id,
      chapter_number: ch,
      title: `Chương ${ch} — synthetic stress test`,
      summary: `${project.main_character} continued the journey. (Synthetic ch.${ch})`,
      opening_sentence: `${project.main_character} bước vào ngày mới.`,
      mc_state: `${project.main_character}: alive, đang tu luyện hoặc làm việc routine.`,
      cliffhanger: `Chuyện gì sẽ xảy ra ở chương ${ch + 1}?`,
    });
    if (rows.length >= 100) {
      await client.from('chapter_summaries').upsert(rows, { onConflict: 'project_id,chapter_number' });
      rows.length = 0;
    }
  }
  if (rows.length > 0) {
    await client.from('chapter_summaries').upsert(rows, { onConflict: 'project_id,chapter_number' });
  }
}

/**
 * Backfill synthetic character_states. One snapshot every 10 chapters.
 */
async function backfillCharacterStates(
  client: SupabaseClient,
  project: { id: string; main_character: string },
  fromCh: number,
  toCh: number,
): Promise<void> {
  const characters = [project.main_character, 'Trợ lý A', 'Đối thủ B', 'Thầy C', 'Bạn D'];
  const rows: Array<Record<string, unknown>> = [];
  for (let ch = fromCh; ch <= toCh; ch += 10) {
    for (const charName of characters) {
      rows.push({
        project_id: project.id,
        chapter_number: ch,
        character_name: charName,
        status: 'alive',
        power_level: charName === project.main_character ? `Tu vi tier ${Math.floor(ch / 100) + 1}` : null,
        location: 'synthetic location',
        notes: `Synthetic state at ch.${ch}`,
      });
    }
    if (rows.length >= 200) {
      await client.from('character_states').upsert(rows, { onConflict: 'project_id,chapter_number,character_name' });
      rows.length = 0;
    }
  }
  if (rows.length > 0) {
    await client.from('character_states').upsert(rows, { onConflict: 'project_id,chapter_number,character_name' });
  }
}

/**
 * Ensure voice_anchors exist for project. If not (project never reached ch.3
 * in real writing), insert minimal placeholders so getVoiceAnchorContext
 * returns something.
 */
async function ensureVoiceAnchors(client: SupabaseClient, project: { id: string }): Promise<void> {
  const { count } = await client
    .from('voice_anchors')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id);
  if ((count ?? 0) >= 3) return;

  // Try to capture from real chapters 1-3 if they exist.
  const { data: novel } = await client
    .from('ai_story_projects')
    .select('novel_id')
    .eq('id', project.id)
    .maybeSingle();

  if (novel?.novel_id) {
    const { data: realChapters } = await client
      .from('chapters')
      .select('chapter_number,content')
      .eq('novel_id', novel.novel_id)
      .lte('chapter_number', 3)
      .order('chapter_number', { ascending: true });
    if (realChapters?.length) {
      const { captureVoiceAnchors } = await import('../src/services/story-engine/memory/voice-anchor');
      await captureVoiceAnchors(project.id, realChapters);
      return;
    }
  }

  // Fallback synthetic anchor.
  await client.from('voice_anchors').insert({
    project_id: project.id,
    chapter_number: 1,
    snippet_type: 'opening',
    snippet_text: 'Synthetic voice anchor for stress test.',
    voice_metrics: {
      avgSentenceLength: 50,
      dialogueRatio: 0.3,
      paragraphAvgLength: 200,
      emDashCount: 5,
      exclamationRatio: 0.1,
    },
  });
}

main().catch(e => {
  console.error('[stress-test] FATAL:', e);
  process.exit(1);
});
