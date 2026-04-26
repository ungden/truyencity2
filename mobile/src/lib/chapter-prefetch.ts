/**
 * Chapter prefetch cache.
 *
 * Bridges the gap between auto-advance and the next chapter's TTS start.
 * Without this, when chapter N's audio ends in background, we navigate to
 * N+1 and only THEN fetch its content over the network — adding 200-1000ms
 * of silence (or worse, failing entirely if the JS task is throttled by iOS).
 *
 * With prefetch, by the time the user finishes chapter N, chapter N+1's
 * content is already in this in-memory map and `fetchChapter` returns
 * synchronously → `tts.speak()` fires immediately on mount.
 *
 * Cache eviction: simple FIFO, capped at ~10 chapters (~250 KB worst case).
 */
import { supabase } from "@/lib/supabase";
import { getChapterOffline } from "@/lib/offline-db";

export type CachedChapter = {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string | null;
  content: string;
  created_at?: string;
  totalChapters: number;
  novelId: string;
  novelTitle: string;
  novelCover?: string;
};

const MAX_CACHE = 10;
const cache = new Map<string, CachedChapter>();

function key(slug: string, chapterNumber: number): string {
  return `${slug}:${chapterNumber}`;
}

export function getCachedChapter(
  slug: string,
  chapterNumber: number
): CachedChapter | undefined {
  return cache.get(key(slug, chapterNumber));
}

export function setCachedChapter(
  slug: string,
  chapterNumber: number,
  data: CachedChapter
): void {
  const k = key(slug, chapterNumber);
  // FIFO eviction — drop the oldest entry once we hit the cap.
  if (cache.size >= MAX_CACHE && !cache.has(k)) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(k, data);
}

export function clearChapterCache(): void {
  cache.clear();
}

/**
 * Prefetch chapter `chapterNumber` of novel `slug`. No-op if already cached.
 * Resolves silently on failure — prefetch is best-effort.
 */
export async function prefetchChapter(
  slug: string,
  chapterNumber: number,
  novelMeta: { id: string; title: string; cover_url?: string | null }
): Promise<void> {
  if (chapterNumber < 1) return;
  const k = key(slug, chapterNumber);
  if (cache.has(k)) return;

  try {
    // Try offline-first — same precedence as the live fetch path.
    const offlineChapter = getChapterOffline(novelMeta.id, chapterNumber);
    if (offlineChapter?.content) {
      setCachedChapter(slug, chapterNumber, {
        id: offlineChapter.id,
        novel_id: offlineChapter.novel_id,
        chapter_number: offlineChapter.chapter_number,
        title: offlineChapter.title,
        content: offlineChapter.content,
        created_at: offlineChapter.downloaded_at,
        totalChapters: 0, // unknown offline; fetcher will resolve later
        novelId: novelMeta.id,
        novelTitle: novelMeta.title,
        novelCover: novelMeta.cover_url || undefined,
      });
      return;
    }
  } catch {
    // ignore offline failures
  }

  try {
    const [chapterRes, countRes] = await Promise.all([
      supabase
        .from("chapters")
        .select("*")
        .eq("novel_id", novelMeta.id)
        .eq("chapter_number", chapterNumber)
        .single(),
      supabase
        .from("chapters")
        .select("id", { count: "exact", head: true })
        .eq("novel_id", novelMeta.id),
    ]);

    if (chapterRes.error || !chapterRes.data) return;

    setCachedChapter(slug, chapterNumber, {
      ...chapterRes.data,
      totalChapters: countRes.count || 0,
      novelId: novelMeta.id,
      novelTitle: novelMeta.title,
      novelCover: novelMeta.cover_url || undefined,
    });
  } catch (err) {
    console.warn("[prefetch] chapter fetch failed:", err);
  }
}
