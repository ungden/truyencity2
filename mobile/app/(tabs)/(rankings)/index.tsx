import React, { useEffect, useState, useCallback } from "react";
import { FlatList, ActivityIndicator, ScrollView as RNScrollView } from "react-native";
import { View, Text, Pressable } from "@/tw";
import { supabase } from "@/lib/supabase";
import NovelCard from "@/components/novel-card";
import UnderlineTabs from "@/components/underline-tabs";
import type { Novel } from "@/lib/types";

const CATEGORIES = ["Lượt đọc", "Đề cử", "Mới nhất", "Hoàn thành"];

type SortMode = "views" | "bookmarks" | "latest" | "completed";

const SORT_MAP: Record<number, SortMode> = {
  0: "views",
  1: "bookmarks",
  2: "latest",
  3: "completed",
};

export default function RankingsScreen() {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async (mode: SortMode) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_ranked_novels", {
        p_sort_by: mode,
        p_limit: 30,
        p_offset: 0,
      });

      if (error) throw error;

      setNovels((data || []) as Novel[]);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings(SORT_MAP[selectedCategory]);
  }, [selectedCategory, fetchRankings]);

  function ListHeader() {
    return (
      <View className="bg-background">
        {/* Filter pills */}
        <View className="flex-row items-center gap-2 px-4 pt-2 pb-2">
          <View className="bg-secondary px-3 py-1.5 rounded-full">
            <Text className="text-foreground text-sm font-medium">Tất cả</Text>
          </View>
          <View className="bg-secondary px-3 py-1.5 rounded-full">
            <Text className="text-foreground text-sm font-medium">
              Chuyển ngữ
            </Text>
          </View>
        </View>
        {/* Category tabs */}
        <RNScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
        >
          <UnderlineTabs
            tabs={CATEGORIES}
            selectedIndex={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </RNScrollView>
      </View>
    );
  }

  return (
    <FlatList
      data={novels}
      keyExtractor={(item) => item.id}
      style={{ flex: 1, backgroundColor: "#131620" }}
      ListHeaderComponent={<ListHeader />}
      stickyHeaderIndices={[0]}
      renderItem={({ item, index }) => (
        <View className="border-b border-border">
          <NovelCard novel={item} variant="ranking" rank={index + 1} />
        </View>
      )}
      ListEmptyComponent={
        !loading ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground text-base">
              Không có truyện nào
            </Text>
          </View>
        ) : (
          <View className="items-center py-20">
            <ActivityIndicator />
          </View>
        )
      }
      refreshing={loading}
      onRefresh={() => fetchRankings(SORT_MAP[selectedCategory])}
    />
  );
}
