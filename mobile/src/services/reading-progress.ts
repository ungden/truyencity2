/**
 * Mobile Reading Progress Service
 *
 * Port of web src/services/reading-progress.ts, adapted for React Native.
 * - Dual storage: localStorage (instant) + Supabase (cross-device sync)
 * - Conflict resolution: pickBetter (higher chapter > higher scroll % > newer timestamp)
 * - Column name: uses `last_read` to match web + DB index (not `updated_at`)
 */

import { supabase } from "@/lib/supabase";
import { CACHE } from "@/lib/config";

const LOCAL_KEY = CACHE.READING_PROGRESS_KEY;

export type ProgressRecord = {
  novelId: string;
  chapterId?: string;
  chapterNumber: number;
  positionPercent: number;
  lastRead: string; // ISO timestamp
};

// ── Local storage (array format, matching web) ────────────────

function readLocal(): ProgressRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // Handle legacy mobile format: { [novelId]: { chapterNumber, timestamp, positionPercent } }
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
      const migrated: ProgressRecord[] = [];
      for (const [novelId, val] of Object.entries(parsed)) {
        const v = val as { chapterNumber?: number; timestamp?: number; positionPercent?: number };
        if (v && typeof v.chapterNumber === "number") {
          migrated.push({
            novelId,
            chapterNumber: v.chapterNumber,
            positionPercent: v.positionPercent ?? 0,
            lastRead: v.timestamp ? new Date(v.timestamp).toISOString() : new Date().toISOString(),
          });
        }
      }
      // Overwrite with new format
      writeLocal(migrated);
      return migrated;
    }

    return parsed as ProgressRecord[];
  } catch {
    return [];
  }
}

function writeLocal(list: ProgressRecord[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {}
}

export function getLocalProgress(novelId: string): ProgressRecord | undefined {
  return readLocal().find((r) => r.novelId === novelId);
}

export function setLocalProgress(record: ProgressRecord) {
  const list = readLocal().filter((r) => r.novelId !== record.novelId);
  list.push(record);
  writeLocal(list);
}

// ── Server (Supabase) ─────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getServerProgress(novelId: string): Promise<ProgressRecord | undefined> {
  const userId = await getUserId();
  if (!userId) return undefined;

  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("novel_id", novelId)
    .maybeSingle();

  if (error || !data) return undefined;

  return {
    novelId: data.novel_id,
    chapterId: data.chapter_id ?? undefined,
    chapterNumber: data.chapter_number,
    positionPercent: Number(data.position_percent ?? 0),
    lastRead: new Date(data.last_read ?? data.updated_at ?? Date.now()).toISOString(),
  };
}

export async function upsertServerProgress(record: ProgressRecord): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from("reading_progress").upsert(
    {
      user_id: userId,
      novel_id: record.novelId,
      chapter_id: record.chapterId ?? null,
      chapter_number: record.chapterNumber,
      position_percent: record.positionPercent,
      last_read: record.lastRead,
    },
    { onConflict: "user_id,novel_id" }
  );
}

// ── Conflict resolution ───────────────────────────────────────

function pickBetter(a?: ProgressRecord, b?: ProgressRecord): ProgressRecord | undefined {
  if (a && !b) return a;
  if (!a && b) return b;
  if (!a && !b) return undefined;

  // Higher chapter wins
  if (a!.chapterNumber !== b!.chapterNumber) {
    return a!.chapterNumber > b!.chapterNumber ? a! : b!;
  }

  // Same chapter: higher scroll position wins
  if (a!.positionPercent !== b!.positionPercent) {
    return a!.positionPercent > b!.positionPercent ? a! : b!;
  }

  // Same position: newer timestamp wins
  const at = Date.parse(a!.lastRead);
  const bt = Date.parse(b!.lastRead);
  return at >= bt ? a! : b!;
}

/**
 * Resolve local vs server progress — pick the "better" one and sync both.
 * This enables cross-device sync: reading on web → mobile picks it up.
 */
export async function resolveProgress(novelId: string): Promise<ProgressRecord | undefined> {
  try {
    const [local, server] = await Promise.all([
      Promise.resolve(getLocalProgress(novelId)),
      getServerProgress(novelId),
    ]);

    const chosen = pickBetter(local, server);
    if (!chosen) return undefined;

    // Sync both sides
    setLocalProgress(chosen);
    await upsertServerProgress(chosen).catch(() => {});

    return chosen;
  } catch (error) {
    console.warn("[reading-progress] resolveProgress failed:", error);
    return getLocalProgress(novelId);
  }
}

/**
 * Save progress to both local and server.
 * Called on scroll events (throttled by caller).
 */
export async function saveProgress(record: ProgressRecord): Promise<void> {
  try {
    setLocalProgress(record);
    await upsertServerProgress(record);
  } catch (error) {
    console.warn("[reading-progress] saveProgress server failed:", error);
    // Local is already saved
  }
}

/**
 * Get continue reading target for a novel (chapter + scroll position).
 */
export async function getContinueTarget(
  novelId: string
): Promise<{ chapterNumber: number; positionPercent: number } | null> {
  const resolved = await resolveProgress(novelId);
  if (!resolved) return null;
  return {
    chapterNumber: resolved.chapterNumber,
    positionPercent: resolved.positionPercent,
  };
}

export async function clearProgress(novelId: string): Promise<void> {
  try {
    const list = readLocal().filter((r) => r.novelId !== novelId);
    writeLocal(list);

    const userId = await getUserId();
    if (userId) {
      await supabase
        .from("reading_progress")
        .delete()
        .eq("user_id", userId)
        .eq("novel_id", novelId);
    }
  } catch (error) {
    console.warn("[reading-progress] clearProgress failed:", error);
  }
}
