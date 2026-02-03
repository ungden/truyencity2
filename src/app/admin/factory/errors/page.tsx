'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Eye,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Trash2,
  RotateCcw,
  Bell,
  BellOff,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface FactoryError {
  id: string;
  production_id: string | null;
  novel_id: string | null;
  chapter_number: number | null;
  error_type: string;
  error_code: string | null;
  error_message: string;
  error_details: Record<string, unknown> | null;
  stack_trace: string | null;
  severity: string;
  requires_attention: boolean;
  status: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  auto_resolved: boolean;
  created_at: string;
}

interface ErrorSummary {
  new: number;
  acknowledged: number;
  investigating: number;
  resolved_today: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  requires_attention: number;
}

const SEVERITY_CONFIG: Record<string, { color: string; icon: any; bgColor: string }> = {
  info: { color: 'text-blue-500', icon: Info, bgColor: 'bg-blue-500' },
  warning: { color: 'text-yellow-500', icon: AlertCircle, bgColor: 'bg-yellow-500' },
  error: { color: 'text-orange-500', icon: AlertTriangle, bgColor: 'bg-orange-500' },
  critical: { color: 'text-red-500', icon: XCircle, bgColor: 'bg-red-500' },
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-500',
  acknowledged: 'bg-yellow-500',
  investigating: 'bg-blue-500',
  resolved: 'bg-green-500',
  ignored: 'bg-gray-500',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  ai_failure: 'AI Failure',
  quality_failure: 'Quality Check',
  publish_failure: 'Publishing',
  system_error: 'System Error',
  rate_limit: 'Rate Limit',
};

