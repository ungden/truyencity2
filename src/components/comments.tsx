"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  status: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
};

interface CommentsProps {
  novelId: string;
  chapterId?: string;
  className?: string;
}

export function Comments({ novelId, chapterId, className }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('comments')
        .select('id, user_id, content, created_at, parent_id, status, profiles:user_id(full_name, avatar_url)')
        .eq('novel_id', novelId)
        .eq('status', 'approved')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const mapped = data.map((c: any) => ({
          ...c,
          profile: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
        }));
        setComments(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId]);

  useEffect(() => {
    fetchComments(0);
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!content.trim() || !userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        user_id: userId,
        novel_id: novelId,
        chapter_id: chapterId || null,
        content: content.trim(),
        status: 'pending',
      });

      if (!error) {
        setContent('');
        // Show optimistic message
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchComments(next, true);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'Vừa xong';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} phút trước`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <MessageSquare size={20} />
        <h3 className="text-lg font-semibold">Bình luận</h3>
      </div>

      {/* Comment input */}
      {userId ? (
        <Card className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết bình luận..."
            className="w-full min-h-[80px] bg-transparent border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {content.length}/1000
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
            >
              {submitting ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Send size={14} className="mr-1" />
              )}
              Gửi
            </Button>
          </div>
          {submitting === false && content === '' && (
            <p className="text-xs text-muted-foreground mt-1">
              Bình luận sẽ hiển thị sau khi được duyệt.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">Đăng nhập</a> để bình luận.
        </Card>
      )}

      {/* Comments list */}
      {loading && comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {(c.profile?.full_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {c.profile?.full_name || 'Ẩn danh'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : 'Xem thêm bình luận'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
