import React from "react";
import { View, Text, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import { getGenreLabel, getGenreTagColor } from "@/lib/genre";
import type { Novel } from "@/lib/types";

type Variant =
  | "default"
  | "horizontal"
  | "featured"
  | "library-row"
  | "discover-list"
  | "ranking"
  | "grid";

interface NovelCardProps {
  novel: Novel;
  variant?: Variant;
  rank?: number;
  readProgress?: { current: number; total: number };
  onBookmark?: () => void;
  onMenu?: () => void;
}

function getChapterCount(novel: Novel): number {
  if (!novel.chapters || novel.chapters.length === 0) return 0;
  return novel.chapters[0]?.count ?? 0;
}

// --- Default: small vertical card for horizontal scroll ---
function DefaultCard({ novel }: { novel: Novel }) {
  const chapterCount = getChapterCount(novel);

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable style={{ width: 100 }}>
        <Image
          source={novel.cover_url || "https://placehold.co/200x267"}
          style={{ width: 100, height: 133, borderRadius: 8 }}
          className="object-cover"
        />
        <Text
          className="text-foreground text-xs font-medium mt-1.5"
          numberOfLines={2}
        >
          {novel.title}
        </Text>
      </Pressable>
    </Link>
  );
}

// --- Grid: 3-column cover cards for "Đề cử" section ---
function GridCard({ novel }: { novel: Novel }) {
  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable style={{ flex: 1 }}>
        <Image
          source={novel.cover_url || "https://placehold.co/220x300"}
          style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
          className="object-cover"
        />
        <Text
          className="text-foreground text-xs font-medium mt-1.5"
          numberOfLines={2}
        >
          {novel.title}
        </Text>
      </Pressable>
    </Link>
  );
}

// --- Library Row: matches reference screenshot 1 ---
function LibraryRowCard({
  novel,
  readProgress,
  onBookmark,
  onMenu,
}: {
  novel: Novel;
  readProgress?: { current: number; total: number };
  onBookmark?: () => void;
  onMenu?: () => void;
}) {
  const chapterCount = getChapterCount(novel);
  const progress = readProgress || { current: 0, total: chapterCount };

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable className="flex-row items-center py-3 px-4">
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: 80, height: 106, borderRadius: 8 }}
          className="object-cover"
        />
        <View className="flex-1 ml-3 justify-center">
          <Text
            className="text-foreground text-base font-semibold"
            numberOfLines={2}
          >
            {novel.title}
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            Đã đọc {progress.current}/{progress.total}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 ml-2">
          {onBookmark && (
            <Pressable onPress={onBookmark} hitSlop={8}>
              <Text className="text-primary text-lg">&#9998;</Text>
            </Pressable>
          )}
          {onMenu && (
            <Pressable onPress={onMenu} hitSlop={8}>
              <Text className="text-muted-foreground text-xl">&#8942;</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

// --- Horizontal card: cover + title + genre + info ---
function HorizontalCard({ novel }: { novel: Novel }) {
  const genres = novel.genres || [];
  const chapterCount = getChapterCount(novel);

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable className="flex-row py-3 px-4">
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: 80, height: 112, borderRadius: 8 }}
          className="object-cover"
        />
        <View className="flex-1 ml-3 justify-center gap-1">
          {/* Genre hashtags */}
          {genres.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {genres.slice(0, 2).map((g) => (
                <Text
                  key={g}
                  style={{ color: getGenreTagColor(g) }}
                  className="text-xs font-bold"
                >
                  #{getGenreLabel(g).toUpperCase()}
                </Text>
              ))}
            </View>
          )}
          <Text
            className="text-foreground text-base font-semibold"
            numberOfLines={2}
          >
            {novel.title}
          </Text>
          {novel.author && (
            <Text className="text-muted-foreground text-sm" numberOfLines={1}>
              {novel.author}
            </Text>
          )}
          <View className="flex-row items-center gap-3 mt-0.5">
            <Text className="text-rating text-sm">
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text className="text-muted-foreground text-sm">
              ▤ {chapterCount}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Discover list: for "Mới nhất" full list (screenshot 4) ---
