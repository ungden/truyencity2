"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NovelCard } from '@/components/novel-card';
import { Novel } from '@/lib/types';

interface LatestUpdatesCarouselProps {
  novels: Novel[];
}

function getChapterCount(novel: Novel): number {
  if (!novel.chapters || !novel.chapters.length) return 0;
  return novel.chapters[0]?.count || 0;
}

const ITEMS_PER_PAGE = 4;

export function LatestUpdatesCarousel({ novels }: LatestUpdatesCarouselProps) {
  const [pageIndex, setPageIndex] = useState(0);

  const totalPages = useMemo(
    () => Math.ceil(novels.length / ITEMS_PER_PAGE),
    [novels.length]
  );

  const visibleNovels = useMemo(
    () => novels.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE),
    [novels, pageIndex]
  );

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          disabled={!canPrev}
          onClick={() => setPageIndex(p => p - 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-muted-foreground">
          {pageIndex + 1}/{totalPages}
        </span>
        <button
          disabled={!canNext}
          onClick={() => setPageIndex(p => p + 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleNovels.map((novel: Novel) => (
          <NovelCard
            key={novel.id}
            id={novel.id}
            slug={novel.slug || undefined}
            title={novel.title}
            author={novel.author || 'N/A'}
            cover={novel.cover_url || ''}
            status={novel.status || 'Đang ra'}
            genre={novel.genres?.[0]}
            description={novel.description || ''}
            chapters={getChapterCount(novel)}
            variant="horizontal"
          />
        ))}
      </div>
    </div>
  );
}
