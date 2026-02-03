'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, XCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  chapter_number: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  created_at: string;
}

interface RecentJobsProps {
  jobs: Job[];
  onCancel: (jobId: string) => void;
  isCancelling: string | null; // The ID of the job being cancelled
}

const statusConfig = {
  pending: { icon: Clock, label: 'Đang chờ', color: 'bg-gray-100 text-gray-800' },
  running: { icon: Loader2, label: 'Đang chạy', color: 'bg-blue-100 text-blue-800' }, // removed animate-spin
  completed: { icon: CheckCircle, label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
  failed: { icon: AlertTriangle, label: 'Thất bại', color: 'bg-red-100 text-red-800' },
  stopped: { icon: XCircle, label: 'Đã dừng', color: 'bg-yellow-100 text-yellow-800' },
};

export function RecentJobs({ jobs, onCancel, isCancelling }: RecentJobsProps) {
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "Vài giây trước";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tác vụ gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job) => {
              const config = statusConfig[job.status] || statusConfig.pending;
              const Icon = config.icon;
              const canCancel = ['pending', 'running'].includes(job.status);

              return (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Chương {job.chapter_number}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="secondary" className={cn("text-xs", config.color)}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                      <span>•</span>
                      <span>{timeAgo(job.created_at)}</span>
                    </div>
                  </div>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onCancel(job.id)}
                      disabled={!!isCancelling}
                    >
                      {isCancelling === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hủy'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có tác vụ nào.</p>
        )}
      </CardContent>
    </Card>
  );
}