import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList } from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link, useLocalSearchParams, Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getGenreLabel, getGenreColor } from "@/lib/genre";
import type { Novel, Chapter } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useOfflineDownload } from "@/hooks/use-offline";
import { formatStorageSize, getNovelStorageSize } from "@/lib/offline-db";

export default function NovelDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [stats, setStats] = useState({ views: 0, bookmarks: 0, rating: 0 });

  // Offline download
  const offline = useOfflineDownload(
    novel?.id || null,
    novel?.title,
    novel?.slug,
    novel?.cover_url
  );

  function handleDownload() {
    if (offline.isDownloaded) {
      Alert.alert(
        "Xóa dữ liệu offline",
        `Truyện đã tải ${formatStorageSize(getNovelStorageSize(novel?.id || ""))}. Bạn có muốn xóa?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: () => offline.deleteDownload(),
          },
        ]
      );
    } else if (offline.status === "downloading") {
      Alert.alert("Đang tải", "Bạn có muốn hủy tải xuống?", [
        { text: "Tiếp tục", style: "cancel" },
        {
          text: "Hủy tải",
          style: "destructive",
          onPress: () => offline.cancelDownload(),
        },
      ]);
    } else {
      if (process.env.EXPO_OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      offline.startDownload();
    }
  }

  useEffect(() => {
    if (slug) fetchNovel();
  }, [slug]);

  async function fetchNovel() {
    try {
      // Try slug first, then UUID
      let query = supabase
        .from("novels")
        .select("*, chapters(count)")
        .eq("slug", slug)
        .single();

      let { data, error } = await query;

      if (error || !data) {
        const uuidResult = await supabase
          .from("novels")
          .select("*, chapters(count)")
          .eq("id", slug)
          .single();
        data = uuidResult.data;
        error = uuidResult.error;
      }

      if (data) {
        setNovel(data);
        // Fetch chapters
        const { data: chapterData } = await supabase
          .from("chapters")
          .select("id, novel_id, chapter_number, title, created_at")
          .eq("novel_id", data.id)
          .order("chapter_number", { ascending: true })
          .limit(500);
        setChapters(chapterData || []);

        // Fetch stats in parallel
        const [viewsRes, bookmarksRes, ratingsRes] = await Promise.all([
          supabase
            .from("reading_sessions")
            .select("id", { count: "exact", head: true })
            .eq("novel_id", data.id),
          supabase
            .from("bookmarks")
            .select("id", { count: "exact", head: true })
            .eq("novel_id", data.id),
          supabase
            .from("ratings")
            .select("rating")
            .eq("novel_id", data.id)
            .limit(500),
        ]);

        const ratings = ratingsRes.data || [];
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;

        setStats({
          views: viewsRes.count || 0,
          bookmarks: bookmarksRes.count || 0,
          rating: Math.round(avgRating * 10) / 10,
        });

        // Check bookmark status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: bm } = await supabase
            .from("bookmarks")
            .select("id")
            .eq("novel_id", data.id)
            .eq("user_id", user.id)
            .single();
          setBookmarked(!!bm);
        }
      }
    } catch (error) {
      console.error("Error fetching novel:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBookmark() {
    if (!novel) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newState = !bookmarked;
    setBookmarked(newState);

    try {
      if (newState) {
        await supabase.from("bookmarks").insert({ novel_id: novel.id, user_id: user.id });
      } else {
        await supabase.from("bookmarks").delete().eq("novel_id", novel.id).eq("user_id", user.id);
      }
    } catch {
      setBookmarked(!newState); // rollback
    }
  }

  function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!novel) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground text-lg">Không tìm thấy truyện</Text>
      </View>
    );
  }

  const chapterCount = novel.chapters?.[0]?.count ?? 0;
  const firstGenre = novel.genres?.[0];

  return (
    <>
      <Stack.Screen options={{ title: novel.title }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="pb-8"
      >
        {/* Hero section */}
        <View className="px-4 pt-4 flex-row gap-4">
          <Image
            source={novel.cover_url || "https://placehold.co/120x160"}
            className="w-[120px] rounded-xl object-cover"
            style={{ height: 160 }}
          />
          <View className="flex-1 gap-1.5 justify-center">
            <Text className="text-foreground text-xl font-bold" selectable>
              {novel.title}
            </Text>
            {novel.author && (
              <Text className="text-muted-foreground text-sm">{novel.author}</Text>
            )}
            {/* Genre badges */}
            <View className="flex-row flex-wrap gap-1.5 mt-1">
              {novel.genres?.map((g) => (
                <View key={g} className={`px-2 py-0.5 rounded-md ${getGenreColor(g)}`}>
                  <Text className="text-white text-xs font-medium">
                    {getGenreLabel(g)}
                  </Text>
                </View>
              ))}
            </View>
            {/* Rating */}
            {stats.rating > 0 && (
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-rating text-sm">★</Text>
                <Text className="text-foreground text-sm font-semibold">
                  {stats.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3 px-4 mt-4">
          {[
            { label: "Chương", value: formatNumber(chapterCount) },
            { label: "Lượt đọc", value: formatNumber(stats.views) },
            { label: "Đánh dấu", value: formatNumber(stats.bookmarks) },
            { label: "Đánh giá", value: stats.rating > 0 ? stats.rating.toFixed(1) : "-" },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-card rounded-xl p-3 items-center gap-1">
              <Text className="text-foreground text-lg font-bold">{stat.value}</Text>
              <Text className="text-muted-foreground text-xs">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-3 px-4 mt-4">
          {chapters.length > 0 && (
            <Link href={`/read/${novel.slug || novel.id}/1`} asChild>
              <Pressable className="flex-1 bg-primary rounded-xl py-3 items-center">
                <Text className="text-primary-foreground font-semibold">Đọc truyện</Text>
              </Pressable>
            </Link>
          )}
          <Pressable
            onPress={toggleBookmark}
            className={`px-6 rounded-xl py-3 items-center ${
              bookmarked ? "bg-primary/20" : "bg-secondary"
            }`}
          >
            <Text className={bookmarked ? "text-primary font-semibold" : "text-secondary-foreground"}>
              {bookmarked ? "★ Đã lưu" : "☆ Lưu"}
            </Text>
          </Pressable>
        </View>

        {/* Download button */}
        <Pressable
          onPress={handleDownload}
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: offline.isDownloaded
                ? "#22c55e18"
                : offline.status === "downloading"
                  ? "#3b82f618"
                  : "#27272a",
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: offline.isDownloaded
                  ? "#22c55e"
                  : offline.status === "downloading"
                    ? "#3b82f6"
                    : offline.status === "error"
                      ? "#ef4444"
                      : "#a1a1aa",
              }}
            >
              {offline.isDownloaded
                ? "✓ Đã tải offline"
                : offline.status === "downloading"
                  ? `⬇ Đang tải ${offline.downloadedCount}/${offline.totalCount}...`
                  : offline.status === "error"
                    ? "⚠ Lỗi tải — Thử lại"
                    : "⬇ Tải để đọc offline"}
            </Text>
          </View>
          {/* Download progress bar */}
          {offline.status === "downloading" && (
            <View style={{ height: 3, backgroundColor: "#1e293b" }}>
              <View
                style={{
                  height: "100%",
                  width: `${Math.max(offline.progress * 100, 2)}%`,
                  backgroundColor: "#3b82f6",
                }}
              />
            </View>
          )}
        </Pressable>

        {/* Description */}
        {novel.description && (
          <View className="px-4 mt-4">
            <Text className="text-foreground text-base font-semibold mb-2">Giới thiệu</Text>
            <Text className="text-foreground/80 text-sm leading-relaxed" selectable>
              {novel.description}
            </Text>
          </View>
        )}

        {/* Chapter list */}
        <View className="px-4 mt-6">
          <Text className="text-foreground text-base font-semibold mb-3">
            Danh sách chương ({chapterCount})
          </Text>
          {chapters.slice(0, 50).map((chapter) => (
            <Link
              key={chapter.id}
              href={`/read/${novel.slug || novel.id}/${chapter.chapter_number}`}
              asChild
            >
              <Pressable className="py-3 border-b border-border">
                <Text className="text-foreground text-sm" numberOfLines={1}>
                  Chương {chapter.chapter_number}: {chapter.title}
                </Text>
              </Pressable>
            </Link>
          ))}
          {chapters.length > 50 && (
            <Text className="text-muted-foreground text-sm text-center py-3">
              Và {chapters.length - 50} chương khác...
            </Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}
