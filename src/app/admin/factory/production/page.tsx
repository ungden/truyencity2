'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  BookOpen,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Eye,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Production {
  id: string;
  blueprint_id: string | null;
  novel_id: string | null;
  project_id: string | null;
  author_id: string | null;
  status: string;
  priority: number;
  current_chapter: number;
  total_chapters: number | null;
  chapters_per_day: number;
  last_write_date: string | null;
  chapters_written_today: number;
  last_chapter_summary: string | null;
  total_rewrites: number;
  avg_chapter_quality: number | null;
  consecutive_errors: number;
  last_error: string | null;
  last_error_at: string | null;
  queued_at: string;
  activated_at: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  finished_at: string | null;
  story_blueprints?: {
    title: string;
    genre: string;
  };
  ai_author_profiles?: {
    pen_name: string;
  };
  novels?: {
    title: string;
    slug: string;
  };
}

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  queued: { color: 'bg-gray-500', icon: Clock },
  active: { color: 'bg-green-500', icon: Play },
  writing: { color: 'bg-blue-500', icon: Zap },
  paused: { color: 'bg-yellow-500', icon: Pause },
  finished: { color: 'bg-purple-500', icon: CheckCircle2 },
  error: { color: 'bg-red-500', icon: AlertTriangle },
};

const GENRE_LABELS: Record<string, string> = {
  'system-litrpg': 'System/LitRPG',
  'urban-modern': 'Đô Thị Hiện Đại',
  'romance': 'Ngôn Tình',
  'huyen-huyen': 'Huyền Huyễn',
  'action-adventure': 'Hành Động/Phiêu Lưu',
  'historical': 'Lịch Sử',
  'tien-hiep': 'Tiên Hiệp',
  'sci-fi-apocalypse': 'Khoa Huyễn/Mạt Thế',
  'horror-mystery': 'Kinh Dị/Bí Ẩn',
};

