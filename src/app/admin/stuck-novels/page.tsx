'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, AlertCircle, Play, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

type AutoPausedRow = {
  project_id: string;
  title: string;
  pause_reason: string | null;
  paused_at: string | null;
  progress: string;
  cost_today_usd: number;
};

type FailingRow = {
  project_id: string;
  title: string;
  retry_count: number;
  last_error: string | null;
  last_attempt: string;
  progress: string;
  status: string;
  cost_today_usd: number;
};

type TopCostRow = { project_id: string; cost_today_usd: number };

type Report = {
  auto_paused: AutoPausedRow[];
  failing_today: FailingRow[];
  top_cost_today: TopCostRow[];
};

export default function StuckNovelsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stuck_novels' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const resumeNovel = async (projectId: string) => {
    setResumingId(projectId);
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_novel', projectId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchReport();
    } catch (e) {
      alert(`Resume failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResumingId(null);
    }
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '?';
    return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            Stuck Novels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Novels auto-paused bởi circuit breaker / cost cap, hoặc đang fail liên tiếp hôm nay.
          </p>
        </div>
        <Button onClick={fetchReport} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6 text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Auto-paused */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Auto-Paused ({report?.auto_paused.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!report?.auto_paused.length ? (
            <p className="text-muted-foreground text-sm">Không có novel nào bị auto-pause. ✓</p>
          ) : (
            <div className="space-y-3">
              {report.auto_paused.map(row => (
                <div key={row.project_id} className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{row.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Project: {row.project_id.slice(0, 8)} · Progress {row.progress} · Cost hôm nay ${row.cost_today_usd.toFixed(2)}
                      </div>
                      <div className="text-xs mt-1">Paused at: {fmtTime(row.paused_at)}</div>
                      <div className="text-sm mt-2 font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">
                        {row.pause_reason || '(no reason)'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resumeNovel(row.project_id)}
                      disabled={resumingId === row.project_id}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failing today */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Failing Today ({report?.failing_today.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!report?.failing_today.length ? (
            <p className="text-muted-foreground text-sm">Không có novel nào fail hôm nay. ✓</p>
          ) : (
            <div className="space-y-3">
              {report.failing_today.map(row => (
                <div key={row.project_id} className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {row.title}
                        <Badge variant={row.retry_count >= 3 ? 'destructive' : 'secondary'}>
                          {row.retry_count} retries
                        </Badge>
                        <Badge variant="outline">{row.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Project: {row.project_id.slice(0, 8)} · Progress {row.progress} · Cost hôm nay ${row.cost_today_usd.toFixed(2)}
                      </div>
                      <div className="text-xs mt-1">Last attempt: {fmtTime(row.last_attempt)}</div>
                      {row.last_error && (
                        <div className="text-sm mt-2 font-mono text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap break-all">
                          {row.last_error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top cost today */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Top Cost Today (top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!report?.top_cost_today.length ? (
            <p className="text-muted-foreground text-sm">Chưa có cost data hôm nay.</p>
          ) : (
            <div className="space-y-2">
              {report.top_cost_today.map(row => (
                <div key={row.project_id} className="flex items-center justify-between text-sm border-b pb-1">
                  <span className="font-mono text-xs">{row.project_id.slice(0, 8)}</span>
                  <span className="font-semibold">${row.cost_today_usd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
