import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import type { Novel } from "@/lib/types";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT = 10;
const DEBOUNCE_MS = 300;
const NOVEL_LIST_FIELDS =
  "id,title,slug,author,cover_url,genres,status,chapter_count,rating,created_at";

export function useSearch() {
  const [query, setQuery] = useState("");
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

  const searchNovels = useCallback(async (text: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();

    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data, error } = await supabase
        .from("novels")
        .select(NOVEL_LIST_FIELDS)
        .ilike("title", `%${trimmed}%`)
        .order("chapter_count", { ascending: false, nullsFirst: false })
        .limit(20)
        .abortSignal(controller.signal);

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

      if (!text.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      timerRef.current = setTimeout(() => {
        searchNovels(text);
      }, DEBOUNCE_MS);
    },
    [searchNovels]
  );

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
    onChangeText,
    saveRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    clearSearch,
  };
}
