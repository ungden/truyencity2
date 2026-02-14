import React, { useRef, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  PanResponder,
  Platform,
  LayoutChangeEvent,
  GestureResponderEvent,
} from "react-native";
import { View, Text } from "@/tw";
import {
  READING,
  READER_THEMES,
  READER_FONTS,
  LINE_HEIGHT_PRESETS,
  type ReaderThemeId,
  type ReaderTheme,
  type ReaderSettings,
} from "@/lib/config";

// ── Custom Slider (no native module needed) ──────────────────

function CustomSlider({
  value,
  min,
  max,
  step,
  accentColor,
  trackColor,
  onValueChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  accentColor: string;
  trackColor: string;
  onValueChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));

  function handlePress(e: GestureResponderEvent) {
    if (trackWidth <= 0) return;
    const x = e.nativeEvent.locationX;
    const raw = min + (x / trackWidth) * (max - min);
    const stepped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));
    onValueChange(clamped);
  }

  return (
    <Pressable
      onPress={handlePress}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      style={{ height: 36, justifyContent: "center" }}
    >
      {/* Track background */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: trackColor }}>
        {/* Fill */}
        <View
          style={{
            height: "100%",
            borderRadius: 2,
            backgroundColor: accentColor,
            width: `${fraction * 100}%`,
          }}
        />
      </View>
      {/* Thumb */}
      <View
        style={{
          position: "absolute",
          left: Math.max(0, fraction * trackWidth - 12),
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: accentColor,
          top: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 3,
        }}
      />
    </Pressable>
  );
}

// ── Main Component ───────────────────────────────────────────

interface Props {
  visible: boolean;
  settings: ReaderSettings;
  theme: ReaderTheme;
  onUpdate: (partial: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

export default function ReaderSettingsSheet({
  visible,
  settings,
  theme,
  onUpdate,
  onClose,
}: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60) onClose();
      },
    })
  ).current;

  if (!visible) return null;

  const themeIds: ReaderThemeId[] = ["dark", "light", "sepia", "green"];
  const themeCircleColors: Record<ReaderThemeId, string> = {
    dark: "#09090b",
    light: "#ffffff",
    sepia: "#f4ecd8",
    green: "#dce8d2",
  };

  const currentLHIndex = LINE_HEIGHT_PRESETS.findIndex(
    (p) => Math.abs(p.value - settings.lineHeight) < 0.05
  );

  const sectionLabel = {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  };

  return (
    <>
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 90,
        }}
      />

      {/* Sheet */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: theme.controlBg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: Platform.OS === "ios" ? 40 : 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Handle bar */}
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.textSecondary,
              opacity: 0.4,
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 20, gap: 22, paddingBottom: 8 }}>
          {/* ── Theme Selection ── */}
          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>Giao diện</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {themeIds.map((tid) => {
                const isActive = settings.theme === tid;
                return (
                  <Pressable
                    key={tid}
                    onPress={() => onUpdate({ theme: tid })}
                    style={{ alignItems: "center", gap: 6 }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: themeCircleColors[tid],
                        borderWidth: isActive ? 3 : 1,
                        borderColor: isActive ? theme.accent : theme.controlBorder,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? "700" : "400",
                        color: isActive ? theme.accent : theme.textSecondary,
                      }}
                    >
                      {READER_THEMES[tid].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Font Family ── */}
          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>Phông chữ</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {READER_FONTS.map((f) => {
                const isActive = settings.fontFamily === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => onUpdate({ fontFamily: f.id })}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      backgroundColor: isActive ? theme.accent : "transparent",
                      borderWidth: isActive ? 0 : 1,
                      borderColor: theme.controlBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: f.fontFamily,
                        fontSize: 15,
                        fontWeight: "600",
                        color: isActive ? "#fff" : theme.text,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Font Size ── */}
          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>Cỡ chữ</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={() =>
                  onUpdate({ fontSize: Math.max(READING.MIN_FONT_SIZE, settings.fontSize - 2) })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: theme.controlBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>A-</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <CustomSlider
                  value={settings.fontSize}
                  min={READING.MIN_FONT_SIZE}
                  max={READING.MAX_FONT_SIZE}
                  step={1}
                  accentColor={theme.accent}
                  trackColor={theme.controlBorder}
                  onValueChange={(v) => onUpdate({ fontSize: v })}
                />
                <Text style={{ color: theme.textSecondary, fontSize: 11, textAlign: "center", marginTop: 2 }}>
                  {settings.fontSize}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  onUpdate({ fontSize: Math.min(READING.MAX_FONT_SIZE, settings.fontSize + 2) })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: theme.controlBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>A+</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Line Spacing ── */}
          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>Khoảng cách dòng</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {LINE_HEIGHT_PRESETS.map((p, idx) => {
                const isActive = currentLHIndex === idx;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => onUpdate({ lineHeight: p.value })}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      backgroundColor: isActive ? theme.accent : "transparent",
                      borderWidth: isActive ? 0 : 1,
                      borderColor: theme.controlBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isActive ? "#fff" : theme.text,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Brightness ── */}
          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>Độ sáng</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 16 }}>🔅</Text>
              <View style={{ flex: 1 }}>
                <CustomSlider
                  value={settings.brightness}
                  min={0.2}
                  max={1}
                  step={0.05}
                  accentColor={theme.accent}
                  trackColor={theme.controlBorder}
                  onValueChange={(v) => onUpdate({ brightness: v })}
                />
              </View>
              <Text style={{ fontSize: 16 }}>🔆</Text>
            </View>
          </View>

          {/* ── Auto-scroll speed ── */}
          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>Tự cuộn</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>🐢</Text>
              <View style={{ flex: 1 }}>
                <CustomSlider
                  value={settings.autoScrollSpeed}
                  min={0}
                  max={100}
                  step={5}
                  accentColor={theme.accent}
                  trackColor={theme.controlBorder}
                  onValueChange={(v) => onUpdate({ autoScrollSpeed: v })}
                />
              </View>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>🐇</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, width: 32, textAlign: "right" }}>
                {settings.autoScrollSpeed === 0 ? "Tắt" : `${settings.autoScrollSpeed}`}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
}
