import React, { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import NovelCard from "@/components/novel-card";
import HeroCarousel from "@/components/hero-carousel";
import SectionHeader from "@/components/section-header";
import SearchResults from "@/components/search-results";
import { useSearchContext } from "@/contexts/search-context";
import { useDevice } from "@/hooks/use-device";
import type { Novel } from "@/lib/types";
import { AdBanner } from "@/components/ads/ad-banner";

export default function DiscoverScreen() {
  const { width, isTablet, isLargeTablet, gridColumns, centeredStyle } = useDevice();
  const [heroNovels, setHeroNovels] = useState<Novel[]>([]);
  const [latest, setLatest] = useState<Novel[]>([]);
  const [featured, setFeatured] = useState<Novel | null>(null);
  const [recommended, setRecommended] = useState<Novel[]>([]);
  const [newPosts, setNewPosts] = useState<Novel[]>([]);
  const [completed, setCompleted] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  const search = useSearchContext();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const NOVEL_LIST_FIELDS = "id,title,slug,author,cover_url,genres,status,ai_author_id,created_at,updated_at,chapter_count";
      const [latestRes, completedRes] = await Promise.all([
        supabase
          .from("novels")
          .select(NOVEL_LIST_FIELDS)
          .order("updated_at", { ascending: false })
          .limit(300),
        supabase
          .from("novels")
          .select(NOVEL_LIST_FIELDS)
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(30),
      ]);

      const allNovels = latestRes.data || [];

      // Hero: novels with covers, sorted by chapter_count (most content = most popular)
      const withCovers = allNovels.filter((n) => n.cover_url && (n.chapter_count ?? 0) > 0);
      const sortedByChapters = [...withCovers].sort(
        (a, b) => (b.chapter_count ?? 0) - (a.chapter_count ?? 0)
      );
      setHeroNovels(sortedByChapters.slice(0, 8));

      // Latest: first 10
      setLatest(allNovels.slice(0, 10));

      // Featured: the top novel
      setFeatured(sortedByChapters[0] || null);

      // Recommended: next 6 popular ones
      setRecommended(sortedByChapters.slice(1, 7));

      // New posts: recently created
      const sortedByCreated = [...allNovels].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNewPosts(sortedByCreated.slice(0, 8));

      setCompleted(completedRes.data || []);
    } catch (error) {
      console.error("Error fetching discover:", error);
    } finally {
      setLoading(false);
    }
  }

  // When search is active, show search overlay instead of discover content
  if (search.isSearchActive) {
    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: 0 }}
      >
        <SearchResults
          query={search.query}
          results={search.results}
          loading={search.loading}
          recentSearches={search.recentSearches}
          filters={search.filters}
          setFilters={search.setFilters}
          resetFilters={search.resetFilters}
          onSelectRecent={(term) => {
            search.onChangeText(term);
            search.saveRecentSearch(term);
          }}
          onRemoveRecent={search.removeRecentSearch}
          onClearRecent={search.clearRecentSearches}
          onResultTap={() => {
            search.saveRecentSearch(search.query);
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 py-4"
      >
        {/* Skeleton hero */}
        <View className="mx-4 bg-muted rounded-2xl" style={{ height: 200 }} />
        {/* Skeleton sections */}
        {[1, 2].map((i) => (
          <View key={i} className="gap-3 px-4">
            <View className="h-5 w-28 bg-muted rounded" />
            <View className="flex-row gap-3">
              {[1, 2, 3, 4].map((j) => (
                <View
                  key={j}
                  className="bg-muted rounded-lg"
                  style={{ width: 100, height: 133 }}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  if (!loading && latest.length === 0) {
    return (
      <View className="flex-1 bg-background justify-center items-center px-6">
        <Text className="text-foreground text-lg font-semibold text-center mb-2">
          Không có dữ liệu
        </Text>
        <Text className="text-muted-foreground text-center mb-6">
          Vui lòng kiểm tra lại kết nối mạng của bạn hoặc thử lại sau.
        </Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            fetchData();
          }}
          className="bg-primary px-6 py-3 rounded-full"
        >
          <Text className="text-primary-foreground font-medium">Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-4"
    >
      {/* Hero carousel */}
      {heroNovels.length > 0 && (
        <View className="pt-2">
          <HeroCarousel novels={heroNovels} />
        </View>
      )}

      {/* Latest section — small thumbnails */}
      {latest.length > 0 && (
        <View className="mt-4">
          <SectionHeader title="Mới nhất" href="/(discover)/latest" />
          <FlatList
            data={latest}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => <NovelCard novel={item} />}
          />
        </View>
      )}

      {/* Featured novel card */}
      {featured && (
        <View className="mt-4">
          <NovelCard novel={featured} variant="featured" />
        </View>
      )}

      {/* Banner ad — between hero/latest sections and the main content grid.
          Hidden for VIP users. */}
      <AdBanner placement="home" />

      {/* Recommended — responsive grid */}
      {recommended.length > 0 && (
        <View className="mt-4">
          <SectionHeader title="Đề cử" href="/(discover)/latest" />
          <View
            style={[
              {
                paddingHorizontal: 16,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
              },
              centeredStyle,
            ] as any}
          >
            {recommended.slice(0, isLargeTablet ? 10 : isTablet ? 8 : 6).map((novel) => {
              const containerWidth = centeredStyle?.maxWidth && typeof centeredStyle.maxWidth === "number" ? Math.min(width, centeredStyle.maxWidth) : width;
              const itemWidth = (containerWidth - 32 - 12 * (gridColumns - 1)) / gridColumns;
              return (
                <View key={novel.id} style={{ width: itemWidth }}>
                  <NovelCard novel={novel} variant="grid" />
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* New posts section */}
      {newPosts.length > 0 && (
        <View className="mt-4">
          <SectionHeader title="Mới đăng" accent href="/(discover)/latest" />
          <FlatList
            data={newPosts}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: isTablet ? 16 : 12 }}
            renderItem={({ item }) => {
              const cardWidth = isLargeTablet ? 160 : isTablet ? 140 : 100;
              return (
              <Link href={`/novel/${item.slug || item.id}`} asChild>
                <Pressable style={{ width: cardWidth }}>
                  <Image
                    source={item.cover_url || "https://placehold.co/280x373"}
                    style={{ width: cardWidth, aspectRatio: 3/4, borderRadius: 12 }}
                    className="object-cover"
                  />
                  <Text
                    className="text-foreground font-medium mt-1.5"
                    numberOfLines={2}
                    style={{ fontSize: isTablet ? 14 : 12 }}
                  >
                    {item.title}
                  </Text>
                  {isTablet && item.author && (
                    <Text style={{ fontSize: 12, color: "#82818e", marginTop: 2 }} numberOfLines={1}>
                      {item.author}
                    </Text>
                  )}
                </Pressable>
              </Link>
            )}}
          />
        </View>
      )}

      {/* Recently completed */}
      {completed.length > 0 && (
        <View className="mt-4">
          <SectionHeader title="Mới hoàn thành" href="/(discover)/latest" />
          {completed.slice(0, 6).map((novel) => (
            <NovelCard key={novel.id} novel={novel} variant="horizontal" />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
