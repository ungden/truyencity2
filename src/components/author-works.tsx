"use client";

import React, { useEffect, useState } from 'react';
import { NovelCard } from '@/components/novel-card';
import { supabase } from '@/integrations/supabase/client';

interface AuthorWorksProps {
  novelId: string;
  authorName: string;
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

export function AuthorWorks({ novelId, authorName, limit = 6, className }: AuthorWorksProps) {
  const [novels, setNovels] = useState<NovelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authorName) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,genres')
        .eq('author', authorName)
        .neq('id', novelId)
        .limit(limit);

      if (!cancelled) {
        setNovels(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [novelId, authorName, limit]);

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
            status={novel.status || 'Đang ra'}
            genre={novel.genres?.[0]}
          />
        ))}
      </div>
    </div>
  );
}
