import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  ScrollView as RNScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  StatusBar,
} from "react-native";
import { View, Text, Pressable } from "@/tw";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  READING,
  CACHE,
  READER_THEMES,
  READER_FONTS,
  type ReaderSettings,
  type ReaderThemeId,
} from "@/lib/config";
import type { Chapter } from "@/lib/types";
import RenderHtml from "react-native-render-html";
import * as Haptics from "expo-haptics";
import { useTTS } from "@/hooks/use-tts";
import { TTS_SPEEDS } from "@/lib/tts";
import { getChapterOffline } from "@/lib/offline-db";
import { useKeepAwake } from "expo-keep-awake";
import ReaderSettingsSheet from "@/components/reader-settings-sheet";

// ── Settings persistence ─────────────────────────────────────

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: READING.DEFAULT_FONT_SIZE,
  lineHeight: READING.DEFAULT_LINE_HEIGHT,
  theme: "dark",
  fontFamily: "system",
  brightness: 0.8,
  ttsSpeed: 1.0,
  autoScrollSpeed: 0,
};

function getStoredSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(CACHE.READING_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: ReaderSettings) {
  localStorage.setItem(CACHE.READING_SETTINGS_KEY, JSON.stringify(s));
}

// ── Strip duplicate chapter heading from content ─────────────

function stripChapterHeading(html: string, chapterNumber: number): string {
  // Strip any "Chương X: Whatever" line at the start of content
  // regardless of whether it matches the metadata title
  const patterns = [
    // Plain text: "Chương 123: Any Title Here" (with optional punctuation)
    /^\s*Chương\s+\d+\s*[:\-–—]\s*[^\n]+\n*/i,
    // Wrapped in HTML tags: <p>Chương 123: Title</p>
    /^\s*<(?:p|h[1-6]|div|strong)[^>]*>\s*Chương\s+\d+\s*[:\-–—]\s*[^<]*<\/(?:p|h[1-6]|div|strong)>\s*/i,
  ];

  let result = html;
  for (const pat of patterns) {
    result = result.replace(pat, "");
  }
  return result.trim();
}

// ── Main Component ───────────────────────────────────────────

