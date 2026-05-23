'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

type ArcPlanData = {
  theme: string | null;
  plan_text: string | null;
  chapter_briefs: unknown;
  created_at: string | null;
};

type PendingApproval = {
  project_id: string;
  title: string;
  pause_reason: string | null;
  paused_at: string | null;
  setup_stage: string | null;
  progress: string;
  arc_number: number;
  arc_plan: ArcPlanData | null;
};

type ApprovalReport = {
  count: number;
  approvals: PendingApproval[];
};

export default function ArcApprovalsPage() {
  const [report, setReport] = useState<ApprovalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_pending_approvals' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const approveArc = async (projectId: string) => {
    setApprovingId(projectId);
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_arc', projectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchReport();
    } catch (e) {
      alert(`Approve failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setApprovingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '?';
    return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  const formatChapterBriefs = (briefs: unknown): string => {
    if (!briefs) return '(Không có chapter briefs)';
    if (Array.isArray(briefs)) {
      return briefs.map((b, i) => {
        if (typeof b === 'string') return `Ch.${i + 1}: ${b}`;
        if (typeof b === 'object' && b !== null) {
          const brief = b as Record<string, unknown>;
          const title = brief.title || brief.name || `Ch.${i + 1}`;
          const desc = brief.description || brief.brief || brief.summary || '';
          return `${title}: ${desc}`;
        }
        return String(b);
      }).join('\n');
    }
    if (typeof briefs === 'string') return briefs;
    return JSON.stringify(briefs, null, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            Arc Plan Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Duyệt kế hoạch Arc trước khi hệ thống tiếp tục viết. Mỗi Arc = 20 chương.
          </p>
        </div>
        <Button onClick={fetchReport} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6 text-red-600">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            Pending Approvals ({report?.count ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!report?.approvals.length ? (
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Không có arc plan nào đang đợi duyệt. Tất cả đã được approve. ✓
            </p>
          ) : (
            <div className="space-y-4">
              {report.approvals.map(row => {
                const isExpanded = expandedIds.has(row.project_id);
                return (
                  <div key={row.project_id} className="border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    {/* Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate flex items-center gap-2">
                            {row.title}
                            <Badge variant="secondary">Arc {row.arc_number}</Badge>
                            {row.setup_stage === 'arc_approval' && (
                              <Badge variant="outline">Setup Pipeline</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Project: {row.project_id.slice(0, 8)} · Progress {row.progress}
                          </div>
                          <div className="text-xs mt-1">Paused at: {fmtTime(row.paused_at)}</div>
                          {row.arc_plan?.theme && (
                            <div className="text-sm mt-2">
                              <span className="font-medium">Theme:</span> {row.arc_plan.theme}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleExpand(row.project_id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-4 h-4 mr-1" /> Thu gọn</>
                            ) : (
                              <><ChevronDown className="w-4 h-4 mr-1" /> Xem chi tiết</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveArc(row.project_id)}
                            disabled={approvingId === row.project_id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {approvingId === row.project_id ? 'Đang approve...' : 'Approve'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && row.arc_plan && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-3">
                        {row.arc_plan.plan_text && (
                          <div>
                            <div className="text-sm font-medium mb-1">📋 Arc Plan:</div>
                            <div className="text-sm font-mono bg-white dark:bg-gray-900 rounded p-3 whitespace-pre-wrap max-h-80 overflow-y-auto border">
                              {row.arc_plan.plan_text}
                            </div>
                          </div>
                        )}
                        {row.arc_plan.chapter_briefs != null && (
                          <div>
                            <div className="text-sm font-medium mb-1">📖 Chapter Briefs:</div>
                            <div className="text-sm font-mono bg-white dark:bg-gray-900 rounded p-3 whitespace-pre-wrap max-h-80 overflow-y-auto border">
                              {formatChapterBriefs(row.arc_plan.chapter_briefs)}
                            </div>
                          </div>
                        )}
                        {row.arc_plan.created_at && (
                          <div className="text-xs text-muted-foreground">
                            Arc plan generated: {fmtTime(row.arc_plan.created_at)}
                          </div>
                        )}
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
