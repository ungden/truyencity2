"use client";

import React from 'react';
import Link from 'next/link';
import {
  Home,
  BookOpen,
  Settings,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReadingSettings from '@/components/reading-settings';
import { cn } from '@/lib/utils';

interface DesktopReadingHeaderProps {
  novelId: string;
  novelTitle: string;
  chapterTitle: string;
  currentChapter: number;
  totalChapters: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onBookmark: () => void;
  isBookmarked: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const DesktopReadingHeader: React.FC<DesktopReadingHeaderProps> = ({
  novelId,
  novelTitle,
  chapterTitle,
  currentChapter,
  totalChapters,
  onPrevChapter,
  onNextChapter,
  onBookmark,
  isBookmarked,
  isFullscreen,
  onToggleFullscreen
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-6">
      {/* Left: Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/">
            <Home size={16} />
            <span className="hidden xl:inline">Trang chủ</span>
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <Button variant="ghost" size="sm" asChild className="gap-2 max-w-[200px]">
          <Link href={`/novel/${novelId}`}>
            <BookOpen size={16} />
            <span className="truncate hidden xl:inline">{novelTitle}</span>
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate max-w-[200px]">
          Chương {currentChapter}
        </span>
      </div>

      {/* Center: Chapter Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevChapter}
          disabled={currentChapter <= 1}
          className="h-8"
        >
          <ChevronLeft size={16} className="mr-1" />
          <span className="hidden sm:inline">Chương trước</span>
        </Button>
        <div className="px-3 py-1 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {currentChapter} / {totalChapters}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextChapter}
          disabled={currentChapter >= totalChapters}
          className="h-8"
        >
          <span className="hidden sm:inline">Chương sau</span>
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBookmark}
          className="h-9 w-9"
        >
          <Bookmark
            size={18}
            className={isBookmarked ? "fill-primary text-primary" : ""}
          />
        </Button>

        <ReadingSettings buttonProps={{ variant: "ghost", size: "icon", className: "h-9 w-9" }} />

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="h-9 w-9"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>
      </div>
    </header>
  );
};
