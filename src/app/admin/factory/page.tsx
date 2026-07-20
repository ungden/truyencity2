'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Job = {
  id: string;
  execution_mode: string;
  status: string;
  stage: string;
  current_chapter: number;
  daily_target: number;
  chapters_today: number;
  last_error: string | null;
  novels: { title: string; hidden: boolean; cover_url: string | null } | Array<{ title: string; hidden: boolean; cover_url: string | null }>;
};

export default function FactoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [release, setRelease] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/factory', { cache: 'no-store' });
    const payload = await response.json();
    if (response.ok) {
      setJobs(payload.jobs ?? []);
      setRelease(payload.release ?? '');
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (jobId: string, action: 'start' | 'stop' | 'release') => {
    await fetch('/api/admin/factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, action }),
    });
    await load();
  };

  return <div className="space-y-6 p-6">
    <div>
      <h1 className="text-3xl font-bold">Story Factory</h1>
      <p className="text-sm text-muted-foreground">Một queue duy nhất · release {release || '—'}</p>
    </div>
    {loading ? <p>Đang tải…</p> : jobs.length === 0 ? <Card><CardContent className="pt-6">Chưa có job. Factory đang an toàn và chưa sản xuất.</CardContent></Card> : jobs.map(job => {
      const novel = Array.isArray(job.novels) ? job.novels[0] : job.novels;
      return <Card key={job.id}>
        <CardHeader><CardTitle>{novel?.title || 'Đang chuẩn bị concept'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{job.execution_mode} · {job.status}/{job.stage} · chương {job.current_chapter} · hôm nay {job.chapters_today}/{job.daily_target}</p>
          {job.last_error && <p className="text-sm text-red-600">{job.last_error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act(job.id, 'start')}>Start</Button>
            <Button size="sm" variant="outline" onClick={() => act(job.id, 'stop')}>Stop</Button>
            {job.current_chapter >= 10 && novel?.hidden && <Button size="sm" onClick={() => act(job.id, 'release')}>Public</Button>}
          </div>
        </CardContent>
      </Card>;
    })}
  </div>;
}
