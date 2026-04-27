import React from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { View, Text, Pressable, ScrollView } from "@/tw";
import NovelCard from "@/components/novel-card";
import SearchFilterBar from "@/components/search-filters";
import type { Novel } from "@/lib/types";
import type { SearchFilters as SearchFiltersType } from "@/hooks/use-search";

interface SearchResultsProps {
  query: string;
  results: Novel[];
  loading: boolean;
  recentSearches: string[];
  filters?: SearchFiltersType;
  setFilters?: (f: Partial<SearchFiltersType>) => void;
  resetFilters?: () => void;
  onSelectRecent: (text: string) => void;
  onRemoveRecent: (text: string) => void;
  onClearRecent: () => void;
  onResultTap?: () => void;
}

export default function SearchResults({
  query,
  results,
  loading,
  recentSearches,
  filters,
  setFilters,
  resetFilters,
  onSelectRecent,
  onRemoveRecent,
  onClearRecent,
  onResultTap,
}: SearchResultsProps) {
  const trimmed = query.trim();
  const hasFilterUI = !!(filters && setFilters && resetFilters);

  // No query — show recent searches
  if (!trimmed) {
    if (recentSearches.length === 0) return null;

    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
          <Text className="text-muted-foreground text-sm font-semibold">
            Tìm kiếm gần đây
          </Text>
          <Pressable onPress={onClearRecent} hitSlop={8}>
            <Text className="text-primary text-sm">Xoá tất cả</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="pb-8">
          {recentSearches.map((term) => (
            <View
              key={term}
              className="flex-row items-center px-4 py-2.5"
            >
              <Pressable
                className="flex-1"
                onPress={() => onSelectRecent(term)}
              >
                <Text className="text-foreground text-base">{term}</Text>
              </Pressable>
              <Pressable onPress={() => onRemoveRecent(term)} hitSlop={8}>
                <Text className="text-muted-foreground text-lg px-2">×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center pt-20">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground text-sm mt-3">
          Đang tìm kiếm...
        </Text>
      </View>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <View className="flex-1 bg-background items-center pt-20">
        <Text className="text-muted-foreground text-4xl mb-2">📭</Text>
        <Text className="text-muted-foreground text-base">
          Không tìm thấy truyện nào
        </Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Thử tìm với từ khoá khác
        </Text>
      </View>
    );
  }

  // Results list
  return (
    <View style={{ flex: 1, backgroundColor: "#131620" }}>
      {hasFilterUI && filters && setFilters && resetFilters && (
        <SearchFilterBar filters={filters} setFilters={setFilters} resetFilters={resetFilters} />
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={onResultTap}>
            <NovelCard novel={item} variant="horizontal" />
          </Pressable>
        )}
        ListHeaderComponent={
          <View className="px-4 pt-2 pb-1">
            <Text className="text-muted-foreground text-sm">
              {results.length} kết quả
            </Text>
          </View>
        }
      />
    </View>
  );
}
