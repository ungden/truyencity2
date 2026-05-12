'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

type NovelRow = {
  project_id: string;
  novel_id: string;
  novel_title: string;
  current_chapter: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  call_count: number;
  cost_per_chapter: number;
  status: string;
  total_reads: number;
  reads_last_7d: number;
  bookmark_count: number;
  rating_avg: number;
  rating_count: number;
  cost_per_1000_reads: number;
};

type ApiResponse = {
  success: boolean;
  novels: NovelRow[];
  pagination: { limit: number; offset: number; count: number };
  summary: { grandTotal: number; grandTokensIn: number; grandTokensOut: number };
};

type SortKey =
  | 'total_cost'
  | 'cost_per_chapter'
  | 'current_chapter'
  | 'total_reads'
  | 'reads_last_7d'
  | 'bookmark_count'
  | 'rating_avg'
  | 'cost_per_1000_reads';

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

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  paused: 'bg-amber-900/50 text-amber-300 border-amber-800',
  completed: 'bg-blue-900/50 text-blue-300 border-blue-800',
  failed: 'bg-rose-900/50 text-rose-300 border-rose-800',
};

export default function CostTrackingNovelsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total_cost');
  const [sortDesc, setSortDesc] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cost-tracking/novels?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSorted = useMemo(() => {
    if (!data?.novels) return [];
    const q = query.trim().toLowerCase();
    let rows = q
      ? data.novels.filter((n) => n.novel_title.toLowerCase().includes(q))
      : [...data.novels];
    rows.sort((a, b) => {
      const av = (a[sortKey] as number) ?? 0;
      const bv = (b[sortKey] as number) ?? 0;
      return sortDesc ? bv - av : av - bv;
    });
    return rows;
  }, [data, query, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDesc ? ' ↓' : ' ↑') : '';

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Đang tải dữ liệu...</span>
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/cost-tracking">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Chi phí theo tiểu thuyết</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {data?.pagination.count ?? 0} truyện hàng đầu theo chi phí · sort + filter
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
          >
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
            <option value="200">Top 200</option>
            <option value="500">Top 500</option>
          </select>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {data?.summary && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Tổng (top {data.pagination.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-400">Chi phí</p>
                <p className="text-xl font-bold text-rose-400">{formatUsd(data.summary.grandTotal)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Input tokens</p>
                <p className="text-xl font-bold text-blue-400">{formatTokens(data.summary.grandTokensIn)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Output tokens</p>
                <p className="text-xl font-bold text-purple-400">{formatTokens(data.summary.grandTokensOut)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Input
          placeholder="Tìm theo tên truyện..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        {query && (
          <span className="text-sm text-zinc-500">{filteredSorted.length} kết quả</span>
        )}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800 bg-zinc-950/50">
                  <th className="text-left py-2 px-3 sticky left-0 bg-zinc-950/50">Truyện</th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('current_chapter')}>
                    Ch{sortIcon('current_chapter')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('total_cost')}>
                    Chi phí{sortIcon('total_cost')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('cost_per_chapter')}>
                    $ / ch{sortIcon('cost_per_chapter')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('total_reads')}>
                    Reads{sortIcon('total_reads')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('reads_last_7d')}>
                    Reads 7d{sortIcon('reads_last_7d')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('bookmark_count')}>
                    Bookmark{sortIcon('bookmark_count')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('rating_avg')}>
                    ⭐{sortIcon('rating_avg')}
                  </th>
                  <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('cost_per_1000_reads')}>
                    $ / 1k reads{sortIcon('cost_per_1000_reads')}
                  </th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((n) => (
                  <tr key={n.project_id} className="border-b border-zinc-800/50 text-zinc-300 hover:bg-zinc-800/30">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-zinc-900 max-w-xs truncate" title={n.novel_title}>
                      <Link href={`/admin/cost-tracking/novels/${n.project_id}`} className="text-purple-300 hover:text-purple-200">
                        {n.novel_title || '(no title)'}
                      </Link>
                    </td>
                    <td className="text-right py-2 px-3">{n.current_chapter}</td>
                    <td className="text-right py-2 px-3 text-rose-400 font-medium">{formatUsd(n.total_cost)}</td>
                    <td className="text-right py-2 px-3 text-zinc-400">{formatUsd(n.cost_per_chapter)}</td>
                    <td className="text-right py-2 px-3">{n.total_reads.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-blue-400">{n.reads_last_7d.toLocaleString()}</td>
                    <td className="text-right py-2 px-3">{n.bookmark_count.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-amber-300">
                      {n.rating_count > 0 ? `${Number(n.rating_avg).toFixed(1)} (${n.rating_count})` : '—'}
                    </td>
                    <td className="text-right py-2 px-3 text-zinc-500">
                      {n.total_reads > 0 ? formatUsd(n.cost_per_1000_reads) : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusBadge[n.status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {n.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-zinc-500 py-12">
                      Không có truyện phù hợp với filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-zinc-600">
        Lưu ý: "$ / 1k reads" là metric proxy cho hiệu suất kinh tế — doanh thu trung bình mỗi
        view không tách được theo từng truyện (VIP + ads đều global), nên đây là chi phí AI chia
        cho số lượt đọc. Số nhỏ = truyện hút view tốt vs chi phí. Số lớn / "—" = chi phí cao mà
        ít người đọc.
      </p>
    </div>
  );
}
