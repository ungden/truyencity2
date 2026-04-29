"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
import { AdPlacement } from '@/components/ads/AdPlacement';
import { CopyProtect } from '@/components/reader/copy-protect';
import { AppLockGate } from '@/components/reader/app-lock-gate';

// Latest N chapters of every novel are LOCKED on web — must read on app.
// Mobile native app fetches via direct supabase query and naturally bypasses
// (no React web code runs on mobile). Drives mobile install + ad/IAP revenue.
const APP_LOCK_WINDOW = 10;

const Comments = dynamic(
  () => import('@/components/comments').then((mod) => mod.Comments),
  { ssr: false }
);

type ChapterListItem = {
  id: string;
  title: string;
  chapterNumber: number;
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatChapterContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const hasHtmlTags = /<[^>]+>/.test(trimmed);
  if (hasHtmlTags) {
    return trimmed;
  }

  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

interface ReadingPageClientProps {
  novelSlug: string;
  chapterNumber: number;
}

export default function ReadingPageClient({ novelSlug, chapterNumber }: ReadingPageClientProps) {
  const router = useRouter();
  const { settings, updateProgress, bookmarks, toggleBookmark } = useReading();
  const isMobile = useIsMobile();

  const [novelId, setNovelId] = useState<string>('');
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [novelTitle, setNovelTitle] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sanitizedContent, setSanitizedContent] = useState('');

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
        const { data: novelData } = await supabase
          .from('novels')
          .select('id, title, slug, chapter_count')
          .eq('slug', novelSlug)
          .single();

        if (!novelData) throw new Error('Không tìm thấy truyện này.');

        setNovelId(novelData.id);
        setNovelTitle(novelData.title);
        setIsBookmarked(bookmarks.includes(novelData.id));

        // App lock pre-check: don't fetch content if chapter is in last N
        // window. Web users see <AppLockGate> stub instead. Prevents content
        // leaking through DevTools/network tab even though render is gated.
        // Mobile native app uses its own supabase client and bypasses this.
        const totalCount = (novelData.chapter_count as number) || 0;
        const isLocked = totalCount > APP_LOCK_WINDOW
          && chapterNumber > totalCount - APP_LOCK_WINDOW;

        const chapterSelect = isLocked
          ? 'id, novel_id, chapter_number, title, created_at'  // omit content
          : '*';

        const { data: chapterData, error: chapterError } = await supabase
          .from('chapters')
          .select(chapterSelect)
          .eq('novel_id', novelData.id)
          .eq('chapter_number', chapterNumber)
          .maybeSingle();

        if (chapterError) throw new Error('Không thể tải chương này. Vui lòng thử lại.');
        if (!chapterData) throw new Error('Không tìm thấy chương này.');

        // For locked chapters, ensure content is empty in state (defense-in-depth).
        if (isLocked && 'content' in chapterData) {
          (chapterData as { content?: string }).content = '';
        }

        setCurrentChapter(chapterData as unknown as Chapter);

        const { data: chaptersList, error: listError } = await supabase
          .from('chapters')
          .select('id, title, chapter_number')
          .eq('novel_id', novelData.id)
          .order('chapter_number', { ascending: true });

        if (listError) throw new Error('Không thể tải danh sách chương.');

        const formattedChapters = (chaptersList || []).map((c) => ({
          id: c.id,
          title: c.title,
          chapterNumber: c.chapter_number,
        }));
        setAllChapters(formattedChapters);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [novelSlug, chapterNumber, bookmarks]);

  useEffect(() => {
    let cancelled = false;

    const loadSanitizedContent = async () => {
      const rawContent = currentChapter?.content || '';
      const formattedContent = formatChapterContent(rawContent);

      if (!formattedContent) {
        setSanitizedContent('');
        return;
      }

      try {
        const { default: DOMPurify } = await import('isomorphic-dompurify');
        if (!cancelled) {
          setSanitizedContent(DOMPurify.sanitize(formattedContent));
        }
      } catch (sanitizeError) {
        console.warn('Failed to load DOMPurify for chapter content:', sanitizeError);
        if (!cancelled) {
          setSanitizedContent(escapeHtml(rawContent).replace(/\n/g, '<br />'));
        }
      }
    };

    void loadSanitizedContent();

    return () => {
      cancelled = true;
    };
  }, [currentChapter?.content]);

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
        const isVisible = document.visibilityState === 'visible';
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

    void bootSession();

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);

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
    void (async () => {
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
            window.scrollTo({ top, behavior: 'auto' });
            savedAppliedRef.current = true;
          });
        });
      }
    })();
    return () => {
      cancelled = true;
    };
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

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    light: 'bg-[#f8fafc] text-[#0f172a]',
    dark: 'bg-[#0b1220] text-[#e5edf7]',
    sepia: 'bg-[#efe7d8] text-[#4c301f]',
    black: 'bg-black text-[#f5f5f5]',
  };

  const contentShellClasses: Record<typeof settings.theme, string> = {
    light: 'bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80',
    dark: 'bg-[#101826] shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/5',
    sepia: 'bg-[#f8f1e6] shadow-[0_24px_80px_rgba(90,57,38,0.12)] ring-1 ring-[#dcc7ab]',
    black: 'bg-[#050505] shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10',
  };

  const articleToneClasses: Record<typeof settings.theme, string> = {
    light: 'text-[#1f2937] [&_h1]:text-[#0f172a] [&_h2]:text-[#0f172a] [&_h3]:text-[#0f172a] [&_strong]:text-[#0f172a]',
    dark: 'text-[#dbe4f0] [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_strong]:text-white',
    sepia: 'text-[#6a4129] [&_h1]:text-[#7a3f1e] [&_h2]:text-[#7a3f1e] [&_h3]:text-[#7a3f1e] [&_strong]:text-[#532f1c]',
    black: 'text-[#ededed] [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_strong]:text-white',
  };

  const maxWidthCh = !isMobile && settings.wideDesktop ? Math.min(90, settings.columnWidth + 20) : settings.columnWidth;

  const ReadingSkeleton = () => (
    <div className={cn('min-h-screen', themeClasses[settings.theme])} style={{ filter: `brightness(${settings.brightness}%)` }}>
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

  const ReadingContent = (
    <div className={cn('mx-auto', isMobile ? 'px-4 py-8 pb-24' : 'px-8 lg:px-12 py-10')} style={{ maxWidth: `${maxWidthCh}ch` }}>
      <div className={cn('rounded-[28px] px-6 py-8 md:px-10 md:py-10', contentShellClasses[settings.theme])}>
        <div className="text-center mb-10">
          <h1
            className="text-2xl font-bold mb-2 tracking-tight"
            style={{
              fontSize: `${settings.fontSize + 8}px`,
              fontFamily: settings.fontFamily,
            }}
          >
            {currentChapter.title}
          </h1>
          <p className="text-sm opacity-75 font-medium">
            Chương {currentChapter.chapter_number} / {allChapters.length}
          </p>
        </div>

        {/* App lock gate: latest N chapters of every novel locked on web. */}
        {(() => {
          const totalChapters = allChapters.length;
          const isLocked = totalChapters > APP_LOCK_WINDOW
            && currentChapter.chapter_number > totalChapters - APP_LOCK_WINDOW;
          if (isLocked) {
            return (
              <AppLockGate
                novelSlug={novelSlug}
                lastUnlockedChapterNumber={Math.max(1, totalChapters - APP_LOCK_WINDOW)}
                currentChapterNumber={currentChapter.chapter_number}
                currentChapterTitle={currentChapter.title}
                lockWindow={APP_LOCK_WINDOW}
              />
            );
          }
          return (
            <CopyProtect chapterUrl={`/truyen/${novelSlug}/read/${chapterNumber}`}>
              <article
                className={cn(
                  'max-w-none whitespace-pre-wrap text-inherit',
                  articleToneClasses[settings.theme],
                  '[&_p]:mb-5 [&_p]:leading-relaxed',
                  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8',
                  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6',
                  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4',
                  '[&_blockquote]:border-l-4 [&_blockquote]:border-current/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-80',
                  '[&_hr]:my-8 [&_hr]:border-current/20',
                  !isMobile && settings.twoColumnsDesktop ? 'lg:columns-2 lg:gap-12' : ''
                )}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  fontFamily: settings.fontFamily,
                  letterSpacing: `${settings.letterSpacing}em`,
                  textAlign: settings.justify ? ('justify' as const) : ('start' as const),
                  color: 'inherit',
                }}
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </CopyProtect>
          );
        })()}

        <AdPlacement placement="chapter" slot="chapter-post-content" />

        <div className="flex justify-between items-center mt-12 pt-8 border-t border-current/12">
          <button
            onClick={handlePrevChapter}
            disabled={chapterNumber <= 1}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors',
              chapterNumber <= 1 ? 'opacity-50 cursor-not-allowed' : settings.theme === 'sepia' ? 'hover:bg-[#eadfcb]' : 'hover:bg-accent'
            )}
          >
            &larr; Chương trước
          </button>

          <span className="text-sm opacity-75 font-medium">
            {chapterNumber} / {allChapters.length}
          </span>

          <button
            onClick={handleNextChapter}
            disabled={chapterNumber >= allChapters.length}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors',
              chapterNumber >= allChapters.length ? 'opacity-50 cursor-not-allowed' : settings.theme === 'sepia' ? 'hover:bg-[#eadfcb]' : 'hover:bg-accent'
            )}
          >
            Chương sau &rarr;
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-current/12">
          <Comments novelId={novelId} chapterId={currentChapter.id} />
        </div>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <div className={cn('min-h-screen flex', themeClasses[settings.theme])} style={{ filter: `brightness(${settings.brightness}%)` }}>
        {!isFullscreen && (
          <DesktopReadingSidebar
            novelId={novelId}
            novelSlug={novelSlug}
            novelTitle={novelTitle}
            theme={settings.theme}
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
              theme={settings.theme}
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

          <main className="flex-1 overflow-auto">{ReadingContent}</main>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen', themeClasses[settings.theme])} style={{ filter: `brightness(${settings.brightness}%)` }}>
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
