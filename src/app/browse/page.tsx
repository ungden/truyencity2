"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { NovelCard } from '@/components/novel-card';
import { GenreFilter } from '@/components/genre-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Grid3X3, List, ArrowUpDown, Filter, X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppContainer, TwoColumnLayout, ContentCard } from '@/components/layout';
import { cn } from '@/lib/utils';
import { GENRE_CONFIG } from '@/lib/types/genre-config';

type NovelRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
  updated_at: string | null;
  chapters: { count: number }[];
};

const NovelCardSkeleton = ({ variant = 'default' }: { variant?: 'default' | 'horizontal' }) => {
  if (variant === 'horizontal') {
    return (
      <div className="flex p-4 gap-4 bg-card rounded-2xl border-0 shadow-sm">
        <Skeleton className="w-20 h-28 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Skeleton className="w-full aspect-[3/4] rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
};

const statusOptions = [
  { id: 'dang-ra', label: 'Dang ra', value: 'Dang ra' },
  { id: 'hoan-thanh', label: 'Hoan thanh', value: 'Hoan thanh' },
  { id: 'tam-dung', label: 'Tam dung', value: 'Tam dung' },
  { id: 'drop', label: 'Drop', value: 'Drop' }
];

const chapterRangeOptions = [
  { id: 'all', label: 'Tat ca', min: 0, max: Infinity },
  { id: '0-50', label: '0-50 chuong', min: 0, max: 50 },
  { id: '50-200', label: '50-200 chuong', min: 50, max: 200 },
  { id: '200-500', label: '200-500 chuong', min: 200, max: 500 },
  { id: '500+', label: '500+ chuong', min: 500, max: Infinity },
];

const sortOptions = [
  { value: 'updated', label: 'Moi cap nhat' },
  { value: 'chapters_desc', label: 'Nhieu chuong nhat' },
  { value: 'title', label: 'Ten A-Z' },
];

const PAGE_SIZE = 30;

export default function BrowsePage() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [chapterRange, setChapterRange] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [novels, setNovels] = useState<NovelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Build and execute query
  const fetchNovels = async (pageNum: number, append: boolean = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('novels')
      .select('id,slug,title,author,cover_url,status,genres,updated_at,chapters(count)');

    // Apply filters server-side
    if (selectedGenres.length > 0) {
      query = query.overlaps('genres', selectedGenres);
    }
    if (selectedStatus.length > 0) {
      query = query.in('status', selectedStatus);
    }

    // Apply sort
    switch (sortBy) {
      case 'title':
        query = query.order('title', { ascending: true });
        break;
      case 'chapters_desc':
        // We'll sort client-side for chapters since it's a joined count
        query = query.order('updated_at', { ascending: false, nullsFirst: false });
        break;
      case 'updated':
      default:
        query = query.order('updated_at', { ascending: false, nullsFirst: false });
        break;
    }

    query = query.range(from, to);

    const { data } = await query;
    let results = (data || []) as NovelRow[];

    // Client-side chapter range filter
    const range = chapterRangeOptions.find(r => r.id === chapterRange);
    if (range && range.id !== 'all') {
      results = results.filter(n => {
        const count = n.chapters?.[0]?.count || 0;
        return count >= range.min && count <= range.max;
      });
    }

    // Client-side sort for chapters
    if (sortBy === 'chapters_desc') {
      results.sort((a, b) => (b.chapters?.[0]?.count || 0) - (a.chapters?.[0]?.count || 0));
    }

    if (append) {
      setNovels(prev => [...prev, ...results]);
    } else {
      setNovels(results);
    }

    setHasMore(results.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  // Initial load + re-fetch on filter/sort change
  useEffect(() => {
    setPage(0);
    fetchNovels(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenres, selectedStatus, sortBy, chapterRange]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNovels(nextPage, true);
  };

  const filtered = novels;

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(g => g !== genreId)
        : [...prev, genreId]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedStatus([]);
    setChapterRange('all');
  };

  const hasFilters = selectedGenres.length > 0 || selectedStatus.length > 0 || chapterRange !== 'all';

  // Desktop Sidebar Filters
  const FilterSidebar = (
    <div className="space-y-6">
      <ContentCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Bo loc
          </h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
              Xoa tat ca
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Trang thai</h4>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <div key={status.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.id}`}
                  checked={selectedStatus.includes(status.value)}
                  onCheckedChange={() => toggleStatus(status.value)}
                />
                <Label
                  htmlFor={`status-${status.id}`}
                  className="text-sm cursor-pointer"
                >
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Chapter Range Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">So chuong</h4>
          <div className="space-y-2">
            {chapterRangeOptions.map((range) => (
              <div key={range.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`range-${range.id}`}
                  checked={chapterRange === range.id}
                  onCheckedChange={() => setChapterRange(chapterRange === range.id ? 'all' : range.id)}
                />
                <Label
                  htmlFor={`range-${range.id}`}
                  className="text-sm cursor-pointer"
                >
                  {range.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Genre Filter */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">The loai</h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-custom pr-2">
            {Object.entries(GENRE_CONFIG).map(([id, genre]) => (
              <div key={id} className="flex items-center space-x-2">
                <Checkbox
                  id={`genre-${id}`}
                  checked={selectedGenres.includes(id)}
                  onCheckedChange={() => toggleGenre(id)}
                />
                <Label
                  htmlFor={`genre-${id}`}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <span>{genre.icon}</span>
                  {genre.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </ContentCard>
    </div>
  );

  // Active filters display
  const ActiveFilters = hasFilters && (
    <div className="flex flex-wrap gap-2 mb-4">
      {selectedGenres.map(genreId => {
        const genre = GENRE_CONFIG[genreId as keyof typeof GENRE_CONFIG];
        return genre ? (
          <Badge
            key={genreId}
            variant="secondary"
            className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
            onClick={() => toggleGenre(genreId)}
          >
            <span>{genre.icon}</span>
            {genre.name}
            <X size={14} className="ml-1" />
          </Badge>
        ) : null;
      })}
      {selectedStatus.map(status => (
        <Badge
          key={status}
          variant="secondary"
          className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
          onClick={() => toggleStatus(status)}
        >
          {status}
          <X size={14} className="ml-1" />
        </Badge>
      ))}
      {chapterRange !== 'all' && (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
          onClick={() => setChapterRange('all')}
        >
          {chapterRangeOptions.find(r => r.id === chapterRange)?.label}
          <X size={14} className="ml-1" />
        </Badge>
      )}
    </div>
  );

  const getChapterCount = (n: NovelRow) => n.chapters?.[0]?.count || 0;

  // Main content
  const MainContent = (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Dang tai...' : `Hien thi ${filtered.length} truyen`}
        </p>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 rounded-xl">
              <ArrowUpDown size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden sm:flex border rounded-xl overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters - Desktop shows inline */}
      <div className="hidden lg:block">
        {ActiveFilters}
      </div>

      {/* Novel Grid/List */}
      {loading ? (
        <div className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-3"
        )}>
          {Array.from({ length: 15 }).map((_, i) => (
            <NovelCardSkeleton key={i} variant={viewMode === 'list' ? 'horizontal' : 'default'} />
          ))}
        </div>
      ) : (filtered.length > 0 ? (
        <div className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-3"
        )}>
          {filtered.map((novel) => (
            <NovelCard
              key={novel.id}
              id={novel.id}
              slug={novel.slug || undefined}
              title={novel.title}
              author={novel.author || 'N/A'}
              cover={novel.cover_url || ''}
              status={novel.status || 'Dang ra'}
              genre={novel.genres?.[0]}
              chapters={getChapterCount(novel)}
              variant={viewMode === 'list' ? 'horizontal' : 'default'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Filter size={24} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Khong tim thay truyen nao</p>
          <p className="text-sm text-muted-foreground mt-1">
            Thu thay doi bo loc de xem them ket qua
          </p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Xoa bo loc
            </Button>
          )}
        </div>
      ))}

      {/* Load More */}
      {!loading && hasMore && filtered.length > 0 && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="px-8">
            {loadingMore ? 'Dang tai...' : 'Xem them'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header title="Duyet Truyen" showBack={true} />
      </div>

      <AppContainer className="py-6 lg:py-8">
        {/* Desktop: Two Column with Sidebar */}
        <div className="hidden lg:block">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Duyet Truyen</h1>
            <p className="text-muted-foreground">Kham pha kho truyen phong phu</p>
          </div>
          <TwoColumnLayout
            sidebar={FilterSidebar}
            sidebarPosition="left"
            sidebarWidth="sm"
          >
            {MainContent}
          </TwoColumnLayout>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4">
          {/* Mobile Filter Bar */}
          <div className="flex items-center justify-between">
            <GenreFilter
              selectedGenres={selectedGenres}
              onGenreChange={setSelectedGenres}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 rounded-xl">
                  <ArrowUpDown size={14} className="mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none h-9 w-9 p-0"
                >
                  <Grid3X3 size={14} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none h-9 w-9 p-0"
                >
                  <List size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters - Mobile */}
          {ActiveFilters}

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {loading ? 'Dang tai...' : `Hien thi ${filtered.length} truyen`}
          </p>

          {/* Novel Grid/List */}
          {loading ? (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                : "space-y-3"
            )}>
              {Array.from({ length: 10 }).map((_, i) => (
                <NovelCardSkeleton key={i} variant={viewMode === 'list' ? 'horizontal' : 'default'} />
              ))}
            </div>
          ) : (filtered.length > 0 ? (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                : "space-y-3"
            )}>
              {filtered.map((novel) => (
                <NovelCard
                  key={novel.id}
                  id={novel.id}
                  slug={novel.slug || undefined}
                  title={novel.title}
                  author={novel.author || 'N/A'}
                  cover={novel.cover_url || ''}
                  status={novel.status || 'Dang ra'}
                  genre={novel.genres?.[0]}
                  chapters={getChapterCount(novel)}
                  variant={viewMode === 'list' ? 'horizontal' : 'default'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Khong tim thay truyen nao</p>
              <p className="text-sm text-muted-foreground mt-1">
                Thu thay doi bo loc de xem them ket qua
              </p>
            </div>
          ))}

          {/* Load More - Mobile */}
          {!loading && hasMore && filtered.length > 0 && (
            <div className="text-center mt-4">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="px-8">
                {loadingMore ? 'Dang tai...' : 'Xem them'}
              </Button>
            </div>
          )}
        </div>
      </AppContainer>
    </div>
  );
}
