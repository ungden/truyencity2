import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  MessageSquare,
  Calendar,
  Activity
} from 'lucide-react';
import { getDashboardStats } from '@/lib/actions';

export const dynamic = 'force-dynamic';

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  time: string;
  icon: any;
  status?: string;
}

async function DashboardContent() {
  const stats = await getDashboardStats();
  
  // Mock recent activity data
  const recentActivity: DashboardActivity[] = [
    {
      id: '1',
      type: 'novel',
      title: 'Truyện mới được tạo: "Kiếm Thần Truyền Kỳ"',
      time: '2 giờ trước',
      icon: BookOpen,
      status: 'success'
    },
    {
      id: '2',
      type: 'chapter',
      title: 'Chương 15 được thêm vào "Tu Tiên Đại Đạo"',
      time: '4 giờ trước',
      icon: Calendar,
      status: 'info'
    },
    {
      id: '3',
      type: 'comment',
      title: 'Bình luận mới cần duyệt',
      time: '6 giờ trước',
      icon: MessageSquare,
      status: 'warning'
    },
    {
      id: '4',
      type: 'user',
      title: 'Người dùng mới đăng ký',
      time: '1 ngày trước',
      icon: Users,
      status: 'success'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số truyện</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.novels}</div>
            <p className="text-xs text-muted-foreground">
              +2 từ tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số chương</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chapters}</div>
            <p className="text-xs text-muted-foreground">
              +12 từ tuần trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">
              +5 từ tuần trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bình luận</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.comments}</div>
            <p className="text-xs text-muted-foreground">
              +8 từ hôm qua
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Thống kê truy cập</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Biểu đồ thống kê sẽ được hiển thị ở đây
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity: DashboardActivity, index: number) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                      {activity.status && (
                        <Badge 
                          variant={
                            activity.status === 'success' ? 'default' :
                            activity.status === 'warning' ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {activity.status === 'success' ? 'Thành công' :
                           activity.status === 'warning' ? 'Cần xử lý' : 'Thông tin'}
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có hoạt động nào</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Truyện phổ biến</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tu Tiên Đại Đạo</span>
                <Badge variant="secondary">1.2K lượt đọc</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Kiếm Thần Truyền Kỳ</span>
                <Badge variant="secondary">980 lượt đọc</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Huyền Thiên Đế Tôn</span>
                <Badge variant="secondary">756 lượt đọc</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thống kê hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Lượt đọc mới</span>
                <span className="text-sm font-medium">+234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bình luận mới</span>
                <span className="text-sm font-medium">+12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Người dùng online</span>
                <span className="text-sm font-medium">45</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cần xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Bình luận chờ duyệt</span>
                <Badge variant="destructive">3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Báo cáo vi phạm</span>
                <Badge variant="destructive">1</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Yêu cầu hỗ trợ</span>
                <Badge variant="secondary">2</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Hệ thống hoạt động bình thường
          </Badge>
        </div>
      </div>
      
      <Suspense fallback={<div>Đang tải...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}