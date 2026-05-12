'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, RefreshCw, AlertTriangle, CheckCircle2, Power } from 'lucide-react';

type Row = {
  projectId: string;
  title: string;
  status: string;
  pauseReason: string | null;
  aiModel: string | null;
  currentChapter: number;
  totalPlanned: number;
  quota: number;
  today: { target: number; written: number; status: string; lastError: string | null } | null;
};

type ListResponse = {
  date: string;
  defaultDailyTarget: number;
  enabledCount: number;
  rows: Row[];
};

export default function ProductionTogglePage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [newId, setNewId] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/production-toggle', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = useCallback(async (projectId: string, enabled: boolean) => {
    setPendingIds((prev) => new Set(prev).add(projectId));
    try {
      const res = await fetch('/api/admin/production-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setToast({ kind: 'ok', msg: `${enabled ? 'Bật' : 'Tắt'} production: ${json.title}` });
      await refresh();
    } catch (e) {
      setToast({ kind: 'err', msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, [refresh]);

  const onAdd = useCallback(async () => {
    const id = newId.trim();
    if (!id) return;
    setAdding(true);
    await toggle(id, true);
    setAdding(false);
    setNewId('');
  }, [newId, toggle]);

  const rows = data?.rows || [];
  const totalTarget = rows.reduce((s, r) => s + (r.today?.target ?? r.quota), 0);
  const totalWritten = rows.reduce((s, r) => s + (r.today?.written ?? 0), 0);
  const totalCompletion = totalTarget ? Math.round((totalWritten / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý sản xuất truyện</h1>
          <p className="text-sm text-muted-foreground">
            Bật / tắt cờ <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">production_enabled</code> cho từng dự án. Cron viết{' '}
            {data?.defaultDailyTarget ?? 50} chương / ngày / dự án bật.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {toast && (
        <div className={`rounded border px-3 py-2 text-sm ${toast.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.kind === 'ok' ? <CheckCircle2 className="inline h-4 w-4 mr-1" /> : <AlertTriangle className="inline h-4 w-4 mr-1" />}
          {toast.msg}
        </div>
      )}

      {err && (
        <Card>
          <CardContent className="pt-6 text-sm text-red-600">{err}</CardContent>
        </Card>
      )}

      {/* Today summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tóm tắt {data?.date}</CardTitle>
          <CardDescription>
            {rows.length} dự án đang chạy production / cron viết toward target hàng ngày
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tổng tiến độ hôm nay</span>
            <span className="font-mono">{totalWritten} / {totalTarget} ({totalCompletion}%)</span>
          </div>
          <Progress value={totalCompletion} />
        </CardContent>
      </Card>

      {/* Add by id */}
      <Card>
        <CardHeader>
          <CardTitle>Bật production cho dự án</CardTitle>
          <CardDescription>Dán project UUID — cron sẽ pickup ngay tick sau (mỗi 5 phút).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="00000000-0000-0000-0000-000000000000"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="font-mono"
              disabled={adding}
              onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
            />
            <Button onClick={onAdd} disabled={adding || !newId.trim()}>
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Bật
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tự động: status=active, pause_reason=null, ai_model=gemini-3.1-flash-lite (nếu đang deepseek), quota=50, seed today&apos;s quota row.
          </p>
        </CardContent>
      </Card>

      {/* Enabled list */}
      <Card>
        <CardHeader>
          <CardTitle>Dự án đang chạy ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dự án nào bật production. Bật từ form phía trên hoặc CLI <code className="font-mono text-xs">npx tsx scripts/toggle-production.ts {'<id>'} on</code>.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const pending = pendingIds.has(r.projectId);
                const target = r.today?.target ?? r.quota;
                const written = r.today?.written ?? 0;
                const pct = target ? Math.min(100, Math.round((written / target) * 100)) : 0;
                const quotaStatus = r.today?.status ?? 'no-row';
                return (
                  <div key={r.projectId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.projectId}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={r.status === 'active' ? 'default' : 'outline'}>{r.status}</Badge>
                        {r.aiModel && <Badge variant="outline" className="font-mono text-xs">{r.aiModel}</Badge>}
                        <div className="flex items-center gap-2">
                          <Power className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            checked={true}
                            disabled={pending}
                            onCheckedChange={(checked) => toggle(r.projectId, checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Tiến độ truyện</div>
                        <div className="font-mono">ch.{r.currentChapter} / {r.totalPlanned || '?'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Quota hôm nay ({quotaStatus})</div>
                        <div className="font-mono">{written} / {target}</div>
                        <Progress value={pct} className="h-1.5 mt-1" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Lỗi gần nhất</div>
                        <div className="text-xs truncate" title={r.today?.lastError || ''}>
                          {r.today?.lastError ? r.today.lastError.slice(0, 80) : '—'}
                        </div>
                      </div>
                    </div>

                    {r.pauseReason && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        ⚠ pause_reason: {r.pauseReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
