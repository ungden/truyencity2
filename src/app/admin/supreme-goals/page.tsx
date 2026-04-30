'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Target, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Grade = 'green' | 'yellow' | 'red';

type ProjectGoals = {
  project_id: string;
  title: string;
  current_chapter: number;
  total_planned_chapters: number;
  progress_pct: number;
  goals: {
    coherence: Grade;
    charConsist: Grade;
    directional: Grade;
    ending: Grade;
    uniform: Grade;
  };
  signals: {
    failed_tasks: number;
    open_threads: number;
    resolved_threads: number;
    trend_drift: number | null;
    trend_recent_avg: number | null;
    trend_alert: string;
  };
};

type Aggregate = {
  count: number;
  aggregate: Record<keyof ProjectGoals['goals'], { green: number; yellow: number; red: number }>;
  projects: ProjectGoals[];
};

const GOAL_LABELS: Record<keyof ProjectGoals['goals'], string> = {
  coherence: '1. Coherence ch.1 → cuối',
  charConsist: '2. Character consistency',
  directional: '3. Directional plot',
  ending: '4. Ending readiness',
  uniform: '5. Uniform quality',
};

function gradeIcon(g: Grade) {
  if (g === 'green') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (g === 'yellow') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

export default function SupremeGoalsPage() {
  const [data, setData] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'supreme_goals' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-500" />
            Mục tiêu tối thượng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            5 supreme goals từ CLAUDE.md — system có đạt không?
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-500"><CardContent className="pt-6 text-red-600">{error}</CardContent></Card>
      )}

      {data && (
        <>
          {/* Aggregate */}
          <Card>
            <CardHeader>
              <CardTitle>Tổng quan {data.count} novel active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.aggregate).map(([key, counts]) => {
                  const label = GOAL_LABELS[key as keyof ProjectGoals['goals']];
                  const total = counts.green + counts.yellow + counts.red;
                  const greenPct = total > 0 ? Math.round((counts.green / total) * 100) : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          ✓ {counts.green} · ⚠ {counts.yellow} · ✗ {counts.red} ({greenPct}% green)
                        </span>
                      </div>
                      <div className="flex h-2 rounded overflow-hidden bg-muted">
                        <div className="bg-green-500" style={{ width: `${(counts.green / total) * 100}%` }} />
                        <div className="bg-yellow-500" style={{ width: `${(counts.yellow / total) * 100}%` }} />
                        <div className="bg-red-500" style={{ width: `${(counts.red / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-novel detail */}
          <Card>
            <CardHeader>
              <CardTitle>Per-novel breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">Không có novel active.</p>
              ) : (
                <div className="space-y-2">
                  {data.projects.map(p => (
                    <div key={p.project_id} className="border rounded p-3 text-sm space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold truncate flex-1">{p.title}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          ch. {p.current_chapter}/{p.total_planned_chapters} ({p.progress_pct}%)
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {Object.entries(p.goals).map(([k, g]) => (
                          <div key={k} className="flex items-center gap-1" title={GOAL_LABELS[k as keyof ProjectGoals['goals']]}>
                            {gradeIcon(g)}
                            <span>{k}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Failed tasks: {p.signals.failed_tasks} · Threads open/resolved: {p.signals.open_threads}/{p.signals.resolved_threads} · Trend: {p.signals.trend_alert}
                        {p.signals.trend_drift !== null && (
                          <> · Drift: <span className={p.signals.trend_drift < -0.5 ? 'text-red-600' : ''}>{p.signals.trend_drift}</span></>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
