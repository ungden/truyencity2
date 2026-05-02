"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X, ArrowUpDown, Grid3X3, List, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { NovelCard } from '@/components/novel-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { GENRE_CONFIG } from '@/lib/types/genre-config';
import { cn } from '@/lib/utils';
import { AdPlacement } from '@/components/ads/AdPlacement';

type SearchRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  updated_at: string | null;
  genres: string[] | null;
  total_chapters: number | null;
};

const sortOptions = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'chapters', label: 'Nhiều chương' },
  { value: 'updated', label: 'Mới cập nhật' },
];

const statusOptions = [
  { id: 'dang-ra', label: 'Đang ra', value: 'Đang ra' },
  { id: 'hoan-thanh', label: 'Hoàn thành', value: 'Hoàn thành' },
  { id: 'tam-dung', label: 'Tạm dừng', value: 'Tạm dừng' },
];

// Aligned with /browse + mobile search-filters for cross-platform consistency
const chapterRangeOptions = [
  { id: 'all', label: 'Tất cả', min: 0, max: Infinity },
  { id: '0-50', label: '<50 chương', min: 0, max: 50 },
  { id: '50-200', label: '50-200 chương', min: 50, max: 200 },
  { id: '200-500', label: '200-500 chương', min: 200, max: 500 },
  { id: '500-1000', label: '500-1000 chương', min: 500, max: 1000 },
  { id: '1000+', label: '>1000 chương', min: 1000, max: Infinity },
];

