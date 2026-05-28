import React from 'react';
import { NovelCard } from '@/components/novel-card';
import type { RelatedNovelRow } from '@/components/related-novels';

interface AuthorWorksProps {
  novels: RelatedNovelRow[];
  className?: string;
}

export function AuthorWorks({ novels, className }: AuthorWorksProps) {
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
