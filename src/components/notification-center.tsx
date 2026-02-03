"use client";

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  BookOpen,
  TrendingUp,
  Settings,
  Sparkles,
  Heart,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount,
  type UserNotification 
} from '@/services/notifications';
import { toast } from 'sonner';
import Link from 'next/link';

const notificationSettings = [
  {
    id: 'new-chapters',
    label: 'Chương mới',
    description: 'Thông báo khi có chương mới của truyện đã theo dõi',
    enabled: true,
    icon: BookOpen
  },
  {
    id: 'recommendations',
    label: 'Đề xuất truyện',
    description: 'Nhận đề xuất truyện phù hợp với sở thích',
    enabled: true,
    icon: Sparkles
  },
  {
    id: 'trending',
    label: 'Xu hướng',
    description: 'Thông báo về truyện đang thịnh hành',
    enabled: false,
    icon: TrendingUp
  },
  {
    id: 'reviews',
    label: 'Đánh giá',
    description: 'Thông báo khi có đánh giá mới cho truyện yêu thích',
    enabled: true,
    icon: Heart
  }
];

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState(notificationSettings);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getUserNotifications(),
        getUnreadCount()
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await fetchNotifications();
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      toast.error('Không thể đánh dấu tất cả');
    }
  };

  const handleSettingToggle = (settingId: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, enabled: !setting.enabled }
        : setting
    ));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chapter': return BookOpen;
      case 'system': return Settings;
      case 'announcement': return Sparkles;
      case 'update': return TrendingUp;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'chapter': return 'bg-blue-600';
      case 'system': return 'bg-gray-600';
      case 'announcement': return 'bg-purple-600';
      case 'update': return 'bg-green-600';
      default: return 'bg-foreground';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  };

  const unreadNotifications = notifications.filter(n => !n.read_at);
  const readNotifications = notifications.filter(n => n.read_at);

  const NotificationItem = ({ userNotif }: { userNotif: UserNotification }) => {
    const notif = userNotif.notification;
    const Icon = getNotificationIcon(notif.type);
    const isUnread = !userNotif.read_at;
    
    const notificationLink = notif.novel_id 
      ? `/novel/${notif.novel_id}${notif.chapter_id ? `/read/${notif.chapter_id}` : ''}`
      : null;

    const content = (
      <Card className={cn(
        "p-3 transition-colors border rounded-xl",
        isUnread ? 'bg-accent border-l-2 border-l-primary' : 'bg-card'
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg text-white flex-shrink-0",
            getNotificationColor(notif.type)
          )}>
            <Icon size={18} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  {notif.title}
                  {isUnread && (
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {notif.message}
                </p>
              </div>
              
              {isUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    handleMarkAsRead(notif.id);
                  }}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              {getTimeAgo(userNotif.created_at)}
            </p>
          </div>
        </div>
      </Card>
    );

    if (notificationLink) {
      return <Link href={notificationLink}>{content}</Link>;
    }

    return content;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative rounded-full h-10 w-10 p-0">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 p-0 text-xs rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md bg-background">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell size={20} />
            Thông báo
          </SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted rounded-lg p-1">
            <TabsTrigger value="notifications" className="rounded-md data-[state=active]:bg-background transition-colors">
              <div className="flex items-center gap-2">
                Thông báo
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 p-0 text-xs bg-primary text-primary-foreground rounded-full">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-md data-[state=active]:bg-background transition-colors">
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Cài đặt
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications" className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {unreadNotifications.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {unreadNotifications.length} thông báo mới
                    </p>
                    <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-sm h-8">
                      Đọc tất cả
                    </Button>
                  </div>
                )}
                
                {unreadNotifications.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Chưa đọc
                    </h3>
                    {unreadNotifications.map((userNotif) => (
                      <NotificationItem key={userNotif.id} userNotif={userNotif} />
                    ))}
                  </div>
                )}
                
                {readNotifications.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      Đã đọc
                    </h3>
                    {readNotifications.map((userNotif) => (
                      <NotificationItem key={userNotif.id} userNotif={userNotif} />
                    ))}
                  </div>
                )}
                
                {notifications.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Bell size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Chưa có thông báo nào</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6 space-y-3">
            {settings.map((setting) => {
              const Icon = setting.icon;
              return (
                <Card key={setting.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{setting.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={() => handleSettingToggle(setting.id)}
                    />
                  </div>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};