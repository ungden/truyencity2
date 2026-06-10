'use client';

/**
 * Quality Overhaul 1.4/1.5 — review queue + circuit breaker section on
 * /admin/quality. Rows pending >48h are highlighted (SLA). Held projects
 * (style_directives.quality_hold) get a Resume button.
 */

import { useCallback, useEffect, useState } from 'react';

interface QueueRow {
  id: string;
  project_id: string | null;
  novel_id: string | null;
  chapter_number: number | null;
  reason: string;
  detail: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface HeldProject {
  id: string;
  current_chapter: number | null;
  novels?: Array<{ title: string | null }> | { title: string | null } | null;
}

const REASON_LABELS: Record<string, string> = {
  golden_fallback: 'Chương vàng (1-3) lưu với điểm thấp — cần polish',
  revise_pass_failed: 'Revise pass thất bại — chương ship bản gốc',
  major_contradiction_unfixed: 'Mâu thuẫn rủi ro cao chưa sửa được',
  quality_circuit_breaker: 'Circuit breaker: critical 2 snapshot liên tiếp',
  foreshadowing_abandoned: 'Foreshadowing bị bỏ rơi không payoff',
};

const SLA_MS = 48 * 3600 * 1000;

export default function ReviewQueueSection() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [held, setHeld] = useState<HeldProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/review-queue');
      if (!res.ok) return;
      const data = await res.json();
      setQueue(data.queue || []);
      setHeld(data.heldProjects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateRow = async (id: string, status: 'resolved' | 'dismissed') => {
    setBusy(id);
    try {
      await fetch('/api/admin/review-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const resumeProject = async (projectId: string) => {
    setBusy(projectId);
    try {
      await fetch('/api/admin/review-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_quality_hold', projectId }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Đang tải review queue…</p>;
  if (queue.length === 0 && held.length === 0) return null;

  const now = Date.now();

  return (
    <section className="space-y-4">
      {held.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">⛔ Novels đang bị circuit breaker giữ</h2>
          <div className="overflow-x-auto rounded border border-red-300 dark:border-red-700">
            <table className="min-w-full text-sm">
              <thead className="bg-red-50 dark:bg-red-900/30">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-right">Ch.</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {held.map(p => {
                  const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
                  return (
                    <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 font-mono text-xs">{p.id.slice(0, 8)}</td>
                      <td className="px-3 py-2">{novel?.title || '—'}</td>
                      <td className="px-3 py-2 text-right">{p.current_chapter ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => resumeProject(p.id)}
                          disabled={busy === p.id}
                          className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Resume
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">📋 Review queue ({queue.length} pending)</h2>
          <p className="text-xs text-gray-500 mb-2">
            Chương ship với chất lượng giảm cấp hoặc cảnh báo hệ thống. Dòng đỏ = quá SLA 48h.
          </p>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Lý do</th>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-right">Ch.</th>
                  <th className="px-3 py-2 text-left">Chi tiết</th>
                  <th className="px-3 py-2 text-left">Tạo lúc</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {queue.map(row => {
                  const overdue = now - new Date(row.created_at).getTime() > SLA_MS;
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-gray-200 dark:border-gray-700 ${overdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                    >
                      <td className="px-3 py-2 text-xs">{REASON_LABELS[row.reason] || row.reason}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.project_id?.slice(0, 8) || '—'}</td>
                      <td className="px-3 py-2 text-right">{row.chapter_number ?? '—'}</td>
                      <td className="px-3 py-2 text-xs max-w-md truncate" title={JSON.stringify(row.detail)}>
                        {JSON.stringify(row.detail).slice(0, 120)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(row.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                        {overdue ? ' ⚠' : ''}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => updateRow(row.id, 'resolved')}
                          disabled={busy === row.id}
                          className="mr-2 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Resolved
                        </button>
                        <button
                          onClick={() => updateRow(row.id, 'dismissed')}
                          disabled={busy === row.id}
                          className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
