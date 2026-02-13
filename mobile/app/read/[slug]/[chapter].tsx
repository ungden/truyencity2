import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  ScrollView as RNScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { View, Text, Pressable } from "@/tw";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { READING, CACHE } from "@/lib/config";
import type { Chapter } from "@/lib/types";
import RenderHtml from "react-native-render-html";
import * as Haptics from "expo-haptics";
import { useTTS } from "@/hooks/use-tts";
import { TTS_SPEEDS } from "@/lib/tts";
import { getChapterOffline } from "@/lib/offline-db";

type ReadingSettings = {
  fontSize: number;
  lineHeight: number;
};

function getStoredSettings(): ReadingSettings {
  try {
    const raw = localStorage.getItem(CACHE.READING_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    fontSize: READING.DEFAULT_FONT_SIZE,
    lineHeight: READING.DEFAULT_LINE_HEIGHT,
  };
}

function saveSettings(s: ReadingSettings) {
  localStorage.setItem(CACHE.READING_SETTINGS_KEY, JSON.stringify(s));
}

export default function ReadingScreen() {
  const { slug, chapter } = useLocalSearchParams<{
    slug: string;
    chapter: string;
  }>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<RNScrollView>(null);
  const chapterNumber = parseInt(chapter || "1", 10);

  const [novelId, setNovelId] = useState<string | null>(null);
  const [novelTitle, setNovelTitle] = useState("");
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ReadingSettings>(getStoredSettings);
  const [showControls, setShowControls] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  // TTS
  const tts = useTTS();

  // Stop TTS when chapter changes
  useEffect(() => {
    tts.stop();
  }, [slug, chapter]);

  function handleTTSToggle() {
    if (tts.status === "idle") {
      if (currentChapter?.content) {
        tts.speak(currentChapter.content);
      }
    } else if (tts.status === "playing") {
      tts.pause();
    } else if (tts.status === "paused") {
      tts.resume();
    }
  }

  function cycleTTSSpeed() {
    const currentIdx = TTS_SPEEDS.findIndex((s) => s.rate === tts.speed);
    const nextIdx = (currentIdx + 1) % TTS_SPEEDS.length;
    tts.setSpeed(TTS_SPEEDS[nextIdx].rate);
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  }

  // Fetch chapter data
  useEffect(() => {
    if (slug && chapter) fetchChapter();
  }, [slug, chapter]);

  async function fetchChapter() {
    setLoading(true);
    setError(null);
    try {
      // Resolve slug to novel
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("id, title, slug")
        .eq("slug", slug)
        .single();

      if (novelError || !novelData) {
        // Try by ID
        const { data: byId } = await supabase
          .from("novels")
          .select("id, title, slug")
          .eq("id", slug)
          .single();
        if (!byId) {
          setError("Không tìm thấy truyện");
          setLoading(false);
          return;
        }
        setNovelId(byId.id);
        setNovelTitle(byId.title);
        await fetchChapterData(byId.id);
      } else {
        setNovelId(novelData.id);
        setNovelTitle(novelData.title);
        await fetchChapterData(novelData.id);
      }
    } catch (err) {
      console.error("Error fetching chapter:", err);
      setError("Lỗi khi tải chương");
    } finally {
      setLoading(false);
    }
  }

  async function fetchChapterData(nId: string) {
    // Offline-first: check local SQLite cache
    try {
      const offlineChapter = getChapterOffline(nId, chapterNumber);
      if (offlineChapter && offlineChapter.content) {
        setCurrentChapter({
          id: offlineChapter.id,
          novel_id: offlineChapter.novel_id,
          chapter_number: offlineChapter.chapter_number,
          title: offlineChapter.title,
          content: offlineChapter.content,
          created_at: offlineChapter.downloaded_at,
        });
        setIsOffline(true);

        // Still try to get total chapter count (may fail offline)
        try {
          const { count } = await supabase
            .from("chapters")
            .select("id", { count: "exact", head: true })
            .eq("novel_id", nId);
          setTotalChapters(count || 0);
        } catch {
          // Offline — estimate from cached chapters or use 0
          setTotalChapters(0);
        }

        saveProgress(nId, chapterNumber);
        return;
      }
    } catch {
      // SQLite error — fall through to online fetch
    }

    // Online fetch
    setIsOffline(false);
    const [chapterRes, countRes] = await Promise.all([
      supabase
        .from("chapters")
        .select("*")
        .eq("novel_id", nId)
        .eq("chapter_number", chapterNumber)
        .single(),
      supabase
        .from("chapters")
        .select("id", { count: "exact", head: true })
        .eq("novel_id", nId),
    ]);

    if (chapterRes.error || !chapterRes.data) {
      setError(`Không tìm thấy chương ${chapterNumber}`);
      return;
    }

    setCurrentChapter(chapterRes.data);
    setTotalChapters(countRes.count || 0);

    // Save reading progress
    saveProgress(nId, chapterNumber);
  }

  async function saveProgress(nId: string, chapNum: number) {
    try {
      // Local storage
      const progressKey = CACHE.READING_PROGRESS_KEY;
      const existing = JSON.parse(localStorage.getItem(progressKey) || "{}");
      existing[nId] = {
        chapterNumber: chapNum,
        timestamp: Date.now(),
        positionPercent: 0,
      };
      localStorage.setItem(progressKey, JSON.stringify(existing));

      // Server (if logged in)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("reading_progress").upsert(
          {
            user_id: user.id,
            novel_id: nId,
            chapter_number: chapNum,
            position_percent: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,novel_id" }
        );
      }
    } catch {}
  }

  // Navigation
  const hasPrev = chapterNumber > 1;
  const hasNext = chapterNumber < totalChapters;

  function goToChapter(num: number) {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(`/read/${slug}/${num}`);
  }

  // Font size controls
  function adjustFontSize(delta: number) {
    setSettings((prev) => {
      const next = {
        ...prev,
        fontSize: Math.max(
          READING.MIN_FONT_SIZE,
          Math.min(READING.MAX_FONT_SIZE, prev.fontSize + delta)
        ),
      };
      saveSettings(next);
      return next;
    });
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  }

  // Scroll handling
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxScroll = contentSize.height - layoutMeasurement.height;
      if (maxScroll > 0) {
        const pct = Math.round((contentOffset.y / maxScroll) * 100);
        setScrollProgress(Math.min(100, Math.max(0, pct)));
      }
    },
    []
  );

  // Toggle controls on tap
  function toggleControls() {
    setShowControls((prev) => !prev);
  }

  // Build HTML source for RenderHtml
  const htmlSource = currentChapter?.content
    ? { html: currentChapter.content }
    : undefined;

  const tagsStyles = {
    body: {
      color: "#e4e4e7", // zinc-200
      fontSize: settings.fontSize,
      lineHeight: settings.fontSize * settings.lineHeight,
    },
    p: {
      marginBottom: 16,
    },
    h1: {
      fontSize: settings.fontSize + 8,
      fontWeight: "bold" as const,
      marginBottom: 16,
      marginTop: 24,
      color: "#fafafa",
    },
    h2: {
      fontSize: settings.fontSize + 4,
      fontWeight: "600" as const,
      marginBottom: 12,
      marginTop: 20,
      color: "#fafafa",
    },
    h3: {
      fontSize: settings.fontSize + 2,
      fontWeight: "600" as const,
      marginBottom: 8,
      marginTop: 16,
      color: "#fafafa",
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: "#52525b",
      paddingLeft: 16,
      fontStyle: "italic" as const,
      color: "#a1a1aa",
    },
    a: {
      color: "#a78bfa",
      textDecorationLine: "none" as const,
    },
  };

  // --- Render ---

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View className="flex-1 bg-[#09090b] items-center justify-center">
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      </>
    );
  }

  if (error || !currentChapter) {
    return (
      <>
        <Stack.Screen options={{ title: "Lỗi" }} />
        <View className="flex-1 bg-[#09090b] items-center justify-center gap-4 px-6">
          <Text className="text-white text-lg text-center">
            {error || "Không tìm thấy nội dung"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-primary-foreground font-semibold">
              Quay lại
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Ch. ${chapterNumber}`,
          headerShown: showControls,
          headerStyle: { backgroundColor: "#09090b" },
          headerTintColor: "#fafafa",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {/* Progress bar */}
      <View className="h-[2px] bg-zinc-800">
        <View
          className="h-full bg-primary"
          style={{ width: `${scrollProgress}%` }}
        />
      </View>

      <Pressable
        onPress={toggleControls}
        style={{ flex: 1, backgroundColor: "#09090b" }}
      >
        <RNScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 128 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Chapter header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Text className="text-zinc-400 text-sm">{novelTitle}</Text>
            {isOffline && (
              <View
                style={{
                  backgroundColor: "#22c55e20",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "600" }}>
                  Offline
                </Text>
              </View>
            )}
          </View>
          <Text className="text-white text-xl font-bold mb-6">
            Chương {chapterNumber}: {currentChapter.title}
          </Text>

          {/* Chapter content */}
          {htmlSource && (
            <RenderHtml
              contentWidth={width - 32}
              source={htmlSource}
              tagsStyles={tagsStyles}
              defaultTextProps={{
                selectable: true,
              }}
              enableExperimentalMarginCollapsing
            />
          )}

          {/* Chapter end navigation */}
          <View className="mt-8 gap-3 pb-8">
            <View className="h-px bg-zinc-800 mb-4" />
            <Text className="text-zinc-500 text-sm text-center mb-2">
              Chương {chapterNumber} / {totalChapters}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => hasPrev && goToChapter(chapterNumber - 1)}
                className={`flex-1 py-3 rounded-xl items-center ${
                  hasPrev ? "bg-zinc-800" : "bg-zinc-900 opacity-40"
                }`}
                disabled={!hasPrev}
              >
                <Text className="text-white font-medium">Chương trước</Text>
              </Pressable>
              <Pressable
                onPress={() => hasNext && goToChapter(chapterNumber + 1)}
                className={`flex-1 py-3 rounded-xl items-center ${
                  hasNext ? "bg-primary" : "bg-zinc-900 opacity-40"
                }`}
                disabled={!hasNext}
              >
                <Text
                  className={`font-medium ${
                    hasNext ? "text-primary-foreground" : "text-white"
                  }`}
                >
                  Chương tiếp
                </Text>
              </Pressable>
            </View>
          </View>
        </RNScrollView>
      </Pressable>

      {/* TTS mini player — shown when TTS is active */}
      {tts.status !== "idle" && (
        <View
          style={{
            backgroundColor: "#18181b",
            borderTopWidth: 1,
            borderTopColor: "#27272a",
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Play/Pause */}
          <Pressable
            onPress={handleTTSToggle}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#a78bfa",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {tts.status === "playing" ? "⏸" : "▶"}
            </Text>
          </Pressable>

          {/* Progress info */}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: "#e4e4e7", fontSize: 13, fontWeight: "600" }}>
              {tts.status === "playing" ? "Đang đọc..." : "Tạm dừng"}
            </Text>
            {tts.totalChunks > 1 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {/* Mini progress bar */}
                <View style={{ flex: 1, height: 3, backgroundColor: "#27272a", borderRadius: 2 }}>
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.max(((tts.currentChunk + 1) / tts.totalChunks) * 100, 5)}%`,
                      backgroundColor: "#a78bfa",
                      borderRadius: 2,
                    }}
                  />
                </View>
                <Text style={{ color: "#71717a", fontSize: 10 }}>
                  {tts.currentChunk + 1}/{tts.totalChunks}
                </Text>
              </View>
            )}
          </View>

          {/* Speed button */}
          <Pressable
            onPress={cycleTTSSpeed}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: "#27272a",
            }}
          >
            <Text style={{ color: "#a78bfa", fontSize: 13, fontWeight: "700" }}>
              {tts.speed}x
            </Text>
          </Pressable>

          {/* Stop button */}
          <Pressable
            onPress={tts.stop}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#27272a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "700" }}>
              ■
            </Text>
          </Pressable>
        </View>
      )}

      {/* Bottom control bar */}
      {showControls && (
        <View
          style={{
            backgroundColor: "#09090b",
            borderTopWidth: 1,
            borderTopColor: "#27272a",
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 40,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Font controls */}
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => adjustFontSize(-2)}
              className="w-10 h-10 rounded-lg bg-zinc-800 items-center justify-center"
            >
              <Text className="text-white text-lg font-bold">A-</Text>
            </Pressable>
            <Text className="text-zinc-400 text-sm min-w-[32px] text-center">
              {settings.fontSize}
            </Text>
            <Pressable
              onPress={() => adjustFontSize(2)}
              className="w-10 h-10 rounded-lg bg-zinc-800 items-center justify-center"
            >
              <Text className="text-white text-lg font-bold">A+</Text>
            </Pressable>
          </View>

          {/* TTS trigger button */}
          <Pressable
            onPress={handleTTSToggle}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: tts.status !== "idle" ? "#a78bfa" : "#27272a",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: tts.status !== "idle" ? "#fff" : "#a78bfa",
                fontWeight: "600",
              }}
            >
              {tts.status === "playing" ? "⏸ Dừng" : tts.status === "paused" ? "▶ Tiếp" : "🔊 Nghe"}
            </Text>
          </Pressable>

          {/* Chapter nav */}
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => hasPrev && goToChapter(chapterNumber - 1)}
              disabled={!hasPrev}
              className={`px-4 py-2 rounded-lg ${
                hasPrev ? "bg-zinc-800" : "bg-zinc-900 opacity-40"
              }`}
            >
              <Text className="text-white text-sm">{"<"}</Text>
            </Pressable>
            <Text className="text-zinc-400 text-sm">
              {chapterNumber}/{totalChapters}
            </Text>
            <Pressable
              onPress={() => hasNext && goToChapter(chapterNumber + 1)}
              disabled={!hasNext}
              className={`px-4 py-2 rounded-lg ${
                hasNext ? "bg-zinc-800" : "bg-zinc-900 opacity-40"
              }`}
            >
              <Text className="text-white text-sm">{">"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}
