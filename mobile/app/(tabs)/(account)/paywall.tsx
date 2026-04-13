import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { View, Text, ScrollView, Pressable } from "@/tw";
import { useRevenueCat } from "@/hooks/use-revenuecat";
import { router } from "expo-router";

// ── Feature list ──────────────────────────────────────────────
const VIP_FEATURES = [
  { icon: "🚫", title: "Không quảng cáo", desc: "Đọc truyện không bị gián đoạn bởi quảng cáo" },
  { icon: "📥", title: "Tải truyện offline", desc: "Download truyện về đọc khi không có mạng" },
  { icon: "🔊", title: "Nghe audio không giới hạn", desc: "Bản free chỉ được 1 tiếng/ngày" },
  { icon: "🚀", title: "Thẻ thúc chương (Super VIP)", desc: "3 thẻ/tháng — truyện ra gấp đôi chương trong 7 ngày" },
] as const;

// ── Main Component ────────────────────────────────────────────
export default function PaywallScreen() {
  const { isVip, packages, loading, error, purchasePackage, restorePurchases } =
    useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Must be declared before any early returns to satisfy the rules of hooks.
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  // Defined up-front so early-return branches (loading, empty, isVip) can
  // reference them without relying on function hoisting semantics.
  async function handleRestore() {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(
          "Khôi phục thành công!",
          "Gói VIP đã được kích hoạt lại.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Không tìm thấy",
          "Không tìm thấy giao dịch nào trước đó."
        );
      }
    } finally {
      setRestoring(false);
    }
  }

  // Already VIP — show success state
  if (isVip) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: "#131620" }}
        contentContainerClassName="items-center justify-center py-20 gap-4"
      >
        <Text style={{ fontSize: 48 }}>🎉</Text>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#fbbf24",
            textAlign: "center",
          }}
        >
          Bạn đã là VIP!
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#82818e",
            textAlign: "center",
            paddingHorizontal: 40,
          }}
        >
          Cảm ơn bạn đã ủng hộ TruyenCity. Tận hưởng trải nghiệm đọc truyện
          không quảng cáo!
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: "#282b3a",
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            marginTop: 12,
          }}
        >
          <Text style={{ color: "#e8e6f0", fontWeight: "600", fontSize: 16 }}>
            Quay lại
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Loading state — packages are still being fetched from RevenueCat
  if (loading) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: "#131620" }}
        contentContainerClassName="items-center justify-center py-20 gap-4"
      >
        <ActivityIndicator size="large" color="#fbbf24" />
        <Text style={{ fontSize: 14, color: "#82818e" }}>
          Đang tải gói VIP...
        </Text>
      </ScrollView>
    );
  }

  // No empty-state guard — always render full paywall with fallback prices
  // so we can screenshot on Simulator and users see plans even if store is slow

  // Find monthly and annual packages
  const monthlyPkg = packages.find(
    (p) => p.packageType === "MONTHLY" || p.product.identifier.includes("monthly")
  ) ?? (packages.length > 0 ? packages[0] : null);

  const annualPkg = packages.find(
    (p) => p.packageType === "ANNUAL" || p.product.identifier.includes("yearly") || p.product.identifier.includes("annual")
  ) ?? null;

  const selectedPkg = selectedPlan === "annual" ? (annualPkg ?? monthlyPkg) : monthlyPkg;

  async function handlePurchase() {
    if (!selectedPkg) {
      Alert.alert(
        "Chưa sẵn sàng",
        "Gói VIP chưa được cấu hình. Vui lòng thử lại sau."
      );
      return;
    }

    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPkg);
      if (success) {
        Alert.alert("Thành công!", "Chào mừng bạn đến với VIP! 🎉", [
          { text: "Tuyệt vời", onPress: () => router.back() },
        ]);
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: "#131620" }}
      contentContainerClassName="pb-12"
    >
      {/* Header */}
      <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 16 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#fbbf2420",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fbbf24",
          }}
        >
          <Text style={{ fontSize: 36 }}>👑</Text>
        </View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#fbbf24",
            marginTop: 16,
          }}
        >
          Reader VIP
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#82818e",
            textAlign: "center",
            paddingHorizontal: 40,
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          Nâng cấp trải nghiệm đọc truyện lên một tầm cao mới
        </Text>
      </View>

      {/* Features */}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {VIP_FEATURES.map((feature) => (
          <View
            key={feature.title}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: "#1a1d28",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#282b3a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>{feature.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#e8e6f0",
                }}
              >
                {feature.title}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#82818e",
                  marginTop: 2,
                }}
              >
                {feature.desc}
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: "#fbbf24" }}>✓</Text>
          </View>
        ))}
      </View>

      {/* Price + CTA */}
      <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 12 }}>
        {/* Plan selector — Annual */}
        <Pressable
          onPress={() => setSelectedPlan("annual")}
          style={{
            backgroundColor: "#1a1d28",
            borderRadius: 16,
            padding: 18,
            borderWidth: 2,
            borderColor: selectedPlan === "annual" ? "#fbbf24" : "#282b3a",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Radio */}
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selectedPlan === "annual" ? "#fbbf24" : "#555",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selectedPlan === "annual" && (
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#fbbf24",
                }}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#e8e6f0" }}>
                Hàng năm
              </Text>
              <View
                style={{
                  backgroundColor: "#22c55e20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#22c55e" }}>
                  TIẾT KIỆM 17%
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: "#82818e", marginTop: 2 }}>
              {annualPkg?.product?.priceString ?? "999.000đ"}/năm (~83k/tháng)
            </Text>
          </View>
        </Pressable>

        {/* Plan selector — Monthly */}
        <Pressable
          onPress={() => setSelectedPlan("monthly")}
          style={{
            backgroundColor: "#1a1d28",
            borderRadius: 16,
            padding: 18,
            borderWidth: 2,
            borderColor: selectedPlan === "monthly" ? "#fbbf24" : "#282b3a",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selectedPlan === "monthly" ? "#fbbf24" : "#555",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selectedPlan === "monthly" && (
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#fbbf24",
                }}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#e8e6f0" }}>
              Hàng tháng
            </Text>
            <Text style={{ fontSize: 13, color: "#82818e", marginTop: 2 }}>
              {monthlyPkg?.product?.priceString ?? "99.000đ"}/tháng
            </Text>
          </View>
        </Pressable>

        {/* Purchase button */}
        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || loading}
          style={{
            backgroundColor: purchasing ? "#b8860b" : "#fbbf24",
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: "center",
            opacity: purchasing || loading ? 0.7 : 1,
          }}
        >
          {purchasing ? (
            <ActivityIndicator color="#131620" />
          ) : (
            <Text
              style={{
                color: "#131620",
                fontWeight: "700",
                fontSize: 17,
              }}
            >
              Nâng cấp VIP ngay
            </Text>
          )}
        </Pressable>

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={{
            paddingVertical: 12,
            alignItems: "center",
            opacity: restoring ? 0.5 : 1,
          }}
        >
          {restoring ? (
            <ActivityIndicator color="#82818e" size="small" />
          ) : (
            <Text
              style={{ color: "#5c9cff", fontSize: 14, fontWeight: "500" }}
            >
              Khôi phục giao dịch
            </Text>
          )}
        </Pressable>

        {/* Error display */}
        {error && (
          <Text
            style={{
              color: "#e53935",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        )}
      </View>

      {/* Legal */}
      <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 8 }}>
        <Text
          style={{
            fontSize: 11,
            color: "#555",
            textAlign: "center",
            lineHeight: 16,
          }}
        >
          Thanh toán sẽ được tính vào tài khoản{" "}
          {Platform.OS === "ios" ? "Apple ID" : "Google Play"} của bạn khi xác
          nhận mua. Gói đăng ký tự động gia hạn trừ khi tự động gia hạn bị tắt
          ít nhất 24 giờ trước khi kết thúc kỳ hiện tại.
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <Pressable
            onPress={() =>
              Linking.openURL("https://truyencity.com/terms")
            }
          >
            <Text style={{ fontSize: 12, color: "#5c9cff" }}>
              Điều khoản sử dụng
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Linking.openURL("https://truyencity.com/privacy")
            }
          >
            <Text style={{ fontSize: 12, color: "#5c9cff" }}>
              Chính sách bảo mật
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
