'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Send, Trash2, Eye } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sendNotification, deleteNotification } from '@/lib/actions';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: 'pending' | 'sent' | 'failed';
  sent_count: number;
  total_recipients: number;
  created_at: string;
  sent_at?: string;
}

interface NotificationTableProps {
  notifications: Notification[];
}

const ITEMS_PER_PAGE = 10;

export function NotificationTable({ notifications }: NotificationTableProps) {
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentNotifications = notifications.slice(startIndex, endIndex);

  const handleSend = (notificationId: string) => {
    startTransition(async () => {
      const result = await sendNotification(notificationId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  const handleDelete = (notificationId: string) => {
    startTransition(async () => {
      const result = await deleteNotification(notificationId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      chapter: { label: 'Chương mới', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      system: { label: 'Hệ thống', className: 'bg-gray-100 text-gray-800 border-gray-200' },
      announcement: { label: 'Thông báo', className: 'bg-purple-100 text-purple-800 border-purple-200' },
      update: { label: 'Cập nhật', className: 'bg-green-100 text-green-800 border-green-200' },
    };
    const { label, className } = config[type] || config.announcement;
    return <Badge className={className}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Đã gửi</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Chờ gửi</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Thất bại</Badge>;
      default:
        return <Badge variant="secondary">Không xác định</Badge>;
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Người nhận</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentNotifications.length > 0 ? (
            currentNotifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {notification.message}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(notification.type)}</TableCell>
                <TableCell>{getStatusBadge(notification.status)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {notification.status === 'sent' ? (
                      <span>{notification.sent_count} / {notification.total_recipients}</span>
                    ) : (
                      <span className="text-muted-foreground">Chưa gửi</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString('vi-VN')}
                  </div>
                  {notification.sent_at && (
                    <div className="text-xs text-muted-foreground">
                      Gửi: {new Date(notification.sent_at).toLocaleString('vi-VN')}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      {notification.status === 'pending' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => handleSend(notification.id)}
                            className="text-green-600"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Gửi ngay
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(notification.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Chưa có thông báo nào.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={notifications.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        itemLabel="thông báo"
      />
    </>
  );
}