import React from "react";
import { View, Text, Pressable } from "@/tw";
import { Image } from "@/tw/image";
import { Link } from "expo-router";
import { getGenreLabel, getGenreTagColor } from "@/lib/genre";
import type { Novel } from "@/lib/types";
import { useDevice } from "@/hooks/use-device";

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
  // Prefer denormalized chapter_count column (fast, no join)
  if (novel.chapter_count != null) return novel.chapter_count;
  // Fallback to chapters(count) subquery result (detail page)
  if (novel.chapters && novel.chapters.length > 0) return novel.chapters[0]?.count ?? 0;
  return 0;
}

// --- Default: small vertical card for horizontal scroll ---
function DefaultCard({ novel }: { novel: Novel }) {
  const chapterCount = getChapterCount(novel);
  const { isTablet } = useDevice();
  const cardWidth = isTablet ? 140 : 100;

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable style={{ width: cardWidth }}>
        <Image
          source={novel.cover_url || "https://placehold.co/200x267"}
          style={{ width: cardWidth, aspectRatio: 3/4, borderRadius: 8 }}
          className="object-cover"
        />
        <Text
          className="text-xs font-medium mt-1.5"
          numberOfLines={2}
          style={{ color: "#e8e6f0", ...(isTablet ? { fontSize: 14 } : undefined) }}
        >
          {novel.title}
        </Text>
      </Pressable>
    </Link>
  );
}

