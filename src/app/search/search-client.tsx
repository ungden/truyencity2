"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, X, ArrowUpDown, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NovelCard } from '@/components/novel-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { GENRE_CONFIG } from '@/lib/types/genre-config';
import { cn } from '@/lib/utils';

type SearchRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  updated_at: string | null;
  genres: string[] | null;
  chapters: { count: number }[];
};

const sortOptions = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'chapters', label: 'Nhiều chương' },
  { value: 'updated', label: 'Mới cập nhật' },
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
  const initialGenre = searchParams.get('genre') || 'all';
  const initialSort = searchParams.get('sort') || 'relevance';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState(initialSort);
  const [filterGenre, setFilterGenre] = useState(initialGenre);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [hasSearched, setHasSearched] = useState(false);

  // Update URL when params change (without full page reload)
  const updateUrl = useCallback((q: string, genre: string, sort: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (genre !== 'all') params.set('genre', genre);
    if (sort !== 'relevance') params.set('sort', sort);
    const qs = params.toString();
    router.replace(`/search${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router]);

  // Search effect
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setIsSearching(false);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);
      const q = `%${query}%`;

      const { data } = await supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,updated_at,genres,chapters(count)')
        .or(`title.ilike.${q},author.ilike.${q}`)
        .order('updated_at', { ascending: false })
        .limit(60);

      let list = (data || []) as SearchRow[];

      // Genre filter
      if (filterGenre !== 'all') {
        list = list.filter((n) => Array.isArray(n.genres) && n.genres.includes(filterGenre));
      }

      // Sort
      const getChapters = (n: SearchRow) => n.chapters?.[0]?.count || 0;
      list = list.sort((a, b) => {
        switch (sortBy) {
          case 'chapters':
            return getChapters(b) - getChapters(a);
          case 'updated':
            return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
          case 'relevance':
          default: {
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

      // Update URL
      updateUrl(query.trim(), filterGenre, sortBy);
    }, 400);

    return () => clearTimeout(handler);
  }, [query, sortBy, filterGenre, updateUrl]);

  const handleGenreToggle = (genreId: string) => {
    const next = filterGenre === genreId ? 'all' : genreId;
    setFilterGenre(next);
  };

  return (
    <div className="min-h-[60vh] space-y-6">
      {/* Search Input */}
      <div className="relative">
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

      {/* Genre Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={filterGenre === 'all' ? 'default' : 'secondary'}
          className="cursor-pointer px-3 py-1.5 text-sm"
          onClick={() => setFilterGenre('all')}
        >
          Tất cả
        </Badge>
        {genreEntries.map((g) => (
          <Badge
            key={g.id}
            variant={filterGenre === g.id ? 'default' : 'secondary'}
            className="cursor-pointer px-3 py-1.5 text-sm"
            onClick={() => handleGenreToggle(g.id)}
          >
            <span className="mr-1">{g.icon}</span>
            {g.name}
          </Badge>
        ))}
      </div>

      {/* Toolbar: sort + view toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isSearching
            ? 'Đang tìm kiếm...'
            : hasSearched
              ? `${results.length} kết quả${query ? ` cho "${query}"` : ''}`
              : 'Nhập từ khóa để tìm kiếm'}
        </p>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 rounded-xl">
              <ArrowUpDown size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
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

      {/* Results */}
      {isSearching ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'space-y-3'
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
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
            )
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'space-y-3'
        )}>
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
              chapters={novel.chapters?.[0]?.count || 0}
              variant={viewMode === 'list' ? 'horizontal' : 'default'}
            />
          ))}
        </div>
      ) : hasSearched ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Search size={24} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Không tìm thấy kết quả</p>
          <p className="text-sm text-muted-foreground mt-1">
            Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
          </p>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Search size={24} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Tìm kiếm truyện</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập tên truyện hoặc tên tác giả để bắt đầu
          </p>
        </div>
      )}
    </div>
  );
}
