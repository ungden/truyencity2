import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/admin/auth-guard';
import { MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getComments, getCommentStats } from '@/lib/actions';
import { CommentTable } from '@/components/admin/comment-table';

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
  const [stats, comments] = await Promise.all([
    getCommentStats(),
    getComments()
  ]);

  const statCards = [
    {
      title: 'Tổng bình luận',
      value: stats.total,
      description: 'Tất cả bình luận',
      icon: MessageSquare,
      color: 'bg-blue-500'
    },
    {
      title: 'Chờ duyệt',
      value: stats.pending,
      description: 'Cần xem xét',
      icon: Clock,
      color: 'bg-orange-500'
    },
    {
      title: 'Đã duyệt',
      value: stats.approved,
      description: 'Bình luận hợp lệ',
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Bị báo cáo',
      value: stats.flagged,
      description: 'Cần kiểm tra',
      icon: AlertTriangle,
      color: 'bg-red-500'
    }
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý bình luận</h1>
          <p className="text-muted-foreground">Xem và kiểm duyệt bình luận của người dùng</p>
        </div>

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

        <CommentTable comments={comments} />
      </div>
    </AuthGuard>
  );
}