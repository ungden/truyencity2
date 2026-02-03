'use server';

import { createServerClient } from '@/integrations/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { novelSchema, chapterSchema, authorSchema } from './types';

export async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getNovels() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('novels')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching novels:', error);
    return [];
  }

  return data || [];
}

export async function getNovelById(id: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('novels')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching novel:', error);
    return null;
  }

  return data;
}

export async function getChaptersByNovelId(novelId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .order('chapter_number', { ascending: true });

  if (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }

  return data || [];
}

export async function createNovel(values: z.infer<typeof novelSchema>) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để tạo truyện' };
  }

  // Lấy role để quyết định gán owner_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const ownerToSet = profile?.role === 'admin' && values.owner_id ? values.owner_id : user.id;

  // Bắt buộc phải có ai_author_id; không fallback
  const authorId = values.ai_author_id;
  if (!authorId) {
    return { error: 'Vui lòng chọn tác giả trước khi tạo truyện' };
  }

  // Tra cứu tên tác giả theo id để lưu kèm cho UI hiện tại
  const { data: selectedAuthor, error: authorErr } = await supabase
    .from('ai_authors')
    .select('name')
    .eq('id', authorId)
    .single();

  if (authorErr || !selectedAuthor?.name) {
    return { error: 'Không tìm thấy tác giả AI' };
  }

  const insertData = {
    ...values,
    ai_author_id: authorId,
    author: selectedAuthor.name,
    owner_id: ownerToSet,
    created_by: user.id, // giữ nguyên nếu cột đã tồn tại
  } as any;

  const { data, error } = await supabase
    .from('novels')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating novel:', error);
    return { error: 'Không thể tạo truyện' };
  }

  revalidatePath('/admin/novels');
  return { success: 'Tạo truyện thành công', data };
}

export async function updateNovel(id: string, values: z.infer<typeof novelSchema>) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để cập nhật truyện' };
  }

  // Chỉ admin mới được đổi owner_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Bắt buộc ai_author_id; không fallback
  const authorId = values.ai_author_id;
  if (!authorId) {
    return { error: 'Vui lòng chọn tác giả trước khi lưu' };
  }

  // Tra cứu tên tác giả theo id
  const { data: selectedAuthor, error: authorErr } = await supabase
    .from('ai_authors')
    .select('name')
    .eq('id', authorId)
    .single();

  if (authorErr || !selectedAuthor?.name) {
    return { error: 'Không tìm thấy tác giả AI' };
  }

  const updateValues = { 
    ...values, 
    ai_author_id: authorId,
    author: selectedAuthor.name
  } as any;

  if (profile?.role !== 'admin') {
    delete updateValues.owner_id;
  }

  const { error } = await supabase
    .from('novels')
    .update(updateValues)
    .eq('id', id);

  if (error) {
    console.error('Error updating novel:', error);
    return { error: 'Không thể cập nhật truyện' };
  }

  revalidatePath('/admin/novels');
  revalidatePath(`/admin/novels/${id}`);
  return { success: 'Cập nhật truyện thành công' };
}

export async function updateNovelCover(novelId: string, coverUrl: string) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để cập nhật ảnh bìa' };
  }

  const { error } = await supabase
    .from('novels')
    .update({ cover_url: coverUrl })
    .eq('id', novelId);

  if (error) {
    console.error('Error updating novel cover:', error);
    return { error: 'Không thể cập nhật ảnh bìa' };
  }

  revalidatePath(`/admin/novels/${novelId}`);
  return { success: 'Cập nhật ảnh bìa thành công' };
}

export async function deleteNovel(id: string) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để xóa truyện' };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Bạn không có quyền xóa truyện' };
  }

  const { error } = await supabase
    .from('novels')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting novel:', error);
    return { error: 'Không thể xóa truyện' };
  }

  revalidatePath('/admin/novels');
  return { success: 'Xóa truyện thành công' };
}

export async function createChapter(novelId: string, values: z.infer<typeof chapterSchema>) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để tạo chương' };
  }

  // Check if chapter number already exists
  const { data: existingChapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('novel_id', novelId)
    .eq('chapter_number', values.chapter_number)
    .single();

  if (existingChapter) {
    return { error: `Chương ${values.chapter_number} đã tồn tại` };
  }

  const { error } = await supabase
    .from('chapters')
    .insert({
      ...values,
      novel_id: novelId,
    });

  if (error) {
    console.error('Error creating chapter:', error);
    return { error: 'Không thể tạo chương' };
  }

  revalidatePath(`/admin/novels/${novelId}`);
  return { success: 'Tạo chương thành công' };
}

export async function updateChapter(id: string, novelId: string, values: z.infer<typeof chapterSchema>) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để cập nhật chương' };
  }

  // Check if chapter number already exists (excluding current chapter)
  const { data: existingChapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('novel_id', novelId)
    .eq('chapter_number', values.chapter_number)
    .neq('id', id)
    .single();

  if (existingChapter) {
    return { error: `Chương ${values.chapter_number} đã tồn tại` };
  }

  const { error } = await supabase
    .from('chapters')
    .update(values)
    .eq('id', id);

  if (error) {
    console.error('Error updating chapter:', error);
    return { error: 'Không thể cập nhật chương' };
  }

  revalidatePath(`/admin/novels/${novelId}`);
  return { success: 'Cập nhật chương thành công' };
}

export async function deleteChapter(id: string, novelId: string) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập để xóa chương' };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Bạn không có quyền xóa chương' };
  }

  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting chapter:', error);
    return { error: 'Không thể xóa chương' };
  }

  revalidatePath(`/admin/novels/${novelId}`);
  return { success: 'Xóa chương thành công' };
}

