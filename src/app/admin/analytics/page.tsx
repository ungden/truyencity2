import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/admin/auth-guard';
import {
  TrendingUp,
  Users,
  BookOpen,
  Eye,
  Clock,
  Star,
  Activity,
  BarChart3
} from 'lucide-react';
import { createServerClient } from '@/integrations/supabase/server';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const supabase = await createServerClient();

  // Fetch analytics data
  const [
    { count: totalNovels },
    { count: totalChapters },
    { count: totalUsers },
    { data: recentSessions },
    { data: topNovels },
    { data: recentActivity }
  ] = await Promise.all([
    supabase.from('novels').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('reading_sessions')
      .select('duration_seconds, started_at')
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false })
      .limit(1000),
    supabase
      .from('novels')
      .select('id, title, author, view_count')
      .order('view_count', { ascending: false })
      .limit(10),
    supabase
      .from('reading_sessions')
      .select('*, novel:novels(title)')
      .order('started_at', { ascending: false })
      .limit(20)
  ]);

  // Calculate statistics
  const totalReadingTime = (recentSessions || []).reduce(
    (sum, session) => sum + (session.duration_seconds || 0),
    0
  );
  const avgSessionTime = recentSessions && recentSessions.length > 0
    ? Math.floor(totalReadingTime / recentSessions.length)
    : 0;

  const statCards = [
    {
      title: 'Tổng truyện',
      value: totalNovels || 0,
      description: 'Truyện đang có',
      icon: BookOpen,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: 'Tổng chương',
      value: totalChapters || 0,
      description: 'Chương đã xuất bản',
      icon: BarChart3,
      color: 'bg-green-500',
      trend: '+8%'
    },
    {
      title: 'Người dùng',
      value: totalUsers || 0,
      description: 'Tài khoản đăng ký',
      icon: Users,
      color: 'bg-purple-500',
      trend: '+23%'
    },
    {
      title: 'Thời gian đọc TB',
      value: `${Math.floor(avgSessionTime / 60)}p`,
      description: 'Mỗi phiên đọc',
      icon: Clock,
      color: 'bg-orange-500',
      trend: '+5%'
    }
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Phân tích & Thống kê</h1>
          <p className="text-muted-foreground">Tổng quan về hoạt động của nền tảng</p>
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600 font-medium">{stat.trend}</span>
                    <span className="text-xs text-muted-foreground">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <AnalyticsCharts 
          recentSessions={recentSessions || []}
          topNovels={topNovels || []}
        />

        {/* Top Novels Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Top 10 truyện được đọc nhiều nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topNovels || []).map((novel, index) => (
                <div 
                  key={novel.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500 text-white' : 
                        index === 1 ? 'bg-gray-400 text-white' : 
                        index === 2 ? 'bg-orange-600 text-white' : 
                        'bg-gray-200 text-gray-600'}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{novel.title}</h4>
                      <p className="text-sm text-muted-foreground">{novel.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-muted-foreground" />
                    <span className="font-medium">{novel.view_count?.toLocaleString() || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={20} />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(recentActivity || []).slice(0, 10).map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BookOpen size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{session.novel?.title || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.floor((session.duration_seconds || 0) / 60)} phút đọc
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.started_at).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}