export default function FactoryProductionPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [showPauseDialog, setShowPauseDialog] = useState<Production | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [stats, setStats] = useState<{
    active: number;
    queued: number;
    paused: number;
    error: number;
    finished: number;
    total_chapters_today: number;
  } | null>(null);

  useEffect(() => {
    fetchProductions();
    fetchStats();
  }, [statusFilter]);

  const fetchProductions = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === 'all'
          ? '/api/factory/production?limit=100'
          : `/api/factory/production?status=${statusFilter}&limit=100`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setProductions(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch productions');
      }
    } catch (error) {
      toast.error('Error fetching productions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/factory/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' }),
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePause = async () => {
    if (!showPauseDialog) return;
    setActionLoading(`pause-${showPauseDialog.id}`);
    try {
      const response = await fetch('/api/factory/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pause',
          production_id: showPauseDialog.id,
          reason: pauseReason || 'Paused by admin',
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Production paused');
        setShowPauseDialog(null);
        setPauseReason('');
        fetchProductions();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to pause production');
      }
    } catch (error) {
      toast.error('Error pausing production');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (productionId: string) => {
    setActionLoading(`resume-${productionId}`);
    try {
      const response = await fetch('/api/factory/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', production_id: productionId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Production resumed');
        fetchProductions();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to resume production');
      }
    } catch (error) {
      toast.error('Error resuming production');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (count: number = 10) => {
    setActionLoading('activate');
    try {
      const response = await fetch('/api/factory/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', count }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Activated ${data.data?.activated || 0} productions`);
        fetchProductions();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to activate productions');
      }
    } catch (error) {
      toast.error('Error activating productions');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetPriority = async (productionId: string, priority: number) => {
    setActionLoading(`priority-${productionId}`);
    try {
      const response = await fetch('/api/factory/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_priority', production_id: productionId, priority }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Priority updated');
        fetchProductions();
      } else {
        toast.error(data.error || 'Failed to update priority');
      }
    } catch (error) {
      toast.error('Error updating priority');
    } finally {
      setActionLoading(null);
    }
  };

  const getProgressPercent = (production: Production) => {
    if (!production.total_chapters) return 0;
    return (production.current_chapter / production.total_chapters) * 100;
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
                <BookOpen className="w-6 h-6 text-blue-500" />
                Production Queue
              </h1>
              <p className="text-muted-foreground">Monitor and manage active story productions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                fetchProductions();
                fetchStats();
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {stats && stats.queued > 0 && (
              <Button onClick={() => handleActivate(10)} disabled={actionLoading === 'activate'}>
                {actionLoading === 'activate' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Activate Queued
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-2xl font-bold">{stats?.active || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-2xl font-bold">{stats?.queued || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Queued</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-2xl font-bold">{stats?.paused || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Paused</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-2xl font-bold">{stats?.error || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-2xl font-bold">{stats?.finished || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Finished</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats?.total_chapters_today || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Chapters Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="writing">Writing</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto text-sm text-muted-foreground">
                {productions.length} productions found
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productions Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : productions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                <p>No productions found</p>
                <Link href="/admin/factory/blueprints">
                  <Button variant="link" className="mt-2">
                    Create from blueprints
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Story</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Today</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productions.map((production) => {
                    const StatusIcon = STATUS_CONFIG[production.status]?.icon || Clock;
                    return (
                      <TableRow key={production.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="truncate max-w-[230px]">
                              {production.story_blueprints?.title ||
                                production.novels?.title ||
                                'Unknown'}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {GENRE_LABELS[production.story_blueprints?.genre || ''] ||
                                production.story_blueprints?.genre ||
                                '-'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {production.ai_author_profiles?.pen_name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{production.current_chapter}</span>
                              <span>{production.total_chapters || '?'}</span>
                            </div>
                            <Progress value={getProgressPercent(production)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              production.chapters_written_today >= production.chapters_per_day
                                ? 'text-green-600'
                                : ''
                            }
                          >
                            {production.chapters_written_today}/{production.chapters_per_day}
                          </span>
                        </TableCell>
                        <TableCell>
                          {production.avg_chapter_quality
                            ? `${(production.avg_chapter_quality * 100).toFixed(0)}%`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${STATUS_CONFIG[production.status]?.color || 'bg-gray-500'} flex items-center gap-1 w-fit`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {production.status}
                          </Badge>
                          {production.consecutive_errors > 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              {production.consecutive_errors} errors
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={production.priority.toString()}
                            onValueChange={(val) =>
                              handleSetPriority(production.id, parseInt(val))
                            }
                          >
                            <SelectTrigger className="w-16 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                                <SelectItem key={p} value={p.toString()}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedProduction(production)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {production.status === 'active' ||
                            production.status === 'writing' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPauseDialog(production)}
                                className="text-yellow-600 hover:text-yellow-700"
                              >
                                <Pause className="w-4 h-4" />
                              </Button>
                            ) : production.status === 'paused' ||
                              production.status === 'error' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResume(production.id)}
                                disabled={actionLoading === `resume-${production.id}`}
                                className="text-green-600 hover:text-green-700"
                              >
                                {actionLoading === `resume-${production.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            ) : null}
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

        {/* Pause Dialog */}
        <Dialog open={!!showPauseDialog} onOpenChange={() => setShowPauseDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pause className="w-5 h-5" />
                Pause Production
              </DialogTitle>
              <DialogDescription>
                Pause "{showPauseDialog?.story_blueprints?.title || 'this production'}"?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pauseReason">Reason (optional)</Label>
                <Input
                  id="pauseReason"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Why is this being paused?"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPauseDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handlePause}
                disabled={!!actionLoading}
              >
                {actionLoading?.startsWith('pause') ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                Pause
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Production Detail Dialog */}
        <Dialog open={!!selectedProduction} onOpenChange={() => setSelectedProduction(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedProduction?.story_blueprints?.title ||
                  selectedProduction?.novels?.title ||
                  'Production Details'}
              </DialogTitle>
              <DialogDescription>
                <Badge
                  className={`${STATUS_CONFIG[selectedProduction?.status || '']?.color || 'bg-gray-500'} mr-2`}
                >
                  {selectedProduction?.status}
                </Badge>
                by {selectedProduction?.ai_author_profiles?.pen_name || 'Unknown Author'}
              </DialogDescription>
            </DialogHeader>

            {selectedProduction && (
              <div className="space-y-6">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Overall Progress</Label>
                    <span className="text-sm">
                      {selectedProduction.current_chapter} /{' '}
                      {selectedProduction.total_chapters || '?'} chapters
                    </span>
                  </div>
                  <Progress value={getProgressPercent(selectedProduction)} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Chapters Today</Label>
                    <p className="text-xl font-semibold">
                      {selectedProduction.chapters_written_today}/
                      {selectedProduction.chapters_per_day}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Avg Quality</Label>
                    <p className="text-xl font-semibold">
                      {selectedProduction.avg_chapter_quality
                        ? `${(selectedProduction.avg_chapter_quality * 100).toFixed(0)}%`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Rewrites</Label>
                    <p className="text-xl font-semibold">{selectedProduction.total_rewrites}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <p className="text-xl font-semibold">{selectedProduction.priority}</p>
                  </div>
                </div>

                {/* Last Chapter Summary */}
                {selectedProduction.last_chapter_summary && (
                  <div>
                    <Label className="text-muted-foreground">Last Chapter Summary</Label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded">
                      {selectedProduction.last_chapter_summary}
                    </p>
                  </div>
                )}

                {/* Error Info */}
                {selectedProduction.last_error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <Label className="text-red-600">Last Error</Label>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                      {selectedProduction.last_error}
                    </p>
                    {selectedProduction.last_error_at && (
                      <p className="text-xs text-red-500 mt-1">
                        {new Date(selectedProduction.last_error_at).toLocaleString('vi-VN')}
                      </p>
                    )}
                    <p className="text-xs mt-1">
                      Consecutive errors: {selectedProduction.consecutive_errors}
                    </p>
                  </div>
                )}

                {/* Pause Info */}
                {selectedProduction.paused_reason && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <Label className="text-yellow-600">Pause Reason</Label>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                      {selectedProduction.paused_reason}
                    </p>
                    {selectedProduction.paused_at && (
                      <p className="text-xs text-yellow-500 mt-1">
                        Paused: {new Date(selectedProduction.paused_at).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Queued</Label>
                    <p>{new Date(selectedProduction.queued_at).toLocaleString('vi-VN')}</p>
                  </div>
                  {selectedProduction.activated_at && (
                    <div>
                      <Label className="text-muted-foreground">Activated</Label>
                      <p>{new Date(selectedProduction.activated_at).toLocaleString('vi-VN')}</p>
                    </div>
                  )}
                  {selectedProduction.finished_at && (
                    <div>
                      <Label className="text-muted-foreground">Finished</Label>
                      <p>{new Date(selectedProduction.finished_at).toLocaleString('vi-VN')}</p>
                    </div>
                  )}
                  {selectedProduction.last_write_date && (
                    <div>
                      <Label className="text-muted-foreground">Last Write</Label>
                      <p>{new Date(selectedProduction.last_write_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              {(selectedProduction?.status === 'paused' ||
                selectedProduction?.status === 'error') && (
                <Button onClick={() => handleResume(selectedProduction.id)}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              {(selectedProduction?.status === 'active' ||
                selectedProduction?.status === 'writing') && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowPauseDialog(selectedProduction);
                    setSelectedProduction(null);
                  }}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
