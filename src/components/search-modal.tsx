"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Filter, Trash2 } from 'lucide-react';
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

const STORAGE_KEY = 'truyencity_recent_searches';
const MAX_RECENT = 8;

const trendingSearches = [
  { term: 'Tien Hiep' },
  { term: 'Huyen Huyen' },
  { term: 'Do Thi' },
  { term: 'Khoa Huyen' },
  { term: 'Ngon Tinh' },
  { term: 'Lich Su' },
];

type SearchRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  updated_at: string | null;
  genres?: string[] | null;
  chapters: { count: number }[];
};

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentSearches();
    const updated = [term, ...existing.filter(s => s !== term)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silent
  }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterGenre, setFilterGenre] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const q = `%${query}%`;

      const { data } = await supabase
        .from('novels')
        .select('id,slug,title,author,cover_url,status,updated_at,genres,chapters(count)')
        .or(`title.ilike.${q},author.ilike.${q}`)
        .order('updated_at', { ascending: false })
        .limit(50);

      let list = (data || []) as SearchRow[];

      // Genre filter
      if (filterGenre !== 'all') {
        list = list.filter((n) => Array.isArray(n.genres) && n.genres.includes(filterGenre));
      }

      // Sort
      list = list.sort((a, b) => {
        const getChapters = (n: SearchRow) => n.chapters?.[0]?.count || 0;
        switch (sortBy) {
          case 'chapters':
            return getChapters(b) - getChapters(a);
          case 'updated':
            return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
          case 'relevance':
          default: {
            // Exact title match first, then starts-with, then contains
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

      // Save to recent searches
      if (query.trim().length >= 2) {
        saveRecentSearch(query.trim());
      }

      setResults(list);
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

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[85vh] p-0 bg-background border border-border rounded-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="sr-only">Tim kiem truyen</DialogTitle>

          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <Search size={18} />
            </div>
            <Input
              placeholder="Tim truyen, tac gia..."
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
                  <SelectItem value="relevance">Lien quan</SelectItem>
                  <SelectItem value="chapters">Nhieu chuong</SelectItem>
                  <SelectItem value="updated">Cap nhat</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterGenre} onValueChange={setFilterGenre}>
                <SelectTrigger className="w-28 rounded-lg border border-border bg-background text-sm h-9">
                  <Filter size={14} className="mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">Tat ca</SelectItem>
                  <SelectItem value="tien-hiep">Tien Hiep</SelectItem>
                  <SelectItem value="huyen-huyen">Huyen Huyen</SelectItem>
                  <SelectItem value="do-thi">Do Thi</SelectItem>
                  <SelectItem value="khoa-huyen">Khoa Huyen</SelectItem>
                  <SelectItem value="lich-su">Lich Su</SelectItem>
                  <SelectItem value="dong-nhan">Dong Nhan</SelectItem>
                  <SelectItem value="vong-du">Vong Du</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!query ? (
            <div className="space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-muted-foreground" />
                      <h3 className="font-medium text-sm text-muted-foreground">Tim kiem gan day</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={handleClearRecent}
                    >
                      <Trash2 size={12} className="mr-1" />
                      Xoa
                    </Button>
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
              )}

              {/* Trending */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-muted-foreground" />
                  <h3 className="font-medium text-sm text-muted-foreground">The loai pho bien</h3>
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
                  <p className="text-muted-foreground text-sm">Dang tim kiem...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-4">
                    Tim thay {results.length} ket qua cho &quot;{query}&quot;
                  </p>
                  {results.map((novel) => (
                    <div key={novel.id} onClick={onClose}>
                      <NovelCard
                        id={novel.id}
                        slug={novel.slug || undefined}
                        title={novel.title}
                        author={novel.author || 'N/A'}
                        cover={novel.cover_url || ''}
                        status={novel.status || 'Dang ra'}
                        genre={novel.genres?.[0]}
                        chapters={novel.chapters?.[0]?.count || 0}
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
                  <p className="text-muted-foreground text-sm">Khong tim thay ket qua</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thu tim kiem voi tu khoa khac
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
