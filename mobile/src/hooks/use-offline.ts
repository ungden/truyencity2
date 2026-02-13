import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  batchSaveChapters,
  saveNovelMeta,
  updateNovelDownloadCount,
  getDownloadedChapterNumbers,
  getOfflineNovel,
  deleteNovelOffline,
  isNovelDownloaded,
  getOfflineNovels,
  type OfflineChapter,
  type OfflineNovel,
} from "@/lib/offline-db";

// ─── Download State Machine ──────────────────────────────────

export type DownloadStatus = "idle" | "downloading" | "complete" | "error";

interface UseOfflineDownloadReturn {
  status: DownloadStatus;
  /** 0 to 1 */
  progress: number;
  downloadedCount: number;
  totalCount: number;
  /** Is the full novel downloaded? */
  isDownloaded: boolean;
  /** Start downloading all chapters */
  startDownload: () => void;
  /** Cancel in-progress download */
  cancelDownload: () => void;
  /** Delete all offline data for this novel */
  deleteDownload: () => void;
  /** Error message if status is 'error' */
  errorMessage: string | null;
}

const BATCH_SIZE = 20;

export function useOfflineDownload(
  novelId: string | null,
  novelTitle?: string,
  novelSlug?: string | null,
  novelCoverUrl?: string | null
): UseOfflineDownloadReturn {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Check initial download state
  useEffect(() => {
    if (novelId) {
      const done = isNovelDownloaded(novelId);
      setDownloaded(done);
      if (done) {
        const meta = getOfflineNovel(novelId);
        if (meta) {
          setDownloadedCount(meta.downloaded_chapters);
          setTotalCount(meta.total_chapters);
        }
      }
    }
  }, [novelId]);

  const startDownload = useCallback(async () => {
    if (!novelId) return;

    cancelRef.current = false;
    setStatus("downloading");
    setErrorMessage(null);
    setProgress(0);

    try {
      // 1. Get all chapter IDs + numbers from Supabase (no content yet)
      const { data: chapterList, error: listError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("novel_id", novelId)
        .order("chapter_number");

      if (listError || !chapterList) {
        throw new Error(listError?.message || "Không lấy được danh sách chương");
      }

      const total = chapterList.length;
      setTotalCount(total);

      if (total === 0) {
        setStatus("complete");
        setDownloaded(true);
        return;
      }

      // 2. Save novel metadata
      saveNovelMeta({
        novel_id: novelId,
        title: novelTitle || "",
        slug: novelSlug || null,
        cover_url: novelCoverUrl || null,
        total_chapters: total,
        downloaded_chapters: 0,
        downloaded_at: new Date().toISOString(),
      });

      // 3. Check which chapters are already downloaded
      const existingNumbers = new Set(getDownloadedChapterNumbers(novelId));
      const toDownload = chapterList.filter(
        (c) => !existingNumbers.has(c.chapter_number)
      );

      let completed = existingNumbers.size;
      setDownloadedCount(completed);
      setProgress(total > 0 ? completed / total : 0);

      // 4. Download in batches
      for (let i = 0; i < toDownload.length; i += BATCH_SIZE) {
        if (cancelRef.current) {
          setStatus("idle");
          return;
        }

        const batch = toDownload.slice(i, i + BATCH_SIZE);
        const ids = batch.map((c) => c.id);

        const { data: fullChapters, error: batchError } = await supabase
          .from("chapters")
          .select("id, novel_id, chapter_number, title, content")
          .in("id", ids);

        if (batchError || !fullChapters) {
          throw new Error(
            batchError?.message || `Lỗi tải batch ${i / BATCH_SIZE + 1}`
          );
        }

        // Convert to OfflineChapter format and batch insert
        const offlineChapters: OfflineChapter[] = fullChapters.map((ch) => ({
          id: ch.id,
          novel_id: ch.novel_id,
          chapter_number: ch.chapter_number,
          title: ch.title,
          content: ch.content,
          downloaded_at: new Date().toISOString(),
        }));

        batchSaveChapters(offlineChapters);

        completed += fullChapters.length;
        setDownloadedCount(completed);
        setProgress(total > 0 ? completed / total : 0);
        updateNovelDownloadCount(novelId, completed);
      }

      // 5. Mark complete
      setStatus("complete");
      setDownloaded(true);
      updateNovelDownloadCount(novelId, total);
    } catch (err: any) {
      console.error("Download error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Lỗi khi tải truyện");
    }
  }, [novelId, novelTitle, novelSlug, novelCoverUrl]);

  const cancelDownload = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const deleteDownload = useCallback(() => {
    if (!novelId) return;
    deleteNovelOffline(novelId);
    setStatus("idle");
    setProgress(0);
    setDownloadedCount(0);
    setTotalCount(0);
    setDownloaded(false);
  }, [novelId]);

  return {
    status,
    progress,
    downloadedCount,
    totalCount,
    isDownloaded: downloaded,
    startDownload,
    cancelDownload,
    deleteDownload,
    errorMessage,
  };
}

// ─── Offline Novels List Hook ────────────────────────────────

interface UseOfflineNovelsReturn {
  novels: OfflineNovel[];
  refresh: () => void;
}

export function useOfflineNovels(): UseOfflineNovelsReturn {
  const [novels, setNovels] = useState<OfflineNovel[]>([]);

  const refresh = useCallback(() => {
    setNovels(getOfflineNovels());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { novels, refresh };
}
