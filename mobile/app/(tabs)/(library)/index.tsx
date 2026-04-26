import React, { useEffect, useState } from "react";
import { FlatList, ActivityIndicator, Alert } from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import UnderlineTabs from "@/components/underline-tabs";
import { useDevice } from "@/hooks/use-device";
import type { Novel } from "@/lib/types";
import { useOfflineNovels } from "@/hooks/use-offline";
import {
  deleteNovelOffline,
  formatStorageSize,
  getNovelStorageSize,
  type OfflineNovel,
} from "@/lib/offline-db";

type HistoryItem = {
  novel_id: string;
  chapter_number: number;
  last_read: string;
};

type BookmarkItem = {
  novel_id: string;
  created_at: string;
};

type LibraryNovel = Novel & {
  readChapter?: number;
};

export default function LibraryScreen() {
  const { isTablet, centeredStyle, coverSize } = useDevice();
  const [selectedTab, setSelectedTab] = useState(0);
  const [history, setHistory] = useState<LibraryNovel[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { novels: offlineNovels, refresh: refreshOffline } = useOfflineNovels();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    } else {
      setLoading(false);
    }
  }

  async function fetchData() {
    try {
      const [historyRes, bookmarkRes] = await Promise.all([
        supabase
          .from("reading_progress")
          .select("novel_id, chapter_number, last_read")
          .eq("user_id", userId!)
          .order("last_read", { ascending: false })
          .limit(50),
        supabase
          .from("bookmarks")
          .select("novel_id, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (historyRes.data && historyRes.data.length > 0) {
        const progressMap = new Map<string, number>();
        const novelIds: string[] = [];
        for (const h of historyRes.data as HistoryItem[]) {
          if (!progressMap.has(h.novel_id)) {
            progressMap.set(h.novel_id, h.chapter_number);
            novelIds.push(h.novel_id);
          }
        }
        const NOVEL_LIST_FIELDS = "id,title,slug,author,cover_url,genres,status,ai_author_id,created_at,updated_at,chapter_count";
        const { data: novels } = await supabase
          .from("novels")
          .select(NOVEL_LIST_FIELDS)
          .in("id", novelIds);
        const novelMap = new Map((novels || []).map((n) => [n.id, n]));
        const ordered = novelIds
          .map((id) => {
            const n = novelMap.get(id);
            if (!n) return null;
            return {
              ...n,
              readChapter: progressMap.get(id) || 0,
            } as LibraryNovel;
          })
          .filter(Boolean) as LibraryNovel[];
        setHistory(ordered);
      }

      if (bookmarkRes.data && bookmarkRes.data.length > 0) {
        const novelIds = (bookmarkRes.data as BookmarkItem[]).map(
          (b) => b.novel_id
        );
        const NOVEL_LIST_FIELDS = "id,title,slug,author,cover_url,genres,status,ai_author_id,created_at,updated_at,chapter_count";
        const { data: novels } = await supabase
          .from("novels")
          .select(NOVEL_LIST_FIELDS)
          .in("id", novelIds);
        const novelMap = new Map((novels || []).map((n) => [n.id, n]));
        const ordered = novelIds
          .map((id) => novelMap.get(id) || null)
          .filter(Boolean) as LibraryNovel[];
        setBookmarks(ordered);
      }
    } catch (error) {
      console.error("Error fetching library:", error);
    } finally {
      setLoading(false);
    }
  }

  function getChapterCount(novel: Novel): number {
    if (novel.chapter_count != null) return novel.chapter_count;
    if (novel.chapters && Array.isArray(novel.chapters) && novel.chapters.length > 0) return novel.chapters[0]?.count ?? 0;
    return 0;
  }

  // Not logged in — centered in a ScrollView so it respects header inset
  if (!userId && !loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#131620" }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32, paddingVertical: 48 }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#1a1d28",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 44 }}>📚</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#e8e6f0", textAlign: "center" }}>
          Đăng nhập để xem tủ sách
        </Text>
        <Text style={{ fontSize: 14, color: "#82818e", textAlign: "center", lineHeight: 20, maxWidth: 300 }}>
          Lưu truyện yêu thích, theo dõi tiến độ đọc và đồng bộ trên mọi thiết bị
        </Text>
        <Link href="/(account)/login" asChild>
          <Pressable
            style={{
              marginTop: 12,
              backgroundColor: "#5c9cff",
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 15 }}>
              Đăng nhập
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    );
  }

  function handleDeleteOfflineNovel(novel: OfflineNovel) {
    const size = formatStorageSize(getNovelStorageSize(novel.novel_id));
    Alert.alert(
      "Xóa dữ liệu offline",
      `${novel.title} (${size}). Bạn có muốn xóa?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            deleteNovelOffline(novel.novel_id);
            refreshOffline();
          },
        },
      ]
    );
  }

  // Tab 2 (Đã tải) doesn't need auth
  if (selectedTab === 2) {
    return (
      <FlatList
        data={offlineNovels}
        keyExtractor={(item) => item.novel_id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: "#131620" }}
        ListHeaderComponent={
          <View style={centeredStyle}>
            <UnderlineTabs
              tabs={["Lịch sử", "Đánh dấu", "Đã tải"]}
              selectedIndex={selectedTab}
              onSelect={(idx) => {
                setSelectedTab(idx);
                if (idx === 2) refreshOffline();
              }}
            />
          </View>
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item }: { item: OfflineNovel }) => {
          const dlPct = item.total_chapters > 0
            ? Math.min(100, Math.round((item.downloaded_chapters / item.total_chapters) * 100))
            : 0;
          const fullyDownloaded = dlPct === 100;
          return (
            <Link href={`/novel/${item.slug || item.novel_id}`} asChild>
              <Pressable
                style={[{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: isTablet ? 16 : 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(128,128,128,0.12)",
                }, centeredStyle] as any}
              >
                <Image
                  source={item.cover_url || "https://placehold.co/160x213"}
                  style={{ width: coverSize.width, height: coverSize.height, borderRadius: coverSize.radius }}
                  className="object-cover"
                />
                <View style={{ flex: 1, marginLeft: 12, gap: 6, justifyContent: "center" }}>
                  <Text
                    style={{ fontSize: isTablet ? 17 : 15, fontWeight: "600", color: "#e8e6f0", lineHeight: isTablet ? 22 : 20 }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View style={{ gap: 4, marginTop: 2 }}>
                    <View style={{ height: 4, backgroundColor: "#282b3a", borderRadius: 2, overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${Math.max(dlPct, 2)}%`, backgroundColor: "#22c55e", borderRadius: 2 }} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 11, color: "#22c55e", fontWeight: "600" }}>
                        {fullyDownloaded ? "Đã tải xong" : `Đã tải ${item.downloaded_chapters}/${item.total_chapters}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#555" }}>·</Text>
                      <Text style={{ fontSize: 11, color: "#82818e" }}>
                        {formatStorageSize(getNovelStorageSize(item.novel_id))}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleDeleteOfflineNovel(item)}
                  hitSlop={12}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Xóa truyện ${item.title} khỏi thiết bị`}
                >
                  <Text style={{ color: "#ef4444", fontSize: 18 }}>✕</Text>
                </Pressable>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: 32, gap: 10 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "#1a1d28",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 40 }}>📥</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#e8e6f0" }}>
              Chưa có truyện offline
            </Text>
            <Text style={{ fontSize: 13, color: "#82818e", textAlign: "center", lineHeight: 19, maxWidth: 280 }}>
              Tải truyện về máy để đọc khi không có kết nối mạng
            </Text>
          </View>
        }
        refreshing={false}
        onRefresh={refreshOffline}
      />
    );
  }

  const data = selectedTab === 0 ? history : bookmarks;

  function renderItem({ item }: { item: LibraryNovel }) {
    const total = getChapterCount(item);
    const current = item.readChapter || 0;
    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    const isHistory = selectedTab === 0;

    return (
      <Link href={`/novel/${item.slug || item.id}`} asChild>
        <Pressable
          style={[{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: isTablet ? 16 : 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(128,128,128,0.12)",
          }, centeredStyle] as any}
        >
          <Image
            source={item.cover_url || "https://placehold.co/160x213"}
            style={{ width: coverSize.width, height: coverSize.height, borderRadius: coverSize.radius }}
            className="object-cover"
          />
          <View style={{ flex: 1, marginLeft: 12, gap: 6, justifyContent: "center" }}>
            <Text
              style={{ fontSize: isTablet ? 17 : 15, fontWeight: "600", color: "#e8e6f0", lineHeight: isTablet ? 22 : 20 }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.author ? (
              <Text style={{ fontSize: isTablet ? 13 : 12, color: "#82818e" }} numberOfLines={1}>
                {item.author}
              </Text>
            ) : null}
            {isHistory ? (
              <View style={{ gap: 4, marginTop: 2 }}>
                <View style={{ height: 4, backgroundColor: "#282b3a", borderRadius: 2, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${Math.max(pct, 2)}%`, backgroundColor: "#5c9cff", borderRadius: 2 }} />
                </View>
                <Text style={{ fontSize: 11, color: "#5c9cff", fontWeight: "600" }}>
                  Chương {current}/{total} · {pct}%
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: isTablet ? 12 : 11, color: "#5c9cff", fontWeight: "600" }}>
                {total} chương
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 24, color: "#555", marginLeft: 8, fontWeight: "300" }}>›</Text>
        </Pressable>
      </Link>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#131620" }}
      ListHeaderComponent={
        <View style={centeredStyle}>
          <UnderlineTabs
            tabs={["Lịch sử", "Đánh dấu", "Đã tải"]}
            selectedIndex={selectedTab}
            onSelect={(idx) => {
              setSelectedTab(idx);
              if (idx === 2) refreshOffline();
            }}
          />
        </View>
      }
      stickyHeaderIndices={[0]}
      renderItem={renderItem}
      ListEmptyComponent={
        !loading ? (
          <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: 32, gap: 10 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "#1a1d28",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 40 }}>{selectedTab === 0 ? "📖" : "🔖"}</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#e8e6f0" }}>
              {selectedTab === 0 ? "Tủ sách còn trống" : "Chưa có đánh dấu"}
            </Text>
            <Text style={{ fontSize: 13, color: "#82818e", textAlign: "center", lineHeight: 19, maxWidth: 280 }}>
              {selectedTab === 0
                ? "Bắt đầu đọc một truyện để theo dõi tiến độ tại đây"
                : "Đánh dấu truyện yêu thích để dễ dàng tìm lại sau"}
            </Text>
            <Link href="/(discover)" asChild>
              <Pressable
                style={{
                  marginTop: 12,
                  backgroundColor: "#5c9cff",
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>
                  Khám phá truyện
                </Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 80 }}>
            <ActivityIndicator color="#5c9cff" />
          </View>
        )
      }
      refreshing={loading}
      onRefresh={() => {
        if (userId) fetchData();
      }}
    />
  );
}
