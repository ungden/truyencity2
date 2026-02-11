'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock3, BookOpen, Activity } from 'lucide-react';

type ReportResponse = {
  generatedAt: string;
  window: {
    vnDayStart: string;
    vnDayEnd: string;
    last24hStart: string;
  };
  config: {
    dailySpawnTarget: number;
    dailyChapterQuota: number;
  };
  summary: {
    newNovelsToday: number;
    newProjectsToday: number;
    activeProjects: number;
    pausedProjects: number;
    chaptersToday: number;
    chaptersLast24h: number;
    healthChecksLast24h: number;
    latestHealthAt: string | null;
    latestHealthStatus: 'healthy' | 'warning' | 'critical' | null;
    latestHealthScore: number | null;
    healthStaleMinutes: number | null;
    healthAlertLevel: 'ok' | 'warn' | 'critical';
    avgChaptersPerActiveToday: number;
    storiesAtQuota: number;
    storiesBelowQuota: number;
    storiesOverQuota: number;
  };
  quotaViolations: Array<{
    novelId: string;
    title: string;
    chaptersToday: number;
  }>;
  recentSpawns: Array<{
    projectId: string;
    novelId: string;
    title: string;
    createdAt: string;
    status: string;
    currentChapter: number;
    genre: string;
    mainCharacter: string;
  }>;
  recentWrites: Array<{
    novelId: string;
    title: string;
    chapterNumber: number;
    createdAt: string;
  }>;
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatAgoMinutes(minutes: number | null): string {
  if (minutes === null) return 'Chua co du lieu';
  if (minutes < 60) return `${minutes} phut truoc`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m truoc` : `${hours}h truoc`;
}

export default function ProductionReportPage() {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/production-report', { method: 'GET' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Không tải được báo cáo vận hành');
      }
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const spawnProgress = report
    ? Math.min(100, (report.summary.newProjectsToday / report.config.dailySpawnTarget) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Production Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi mục tiêu +20 truyện/ngày và quota 20 chương/truyện/ngày
          </p>
        </div>
        <Button onClick={loadReport} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-red-600">{error}</CardContent>
        </Card>
      )}

      {report && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Daily Spawn</CardTitle>
                <CardDescription>{report.summary.newProjectsToday}/{report.config.dailySpawnTarget} hôm nay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.summary.newProjectsToday}</div>
                <Progress value={spawnProgress} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chapters Today</CardTitle>
                <CardDescription>Ngày VN hiện tại</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.summary.chaptersToday}</div>
                <p className="text-xs text-muted-foreground mt-1">24h gần nhất: {report.summary.chaptersLast24h}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active / Paused</CardTitle>
                <CardDescription>Pool vận hành</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.summary.activeProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">Paused: {report.summary.pausedProjects}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quota Violations</CardTitle>
                <CardDescription>Vượt {report.config.dailyChapterQuota} chương/ngày</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.summary.storiesOverQuota}</div>
                <p className="text-xs text-muted-foreground mt-1">At quota: {report.summary.storiesAtQuota}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Health Check</CardTitle>
                <CardDescription>Do tuoi ban ghi health moi nhat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {formatAgoMinutes(report.summary.healthStaleMinutes)}
                  </div>
                  <Badge
                    variant={
                      report.summary.healthAlertLevel === 'ok'
                        ? 'default'
                        : report.summary.healthAlertLevel === 'warn'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {report.summary.healthAlertLevel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  24h: {report.summary.healthChecksLast24h} checks
                </p>
                {report.summary.latestHealthAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest: {formatTime(report.summary.latestHealthAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {report.summary.healthAlertLevel !== 'ok' && (
            <Card className="border-amber-300">
              <CardContent className="pt-6 text-sm">
                <span className="font-medium">Canh bao Health Check:</span>{' '}
                {report.summary.healthAlertLevel === 'critical'
                  ? 'He thong khong co health-check moi trong >6h. Nen kiem tra cron /api/cron/health-check ngay.'
                  : 'Health-check co dau hieu tre (>2h). Nen theo doi cron health-check.'}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quota Snapshot</CardTitle>
              <CardDescription>
                Avg hôm nay: {report.summary.avgChaptersPerActiveToday} chương/truyện active
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">Below Quota</div>
                <div className="text-xl font-semibold">{report.summary.storiesBelowQuota}</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">At Quota</div>
                <div className="text-xl font-semibold">{report.summary.storiesAtQuota}</div>
              </div>
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">Over Quota</div>
                <div className="text-xl font-semibold text-red-600">{report.summary.storiesOverQuota}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Quota Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.quotaViolations.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Không có truyện vượt quota hôm nay.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.quotaViolations.map((item) => (
                      <div key={item.novelId} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div className="truncate pr-3">{item.title}</div>
                        <Badge variant="destructive">{item.chaptersToday}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Recent Spawns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.recentSpawns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có spawn trong ngày VN hiện tại.</p>
                ) : (
                  <div className="space-y-2">
                    {report.recentSpawns.slice(0, 12).map((item) => (
                      <div key={item.projectId} className="rounded border p-2 text-sm">
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                          <span>{item.genre || 'unknown'} · {item.mainCharacter || 'N/A'}</span>
                          <span>{formatTime(item.createdAt)}</span>
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline">{item.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-primary" />
                Recent Writes (Today)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.recentWrites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có chapter mới trong ngày VN hiện tại.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {report.recentWrites.slice(0, 20).map((item, idx) => (
                    <div key={`${item.novelId}-${item.chapterNumber}-${idx}`} className="rounded border p-2 text-sm">
                      <div className="truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                        <span>Ch{item.chapterNumber}</span>
                        <span>{formatTime(item.createdAt)}</span>
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
