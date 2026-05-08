"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, BookOpenText, ChevronRight, Clock3, Library, Search } from 'lucide-react';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { listBookmarks } from '@/services/bookmarks';
import { AdPlacement } from '@/components/ads/AdPlacement';
import { AppContainer } from '@/components/layout';
import { cn } from '@/lib/utils';

type ProgressRow = {
  novel_id: string;
  chapter_number: number;
  position_percent: number;
  last_read: string;
};

type NovelBrief = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  total_chapters: number | null;
  updated_at: string | null;
};

type HistoryItem = {
  novel: NovelBrief;
  chapterNumber: number;
  progress: number;
  lastRead: string;
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatRelativeDate(value?: string | null): string {
  if (!value) return 'Chưa rõ';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Chưa rõ';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(timestamp));
}

function novelHref(novel: NovelBrief): string {
  return novel.slug ? `/truyen/${novel.slug}` : `/novel/${novel.id}`;
}

function readHref(novel: NovelBrief, chapterNumber: number): string {
  return novel.slug
    ? `/truyen/${novel.slug}/read/${chapterNumber}`
    : `/novel/${novel.id}/read/${chapterNumber}`;
}

function LibrarySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4 rounded-xl border bg-card p-3">
          <Skeleton className="h-24 w-16 rounded-lg" />
          <div className="flex-1 space-y-3 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-5 rounded-xl">
        <Link href={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

function LibraryRow({
  novel,
  chapterNumber,
  progress,
  meta,
  mode,
}: {
  novel: NovelBrief;
  chapterNumber?: number;
  progress?: number;
  meta: string;
  mode: 'history' | 'bookmark';
}) {
  const targetHref = mode === 'history' && chapterNumber
    ? readHref(novel, chapterNumber)
    : novelHref(novel);
  const progressValue = clampProgress(progress || 0);
  const latestChapter = novel.total_chapters || 0;

  return (
    <article className="group rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/35 hover:bg-accent/35">
      <div className="flex gap-3 sm:gap-4">
        <Link href={novelHref(novel)} className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-20">
          <Image
            src={novel.cover_url || '/placeholder.svg'}
            alt={novel.title}
            fill
            sizes="80px"
            quality={70}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={novelHref(novel)} className="font-semibold leading-snug line-clamp-2 hover:text-primary">
                {novel.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {novel.author || 'N/A'} · {novel.status || 'Đang ra'}
              </p>
            </div>
            {latestChapter > 0 && (
              <span className="hidden rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
                {latestChapter} chương
              </span>
            )}
          </div>

          {mode === 'history' ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Đang ở chương {chapterNumber}</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-1.5 bg-muted" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Chương mới nhất: {latestChapter > 0 ? `Chương ${latestChapter}` : 'Chưa có chương'}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 size={13} />
              {meta}
            </span>
            <Button asChild size="sm" className={cn('h-8 rounded-lg px-3', mode === 'bookmark' && 'bg-foreground text-background hover:bg-foreground/90')}>
              <Link href={targetHref}>
                {mode === 'history' ? 'Đọc tiếp' : 'Mở truyện'}
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Array<NovelBrief & { bookmarkedAt?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setHistory([]);
      return;
    }
    const { data: progressRows } = await supabase
      .from('reading_progress')
      .select('novel_id, chapter_number, position_percent, last_read')
      .eq('user_id', userId)
      .order('last_read', { ascending: false })
      .limit(100);

    const rows: ProgressRow[] = progressRows || [];
    const novelIds = Array.from(new Set(rows.map(r => r.novel_id))).filter(Boolean);
    if (novelIds.length === 0) {
      setHistory([]);
      return;
    }

    const { data: novels } = await supabase
      .from('novels')
      .select('id, slug, title, author, cover_url, status, total_chapters, updated_at')
      .in('id', novelIds);

    const novelMap = new Map<string, NovelBrief>((novels || []).map(n => [n.id, n as NovelBrief]));
    const seen = new Set<string>();
    const items = rows
      .map(r => {
        if (seen.has(r.novel_id)) return null;
        seen.add(r.novel_id);
        const novel = novelMap.get(r.novel_id);
        if (!novel) return null;
        return {
          novel,
          chapterNumber: Number(r.chapter_number || 1),
          progress: Number(r.position_percent || 0),
          lastRead: r.last_read,
        };
      })
      .filter(Boolean) as HistoryItem[];

    setHistory(items);
  };

  const fetchBookmarks = async () => {
    const items = await listBookmarks();
    setBookmarks(items
      .filter((item) => item.novel?.id)
      .map(i => ({
        id: i.novel.id,
        slug: i.novel.slug,
        title: i.novel.title,
        author: i.novel.author,
        cover_url: i.novel.cover_url,
        status: i.novel.status,
        total_chapters: i.novel.total_chapters,
        updated_at: i.novel.updated_at,
        bookmarkedAt: i.created_at,
      })));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchHistory(), fetchBookmarks()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    history: history.length,
    bookmarks: bookmarks.length,
    readingNow: history.filter(item => item.progress > 0 && item.progress < 100).length,
  }), [bookmarks.length, history]);

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <Header title="Tủ sách" showSearch={false} />
      </div>

      <AppContainer className="py-6 lg:py-8" maxWidth="4xl">
        <div className="mb-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Library size={22} />
              </div>
              <h1 className="text-2xl font-bold tracking-normal">Tủ sách</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Quay lại đúng chương đang đọc, theo dõi truyện đã lưu và mở truyện nhanh hơn.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/browse">
                <Search size={16} className="mr-2" />
                Tìm truyện
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md">
            <div className="rounded-xl border bg-background p-3">
              <p className="text-lg font-semibold">{stats.history}</p>
              <p className="text-xs text-muted-foreground">Đã đọc</p>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <p className="text-lg font-semibold">{stats.readingNow}</p>
              <p className="text-xs text-muted-foreground">Đang đọc</p>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <p className="text-lg font-semibold">{stats.bookmarks}</p>
              <p className="text-xs text-muted-foreground">Đánh dấu</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="history" className="gap-2 rounded-lg">
              <BookOpenText size={16} />
              Đang đọc
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-2 rounded-lg">
              <Bookmark size={16} />
              Đánh dấu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-3">
            {loading ? (
              <LibrarySkeleton />
            ) : history.length > 0 ? (
              history.map((item) => (
                <LibraryRow
                  key={item.novel.id}
                  novel={item.novel}
                  chapterNumber={item.chapterNumber}
                  progress={item.progress}
                  meta={`Đọc ${formatRelativeDate(item.lastRead)}`}
                  mode="history"
                />
              ))
            ) : (
              <EmptyState
                icon={<BookOpenText size={22} />}
                title="Chưa có truyện đang đọc"
                description="Khi bạn mở một chương, truyện sẽ xuất hiện ở đây để đọc tiếp nhanh."
                actionLabel="Khám phá truyện"
                href="/browse"
              />
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-3">
            {loading ? (
              <LibrarySkeleton />
            ) : bookmarks.length > 0 ? (
              bookmarks.map((novel) => (
                <LibraryRow
                  key={novel.id}
                  novel={novel}
                  meta={`Lưu ${formatRelativeDate(novel.bookmarkedAt)}`}
                  mode="bookmark"
                />
              ))
            ) : (
              <EmptyState
                icon={<Bookmark size={22} />}
                title="Chưa đánh dấu truyện nào"
                description="Lưu những bộ muốn theo dõi để không mất dấu khi có chương mới."
                actionLabel="Tìm truyện để lưu"
                href="/browse?sort=newest"
              />
            )}
          </TabsContent>
        </Tabs>

        <AdPlacement placement="between-content" slot="library-bottom" />
      </AppContainer>
    </div>
  );
}
