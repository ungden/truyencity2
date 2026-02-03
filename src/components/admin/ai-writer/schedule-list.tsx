'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Schedule {
  id: string;
  frequency: string;
  time_of_day: string;
  chapters_per_run: number;
  next_run_at: string;
  last_run_at: string | null;
  status: 'active' | 'paused';
  project: {
    id: string;
    novel_id: string;
    genre: string;
    status: string;
    current_chapter: number;
    novel: {
      id: string;
      title: string;
      author: string;
    };
  };
}

interface ScheduleListProps {
  schedules: Schedule[];
  onToggleStatus: (scheduleId: string, currentStatus: string) => void;
  onDelete: (scheduleId: string) => void;
  isLoading: boolean;
}

export function ScheduleList({ schedules, onToggleStatus, onDelete, isLoading }: ScheduleListProps) {
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const formatNextRun = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) return 'Đã quá hạn';
    if (diffHours < 1) return `${diffMinutes} phút nữa`;
    if (diffHours < 24) return `${diffHours} giờ nữa`;
    return date.toLocaleDateString('vi-VN');
  };

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Chưa có lịch viết tự động nào</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tạo lịch để AI tự động viết chương mới mỗi ngày
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{schedule.project.novel.title}</h4>
                  <Badge 
                    variant={schedule.status === 'active' ? 'default' : 'secondary'}
                    className={cn(
                      schedule.status === 'active' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    )}
                  >
                    {schedule.status === 'active' ? (
                      <>
                        <CheckCircle size={12} className="mr-1" />
                        Đang chạy
                      </>
                    ) : (
                      <>
                        <XCircle size={12} className="mr-1" />
                        Tạm dừng
                      </>
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} />
                    <span>Giờ chạy: {formatTime(schedule.time_of_day)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={14} />
                    <span>{schedule.chapters_per_run} chương/lần</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">
                      Lần chạy tiếp: {formatNextRun(schedule.next_run_at)}
                    </span>
                  </div>
                  {schedule.last_run_at && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">
                        Chạy lần cuối: {new Date(schedule.last_run_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={() => onToggleStatus(schedule.id, schedule.status)}
                  >
                    {schedule.status === 'active' ? (
                      <>
                        <Pause size={16} className="mr-2" />
                        Tạm dừng
                      </>
                    ) : (
                      <>
                        <Play size={16} className="mr-2" />
                        Kích hoạt
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(schedule.id)}
                    className="text-destructive"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Xóa lịch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}