import React from 'react';
import { NovelCard } from '@/components/novel-card';

export type RelatedNovelRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
};

interface RelatedNovelsProps {
  novels: RelatedNovelRow[];
  className?: string;
}

export function RelatedNovels({ novels, className }: RelatedNovelsProps) {
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
