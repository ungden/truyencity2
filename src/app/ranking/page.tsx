"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Crown, TrendingUp, Eye, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';

type NovelRow = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
  created_at: string;
};

const RankingCard = ({ 
  novel, 
  showTrend = false, 
  onClick 
}: { 
  novel: any; 
  showTrend?: boolean; 
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
      className="flex items-center gap-4 p-4 bg-card rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
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
              {novel.genre}
            </Badge>
          )}
          {showTrend && novel.trend && (
            <Badge variant="secondary" className="text-xs text-green-600">
              <TrendingUp size={10} className="mr-1" />
              {novel.trend}
            </Badge>
          )}
        </div>
      </div>
      
      <Badge variant="outline" className="text-xs">
        {novel.status || 'Đang ra'}
      </Badge>
    </div>
  );
};

export default function RankingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('popular');
  const [novels, setNovels] = useState<NovelRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('novels')
        .select('id,title,author,cover_url,status,genres,created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!cancelled) setNovels(data || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const topNovels = novels.slice(0, 10).map((n, idx) => ({
    ...n,
    genre: n.genres?.[0] || null,
    rank: idx + 1
  }));

  const trendingNovels = novels.slice(0, 10).map((n, idx) => ({
    ...n,
    genre: n.genres?.[0] || null,
    rank: idx + 1,
    trend: `+${(10 - idx)}%`
  }));

  const ratingNovels = novels.slice(0, 10).map((n, idx) => ({
    ...n,
    genre: n.genres?.[0] || null,
    rank: idx + 1
  }));

  const handleNovelClick = (novelId: string) => {
    router.push(`/novel/${novelId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Xếp Hạng" showSearch={false} />
      
      <main className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="popular">Phổ biến</TabsTrigger>
            <TabsTrigger value="trending">Thịnh hành</TabsTrigger>
            <TabsTrigger value="rating">Đánh giá</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="text-yellow-500" size={20} />
              <h2 className="text-lg font-semibold">Top truyện phổ biến</h2>
            </div>
            {topNovels.map((novel) => (
              <RankingCard 
                key={novel.id} 
                novel={novel}
                onClick={() => handleNovelClick(novel.id)}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="trending" className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-500" size={20} />
              <h2 className="text-lg font-semibold">Đang thịnh hành</h2>
            </div>
            {trendingNovels.map((novel) => (
              <RankingCard 
                key={novel.id} 
                novel={novel}
                showTrend={true}
                onClick={() => handleNovelClick(novel.id)}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="rating" className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-yellow-500 fill-current" size={20} />
              <h2 className="text-lg font-semibold">Đánh giá cao nhất</h2>
            </div>
            {ratingNovels.map((novel) => (
              <RankingCard 
                key={novel.id} 
                novel={novel}
                onClick={() => handleNovelClick(novel.id)}
              />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
