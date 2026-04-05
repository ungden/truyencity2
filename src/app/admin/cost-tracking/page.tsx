'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, DollarSign, Zap, BarChart3, BookOpen } from 'lucide-react';

type CostSummary = {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  totalCost: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costPerChapter: number;
  chaptersLast7Days: number;
};

type TaskBreakdown = {
  task: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
};

type CostData = {
  success: boolean;
  summary: CostSummary;
  taskBreakdown: TaskBreakdown[];
};

const TASK_LABELS: Record<string, string> = {
  architect: 'Architect (Outline)',
  writer: 'Writer (Content)',
  writer_continuation: 'Writer (Continuation)',
  critic: 'Critic (Review)',
  combined_summary: 'Summary + Characters',
  chapter_summary: 'Chapter Summary',
  synopsis: 'Synopsis',
  arc_plan: 'Arc Plan',
  story_bible: 'Story Bible',
  master_outline: 'Master Outline',
  character_arc: 'Character Arc',
  foreshadowing: 'Foreshadowing',
  pacing: 'Pacing',
  plot_tracker: 'Plot Tracker',
  power_system: 'Power System',
  voice_fingerprint: 'Voice Fingerprint',
  world_expansion: 'World Expansion',
  location_bible: 'Location Bible',
  consistency_check: 'Consistency Check',
};

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

export default function CostTrackingPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cost-tracking');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Loading cost data...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <p className="text-red-400">Error: {error}</p>
        <Button onClick={fetchData} className="mt-2" variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chi phi AI</h1>
          <p className="text-zinc-400 text-sm mt-1">Token usage va cost tracking cho Gemini API</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {s && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Hom nay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCost(s.todayCost)}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> 7 ngay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCost(s.weekCost)}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> 30 ngay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCost(s.monthCost)}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Cost / Chuong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCost(s.costPerChapter)}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.chaptersLast7Days} chuong / 7 ngay</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Totals */}
      {s && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Tong cong</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-400">Tong chi phi</p>
                <p className="text-xl font-bold text-green-400">{formatCost(s.totalCost)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Tong API calls</p>
                <p className="text-xl font-bold text-white">{s.totalCalls.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-400">Input tokens</p>
                <p className="text-xl font-bold text-blue-400">{formatTokens(s.totalInputTokens)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Output tokens</p>
                <p className="text-xl font-bold text-purple-400">{formatTokens(s.totalOutputTokens)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Breakdown */}
      {data?.taskBreakdown && data.taskBreakdown.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Chi phi theo task (7 ngay)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-2 px-2">Task</th>
                    <th className="text-right py-2 px-2">Calls</th>
                    <th className="text-right py-2 px-2">Input</th>
                    <th className="text-right py-2 px-2">Output</th>
                    <th className="text-right py-2 px-2">Cost</th>
                    <th className="text-right py-2 px-2">Avg/Call</th>
                  </tr>
                </thead>
                <tbody>
                  {data.taskBreakdown.map((t) => (
                    <tr key={t.task} className="border-b border-zinc-800/50 text-zinc-300">
                      <td className="py-2 px-2 font-medium">{TASK_LABELS[t.task] || t.task}</td>
                      <td className="text-right py-2 px-2">{t.calls.toLocaleString()}</td>
                      <td className="text-right py-2 px-2 text-blue-400">{formatTokens(t.input_tokens)}</td>
                      <td className="text-right py-2 px-2 text-purple-400">{formatTokens(t.output_tokens)}</td>
                      <td className="text-right py-2 px-2 text-green-400 font-medium">{formatCost(t.cost)}</td>
                      <td className="text-right py-2 px-2 text-zinc-500">{formatCost(t.cost / t.calls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data?.taskBreakdown && data.taskBreakdown.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center text-zinc-500">
            Chua co du lieu cost tracking. Du lieu se bat dau tu dong sau khi deploy.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
