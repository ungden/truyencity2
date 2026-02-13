// Offline database — SQLite storage for downloaded chapters
// Uses expo-sqlite which is already installed for localStorage polyfill

import * as SQLite from "expo-sqlite";

// ─── Types ────────────────────────────────────────────────────

export interface OfflineChapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string | null;
  downloaded_at: string;
}

export interface OfflineNovel {
  novel_id: string;
  title: string;
  slug: string | null;
  cover_url: string | null;
  total_chapters: number;
  downloaded_chapters: number;
  downloaded_at: string;
}

// ─── Database Instance ────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("truyencity-offline.db");
    // Run migrations on first access
    db.execSync(`
      CREATE TABLE IF NOT EXISTS offline_chapters (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        chapter_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        downloaded_at TEXT NOT NULL,
        UNIQUE(novel_id, chapter_number)
      );
      CREATE INDEX IF NOT EXISTS idx_offline_novel_chapter
        ON offline_chapters(novel_id, chapter_number);

      CREATE TABLE IF NOT EXISTS offline_novels (
        novel_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        cover_url TEXT,
        total_chapters INTEGER DEFAULT 0,
        downloaded_chapters INTEGER DEFAULT 0,
        downloaded_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

// ─── Chapter CRUD ─────────────────────────────────────────────

export function saveChapterOffline(chapter: OfflineChapter): void {
  const d = getDB();
  d.runSync(
    `INSERT OR REPLACE INTO offline_chapters
     (id, novel_id, chapter_number, title, content, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      chapter.id,
      chapter.novel_id,
      chapter.chapter_number,
      chapter.title,
      chapter.content,
      chapter.downloaded_at,
    ]
  );
}

export function getChapterOffline(
  novelId: string,
  chapterNumber: number
): OfflineChapter | null {
  const d = getDB();
  const result = d.getFirstSync<OfflineChapter>(
    `SELECT * FROM offline_chapters
     WHERE novel_id = ? AND chapter_number = ?`,
    [novelId, chapterNumber]
  );
  return result ?? null;
}

export function getDownloadedChapterNumbers(novelId: string): number[] {
  const d = getDB();
  const rows = d.getAllSync<{ chapter_number: number }>(
    `SELECT chapter_number FROM offline_chapters
     WHERE novel_id = ?
     ORDER BY chapter_number`,
    [novelId]
  );
  return rows.map((r) => r.chapter_number);
}

export function getDownloadedChapterCount(novelId: string): number {
  const d = getDB();
  const result = d.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM offline_chapters WHERE novel_id = ?`,
    [novelId]
  );
  return result?.cnt ?? 0;
}

export function deleteChaptersForNovel(novelId: string): void {
  const d = getDB();
  d.runSync(`DELETE FROM offline_chapters WHERE novel_id = ?`, [novelId]);
}

/**
 * Batch insert chapters within a transaction for performance.
 */
export function batchSaveChapters(chapters: OfflineChapter[]): void {
  if (chapters.length === 0) return;
  const d = getDB();
  d.withTransactionSync(() => {
    const stmt = d.prepareSync(
      `INSERT OR REPLACE INTO offline_chapters
       (id, novel_id, chapter_number, title, content, downloaded_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    try {
      for (const ch of chapters) {
        stmt.executeSync([
          ch.id,
          ch.novel_id,
          ch.chapter_number,
          ch.title,
          ch.content,
          ch.downloaded_at,
        ]);
      }
    } finally {
      stmt.finalizeSync();
    }
  });
}

// ─── Novel Meta CRUD ──────────────────────────────────────────

export function saveNovelMeta(novel: OfflineNovel): void {
  const d = getDB();
  d.runSync(
    `INSERT OR REPLACE INTO offline_novels
     (novel_id, title, slug, cover_url, total_chapters, downloaded_chapters, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      novel.novel_id,
      novel.title,
      novel.slug,
      novel.cover_url,
      novel.total_chapters,
      novel.downloaded_chapters,
      novel.downloaded_at,
    ]
  );
}

export function updateNovelDownloadCount(
  novelId: string,
  downloadedChapters: number
): void {
  const d = getDB();
  d.runSync(
    `UPDATE offline_novels SET downloaded_chapters = ? WHERE novel_id = ?`,
    [downloadedChapters, novelId]
  );
}

export function getOfflineNovels(): OfflineNovel[] {
  const d = getDB();
  return d.getAllSync<OfflineNovel>(
    `SELECT * FROM offline_novels ORDER BY downloaded_at DESC`
  );
}

export function getOfflineNovel(novelId: string): OfflineNovel | null {
  const d = getDB();
  const result = d.getFirstSync<OfflineNovel>(
    `SELECT * FROM offline_novels WHERE novel_id = ?`,
    [novelId]
  );
  return result ?? null;
}

export function deleteNovelOffline(novelId: string): void {
  const d = getDB();
  d.withTransactionSync(() => {
    d.runSync(`DELETE FROM offline_chapters WHERE novel_id = ?`, [novelId]);
    d.runSync(`DELETE FROM offline_novels WHERE novel_id = ?`, [novelId]);
  });
}

export function isNovelDownloaded(novelId: string): boolean {
  const novel = getOfflineNovel(novelId);
  if (!novel) return false;
  return novel.downloaded_chapters >= novel.total_chapters && novel.total_chapters > 0;
}

// ─── Storage Stats ────────────────────────────────────────────

export function getOfflineStorageSize(): number {
  const d = getDB();
  const result = d.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(LENGTH(content)), 0) as total FROM offline_chapters`
  );
  return result?.total ?? 0;
}

export function getNovelStorageSize(novelId: string): number {
  const d = getDB();
  const result = d.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(LENGTH(content)), 0) as total
     FROM offline_chapters WHERE novel_id = ?`,
    [novelId]
  );
  return result?.total ?? 0;
}

export function deleteAllOfflineData(): void {
  const d = getDB();
  d.withTransactionSync(() => {
    d.runSync(`DELETE FROM offline_chapters`);
    d.runSync(`DELETE FROM offline_novels`);
  });
}

/**
 * Format bytes to human-readable string (Vietnamese)
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
