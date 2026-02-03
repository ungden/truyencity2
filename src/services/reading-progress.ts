"use client";

import { supabase } from "@/integrations/supabase/client";
import { CACHE } from "@/lib/config";

const LOCAL_KEY = CACHE.READING_PROGRESS_KEY;

export type ProgressRecord = {
  novelId: string;
  chapterId?: string;
  chapterNumber: number;
  positionPercent: number;
  lastRead: string;
};

function readLocal(): ProgressRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ProgressRecord[];
  } catch {
    return [];
  }
}

function writeLocal(list: ProgressRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

export function getLocalProgress(novelId: string): ProgressRecord | undefined {
  const list = readLocal();
  return list.find((r) => r.novelId === novelId);
}

export function setLocalProgress(record: ProgressRecord) {
  const list = readLocal().filter((r) => r.novelId !== record.novelId);
  list.push(record);
  writeLocal(list);
}

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
    lastRead: new Date(data.last_read).toISOString(),
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

function pickBetter(a?: ProgressRecord, b?: ProgressRecord): ProgressRecord | undefined {
  if (a && !b) return a;
  if (!a && b) return b;
  if (!a && !b) return undefined;

  if (a!.chapterNumber !== b!.chapterNumber) {
    return a!.chapterNumber > b!.chapterNumber ? a! : b!;
  }

  if (a!.positionPercent !== b!.positionPercent) {
    return a!.positionPercent > b!.positionPercent ? a! : b!;
  }

  const at = Date.parse(a!.lastRead);
  const bt = Date.parse(b!.lastRead);
  return at >= bt ? a! : b!;
}

export async function resolveProgress(novelId: string): Promise<ProgressRecord | undefined> {
  try {
    const [local, server] = await Promise.all([
      Promise.resolve(getLocalProgress(novelId)),
      getServerProgress(novelId),
    ]);
    
    const chosen = pickBetter(local, server);
    if (!chosen) return undefined;

    setLocalProgress(chosen);
    await upsertServerProgress(chosen);
    
    return chosen;
  } catch (error) {
    console.error('Error resolving progress:', error);
    return getLocalProgress(novelId);
  }
}

export async function saveProgress(record: ProgressRecord): Promise<void> {
  try {
    setLocalProgress(record);
    await upsertServerProgress(record);
  } catch (error) {
    console.error('Error saving progress:', error);
    setLocalProgress(record);
  }
}

export async function getContinueTarget(novelId: string): Promise<{
  chapterNumber: number;
  positionPercent: number;
} | null> {
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
    console.error('Error clearing progress:', error);
  }
}