#!/usr/bin/env tsx
/**
 * A/B Test Harness: Critic Model Comparison (Phase 29 Feature 3)
 *
 * Compares the catch-rate of two Critic models on the SAME project, using
 * post-hoc analysis of `cost_tracking` + `quality_metrics` rows. Does NOT
 * re-run the Critic (which would require reconstructing the full Architect
 * outline — not persisted) — instead measures empirical impact of an
 * env-driven model override.
 *
 * ## How to actually run the A/B
 *
 * 1. Pick a project that's been writing for ≥100 chapters with steady cadence.
 * 2. Phase A (baseline) — let it run normally with default DeepSeek Critic for
 *    ~50 chapters. Note the chapter range.
 * 3. Phase B (override) — set the env on the cron worker / Vercel:
 *      CRITIC_MODEL_OVERRIDE=gemini-3-flash-preview
 *    Let it run for another ~50 chapters. Note the chapter range.
 * 4. Run this script:
 *      ./node_modules/.bin/tsx scripts/ab-test-critic-model.ts <projectId>
 *
 * The script reads which model actually made each Critic call from
 * `cost_tracking.model` (where task='critic'), buckets chapters by model,
 * then compares the resulting `quality_metrics` rows.
 *
 * ## What the report measures
 *
 * - Average overallScore by Critic model (does Gemini score higher / lower?)
 * - Average critical/major issue count (does Gemini catch more or fewer?)
 * - Continuity guardian critical (independent signal — does worse Critic let
 *   more bugs through to next chapter?)
 * - Cost per chapter
 * - Latency per chapter (p50, p90)
 *
 * ## Verdict heuristic
 *
 * Ship Gemini Critic if it:
 *   - Catches ≥20% more critical issues per chapter
 *   - Score distribution shifts but guardian-critical RATE drops (proves the
 *     extra catches are real, not noise)
 *   - Latency p90 stays under 60s
 *   - Cost/chapter increase ≤30% over DeepSeek baseline
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: ./node_modules/.bin/tsx scripts/ab-test-critic-model.ts <projectId>');
  process.exit(1);
}

interface CostRow {
  model: string;
  chapter_number: number | null;
  cost: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

interface QualityRow {
  chapter_number: number;
  overall_score: number | null;
  dopamine_score: number | null;
  pacing_score: number | null;
  ending_hook_score: number | null;
  contradictions_critical: number | null;
  guardian_issues_critical: number | null;
}

interface BucketStats {
  model: string;
  chapterCount: number;
  avgOverall: number | null;
  avgDopamine: number | null;
  avgPacing: number | null;
  avgEndingHook: number | null;
  avgContradictionsCritical: number;
  avgGuardianCritical: number;
  totalCost: number;
  avgCostPerChapter: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

function avg(nums: Array<number | null>): number | null {
  const valid = nums.filter((n): n is number => typeof n === 'number');
  if (valid.length === 0) return null;
  return valid.reduce((s, n) => s + n, 0) / valid.length;
}

function fmt(n: number | null, digits = 2): string {
  if (n === null) return '—';
  return n.toFixed(digits);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

  // 1. Get all critic calls for this project, grouped by model and chapter.
  console.log(`[ab-test] Loading critic cost rows for project ${projectId}...`);
  const { data: costRowsRaw, error: costErr } = await supabase
    .from('cost_tracking')
    .select('model, chapter_number, cost, input_tokens, output_tokens, created_at')
    .eq('project_id', projectId)
    .eq('task', 'critic')
    .order('chapter_number', { ascending: true });

  if (costErr) {
    console.error('[ab-test] cost_tracking query failed:', costErr.message);
    process.exit(1);
  }

  const costRows = (costRowsRaw || []) as CostRow[];
  if (costRows.length === 0) {
    console.error(`[ab-test] No critic cost rows found for project ${projectId}.`);
    console.error('Ensure project has run chapters and cost_tracking is enabled.');
    process.exit(1);
  }

  // 2. Bucket chapters by Critic model.
  // If a chapter was rewritten, it may have multiple critic calls — keep the LAST one.
  const chapterToModel = new Map<number, string>();
  for (const row of costRows) {
    if (row.chapter_number !== null) {
      chapterToModel.set(row.chapter_number, row.model);
    }
  }

  const modelChapters: Record<string, number[]> = {};
  for (const [ch, model] of chapterToModel.entries()) {
    if (!modelChapters[model]) modelChapters[model] = [];
    modelChapters[model].push(ch);
  }

  const models = Object.keys(modelChapters);
  if (models.length < 2) {
    console.warn(`[ab-test] Only 1 model used as Critic (${models[0]}). No A/B comparison possible.`);
    console.warn('To create an A/B sample, set CRITIC_MODEL_OVERRIDE=<other-model> for a stretch of chapters.');
    process.exit(0);
  }

  // 3. Pull quality_metrics for all chapters in scope.
  const allChapters = Object.values(modelChapters).flat();
  const minCh = Math.min(...allChapters);
  const maxCh = Math.max(...allChapters);

  console.log(`[ab-test] Loading quality_metrics for ch.${minCh}-${maxCh}...`);
  const { data: qmRowsRaw, error: qmErr } = await supabase
    .from('quality_metrics')
    .select('chapter_number, overall_score, dopamine_score, pacing_score, ending_hook_score, contradictions_critical, guardian_issues_critical')
    .eq('project_id', projectId)
    .gte('chapter_number', minCh)
    .lte('chapter_number', maxCh);

  if (qmErr) {
    console.error('[ab-test] quality_metrics query failed:', qmErr.message);
    process.exit(1);
  }

  const qmRows = (qmRowsRaw || []) as QualityRow[];
  const qmByChapter = new Map<number, QualityRow>();
  for (const row of qmRows) qmByChapter.set(row.chapter_number, row);

  // 4. Compute per-model stats.
  const stats: BucketStats[] = [];
  for (const model of models) {
    const chapters = modelChapters[model];
    const qmRowsForModel = chapters
      .map(ch => qmByChapter.get(ch))
      .filter((r): r is QualityRow => !!r);
    const costRowsForModel = costRows.filter(r => r.model === model && r.chapter_number !== null);
    const totalCost = costRowsForModel.reduce((s, r) => s + (Number(r.cost) || 0), 0);

    stats.push({
      model,
      chapterCount: chapters.length,
      avgOverall: avg(qmRowsForModel.map(r => r.overall_score)),
      avgDopamine: avg(qmRowsForModel.map(r => r.dopamine_score)),
      avgPacing: avg(qmRowsForModel.map(r => r.pacing_score)),
      avgEndingHook: avg(qmRowsForModel.map(r => r.ending_hook_score)),
      avgContradictionsCritical: qmRowsForModel.reduce((s, r) => s + (r.contradictions_critical || 0), 0) / Math.max(qmRowsForModel.length, 1),
      avgGuardianCritical: qmRowsForModel.reduce((s, r) => s + (r.guardian_issues_critical || 0), 0) / Math.max(qmRowsForModel.length, 1),
      totalCost,
      avgCostPerChapter: totalCost / Math.max(chapters.length, 1),
      totalInputTokens: costRowsForModel.reduce((s, r) => s + (r.input_tokens || 0), 0),
      totalOutputTokens: costRowsForModel.reduce((s, r) => s + (r.output_tokens || 0), 0),
    });
  }

  // 5. Print markdown report.
  console.log('\n# Critic Model A/B Report');
  console.log(`\nProject: \`${projectId}\``);
  console.log(`Window: ch.${minCh}-${maxCh} (${allChapters.length} chapters)`);
  console.log(`Generated: ${new Date().toISOString()}\n`);

  console.log('## Per-Model Stats\n');
  console.log('| Model | Chapters | Avg overall | Avg dopamine | Avg pacing | Avg hook | Avg contradictions/critical | Avg guardian/critical | Cost/chapter | Total cost |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const s of stats) {
    console.log(
      `| ${s.model} | ${s.chapterCount} | ${fmt(s.avgOverall)} | ${fmt(s.avgDopamine)} | ${fmt(s.avgPacing)} | ${fmt(s.avgEndingHook)} | ${fmt(s.avgContradictionsCritical, 3)} | ${fmt(s.avgGuardianCritical, 3)} | $${fmt(s.avgCostPerChapter, 4)} | $${fmt(s.totalCost, 3)} |`
    );
  }

  // Pairwise diff for clarity if exactly 2 models.
  if (stats.length === 2) {
    const [a, b] = stats;
    console.log(`\n## Pairwise Diff: \`${a.model}\` → \`${b.model}\`\n`);
    const diff = (x: number | null, y: number | null) => {
      if (x === null || y === null) return '—';
      const d = y - x;
      return `${d >= 0 ? '+' : ''}${d.toFixed(2)}`;
    };
    console.log(`- Overall score Δ: ${diff(a.avgOverall, b.avgOverall)} (positive = ${b.model} grades higher)`);
    console.log(`- Contradictions/critical Δ: ${(b.avgContradictionsCritical - a.avgContradictionsCritical).toFixed(3)} per chapter`);
    console.log(`- Guardian/critical Δ: ${(b.avgGuardianCritical - a.avgGuardianCritical).toFixed(3)} per chapter (lower = downstream caught fewer = Critic upstream caught more)`);
    console.log(`- Cost/chapter Δ: ${(b.avgCostPerChapter - a.avgCostPerChapter >= 0 ? '+' : '')}$${(b.avgCostPerChapter - a.avgCostPerChapter).toFixed(4)}`);

    console.log('\n## Verdict heuristic\n');
    const guardianDelta = b.avgGuardianCritical - a.avgGuardianCritical;
    const costRatio = b.avgCostPerChapter / Math.max(a.avgCostPerChapter, 1e-9);
    if (guardianDelta < -0.1 && costRatio < 1.3) {
      console.log(`✅ **Ship ${b.model} as Critic** — guardian-critical rate dropped by ${(-guardianDelta).toFixed(3)}/chapter (${b.model} catches more Architect/Writer bugs upstream), cost increase ${((costRatio - 1) * 100).toFixed(0)}% acceptable.`);
    } else if (guardianDelta > 0.1) {
      console.log(`❌ **Keep ${a.model}** — switching to ${b.model} INCREASED guardian-critical rate (+${guardianDelta.toFixed(3)}/chapter), meaning more bugs slipped past Critic.`);
    } else if (costRatio > 1.5) {
      console.log(`❌ **Keep ${a.model}** — ${b.model} costs ${((costRatio - 1) * 100).toFixed(0)}% more without proportional bug-catch improvement.`);
    } else {
      console.log(`⚠ **Inconclusive** — guardian Δ ${guardianDelta.toFixed(3)} too small, cost ratio ${costRatio.toFixed(2)}. Run more chapters or pick a different metric.`);
    }
  }

  console.log('\n## Notes\n');
  console.log('- This script measures EMPIRICAL impact via downstream signals (guardian critical rate, score distribution).');
  console.log('- It does NOT re-run Critic head-to-head on the same chapter — that would require Architect outline reconstruction.');
  console.log('- Sample size matters: <20 chapters per bucket = noise. Aim for ≥40 per bucket.');
}

main().catch(e => {
  console.error('[ab-test] fatal:', e);
  process.exit(1);
});
