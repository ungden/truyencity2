import React, { useState, useCallback } from "react";
import { Alert, ActivityIndicator } from "react-native";
import { View, Text, Pressable } from "@/tw";
import { useVipStatus, type ActiveBoost } from "@/hooks/use-vip-status";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";

interface BoostCardButtonProps {
  novelId: string;
  novelTitle: string;
}

export default function BoostCardButton({ novelId, novelTitle }: BoostCardButtonProps) {
  const { isSuperVip, boost_cards_remaining, active_boosts, refresh } = useVipStatus();
  const [loading, setLoading] = useState(false);

  // Check if this novel is already boosted
  const existingBoost = active_boosts?.find(
    (b: ActiveBoost) => b.novel_id === novelId
  );

  const handleBoost = useCallback(async () => {
    if (loading) return;

    Alert.alert(
      "Thúc chương",
      `Dùng 1 thẻ thúc chương cho "${novelTitle}"?\n\nTruyện sẽ ra gấp đôi chương mỗi ngày trong 7 ngày tới.\n\nCòn lại: ${boost_cards_remaining} thẻ`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Dùng thẻ",
          style: "default",
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { data, error } = await supabase.rpc("use_boost_card", {
                p_user_id: user.id,
                p_novel_id: novelId,
              });

              if (error) {
                Alert.alert("Lỗi", "Không thể dùng thẻ thúc chương");
                return;
              }

              const result = data as { error?: string; success?: boolean; cards_remaining?: number };
              if (result.error) {
                Alert.alert("Không thể thúc chương", result.error);
                return;
              }

              if (process.env.EXPO_OS === "ios") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert("Thành công! 🚀", `Truyện "${novelTitle}" sẽ ra gấp đôi chương trong 7 ngày tới!`);
              refresh();
            } catch {
              Alert.alert("Lỗi", "Đã xảy ra lỗi, vui lòng thử lại");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [novelId, novelTitle, boost_cards_remaining, loading, refresh]);

  // Not super VIP — don't show anything
  if (!isSuperVip) return null;

  // Already boosted — show active badge
  if (existingBoost) {
    const expiresDate = new Date(existingBoost.expires_at);
    const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / 86400000));

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(251, 191, 36, 0.15)",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 16 }}>🚀</Text>
        <Text style={{ color: "#fbbf24", fontSize: 13, fontWeight: "600" }}>
          Đang thúc chương · {daysLeft} ngày còn lại
        </Text>
      </View>
    );
  }

  // No cards left
  if (boost_cards_remaining <= 0) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.05)",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          gap: 6,
          opacity: 0.5,
        }}
      >
        <Text style={{ fontSize: 14 }}>🎴</Text>
        <Text style={{ color: "#9ca3af", fontSize: 13 }}>
          Hết thẻ thúc chương
        </Text>
      </View>
    );
  }

  // Has cards — show button
  return (
    <Pressable
      onPress={handleBoost}
      disabled={loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(251, 191, 36, 0.15)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: "rgba(251, 191, 36, 0.3)",
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fbbf24" />
      ) : (
        <>
          <Text style={{ fontSize: 16 }}>🚀</Text>
          <Text style={{ color: "#fbbf24", fontSize: 13, fontWeight: "600" }}>
            Thúc chương
          </Text>
          <View
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.3)",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fbbf24", fontSize: 11, fontWeight: "700" }}>
              {boost_cards_remaining}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
