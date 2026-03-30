/**
 * Mobile Reading Sessions Service
 *
 * Port of web src/services/reading-sessions.ts.
 * Tracks reading sessions (duration) and marks chapters as read.
 */

import { supabase } from "@/lib/supabase";

export type SessionId = string;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Start a new reading session. Returns the session ID or null.
 */
export async function startSession(params: {
  novelId: string;
  chapterId: string;
}): Promise<SessionId | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("reading_sessions")
      .insert({
        user_id: userId,
        novel_id: params.novelId,
        chapter_id: params.chapterId,
        started_at: new Date().toISOString(),
        duration_seconds: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[reading-sessions] startSession failed:", error.message);
      return null;
    }
    return data.id as string;
  } catch (error) {
    console.warn("[reading-sessions] startSession error:", error);
    return null;
  }
}

/**
 * Heartbeat: update session duration (called every 30s while reading).
 */
export async function updateSessionDuration(
  sessionId: SessionId,
  totalSeconds: number
): Promise<void> {
  if (!sessionId) return;

  try {
    await supabase
      .from("reading_sessions")
      .update({
        duration_seconds: Math.max(0, Math.floor(totalSeconds)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } catch (error) {
    console.warn("[reading-sessions] updateSessionDuration error:", error);
  }
}

/**
 * End a reading session (sets ended_at + final duration).
 */
export async function endSession(
  sessionId: SessionId,
  totalSeconds: number
): Promise<void> {
  if (!sessionId) return;

  try {
    const endedAt = new Date().toISOString();
    await supabase
      .from("reading_sessions")
      .update({
        duration_seconds: Math.max(0, Math.floor(totalSeconds)),
        ended_at: endedAt,
        updated_at: endedAt,
      })
      .eq("id", sessionId);
  } catch (error) {
    console.warn("[reading-sessions] endSession error:", error);
  }
}

/**
 * Mark a chapter as read (upsert to chapter_reads).
 * Called when scroll reaches >= 95%.
 */
export async function markChapterRead(params: {
  novelId: string;
  chapterId: string;
}): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    await supabase.from("chapter_reads").upsert(
      {
        user_id: userId,
        novel_id: params.novelId,
        chapter_id: params.chapterId,
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,chapter_id" }
    );
  } catch (error) {
    console.warn("[reading-sessions] markChapterRead error:", error);
  }
}
