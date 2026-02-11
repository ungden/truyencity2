"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  BookOpen, 
  Heart, 
  Clock, 
  Settings, 
  Bell, 
  Download,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import StatsTile from '@/components/profile/stats-tile';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const menuItems = [
  {
    icon: Settings,
    label: 'Cài đặt',
    description: 'Tùy chỉnh ứng dụng',
    action: 'settings'
  },
  {
    icon: Bell,
    label: 'Thông báo',
    description: 'Quản lý thông báo',
    action: 'notifications'
  },
  {
    icon: Download,
    label: 'Tải xuống',
    description: 'Quản lý truyện đã tải',
    action: 'downloads'
  },
  {
    icon: Moon,
    label: 'Chế độ tối',
    description: 'Bật/tắt chế độ tối',
    action: 'theme'
  },
  {
    icon: HelpCircle,
    label: 'Trợ giúp',
    description: 'Hướng dẫn sử dụng',
    action: 'help'
  }
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [chaptersRead, setChaptersRead] = useState<number>(0);
  const [bookmarksCount, setBookmarksCount] = useState<number>(0);
  const [readingCount, setReadingCount] = useState<number>(0);
  const [, setCompletedCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (cancelled) return;
        if (profileData) setProfile(profileData);

        // Fetch stats in parallel
        const [
          sessionsRes,
          chapterReadsCountRes,
          bookmarksCountRes,
          readingRes,
          completedRes
        ] = await Promise.all([
          supabase.from('reading_sessions').select('duration_seconds').eq('user_id', user.id),
          supabase.from('chapter_reads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('reading_progress').select('novel_id, position_percent').eq('user_id', user.id).gt('position_percent', 0).lt('position_percent', 100),
          supabase.from('reading_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('position_percent', 100),
        ]);

        if (cancelled) return;

        const sumSeconds = (sessionsRes.data || []).reduce((acc, r: any) => acc + (Number(r.duration_seconds) || 0), 0);
        setTotalSeconds(sumSeconds);
        setChaptersRead(chapterReadsCountRes.count || 0);
        setBookmarksCount(bookmarksCountRes.count || 0);
        setReadingCount((readingRes.data || []).map((r: any) => r.novel_id).filter(Boolean).length);
        setCompletedCount(completedRes.count || 0);
      } else {
        if (!cancelled) router.push('/login');
      }
      if (!cancelled) setLoading(false);
    };

    getUserData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleMenuClick = (action: string) => {
    if (action === 'logout') {
      handleLogout();
    } else if (action === 'admin') {
      router.push('/admin');
    } else {
      // noop
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Tài Khoản" showSearch={false} />
      
      <main className="px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>
                <User size={24} />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{user.user_metadata?.full_name || 'Độc giả'}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-muted-foreground text-xs mt-1">
                Tham gia từ {new Date(user.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
            
            <Button variant="outline" size="sm">
              Chỉnh sửa
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {profile?.role === 'admin' && (
              <Badge variant="default">Admin</Badge>
            )}
            <Badge variant="secondary">
              Tiên Hiệp
            </Badge>
            <Badge variant="outline">
              Độc giả thường xuyên
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Thống kê đọc truyện</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatsTile
              icon={<Clock size={18} />}
              value={formatDuration(totalSeconds)}
              label="Thời gian đọc"
            />
            <StatsTile
              icon={<BookOpen size={18} />}
              value={chaptersRead}
              label="Chương đã đọc"
            />
            <StatsTile
              icon={<BookOpen size={18} />}
              value={readingCount}
              label="Đang đọc"
            />
            <StatsTile
              icon={<Heart size={18} />}
              value={bookmarksCount}
              label="Đánh dấu"
            />
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Cài đặt & Tiện ích</h3>
          <div className="space-y-2">
            {profile?.role === 'admin' && (
              <button
                onClick={() => handleMenuClick('admin')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
              >
                <Shield size={20} className="text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-primary">Bảng quản trị</div>
                  <div className="text-sm text-muted-foreground">Quản lý dự án</div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.action}
                  onClick={() => handleMenuClick(item.action)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <Icon size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => handleMenuClick('logout')}
          >
            <LogOut size={16} className="mr-2" />
            Đăng xuất
          </Button>
        </Card>
      </main>
    </div>
  );
}
