"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StarDisplay } from '@/components/star-rating';
import { Crown, TrendingUp, Star, BookOpen, Eye, Heart, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { getGenreLabel } from '@/lib/utils/genre';
import { AppContainer } from '@/components/layout';

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

type RankedNovel = NovelWithChapters & {
  rank: number;
  genre: string | null;
  chapterCount: number;
  viewCount?: number;
  ratingAvg?: number;
  ratingCount?: number;
  bookmarkCount?: number;
};

const RankingCard = ({
  novel,
  metric,
  onClick
}: {
  novel: RankedNovel;
  metric?: React.ReactNode;
  onClick?: () => void;
}) => {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center"><Crown className="text-yellow-500" size={18} /></div>;
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gray-400/20 flex items-center justify-center"><Crown className="text-gray-400" size={18} /></div>;
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center"><Crown className="text-amber-600" size={18} /></div>;
    return <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><span className="text-sm font-bold text-muted-foreground">{rank}</span></div>;
  };

  return (
    <div
      className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-shrink-0">
        {getRankDisplay(novel.rank)}
      </div>

      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <div className="relative w-full h-full">
          <Image
            src={novel.cover_url || '/placeholder.svg'}
            alt={novel.title}
            fill
            sizes="56px"
            quality={65}
            className="object-cover"
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-1 mb-1">{novel.title}</h3>
        <p className="text-muted-foreground text-xs mb-2">{novel.author || 'N/A'}</p>

        <div className="flex items-center gap-3 flex-wrap">
          {novel.genre && (
            <Badge variant="secondary" className="text-xs">
              {getGenreLabel(novel.genre)}
            </Badge>
          )}
          {metric}
        </div>
      </div>

      <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:flex">
        {novel.status || 'Dang ra'}
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
  if (mins < 60) return `${mins} phut truoc`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} gio truoc`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngay truoc`;
  return `${Math.floor(days / 7)} tuan truoc`;
}

type TabKey = 'hot' | 'rating' | 'updated' | 'chapters' | 'bookmarks';

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode; title: string }[] = [
  { key: 'hot', label: 'Hot', icon: <TrendingUp size={14} />, title: 'Top luot doc 7 ngay' },
  { key: 'rating', label: 'Danh gia', icon: <Star size={14} />, title: 'Danh gia cao nhat' },
  { key: 'updated', label: 'Moi cap nhat', icon: <Clock size={14} />, title: 'Moi cap nhat' },
  { key: 'chapters', label: 'Nhieu chuong', icon: <BookOpen size={14} />, title: 'Nhieu chuong nhat' },
  { key: 'bookmarks', label: 'Yeu thich', icon: <Heart size={14} />, title: 'Yeu thich nhat' },
];

