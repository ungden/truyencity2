import React, { useEffect, useState, useCallback } from "react";
import { FlatList, ActivityIndicator } from "react-native";
import { View, Text } from "@/tw";
import { supabase } from "@/lib/supabase";
import NovelCard from "@/components/novel-card";
import type { Novel } from "@/lib/types";

const PAGE_SIZE = 20;

export default function LatestScreen() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchNovels = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const NOVEL_LIST_FIELDS = "id,title,slug,author,cover_url,genres,status,ai_author_id,created_at,updated_at,chapters(count)";
        const { data, error } = await supabase
          .from("novels")
          .select(NOVEL_LIST_FIELDS)
          .order("updated_at", { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        const results = data || [];
        setHasMore(results.length === PAGE_SIZE);

        if (append) {
          setNovels((prev) => [...prev, ...results]);
        } else {
          setNovels(results);
        }
      } catch (error) {
        console.error("Error fetching latest:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNovels(0, false);
  }, [fetchNovels]);

  function loadMore() {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNovels(nextPage, true);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={novels}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }) => (
          <View className="border-b border-border">
            <NovelCard novel={item} variant="discover-list" />
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-muted-foreground text-base">
                Không có truyện nào
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator />
            </View>
          ) : null
        }
        refreshing={loading}
        onRefresh={() => {
          setPage(0);
          fetchNovels(0, false);
        }}
      />
    </View>
  );
}
