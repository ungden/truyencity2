'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Sun,
  Sunset,
  Moon,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ScheduledPublish {
  id: string;
  production_id: string;
  chapter_id: string;
  scheduled_time: string;
  publish_slot: string | null;
  status: string;
  published_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  // Joined data
  production?: {
    story_blueprints?: {
      title: string;
    };
    novels?: {
      title: string;
    };
  };
  chapters?: {
    chapter_number: number;
    title: string;
  };
}

interface PublishingStats {
  scheduled_today: number;
  published_today: number;
  failed_today: number;
  scheduled_upcoming: number;
  by_slot: {
    morning: number;
    afternoon: number;
    evening: number;
  };
}

interface TodaySchedule {
  morning: ScheduledPublish[];
  afternoon: ScheduledPublish[];
  evening: ScheduledPublish[];
}

const SLOT_CONFIG = {
  morning: { icon: Sun, label: 'Morning (6-10h)', color: 'text-yellow-500' },
  afternoon: { icon: Sunset, label: 'Afternoon (12-14h)', color: 'text-orange-500' },
  evening: { icon: Moon, label: 'Evening (18-22h)', color: 'text-indigo-500' },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500',
  publishing: 'bg-yellow-500',
  published: 'bg-green-500',
  failed: 'bg-red-500',
};

export default function FactoryPublishingPage() {
  const [schedule, setSchedule] = useState<TodaySchedule | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledPublish[]>([]);
  const [stats, setStats] = useState<PublishingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [view, setView] = useState<'today' | 'upcoming'>('today');

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (view === 'today') {
        const [scheduleRes, statsRes] = await Promise.all([
          fetch('/api/factory/publishing?view=today'),
          fetch('/api/factory/publishing?view=stats'),
        ]);
        const scheduleData = await scheduleRes.json();
        const statsData = await statsRes.json();

        if (scheduleData.success) {
          setSchedule(scheduleData.data);
        }
        if (statsData.success) {
          setStats(statsData.data);
        }
      } else {
        const response = await fetch('/api/factory/publishing?view=upcoming&hours=48');
        const data = await response.json();
        if (data.success) {
          setUpcoming(data.data || []);
        }
      }
    } catch (error) {
      toast.error('Error fetching publishing data');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishDue = async () => {
    setActionLoading('publish_due');
    try {
      const response = await fetch('/api/factory/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_due' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(
          `Published ${data.data?.succeeded || 0} chapters (${data.data?.failed || 0} failed)`
        );
        fetchData();
      } else {
        toast.error(data.error || 'Failed to publish');
      }
    } catch (error) {
      toast.error('Error publishing chapters');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishSingle = async (queueItemId: string) => {
    setActionLoading(queueItemId);
    try {
      const response = await fetch('/api/factory/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', queue_item_id: queueItemId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Chapter published');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to publish');
      }
    } catch (error) {
      toast.error('Error publishing chapter');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryFailed = async () => {
    setActionLoading('retry_failed');
    try {
      const response = await fetch('/api/factory/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_failed' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Retried ${data.data?.retried || 0} failed publishes`);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to retry');
      }
    } catch (error) {
      toast.error('Error retrying failed publishes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (queueItemId: string) => {
    setActionLoading(`cancel-${queueItemId}`);
    try {
      const response = await fetch('/api/factory/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', queue_item_id: queueItemId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Publish cancelled');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to cancel');
      }
    } catch (error) {
      toast.error('Error cancelling publish');
    } finally {
      setActionLoading(null);
    }
  };

  const SlotSection = ({ slot, items }: { slot: 'morning' | 'afternoon' | 'evening'; items: ScheduledPublish[] }) => {
    const config = SLOT_CONFIG[slot];
    const Icon = config.icon;
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            {config.label}
            <Badge variant="secondary" className="ml-auto">
              {items.length} chapters
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No chapters scheduled for this slot
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.production?.story_blueprints?.title ||
                        item.production?.novels?.title ||
                        'Unknown Story'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chapter {item.chapters?.chapter_number || '?'} -{' '}
                      {new Date(item.scheduled_time).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[item.status] || 'bg-gray-500'}>
                      {item.status}
                    </Badge>
                    {item.status === 'scheduled' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePublishSingle(item.id)}
                        disabled={actionLoading === item.id}
                        className="h-7 w-7"
                      >
                        {actionLoading === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                    {item.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePublishSingle(item.id)}
                        disabled={actionLoading === item.id}
                        className="h-7 w-7 text-red-500"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
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
                <Calendar className="w-6 h-6 text-indigo-500" />
                Publishing Schedule
              </h1>
              <p className="text-muted-foreground">
                Manage chapter publishing across time slots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handlePublishDue}
              disabled={actionLoading === 'publish_due'}
            >
              {actionLoading === 'publish_due' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Publish Due Now
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats?.scheduled_today || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Scheduled Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{stats?.published_today || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Published Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold">{stats?.failed_today || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Failed Today</p>
              {(stats?.failed_today || 0) > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={actionLoading === 'retry_failed'}
                  className="p-0 h-auto text-xs"
                >
                  Retry all
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats?.scheduled_upcoming || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Upcoming (48h)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex gap-3">
                <span className="text-yellow-500">{stats?.by_slot?.morning || 0}</span>
                <span className="text-orange-500">{stats?.by_slot?.afternoon || 0}</span>
                <span className="text-indigo-500">{stats?.by_slot?.evening || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">By Slot (M/A/E)</p>
            </CardContent>
          </Card>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2">
          <Button
            variant={view === 'today' ? 'default' : 'outline'}
            onClick={() => setView('today')}
          >
            Today's Schedule
          </Button>
          <Button
            variant={view === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setView('upcoming')}
          >
            Upcoming (48h)
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : view === 'today' ? (
          /* Today's Schedule View */
          <div className="grid md:grid-cols-3 gap-6">
            <SlotSection slot="morning" items={schedule?.morning || []} />
            <SlotSection slot="afternoon" items={schedule?.afternoon || []} />
            <SlotSection slot="evening" items={schedule?.evening || []} />
          </div>
        ) : (
          /* Upcoming View */
          <Card>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Calendar className="w-12 h-12 mb-4 opacity-50" />
                  <p>No upcoming publishes in the next 48 hours</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Story</TableHead>
                      <TableHead>Chapter</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.production?.story_blueprints?.title ||
                            item.production?.novels?.title ||
                            'Unknown'}
                        </TableCell>
                        <TableCell>
                          Ch. {item.chapters?.chapter_number || '?'}
                        </TableCell>
                        <TableCell>
                          {new Date(item.scheduled_time).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          {item.publish_slot && (
                            <Badge variant="outline" className="capitalize">
                              {item.publish_slot}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[item.status] || 'bg-gray-500'}>
                            {item.status}
                          </Badge>
                          {item.error_message && (
                            <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                              {item.error_message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === 'scheduled' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePublishSingle(item.id)}
                                  disabled={actionLoading === item.id}
                                  title="Publish now"
                                >
                                  {actionLoading === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancel(item.id)}
                                  disabled={actionLoading === `cancel-${item.id}`}
                                  className="text-red-500"
                                  title="Cancel"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {item.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePublishSingle(item.id)}
                                disabled={actionLoading === item.id}
                                title="Retry"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
