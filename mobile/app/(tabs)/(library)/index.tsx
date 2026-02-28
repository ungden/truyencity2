import React, { useEffect, useState } from "react";
import { FlatList, ActivityIndicator, Alert } from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import UnderlineTabs from "@/components/underline-tabs";
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
  updated_at: string;
};

type BookmarkItem = {
  novel_id: string;
  created_at: string;
};

type LibraryNovel = Novel & {
  readChapter?: number;
};

export default function LibraryScreen() {
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
          .select("novel_id, chapter_number, updated_at")
          .eq("user_id", userId!)
          .order("updated_at", { ascending: false })
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
        className="flex-1 bg-background"
        contentContainerClassName="flex-1 items-center justify-center gap-4 px-8"
      >
        <Text className="text-foreground text-xl font-bold text-center">
          Đăng nhập để xem tủ sách
        </Text>
        <Text className="text-muted-foreground text-sm text-center">
          Lưu truyện yêu thích và theo dõi tiến độ đọc của bạn
        </Text>
        <Link href="/(account)/login" asChild>
          <Pressable className="bg-primary px-8 py-3 rounded-xl mt-2">
            <Text className="text-primary-foreground font-semibold">
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
        style={{ flex: 1, backgroundColor: "#131620" }}
        ListHeaderComponent={
          <UnderlineTabs
            tabs={["Lịch sử", "Đánh dấu", "Đã tải"]}
            selectedIndex={selectedTab}
            onSelect={(idx) => {
              setSelectedTab(idx);
              if (idx === 2) refreshOffline();
            }}
          />
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item }: { item: OfflineNovel }) => (
          <Link href={`/novel/${item.slug || item.novel_id}`} asChild>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(128,128,128,0.2)",
              }}
            >
              <Image
                source={item.cover_url || "https://placehold.co/160x213"}
                style={{ width: 80, height: 106, borderRadius: 8 }}
                className="object-cover"
              />
              <View className="flex-1 ml-3 justify-center">
                <Text
                  className="text-foreground text-base font-semibold"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text className="text-muted-foreground text-sm mt-1">
                  {item.downloaded_chapters}/{item.total_chapters} chương
                </Text>
                <Text style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>
                  {formatStorageSize(getNovelStorageSize(item.novel_id))}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDeleteOfflineNovel(item)}
                hitSlop={8}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: "#ef444418",
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "600" }}>
                  Xóa
                </Text>
              </Pressable>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 gap-2">
            <Text style={{ fontSize: 32 }}>📥</Text>
            <Text className="text-muted-foreground text-base">
              Chưa tải truyện nào
            </Text>
            <Text className="text-muted-foreground text-sm text-center px-8">
              Vào trang truyện và bấm "Tải để đọc offline"
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

    return (
      <Link href={`/novel/${item.slug || item.id}`} asChild>
        <Pressable className="flex-row items-center py-3 px-4 border-b border-border">
          <Image
            source={item.cover_url || "https://placehold.co/160x213"}
            style={{ width: 80, height: 106, borderRadius: 8 }}
            className="object-cover"
          />
          <View className="flex-1 ml-3 justify-center">
            <Text
              className="text-foreground text-base font-semibold"
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text className="text-muted-foreground text-sm mt-1">
              {selectedTab === 0
                ? `Đã đọc ${current}/${total}`
                : `${total} chương`}
            </Text>
          </View>
          <View className="flex-row items-center gap-4 ml-2">
            <Text className="text-primary text-lg">&#9998;</Text>
            <Text className="text-muted-foreground text-xl">&#8942;</Text>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      style={{ flex: 1, backgroundColor: "#131620" }}
      ListHeaderComponent={
        <UnderlineTabs
          tabs={["Lịch sử", "Đánh dấu", "Đã tải"]}
          selectedIndex={selectedTab}
          onSelect={(idx) => {
            setSelectedTab(idx);
            if (idx === 2) refreshOffline();
          }}
        />
      }
      stickyHeaderIndices={[0]}
      renderItem={renderItem}
      ListEmptyComponent={
        !loading ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground text-base">
              {selectedTab === 0
                ? "Chưa đọc truyện nào"
                : "Chưa đánh dấu truyện nào"}
            </Text>
          </View>
        ) : (
          <View className="items-center py-20">
            <ActivityIndicator />
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