// Dashboard functions
export async function getDashboardStats() {
  const supabase = await createServerClient();
  
  const [novelsResult, chaptersResult, usersResult, commentsResult] = await Promise.all([
    supabase.from('novels').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true })
  ]);

  return {
    novels: novelsResult.count || 0,
    chapters: chaptersResult.count || 0,
    users: usersResult.count || 0,
    comments: commentsResult.count || 0
  };
}

// Comment functions
export async function getComments() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:user_id(first_name, last_name, email),
      chapters:chapter_id(title, chapter_number, novel_id),
      novels:chapters(novels(title))
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

export async function getCommentStats() {
  const supabase = await createServerClient();
  
  const [totalResult, pendingResult, approvedResult, flaggedResult] = await Promise.all([
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'flagged')
  ]);

  return {
    total: totalResult.count || 0,
    pending: pendingResult.count || 0,
    approved: approvedResult.count || 0,
    rejected: (totalResult.count || 0) - (pendingResult.count || 0) - (approvedResult.count || 0),
    flagged: flaggedResult.count || 0
  };
}

export async function updateCommentStatus(id: string, status: string) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('comments')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating comment status:', error);
    return { error: 'Không thể cập nhật trạng thái bình luận' };
  }

  revalidatePath('/admin/comments');
  return { success: 'Cập nhật trạng thái thành công' };
}

export async function deleteComment(id: string) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting comment:', error);
    return { error: 'Không thể xóa bình luận' };
  }

  revalidatePath('/admin/comments');
  return { success: 'Xóa bình luận thành công' };
}

// Database functions
export async function getDatabaseStats() {
  const supabase = await createServerClient();
  
  const tables = ['novels', 'chapters', 'profiles', 'comments', 'reading_progress'];
  const stats = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      return { table, count: count || 0 };
    })
  );

  return {
    tables: stats,
    totalRecords: stats.reduce((sum, stat) => sum + stat.count, 0),
    recentBackups: []
  };
}

// Notification functions
export async function getNotifications() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

export async function getNotificationStats() {
  const supabase = await createServerClient();
  
  const [totalResult, sentResult, pendingResult, failedResult] = await Promise.all([
    supabase.from('notifications').select('*', { count: 'exact', head: true }),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'failed')
  ]);

  return {
    total: totalResult.count || 0,
    sent: sentResult.count || 0,
    pending: pendingResult.count || 0,
    failed: failedResult.count || 0
  };
}

export async function createNotification(values: {
  title: string;
  message: string;
  type: string;
  target_users?: string[];
  novel_id?: string;
  chapter_id?: string;
}) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập' };
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Bạn không có quyền tạo thông báo' };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(values)
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return { error: 'Không thể tạo thông báo' };
  }

  revalidatePath('/admin/notifications');
  return { success: 'Tạo thông báo thành công', data };
}

export async function sendNotification(notificationId: string) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Bạn cần đăng nhập' };
  }

  // Get notification
  const { data: notification, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (notifError || !notification) {
    return { error: 'Không tìm thấy thông báo' };
  }

  // Get target users
  let targetUserIds: string[] = [];
  if (notification.target_users && notification.target_users.length > 0) {
    targetUserIds = notification.target_users;
  } else {
    // Send to all users
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id');
    targetUserIds = (allUsers || []).map(u => u.id);
  }

  // Create user_notifications records
  const userNotifications = targetUserIds.map(userId => ({
    user_id: userId,
    notification_id: notificationId,
  }));

  const { error: insertError } = await supabase
    .from('user_notifications')
    .insert(userNotifications);

  if (insertError) {
    console.error('Error creating user notifications:', insertError);
    return { error: 'Không thể gửi thông báo' };
  }

  // Update notification status
  const { error: updateError } = await supabase
    .from('notifications')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: targetUserIds.length,
      total_recipients: targetUserIds.length,
    })
    .eq('id', notificationId);

  if (updateError) {
    console.error('Error updating notification status:', updateError);
  }

  revalidatePath('/admin/notifications');
  return { success: `Đã gửi thông báo đến ${targetUserIds.length} người dùng` };
}

export async function deleteNotification(id: string) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting notification:', error);
    return { error: 'Không thể xóa thông báo' };
  }

  revalidatePath('/admin/notifications');
  return { success: 'Xóa thông báo thành công' };
}

// Author functions
export async function getAuthors() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('ai_authors')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching authors:', error);
    return [];
  }

  return data || [];
}

export async function createAuthor(values: any) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('ai_authors')
    .insert(values);

  if (error) {
    console.error('Error creating author:', error);
    return { error: 'Không thể tạo tác giả' };
  }

  revalidatePath('/admin/settings/authors');
  return { success: 'Tạo tác giả thành công' };
}

export async function updateAuthor(id: string, values: any) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('ai_authors')
    .update(values)
    .eq('id', id);

  if (error) {
    console.error('Error updating author:', error);
    return { error: 'Không thể cập nhật tác giả' };
  }

  revalidatePath('/admin/settings/authors');
  return { success: 'Cập nhật tác giả thành công' };
}

export async function deleteAuthor(id: string) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('ai_authors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting author:', error);
    return { error: 'Không thể xóa tác giả' };
  }

  revalidatePath('/admin/settings/authors');
  return { success: 'Xóa tác giả thành công' };
}

// User functions
export async function updateUserRole(userId: string, role: string) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return { error: 'Không thể cập nhật vai trò người dùng' };
  }

  revalidatePath('/admin/users');
  return { success: 'Cập nhật vai trò thành công' };
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}