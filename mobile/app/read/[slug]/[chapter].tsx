import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  ScrollView as RNScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  StatusBar,
  AppState,
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
import { useDevice } from "@/hooks/use-device";
import { TTS_SPEEDS } from "@/lib/tts";
import { getChapterOffline } from "@/lib/offline-db";
import { useKeepAwake } from "expo-keep-awake";
import { useInterstitialAd } from "@/hooks/use-interstitial-ad";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReaderSettingsSheet from "@/components/reader-settings-sheet";
import {
  saveProgress as saveReadingProgress,
  resolveProgress,
  type ProgressRecord,
} from "@/services/reading-progress";
import {
  startSession,
  updateSessionDuration,
  endSession,
  markChapterRead,
} from "@/services/reading-sessions";

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
  try {
    localStorage.setItem(CACHE.READING_SETTINGS_KEY, JSON.stringify(s));
  } catch {}
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
  const { isTablet, readerPadding, readerMaxWidth } = useDevice();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<RNScrollView>(null);
  const chapterNumber = parseInt(chapter || "1", 10);

  // Keep screen awake while reading
  useKeepAwake();

  // Interstitial ads — shows every 4 chapter navigations
  const { onChapterChange } = useInterstitialAd();

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

  // Active theme (fallback to dark if key is invalid)
  const theme = READER_THEMES[settings.theme] ?? READER_THEMES.dark;

  // Brightness is controlled via a dark overlay (no native module needed)
  // settings.brightness: 1 = full bright (no overlay), 0 = very dim
  const brightnessOverlayOpacity = 1 - settings.brightness;

  // Stop TTS when chapter/novel changes (must run before new content loads)
  useEffect(() => {
    return () => {
      // Cleanup: stop TTS when navigating away or chapter changes
      tts.stop();
    };
  }, [slug, chapterNumber]);

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
        doSaveProgress(nId, chapterNumber, offlineChapter.id);
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
    doSaveProgress(nId, chapterNumber, chapterRes.data.id);
  }

  // ── Reading progress + session tracking refs ──
  const lastSaveAtRef = useRef(0);
  const markedReadRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const secondsRef = useRef(0);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedAppliedRef = useRef(false);
  const scrollPercentRef = useRef(0);

  /** Save progress for current chapter (called on load + on scroll throttled) */
  async function doSaveProgress(nId: string, chapNum: number, chapterId?: string, posPercent = 0) {
    const record: ProgressRecord = {
      novelId: nId,
      chapterId,
      chapterNumber: chapNum,
      positionPercent: posPercent,
      lastRead: new Date().toISOString(),
    };
    await saveReadingProgress(record).catch(() => {});
  }

  // ── Navigation ──

  const hasPrev = chapterNumber > 1;
  const hasNext = chapterNumber < totalChapters;

  function goToChapter(num: number) {
    // Stop TTS immediately before navigating to prevent stale audio
    tts.stop();
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Show interstitial ad every N chapter navigations (non-blocking)
    onChapterChange();
    router.replace(`/read/${slug}/${num}`);
  }

  // ── Scroll handling (with progress save + mark-as-read) ──

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxScroll = contentSize.height - layoutMeasurement.height;
      maxScrollRef.current = maxScroll;
      scrollOffsetRef.current = contentOffset.y;
      if (maxScroll > 0) {
        const pct = Math.round((contentOffset.y / maxScroll) * 100);
        const clampedPct = Math.min(100, Math.max(0, pct));
        setScrollProgress(clampedPct);
        scrollPercentRef.current = clampedPct;

        // Throttled save: every 5s or at 100%
        const now = Date.now();
        if (
          novelId &&
          currentChapter &&
          (now - lastSaveAtRef.current >= READING.PROGRESS_SAVE_INTERVAL_MS || clampedPct === 100)
        ) {
          lastSaveAtRef.current = now;
          doSaveProgress(novelId, chapterNumber, currentChapter.id, clampedPct);
        }

        // Mark chapter as read at 95%
        if (
          !markedReadRef.current &&
          novelId &&
          currentChapter &&
          clampedPct >= READING.MARK_AS_READ_THRESHOLD
        ) {
          markedReadRef.current = true;
          markChapterRead({ novelId, chapterId: currentChapter.id });
        }
      }
    },
    [novelId, currentChapter, chapterNumber]
  );

  // ── Restore scroll position from saved progress ──

  useEffect(() => {
    if (!currentChapter || !novelId || savedAppliedRef.current || loading) return;
    let cancelled = false;

    (async () => {
      try {
        const resolved = await resolveProgress(novelId);
        if (cancelled || !resolved) return;
        if (
          resolved.chapterNumber === chapterNumber &&
          resolved.positionPercent > 0 &&
          maxScrollRef.current > 0
        ) {
          const targetY = (resolved.positionPercent / 100) * maxScrollRef.current;
          // Small delay to let RenderHtml finish layout
          setTimeout(() => {
            if (!cancelled) {
              scrollRef.current?.scrollTo({ y: targetY, animated: false });
              savedAppliedRef.current = true;
            }
          }, 300);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [currentChapter, novelId, loading]);

  // ── Reading session tracking ──

  useEffect(() => {
    if (!currentChapter || !novelId) return;

    // Reset refs for new chapter
    markedReadRef.current = false;
    lastSaveAtRef.current = 0;
    secondsRef.current = 0;

    // Start session
    startSession({ novelId, chapterId: currentChapter.id }).then((id) => {
      sessionIdRef.current = id;
    });

    // Tick: count seconds only when app is active
    let appActive = true;
    const appStateSub = AppState.addEventListener("change", (state) => {
      appActive = state === "active";
    });

    tickTimerRef.current = setInterval(() => {
      if (appActive) secondsRef.current += 1;
    }, 1000);

    // Heartbeat: push duration to server every 30s
    heartbeatTimerRef.current = setInterval(() => {
      if (sessionIdRef.current && secondsRef.current > 0) {
        updateSessionDuration(sessionIdRef.current, secondsRef.current);
      }
    }, READING.SESSION_HEARTBEAT_INTERVAL_MS);

    return () => {
      // End session
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current, secondsRef.current);
        sessionIdRef.current = null;
      }
      if (tickTimerRef.current) {
        clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      appStateSub.remove();

      // Final save of scroll position
      if (novelId && currentChapter) {
        doSaveProgress(novelId, chapterNumber, currentChapter.id, scrollPercentRef.current);
      }
    };
  }, [currentChapter, novelId]);

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
          paddingTop: insets.top + 6,
          paddingBottom: 12,
          paddingHorizontal: isTablet ? 32 : 16,
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
          top: showControls ? insets.top + 48 : 0,
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
            paddingHorizontal: readerPadding,
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
              contentWidth={readerMaxWidth ? readerMaxWidth - 48 : width - 40}
              source={htmlSource}
              tagsStyles={tagsStyles}
              defaultTextProps={{
                selectable: true,
              }}
              enableExperimentalMarginCollapsing
            />
          )}

          {/* Chapter end navigation */}
          <View style={{ marginTop: 32, gap: 12, paddingBottom: 32, ...(readerMaxWidth ? { maxWidth: readerMaxWidth - 48, alignSelf: "center" as const, width: "100%" as any } : {}) }}>
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
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Tốc độ đọc ${tts.speed}x, nhấn để đổi`}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 10,
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
          paddingHorizontal: isTablet ? 32 : 16,
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

        {/* TTS trigger — reads the chapter aloud, continues in background */}
        <Pressable
          onPress={handleTTSToggle}
          accessibilityRole="button"
          accessibilityLabel={
            tts.status === "playing"
              ? "Dừng đọc truyện"
              : tts.status === "paused"
              ? "Tiếp tục đọc truyện"
              : "Nghe truyện bằng giọng đọc"
          }
          accessibilityHint="Âm thanh tiếp tục phát khi khoá máy hoặc chuyển ứng dụng"
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
