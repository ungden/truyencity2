'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ListTree,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Layers,
  BookOpen,
  Target,
  Users,
  Map,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIStoryProject } from '@/lib/types/ai-writer';
import type { StoryOutline } from '@/lib/types/story-inspiration';
import Link from 'next/link';

interface ArcOutline {
  arc_number: number;
  title: string;
  description: string;
  start_chapter: number;
  end_chapter: number;
}

interface ChapterOutline {
  chapter_number: number;
  title: string;
  summary: string;
}

interface StoryOutlinePanelProps {
  project: AIStoryProject;
}

function MiniChapterItem({ chapter, currentChapter }: {
  chapter: ChapterOutline;
  currentChapter: number;
}) {
  const isWritten = chapter.chapter_number <= currentChapter;
  const isCurrent = chapter.chapter_number === currentChapter + 1;

  return (
    <div className={`flex items-start gap-2 py-2 px-2 rounded-md text-sm ${
      isCurrent
        ? 'bg-primary/10 border border-primary/20'
        : isWritten
          ? 'text-green-700 dark:text-green-400'
          : 'text-muted-foreground'
    }`}>
      <div className="mt-0.5 flex-shrink-0">
        {isWritten ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : isCurrent ? (
          <PlayCircle className="w-4 h-4 text-primary animate-pulse" />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground/30" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
          {chapter.chapter_number}.
        </span>
        {' '}
        <span className="truncate">{chapter.title || 'Untitled'}</span>
        {isCurrent && (
          <Badge variant="default" className="ml-2 text-[10px] px-1 py-0">
            Tiếp
          </Badge>
        )}
      </div>
    </div>
  );
}

function MiniArcSection({ arc, chapters, currentChapter }: {
  arc: ArcOutline;
  chapters: ChapterOutline[];
  currentChapter: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const arcChapters = chapters.filter(
    ch => ch.chapter_number >= arc.start_chapter && ch.chapter_number <= arc.end_chapter
  );
  const writtenCount = arcChapters.filter(ch => ch.chapter_number <= currentChapter).length;
  const isCurrentArc = currentChapter + 1 >= arc.start_chapter && currentChapter + 1 <= arc.end_chapter;

  // Auto-expand current arc
  useEffect(() => {
    if (isCurrentArc) {
      setIsOpen(true);
    }
  }, [isCurrentArc]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
          isCurrentArc
            ? 'bg-primary/5 border border-primary/20'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
            isCurrentArc
              ? 'bg-primary text-white'
              : writtenCount === arcChapters.length
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {arc.arc_number}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{arc.title}</p>
            <p className="text-xs text-muted-foreground">
              {writtenCount}/{arcChapters.length} chương
            </p>
          </div>

          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-4 pl-2 border-l border-dashed border-muted-foreground/20 mt-1 space-y-0.5">
          {arcChapters.map((chapter) => (
            <MiniChapterItem
              key={chapter.chapter_number}
              chapter={chapter}
              currentChapter={currentChapter}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StoryOutlinePanel({ project }: StoryOutlinePanelProps) {
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchOutline = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/story-inspiration/outlines', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const projectOutline = (data.data || []).find(
          (o: StoryOutline) => o.ai_project_id === project.id
        );
        setOutline(projectOutline || null);
      }
    } catch (error) {
      console.error('Error fetching outline:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchOutline();
  }, [fetchOutline]);

  const arcOutlines = (outline?.arc_outlines as ArcOutline[]) || [];
  const chapterOutlines = (outline?.chapter_outlines as ChapterOutline[]) || [];

  // Progress stats
  const totalChapters = outline?.total_planned_chapters || project.total_planned_chapters;
  const progressPercent = totalChapters > 0
    ? Math.round((project.current_chapter / totalChapters) * 100)
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ListTree className="w-4 h-4" />
          <span className="hidden sm:inline">Dàn truyện</span>
          {outline && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {progressPercent}%
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-primary" />
            Dàn Truyện
          </SheetTitle>
          <SheetDescription>
            {project.novel?.title || 'Untitled'}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !outline ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Chưa có Outline</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Dự án này chưa có dàn truyện chi tiết
            </p>
            <Link href="/admin/story-inspiration">
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo Outline
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Overview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Tiến độ</span>
                  <span className="font-bold text-lg text-primary">
                    {project.current_chapter}/{totalChapters}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {progressPercent}% hoàn thành
                </p>
              </CardContent>
            </Card>

            {/* Quick Info */}
            {(outline.main_character_name || outline.genre) && (
              <div className="grid grid-cols-2 gap-2">
                {outline.main_character_name && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm truncate">{outline.main_character_name}</span>
                  </div>
                )}
                {outline.genre && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-sm truncate">{outline.genre}</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Arc & Chapter List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">
                  Cấu trúc truyện
                </h3>
                <Link href="/admin/ai-tools/outlines">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Xem đầy đủ
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>

              <ScrollArea className="h-[400px] pr-2">
                {arcOutlines.length > 0 ? (
                  <div className="space-y-2">
                    {arcOutlines.map((arc) => (
                      <MiniArcSection
                        key={arc.arc_number}
                        arc={arc}
                        chapters={chapterOutlines}
                        currentChapter={project.current_chapter}
                      />
                    ))}
                  </div>
                ) : chapterOutlines.length > 0 ? (
                  <div className="space-y-0.5">
                    {chapterOutlines.map((chapter) => (
                      <MiniChapterItem
                        key={chapter.chapter_number}
                        chapter={chapter}
                        currentChapter={project.current_chapter}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Không có thông tin chi tiết chương
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Story Hooks */}
            {outline.story_hooks && outline.story_hooks.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Story Hooks
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(outline.story_hooks as string[]).slice(0, 6).map((hook, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {hook}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
