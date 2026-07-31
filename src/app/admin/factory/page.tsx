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
  retry_count: number;
  last_error: string | null;
  ai_story_projects: { engine_release: string } | Array<{ engine_release: string }> | null;
  novels: { title: string; hidden: boolean; cover_url: string | null } | Array<{ title: string; hidden: boolean; cover_url: string | null }>;
};

function projectRelease(job: Job): string | null {
  const project = Array.isArray(job.ai_story_projects) ? job.ai_story_projects[0] : job.ai_story_projects;
  return project?.engine_release ?? null;
}

export default function FactoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [release, setRelease] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
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

  const act = async (action: 'start' | 'stop' | 'release' | 'revive', jobId?: string) => {
    setActionError(null);
    const response = await fetch('/api/admin/factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobId ? { jobId, action } : { action }),
    });
    if (!response.ok) {
      // Promotion in particular fails with a named reason (FACTORY_COVER_REQUIRED,
      // FACTORY_LATEST_WINDOW_REVIEW_REQUIRED…) — swallowing it made the Public
      // button look like it did nothing.
      const payload = await response.json().catch(() => null);
      setActionError(`${action}: ${payload?.error ?? response.statusText}`);
    }
    await load();
  };

  const blocked = jobs.filter(job => job.status.endsWith('_blocked'));
  const staleRelease = jobs.filter(job => {
    const projectR = projectRelease(job);
    return projectR !== null && release !== '' && projectR !== release;
  });

  return <div className="space-y-6 p-6">
    <div>
      <h1 className="text-3xl font-bold">Story Factory</h1>
      <p className="text-sm text-muted-foreground">Một queue duy nhất · release {release || '—'}</p>
    </div>
    {actionError && <Card>
      <CardContent className="pt-6"><p className="text-sm text-red-600">{actionError}</p></CardContent>
    </Card>}
    {blocked.length > 0 && <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <p className="text-sm">{blocked.length} job đang bị chặn và sẽ không tự chạy lại.</p>
        <Button size="sm" onClick={() => act('revive')}>Hồi sinh tất cả</Button>
      </CardContent>
    </Card>}
    {staleRelease.length > 0 && <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-amber-600">
          {staleRelease.length} job đang ở release cũ — hồi sinh xong vẫn không chạy được.
          Chạy: <code className="rounded bg-muted px-1">npm run factory:operator -- restage --all --apply</code>
        </p>
      </CardContent>
    </Card>}
    {loading ? <p>Đang tải…</p> : jobs.length === 0 ? <Card><CardContent className="pt-6">Chưa có job. Factory đang an toàn và chưa sản xuất.</CardContent></Card> : jobs.map(job => {
      const novel = Array.isArray(job.novels) ? job.novels[0] : job.novels;
      const jobRelease = projectRelease(job);
      const needsRestage = jobRelease !== null && release !== '' && jobRelease !== release;
      return <Card key={job.id}>
        <CardHeader><CardTitle>{novel?.title || 'Đang chuẩn bị concept'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {job.execution_mode} · {job.status}/{job.stage} · chương {job.current_chapter} · hôm nay {job.chapters_today}/{job.daily_target}
            {job.retry_count > 0 && ` · đã thử lại ${job.retry_count} lần`}
          </p>
          {needsRestage && <p className="text-sm text-amber-600">Release cũ ({jobRelease}) — cần restage trước khi chạy.</p>}
          {job.last_error && <p className="text-sm text-red-600">{job.last_error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act('start', job.id)}>Start</Button>
            <Button size="sm" variant="outline" onClick={() => act('stop', job.id)}>Stop</Button>
            {job.current_chapter >= 10 && novel?.hidden && <Button size="sm" onClick={() => act('release', job.id)}>Public</Button>}
          </div>
        </CardContent>
      </Card>;
    })}
  </div>;
}
