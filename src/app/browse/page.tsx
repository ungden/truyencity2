"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { NovelCard } from '@/components/novel-card';
import { GenreFilter } from '@/components/genre-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AppContainer, TwoColumnLayout, ContentCard } from '@/components/layout';
import { cn } from '@/lib/utils';
import { GENRE_CONFIG } from '@/lib/types/genre-config';
import { useNovelsInfinite } from '@/hooks/use-novels-infinite';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

type NovelRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
  updated_at: string | null;
  total_chapters: number;
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
  { id: 'dang-ra', label: 'Đang ra', value: 'Đang ra' },
  { id: 'hoan-thanh', label: 'Hoàn thành', value: 'Hoàn thành' },
  { id: 'tam-dung', label: 'Tạm dừng', value: 'Tạm dừng' },
  { id: 'drop', label: 'Drop', value: 'Drop' }
];

const chapterRangeOptions = [
  { id: 'all', label: 'Tất cả', min: 0, max: Infinity },
  { id: '0-50', label: '0-50 chương', min: 0, max: 50 },
  { id: '50-200', label: '50-200 chương', min: 50, max: 200 },
  { id: '200-500', label: '200-500 chương', min: 200, max: 500 },
  { id: '500+', label: '500+ chương', min: 500, max: Infinity },
];

const sortOptions = [
  { value: 'updated', label: 'Mới cập nhật' },
  { value: 'newest', label: 'Truyện mới ra mắt' },
  { value: 'chapters_desc', label: 'Nhiều chương nhất' },
  { value: 'title', label: 'Tên A-Z' },
];

const PAGE_SIZE = 30;

export default function BrowsePage() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [chapterRange, setChapterRange] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    if (sort && sortOptions.some((s) => s.value === sort)) {
      setSortBy(sort);
    }
  }, []);

  // Use React Query infinite query hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useNovelsInfinite({
    selectedGenres,
    selectedStatus,
    chapterRange,
    sortBy,
  });

  // Flatten all pages into single array
  const novels = data?.pages.flatMap((page) => page) ?? [];

  // Intersection Observer for auto infinite scroll
  const { targetRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '200px', // Trigger 200px before reaching the sentinel
    enabled: hasNextPage && !isFetchingNextPage,
  });

  // Auto-fetch next page when sentinel is visible
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Manual load more handler (fallback button)
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

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
            Bộ lọc
          </h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
              Xóa tất cả
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Trạng thái</h4>
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
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Số chương</h4>
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
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Thể loại</h4>
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

  const getChapterCount = (n: NovelRow) => n.total_chapters || 0;

  // Main content
  const MainContent = (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Đang tải...' : `Hiển thị ${novels.length} truyện`}
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
              aria-label="Chế độ lưới"
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
              aria-label="Chế độ danh sách"
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

      {/* Error State */}
      {isError && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
            <X size={24} className="text-destructive" />
          </div>
          <p className="text-lg font-medium">{error?.message || 'Không thể tải danh sách truyện'}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            Thử lại
          </Button>
        </div>
      )}

      {/* Novel Grid/List */}
      {!error && isLoading ? (
        <div className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-3"
        )}>
          {Array.from({ length: 15 }).map((_, i) => (
            <NovelCardSkeleton key={i} variant={viewMode === 'list' ? 'horizontal' : 'default'} />
          ))}
        </div>
      ) : (!error && novels.length > 0 ? (
        <div className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-3"
        )}>
          {novels.map((novel) => (
            <NovelCard
              key={novel.id}
              id={novel.id}
              slug={novel.slug || undefined}
              title={novel.title}
              author={novel.author || 'N/A'}
              cover={novel.cover_url || ''}
              status={novel.status || 'Đang ra'}
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
           <p className="text-lg font-medium">Không tìm thấy truyện nào</p>
           <p className="text-sm text-muted-foreground mt-1">
             Thử thay đổi bộ lọc để xem thêm kết quả
           </p>
           {hasFilters && (
             <Button variant="outline" onClick={clearFilters} className="mt-4">
               Xóa bộ lọc
            </Button>
          )}
        </div>
      ))}

      {/* Infinite Scroll Sentinel - invisible div that triggers load more */}
      {!isLoading && hasNextPage && novels.length > 0 && (
        <div ref={targetRef} className="h-20 flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              <span className="text-sm">Đang tải thêm...</span>
            </div>
          )}
        </div>
      )}

      {/* Fallback Manual Load More Button (in case auto-scroll doesn't work) */}
      {!isLoading && hasNextPage && novels.length > 0 && !isIntersecting && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={loadMore} disabled={isFetchingNextPage} className="px-8">
            Xem thêm
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header title="Duyệt Truyện" showBack={true} />
      </div>

      <AppContainer className="py-6 lg:py-8">
        {/* Desktop: Two Column with Sidebar */}
        <div className="hidden lg:block">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Duyệt Truyện</h1>
            <p className="text-muted-foreground">Khám phá kho truyện phong phú</p>
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
                  aria-label="Chế độ lưới"
                >
                  <Grid3X3 size={14} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none h-9 w-9 p-0"
                  aria-label="Chế độ danh sách"
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
            {isLoading ? 'Đang tải...' : `Hiển thị ${novels.length} truyện`}
          </p>

          {/* Novel Grid/List */}
          {isLoading ? (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                : "space-y-3"
            )}>
              {Array.from({ length: 10 }).map((_, i) => (
                <NovelCardSkeleton key={i} variant={viewMode === 'list' ? 'horizontal' : 'default'} />
              ))}
            </div>
          ) : (novels.length > 0 ? (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
                : "space-y-3"
            )}>
              {novels.map((novel) => (
                <NovelCard
                  key={novel.id}
                  id={novel.id}
                  slug={novel.slug || undefined}
                  title={novel.title}
                  author={novel.author || 'N/A'}
                  cover={novel.cover_url || ''}
                  status={novel.status || 'Đang ra'}
                  genre={novel.genres?.[0]}
                  chapters={getChapterCount(novel)}
                  variant={viewMode === 'list' ? 'horizontal' : 'default'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không tìm thấy truyện nào</p>
              <p className="text-sm text-muted-foreground mt-1">
                Thử thay đổi bộ lọc để xem thêm kết quả
              </p>
            </div>
          ))}

          {/* Mobile: Same infinite scroll sentinel */}
          {!isLoading && hasNextPage && novels.length > 0 && (
            <div ref={targetRef} className="h-20 flex items-center justify-center mt-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  <span className="text-sm">Đang tải thêm...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </AppContainer>
    </div>
  );
}
