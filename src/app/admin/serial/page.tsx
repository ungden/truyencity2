'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Job = {
  id: string;
  status: string;
  stage: string;
  current_chapter: number;
  daily_target: number;
  chapters_today: number;
  consecutive_replans: number;
  last_error: string | null;
  readingScore: number | null;
  last10Usd: number;
  serial_novels: { approved_at: string | null; route_version: string } | Array<{ approved_at: string | null; route_version: string }>;
  novels: { title: string; slug: string; hidden: boolean; chapter_count: number } | Array<{ title: string; slug: string; hidden: boolean; chapter_count: number }>;
};

const one = <T,>(value: T | T[]): T | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * The health signal here is how the last ten chapters read, not how many jobs are
 * blocked — the engine has no blocked status. A paused story is the only thing that
 * needs a person, and what it needs is a read.
 */
export default function SerialPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [routeVersion, setRouteVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/serial', { cache: 'no-store' });
    const payload = await response.json();
    if (response.ok) {
      setJobs(payload.jobs ?? []);
      setEnabled(Boolean(payload.enabled));
      setRouteVersion(payload.routeVersion ?? '');
    } else {
      setError(payload.error ?? 'Không tải được danh sách.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: 'approve' | 'pause' | 'resume', jobId: string) => {
    setError(null);
    const response = await fetch('/api/admin/serial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, jobId }),
    });
    if (!response.ok) setError((await response.json()).error ?? 'Thao tác thất bại.');
    await load();
  };

  const awaiting = jobs.filter(job => job.status === 'awaiting_approval');
  const paused = jobs.filter(job => job.status === 'paused');

  return <div className="space-y-6 p-6">
    <div>
      <h1 className="text-3xl font-bold">Truyện dài</h1>
      <p className="text-sm text-muted-foreground">
        Cron {enabled ? 'đang bật' : 'đang tắt'} · route {routeVersion || '—'}
      </p>
    </div>

    <Card>
      <CardContent className="grid gap-2 pt-6 text-sm md:grid-cols-4">
        <p>Bộ đang chạy: {jobs.filter(job => job.status === 'ready' || job.status === 'running').length}</p>
        <p>Chờ duyệt: {awaiting.length}</p>
        <p>Đang dừng để đọc lại: {paused.length}</p>
        <p>Độc giả chỉ thấy chương sau khi cả cụm được duyệt.</p>
      </CardContent>
    </Card>

    {error && <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}
    {loading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
    {!loading && jobs.length === 0 && (
      <Card><CardContent className="pt-6"><p className="text-sm">Chưa có bộ nào. Tạo bằng <code>npm run serial:operator -- seed</code>.</p></CardContent></Card>
    )}

    <div className="grid gap-4">
      {jobs.map(job => {
        const novel = one(job.novels);
        const serial = one(job.serial_novels);
        const approved = Boolean(serial?.approved_at);
        return <Card key={job.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {novel?.title ?? job.id}
              {novel?.hidden && <span className="ml-2 text-xs font-normal text-muted-foreground">(đang ẩn)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-1 md:grid-cols-4">
              <p>Trạng thái: {job.status}</p>
              <p>Giai đoạn: {job.stage}</p>
              <p>Chương: {job.current_chapter} (công khai {novel?.chapter_count ?? 0})</p>
              <p>Hôm nay: {job.chapters_today}/{job.daily_target}</p>
              <p>Điểm đọc 10 chương gần nhất: <strong>{job.readingScore ?? '—'}</strong>/5</p>
              <p>Chi phí 10 chương: ${job.last10Usd}</p>
              <p>Lần lập lại kế hoạch liên tiếp: {job.consecutive_replans}</p>
              <p>{approved ? 'Đã duyệt' : 'Chưa duyệt'}</p>
            </div>
            {job.last_error && <p className="text-red-600">{job.last_error}</p>}
            <div className="flex gap-2">
              {!approved && <Button size="sm" onClick={() => act('approve', job.id)}>Duyệt cho chạy</Button>}
              {job.status === 'paused'
                ? <Button size="sm" variant="outline" onClick={() => act('resume', job.id)}>Chạy tiếp</Button>
                : <Button size="sm" variant="outline" onClick={() => act('pause', job.id)}>Tạm dừng</Button>}
            </div>
          </CardContent>
        </Card>;
      })}
    </div>
  </div>;
}
