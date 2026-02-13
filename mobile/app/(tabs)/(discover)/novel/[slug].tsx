import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  useColorScheme,
} from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link, useLocalSearchParams, Stack, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getGenreLabel, getGenreColor } from "@/lib/genre";
import { CACHE } from "@/lib/config";
import type { Novel, Chapter } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useOfflineDownload } from "@/hooks/use-offline";
import { formatStorageSize, getNovelStorageSize } from "@/lib/offline-db";

const CHAPTERS_PER_PAGE = 20;

// ─── Reading Progress Helper ──────────────────────────────────
function getReadingProgress(novelId: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE.READING_PROGRESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data[novelId]?.chapterNumber ?? null;
  } catch {
    return null;
  }
}

// ─── Main Screen ──────────────────────────────────────────────
export default function NovelDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [stats, setStats] = useState({ views: 0, bookmarks: 0, rating: 0 });
  const [descExpanded, setDescExpanded] = useState(false);
  const [chaptersExpanded, setChaptersExpanded] = useState(false);
  const [resumeChapter, setResumeChapter] = useState<number | null>(null);

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
      const NOVEL_DETAIL_FIELDS =
        "id,title,slug,author,cover_url,description,genres,status,ai_author_id,created_at,updated_at,chapters(count)";
      let query = supabase
        .from("novels")
        .select(NOVEL_DETAIL_FIELDS)
        .eq("slug", slug)
        .single();

      let { data, error } = await query;

      if (error || !data) {
        const uuidResult = await supabase
          .from("novels")
          .select(NOVEL_DETAIL_FIELDS)
          .eq("id", slug)
          .single();
        data = uuidResult.data;
        error = uuidResult.error;
      }

      if (data) {
        setNovel(data);

        // Check reading progress
        const progress = getReadingProgress(data.id);
        setResumeChapter(progress);

        // Fetch chapters + stats in parallel
        const [chapterRes, viewsRes, bookmarksRes, ratingsRes] =
          await Promise.all([
            supabase
              .from("chapters")
              .select("id, novel_id, chapter_number, title, created_at")
              .eq("novel_id", data.id)
              .order("chapter_number", { ascending: true })
              .limit(500),
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

        setChapters(chapterRes.data || []);

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
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để lưu truyện", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng nhập",
          onPress: () => router.push("/(account)/login"),
        },
      ]);
      return;
    }

    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newState = !bookmarked;
    setBookmarked(newState);

    try {
      if (newState) {
        await supabase
          .from("bookmarks")
          .insert({ novel_id: novel.id, user_id: user.id });
      } else {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("novel_id", novel.id)
          .eq("user_id", user.id);
      }
    } catch {
      setBookmarked(!newState);
    }
  }

  function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  // ── Loading ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View className="flex-1 bg-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  // ── Not found ──
  if (!novel) {
    return (
      <>
        <Stack.Screen options={{ title: "Lỗi" }} />
        <View className="flex-1 bg-background items-center justify-center">
          <Text className="text-foreground text-lg">
            Không tìm thấy truyện
          </Text>
        </View>
      </>
    );
  }

  const chapterCount = novel.chapters?.[0]?.count ?? 0;
  const readChapter = resumeChapter || 1;
  const ctaLabel = resumeChapter
    ? `Tiếp tục Chương ${resumeChapter}`
    : "Đọc Truyện Ngay";
  const visibleChapters = chaptersExpanded
    ? chapters
    : chapters.slice(0, CHAPTERS_PER_PAGE);
  const hasMoreChapters = chapters.length > CHAPTERS_PER_PAGE;

  // Colors
  const bg = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#f4f4f5";
  const textPrimary = isDark ? "#fafafa" : "#09090b";
  const textSecondary = isDark ? "#a1a1aa" : "#71717a";
  const gradientDark = "rgba(9,9,11,0.85)";
  const gradientLight = "rgba(255,255,255,0.85)";
  const gradient = isDark ? gradientDark : gradientLight;

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerTintColor: "#fff",
          headerBackButtonDisplayMode: "minimal",
          headerStyle: { backgroundColor: "transparent" },
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ─── Hero: Full-width cover + gradient overlay ─── */}
        <View style={{ width, height: 320, position: "relative" }}>
          <Image
            source={novel.cover_url || "https://placehold.co/400x320"}
            style={{ width, height: 320 }}
            className="object-cover"
          />
          {/* Gradient overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 200,
              backgroundColor: gradient,
            }}
          />
          {/* Top fade for status bar */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              backgroundColor: isDark
                ? "rgba(9,9,11,0.4)"
                : "rgba(0,0,0,0.15)",
            }}
          />
          {/* Title overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: textPrimary,
              }}
              numberOfLines={2}
            >
              {novel.title}
            </Text>
            {novel.author && (
              <Text
                style={{
                  fontSize: 14,
                  color: textSecondary,
                  marginTop: 4,
                }}
              >
                {novel.author}
              </Text>
            )}
            {/* Genre badges */}
            {novel.genres && novel.genres.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {novel.genres.map((g) => (
                  <View
                    key={g}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.08)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: textSecondary,
                      }}
                    >
                      {getGenreLabel(g)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ─── Stats row ─── */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 4,
          }}
        >
          {[
            { label: "Chương", value: formatNumber(chapterCount), icon: "📖" },
            { label: "Lượt đọc", value: formatNumber(stats.views), icon: "👁" },
            {
              label: "Đánh dấu",
              value: formatNumber(stats.bookmarks),
              icon: "🔖",
            },
            {
              label: "Đánh giá",
              value: stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : "—",
              icon: "",
            },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: textPrimary,
                }}
              >
                {stat.value}
              </Text>
              <Text style={{ fontSize: 11, color: textSecondary }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── CTA: Đọc Truyện Ngay ─── */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {chapters.length > 0 && (
            <Link
              href={`/read/${novel.slug || novel.id}/${readChapter}`}
              asChild
            >
              <Pressable
                style={{
                  backgroundColor: "#7c3aed",
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 17,
                    fontWeight: "700",
                  }}
                >
                  {ctaLabel}
                </Text>
              </Pressable>
            </Link>
          )}

          {/* Secondary row: Bookmark + Download */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={toggleBookmark}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: bookmarked
                  ? isDark
                    ? "#7c3aed20"
                    : "#7c3aed15"
                  : cardBg,
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 16 }}>
                {bookmarked ? "★" : "☆"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: bookmarked ? "#7c3aed" : textSecondary,
                }}
              >
                {bookmarked ? "Đã lưu" : "Lưu truyện"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDownload}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: offline.isDownloaded
                  ? isDark
                    ? "#22c55e18"
                    : "#22c55e12"
                  : cardBg,
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 14 }}>
                {offline.isDownloaded
                  ? "✓"
                  : offline.status === "downloading"
                    ? "⏳"
                    : "⬇"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: offline.isDownloaded
                    ? "#22c55e"
                    : offline.status === "downloading"
                      ? "#3b82f6"
                      : textSecondary,
                }}
              >
                {offline.isDownloaded
                  ? "Đã tải"
                  : offline.status === "downloading"
                    ? `${offline.downloadedCount}/${offline.totalCount}`
                    : "Tải offline"}
              </Text>
            </Pressable>
          </View>

          {/* Download progress bar */}
          {offline.status === "downloading" && (
            <View
              style={{
                height: 3,
                backgroundColor: isDark ? "#27272a" : "#e4e4e7",
                borderRadius: 2,
                marginTop: -4,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.max(offline.progress * 100, 2)}%`,
                  backgroundColor: "#3b82f6",
                  borderRadius: 2,
                }}
              />
            </View>
          )}
        </View>

        {/* ─── Description (collapsible) ─── */}
        {novel.description && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: textPrimary,
                marginBottom: 8,
              }}
            >
              Giới thiệu
            </Text>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: isDark ? "#d4d4d8" : "#3f3f46",
              }}
              numberOfLines={descExpanded ? undefined : 4}
              selectable={descExpanded}
            >
              {novel.description}
            </Text>
            <Pressable
              onPress={() => setDescExpanded(!descExpanded)}
              style={{ marginTop: 6 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#7c3aed",
                }}
              >
                {descExpanded ? "Thu gọn" : "Xem thêm"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── Chapter list ─── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: textPrimary,
              }}
            >
              Danh sách chương
            </Text>
            <Text style={{ fontSize: 13, color: textSecondary }}>
              {chapterCount} chương
            </Text>
          </View>

          {visibleChapters.map((chapter) => {
            const isCurrentChapter =
              resumeChapter === chapter.chapter_number;
            return (
              <Link
                key={chapter.id}
                href={`/read/${novel.slug || novel.id}/${chapter.chapter_number}`}
                asChild
              >
                <Pressable
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    marginBottom: 2,
                    backgroundColor: isCurrentChapter
                      ? isDark
                        ? "#7c3aed20"
                        : "#7c3aed10"
                      : "transparent",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isCurrentChapter && (
                    <View
                      style={{
                        width: 3,
                        height: 16,
                        borderRadius: 2,
                        backgroundColor: "#7c3aed",
                      }}
                    />
                  )}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: isCurrentChapter ? "#7c3aed" : textPrimary,
                      fontWeight: isCurrentChapter ? "600" : "400",
                    }}
                    numberOfLines={1}
                  >
                    Chương {chapter.chapter_number}: {chapter.title}
                  </Text>
                </Pressable>
              </Link>
            );
          })}

          {/* Show more / Show less */}
          {hasMoreChapters && (
            <Pressable
              onPress={() => setChaptersExpanded(!chaptersExpanded)}
              style={{
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: cardBg,
                borderRadius: 12,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#7c3aed",
                }}
              >
                {chaptersExpanded
                  ? "Thu gọn"
                  : `Xem tất cả ${chapters.length} chương`}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}
