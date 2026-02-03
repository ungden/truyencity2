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
import { AppContainer, TwoColumnLayout, ContentCard, Section } from '@/components/layout';
import { cn } from '@/lib/utils';
import { GENRE_CONFIG } from '@/lib/types/genre-config';

type NovelRow = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
  updated_at: string | null;
};

const NovelCardSkeleton = ({ variant = 'default' }: { variant?: 'default' | 'horizontal' }) => {
  if (variant === 'horizontal') {
    return (
      <div className="flex p-4 gap-4 bg-white dark:bg-gray-800 rounded-2xl border-0 shadow-modern">
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

export default function BrowsePage() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [novels, setNovels] = useState<NovelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('novels')
        .select('id,title,author,cover_url,status,genres,updated_at')
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (!cancelled) {
        setNovels(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = React.useMemo(() => {
    let list = [...novels];

    if (selectedGenres.length > 0) {
      list = list.filter(novel => {
        const g = novel.genres || [];
        return selectedGenres.some(selectedId => g.includes(selectedId));
      });
    }

    if (selectedStatus.length > 0) {
      list = list.filter(novel => selectedStatus.includes(novel.status || ''));
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return 0;
        case 'views':
          return 0;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'updated':
        default:
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });

    return list;
  }, [novels, selectedGenres, selectedStatus, sortBy]);

  const handleNovelClick = (novelId: string) => {
    console.log('Navigate to novel:', novelId);
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
  };

  const hasFilters = selectedGenres.length > 0 || selectedStatus.length > 0;

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
    </div>
  );

  // Main content
  const MainContent = (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Đang tải...' : `Hiển thị ${filtered.length} truyện`}
        </p>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 rounded-xl">
              <ArrowUpDown size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Mới cập nhật</SelectItem>
              <SelectItem value="rating">Đánh giá cao</SelectItem>
              <SelectItem value="views">Nhiều lượt đọc</SelectItem>
              <SelectItem value="title">Tên A-Z</SelectItem>
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
              title={novel.title}
              author={novel.author || 'N/A'}
              cover={novel.cover_url || ''}
              rating={4.5}
              views={1000}
              status={novel.status || 'Đang ra'}
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
                <SelectTrigger className="w-28 rounded-xl">
                  <ArrowUpDown size={14} className="mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Cập nhật</SelectItem>
                  <SelectItem value="rating">Đánh giá</SelectItem>
                  <SelectItem value="views">Lượt đọc</SelectItem>
                  <SelectItem value="title">Tên A-Z</SelectItem>
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
            {loading ? 'Đang tải...' : `Hiển thị ${filtered.length} truyện`}
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
                  title={novel.title}
                  author={novel.author || 'N/A'}
                  cover={novel.cover_url || ''}
                  rating={4.5}
                  views={1000}
                  status={novel.status || 'Đang ra'}
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
        </div>
      </AppContainer>
    </div>
  );
}