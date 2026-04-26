import React, { useState, useEffect } from "react";
import { Alert, FlatList, Image as RNImage, Linking, Platform } from "react-native";
import { View, Text, ScrollView, Pressable, Link } from "@/tw";
import { supabase } from "@/lib/supabase";
import { useUserStats } from "@/hooks/use-user-stats";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import {
  calculateXP,
  getCurrentLevel,
  getNextLevel,
  getLevelProgress,
  getUnlockedAchievements,
  getLockedAchievements,
  type Achievement,
} from "@/lib/gamification";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  getOfflineStorageSize,
  deleteAllOfflineData,
  formatStorageSize,
} from "@/lib/offline-db";
import { useDevice } from "@/hooks/use-device";

// Brand logo asset
const LOGO = require("../../../assets/logo.png");

// ─── Helpers ──────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds < 60) return "0 phút";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} phút`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Level Card ───────────────────────────────────────────────

function LevelCard({
  xp,
  levelColor,
}: {
  xp: number;
  levelColor: string;
}) {
  const current = getCurrentLevel(xp);
  const next = getNextLevel(xp);
  const progress = getLevelProgress(xp);
  const { centeredStyle } = useDevice();

  return (
    <View
      style={[{ marginHorizontal: 16, borderRadius: 16, overflow: "hidden", backgroundColor: "#1a1d28" }, centeredStyle] as any}
    >
      {/* Top accent bar */}
      <View style={{ height: 4, backgroundColor: levelColor }} />

      <View className="p-5 gap-4">
        {/* Level title row */}
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: levelColor,
                }}
              >
                {current.title}
              </Text>
              <View
                style={{
                  backgroundColor: levelColor + "25",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: levelColor,
                  }}
                >
                  Lv.{current.level}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: "#82818e" }}>
              {current.subtitle}
            </Text>
          </View>

          {/* XP badge */}
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: "#e8e6f0" }}
            >
              {formatNumber(xp)}
            </Text>
            <Text style={{ fontSize: 11, color: "#82818e" }}>XP</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="gap-2">
          <View
            style={{
              height: 8,
              backgroundColor: "#282b3a",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.max(progress * 100, 2)}%`,
                backgroundColor: levelColor,
                borderRadius: 4,
              }}
            />
          </View>
          {next ? (
            <View className="flex-row justify-between">
              <Text style={{ fontSize: 11, color: "#82818e" }}>
                {formatNumber(xp)} / {formatNumber(next.minXP)} XP
              </Text>
              <Text style={{ fontSize: 11, color: "#82818e" }}>
                {next.title}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: levelColor }}>
              Cảnh giới tối cao!
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Stats Grid ───────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
  icon: string;
}

function StatsGrid({ items }: { items: StatItem[] }) {
  const { isTablet, isLargeTablet, centeredStyle } = useDevice();
  // 4 columns on large tablet, 4 on tablet, 2 on phone
  const itemWidth = isTablet ? "23%" : "47%";

  return (
    <View style={[{ marginHorizontal: 16, gap: 12 }, centeredStyle] as any}>
      <Text
        style={{
          fontSize: isTablet ? 18 : 16,
          fontWeight: "700",
          color: "#e8e6f0",
          marginBottom: 2,
        }}
      >
        Thống kê đọc truyện
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {items.map((item) => (
          <View
            key={item.label}
            style={{
              backgroundColor: "#1a1d28",
              borderRadius: 14,
              padding: isTablet ? 16 : 14,
              width: itemWidth as any,
              flexGrow: 1,
              gap: 6,
            }}
          >
            <View style={{ width: isTablet ? 36 : 32, height: isTablet ? 36 : 32, borderRadius: 8, backgroundColor: "#282b3a", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: isTablet ? 18 : 16 }}>{item.icon}</Text>
            </View>
            <Text
              style={{ fontSize: isTablet ? 24 : 22, fontWeight: "700", color: "#e8e6f0" }}
            >
              {item.value}
            </Text>
            <Text style={{ fontSize: isTablet ? 13 : 12, color: "#82818e" }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Achievement Badge ────────────────────────────────────────

function AchievementBadge({
  achievement,
  unlocked,
}: {
  achievement: Achievement;
  unlocked: boolean;
}) {
  return (
    <View
      style={{
        width: 80,
        alignItems: "center",
        gap: 4,
        opacity: unlocked ? 1 : 0.35,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: unlocked ? "#282b3a" : "#1a1d28",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: unlocked ? 2 : 1,
          borderColor: unlocked ? "#5c9cff" : "#282b3a",
        }}
      >
        <Text style={{ fontSize: 24 }}>{achievement.icon}</Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: unlocked ? "#e8e6f0" : "#82818e",
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {achievement.title}
      </Text>
    </View>
  );
}

// ─── Achievements Section ─────────────────────────────────────

function AchievementsSection({
  unlocked,
  locked,
}: {
  unlocked: Achievement[];
  locked: Achievement[];
}) {
  const total = unlocked.length + locked.length;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between mx-4">
        <Text
          style={{ fontSize: 16, fontWeight: "700", color: "#e8e6f0" }}
        >
          Thành tích
        </Text>
        <Text style={{ fontSize: 13, color: "#82818e" }}>
          {unlocked.length}/{total}
        </Text>
      </View>

      {/* Unlocked achievements — horizontal scroll */}
      {unlocked.length > 0 && (
        <FlatList
          data={unlocked}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <AchievementBadge achievement={item} unlocked />
          )}
        />
      )}

      {/* Locked achievements — horizontal scroll (dimmed) */}
      {locked.length > 0 && (
        <FlatList
          data={locked}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <AchievementBadge achievement={item} unlocked={false} />
          )}
        />
      )}
    </View>
  );
}

// ─── Settings Menu ────────────────────────────────────────────

interface MenuItem {
  label: string;
  icon: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingsMenu({ items }: { items: MenuItem[] }) {
  return (
    <View className="mx-4" style={{ backgroundColor: "#1a1d28", borderRadius: 16, overflow: "hidden" }}>
      {items.map((item, i) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: i < items.length - 1 ? 1 : 0,
            borderBottomColor: "#282b3a",
          }}
        >
          <Text style={{ fontSize: 18 }}>{item.icon}</Text>
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              color: item.destructive ? "#e53935" : "#e8e6f0",
              fontWeight: item.destructive ? "600" : "400",
            }}
          >
            {item.label}
          </Text>
          {!item.destructive && (
            <Text style={{ fontSize: 16, color: "#82818e" }}>›</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, stats, loading, isAuthenticated, refetch } = useUserStats();
  const { isVip } = useRevenueCat();
  const { isTablet, centeredStyle } = useDevice();
  const [offlineSize, setOfflineSize] = useState(0);

  // Re-fetch profile when screen regains focus (e.g. after paywall)
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    try {
      setOfflineSize(getOfflineStorageSize());
    } catch {
      // SQLite unavailable
    }
  }, []);

  const xp = calculateXP(stats);
  const currentLevel = getCurrentLevel(xp);
  const unlocked = getUnlockedAchievements(stats);
  const locked = getLockedAchievements(stats);

  function handleClearOfflineData() {
    if (offlineSize === 0) {
      Alert.alert("Thông báo", "Không có dữ liệu offline nào");
      return;
    }
    Alert.alert(
      "Xóa dữ liệu offline",
      `Xóa tất cả truyện đã tải (${formatStorageSize(offlineSize)})?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: () => {
            deleteAllOfflineData();
            setOfflineSize(0);
            Alert.alert("Thành công", "Đã xóa tất cả dữ liệu offline");
          },
        },
      ]
    );
  }

  async function handleLogout() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          refetch();
        },
      },
    ]);
  }

  // Account deletion — required by App Store Guideline 5.1.1(v).
  // Two-step confirmation to prevent accidental deletion, then a server-side
  // RPC that wipes all of the user's data (comments, ratings, bookmarks,
  // reading history, subscriptions…) before removing the auth record.
  async function handleDeleteAccount() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert(
      "Xóa tài khoản",
      "Hành động này sẽ xóa vĩnh viễn tài khoản và toàn bộ dữ liệu đọc truyện, bình luận, đánh giá, danh sách đã lưu. Không thể khôi phục.\n\nBạn có chắc muốn tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa vĩnh viễn",
          style: "destructive",
          onPress: () => {
            // Second confirmation to satisfy Apple's "explicit confirmation"
            // guidance and protect users against fat-finger taps.
            Alert.alert(
              "Xác nhận lần cuối",
              "Tài khoản sẽ bị xóa ngay lập tức. Bạn thực sự chắc chắn?",
              [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Xóa",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const { error } = await supabase.rpc(
                        "delete_my_account"
                      );
                      if (error) throw error;
                      // Sign out locally so the session is cleared even if
                      // auth.users.delete invalidates the token server-side.
                      await supabase.auth.signOut();
                      Alert.alert(
                        "Đã xóa tài khoản",
                        "Tài khoản của bạn đã được xóa hoàn toàn."
                      );
                      refetch();
                    } catch (err: any) {
                      console.warn(
                        "[account] delete_my_account failed:",
                        err
                      );
                      Alert.alert(
                        "Lỗi",
                        err?.message ||
                          "Không thể xóa tài khoản. Vui lòng thử lại hoặc liên hệ hỗ trợ."
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function handleClearCache() {
    Alert.alert("Xóa bộ nhớ đệm", "Bạn có muốn xóa cache không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          // Clear localStorage cache keys
          try {
            localStorage.removeItem("reading-progress-v2");
            localStorage.removeItem("reading-history");
            Alert.alert("Thành công", "Đã xóa bộ nhớ đệm");
          } catch {
            Alert.alert("Lỗi", "Không thể xóa bộ nhớ đệm");
          }
        },
      },
    ]);
  }

  // ── Unauthenticated state ──
  // Gate on isAuthenticated (derived from supabase.auth.getUser), NOT on
  // profile. First-time Apple/Google users may have a session but no row in
  // public.profiles yet — we must not bounce them back to the login screen.
  if (!isAuthenticated && !loading) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: "#131620" }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="items-center justify-center py-20 gap-4"
      >
        <RNImage
          source={LOGO}
          style={{ width: 72, height: 72, borderRadius: 18 }}
        />
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#7c3aed",
            marginTop: 8,
          }}
        >
          TruyenCity
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#e8e6f0",
            fontWeight: "500",
          }}
        >
          Đọc truyện online miễn phí
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#82818e",
            textAlign: "center",
            paddingHorizontal: 40,
            lineHeight: 20,
          }}
        >
          Đăng nhập để theo dõi tiến độ đọc, mở khóa thành tích tu luyện và
          nhiều tính năng khác
        </Text>
        <Link href="/(account)/login" asChild>
          <Pressable
            style={{
              backgroundColor: "#5c9cff",
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 14,
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 16 }}>
              Đăng nhập
            </Text>
          </Pressable>
        </Link>

        {/* Legal links — visible without login (Apple Guideline 3.1.2) */}
        <View style={{ flexDirection: "row", gap: 16, marginTop: 24 }}>
          <Pressable onPress={() => Linking.openURL("https://truyencity.com/terms")}>
            <Text style={{ fontSize: 13, color: "#5c9cff" }}>Điều khoản sử dụng</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL("https://truyencity.com/privacy")}>
            <Text style={{ fontSize: 13, color: "#5c9cff" }}>Chính sách bảo mật</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "#131620" }}
      >
        <Text style={{ color: "#82818e", fontSize: 14 }}>
          Đang tải...
        </Text>
      </View>
    );
  }

  // ── Stats items ──
  const statItems: StatItem[] = [
    {
      label: "Truyện đang đọc",
      value: formatNumber(stats.novelsStarted),
      icon: "📖",
    },
    {
      label: "Truyện hoàn thành",
      value: formatNumber(stats.novelsCompleted),
      icon: "✅",
    },
    {
      label: "Tổng chương đã đọc",
      value: formatNumber(stats.chaptersRead),
      icon: "📄",
    },
    {
      label: "Thời gian đọc",
      value: formatTime(stats.totalReadingSeconds),
      icon: "⏱️",
    },
    {
      label: "Đánh dấu",
      value: formatNumber(stats.bookmarkCount),
      icon: "🔖",
    },
    {
      label: "Đánh giá",
      value: formatNumber(stats.ratingCount),
      icon: "⭐",
    },
    {
      label: "Bình luận",
      value: formatNumber(stats.commentCount),
      icon: "💬",
    },
    {
      label: "Streak đọc",
      value: `${stats.currentStreak} ngày`,
      icon: "🔥",
    },
  ];

  // ── Menu items ──
  const menuItems: MenuItem[] = [
    {
      label: "Cài đặt đọc truyện",
      icon: "⚙️",
      onPress: () => Alert.alert("Sắp ra mắt", "Tính năng đang phát triển"),
    },
    {
      label: "Thông báo",
      icon: "🔔",
      onPress: () => Alert.alert("Sắp ra mắt", "Tính năng đang phát triển"),
    },
    {
      label: `Dữ liệu offline (${formatStorageSize(offlineSize)})`,
      icon: "📥",
      onPress: handleClearOfflineData,
    },
    { label: "Xóa bộ nhớ đệm", icon: "🗑️", onPress: handleClearCache },
    {
      label: "Về TruyenCity",
      icon: "ℹ️",
      onPress: () =>
        Alert.alert(
          "TruyenCity",
          "Phiên bản 1.0.0\nĐọc truyện online miễn phí\n\ntruyencity.com"
        ),
    },
  ];

  // ── Authenticated screen ──
  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: "#131620" }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 pb-8 pt-4"
    >
      {/* Profile header */}
      <View style={[{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 16 }, centeredStyle] as any}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: currentLevel.color + "30",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: currentLevel.color,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: currentLevel.color }}>
            {profile?.first_name?.[0]?.toUpperCase() || "👤"}
          </Text>
        </View>
        <View className="flex-1 gap-1">
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#e8e6f0" }}>
            {[profile?.first_name, profile?.last_name]
              .filter(Boolean)
              .join(" ") || "Người dùng"}
          </Text>
          {profile?.email && (
            <Text style={{ fontSize: 13, color: "#82818e" }}>
              {profile.email}
            </Text>
          )}
        </View>
      </View>

      {/* VIP upgrade banner — only show for non-VIP */}
      {!isVip && (
        <Pressable
          onPress={() => router.push("/(account)/paywall")}
          style={{
            marginHorizontal: 16,
            backgroundColor: "#1a1d28",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: "rgba(251, 191, 36, 0.25)",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(251, 191, 36, 0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 22 }}>👑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fbbf24" }}>
              Nâng cấp VIP
            </Text>
            <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>
              Bỏ quảng cáo · Tải offline · Audio không giới hạn
            </Text>
          </View>
          <Text style={{ fontSize: 20, color: "#fbbf24" }}>›</Text>
        </Pressable>
      )}

      {/* VIP badge — show for VIP users */}
      {isVip && (
        <View
          style={[{
            marginHorizontal: 16,
            backgroundColor: "#fbbf2415",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: "#fbbf2430",
          }, centeredStyle] as any}
        >
          <Text style={{ fontSize: 22 }}>👑</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fbbf24" }}>
              Reader VIP
            </Text>
            <Text style={{ fontSize: 12, color: "#82818e", marginTop: 2 }}>
              Đang hoạt động
            </Text>
          </View>
        </View>
      )}

      {/* Level card */}
      <LevelCard xp={xp} levelColor={currentLevel.color} />

      {/* Stats grid */}
      <StatsGrid items={statItems} />

      {/* Achievements */}
      <AchievementsSection unlocked={unlocked} locked={locked} />

      {/* Settings menu */}
      <View style={[{ gap: 12 }, centeredStyle] as any}>
        <Text
          style={{ marginHorizontal: 16, fontSize: isTablet ? 18 : 16, fontWeight: "700", color: "#e8e6f0" }}
        >
          Cài đặt
        </Text>
        <SettingsMenu items={menuItems} />
      </View>

      {/* Logout */}
      <Pressable
        onPress={handleLogout}
        style={[{
          marginHorizontal: 16,
          backgroundColor: "#e5393520",
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
        }, centeredStyle] as any}
      >
        <Text style={{ color: "#e53935", fontWeight: "600", fontSize: 15 }}>
          Đăng xuất
        </Text>
      </Pressable>

      {/* Delete account — required by Apple Guideline 5.1.1(v) */}
      <Pressable
        onPress={handleDeleteAccount}
        style={[{
          marginHorizontal: 16,
          marginTop: -4,
          paddingVertical: 10,
          alignItems: "center",
        }, centeredStyle] as any}
      >
        <Text
          style={{
            color: "#82818e",
            fontSize: 13,
            textDecorationLine: "underline",
          }}
        >
          Xóa tài khoản
        </Text>
      </Pressable>

      {/* Legal links */}
      <View style={[{ marginHorizontal: 16, gap: 8 }, centeredStyle] as any}>
        <Pressable onPress={() => Linking.openURL("https://truyencity.com/terms")}>
          <Text style={{ fontSize: 13, color: "#5c9cff", textAlign: "center" }}>
            Điều khoản sử dụng
          </Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL("https://truyencity.com/privacy")}>
          <Text style={{ fontSize: 13, color: "#5c9cff", textAlign: "center" }}>
            Chính sách bảo mật
          </Text>
        </Pressable>
      </View>

      {/* Branding footer */}
      <View style={{ alignItems: "center", gap: 8, marginTop: 8, paddingBottom: 8 }}>
        <RNImage
          source={LOGO}
          style={{ width: 36, height: 36, borderRadius: 9, opacity: 0.6 }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#82818e",
          }}
        >
          TruyenCity
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: "#555",
          }}
        >
          Phiên bản 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