export default function RankingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('hot');
  const [novels, setNovels] = useState<NovelWithChapters[]>([]);
  const [rankedNovels, setRankedNovels] = useState<RankedNovel[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch base novel data once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,genres,created_at,updated_at,chapters(count)')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (!cancelled) {
        setNovels((data as NovelWithChapters[] | null) || []);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Compute rankings when tab changes or data loads
  const computeRankings = useCallback(async () => {
    if (novels.length === 0) return;
    setLoading(true);

    const getChapterCount = (n: NovelWithChapters) => n.chapters?.[0]?.count || 0;
    const novelMap = new Map(novels.map(n => [n.id, n]));

    let ranked: RankedNovel[] = [];

    switch (activeTab) {
      case 'hot': {
        // Try to use RPC, fallback to chapter_reads count
        const { data: viewData } = await supabase.rpc('get_top_novels_by_views', { p_days: 7, p_limit: 50 });
        if (viewData && viewData.length > 0) {
          ranked = viewData
            .filter((v: { novel_id: string; view_count: number }) => novelMap.has(v.novel_id))
            .map((v: { novel_id: string; view_count: number }, idx: number) => {
              const n = novelMap.get(v.novel_id)!;
              return { ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n), viewCount: Number(v.view_count) };
            });
        }
        // Fallback if RPC not available yet
        if (ranked.length === 0) {
          ranked = [...novels]
            .sort((a, b) => getChapterCount(b) - getChapterCount(a))
            .slice(0, 50)
            .map((n, idx) => ({ ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n) }));
        }
        break;
      }
      case 'rating': {
        const { data: ratingData } = await supabase.rpc('get_top_novels_by_rating', { p_min_ratings: 1, p_limit: 50 });
        if (ratingData && ratingData.length > 0) {
          ranked = ratingData
            .filter((r: { novel_id: string; rating_avg: number; rating_count: number }) => novelMap.has(r.novel_id))
            .map((r: { novel_id: string; rating_avg: number; rating_count: number }, idx: number) => {
              const n = novelMap.get(r.novel_id)!;
              return { ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n), ratingAvg: r.rating_avg, ratingCount: Number(r.rating_count) };
            });
        }
        // Fallback: sort by chapters (proxy)
        if (ranked.length === 0) {
          ranked = [...novels]
            .filter(n => n.cover_url)
            .sort((a, b) => getChapterCount(b) - getChapterCount(a))
            .slice(0, 50)
            .map((n, idx) => ({ ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n) }));
        }
        break;
      }
      case 'updated': {
        ranked = [...novels]
          .filter(n => getChapterCount(n) > 0)
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 50)
          .map((n, idx) => ({ ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n) }));
        break;
      }
      case 'chapters': {
        ranked = [...novels]
          .sort((a, b) => getChapterCount(b) - getChapterCount(a))
          .slice(0, 50)
          .map((n, idx) => ({ ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n) }));
        break;
      }
      case 'bookmarks': {
        const { data: bmData } = await supabase.rpc('get_top_novels_by_bookmarks', { p_limit: 50 });
        if (bmData && bmData.length > 0) {
          ranked = bmData
            .filter((b: { novel_id: string; bookmark_count: number }) => novelMap.has(b.novel_id))
            .map((b: { novel_id: string; bookmark_count: number }, idx: number) => {
              const n = novelMap.get(b.novel_id)!;
              return { ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n), bookmarkCount: Number(b.bookmark_count) };
            });
        }
        if (ranked.length === 0) {
          ranked = [...novels]
            .sort((a, b) => getChapterCount(b) - getChapterCount(a))
            .slice(0, 50)
            .map((n, idx) => ({ ...n, rank: idx + 1, genre: n.genres?.[0] || null, chapterCount: getChapterCount(n) }));
        }
        break;
      }
    }

    setRankedNovels(ranked);
    setLoading(false);
  }, [activeTab, novels]);

  useEffect(() => {
    computeRankings();
  }, [computeRankings]);

  const handleNovelClick = (novelSlug: string | null, novelId: string) => {
    router.push(novelSlug ? `/truyen/${novelSlug}` : `/novel/${novelId}`);
  };

  const activeConfig = TAB_CONFIG.find(t => t.key === activeTab)!;

  const getMetric = (novel: RankedNovel) => {
    switch (activeTab) {
      case 'hot':
        return novel.viewCount ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye size={10} /> {novel.viewCount.toLocaleString('vi-VN')} luot doc
          </span>
        ) : (
          <Badge variant="secondary" className="text-xs">
            <BookOpen size={10} className="mr-1" />
            {novel.chapterCount} chuong
          </Badge>
        );
      case 'rating':
        return novel.ratingAvg ? (
          <StarDisplay rating={novel.ratingAvg} count={novel.ratingCount} size="sm" />
        ) : (
          <Badge variant="secondary" className="text-xs">
            <BookOpen size={10} className="mr-1" />
            {novel.chapterCount} chuong
          </Badge>
        );
      case 'updated':
        return (
          <span className="text-xs text-muted-foreground">
            {timeAgo(novel.updated_at)} · {novel.chapterCount} chuong
          </span>
        );
      case 'chapters':
        return (
          <Badge variant="secondary" className="text-xs">
            <BookOpen size={10} className="mr-1" />
            {novel.chapterCount} chuong
          </Badge>
        );
      case 'bookmarks':
        return novel.bookmarkCount ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Heart size={10} /> {novel.bookmarkCount.toLocaleString('vi-VN')} yeu thich
          </span>
        ) : (
          <Badge variant="secondary" className="text-xs">
            <BookOpen size={10} className="mr-1" />
            {novel.chapterCount} chuong
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Xep Hang" showSearch={false} />

      <AppContainer className="py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            {TAB_CONFIG.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-1.5 text-xs sm:text-sm">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">{activeConfig.title}</h2>
            <Badge variant="outline" className="text-xs">Top 50</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="w-14 h-20 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : rankedNovels.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Chua co du lieu xep hang</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankedNovels.map((novel) => (
                <RankingCard
                  key={novel.id}
                  novel={novel}
                  metric={getMetric(novel)}
                  onClick={() => handleNovelClick(novel.slug, novel.id)}
                />
              ))}
            </div>
          )}
        </Tabs>
      </AppContainer>
    </div>
  );
}
