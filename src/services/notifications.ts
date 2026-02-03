"use client";

import { supabase } from "@/integrations/supabase/client";

export type UserNotification = {
  id: string;
  notification_id: string;
  read_at: string | null;
  created_at: string;
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    novel_id?: string;
    chapter_id?: string;
  };
};

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getUserNotifications(): Promise<UserNotification[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_notifications')
    .select(`
      *,
      notification:notifications(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []) as UserNotification[];
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('notification_id', notificationId)
    .is('read_at', null);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function getUnreadCount(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}