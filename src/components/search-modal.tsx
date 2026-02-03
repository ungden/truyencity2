"use client";

import React, { useState, useEffect } from 'react';
import { Search, X, Clock, TrendingUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NovelCard } from '@/components/novel-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const recentSearches = [
  'Đấu Phá Thương Khung',
  'Võ Luyện Đỉnh Phong',
  'Tu Tiên Truyện'
];

const trendingSearches = [
  { term: 'Tiên Hiệp' },
  { term: 'Huyền Huyễn' },
  { term: 'Đô Thị' },
  { term: 'Khoa Huyễn' }
];

type SearchRow = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  updated_at: string | null;
  genres?: string[] | null;
};

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterGenre, setFilterGenre] = useState('all');

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const q = `%${query}%`;

      const { data } = await supabase
        .from('novels')
        .select('id,title,author,cover_url,status,updated_at,genres') // thêm genres
        .or(`title.ilike.${q},author.ilike.${q}`)
        .order('updated_at', { ascending: false });

      let list = (data || []) as SearchRow[];

      if (filterGenre !== 'all') {
        list = list.filter((n) => Array.isArray(n.genres) && n.genres.includes(filterGenre));
      }

      list = list.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return 0;
          case 'views':
            return 0;
          case 'updated':
            return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
          case 'relevance':
          default:
            return 0;
        }
      });

      setResults(list as SearchRow[]);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(handler);
  }, [query, sortBy, filterGenre]);

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[85vh] p-0 bg-background border border-border rounded-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="sr-only">Tìm kiếm truyện</DialogTitle>

          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Search size={18} />
            </div>
            <Input
              placeholder="Tìm truyện, tác giả..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 bg-muted border-0 rounded-xl h-11 text-sm"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-lg hover:bg-accent"
                onClick={clearSearch}
              >
                <X size={16} />
              </Button>
            )}
          </div>

          {query && (
            <div className="flex gap-2 mt-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-28 rounded-lg border border-border bg-background text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="relevance">Liên quan</SelectItem>
                  <SelectItem value="rating">Đánh giá</SelectItem>
                  <SelectItem value="views">Lượt đọc</SelectItem>
                  <SelectItem value="updated">Cập nhật</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterGenre} onValueChange={setFilterGenre}>
                <SelectTrigger className="w-28 rounded-lg border border-border bg-background text-sm h-9">
                  <Filter size={14} className="mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="tien-hiep">Tiên Hiệp</SelectItem>
                  <SelectItem value="huyen-huyen">Huyền Huyễn</SelectItem>
                  <SelectItem value="do-thi">Đô Thị</SelectItem>
                  <SelectItem value="khoa-huyen">Khoa Huyễn</SelectItem>
                  <SelectItem value="lich-su">Lịch Sử</SelectItem>
                  <SelectItem value="dong-nhan">Đồng Nhân</SelectItem>
                  <SelectItem value="vong-du">Võng Du</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!query ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-muted-foreground" />
                  <h3 className="font-medium text-sm text-muted-foreground">Tìm kiếm gần đây</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <Badge
                      key={term}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent transition-colors rounded-lg px-3 py-1.5 bg-muted"
                      onClick={() => handleSearch(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-muted-foreground" />
                  <h3 className="font-medium text-sm text-muted-foreground">Thể loại phổ biến</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {trendingSearches.map((item) => (
                    <button
                      key={item.term}
                      className="p-3 rounded-xl bg-muted hover:bg-accent text-left transition-colors"
                      onClick={() => handleSearch(item.term)}
                    >
                      <span className="font-medium text-sm">{item.term}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Search size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">Đang tìm kiếm...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-4">
                    Tìm thấy {results.length} kết quả cho "{query}"
                  </p>
                  {results.map((novel) => (
                    <div key={novel.id} onClick={onClose}>
                      <NovelCard
                        id={novel.id}
                        title={novel.title}
                        author={novel.author || 'N/A'}
                        cover={novel.cover_url || ''}
                        rating={4.5}
                        views={1000}
                        status={novel.status || 'Đang ra'}
                        variant="horizontal"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">Không tìm thấy kết quả</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thử tìm kiếm với từ khóa khác
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};