// --- Grid: 3-column cover cards for "Đề cử" section ---
function GridCard({ novel }: { novel: Novel }) {
  const { isTablet } = useDevice();
  const chapterCount = getChapterCount(novel);
  const genres = novel.genres || [];
  
  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable>
        <Image
          source={novel.cover_url || "https://placehold.co/220x300"}
          style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
          className="object-cover"
        />
        {/* Genre hashtags */}
        {genres.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {genres.slice(0, 1).map((g) => (
              <Text
                key={g}
                style={{ color: getGenreTagColor(g) }}
                className="text-[10px] font-bold"
              >
                #{getGenreLabel(g).toUpperCase()}
              </Text>
            ))}
          </View>
        )}
        <Text
          className="text-xs font-medium mt-1"
          numberOfLines={2}
          style={{ color: "#e8e6f0", ...(isTablet ? { fontSize: 14, lineHeight: 20 } : {}) }}
        >
          {novel.title}
        </Text>
        {isTablet && novel.author && (
          <Text className="text-xs mt-1" style={{ color: "#a1a1aa" }} numberOfLines={1}>
            {novel.author}
          </Text>
        )}
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
            className="text-base font-semibold text-[#e8e6f0]"
            numberOfLines={2}
          >
            {novel.title}
          </Text>
          <Text className="text-sm mt-1 text-[#a1a1aa]">
            Đã đọc {progress.current}/{progress.total}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 ml-2">
          {onBookmark && (
            <Pressable onPress={onBookmark} hitSlop={8}>
              <Text className="text-lg text-[#5c9cff]">&#9998;</Text>
            </Pressable>
          )}
          {onMenu && (
            <Pressable onPress={onMenu} hitSlop={8}>
              <Text className="text-xl text-[#a1a1aa]">&#8942;</Text>
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
            className="text-base font-semibold text-[#e8e6f0]"
            numberOfLines={2}
          >
            {novel.title}
          </Text>
          {novel.author && (
            <Text className="text-sm text-[#a1a1aa]" numberOfLines={1}>
              {novel.author}
            </Text>
          )}
          <View className="flex-row items-center gap-3 mt-0.5">
            <Text className="text-sm text-[#ff9800]">
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text className="text-sm text-[#a1a1aa]">
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
  const { isTablet } = useDevice();
  const imgWidth = isTablet ? 120 : 80;
  const imgHeight = isTablet ? 168 : 112;

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable className={`flex-row px-4 ${isTablet ? 'py-4 flex-1' : 'py-3'}`}>
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: imgWidth, height: imgHeight, borderRadius: 8 }}
          className="object-cover"
        />
        <View className="flex-1 ml-4 justify-center gap-1.5">
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
            className={`font-semibold text-[#e8e6f0] ${isTablet ? 'text-lg leading-6' : 'text-base leading-snug'}`}
            numberOfLines={2}
          >
            {novel.title}
          </Text>
          {novel.author && (
            <Text className={`text-[#a1a1aa] ${isTablet ? 'text-[15px]' : 'text-sm'}`} numberOfLines={1}>
              {novel.author}
            </Text>
          )}
          <View className="flex-row items-center gap-3 mt-1">
            <Text className={`font-medium text-[#ff9800] ${isTablet ? 'text-[15px]' : 'text-sm'}`}>
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text className={`font-medium text-[#a1a1aa] ${isTablet ? 'text-[15px]' : 'text-sm'}`}>
                ▤ {chapterCount} chương
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
  const { isTablet } = useDevice();
  const imgWidth = isTablet ? 120 : 80;
  const imgHeight = isTablet ? 168 : 112;

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable
        className={`flex-row items-center px-4 ${isTablet ? 'py-4 flex-1' : 'py-3'}`}
      >
        <Image
          source={novel.cover_url || "https://placehold.co/160x224"}
          style={{ width: imgWidth, height: imgHeight, borderRadius: 8 }}
          className="object-cover"
        />
        <View style={{ flex: 1, marginLeft: isTablet ? 20 : 12, gap: isTablet ? 6 : 4 }}>
          {/* Genre hashtag */}
          {genres.length > 0 && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {genres.slice(0, 1).map((g) => (
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {rank != null && (
              <View
                style={{
                  width: isTablet ? 36 : 28,
                  height: isTablet ? 36 : 28,
                  borderRadius: isTablet ? 18 : 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: rank <= 3 ? "#1a8cff" : "rgba(153,153,153,0.3)",
                }}
              >
                <Text
                  className="font-bold"
                  style={{ color: rank <= 3 ? "#fff" : "#a1a1aa", fontSize: isTablet ? 16 : 14 }}
                >
                  {rank}
                </Text>
              </View>
            )}
            <Text
              className={`flex-1 font-semibold text-[#e8e6f0] ${isTablet ? 'text-lg leading-[26px]' : 'text-base leading-snug'}`}
              numberOfLines={2}
            >
              {novel.title}
            </Text>
          </View>
          {novel.author && (
            <Text
              className={`text-[#a1a1aa] ${isTablet ? 'text-[15px] mt-1' : 'text-sm'}`}
              numberOfLines={1}
            >
              {novel.author}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: isTablet ? 6 : 2 }}>
            <Text className={`font-medium text-[#ff9800] ${isTablet ? 'text-[15px]' : 'text-sm'}`}>
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text className={`font-medium text-[#a1a1aa] ${isTablet ? 'text-[15px]' : 'text-sm'}`}>
              {chapterCount} chương
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Featured: large card with description, rating, CTA (screenshot 2) ---
function FeaturedCard({ novel, onBookmark }: { novel: Novel; onBookmark?: () => void }) {
  const genre = novel.genres?.[0];
  const chapterCount = getChapterCount(novel);

  return (
    <View className="px-4 flex-row gap-4 py-3">
      <View className="flex-1 justify-center gap-1.5">
        {genre && (
          <Text className="text-sm" style={{ color: "#a1a1aa" }}>
            {getGenreLabel(genre)}
          </Text>
        )}
        <Text className="text-xl font-bold" style={{ color: "#e8e6f0" }} numberOfLines={2}>
          {novel.title}
        </Text>
        {novel.description && (
          <Text
            className="text-sm leading-relaxed"
            style={{ color: "#a1a1aa" }}
            numberOfLines={3}
          >
            {novel.description}
          </Text>
        )}
        <View className="flex-row items-center gap-1 mt-0.5">
          <Text className="text-sm" style={{ color: "#ff9800" }}>★★★★★</Text>
          <Text className="text-sm" style={{ color: "#a1a1aa" }}>
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
          <Link href={`/novel/${novel.slug || novel.id}`} asChild>
            <Pressable className="w-9 h-9 rounded-full bg-primary items-center justify-center">
              <Text className="text-white text-xl leading-none">+</Text>
            </Pressable>
          </Link>
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
