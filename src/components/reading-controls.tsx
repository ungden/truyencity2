"use client";

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { useReading } from '@/contexts/reading-context';
import { cn } from '@/lib/utils';
import ReadingSettings from '@/components/reading-settings';

interface ReadingControlsProps {
  currentChapter: number;
  totalChapters: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onChapterSelect: (chapter: number) => void;
  onBookmark: () => void;
  isBookmarked: boolean;
  chapters: Array<{ id: string; title: string; chapterNumber: number }>;
}

export const ReadingControls: React.FC<ReadingControlsProps> = ({
  currentChapter,
  totalChapters,
  onPrevChapter,
  onNextChapter,
  onChapterSelect,
  onBookmark,
  isBookmarked,
  chapters
}) => {
  useReading();
  const [showControls, setShowControls] = useState(true);

  const progress = (currentChapter / totalChapters) * 100;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-muted z-50"
        role="progressbar"
        aria-label="Tiến độ đọc"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t transition-transform duration-300 z-50",
        showControls ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onPrevChapter}
            disabled={currentChapter <= 1}
            aria-label="Chương trước"
          >
            <ChevronLeft size={20} />
          </Button>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Danh sách chương">
                  <List size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Danh sách chương</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2 overflow-y-auto h-full pb-20">
                  {chapters.map((chapter) => {
                    const isCurrent = chapter.chapterNumber === currentChapter;
                    return (
                      <Button
                        key={chapter.id}
                        variant={isCurrent ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left h-auto p-3",
                          isCurrent && "font-semibold"
                        )}
                        onClick={() => onChapterSelect(chapter.chapterNumber)}
                      >
                        <div>
                          <div className="text-sm">{chapter.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Chương {chapter.chapterNumber}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <span className="text-sm font-medium px-2">
              {currentChapter}/{totalChapters}
            </span>

            <ReadingSettings buttonProps={{ variant: "ghost", size: "sm" }} />

            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBookmark}
              aria-label={isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu trang"}
            >
              <Bookmark 
                size={20} 
                className={isBookmarked ? "fill-current text-primary" : ""} 
              />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={onNextChapter}
            disabled={currentChapter >= totalChapters}
            aria-label="Chương sau"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="fixed bottom-4 right-4 z-40 bg-background/80 backdrop-blur"
        onClick={() => setShowControls(!showControls)}
      >
        {showControls ? 'Ẩn' : 'Hiện'}
      </Button>
    </>
  );
};