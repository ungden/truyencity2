'use client';

import { useState, useCallback } from 'react';
import { ChapterTable } from './chapter-table';
import { Chapter } from '@/lib/types';
import { getChaptersByNovelId } from '@/lib/actions';

interface RefreshableNovelPageProps {
  novelId: string;
  initialChapters: Chapter[];
}

export function RefreshableNovelPage({ novelId, initialChapters }: RefreshableNovelPageProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshChapters = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const updatedChapters = await getChaptersByNovelId(novelId);
      setChapters(updatedChapters);

    } catch (error) {
      console.error('Error refreshing chapters:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [novelId]);

  return (
    <div className="relative">
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 bg-blue-50 border border-blue-200 rounded-md p-2 mb-4 z-10">
          <p className="text-sm text-blue-600">Đang cập nhật danh sách chương...</p>
        </div>
      )}
      <ChapterTable 
        novelId={novelId} 
        chapters={chapters} 
        onChapterDeleted={refreshChapters}
      />
    </div>
  );
}