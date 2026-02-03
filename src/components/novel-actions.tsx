"use client";

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Share2, Loader2 } from 'lucide-react';
import { isBookmarked, toggleBookmarkServer } from '@/services/bookmarks';
import { resolveProgress } from '@/services/reading-progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NovelActionsProps {
  novelId: string;
}

export function NovelActions({ novelId }: NovelActionsProps) {
  const [isBookmarkedState, setIsBookmarkedState] = useState(false);
  const [continueChapter, setContinueChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [bookmarked, progress] = await Promise.all([
          isBookmarked(novelId),
          resolveProgress(novelId),
        ]);

        if (isMounted) {
          setIsBookmarkedState(bookmarked);
          setContinueChapter(progress?.chapterNumber || null);
        }
      } catch (error) {
        console.error("Failed to fetch novel actions state:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [novelId]);

  const handleBookmark = () => {
    // Optimistic update
    const previousState = isBookmarkedState;
    setIsBookmarkedState(!previousState);

    startTransition(async () => {
      try {
        const newBookmarkStatus = await toggleBookmarkServer(novelId);
        
        // Verify the optimistic update was correct
        if (newBookmarkStatus !== !previousState) {
          setIsBookmarkedState(newBookmarkStatus);
        }
        
        toast.success(newBookmarkStatus ? 'Đã thêm vào tủ truyện' : 'Đã xóa khỏi tủ truyện');
      } catch (error) {
        // Rollback on error
        setIsBookmarkedState(previousState);
        toast.error('Không thể cập nhật bookmark');
      }
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/novel/${novelId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chia sẻ truyện',
          url: url,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Đã sao chép link vào clipboard');
      } catch (error) {
        toast.error('Không thể sao chép link');
      }
    }
  };

  const readHref = `/novel/${novelId}/read/${continueChapter || 1}`;

  if (loading) {
    return (
      <div className="flex gap-3">
        <Button className="flex-1 h-12 rounded-xl font-medium" disabled>
          <Loader2 size={18} className="mr-2 animate-spin" />
          Đang tải...
        </Button>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" disabled>
          <Heart size={18} />
        </Button>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" disabled>
          <Share2 size={18} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button asChild className="flex-1 h-12 rounded-xl font-medium">
        <Link href={readHref}>
          <BookOpen size={18} className="mr-2" />
          {continueChapter ? 'Đọc tiếp' : 'Đọc ngay'}
        </Link>
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        className={cn(
          "h-12 w-12 rounded-xl transition-all duration-200",
          isBookmarkedState && "bg-red-50 border-red-200 hover:bg-red-100"
        )}
        onClick={handleBookmark}
        disabled={isPending}
      >
        <Heart 
          size={18} 
          className={cn(
            "transition-all duration-200",
            isBookmarkedState ? "fill-red-500 text-red-500 scale-110" : ""
          )} 
        />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        className="h-12 w-12 rounded-xl"
        onClick={handleShare}
      >
        <Share2 size={18} />
      </Button>
    </div>
  );
}