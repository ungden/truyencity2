"use client";

import { supabase } from "@/integrations/supabase/client";

export type BookmarkItem = {
  id: string;
  created_at: string;
  novel: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    status: string | null;
  };
};

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listBookmarks(): Promise<BookmarkItem[]> {
  const userId = await getUserId();
  if (!userId) return [];
  // Thanks to FK, we can select nested novel
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, created_at, novels:novel_id ( id, title, author, cover_url, status )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  // Map nested key to 'novel'
  return data.map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    novel: {
      id: row.novels?.id,
      title: row.novels?.title,
      author: row.novels?.author ?? null,
      cover_url: row.novels?.cover_url ?? null,
      status: row.novels?.status ?? null,
    },
  }));
}

export async function isBookmarked(novelId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("novel_id", novelId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function addBookmark(novelId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("bookmarks").insert({ user_id: userId, novel_id: novelId });
}

export async function removeBookmark(novelId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("novel_id", novelId);
}

export async function toggleBookmarkServer(novelId: string): Promise<boolean> {
  const exists = await isBookmarked(novelId);
  if (exists) {
    await removeBookmark(novelId);
    return false;
  } else {
    await addBookmark(novelId);
    return true;
  }
}