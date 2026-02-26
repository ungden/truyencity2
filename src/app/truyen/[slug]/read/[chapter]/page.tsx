"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ReadingControls } from '@/components/reading-controls';
import { DesktopReadingSidebar, DesktopReadingHeader } from '@/components/reading';
import { useReading } from '@/contexts/reading-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getLocalProgress, saveProgress, resolveProgress } from '@/services/reading-progress';
import { supabase } from '@/integrations/supabase/client';
import { Chapter } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { startSession, updateSessionDuration, endSession, markChapterRead } from '@/services/reading-sessions';
import { READING } from '@/lib/config';
import DOMPurify from 'isomorphic-dompurify';
import { AdPlacement } from '@/components/ads/AdPlacement';

const Comments = dynamic(
  () => import('@/components/comments').then((mod) => mod.Comments),
  { ssr: false }
);

type ChapterListItem = {
  id: string;
  title: string;
  chapterNumber: number;
};

export default function ReadingPage() {
  const params = useParams();
  const router = useRouter();
  const { settings, updateProgress, bookmarks, toggleBookmark } = useReading();
  const isMobile = useIsMobile();

  const novelSlug = params.slug as string;
  const chapterNumber = parseInt(params.chapter as string);

  const [novelId, setNovelId] = useState<string>('');
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [novelTitle, setNovelTitle] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const secondsRef = useRef<number>(0);
  const heartbeatTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const markedReadRef = useRef<boolean>(false);

  const savedAppliedRef = useRef(false);
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    if (!novelSlug || !chapterNumber) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      savedAppliedRef.current = false;
      markedReadRef.current = false;

      try {
        // Resolve slug to novel ID
        const { data: novelData } = await supabase
          .from('novels')
          .select('id, title, slug')
          .eq('slug', novelSlug)
          .single();

        if (!novelData) throw new Error('Không tìm thấy truyện này.');

        setNovelId(novelData.id);
        setNovelTitle(novelData.title);
        setIsBookmarked(bookmarks.includes(novelData.id));

        const { data: chapterData, error: chapterError } = await supabase
          .from('chapters')
          .select('*')
          .eq('novel_id', novelData.id)
          .eq('chapter_number', chapterNumber)
          .single();

        if (chapterError) throw new Error('Không thể tải chương này. Vui lòng thử lại.');
        if (!chapterData) throw new Error('Không tìm thấy chương này.');

        setCurrentChapter(chapterData);

        const { data: chaptersList, error: listError } = await supabase
          .from('chapters')
          .select('id, title, chapter_number')
          .eq('novel_id', novelData.id)
          .order('chapter_number', { ascending: true });

        if (listError) throw new Error('Không thể tải danh sách chương.');

        const formattedChapters = (chaptersList || []).map(c => ({
            id: c.id,
            title: c.title,
            chapterNumber: c.chapter_number
        }));
        setAllChapters(formattedChapters);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [novelSlug, chapterNumber]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && chapterNumber > 1) {
        handlePrevChapter();
      } else if (e.key === 'ArrowRight' && chapterNumber < allChapters.length) {
        handleNextChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapterNumber, allChapters.length]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootSession = async () => {
      if (!currentChapter || !novelId) return;
      secondsRef.current = 0;

      const id = await startSession({
        novelId,
        chapterId: currentChapter.id,
      });
      if (cancelled) return;
      sessionIdRef.current = id;

      const tick = () => {
        const now = Date.now();
        const isVisible = document.visibilityState === "visible";
        const hasFocus = document.hasFocus();
        const activeRecently = now - lastActivityRef.current < READING.ACTIVITY_TIMEOUT_MS;
        if (isVisible && hasFocus && activeRecently) {
          secondsRef.current += 1;
        }
      };
      tickTimerRef.current = window.setInterval(tick, 1000) as unknown as number;

      const beat = async () => {
        if (!sessionIdRef.current) return;
        await updateSessionDuration(sessionIdRef.current, secondsRef.current);
      };
      heartbeatTimerRef.current = window.setInterval(beat, READING.SESSION_HEARTBEAT_INTERVAL_MS) as unknown as number;
    };

    bootSession();

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("scroll", onActivity, { passive: true });
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);

      if (tickTimerRef.current) {
        clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      if (sessionIdRef.current) {
        void endSession(sessionIdRef.current, secondsRef.current);
        sessionIdRef.current = null;
      }
    };
  }, [currentChapter, novelId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentChapter || !novelId || savedAppliedRef.current || loading) return;
      const local = getLocalProgress(novelId);
      const resolved = await resolveProgress(novelId);
      const target = resolved ?? local;
      if (cancelled || !target) return;

      if (target.chapterNumber === currentChapter.chapter_number && target.positionPercent > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (cancelled) return;
            const doc = document.documentElement;
            const maxScroll = doc.scrollHeight - doc.clientHeight;
            const top = Math.max(0, (target.positionPercent / 100) * maxScroll);
            window.scrollTo({ top, behavior: "auto" });
            savedAppliedRef.current = true;
          });
        });
      }
    })();
    return () => { cancelled = true; };
  }, [currentChapter, novelId, loading]);

  useEffect(() => {
    const onScroll = () => {
      if (!currentChapter || !novelId) return;
      const now = Date.now();
      const last = lastSentAtRef.current;
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const percent = Math.min(100, Math.max(0, (doc.scrollTop / maxScroll) * 100));
      const nowIso = new Date().toISOString();

      updateProgress({
        novelId,
        chapterId: currentChapter.id,
        chapterNumber: currentChapter.chapter_number,
        progress: percent,
        lastRead: nowIso,
      });

      if (now - last >= READING.PROGRESS_SAVE_INTERVAL_MS || percent === 100) {
        lastSentAtRef.current = now;
        void saveProgress({
          novelId,
          chapterId: currentChapter.id,
          chapterNumber: currentChapter.chapter_number,
          positionPercent: percent,
          lastRead: nowIso,
        });
      }

      if (!markedReadRef.current && percent >= READING.MARK_AS_READ_THRESHOLD) {
        markedReadRef.current = true;
        void markChapterRead({ novelId, chapterId: currentChapter.id });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [currentChapter, novelId, updateProgress]);

  const handlePrevChapter = () => {
    if (chapterNumber > 1) {
      router.push(`/truyen/${novelSlug}/read/${chapterNumber - 1}`);
      window.scrollTo({ top: 0 });
    }
  };

  const handleNextChapter = () => {
    if (chapterNumber < allChapters.length) {
      router.push(`/truyen/${novelSlug}/read/${chapterNumber + 1}`);
      window.scrollTo({ top: 0 });
    }
  };

  const handleChapterSelect = (chapter: number) => {
    router.push(`/truyen/${novelSlug}/read/${chapter}`);
    window.scrollTo({ top: 0 });
  };

  const handleBookmark = () => {
    if (novelId) {
      toggleBookmark(novelId);
      setIsBookmarked(!isBookmarked);
    }
  };

  const themeClasses: Record<typeof settings.theme, string> = {
    light: 'bg-white text-black',
    dark: 'bg-gray-900 text-white',
    sepia: 'bg-amber-50 text-amber-900',
    black: 'bg-black text-white'
  };

  const maxWidthCh = !isMobile && settings.wideDesktop ? Math.min(90, settings.columnWidth + 20) : settings.columnWidth;

  const ReadingSkeleton = () => (
    <div 
      className={cn("min-h-screen", themeClasses[settings.theme])}
      style={{ filter: `brightness(${settings.brightness}%)` }}
    >
      <div className="mx-auto px-4 py-8 pb-24" style={{ maxWidth: `${maxWidthCh}ch` }}>
        <div className="text-center mb-8 pt-8">
          <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-4 w-1/4 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ReadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!currentChapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy chương này</p>
      </div>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(currentChapter.content || '');

  const ReadingContent = (
    <div
      className={cn("mx-auto", isMobile ? "px-4 py-8 pb-24" : "px-8 lg:px-12 py-8")}
      style={{ maxWidth: `${maxWidthCh}ch` }}
    >
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{
            fontSize: `${settings.fontSize + 8}px`,
            fontFamily: settings.fontFamily
          }}
        >
          {currentChapter.title}
        </h1>
        <p className="text-sm opacity-70">
          Chương {currentChapter.chapter_number} / {allChapters.length}
        </p>
      </div>

      <article
        className={cn(
          "max-w-none whitespace-pre-wrap text-inherit",
          "[&>p]:mb-4 [&>p]:leading-relaxed",
          "[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-8",
          "[&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h2]:mt-6",
          "[&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-4",
          "[&>blockquote]:border-l-4 [&>blockquote]:border-current/30 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:opacity-80",
          "[&>hr]:my-8 [&>hr]:border-current/20",
          !isMobile && settings.twoColumnsDesktop ? "lg:columns-2 lg:gap-12" : ""
        )}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          fontFamily: settings.fontFamily,
          letterSpacing: `${settings.letterSpacing}em`,
          textAlign: settings.justify ? 'justify' as const : 'start' as const,
          color: 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      {/* Post-chapter ad */}
      <AdPlacement placement="chapter" slot="chapter-end" />

      <div className="flex justify-between items-center mt-12 pt-8 border-t border-border">
        <button
          onClick={handlePrevChapter}
          disabled={chapterNumber <= 1}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            chapterNumber <= 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-accent"
          )}
        >
          &larr; Chương trước
        </button>

        <span className="text-sm opacity-70">
          {chapterNumber} / {allChapters.length}
        </span>

        <button
          onClick={handleNextChapter}
          disabled={chapterNumber >= allChapters.length}
          className={cn(
            "px-4 py-2 rounded-lg transition-colors",
            chapterNumber >= allChapters.length
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-accent"
          )}
        >
          Chương sau &rarr;
        </button>
      </div>

      {/* Comments */}
      <div className="mt-12 pt-8 border-t border-border">
        <Comments novelId={novelId} chapterId={currentChapter?.id} />
      </div>
    </div>
  );

  // Desktop Layout
  if (!isMobile) {
    return (
      <div
        className={cn("min-h-screen flex", themeClasses[settings.theme])}
        style={{ filter: `brightness(${settings.brightness}%)` }}
      >
        {!isFullscreen && (
          <DesktopReadingSidebar
            novelId={novelId}
            novelSlug={novelSlug}
            novelTitle={novelTitle}
            currentChapter={chapterNumber}
            totalChapters={allChapters.length}
            chapters={allChapters}
            onChapterSelect={handleChapterSelect}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
          />
        )}

        <div className="flex-1 flex flex-col min-h-screen">
          {!isFullscreen && (
            <DesktopReadingHeader
              novelId={novelId}
              novelSlug={novelSlug}
              novelTitle={novelTitle}
              chapterTitle={currentChapter.title}
              currentChapter={chapterNumber}
              totalChapters={allChapters.length}
              onPrevChapter={handlePrevChapter}
              onNextChapter={handleNextChapter}
              onBookmark={handleBookmark}
              isBookmarked={isBookmarked}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          )}

          <main className="flex-1 overflow-auto">
            {ReadingContent}
          </main>
        </div>
      </div>
    );
  }

  // Mobile Layout
  return (
    <div
      className={cn("min-h-screen", themeClasses[settings.theme])}
      style={{ filter: `brightness(${settings.brightness}%)` }}
    >
      {ReadingContent}

      <ReadingControls
        currentChapter={chapterNumber}
        totalChapters={allChapters.length}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        onChapterSelect={handleChapterSelect}
        onBookmark={handleBookmark}
        isBookmarked={isBookmarked}
        chapters={allChapters}
      />
    </div>
  );
}
