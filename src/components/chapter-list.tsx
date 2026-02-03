"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
}

interface ChapterListProps {
  novelId: string;
  chapters: Chapter[];
}

const CHAPTERS_PER_PAGE = 20;

export function ChapterList({ novelId, chapters }: ChapterListProps) {
  const [visibleCount, setVisibleCount] = useState(CHAPTERS_PER_PAGE);

  if (!chapters || chapters.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3">Danh sách chương</h3>
        <Card className="p-4 bg-card border border-border">
          <p className="text-muted-foreground text-center py-8">
            Truyện này chưa có chương nào.
          </p>
        </Card>
      </div>
    );
  }

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  const visibleChapters = sortedChapters.slice(0, visibleCount);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Danh sách chương</h3>
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List size={20} />
              <span>{chapters.length} chương</span>
            </div>
            {/* Add sorting options here in the future if needed */}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleChapters.map((chapter) => (
              <Link key={chapter.id} href={`/novel/${novelId}/read/${chapter.chapter_number}`} passHref>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3"
                  asChild
                >
                  <a>
                    <span className="text-sm text-muted-foreground mr-2">
                      {chapter.chapter_number}.
                    </span>
                    <span className="flex-1 line-clamp-1">{chapter.title}</span>
                  </a>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
        {visibleCount < chapters.length && (
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setVisibleCount(prev => prev + CHAPTERS_PER_PAGE)}
            >
              Xem thêm
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}