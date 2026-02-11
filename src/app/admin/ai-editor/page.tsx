'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, RefreshCw, PlayCircle, Wand2 } from 'lucide-react';

type DashboardPayload = {
  summary: {
    lowReviewsLast24h: number;
    openJobs: number;
    reviewsLast24h: number;
  };
  jobs: Array<{
    id: string;
    title: string;
    start_chapter: number;
    end_chapter: number;
    current_chapter: number;
    status: string;
    rewritten_count: number;
    failed_count: number;
    last_error: string | null;
    updated_at: string;
  }>;
  reviews: Array<{
    id: string;
    title: string;
    chapter_number: number;
    overall_score: number;
    action: string;
    scanned_at: string;
  }>;
};

function fmt(ts: string): string {
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function AIEditorPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningScan, setRunningScan] = useState(false);
  const [runningRewrite, setRunningRewrite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/ai-editor?limit=30', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Khong tai duoc dashboard AI Editor');
      }
      setData(json.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: 'scan' | 'rewrite') => {
    if (action === 'scan') setRunningScan(true);
    if (action === 'rewrite') setRunningRewrite(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Action failed');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (action === 'scan') setRunningScan(false);
      if (action === 'rewrite') setRunningRewrite(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu dong quet chat luong va rewrite theo chuoi tu chuong loi den chuong moi nhat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading || runningScan || runningRewrite}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={() => runAction('scan')} disabled={runningScan || runningRewrite}>
            {runningScan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Run Scan
          </Button>
          <Button variant="secondary" onClick={() => runAction('rewrite')} disabled={runningScan || runningRewrite}>
            {runningRewrite ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Run Rewrite Worker
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reviews 24h</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.summary.reviewsLast24h}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Low Score 24h</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700">{data.summary.lowReviewsLast24h}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Open Rewrite Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.summary.openJobs}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rewrite Chain Jobs</CardTitle>
              <CardDescription>
                Rewrite se di tu chuong loi (start) den chuong moi nhat (end), tuan tu de giu mach truyen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chua co rewrite job.</p>
              ) : (
                data.jobs.map((job) => (
                  <div key={job.id} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{job.title}</div>
                      <Badge variant={job.status === 'failed' ? 'destructive' : 'outline'}>{job.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ch {job.start_chapter} to {job.end_chapter} | cursor: {job.current_chapter} | rewritten: {job.rewritten_count}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Updated: {fmt(job.updated_at)}</div>
                    {job.last_error && <div className="mt-1 text-xs text-red-600">{job.last_error}</div>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chua co review gan day.</p>
              ) : (
                data.reviews.map((review) => (
                  <div key={review.id} className="rounded border p-2 text-sm flex items-center justify-between gap-2">
                    <div className="truncate">{review.title} - Ch {review.chapter_number}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={review.overall_score < 65 ? 'destructive' : 'outline'}>{review.overall_score}</Badge>
                      <span className="text-xs text-muted-foreground">{fmt(review.scanned_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
