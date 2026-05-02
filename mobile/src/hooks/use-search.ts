import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import type { Novel } from "@/lib/types";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT = 10;
const DEBOUNCE_MS = 300;
const NOVEL_LIST_FIELDS =
  "id,title,slug,author,cover_url,genres,status,chapter_count,created_at";

/** novels.status DB values are Vietnamese strings — match exactly. */
export const NOVEL_STATUS_VALUES = ["Đang ra", "Hoàn thành", "Tạm dừng"] as const;
export type NovelStatusValue = (typeof NOVEL_STATUS_VALUES)[number];

export interface SearchFilters {
  /** Genre filter — match novels.genres array (any match) */
  genres?: string[];
  /** Status filter — multi-select; empty array = all */
  statuses?: NovelStatusValue[];
  /** Minimum chapter count */
  minChapters?: number;
  /** Maximum chapter count */
  maxChapters?: number;
  /** Sort field */
  sortBy?: "updated_at" | "chapter_count" | "created_at";
  /** Sort direction */
  sortDir?: "asc" | "desc";
}

const DEFAULT_FILTERS: SearchFilters = {
  genres: [],
  statuses: [],
  minChapters: undefined,
  maxChapters: undefined,
  sortBy: "chapter_count",
  sortDir: "desc",
};

export function useSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(storage.get<string[]>(RECENT_SEARCHES_KEY, []));
    return storage.subscribe(RECENT_SEARCHES_KEY, () => {
      setRecentSearches(storage.get<string[]>(RECENT_SEARCHES_KEY, []));
    });
  }, []);

  const searchNovels = useCallback(async (text: string, currentFilters: SearchFilters) => {
    // Cancel any in-flight request
    abortRef.current?.abort();

    const trimmed = text.trim();
    const hasFilters =
      (currentFilters.genres && currentFilters.genres.length > 0) ||
      (currentFilters.statuses && currentFilters.statuses.length > 0) ||
      currentFilters.minChapters != null ||
      currentFilters.maxChapters != null;

    // Allow filter-only search (no query text) when filters are active
    if (!trimmed && !hasFilters) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let q = supabase.from("novels").select(NOVEL_LIST_FIELDS);

      if (trimmed) q = q.ilike("title", `%${trimmed}%`);
      if (currentFilters.genres && currentFilters.genres.length > 0) {
        q = q.overlaps("genres", currentFilters.genres);
      }
      if (currentFilters.statuses && currentFilters.statuses.length > 0) {
        q = q.in("status", currentFilters.statuses);
      }
      if (currentFilters.minChapters != null) {
        q = q.gte("chapter_count", currentFilters.minChapters);
      }
      if (currentFilters.maxChapters != null) {
        q = q.lte("chapter_count", currentFilters.maxChapters);
      }

      const sortField = currentFilters.sortBy || "chapter_count";
      const sortAsc = currentFilters.sortDir === "asc";
      q = q.order(sortField, { ascending: sortAsc, nullsFirst: false }).limit(50).abortSignal(controller.signal);

      const { data, error } = await q;

      if (controller.signal.aborted) return;
      if (error) throw error;
      setResults(data || []);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[useSearch] query failed:", err);
      setResults([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);

      if (timerRef.current) clearTimeout(timerRef.current);

      const hasFilters =
        (filters.genres && filters.genres.length > 0) ||
        (filters.statuses && filters.statuses.length > 0) ||
        filters.minChapters != null ||
        filters.maxChapters != null;

      if (!text.trim() && !hasFilters) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      timerRef.current = setTimeout(() => {
        searchNovels(text, filters);
      }, DEBOUNCE_MS);
    },
    [searchNovels, filters]
  );

  const setFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      const merged = { ...filters, ...newFilters };
      setFiltersState(merged);
      // Re-trigger search with new filters
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        searchNovels(query, merged);
      }, DEBOUNCE_MS);
    },
    [filters, query, searchNovels]
  );

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    if (query.trim()) {
      searchNovels(query, DEFAULT_FILTERS);
    } else {
      setResults([]);
    }
  }, [query, searchNovels]);

  const saveRecentSearch = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const prev = storage.get<string[]>(RECENT_SEARCHES_KEY, []);
    const filtered = prev.filter((s) => s !== trimmed);
    const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
    storage.set(RECENT_SEARCHES_KEY, next);
  }, []);

  const removeRecentSearch = useCallback((text: string) => {
    const prev = storage.get<string[]>(RECENT_SEARCHES_KEY, []);
    storage.set(
      RECENT_SEARCHES_KEY,
      prev.filter((s) => s !== text)
    );
  }, []);

  const clearRecentSearches = useCallback(() => {
    storage.set(RECENT_SEARCHES_KEY, []);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  return {
    query,
    results,
    loading,
    recentSearches,
    filters,
    onChangeText,
    setFilters,
    resetFilters,
    saveRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    clearSearch,
  };
}