function DiscoverListCard({ novel }: { novel: Novel }) {
  const genres = novel.genres || [];
  const chapterCount = getChapterCount(novel);

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable className="flex-row py-3 px-4">
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: 80, height: 112, borderRadius: 8 }}
          className="object-cover"
        />
        <View className="flex-1 ml-3 justify-center gap-1">
          {/* Genre hashtags */}
          {genres.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {genres.slice(0, 2).map((g) => (
                <Text
                  key={g}
                  style={{ color: getGenreTagColor(g) }}
                  className="text-xs font-bold"
                >
                  #{getGenreLabel(g).toUpperCase()}
                </Text>
              ))}
              {novel.ai_author_id && (
                <Text className="text-xs font-bold text-primary">
                  #AI
                </Text>
              )}
            </View>
          )}
          <Text
            className="text-foreground text-base font-semibold"
            numberOfLines={2}
          >
            {novel.title}
          </Text>
          {novel.author && (
            <Text className="text-muted-foreground text-sm" numberOfLines={1}>
              {novel.author}
            </Text>
          )}
          <View className="flex-row items-center gap-3 mt-0.5">
            <Text className="text-rating text-sm">
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-muted-foreground text-sm">
                ▤ {chapterCount}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Ranking: numbered badge + info (screenshot 5) ---
function RankingCard({ novel, rank }: { novel: Novel; rank?: number }) {
  const genres = novel.genres || [];
  const chapterCount = getChapterCount(novel);

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <Image
          source={novel.cover_url || "https://placehold.co/160x224"}
          style={{ width: 80, height: 112, borderRadius: 8 }}
          className="object-cover"
        />
        <View style={{ flex: 1, marginLeft: 12, gap: 4 }}>
          {/* Genre hashtag */}
          {genres.length > 0 && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {genres.slice(0, 1).map((g) => (
                <Text
                  key={g}
                  style={{ color: getGenreTagColor(g), fontSize: 12, fontWeight: "700" }}
                >
                  #{getGenreLabel(g).toUpperCase()}
                </Text>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {rank != null && (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: rank <= 3 ? "#1a8cff" : "rgba(153,153,153,0.3)",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: rank <= 3 ? "#fff" : "#1a1a1a",
                  }}
                >
                  {rank}
                </Text>
              </View>
            )}
            <Text
              style={{ flex: 1, fontSize: 16, fontWeight: "600", color: "#1a1a1a" }}
              numberOfLines={2}
            >
              {novel.title}
            </Text>
          </View>
          {novel.author && (
            <Text
              style={{ fontSize: 14, color: "#999" }}
              numberOfLines={1}
            >
              {novel.author}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 }}>
            <Text style={{ fontSize: 14, color: "#ff9800" }}>
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text style={{ fontSize: 14, color: "#999" }}>
              {chapterCount} chương
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Featured: large card with description, rating, CTA (screenshot 2) ---
function FeaturedCard({ novel }: { novel: Novel }) {
  const genre = novel.genres?.[0];
  const chapterCount = getChapterCount(novel);

  return (
    <View className="px-4 flex-row gap-4 py-3">
      <View className="flex-1 justify-center gap-1.5">
        {genre && (
          <Text className="text-muted-foreground text-sm">
            {getGenreLabel(genre)}
          </Text>
        )}
        <Text className="text-foreground text-xl font-bold" numberOfLines={2}>
          {novel.title}
        </Text>
        {novel.description && (
          <Text
            className="text-muted-foreground text-sm leading-relaxed"
            numberOfLines={3}
          >
            {novel.description}
          </Text>
        )}
        <View className="flex-row items-center gap-1 mt-0.5">
          <Text className="text-rating text-sm">★★★★★</Text>
          <Text className="text-muted-foreground text-sm">
            {novel.rating ? novel.rating.toFixed(1) : "0.0"}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-2">
          <Link href={`/novel/${novel.slug || novel.id}`} asChild>
            <Pressable className="bg-foreground px-6 py-2 rounded-full">
              <Text className="text-background text-sm font-semibold">
                Đọc
              </Text>
            </Pressable>
          </Link>
          <Pressable className="w-9 h-9 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-xl leading-none">+</Text>
          </Pressable>
        </View>
      </View>
      <Link href={`/novel/${novel.slug || novel.id}`} asChild>
        <Pressable>
          <Image
            source={novel.cover_url || "https://placehold.co/240x320"}
            style={{ width: 120, height: 160, borderRadius: 12 }}
            className="object-cover"
          />
        </Pressable>
      </Link>
    </View>
  );
}

export default function NovelCard({
  novel,
  variant = "default",
  rank,
  readProgress,
  onBookmark,
  onMenu,
}: NovelCardProps) {
  switch (variant) {
    case "library-row":
      return (
        <LibraryRowCard
          novel={novel}
          readProgress={readProgress}
          onBookmark={onBookmark}
          onMenu={onMenu}
        />
      );
    case "horizontal":
      return <HorizontalCard novel={novel} />;
    case "discover-list":
      return <DiscoverListCard novel={novel} />;
    case "ranking":
      return <RankingCard novel={novel} rank={rank} />;
    case "featured":
      return <FeaturedCard novel={novel} />;
    case "grid":
      return <GridCard novel={novel} />;
    default:
      return <DefaultCard novel={novel} />;
  }
}