export default function FactoryErrorsPage() {
  const [errors, setErrors] = useState<FactoryError[]>([]);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('new');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedError, setSelectedError] = useState<FactoryError | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState<FactoryError | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    fetchErrors();
    fetchSummary();
  }, [statusFilter, severityFilter]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      let url = `/api/factory/errors?view=${statusFilter}&limit=100`;
      if (severityFilter !== 'all') {
        url = `/api/factory/errors?severity=${severityFilter}&limit=100`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setErrors(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch errors');
      }
    } catch (error) {
      toast.error('Error fetching errors');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/factory/errors?view=summary');
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleAcknowledge = async (errorId: string) => {
    setActionLoading(`ack-${errorId}`);
    try {
      const response = await fetch('/api/factory/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', error_id: errorId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Error acknowledged');
        fetchErrors();
        fetchSummary();
      } else {
        toast.error(data.error || 'Failed to acknowledge');
      }
    } catch (error) {
      toast.error('Error acknowledging');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    const newErrors = errors.filter((e) => e.status === 'new');
    if (newErrors.length === 0) return;

    setActionLoading('ack_all');
    try {
      const response = await fetch('/api/factory/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge_bulk',
          error_ids: newErrors.map((e) => e.id),
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Acknowledged ${data.data?.acknowledged || 0} errors`);
        fetchErrors();
        fetchSummary();
      } else {
        toast.error(data.error || 'Failed to acknowledge');
      }
    } catch (error) {
      toast.error('Error acknowledging');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async () => {
    if (!showResolveDialog) return;
    setActionLoading(`resolve-${showResolveDialog.id}`);
    try {
      const response = await fetch('/api/factory/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          error_id: showResolveDialog.id,
          resolved_by: 'admin',
          notes: resolveNotes,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Error resolved');
        setShowResolveDialog(null);
        setResolveNotes('');
        fetchErrors();
        fetchSummary();
      } else {
        toast.error(data.error || 'Failed to resolve');
      }
    } catch (error) {
      toast.error('Error resolving');
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async (errorId: string) => {
    setActionLoading(`ignore-${errorId}`);
    try {
      const response = await fetch('/api/factory/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ignore', error_id: errorId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Error ignored');
        fetchErrors();
        fetchSummary();
      } else {
        toast.error(data.error || 'Failed to ignore');
      }
    } catch (error) {
      toast.error('Error ignoring');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoResolveOld = async () => {
    setActionLoading('auto_resolve');
    try {
      const response = await fetch('/api/factory/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_resolve_old', days_old: 7 }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Auto-resolved ${data.data?.resolved || 0} old errors`);
        fetchErrors();
        fetchSummary();
      } else {
        toast.error(data.error || 'Failed to auto-resolve');
      }
    } catch (error) {
      toast.error('Error auto-resolving');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    setActionLoading('cleanup');
    try {
      const response = await fetch('/api/factory/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', days_old: 30 }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${data.data?.deleted || 0} old errors`);
        fetchErrors();
        fetchSummary();
      } else {
        toast.error(data.error || 'Failed to cleanup');
      }
    } catch (error) {
      toast.error('Error cleaning up');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/factory">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Factory Errors
                {(summary?.requires_attention || 0) > 0 && (
                  <Badge className="bg-red-500 ml-2">
                    {summary?.requires_attention} need attention
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">Monitor and resolve factory errors</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchErrors();
                fetchSummary();
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleAutoResolveOld}
              disabled={actionLoading === 'auto_resolve'}
            >
              {actionLoading === 'auto_resolve' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Auto-Resolve Old
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card
            className={`cursor-pointer ${statusFilter === 'new' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('new')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold">{summary?.new || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${statusFilter === 'acknowledged' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('acknowledged')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{summary?.acknowledged || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${statusFilter === 'investigating' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('investigating')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{summary?.investigating || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Investigating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{summary?.resolved_today || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Resolved Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-1">
                {Object.entries(summary?.by_severity || {}).map(([severity, count]) => {
                  const config = SEVERITY_CONFIG[severity];
                  return (
                    <div key={severity} className="text-center">
                      <span className={`text-lg font-bold ${config?.color || ''}`}>{count}</span>
                      <p className="text-xs text-muted-foreground capitalize">{severity[0]}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-1">By Severity</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Severity:</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {statusFilter === 'new' && errors.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleAcknowledgeAll}
                  disabled={actionLoading === 'ack_all'}
                >
                  {actionLoading === 'ack_all' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Acknowledge All ({errors.filter((e) => e.status === 'new').length})
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleCleanup}
                disabled={actionLoading === 'cleanup'}
                className="ml-auto"
              >
                {actionLoading === 'cleanup' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Cleanup Old (30d)
              </Button>

              <div className="text-sm text-muted-foreground">{errors.length} errors found</div>
            </div>
          </CardContent>
        </Card>

        {/* Errors Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-green-500" />
                <p>No errors found</p>
                <p className="text-sm">The factory is running smoothly</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[300px]">Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error) => {
                    const SeverityIcon = SEVERITY_CONFIG[error.severity]?.icon || AlertTriangle;
                    return (
                      <TableRow key={error.id}>
                        <TableCell>
                          <Badge
                            className={`${SEVERITY_CONFIG[error.severity]?.bgColor || 'bg-gray-500'} flex items-center gap-1 w-fit`}
                          >
                            <SeverityIcon className="w-3 h-3" />
                            {error.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ERROR_TYPE_LABELS[error.error_type] || error.error_type}
                          </Badge>
                          {error.chapter_number && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ch. {error.chapter_number}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="truncate max-w-[280px]" title={error.error_message}>
                            {error.error_message}
                          </p>
                          {error.error_code && (
                            <code className="text-xs text-muted-foreground">{error.error_code}</code>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[error.status] || 'bg-gray-500'}>
                            {error.status}
                          </Badge>
                          {error.requires_attention && error.status === 'new' && (
                            <Bell className="w-3 h-3 text-red-500 inline ml-1" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(error.created_at).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedError(error)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {error.status === 'new' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAcknowledge(error.id)}
                                disabled={actionLoading === `ack-${error.id}`}
                              >
                                {actionLoading === `ack-${error.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {(error.status === 'acknowledged' ||
                              error.status === 'investigating') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowResolveDialog(error)}
                                className="text-green-600"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            {error.status !== 'ignored' && error.status !== 'resolved' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleIgnore(error.id)}
                                disabled={actionLoading === `ignore-${error.id}`}
                                className="text-gray-500"
                              >
                                <BellOff className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog open={!!showResolveDialog} onOpenChange={() => setShowResolveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Resolve Error
              </DialogTitle>
              <DialogDescription>Mark this error as resolved.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded">
                <p className="text-sm">{showResolveDialog?.error_message}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolveNotes">Resolution Notes (optional)</Label>
                <Textarea
                  id="resolveNotes"
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="What was done to resolve this?"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolveDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={!!actionLoading}>
                {actionLoading?.startsWith('resolve') ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Error Detail Dialog */}
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedError && (
                  <>
                    {(() => {
                      const Icon = SEVERITY_CONFIG[selectedError.severity]?.icon || AlertTriangle;
                      return (
                        <Icon
                          className={`w-5 h-5 ${SEVERITY_CONFIG[selectedError.severity]?.color}`}
                        />
                      );
                    })()}
                    {ERROR_TYPE_LABELS[selectedError.error_type] || selectedError.error_type}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                <Badge className={STATUS_COLORS[selectedError?.status || ''] || 'bg-gray-500'}>
                  {selectedError?.status}
                </Badge>
                <span className="ml-2">
                  {selectedError?.created_at &&
                    new Date(selectedError.created_at).toLocaleString('vi-VN')}
                </span>
              </DialogDescription>
            </DialogHeader>

            {selectedError && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Error Message</Label>
                  <p className="mt-1 p-3 bg-muted rounded">{selectedError.error_message}</p>
                </div>

                {selectedError.error_code && (
                  <div>
                    <Label className="text-muted-foreground">Error Code</Label>
                    <code className="block mt-1 p-2 bg-muted rounded">
                      {selectedError.error_code}
                    </code>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedError.production_id && (
                    <div>
                      <Label className="text-muted-foreground">Production ID</Label>
                      <code className="block mt-1 text-xs">{selectedError.production_id}</code>
                    </div>
                  )}
                  {selectedError.chapter_number && (
                    <div>
                      <Label className="text-muted-foreground">Chapter</Label>
                      <p className="mt-1">{selectedError.chapter_number}</p>
                    </div>
                  )}
                </div>

                {selectedError.error_details && (
                  <div>
                    <Label className="text-muted-foreground">Details</Label>
                    <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedError.error_details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedError.stack_trace && (
                  <div>
                    <Label className="text-muted-foreground">Stack Trace</Label>
                    <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                      {selectedError.stack_trace}
                    </pre>
                  </div>
                )}

                {selectedError.resolution_notes && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                    <Label className="text-green-600">Resolution Notes</Label>
                    <p className="mt-1">{selectedError.resolution_notes}</p>
                    {selectedError.resolved_by && (
                      <p className="text-xs text-green-500 mt-1">
                        Resolved by: {selectedError.resolved_by}
                        {selectedError.auto_resolved && ' (auto)'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {selectedError?.status === 'new' && (
                <Button variant="outline" onClick={() => handleAcknowledge(selectedError.id)}>
                  <Check className="w-4 h-4 mr-2" />
                  Acknowledge
                </Button>
              )}
              {(selectedError?.status === 'acknowledged' ||
                selectedError?.status === 'investigating') && (
                <Button
                  onClick={() => {
                    setShowResolveDialog(selectedError);
                    setSelectedError(null);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
