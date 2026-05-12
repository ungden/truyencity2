'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  BookText,
} from 'lucide-react';

type Bucket = { today: number; week: number; month: number; total: number };

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
  chaptersToday: number;
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
  cost: Bucket;
  revenue: {
    rate: number;
    total: Bucket;
    vipOrders: Bucket;
    creditTx: Bucket;
    manualAds: Bucket;
  };
  profit: Bucket;
  taskBreakdown: TaskBreakdown[];
};

type ManualEntry = {
  id: string;
  source: 'adsense_web' | 'admob_mobile' | 'other';
  amount_usd: number | string;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
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

const SOURCE_LABELS: Record<string, string> = {
  adsense_web: 'AdSense (Web)',
  admob_mobile: 'AdMob (Mobile)',
  other: 'Khác',
};

function formatUsd(cost: number): string {
  const sign = cost < 0 ? '-' : '';
  const abs = Math.abs(cost);
  if (abs < 0.01) return `${sign}$${abs.toFixed(4)}`;
  if (abs < 1) return `${sign}$${abs.toFixed(3)}`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

function BucketRow({
  label,
  bucket,
  positiveIsGood = true,
}: {
  label: string;
  bucket: Bucket;
  positiveIsGood?: boolean;
}) {
  const colorFor = (v: number) => {
    if (v === 0) return 'text-zinc-300';
    const good = positiveIsGood ? v > 0 : v < 0;
    return good ? 'text-emerald-400' : 'text-rose-400';
  };
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Hôm nay</p>
            <p className={`text-base font-bold ${colorFor(bucket.today)}`}>{formatUsd(bucket.today)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">7 ngày</p>
            <p className={`text-base font-bold ${colorFor(bucket.week)}`}>{formatUsd(bucket.week)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">30 ngày</p>
            <p className={`text-base font-bold ${colorFor(bucket.month)}`}>{formatUsd(bucket.month)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Tổng</p>
            <p className={`text-base font-bold ${colorFor(bucket.total)}`}>{formatUsd(bucket.total)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CostTrackingPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formSource, setFormSource] = useState<'adsense_web' | 'admob_mobile' | 'other'>('adsense_web');
  const [formAmount, setFormAmount] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [costRes, entryRes] = await Promise.all([
        fetch('/api/admin/cost-tracking'),
        fetch('/api/admin/manual-revenue'),
      ]);
      if (!costRes.ok) throw new Error(`Cost HTTP ${costRes.status}`);
      if (!entryRes.ok) throw new Error(`Entries HTTP ${entryRes.status}`);
      const costJson = (await costRes.json()) as CostData;
      const entryJson = (await entryRes.json()) as { entries: ManualEntry[] };
      setData(costJson);
      setEntries(entryJson.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/manual-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: formSource,
          amount_usd: parseFloat(formAmount),
          period_start: formStart,
          period_end: formEnd,
          notes: formNotes || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setFormAmount('');
      setFormStart('');
      setFormEnd('');
      setFormNotes('');
      setShowForm(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Xóa entry này?')) return;
    try {
      const res = await fetch(`/api/admin/manual-revenue/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xóa');
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Đang tải dữ liệu chi phí...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <p className="text-rose-400">Lỗi: {error}</p>
        <Button onClick={fetchData} className="mt-2" variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Thử lại
        </Button>
      </div>
    );
  }

  const s = data?.summary;
  const cost = data?.cost;
  const revenue = data?.revenue;
  const profit = data?.profit;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chi phí & Doanh thu</h1>
          <p className="text-zinc-400 text-sm mt-1">
            P/L tracking: AI cost vs revenue (VIP + IAP + ads)
            {revenue && <span className="ml-2 text-zinc-600">· tỷ giá {revenue.rate.toLocaleString()} VND/USD</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/cost-tracking/novels">
            <Button variant="outline" size="sm">
              <BookText className="w-4 h-4 mr-1" /> Theo tiểu thuyết
            </Button>
          </Link>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {profit && cost && revenue && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-rose-950/30 border-rose-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Chi phí AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-rose-400">{formatUsd(cost.month)}</p>
              <p className="text-xs text-zinc-500 mt-1">30 ngày · tổng {formatUsd(cost.total)}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-950/30 border-emerald-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Doanh thu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-400">{formatUsd(revenue.total.month)}</p>
              <p className="text-xs text-zinc-500 mt-1">30 ngày · tổng {formatUsd(revenue.total.total)}</p>
            </CardContent>
          </Card>
          <Card className={`${profit.month >= 0 ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${profit.month >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                <DollarSign className="w-4 h-4" /> Lãi / Lỗ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${profit.month >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUsd(profit.month)}</p>
              <p className="text-xs text-zinc-500 mt-1">30 ngày · tổng {formatUsd(profit.total)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {cost && revenue && profit && (
        <div className="space-y-3">
          <BucketRow label="Chi phí theo kỳ" bucket={cost} positiveIsGood={false} />
          <BucketRow label="Doanh thu theo kỳ" bucket={revenue.total} positiveIsGood={true} />
          <BucketRow label="Lãi / Lỗ theo kỳ" bucket={profit} positiveIsGood={true} />
        </div>
      )}

      {revenue && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Nguồn doanh thu (30 ngày)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-400">VIP web (SePay)</p>
                <p className="text-xl font-bold text-emerald-400">{formatUsd(revenue.vipOrders.month)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">tổng {formatUsd(revenue.vipOrders.total)}</p>
              </div>
              <div>
                <p className="text-zinc-400">IAP (Apple/Google qua RevenueCat)</p>
                <p className="text-xl font-bold text-emerald-400">{formatUsd(revenue.creditTx.month)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">tổng {formatUsd(revenue.creditTx.total)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Quảng cáo (nhập tay)</p>
                <p className="text-xl font-bold text-emerald-400">{formatUsd(revenue.manualAds.month)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">tổng {formatUsd(revenue.manualAds.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base">Nhập doanh thu quảng cáo</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" /> {showForm ? 'Đóng' : 'Thêm entry'}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={submitEntry} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 items-end">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nguồn</label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value as 'adsense_web' | 'admob_mobile' | 'other')}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="adsense_web">AdSense (Web)</option>
                  <option value="admob_mobile">AdMob (Mobile)</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">USD</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="100.00"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Từ ngày</label>
                <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Đến ngày</label>
                <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu'}
              </Button>
              <div className="md:col-span-5">
                <label className="text-xs text-zinc-400 block mb-1">Ghi chú (optional)</label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="AdSense April 2026 payout" />
              </div>
            </form>
          )}

          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-2 px-2">Nguồn</th>
                    <th className="text-left py-2 px-2">Kỳ</th>
                    <th className="text-right py-2 px-2">USD</th>
                    <th className="text-left py-2 px-2">Ghi chú</th>
                    <th className="text-right py-2 px-2">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-800/50 text-zinc-300">
                      <td className="py-2 px-2">{SOURCE_LABELS[e.source] || e.source}</td>
                      <td className="py-2 px-2 text-zinc-500">{e.period_start} → {e.period_end}</td>
                      <td className="text-right py-2 px-2 text-emerald-400 font-medium">
                        {formatUsd(parseFloat(String(e.amount_usd)))}
                      </td>
                      <td className="py-2 px-2 text-zinc-500">{e.notes || '—'}</td>
                      <td className="text-right py-2 px-2">
                        <Button size="sm" variant="ghost" onClick={() => deleteEntry(e.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm py-4 text-center">
              Chưa có entry nào. Nhập doanh thu AdSense/AdMob hàng tháng để tính lãi/lỗ chính xác hơn.
            </p>
          )}
        </CardContent>
      </Card>

      {s && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Token & API calls (lifetime)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-400">Tổng chi phí</p>
                <p className="text-xl font-bold text-rose-400">{formatUsd(s.totalCost)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Tổng API calls</p>
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
              <div>
                <p className="text-zinc-400">Cost / chương (7d)</p>
                <p className="text-xl font-bold text-white">{formatUsd(s.costPerChapter)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.chaptersLast7Days} chương</p>
              </div>
              <div>
                <p className="text-zinc-400">Chương hôm nay</p>
                <p className="text-xl font-bold text-white">{s.chaptersToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.taskBreakdown && data.taskBreakdown.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Chi phí theo task (7 ngày)</CardTitle>
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
                      <td className="text-right py-2 px-2 text-rose-400 font-medium">{formatUsd(t.cost)}</td>
                      <td className="text-right py-2 px-2 text-zinc-500">{formatUsd(t.cost / Math.max(1, t.calls))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.taskBreakdown && data.taskBreakdown.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center text-zinc-500">
            Chưa có dữ liệu cost tracking. Dữ liệu sẽ bắt đầu tự động sau khi deploy.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