export default function ReadingScreen() {
  const { slug, chapter } = useLocalSearchParams<{
    slug: string;
    chapter: string;
  }>();
  const { width, height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<RNScrollView>(null);
  const chapterNumber = parseInt(chapter || "1", 10);

  // Keep screen awake while reading
  useKeepAwake();

  // State
  const [novelId, setNovelId] = useState<string | null>(null);
  const [novelTitle, setNovelTitle] = useState("");
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ReaderSettings>(getStoredSettings);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  // Auto-scroll
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollOffsetRef = useRef(0);
  const maxScrollRef = useRef(0);

  // TTS — init with persisted speed
  const tts = useTTS();
  const ttsSpeedInitialized = useRef(false);

  // Initialize TTS speed from stored settings
  useEffect(() => {
    if (!ttsSpeedInitialized.current && settings.ttsSpeed !== 1.0) {
      tts.setSpeed(settings.ttsSpeed);
      ttsSpeedInitialized.current = true;
    }
  }, [settings.ttsSpeed]);

  // Active theme
  const theme = READER_THEMES[settings.theme];

  // Brightness is controlled via a dark overlay (no native module needed)
  // settings.brightness: 1 = full bright (no overlay), 0 = very dim
  const brightnessOverlayOpacity = 1 - settings.brightness;

  // Stop TTS when chapter changes
  useEffect(() => {
    tts.stop();
  }, [slug, chapter]);

  // Auto-scroll logic
  useEffect(() => {
    if (settings.autoScrollSpeed > 0 && !showSettings) {
      // Clear any existing interval
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);

      const pxPerTick = settings.autoScrollSpeed / 20; // 50ms interval = 20 ticks/sec
      autoScrollRef.current = setInterval(() => {
        if (scrollRef.current && maxScrollRef.current > 0) {
          scrollOffsetRef.current = Math.min(
            scrollOffsetRef.current + pxPerTick,
            maxScrollRef.current
          );
          scrollRef.current.scrollTo({
            y: scrollOffsetRef.current,
            animated: false,
          });
        }
      }, 50);
    } else {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    }

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [settings.autoScrollSpeed, showSettings]);

  // ── Settings update handler ──

  function updateSettings(partial: Partial<ReaderSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);

      // Sync TTS speed if changed
      if (partial.ttsSpeed !== undefined) {
        tts.setSpeed(partial.ttsSpeed);
      }

      return next;
    });

    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  }

  // ── TTS handlers ──

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
    const newRate = TTS_SPEEDS[nextIdx].rate;
    tts.setSpeed(newRate);
    updateSettings({ ttsSpeed: newRate });
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  }

  // ── Fetch chapter data ──

  useEffect(() => {
    if (slug && chapter) fetchChapter();
  }, [slug, chapter]);

  async function fetchChapter() {
    setLoading(true);
    setError(null);
    try {
      const { data: novelData, error: novelError } = await supabase
        .from("novels")
        .select("id, title, slug")
        .eq("slug", slug)
        .single();

      if (novelError || !novelData) {
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
    // Offline-first
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
        try {
          const { count } = await supabase
            .from("chapters")
            .select("id", { count: "exact", head: true })
            .eq("novel_id", nId);
          setTotalChapters(count || 0);
        } catch {
          setTotalChapters(0);
        }
        saveProgress(nId, chapterNumber);
        return;
      }
    } catch {}

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
    saveProgress(nId, chapterNumber);
  }

  async function saveProgress(nId: string, chapNum: number) {
    try {
      const progressKey = CACHE.READING_PROGRESS_KEY;
      const existing = JSON.parse(localStorage.getItem(progressKey) || "{}");
      existing[nId] = {
        chapterNumber: chapNum,
        timestamp: Date.now(),
        positionPercent: 0,
      };
      localStorage.setItem(progressKey, JSON.stringify(existing));

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
    } catch (err) {
      console.warn("Failed to save reading progress:", err);
    }
  }

  // ── Navigation ──

  const hasPrev = chapterNumber > 1;
  const hasNext = chapterNumber < totalChapters;

  function goToChapter(num: number) {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(`/read/${slug}/${num}`);
  }

  // ── Scroll handling ──

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxScroll = contentSize.height - layoutMeasurement.height;
      maxScrollRef.current = maxScroll;
      scrollOffsetRef.current = contentOffset.y;
      if (maxScroll > 0) {
        const pct = Math.round((contentOffset.y / maxScroll) * 100);
        setScrollProgress(Math.min(100, Math.max(0, pct)));
      }
    },
    []
  );

  // ── Tap zones ──
  // Left 1/3 = scroll up one viewport, Center 1/3 = toggle controls, Right 1/3 = scroll down

  function handleTapZone(pageX: number) {
    if (showSettings) {
      setShowSettings(false);
      return;
    }

    const leftZone = width / 3;
    const rightZone = (width * 2) / 3;

    if (pageX < leftZone) {
      // Tap left — scroll up by screen height
      const newOffset = Math.max(0, scrollOffsetRef.current - (screenHeight - 120));
      scrollRef.current?.scrollTo({ y: newOffset, animated: true });
      if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    } else if (pageX > rightZone) {
      // Tap right — scroll down by screen height
      const newOffset = Math.min(
        maxScrollRef.current,
        scrollOffsetRef.current + (screenHeight - 120)
      );
      scrollRef.current?.scrollTo({ y: newOffset, animated: true });
      if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    } else {
      // Tap center — toggle controls
      setShowControls((prev) => !prev);
    }
  }

  // ── HTML rendering ──

  const fontFamily = READER_FONTS.find((f) => f.id === settings.fontFamily)?.fontFamily || "System";

  const cleanedHtml = useMemo(() => {
    if (!currentChapter?.content) return "";
    let content = stripChapterHeading(currentChapter.content, chapterNumber);

    // If content is plain text (no HTML tags), wrap paragraphs in <p> tags
    const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(content);
    if (!hasHtmlTags) {
      content = content
        .split(/\n\n+/)
        .map((para) => para.trim())
        .filter((para) => para.length > 0)
        .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
        .join("");
    }

    return content;
  }, [currentChapter?.content, chapterNumber, currentChapter?.title]);

  const htmlSource = cleanedHtml ? { html: cleanedHtml } : undefined;

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: theme.text,
        fontSize: settings.fontSize,
        lineHeight: settings.fontSize * settings.lineHeight,
        fontFamily,
      },
      p: {
        marginBottom: 20,
        textAlign: "justify" as const,
        textIndent: 24,
      },
      h1: {
        fontSize: settings.fontSize + 8,
        fontWeight: "bold" as const,
        marginBottom: 16,
        marginTop: 24,
        color: theme.heading,
        fontFamily,
      },
      h2: {
        fontSize: settings.fontSize + 4,
        fontWeight: "600" as const,
        marginBottom: 12,
        marginTop: 20,
        color: theme.heading,
        fontFamily,
      },
      h3: {
        fontSize: settings.fontSize + 2,
        fontWeight: "600" as const,
        marginBottom: 8,
        marginTop: 16,
        color: theme.heading,
        fontFamily,
      },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: theme.blockquoteBorder,
        paddingLeft: 16,
        fontStyle: "italic" as const,
        color: theme.textSecondary,
      },
      a: {
        color: theme.linkColor,
        textDecorationLine: "none" as const,
      },
    }),
    [theme, settings.fontSize, settings.lineHeight, fontFamily]
  );

  // ── Control bar fade animation ──

  const controlOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(controlOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showControls]);

  // ── Render ──

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerShown: false }} />
        <StatusBar barStyle={theme.statusBar === "light" ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </>
    );
  }

  if (error || !currentChapter) {
    return (
      <>
        <Stack.Screen options={{ title: "Lỗi", headerShown: true }} />
        <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 24 }}>
          <Text style={{ color: theme.text, fontSize: 18, textAlign: "center" }}>
            {error || "Không tìm thấy nội dung"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: theme.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Quay lại</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={theme.statusBar === "light" ? "light-content" : "dark-content"} />

      {/* ── Top header bar ── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: theme.barBg,
          paddingTop: 54, // safe area
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          opacity: controlOpacity,
          borderBottomWidth: 1,
          borderBottomColor: theme.controlBorder,
        }}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.controlBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.text, fontSize: 20, marginTop: -2 }}>{"‹"}</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
            {novelTitle}
          </Text>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
            Ch. {chapterNumber}: {currentChapter.title}
          </Text>
        </View>
        {isOffline && (
          <View
            style={{
              backgroundColor: "#22c55e20",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#22c55e", fontSize: 10, fontWeight: "700" }}>OFFLINE</Text>
          </View>
        )}
      </Animated.View>

      {/* ── Progress bar (always visible, thin) ── */}
      <View
        style={{
          position: "absolute",
          top: showControls ? 102 : 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: theme.controlBorder,
          zIndex: 49,
        }}
      >
        <View
          style={{
            height: "100%",
            backgroundColor: theme.accent,
            width: `${scrollProgress}%`,
          }}
        />
      </View>

      {/* ── Content area with tap zones ── */}
      <Pressable
        onPress={(e) => handleTapZone(e.nativeEvent.pageX)}
        style={{ flex: 1, backgroundColor: theme.bg }}
      >
        <RNScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: showControls ? 116 : 52,
            paddingBottom: 160,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Chapter heading */}
          <Text
            style={{
              color: theme.heading,
              fontSize: settings.fontSize + 6,
              fontWeight: "800",
              fontFamily,
              marginBottom: 24,
              lineHeight: (settings.fontSize + 6) * 1.3,
            }}
          >
            Chương {chapterNumber}: {currentChapter.title}
          </Text>

          {/* Chapter content */}
          {htmlSource && (
            <RenderHtml
              contentWidth={width - 40}
              source={htmlSource}
              tagsStyles={tagsStyles}
              defaultTextProps={{
                selectable: true,
              }}
              enableExperimentalMarginCollapsing
            />
          )}

          {/* Chapter end navigation */}
          <View style={{ marginTop: 32, gap: 12, paddingBottom: 32 }}>
            <View style={{ height: 1, backgroundColor: theme.controlBorder, marginBottom: 16 }} />
            <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 8 }}>
              Chương {chapterNumber} / {totalChapters}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => hasPrev && goToChapter(chapterNumber - 1)}
                disabled={!hasPrev}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: hasPrev ? theme.controlBg : theme.controlBorder,
                  opacity: hasPrev ? 1 : 0.3,
                  borderWidth: 1,
                  borderColor: theme.controlBorder,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>Chương trước</Text>
              </Pressable>
              <Pressable
                onPress={() => hasNext && goToChapter(chapterNumber + 1)}
                disabled={!hasNext}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: hasNext ? theme.accent : theme.controlBorder,
                  opacity: hasNext ? 1 : 0.3,
                }}
              >
                <Text style={{ color: hasNext ? "#fff" : theme.text, fontWeight: "600" }}>
                  Chương tiếp
                </Text>
              </Pressable>
            </View>
          </View>
        </RNScrollView>
      </Pressable>

      {/* ── Brightness overlay (dims screen without native module) ── */}
      {brightnessOverlayOpacity > 0.01 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
            opacity: brightnessOverlayOpacity * 0.7, // max 70% dim
            zIndex: 40,
          }}
        />
      )}

      {/* ── TTS mini player ── */}
      {tts.status !== "idle" && (
        <View
          style={{
            backgroundColor: theme.controlBg,
            borderTopWidth: 1,
            borderTopColor: theme.controlBorder,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Pressable
            onPress={handleTTSToggle}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {tts.status === "playing" ? "⏸" : "▶"}
            </Text>
          </Pressable>

          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
              {tts.status === "playing" ? "Đang đọc..." : "Tạm dừng"}
            </Text>
            {tts.totalChunks > 1 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ flex: 1, height: 3, backgroundColor: theme.controlBorder, borderRadius: 2 }}>
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.max(((tts.currentChunk + 1) / tts.totalChunks) * 100, 5)}%`,
                      backgroundColor: theme.accent,
                      borderRadius: 2,
                    }}
                  />
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                  {tts.currentChunk + 1}/{tts.totalChunks}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={cycleTTSSpeed}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: theme.controlBorder,
            }}
          >
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "700" }}>
              {tts.speed}x
            </Text>
          </Pressable>

          <Pressable
            onPress={tts.stop}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.controlBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "700" }}>■</Text>
          </Pressable>
        </View>
      )}

      {/* ── Bottom control bar ── */}
      <Animated.View
        style={{
          backgroundColor: theme.barBg,
          borderTopWidth: 1,
          borderTopColor: theme.controlBorder,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 40, // safe area
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: controlOpacity,
        }}
        pointerEvents={showControls ? "auto" : "none"}
      >
        {/* Settings button (Aa) */}
        <Pressable
          onPress={() => setShowSettings((prev) => !prev)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: showSettings ? theme.accent : theme.controlBg,
            borderWidth: 1,
            borderColor: showSettings ? theme.accent : theme.controlBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: showSettings ? "#fff" : theme.text,
            }}
          >
            Aa
          </Text>
        </Pressable>

        {/* TTS trigger */}
        <Pressable
          onPress={handleTTSToggle}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: tts.status !== "idle" ? theme.accent : theme.controlBg,
            borderWidth: 1,
            borderColor: tts.status !== "idle" ? theme.accent : theme.controlBorder,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: tts.status !== "idle" ? "#fff" : theme.accent,
              fontWeight: "600",
            }}
          >
            {tts.status === "playing"
              ? "⏸ Dừng"
              : tts.status === "paused"
              ? "▶ Tiếp"
              : "🔊 Nghe"}
          </Text>
        </Pressable>

        {/* Auto-scroll indicator */}
        {settings.autoScrollSpeed > 0 && (
          <Pressable
            onPress={() => updateSettings({ autoScrollSpeed: 0 })}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: theme.accent + "20",
            }}
          >
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "700" }}>
              ▼ {settings.autoScrollSpeed}
            </Text>
          </Pressable>
        )}

        {/* Chapter navigation */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable
            onPress={() => hasPrev && goToChapter(chapterNumber - 1)}
            disabled={!hasPrev}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: hasPrev ? theme.controlBg : "transparent",
              borderWidth: 1,
              borderColor: hasPrev ? theme.controlBorder : "transparent",
              alignItems: "center",
              justifyContent: "center",
              opacity: hasPrev ? 1 : 0.3,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 16 }}>{"‹"}</Text>
          </Pressable>
          <Text style={{ color: theme.textSecondary, fontSize: 12, minWidth: 40, textAlign: "center" }}>
            {chapterNumber}/{totalChapters}
          </Text>
          <Pressable
            onPress={() => hasNext && goToChapter(chapterNumber + 1)}
            disabled={!hasNext}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: hasNext ? theme.controlBg : "transparent",
              borderWidth: 1,
              borderColor: hasNext ? theme.controlBorder : "transparent",
              alignItems: "center",
              justifyContent: "center",
              opacity: hasNext ? 1 : 0.3,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 16 }}>{"›"}</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Settings Sheet ── */}
      <ReaderSettingsSheet
        visible={showSettings}
        settings={settings}
        theme={theme}
        onUpdate={updateSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