const genreEntries = Object.entries(GENRE_CONFIG).map(([id, g]) => ({
  id,
  name: g.name,
  icon: g.icon,
}));

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialGenres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
  const initialStatus = searchParams.get('status')?.split(',').filter(Boolean) || [];
  const initialChapterRange = searchParams.get('range') || 'all';
  const initialSort = searchParams.get('sort') || 'relevance';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState(initialSort);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(initialStatus);
  const [chapterRange, setChapterRange] = useState(initialChapterRange);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [hasSearched, setHasSearched] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFilterCount =
    selectedGenres.length +
    selectedStatus.length +
    (chapterRange !== 'all' ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  // Update URL when params change (without full page reload)
  const updateUrl = useCallback(
    (q: string, genres: string[], status: string[], range: string, sort: string) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (genres.length > 0) params.set('genres', genres.join(','));
      if (status.length > 0) params.set('status', status.join(','));
      if (range !== 'all') params.set('range', range);
      if (sort !== 'relevance') params.set('sort', sort);
      const qs = params.toString();
      router.replace(`/search${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  // Search effect
  useEffect(() => {
    const handler = setTimeout(async () => {
      // Allow filter-only browsing — if user picked filters but no query, still search.
      const hasQuery = query.trim().length > 0;
      const filtersActive = selectedGenres.length > 0 || selectedStatus.length > 0 || chapterRange !== 'all';

      if (!hasQuery && !filtersActive) {
        setResults([]);
        setIsSearching(false);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      let dbQuery = supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,updated_at,genres,total_chapters')
        .order('updated_at', { ascending: false })
        .limit(120);

      if (hasQuery) {
        const q = `%${query}%`;
        dbQuery = dbQuery.or(`title.ilike.${q},author.ilike.${q}`);
      }

      // Genre filter at DB level. Multiple genres → OR semantics (`overlaps`).
      if (selectedGenres.length > 0) {
        dbQuery = dbQuery.overlaps('genres', selectedGenres);
      }

      // Status filter
      if (selectedStatus.length > 0) {
        dbQuery = dbQuery.in('status', selectedStatus);
      }

      // Chapter range filter
      const range = chapterRangeOptions.find((r) => r.id === chapterRange);
      if (range && range.id !== 'all') {
        if (range.min > 0) dbQuery = dbQuery.gte('total_chapters', range.min);
        if (range.max !== Infinity) dbQuery = dbQuery.lte('total_chapters', range.max);
      }

      const { data } = await dbQuery;
      let list = (data || []) as SearchRow[];

      // Sort
      const getChapters = (n: SearchRow) => n.total_chapters || 0;
      list = list.sort((a, b) => {
        switch (sortBy) {
          case 'chapters':
            return getChapters(b) - getChapters(a);
          case 'updated':
            return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
          case 'relevance':
          default: {
            if (!hasQuery) return getChapters(b) - getChapters(a);
            const lq = query.toLowerCase();
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();
            const aExact = aTitle === lq ? 0 : aTitle.startsWith(lq) ? 1 : 2;
            const bExact = bTitle === lq ? 0 : bTitle.startsWith(lq) ? 1 : 2;
            if (aExact !== bExact) return aExact - bExact;
            return getChapters(b) - getChapters(a);
          }
        }
      });

      setResults(list);
      setIsSearching(false);

      updateUrl(query.trim(), selectedGenres, selectedStatus, chapterRange, sortBy);
    }, 400);

    return () => clearTimeout(handler);
  }, [query, sortBy, selectedGenres, selectedStatus, chapterRange, updateUrl]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId],
    );
  };
  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };
  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedStatus([]);
    setChapterRange('all');
  };

  const FilterPanel = useMemo(
    () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Bộ lọc
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
              Xóa tất cả
            </Button>
          )}
        </div>

        {/* Chapter range — most-requested filter, surfaced first */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Số chương</h4>
          <div className="space-y-2">
            {chapterRangeOptions.map((range) => (
              <div key={range.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`range-${range.id}`}
                  checked={chapterRange === range.id}
                  onCheckedChange={() =>
                    setChapterRange(chapterRange === range.id ? 'all' : range.id)
                  }
                />
                <Label htmlFor={`range-${range.id}`} className="text-sm cursor-pointer">
                  {range.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Trạng thái</h4>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <div key={status.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.id}`}
                  checked={selectedStatus.includes(status.value)}
                  onCheckedChange={() => toggleStatus(status.value)}
                />
                <Label htmlFor={`status-${status.id}`} className="text-sm cursor-pointer">
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Genre */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Thể loại</h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {genreEntries.map((g) => (
              <div key={g.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`genre-${g.id}`}
                  checked={selectedGenres.includes(g.id)}
                  onCheckedChange={() => toggleGenre(g.id)}
                />
                <Label
                  htmlFor={`genre-${g.id}`}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <span>{g.icon}</span>
                  {g.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFilterCount, hasFilters, chapterRange, selectedStatus, selectedGenres],
  );

  // Active filter chips (above results)
  const ActiveFilterChips = hasFilters && (
    <div className="flex flex-wrap gap-2">
      {selectedGenres.map((genreId) => {
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
      {selectedStatus.map((status) => (
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
          {chapterRangeOptions.find((r) => r.id === chapterRange)?.label}
          <X size={14} className="ml-1" />
        </Badge>
      )}
    </div>
  );

  return (
    <div className="min-h-[60vh]">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={20} />
        </div>
        <Input
          placeholder="Tìm truyện, tác giả..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 pr-10 h-12 text-base bg-muted border-0 rounded-xl"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setQuery('')}
            aria-label="Xóa"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar filters */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-20 rounded-xl border bg-card p-4">
            {FilterPanel}
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar: filter button (mobile) + sort + view */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile filter button */}
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden gap-2 rounded-xl"
                  >
                    <SlidersHorizontal size={16} />
                    Bộ lọc
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:w-96 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Bộ lọc</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">{FilterPanel}</div>
                </SheetContent>
              </Sheet>

              <p className="text-sm text-muted-foreground truncate">
                {isSearching
                  ? 'Đang tìm kiếm...'
                  : hasSearched
                    ? `${results.length} kết quả${query ? ` cho "${query}"` : ''}`
                    : 'Nhập từ khóa hoặc chọn bộ lọc'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] sm:w-40 rounded-xl">
                  <ArrowUpDown size={14} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden sm:flex border rounded-xl overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                  aria-label="Lưới"
                >
                  <Grid3X3 size={16} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                  aria-label="Danh sách"
                >
                  <List size={16} />
                </Button>
              </div>
            </div>
          </div>

          {ActiveFilterChips}

          {/* Results */}
          {isSearching ? (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'space-y-3',
              )}
            >
              {Array.from({ length: 8 }).map((_, i) =>
                viewMode === 'list' ? (
                  <div key={i} className="flex p-4 gap-4 bg-card rounded-2xl border-0 shadow-sm">
                    <Skeleton className="w-20 h-28 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="space-y-2">
                    <Skeleton className="w-full aspect-[3/4] rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ),
              )}
            </div>
          ) : results.length > 0 ? (
            <>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                    : 'space-y-3',
                )}
              >
                {results.map((novel) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    slug={novel.slug || undefined}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    status={novel.status || 'Đang ra'}
                    genre={novel.genres?.[0]}
                    chapters={novel.total_chapters || 0}
                    variant={viewMode === 'list' ? 'horizontal' : 'default'}
                  />
                ))}
              </div>
              <AdPlacement placement="between-content" slot="search-results" />
            </>
          ) : hasSearched ? (
            <>
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Search size={24} className="text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">Không tìm thấy kết quả</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
                </p>
              </div>
              <AdPlacement placement="between-content" slot="search-bottom" />
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Search size={24} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Tìm kiếm truyện</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nhập tên truyện hoặc chọn bộ lọc theo thể loại / số chương để duyệt
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
