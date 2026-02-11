"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { NovelCard } from '@/components/novel-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { listBookmarks } from '@/services/bookmarks';

type ProgressRow = {
  novel_id: string;
  chapter_number: number;
  position_percent: number;
  last_read: string;
};

type NovelBrief = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
};

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState<Array<{ novel: NovelBrief; progress: number }>>([]);
  const [bookmarks, setBookmarks] = useState<Array<NovelBrief>>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setHistory([]);
      return;
    }
    const { data: progressRows } = await supabase
      .from('reading_progress')
      .select('novel_id, chapter_number, position_percent, last_read')
      .eq('user_id', userId)
      .order('last_read', { ascending: false });

    const rows: ProgressRow[] = progressRows || [];
    const novelIds = Array.from(new Set(rows.map(r => r.novel_id))).filter(Boolean);
    if (novelIds.length === 0) {
      setHistory([]);
      return;
    }

    const { data: novels } = await supabase
      .from('novels')
      .select('id, title, author, cover_url, status')
      .in('id', novelIds);

    const novelMap = new Map<string, NovelBrief>((novels || []).map(n => [n.id, n as NovelBrief]));
    const items = rows
      .map(r => {
        const novel = novelMap.get(r.novel_id);
        if (!novel) return null;
        return { novel, progress: Number(r.position_percent || 0) };
      })
      .filter(Boolean) as Array<{ novel: NovelBrief; progress: number }>;

    setHistory(items);
  };

  const fetchBookmarks = async () => {
    const items = await listBookmarks();
    setBookmarks(items.map(i => ({
      id: i.novel.id,
      title: i.novel.title,
      author: i.novel.author,
      cover_url: i.novel.cover_url,
      status: i.novel.status,
    })));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchHistory(), fetchBookmarks()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Tủ Truyện" showSearch={false} />
      
      <main className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
            <TabsTrigger value="bookmarks">Đánh dấu</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <NovelCard
                    key={item.novel.id}
                    id={item.novel.id}
                    title={item.novel.title}
                    author={item.novel.author || 'N/A'}
                    cover={item.novel.cover_url || ''}
                    rating={4.5}
                    views={1000}
                    status={item.novel.status || 'Đang ra'}
                    variant="horizontal"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Chưa có truyện nào trong lịch sử</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="bookmarks" className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
            ) : bookmarks.length > 0 ? (
              <div className="space-y-3">
                {bookmarks.map((novel) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    rating={4.5}
                    views={1000}
                    status={novel.status || 'Đang ra'}
                    variant="horizontal"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Chưa có truyện nào được đánh dấu</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
