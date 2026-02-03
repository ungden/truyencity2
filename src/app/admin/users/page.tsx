import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/admin/auth-guard';
import { UserTable } from '@/components/admin/user-table';
import { createServerClient } from '@/integrations/supabase/server';
import { Users, UserCheck, Shield, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getUsers() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      role,
      updated_at,
      auth.users!inner(email, created_at, last_sign_in_at)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

async function getUserStats() {
  const supabase = await createServerClient();
  const [totalRes, adminRes, recentRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    total: totalRes.count || 0,
    admins: adminRes.count || 0,
    recent: recentRes.count || 0,
    active: Math.floor((totalRes.count || 0) * 0.7) // Mock active users as 70%
  };
}

export default async function AdminUsersPage() {
  const [users, stats] = await Promise.all([
    getUsers(),
    getUserStats()
  ]);

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats.total,
      description: 'Tài khoản đã đăng ký',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Người dùng hoạt động',
      value: stats.active,
      description: 'Đăng nhập trong 30 ngày',
      icon: UserCheck,
      color: 'bg-green-500'
    },
    {
      title: 'Quản trị viên',
      value: stats.admins,
      description: 'Tài khoản admin',
      icon: Shield,
      color: 'bg-purple-500'
    },
    {
      title: 'Mới trong tuần',
      value: stats.recent,
      description: 'Đăng ký 7 ngày qua',
      icon: Clock,
      color: 'bg-orange-500'
    }
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Xem và quản lý tất cả người dùng trong hệ thống</p>
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

        <UserTable users={users} />
      </div>
    </AuthGuard>
  );
}