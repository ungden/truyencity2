import React, { useEffect, useState } from "react";
import { FlatList, useWindowDimensions } from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import NovelCard from "@/components/novel-card";
import HeroCarousel from "@/components/hero-carousel";
import SectionHeader from "@/components/section-header";
import SearchResults from "@/components/search-results";
import { AdBanner } from "@/components/ads/ad-banner";
import { useSearchContext } from "@/contexts/search-context";
import type { Novel } from "@/lib/types";

export default function DiscoverScreen() {
  const { width } = useWindowDimensions();
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
          .limit(30),
        supabase
          .from("novels")
          .select(NOVEL_LIST_FIELDS)
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      const allNovels = latestRes.data || [];

      // Hero: novels with covers, sorted by chapter_count (most content = most popular)
      const withCovers = allNovels.filter((n) => n.cover_url);
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

      {/* Banner Ad */}
      <AdBanner placement="home" />

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

      {/* Recommended — 3-column grid */}
      {recommended.length > 0 && (
        <View className="mt-4">
          <SectionHeader title="Đề cử" />
          <View
            style={{
              paddingHorizontal: 16,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {recommended.slice(0, 6).map((novel) => {
              const columns = width >= 768 ? 4 : 3;
              const itemWidth = (width - 32 - 12 * (columns - 1)) / columns;
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
          <SectionHeader title="Mới đăng" accent />
          <FlatList
            data={newPosts}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => (
              <Link href={`/novel/${item.slug || item.id}`} asChild>
                <Pressable style={{ width: 140 }}>
                  <Image
                    source={item.cover_url || "https://placehold.co/280x373"}
                    style={{ width: 140, height: 187, borderRadius: 12 }}
                    className="object-cover"
                  />
                  <Text
                    className="text-foreground text-sm font-medium mt-1.5"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              </Link>
            )}
          />
        </View>
      )}

      {/* Recently completed */}
      {completed.length > 0 && (
        <View className="mt-4">
          <SectionHeader title="Mới hoàn thành" />
          {completed.slice(0, 6).map((novel) => (
            <NovelCard key={novel.id} novel={novel} variant="horizontal" />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
