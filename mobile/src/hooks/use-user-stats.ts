import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { type UserStats, EMPTY_STATS } from "@/lib/gamification";

interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

interface UseUserStatsReturn {
  profile: Profile | null;
  stats: UserStats;
  loading: boolean;
  refetch: () => void;
}

// Calculate reading streak from an array of date strings (YYYY-MM-DD)
function calculateStreak(dates: string[]): {
  current: number;
  longest: number;
} {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Deduplicate and sort descending
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Current streak: count consecutive days from today or yesterday backwards
  let current = 0;
  if (unique[0] === todayStr || unique[0] === yesterdayStr) {
    let checkDate = new Date(unique[0]);
    for (const dateStr of unique) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      if (d.getTime() === checkDate.getTime()) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (d.getTime() < checkDate.getTime()) {
        break;
      }
    }
  }

  // Longest streak: scan all dates
  let longest = 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak, current);

  return { current, longest };
}

export function useUserStats(): UseUserStatsReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setStats(EMPTY_STATS);
        setLoading(false);
        return;
      }

      const userId = user.id;

      // Fire all queries in parallel with allSettled for resilience
      const results = await Promise.allSettled([
        // 0. Profile
        supabase.from("profiles").select("*").eq("id", userId).single(),

        // 1. Unique chapters read
        supabase
          .from("chapter_reads")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),

        // 2. Reading progress — novels started + completed
        supabase
          .from("reading_progress")
          .select("novel_id, position_percent")
          .eq("user_id", userId)
          .limit(500),

        // 3. Reading sessions — total time
        supabase
          .from("reading_sessions")
          .select("duration_seconds")
          .eq("user_id", userId)
          .limit(1000),

        // 4. Bookmarks count
        supabase
          .from("bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),

        // 5. Ratings count
        supabase
          .from("ratings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),

        // 6. Comments count
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),

        // 7. Session dates for streak calculation
        supabase
          .from("reading_sessions")
          .select("started_at")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(365),

        // 8. Genres from novels user has read
        supabase
          .from("reading_progress")
          .select("novel_id, novels(genres)")
          .eq("user_id", userId)
          .limit(200),
      ]);

      // Helper to safely extract fulfilled result
      const get = <T,>(idx: number): T | null => {
        const r = results[idx];
        if (r.status === "fulfilled") return r.value as T;
        console.warn(`Stats query ${idx} failed:`, r.reason);
        return null;
      };

      // Profile
      const profileRes = get<{ data: any }>(0);
      if (profileRes?.data) {
        setProfile({ ...profileRes.data, email: user.email });
      }

      // Chapters read
      const chaptersRes = get<{ count: number | null }>(1);

      // Novels started / completed
      const progressRes = get<{ data: any[] | null }>(2);
      const progressData = progressRes?.data || [];
      const novelsStarted = progressData.length;
      const novelsCompleted = progressData.filter(
        (p: any) => (p.position_percent ?? 0) >= 95
      ).length;

      // Total reading time
      const sessionsRes = get<{ data: any[] | null }>(3);
      const sessionData = sessionsRes?.data || [];
      const totalReadingSeconds = sessionData.reduce(
        (sum: number, s: any) => sum + (s.duration_seconds || 0),
        0
      );

      // Counts
      const bookmarksRes = get<{ count: number | null }>(4);
      const ratingsRes = get<{ count: number | null }>(5);
      const commentsRes = get<{ count: number | null }>(6);

      // Streak
      const sessionDatesRes = get<{ data: any[] | null }>(7);
      const sessionDates = (sessionDatesRes?.data || []).map((s: any) =>
        s.started_at ? s.started_at.slice(0, 10) : ""
      ).filter(Boolean);
      const { current: currentStreak, longest: longestStreak } =
        calculateStreak(sessionDates);

      // Unique genres
      const genresRes = get<{ data: any[] | null }>(8);
      const genresData = genresRes?.data || [];
      const allGenres = new Set<string>();
      for (const row of genresData) {
        const novel = row.novels as unknown as { genres?: string[] | null };
        if (novel?.genres) {
          for (const g of novel.genres) {
            allGenres.add(g);
          }
        }
      }

      setStats({
        chaptersRead: chaptersRes?.count || 0,
        novelsStarted,
        novelsCompleted,
        totalReadingSeconds,
        bookmarkCount: bookmarksRes?.count || 0,
        ratingCount: ratingsRes?.count || 0,
        commentCount: commentsRes?.count || 0,
        currentStreak,
        longestStreak,
        uniqueGenres: allGenres.size,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { profile, stats, loading, refetch: fetchAll };
}
