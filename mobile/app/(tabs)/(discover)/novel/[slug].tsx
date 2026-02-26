import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link, useLocalSearchParams, Stack, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getGenreLabel } from "@/lib/genre";
import { CACHE } from "@/lib/config";
import type { Novel, Chapter } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useOfflineDownload } from "@/hooks/use-offline";
import { formatStorageSize, getNovelStorageSize } from "@/lib/offline-db";
import UnderlineTabs from "@/components/underline-tabs";
import NovelCard from "@/components/novel-card";

const CHAPTERS_PER_PAGE = 20;
const DETAIL_TABS = ["Giới Thiệu", "Đánh Giá", "D.S Chương"];

// ─── Helpers ──────────────────────────────────────────────────
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

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "★" : "") + "☆".repeat(5 - full - half);
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
  const [stats, setStats] = useState({ views: 0, bookmarks: 0, rating: 0, ratingCount: 0 });
  const [descExpanded, setDescExpanded] = useState(false);
  const [chaptersExpanded, setChaptersExpanded] = useState(false);
  const [resumeChapter, setResumeChapter] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [recommended, setRecommended] = useState<Novel[]>([]);

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
          { text: "Xóa", style: "destructive", onPress: () => offline.deleteDownload() },
        ]
      );
    } else if (offline.status === "downloading") {
      Alert.alert("Đang tải", "Bạn có muốn hủy tải xuống?", [
        { text: "Tiếp tục", style: "cancel" },
        { text: "Hủy tải", style: "destructive", onPress: () => offline.cancelDownload() },
      ]);
    } else {
      if (process.env.EXPO_OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      offline.startDownload();
    }
  }

  useEffect(() => {
    if (slug) fetchNovel();
  }, [slug]);

  async function fetchNovel() {
    try {
      const FIELDS =
        "id,title,slug,author,cover_url,description,genres,status,ai_author_id,created_at,updated_at,chapters(count)";
      let { data, error } = await supabase
        .from("novels")
        .select(FIELDS)
        .eq("slug", slug)
        .single();

      if (error || !data) {
        const r2 = await supabase.from("novels").select(FIELDS).eq("id", slug).single();
        data = r2.data;
        error = r2.error;
      }

      if (!data) return;
      setNovel(data);
      setResumeChapter(getReadingProgress(data.id));

      // Parallel fetches
      const [chapterRes, viewsRes, bookmarksRes, ratingsRes] = await Promise.all([
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
        supabase.rpc("get_novel_stats", { p_novel_id: data.id }),
      ]);

      setChapters(chapterRes.data || []);

      const ratingStats = ratingsRes.data
        ? typeof ratingsRes.data === "string"
          ? JSON.parse(ratingsRes.data)
          : ratingsRes.data
        : null;
      setStats({
        views: ratingStats?.view_count ?? viewsRes.count ?? 0,
        bookmarks: ratingStats?.bookmark_count ?? bookmarksRes.count ?? 0,
        rating: Math.round((ratingStats?.rating_avg ?? 0) * 10) / 10,
        ratingCount: ratingStats?.rating_count ?? 0,
      });

      // Bookmark status
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

      // Fetch recommended novels (same genre)
      if (data.genres && data.genres.length > 0) {
        const LIST_FIELDS = "id,title,slug,author,cover_url,genres,status,created_at,updated_at,chapter_count";
        const { data: recData } = await supabase
          .from("novels")
          .select(LIST_FIELDS)
          .contains("genres", [data.genres[0]])
          .neq("id", data.id)
          .order("updated_at", { ascending: false })
          .limit(10);
        setRecommended(recData || []);
      }
    } catch (err) {
      console.error("Error fetching novel:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBookmark() {
    if (!novel) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để lưu truyện", [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/(account)/login") },
      ]);
      return;
    }
    if (process.env.EXPO_OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newState = !bookmarked;
    setBookmarked(newState);
    try {
      if (newState) {
        await supabase.from("bookmarks").insert({ novel_id: novel.id, user_id: user.id });
      } else {
        await supabase.from("bookmarks").delete().eq("novel_id", novel.id).eq("user_id", user.id);
      }
    } catch {
      setBookmarked(!newState);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View style={{ flex: 1, backgroundColor: isDark ? "#0f1118" : "#fff", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!novel) {
    return (
      <>
        <Stack.Screen options={{ title: "Lỗi" }} />
        <View style={{ flex: 1, backgroundColor: isDark ? "#0f1118" : "#fff", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, color: isDark ? "#fafafa" : "#09090b" }}>Không tìm thấy truyện</Text>
        </View>
      </>
    );
  }

  // ── Derived data ──
  const chapterCount = novel.chapter_count ?? novel.chapters?.[0]?.count ?? 0;
  const readChapter = resumeChapter || 1;
  const ctaLabel = resumeChapter ? `Tiếp tục Ch.${resumeChapter}` : "Đọc truyện";
  const visibleChapters = chaptersExpanded ? chapters : chapters.slice(0, CHAPTERS_PER_PAGE);
  const hasMoreChapters = chapters.length > CHAPTERS_PER_PAGE;

  // ── Theme colors ──
  const C = {
    bg: isDark ? "#0f1118" : "#ffffff",
    heroBg: "#0f1118", // always dark hero like reference
    card: isDark ? "#1a1d28" : "#f4f4f5",
    text: isDark ? "#e8e6f0" : "#09090b",
    textSub: isDark ? "#82818e" : "#71717a",
    textMuted: isDark ? "#555" : "#a1a1aa",
    border: isDark ? "#282b3a" : "#e4e4e7",
    accent: "#5c9cff",
    purple: "#7c3aed",
    star: "#f59e0b",
  };

  const coverW = 140;
  const coverH = 200;

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

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* ═══════════════ HERO SECTION (always dark like ref) ═══════════════ */}
          <View
            style={{
              backgroundColor: C.heroBg,
              paddingTop: 100, // space for transparent header
              paddingBottom: 20,
              paddingHorizontal: 16,
              flexDirection: "row",
              gap: 16,
            }}
          >
            {/* Cover */}
            <Image
              source={novel.cover_url || "https://placehold.co/280x400"}
              style={{
                width: coverW,
                height: coverH,
                borderRadius: 10,
              }}
              className="object-cover"
            />

            {/* Info */}
            <View style={{ flex: 1, justifyContent: "center", gap: 6 }}>
              {/* Genre badge */}
              {novel.genres && novel.genres.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {novel.genres.slice(0, 2).map((g) => (
                    <View
                      key={g}
                      style={{
                        backgroundColor: C.accent,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                        {getGenreLabel(g)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Title */}
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#e8e6f0",
                  lineHeight: 24,
                }}
                numberOfLines={3}
              >
                {novel.title}
              </Text>

              {/* Author */}
              {novel.author && (
                <Text style={{ fontSize: 13, color: "#82818e" }} numberOfLines={1}>
                  {novel.author}
                </Text>
              )}

              {/* Rating */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 14, color: C.star, letterSpacing: 1 }}>
                  {renderStars(stats.rating)}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#e8e6f0" }}>
                  {stats.rating > 0 ? stats.rating.toFixed(1) : "—"}
                </Text>
                {stats.ratingCount > 0 && (
                  <Text style={{ fontSize: 11, color: "#82818e" }}>
                    ({stats.ratingCount} đánh giá)
                  </Text>
                )}
              </View>

              {/* Action buttons in hero */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                {chapters.length > 0 && (
                  <Link href={`/read/${novel.slug || novel.id}/${readChapter}`} asChild>
                    <Pressable
                      style={{
                        backgroundColor: C.accent,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 20,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                        {ctaLabel}
                      </Text>
                    </Pressable>
                  </Link>
                )}

                {/* Add to library button */}
                <Pressable
                  onPress={toggleBookmark}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: bookmarked ? C.accent : "rgba(255,255,255,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: "#82818e", maxWidth: 60 }} numberOfLines={2}>
                    {bookmarked ? "Đã thêm" : "Thêm vào\nTủ Truyện"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ═══════════════ TABS ═══════════════ */}
          <UnderlineTabs
            tabs={DETAIL_TABS}
            selectedIndex={activeTab}
            onSelect={setActiveTab}
          />

          {/* ═══════════════ TAB CONTENT ═══════════════ */}

          {/* ── Tab 0: Giới Thiệu ── */}
          {activeTab === 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              {/* Stats row */}
              <View
                style={{
                  flexDirection: "row",
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: C.border,
                }}
              >
                {[
                  { value: formatNumber(chapterCount), label: `Chương · ${novel.status === "completed" ? "Hoàn thành" : "Còn tiếp"}` },
                  { value: formatNumber(stats.views), label: "Lượt đọc" },
                  { value: formatNumber(stats.bookmarks), label: "Đánh dấu" },
                ].map((s, i) => (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>
                      {s.value}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.textSub, textAlign: "center" }}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Description */}
              {novel.description && (
                <View style={{ marginTop: 16 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 24,
                      color: isDark ? "#d4d4d8" : "#3f3f46",
                    }}
                    numberOfLines={descExpanded ? undefined : 6}
                    selectable={descExpanded}
                  >
                    {novel.description}
                  </Text>
                  <Pressable
                    onPress={() => setDescExpanded(!descExpanded)}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: C.accent }}>
                      {descExpanded ? "Thu gọn ▲" : "Xem thêm ▼"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Genre tags */}
              {novel.genres && novel.genres.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 10 }}>
                    Nhãn
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {novel.genres.map((g) => (
                      <View
                        key={g}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: C.border,
                          backgroundColor: isDark ? "#1a1d28" : "#f9fafb",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: C.textSub, fontWeight: "500" }}>
                          {getGenreLabel(g).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recommended novels */}
              {recommended.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 12 }}>
                    Truyện tương tự
                  </Text>
                  <FlatList
                    data={recommended}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                    renderItem={({ item }) => (
                      <Link href={`/novel/${item.slug || item.id}`} asChild>
                        <Pressable style={{ width: 110 }}>
                          <Image
                            source={item.cover_url || "https://placehold.co/220x300"}
                            style={{ width: 110, height: 150, borderRadius: 8 }}
                            className="object-cover"
                          />
                          <Text
                            style={{ fontSize: 12, fontWeight: "600", color: C.text, marginTop: 6 }}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          {item.author && (
                            <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2 }} numberOfLines={1}>
                              {item.author}
                            </Text>
                          )}
                        </Pressable>
                      </Link>
                    )}
                  />
                </View>
              )}

              {/* Download offline — secondary */}
              <Pressable
                onPress={handleDownload}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: offline.isDownloaded
                    ? isDark ? "#22c55e18" : "#22c55e12"
                    : C.card,
                }}
              >
                <Text style={{ fontSize: 14 }}>
                  {offline.isDownloaded ? "✓" : offline.status === "downloading" ? "⏳" : "⬇"}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: offline.isDownloaded
                      ? "#22c55e"
                      : offline.status === "downloading"
                        ? "#3b82f6"
                        : C.textSub,
                  }}
                >
                  {offline.isDownloaded
                    ? "Đã tải offline"
                    : offline.status === "downloading"
                      ? `Đang tải ${offline.downloadedCount}/${offline.totalCount}...`
                      : "Tải để đọc offline"}
                </Text>
              </Pressable>
              {offline.status === "downloading" && (
                <View style={{ height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 4 }}>
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
          )}

          {/* ── Tab 1: Đánh Giá ── */}
          {activeTab === 1 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 24, alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 48, fontWeight: "800", color: C.text }}>
                {stats.rating > 0 ? stats.rating.toFixed(1) : "—"}
              </Text>
              <Text style={{ fontSize: 20, color: C.star, letterSpacing: 2 }}>
                {renderStars(stats.rating)}
              </Text>
              <Text style={{ fontSize: 14, color: C.textSub }}>
                {stats.ratingCount > 0
                  ? `${stats.ratingCount} đánh giá`
                  : "Chưa có đánh giá"}
              </Text>
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 16, textAlign: "center" }}>
                Tính năng đánh giá đang phát triển
              </Text>
            </View>
          )}

          {/* ── Tab 2: D.S Chương ── */}
          {activeTab === 2 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSub }}>
                  {chapterCount} chương · {novel.status === "completed" ? "Hoàn thành" : "Đang ra"}
                </Text>
              </View>

              {visibleChapters.map((chapter) => {
                const isCurrent = resumeChapter === chapter.chapter_number;
                return (
                  <Link
                    key={chapter.id}
                    href={`/read/${novel.slug || novel.id}/${chapter.chapter_number}`}
                    asChild
                  >
                    <Pressable
                      style={{
                        paddingVertical: 13,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        marginBottom: 1,
                        backgroundColor: isCurrent
                          ? isDark ? "#5c9cff18" : "#5c9cff12"
                          : "transparent",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderBottomWidth: isCurrent ? 0 : 1,
                        borderBottomColor: C.border,
                      }}
                    >
                      {isCurrent && (
                        <View
                          style={{
                            width: 3,
                            height: 18,
                            borderRadius: 2,
                            backgroundColor: C.accent,
                          }}
                        />
                      )}
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: isCurrent ? C.accent : C.text,
                          fontWeight: isCurrent ? "600" : "400",
                        }}
                        numberOfLines={1}
                      >
                        Chương {chapter.chapter_number}: {chapter.title}
                      </Text>
                    </Pressable>
                  </Link>
                );
              })}

              {hasMoreChapters && (
                <Pressable
                  onPress={() => setChaptersExpanded(!chaptersExpanded)}
                  style={{
                    paddingVertical: 14,
                    alignItems: "center",
                    backgroundColor: C.card,
                    borderRadius: 12,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: C.accent }}>
                    {chaptersExpanded ? "Thu gọn" : `Xem tất cả ${chapters.length} chương`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* ═══════════════ STICKY BOTTOM BAR ═══════════════ */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? "#18181bF0" : "#ffffffF0",
            borderTopWidth: 1,
            borderTopColor: C.border,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 34, // safe area
            gap: 12,
          }}
        >
          {/* Novel info */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.text }} numberOfLines={1}>
              {novel.title}
            </Text>
            {novel.author && (
              <Text style={{ fontSize: 12, color: C.textSub }} numberOfLines={1}>
                {novel.author}
              </Text>
            )}
          </View>

          {/* Read button */}
          {chapters.length > 0 && (
            <Link href={`/read/${novel.slug || novel.id}/${readChapter}`} asChild>
              <Pressable
                style={{
                  backgroundColor: C.accent,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  Đọc
                </Text>
              </Pressable>
            </Link>
          )}

          {/* Bookmark button */}
          <Pressable
            onPress={toggleBookmark}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: bookmarked ? C.accent : isDark ? "#282b3a" : "#e4e4e7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: bookmarked ? "#fff" : C.textSub, fontSize: 18, fontWeight: "700" }}>
              +
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}
