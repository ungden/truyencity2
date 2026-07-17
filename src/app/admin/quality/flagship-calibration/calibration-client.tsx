'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Payload = {
  campaign: { id: string; name: string; engine_release_id: string; route_version: string } | null;
  sample: { id: string; title: string; chapterNumber: number; optionA: string; optionB: string } | null;
  progress: { completed: number; total: number };
  error?: string;
};

type FinalizeResult = {
  finalized: true;
  approved: boolean;
  metrics: Record<string, number>;
};

export default function CalibrationClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [preferred, setPreferred] = useState<'a' | 'b' | 'tie'>('a');
  const [wantsNext, setWantsNext] = useState(true);
  const [critical, setCritical] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null);
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/flagship-calibration', { cache: 'no-store' });
    setData(await response.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  const submit = async () => {
    if (!data?.sample) return;
    setBusy(true);
    const response = await fetch('/api/admin/flagship-calibration', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'ballot', sampleId: data.sample.id, preferred, wantsNext, criticalContinuityViolation: critical, note }),
    });
    setBusy(false);
    if (!response.ok) return setData({ ...data, error: (await response.json()).error || 'Không lưu được ballot.' });
    setNote(''); setCritical(false); setWantsNext(true); setPreferred('a'); await load();
  };
  const finalize = async () => {
    if (!data?.campaign) return;
    setBusy(true);
    const response = await fetch('/api/admin/flagship-calibration', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'finalize', campaignId: data.campaign.id }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setData({ ...data, error: payload.error || 'Không finalize được campaign.' });
    setFinalizeResult(payload as FinalizeResult);
  };
  if (!data) return <div className="p-6">Đang tải calibration...</div>;
  if (data.error) return <div className="p-6 text-red-500">{data.error}</div>;
  if (!data.campaign) return <div className="p-6"><h1 className="text-2xl font-bold">Flagship v3 Blind Calibration</h1><p className="mt-3 text-muted-foreground">Chưa có campaign đang mở. Factory vẫn bị khóa.</p></div>;
  return <div className="space-y-5 p-2">
    <div><h1 className="text-2xl font-bold">Flagship v3 Blind Calibration</h1><p className="text-sm text-muted-foreground">{data.campaign.name} · {data.progress.completed}/{data.progress.total}. Trang này cố ý không hiển thị model, route, điểm Editor hoặc answer key.</p></div>
    {finalizeResult ? <div className={`rounded-xl border p-6 ${finalizeResult.approved ? 'border-green-500' : 'border-red-500'}`}>
      <h2 className="text-lg font-bold">Campaign {finalizeResult.approved ? 'đạt gate' : 'không đạt gate'}</h2>
      <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(finalizeResult.metrics, null, 2)}</pre>
    </div> : !data.sample ? <div className="space-y-4 rounded-xl border p-6">
      <p>Bạn đã chấm hết mẫu được giao. Chỉ finalize khi toàn campaign đã có tối thiểu 50 mẫu và 5 reviewer.</p>
      <Button disabled={busy} onClick={finalize}>{busy ? 'Đang kiểm tra...' : 'Finalize và kiểm tra gate'}</Button>
    </div> : <>
      <div className="text-lg font-semibold">{data.sample.title} — chương {data.sample.chapterNumber}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl border bg-card p-5"><h2 className="mb-3 font-bold">Bản A</h2>{data.sample.optionA}</article>
        <article className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl border bg-card p-5"><h2 className="mb-3 font-bold">Bản B</h2>{data.sample.optionB}</article>
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap gap-2">{(['a','b','tie'] as const).map(value => <Button key={value} variant={preferred === value ? 'default' : 'outline'} onClick={() => setPreferred(value)}>{value === 'tie' ? 'Hòa' : `Chọn ${value.toUpperCase()}`}</Button>)}</div>
        <label className="flex gap-2"><input type="checkbox" checked={wantsNext} onChange={event => setWantsNext(event.target.checked)} /> Tôi muốn đọc chương tiếp theo</label>
        <label className="flex gap-2"><input type="checkbox" checked={critical} onChange={event => setCritical(event.target.checked)} /> Có lỗi continuity/canon nghiêm trọng</label>
        <textarea className="min-h-24 w-full rounded-md border bg-background p-3" value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi chú ngắn, không bắt buộc" />
        <Button disabled={busy} onClick={submit}>{busy ? 'Đang lưu...' : 'Lưu và sang mẫu tiếp'}</Button>
      </div>
    </>}
  </div>;
}
