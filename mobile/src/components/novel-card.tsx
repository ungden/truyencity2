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
  if (novel.chapter_count != null) return novel.chapter_count;
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
          style={{ width: cardWidth, aspectRatio: 3 / 4, borderRadius: 8 }}
          className="object-cover"
        />
        <Text
          numberOfLines={2}
          style={{ color: "#e8e6f0", fontSize: isTablet ? 14 : 12, fontWeight: "500", marginTop: 6 }}
        >
          {novel.title}
        </Text>
      </Pressable>
    </Link>
  );
}

// --- Grid: responsive cover cards for "Đề cử" section ---
function GridCard({ novel }: { novel: Novel }) {
  const { isTablet } = useDevice();
  const genres = novel.genres || [];

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable>
        <Image
          source={novel.cover_url || "https://placehold.co/220x300"}
          style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
          className="object-cover"
        />
        {genres.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {genres.slice(0, 1).map((g) => (
              <Text
                key={g}
                style={{ color: getGenreTagColor(g), fontSize: 10, fontWeight: "700" }}
              >
                #{getGenreLabel(g).toUpperCase()}
              </Text>
            ))}
          </View>
        )}
        <Text
          numberOfLines={2}
          style={{ color: "#e8e6f0", fontSize: isTablet ? 14 : 12, fontWeight: "500", marginTop: 4 }}
        >
          {novel.title}
        </Text>
        {isTablet && novel.author && (
          <Text style={{ color: "#a1a1aa", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
            {novel.author}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

// --- Library Row ---
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
  const { isTablet } = useDevice();
  const progress = readProgress || { current: 0, total: chapterCount };

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: isTablet ? 14 : 12,
          paddingHorizontal: 16,
        }}
      >
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: isTablet ? 100 : 80, height: isTablet ? 140 : 106, borderRadius: isTablet ? 10 : 8 }}
          className="object-cover"
        />
        <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
          <Text
            numberOfLines={2}
            style={{ fontSize: isTablet ? 17 : 16, fontWeight: "600", color: "#e8e6f0" }}
          >
            {novel.title}
          </Text>
          <Text style={{ fontSize: isTablet ? 14 : 13, color: "#a1a1aa", marginTop: 4 }}>
            Đã đọc {progress.current}/{progress.total}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 8 }}>
          {onBookmark && (
            <Pressable onPress={onBookmark} hitSlop={8}>
              <Text style={{ fontSize: 18, color: "#5c9cff" }}>&#9998;</Text>
            </Pressable>
          )}
          {onMenu && (
            <Pressable onPress={onMenu} hitSlop={8}>
              <Text style={{ fontSize: 20, color: "#a1a1aa" }}>&#8942;</Text>
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
  const { isTablet } = useDevice();
  const imgW = isTablet ? 120 : 80;
  const imgH = isTablet ? 168 : 112;

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable
        style={{
          flexDirection: "row",
          paddingVertical: isTablet ? 16 : 12,
          paddingHorizontal: 16,
        }}
      >
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: imgW, height: imgH, borderRadius: isTablet ? 10 : 8 }}
          className="object-cover"
        />
        <View style={{ flex: 1, marginLeft: isTablet ? 16 : 12, justifyContent: "center", gap: 4 }}>
          {genres.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {genres.slice(0, 2).map((g) => (
                <Text
                  key={g}
                  style={{ color: getGenreTagColor(g), fontSize: 12, fontWeight: "700" }}
                >
                  #{getGenreLabel(g).toUpperCase()}
                </Text>
              ))}
            </View>
          )}
          <Text
            numberOfLines={2}
            style={{ fontSize: isTablet ? 18 : 16, fontWeight: "600", color: "#e8e6f0", lineHeight: isTablet ? 26 : 22 }}
          >
            {novel.title}
          </Text>
          {novel.author && (
            <Text numberOfLines={1} style={{ fontSize: isTablet ? 15 : 14, color: "#a1a1aa" }}>
              {novel.author}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 }}>
            <Text style={{ fontSize: isTablet ? 15 : 14, fontWeight: "500", color: "#ff9800" }}>
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text style={{ fontSize: isTablet ? 15 : 14, fontWeight: "500", color: "#a1a1aa" }}>
              ▤ {chapterCount} chương
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Discover list: for "Mới nhất" full list ---
function DiscoverListCard({ novel }: { novel: Novel }) {
  const genres = novel.genres || [];
  const chapterCount = getChapterCount(novel);
  const { isTablet } = useDevice();
  const imgW = isTablet ? 120 : 80;
  const imgH = isTablet ? 168 : 112;

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable
        style={{
          flexDirection: "row",
          paddingVertical: isTablet ? 16 : 12,
          paddingHorizontal: 16,
        }}
      >
        <Image
          source={novel.cover_url || "https://placehold.co/160x213"}
          style={{ width: imgW, height: imgH, borderRadius: isTablet ? 10 : 8 }}
          className="object-cover"
        />
        <View style={{ flex: 1, marginLeft: isTablet ? 16 : 12, justifyContent: "center", gap: 6 }}>
          {genres.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {genres.slice(0, 2).map((g) => (
                <Text
                  key={g}
                  style={{ color: getGenreTagColor(g), fontSize: 12, fontWeight: "700" }}
                >
                  #{getGenreLabel(g).toUpperCase()}
                </Text>
              ))}
            </View>
          )}
          <Text
            numberOfLines={2}
            style={{ fontSize: isTablet ? 18 : 16, fontWeight: "600", color: "#e8e6f0", lineHeight: isTablet ? 26 : 22 }}
          >
            {novel.title}
          </Text>
          {novel.author && (
            <Text numberOfLines={1} style={{ fontSize: isTablet ? 15 : 14, color: "#a1a1aa" }}>
              {novel.author}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 }}>
            <Text style={{ fontSize: isTablet ? 15 : 14, fontWeight: "500", color: "#ff9800" }}>
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text style={{ fontSize: isTablet ? 15 : 14, fontWeight: "500", color: "#a1a1aa" }}>
              ▤ {chapterCount} chương
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Ranking: numbered badge + info ---
function RankingCard({ novel, rank }: { novel: Novel; rank?: number }) {
  const genres = novel.genres || [];
  const chapterCount = getChapterCount(novel);
  const { isTablet } = useDevice();
  const imgW = isTablet ? 120 : 80;
  const imgH = isTablet ? 168 : 112;

  return (
    <Link href={`/novel/${novel.slug || novel.id}`} asChild>
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: isTablet ? 16 : 12,
          paddingHorizontal: 16,
        }}
      >
        <Image
          source={novel.cover_url || "https://placehold.co/160x224"}
          style={{ width: imgW, height: imgH, borderRadius: isTablet ? 10 : 8 }}
          className="object-cover"
        />
        <View style={{ flex: 1, marginLeft: isTablet ? 20 : 12, gap: isTablet ? 6 : 4 }}>
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
                  width: isTablet ? 36 : 28,
                  height: isTablet ? 36 : 28,
                  borderRadius: isTablet ? 18 : 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: rank <= 3 ? "#1a8cff" : "rgba(153,153,153,0.3)",
                }}
              >
                <Text
                  style={{ color: rank <= 3 ? "#fff" : "#a1a1aa", fontSize: isTablet ? 16 : 14, fontWeight: "700" }}
                >
                  {rank}
                </Text>
              </View>
            )}
            <Text
              numberOfLines={2}
              style={{ flex: 1, fontSize: isTablet ? 18 : 16, fontWeight: "600", color: "#e8e6f0", lineHeight: isTablet ? 26 : 22 }}
            >
              {novel.title}
            </Text>
          </View>
          {novel.author && (
            <Text
              numberOfLines={1}
              style={{ fontSize: isTablet ? 15 : 14, color: "#a1a1aa", marginTop: isTablet ? 2 : 0 }}
            >
              {novel.author}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: isTablet ? 4 : 2 }}>
            <Text style={{ fontSize: isTablet ? 15 : 14, fontWeight: "500", color: "#ff9800" }}>
              ★ {novel.rating ? novel.rating.toFixed(1) : "0.0"}
            </Text>
            <Text style={{ fontSize: isTablet ? 15 : 14, fontWeight: "500", color: "#a1a1aa" }}>
              {chapterCount} chương
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// --- Featured: large card with description, rating, CTA ---
function FeaturedCard({ novel }: { novel: Novel }) {
  const genre = novel.genres?.[0];
  const { isTablet } = useDevice();

  return (
    <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: isTablet ? 20 : 16, paddingVertical: 12 }}>
      <View style={{ flex: 1, justifyContent: "center", gap: 6 }}>
        {genre && (
          <Text style={{ fontSize: isTablet ? 15 : 14, color: "#a1a1aa" }}>
            {getGenreLabel(genre)}
          </Text>
        )}
        <Text
          numberOfLines={2}
          style={{ fontSize: isTablet ? 24 : 20, fontWeight: "700", color: "#e8e6f0" }}
        >
          {novel.title}
        </Text>
        {novel.description && (
          <Text
            numberOfLines={3}
            style={{ fontSize: isTablet ? 15 : 14, color: "#a1a1aa", lineHeight: isTablet ? 22 : 20 }}
          >
            {novel.description}
          </Text>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 14, color: "#ff9800" }}>★★★★★</Text>
          <Text style={{ fontSize: 14, color: "#a1a1aa" }}>
            {novel.rating ? novel.rating.toFixed(1) : "0.0"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
          <Link href={`/novel/${novel.slug || novel.id}`} asChild>
            <Pressable
              style={{
                backgroundColor: "#e8e6f0",
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "#131620", fontSize: 14, fontWeight: "600" }}>
                Đọc
              </Text>
            </Pressable>
          </Link>
          <Link href={`/novel/${novel.slug || novel.id}`} asChild>
            <Pressable
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#5c9cff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 20 }}>+</Text>
            </Pressable>
          </Link>
        </View>
      </View>
      <Link href={`/novel/${novel.slug || novel.id}`} asChild>
        <Pressable>
          <Image
            source={novel.cover_url || "https://placehold.co/240x320"}
            style={{ width: isTablet ? 160 : 120, height: isTablet ? 213 : 160, borderRadius: 12 }}
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
