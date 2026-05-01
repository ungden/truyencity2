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
    weakOpenings,
    costByTask,
    budget,
    canonCoverage,
    revisedNovels,
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
    // Phase 25: first-10 evaluations — surface marginal/fail openings
    supabase.from('first_10_evaluations')
      .select('project_id,novel_id,verdict,overall_score,usp_clarity,hook_strength,payoff_cadence,core_loop,genre_fidelity,issues,recommendations,created_at')
      .in('verdict', ['marginal', 'fail'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('cost_tracking').select('task,cost,input_tokens,output_tokens,metadata')
      .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(10000),
    checkMonthlyBudget(),
    // Phase 28 TIER 4: canon coverage — how many active projects have each canon
    supabase.from('ai_story_projects')
      .select('id,power_system_canon,worldbuilding_canon')
      .eq('status', 'active'),
    // Phase 28 TIER 3.1: outline revisions — surface recently revised novels
    supabase.from('ai_story_projects')
      .select('id,pause_reason,paused_at,current_chapter,novels!ai_story_projects_novel_id_fkey(title)')
      .ilike('pause_reason', 'outline_auto_revision%')
      .order('paused_at', { ascending: false })
      .limit(10),
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

  // Phase 28 TIER 4: canon coverage stats
  const canonProjects = (canonCoverage.data || []) as Array<{ power_system_canon: unknown; worldbuilding_canon: unknown }>;
  const totalActive = canonProjects.length;
  const withPowerCanon = canonProjects.filter(p => !!p.power_system_canon).length;
  const withWorldCanon = canonProjects.filter(p => !!p.worldbuilding_canon).length;
  const canonCoveragePct = totalActive > 0
    ? Math.round(((withPowerCanon + withWorldCanon) / (totalActive * 2)) * 100)
    : 0;

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
        <Card
          label="Canon coverage"
          value={`${canonCoveragePct}%`}
          sub={`${withPowerCanon}/${totalActive} power, ${withWorldCanon}/${totalActive} world`}
        />
      </div>

      {/* Phase 28 TIER 3.1: Outline revisions surface */}
      {revisedNovels.data && revisedNovels.data.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">
            🔄 Outline auto-revisions (paused for revision)
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Quality drift triggered automatic outline revision. These projects are mid-revision OR have just been revised. Inspect pause_reason for details.
          </p>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-right">Current ch.</th>
                  <th className="px-3 py-2 text-left">Pause reason</th>
                  <th className="px-3 py-2 text-left">Paused at</th>
                </tr>
              </thead>
              <tbody>
                {revisedNovels.data.map((row: {
                  id: string;
                  pause_reason: string | null;
                  paused_at: string | null;
                  current_chapter: number;
                  novels?: Array<{ title: string }>;
                }) => (
                  <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2 font-mono text-xs">{row.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{row.novels?.[0]?.title || '—'}</td>
                    <td className="px-3 py-2 text-right">{row.current_chapter}</td>
                    <td className="px-3 py-2 text-xs">{row.pause_reason?.slice(0, 100) || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {row.paused_at ? new Date(row.paused_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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

      {/* First-10 evaluations — Phase 25 opening-quality gate */}
      {weakOpenings.data && weakOpenings.data.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">
            ⚠ Weak openings (first-10 evaluator)
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Marginal/fail verdicts on the opening 10 chapters. May need outline regeneration.
          </p>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-center">Verdict</th>
                  <th className="px-3 py-2 text-right">Overall</th>
                  <th className="px-3 py-2 text-right">USP</th>
                  <th className="px-3 py-2 text-right">Hook</th>
                  <th className="px-3 py-2 text-right">Payoff</th>
                  <th className="px-3 py-2 text-right">Loop</th>
                  <th className="px-3 py-2 text-right">Genre</th>
                  <th className="px-3 py-2 text-left">Top issue</th>
                </tr>
              </thead>
              <tbody>
                {weakOpenings.data.map((row: {
                  project_id: string;
                  verdict: string;
                  overall_score: number;
                  usp_clarity: number;
                  hook_strength: number;
                  payoff_cadence: number;
                  core_loop: number;
                  genre_fidelity: number;
                  issues?: Array<{ dimension?: string; severity?: string; description?: string }> | null;
                }) => {
                  const topIssue = (row.issues || [])[0];
                  return (
                    <tr key={row.project_id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 font-mono text-xs">{row.project_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={
                          row.verdict === 'fail'
                            ? 'text-red-600 font-bold'
                            : 'text-amber-600 font-semibold'
                        }>
                          {row.verdict}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{row.overall_score}</td>
                      <td className="px-3 py-2 text-right">{row.usp_clarity}</td>
                      <td className="px-3 py-2 text-right">{row.hook_strength}</td>
                      <td className="px-3 py-2 text-right">{row.payoff_cadence}</td>
                      <td className="px-3 py-2 text-right">{row.core_loop}</td>
                      <td className="px-3 py-2 text-right">{row.genre_fidelity}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {topIssue ? `${topIssue.dimension}/${topIssue.severity}: ${topIssue.description?.slice(0, 80) || ''}` : '—'}
                      </td>
                    </tr>
                  );
                })}
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
