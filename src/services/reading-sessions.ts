"use client";

import { supabase } from "@/integrations/supabase/client";

export type SessionId = string;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

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
      console.error('Failed to start reading session:', error);
      return null;
    }
    return data.id as string;
  } catch (error) {
    console.error('Error starting session:', error);
    return null;
  }
}

export async function updateSessionDuration(sessionId: SessionId, totalSeconds: number): Promise<void> {
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
    console.error('Error updating session duration:', error);
  }
}

export async function endSession(sessionId: SessionId, totalSeconds: number): Promise<void> {
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
    console.error('Error ending session:', error);
  }
}

export async function markChapterRead(params: {
  novelId: string;
  chapterId: string;
}): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  
  try {
    await supabase
      .from("chapter_reads")
      .upsert(
        {
          user_id: userId,
          novel_id: params.novelId,
          chapter_id: params.chapterId,
          read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chapter_id" }
      );
  } catch (error) {
    console.error('Error marking chapter as read:', error);
  }
}

/**
 * Get total reading time for a user
 */
export async function getTotalReadingTime(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  try {
    const { data, error } = await supabase
      .from("reading_sessions")
      .select("duration_seconds")
      .eq("user_id", userId);

    if (error) {
      console.error('Error fetching reading time:', error);
      return 0;
    }

    return (data || []).reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
  } catch (error) {
    console.error('Error calculating total reading time:', error);
    return 0;
  }
}

/**
 * Get reading sessions for a specific novel
 */
export async function getNovelSessions(novelId: string): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  try {
    const { data, error } = await supabase
      .from("reading_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .eq("novel_id", novelId);

    if (error) {
      console.error('Error fetching novel sessions:', error);
      return 0;
    }

    return (data || []).reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
  } catch (error) {
    console.error('Error calculating novel reading time:', error);
    return 0;
  }
}