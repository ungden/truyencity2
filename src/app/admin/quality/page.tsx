/**
 * Admin Quality Dashboard (Phase 23 S3)
 *
 * Single-page server component showing:
 *  - Overview: novels active/paused, chapters/24h, avg quality, monthly cost
 *  - Quality issues: low-score chapters, guardian flags, contradictions
 *  - Cost: spend by task, cache hit rate, projection
 *  - Errors: failed memory tasks queue
 *
 * Auth via existing admin layout (which checks user.role='admin' upstream).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkMonthlyBudget } from '@/services/story-engine/utils/budget-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface QualityRow { chapter_number: number; overall_score: number | null; guardian_issues_critical: number; contradictions_critical: number; project_id: string }
interface CostRow { task: string; cost: number; input_tokens: number; output_tokens: number; metadata: { cache_hit_tokens?: number } | null }

export default async function QualityDashboardPage() {
  const supabase = getSupabaseAdmin();

  // Overview counts
  const [
    { count: activeCount },
    { count: pausedCount },
    chapters24h,
    qualityAvg,
    failedTasks,
    badChapters,
    costByTask,
    budget,
  ] = await Promise.all([
    supabase.from('ai_story_projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('ai_story_projects').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
    supabase.from('chapters').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    supabase.from('quality_metrics').select('overall_score').gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
    supabase.from('failed_memory_tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('quality_metrics').select('chapter_number,overall_score,guardian_issues_critical,contradictions_critical,project_id')
      .or('overall_score.lt.6,guardian_issues_critical.gt.0,contradictions_critical.gt.0')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('cost_tracking').select('task,cost,input_tokens,output_tokens,metadata')
      .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(10000),
    checkMonthlyBudget(),
  ]);

  // Quality average over last 7 days
  const qScores = (qualityAvg.data || []).map((r: { overall_score: number | null }) => r.overall_score).filter((s): s is number => typeof s === 'number');
  const avgQuality = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : null;

  // Aggregate cost by task
  const taskAgg: Record<string, { cost: number; count: number; input: number; output: number; cacheHits: number }> = {};
  for (const r of (costByTask.data || []) as CostRow[]) {
    const t = taskAgg[r.task] = taskAgg[r.task] || { cost: 0, count: 0, input: 0, output: 0, cacheHits: 0 };
    t.cost += Number(r.cost) || 0;
    t.count += 1;
    t.input += r.input_tokens || 0;
    t.output += r.output_tokens || 0;
    t.cacheHits += (r.metadata?.cache_hit_tokens) || 0;
  }
  const tasksSorted = Object.entries(taskAgg).sort((a, b) => b[1].cost - a[1].cost);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quality Dashboard</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Novels active" value={String(activeCount || 0)} />
        <Card label="Novels paused" value={String(pausedCount || 0)} sub={pausedCount && pausedCount > 50 ? '⚠ many paused' : ''} />
        <Card label="Chapters 24h" value={String(chapters24h.count || 0)} />
        <Card
          label="Avg quality (7d)"
          value={avgQuality !== null ? avgQuality.toFixed(2) : '—'}
          sub={avgQuality !== null && avgQuality < 6.5 ? '⚠ low' : ''}
        />
        <Card
          label="Monthly cost"
          value={`$${budget.spentUsd.toFixed(0)}`}
          sub={`${budget.pctUsed.toFixed(0)}% of $${budget.budgetUsd}`}
        />
        <Card
          label="Budget alert"
          value={budget.alertLevel.toUpperCase()}
          sub={budget.shouldPauseSpawn ? '⚠ pausing spawn at 90%' : ''}
        />
        <Card
          label="Failed memory tasks"
          value={String(failedTasks.count || 0)}
          sub={(failedTasks.count || 0) > 50 ? '⚠ replay falling behind' : 'pending'}
        />
        <Card label="Bad chapters" value={String(badChapters.data?.length || 0)} sub="last 20 with issues" />
      </div>

      {/* Bad chapters detail */}
      {badChapters.data && badChapters.data.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Recent low-quality chapters</h2>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Ch.</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Guardian critical</th>
                  <th className="px-3 py-2 text-left">Contradictions critical</th>
                </tr>
              </thead>
              <tbody>
                {(badChapters.data as QualityRow[]).map((r, i) => (
                  <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2 font-mono text-xs">{r.project_id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{r.chapter_number}</td>
                    <td className={`px-3 py-2 ${r.overall_score && r.overall_score < 6 ? 'text-red-600' : ''}`}>{r.overall_score ?? '—'}</td>
                    <td className={`px-3 py-2 ${r.guardian_issues_critical > 0 ? 'text-red-600' : ''}`}>{r.guardian_issues_critical}</td>
                    <td className={`px-3 py-2 ${r.contradictions_critical > 0 ? 'text-red-600' : ''}`}>{r.contradictions_critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Cost by task */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Cost by task (24h)</h2>
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-right">Calls</th>
                <th className="px-3 py-2 text-right">Total cost</th>
                <th className="px-3 py-2 text-right">Avg cost</th>
                <th className="px-3 py-2 text-right">Input tokens</th>
                <th className="px-3 py-2 text-right">Cache hit %</th>
              </tr>
            </thead>
            <tbody>
              {tasksSorted.map(([task, stats]) => (
                <tr key={task} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2 font-mono text-xs">{task}</td>
                  <td className="px-3 py-2 text-right">{stats.count}</td>
                  <td className="px-3 py-2 text-right">${stats.cost.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">${(stats.cost / stats.count).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right">{stats.input.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{stats.input > 0 ? `${Math.round((stats.cacheHits / stats.input) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
