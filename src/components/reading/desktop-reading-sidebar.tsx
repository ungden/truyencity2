"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  List,
  Home,
  BookOpen,
  Search,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
}

interface DesktopReadingSidebarProps {
  novelId: string;
  novelTitle: string;
  currentChapter: number;
  totalChapters: number;
  chapters: Chapter[];
  onChapterSelect: (chapter: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}

export const DesktopReadingSidebar: React.FC<DesktopReadingSidebarProps> = ({
  novelId,
  novelTitle,
  currentChapter,
  totalChapters,
  chapters,
  onChapterSelect,
  onPrevChapter,
  onNextChapter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentChapterRef = useRef<HTMLButtonElement>(null);

  // Filter chapters based on search
  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.chapterNumber.toString().includes(searchQuery)
  );

  // Scroll to current chapter on mount
  useEffect(() => {
    if (currentChapterRef.current) {
      currentChapterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentChapter]);

  if (isCollapsed) {
    return (
      <div className="w-12 h-screen sticky top-0 bg-card border-r border-border flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight size={18} />
        </Button>
        <div className="flex-1 flex flex-col items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <Home size={18} />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/novel/${novelId}`}>
              <BookOpen size={18} />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevChapter}
            disabled={currentChapter <= 1}
          >
            <ChevronUp size={18} />
          </Button>
          <span className="text-xs font-medium">{currentChapter}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextChapter}
            disabled={currentChapter >= totalChapters}
          >
            <ChevronDown size={18} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-screen sticky top-0 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/novel/${novelId}`}
            className="flex-1 min-w-0"
          >
            <h2 className="font-semibold text-sm truncate hover:text-primary transition-colors">
              {novelTitle}
            </h2>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8 ml-2"
          >
            <ChevronLeft size={16} />
          </Button>
        </div>

        {/* Quick Navigation */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" asChild className="flex-1 h-8 text-xs">
            <Link href="/">
              <Home size={14} className="mr-1" />
              Trang chủ
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="flex-1 h-8 text-xs">
            <Link href={`/novel/${novelId}`}>
              <BookOpen size={14} className="mr-1" />
              Chi tiết
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm chương..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Chapter Navigation */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevChapter}
          disabled={currentChapter <= 1}
          className="h-8"
        >
          <ChevronLeft size={14} className="mr-1" />
          Trước
        </Button>
        <span className="text-sm font-medium">
          {currentChapter} / {totalChapters}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextChapter}
          disabled={currentChapter >= totalChapters}
          className="h-8"
        >
          Sau
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>

      {/* Chapter List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredChapters.length > 0 ? (
            filteredChapters.map((chapter) => {
              const isCurrent = chapter.chapterNumber === currentChapter;
              return (
                <button
                  key={chapter.id}
                  ref={isCurrent ? currentChapterRef : null}
                  onClick={() => onChapterSelect(chapter.chapterNumber)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm",
                    "hover:bg-accent",
                    isCurrent && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <div className="font-medium truncate">
                    Chương {chapter.chapterNumber}
                  </div>
                  <div className={cn(
                    "text-xs truncate mt-0.5",
                    isCurrent ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {chapter.title}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Không tìm thấy chương nào
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Keyboard Shortcuts Hint */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Phím tắt:</span>
          <div className="flex gap-2">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">→</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
