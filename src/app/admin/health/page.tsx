'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  BookOpen,
  Zap,
  Image,
  Brain,
  BarChart3,
  Heart,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail';
type OverallStatus = 'healthy' | 'warning' | 'critical';

type Check = {
  name: string;
  status: CheckStatus;
  message: string;
};

type HealthReport = {
  status: OverallStatus;
  score: number;
  summary: string;
  metrics: {
    chaptersLast24h: number;
    chaptersLastHour: number;
    totalChapters: number;
    activeProjects: number;
    completedProjects: number;
    stuckNovels: number;
    coversComplete: number;
    coversMissing: number;
    avgWordsPerChapter: number;
    topNovelChapters: number;
    avgChaptersPerNovel: number;
    cronStaleProjects: number;
  };
  checks: Check[];
  durationMs: number;
  savedToDb: boolean;
};

type HistoryItem = {
  id: string;
  created_at: string;
  status: OverallStatus;
  score: number;
  summary: string;
  metrics: HealthReport['metrics'];
  checks: Check[];
  duration_ms: number;
};

const statusConfig = {
  healthy: { color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2, label: 'Healthy' },
  warning: { color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: AlertTriangle, label: 'Warning' },
  critical: { color: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', icon: XCircle, label: 'Critical' },
};

const checkStatusConfig = {
  pass: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  warn: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertTriangle },
  fail: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
};

const checkIcons: Record<string, typeof Activity> = {
  'Chapter Production': Zap,
  'Stuck Novels (ch=0)': AlertCircle,
  'Active Projects': BookOpen,
  'Total Chapters': BarChart3,
  'Cover Images': Image,
  'Cron Heartbeat': Heart,
  'Word Quality': Brain,
  'Novel Distribution': TrendingUp,
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-800" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

export default function HealthDashboard() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health-history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch { /* ignore */ }
  }, []);

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    setSelectedHistory(null);
    try {
      const res = await fetch('/api/cron/health-check?manual=true');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        fetchHistory(); // Refresh history after new check
      }
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Display either live report or selected history
  const displayReport = selectedHistory ? {
    status: selectedHistory.status,
    score: selectedHistory.score,
    summary: selectedHistory.summary,
    metrics: selectedHistory.metrics,
    checks: selectedHistory.checks,
    durationMs: selectedHistory.duration_ms,
    savedToDb: true,
  } as HealthReport : report;

  const cfg = displayReport ? statusConfig[displayReport.status] : null;
  const StatusIcon = cfg?.icon || Activity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" size={28} />
            System Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kiểm tra trạng thái hệ thống hàng ngày
          </p>
        </div>
        <Button onClick={runHealthCheck} disabled={loading} className="gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}
        </Button>
      </div>

      {/* No report yet */}
      {!displayReport && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Chưa có báo cáo</p>
            <p className="text-sm text-muted-foreground mb-4">
              Nhấn &ldquo;Kiểm tra ngay&rdquo; để chạy health check, hoặc chọn từ lịch sử bên dưới.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw size={32} className="animate-spin text-primary mr-3" />
            <span className="text-lg">Đang scan hệ thống...</span>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {displayReport && !loading && (
        <>
          {/* Overall Status */}
          <div className={`rounded-xl p-6 ${cfg!.bg} border`}>
            <div className="flex items-center gap-6">
              <ScoreRing score={displayReport.score} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon size={24} className={cfg!.text} />
                  <span className={`text-2xl font-bold ${cfg!.text}`}>{cfg!.label}</span>
                  {selectedHistory && (
                    <Badge variant="outline" className="ml-2">
                      <Clock size={12} className="mr-1" />
                      {timeAgo(selectedHistory.created_at)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{displayReport.summary}</p>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Scan took {displayReport.durationMs}ms</span>
                  <span>{displayReport.checks.filter(c => c.status === 'pass').length}/{displayReport.checks.length} checks passed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Chapters/24h" value={formatNumber(displayReport.metrics.chaptersLast24h)} icon={Zap} trend={displayReport.metrics.chaptersLastHour > 100 ? 'up' : 'down'} />
            <MetricCard label="Chapters/hr" value={displayReport.metrics.chaptersLastHour.toString()} icon={TrendingUp} />
            <MetricCard label="Total Chapters" value={formatNumber(displayReport.metrics.totalChapters)} icon={BookOpen} />
            <MetricCard label="Active Novels" value={displayReport.metrics.activeProjects.toString()} icon={Activity} />
            <MetricCard label="Avg Words" value={displayReport.metrics.avgWordsPerChapter.toString()} icon={Brain} />
            <MetricCard label="Covers" value={`${displayReport.metrics.coversComplete}/${displayReport.metrics.coversComplete + displayReport.metrics.coversMissing}`} icon={Image} />
            <MetricCard label="Stuck (ch=0)" value={displayReport.metrics.stuckNovels.toString()} icon={AlertCircle} alert={displayReport.metrics.stuckNovels > 5} />
            <MetricCard label="Top Novel" value={`${displayReport.metrics.topNovelChapters} ch`} icon={BarChart3} />
          </div>

          {/* Individual Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chi tiết kiểm tra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {displayReport.checks.map((check, i) => {
                const cc = checkStatusConfig[check.status];
                const Icon = checkIcons[check.name] || Activity;
                const StatusCheckIcon = cc.icon;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${cc.bg}`}>
                    <Icon size={18} className={cc.color} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{check.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{check.message}</div>
                    </div>
                    <StatusCheckIcon size={18} className={cc.color} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock size={18} />
            Lịch sử kiểm tra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Chưa có lịch sử. Chạy health check lần đầu để bắt đầu.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const hcfg = statusConfig[item.status];
                const HIcon = hcfg.icon;
                const isSelected = selectedHistory?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedHistory(isSelected ? null : item);
                      if (!isSelected) setReport(null);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`p-1.5 rounded-full ${hcfg.bg}`}>
                      <HIcon size={14} className={hcfg.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{hcfg.label}</span>
                        <Badge variant="outline" className="text-[10px]">{item.score}/100</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.metrics.chaptersLast24h} ch/24h | {item.metrics.activeProjects} active
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      {' '}
                      {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, trend, alert }: {
  label: string;
  value: string;
  icon: typeof Activity;
  trend?: 'up' | 'down';
  alert?: boolean;
}) {
  return (
    <Card className={alert ? 'border-amber-500/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon size={16} className={alert ? 'text-amber-500' : 'text-muted-foreground'} />
          {trend === 'up' && <TrendingUp size={14} className="text-emerald-500" />}
          {trend === 'down' && <TrendingUp size={14} className="text-red-500 rotate-180" />}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
