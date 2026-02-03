import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/admin/auth-guard';
import { Bell, Send, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { getNotifications, getNotificationStats } from '@/lib/actions';
import { NotificationTable } from '@/components/admin/notification-table';
import { NotificationPageClient } from '@/components/admin/notification-page-client';

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  const [stats, notifications] = await Promise.all([
    getNotificationStats(),
    getNotifications()
  ]);

  const statCards = [
    {
      title: 'Tổng thông báo',
      value: stats.total,
      description: 'Tất cả thông báo',
      icon: Bell,
      color: 'bg-blue-500'
    },
    {
      title: 'Đã gửi',
      value: stats.sent,
      description: 'Gửi thành công',
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Đang chờ',
      value: stats.pending,
      description: 'Chờ gửi',
      icon: Send,
      color: 'bg-orange-500'
    },
    {
      title: 'Thất bại',
      value: stats.failed,
      description: 'Gửi thất bại',
      icon: AlertCircle,
      color: 'bg-red-500'
    }
  ];

  return (
    <AuthGuard>
      <NotificationPageClient>
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-0 shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color} text-white shadow-lg`}>
                      <Icon size={16} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách thông báo</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationTable notifications={notifications} />
            </CardContent>
          </Card>
        </div>
      </NotificationPageClient>
    </AuthGuard>
  );
}