"use client";

import React, { useEffect, useState } from 'react';
import { NovelCard } from '@/components/novel-card';
import { supabase } from '@/integrations/supabase/client';

interface RelatedNovelsProps {
  novelId: string;
  genres: string[];
  limit?: number;
  className?: string;
}

type NovelRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
};

export function RelatedNovels({ novelId, genres, limit = 6, className }: RelatedNovelsProps) {
  const [novels, setNovels] = useState<NovelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!genres.length) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,genres')
        .overlaps('genres', [genres[0]]) // Same main genre
        .neq('id', novelId)
        .not('cover_url', 'is', null)
        .limit(limit + 5); // fetch extra to filter

      if (!cancelled && data) {
        // Prefer novels sharing more genres
        const scored = data.map(n => ({
          ...n,
          overlap: (n.genres || []).filter((g: string) => genres.includes(g)).length,
        }));
        scored.sort((a, b) => b.overlap - a.overlap);
        setNovels(scored.slice(0, limit));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [novelId, genres, limit]);

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="aspect-[3/4] bg-muted rounded-xl" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (novels.length === 0) return null;

  return (
    <div className={className}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {novels.map(novel => (
          <NovelCard
            key={novel.id}
            id={novel.id}
            slug={novel.slug || undefined}
            title={novel.title}
            author={novel.author || 'N/A'}
            cover={novel.cover_url || ''}
            status={novel.status || 'Dang ra'}
            genre={novel.genres?.[0]}
          />
        ))}
      </div>
    </div>
  );
}
