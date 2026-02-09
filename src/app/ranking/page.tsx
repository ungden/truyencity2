"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Crown, TrendingUp, Star, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { getGenreLabel } from '@/lib/utils/genre';

type NovelWithChapters = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
  created_at: string;
  updated_at: string | null;
  chapters: { count: number }[];
};

const RankingCard = ({ 
  novel, 
  metric,
  onClick 
}: { 
  novel: any; 
  metric?: React.ReactNode;
  onClick?: () => void; 
}) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-500" size={20} />;
    if (rank === 2) return <Crown className="text-gray-400" size={20} />;
    if (rank === 3) return <Crown className="text-amber-600" size={20} />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-8 flex justify-center">
        {getRankIcon(novel.rank)}
      </div>
      
      <div className="w-16 h-20 rounded-md overflow-hidden flex-shrink-0">
        <img 
          src={novel.cover_url || '/placeholder.svg'}
          alt={novel.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{novel.title}</h3>
        <p className="text-muted-foreground text-xs mb-2">{novel.author || 'N/A'}</p>
        
        <div className="flex items-center gap-3">
          {novel.genre && (
            <Badge variant="secondary" className="text-xs">
              {getGenreLabel(novel.genre)}
            </Badge>
          )}
          {metric}
        </div>
      </div>
      
      <Badge variant="outline" className="text-xs flex-shrink-0">
        {novel.status || 'Đang ra'}
      </Badge>
    </div>
  );
};

// Format relative time in Vietnamese
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return `${Math.floor(days / 7)} tuần trước`;
}

export default function RankingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('popular');
  const [novels, setNovels] = useState<NovelWithChapters[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,genres,created_at,updated_at,chapters(count)')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!cancelled) {
        setNovels((data as NovelWithChapters[] | null) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getChapterCount = (n: NovelWithChapters) => n.chapters?.[0]?.count || 0;

  // Popular = most chapters (proxy for most read)
  const popularNovels = [...novels]
    .sort((a, b) => getChapterCount(b) - getChapterCount(a))
    .slice(0, 20)
    .map((n, idx) => ({
      ...n,
      genre: n.genres?.[0] || null,
      rank: idx + 1,
      chapterCount: getChapterCount(n),
    }));

  // Trending = most recently updated (active writing)
  const trendingNovels = [...novels]
    .filter(n => getChapterCount(n) > 0) // only novels with content
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 20)
    .map((n, idx) => ({
      ...n,
      genre: n.genres?.[0] || null,
      rank: idx + 1,
      chapterCount: getChapterCount(n),
    }));

  // "Top Rated" = most chapters among novels with covers (quality proxy)
  const ratedNovels = [...novels]
    .filter(n => n.cover_url)
    .sort((a, b) => getChapterCount(b) - getChapterCount(a))
    .slice(0, 20)
    .map((n, idx) => ({
      ...n,
      genre: n.genres?.[0] || null,
      rank: idx + 1,
      chapterCount: getChapterCount(n),
    }));

  const handleNovelClick = (novelSlug: string | null, novelId: string) => {
    router.push(novelSlug ? `/truyen/${novelSlug}` : `/novel/${novelId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Xếp Hạng" showSearch={false} />
      
      <main className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="popular">Nhiều chương</TabsTrigger>
            <TabsTrigger value="trending">Mới cập nhật</TabsTrigger>
            <TabsTrigger value="rating">Có bìa đẹp</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="text-yellow-500" size={20} />
              <h2 className="text-lg font-semibold">Top truyện nhiều chương nhất</h2>
            </div>
            {loading && <p className="text-muted-foreground text-sm">Đang tải...</p>}
            {popularNovels.map((novel) => (
              <RankingCard 
                key={novel.id} 
                novel={novel}
                metric={
                  <Badge variant="secondary" className="text-xs">
                    <BookOpen size={10} className="mr-1" />
                    {novel.chapterCount} chương
                  </Badge>
                }
                onClick={() => handleNovelClick(novel.slug, novel.id)}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="trending" className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-500" size={20} />
              <h2 className="text-lg font-semibold">Đang cập nhật</h2>
            </div>
            {loading && <p className="text-muted-foreground text-sm">Đang tải...</p>}
            {trendingNovels.map((novel) => (
              <RankingCard 
                key={novel.id} 
                novel={novel}
                metric={
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(novel.updated_at)} · {novel.chapterCount} chương
                  </span>
                }
                onClick={() => handleNovelClick(novel.slug, novel.id)}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="rating" className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-yellow-500 fill-current" size={20} />
              <h2 className="text-lg font-semibold">Truyện có bìa đẹp nhất</h2>
            </div>
            {loading && <p className="text-muted-foreground text-sm">Đang tải...</p>}
            {ratedNovels.map((novel) => (
              <RankingCard 
                key={novel.id} 
                novel={novel}
                metric={
                  <Badge variant="secondary" className="text-xs">
                    <BookOpen size={10} className="mr-1" />
                    {novel.chapterCount} chương
                  </Badge>
                }
                onClick={() => handleNovelClick(novel.slug, novel.id)}
              />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
