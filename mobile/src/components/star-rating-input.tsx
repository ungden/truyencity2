import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { View, Text, Pressable } from "@/tw";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

interface StarRatingInputProps {
  novelId: string;
  /** Theme colors passed from parent */
  colors: {
    text: string;
    textSub: string;
    textMuted: string;
    star: string;
    accent: string;
    card: string;
    border: string;
  };
  /** Callback when rating changes (so parent can refresh stats) */
  onRated?: () => void;
}

export default function StarRatingInput({
  novelId,
  colors: C,
  onRated,
}: StarRatingInputProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [hoverScore, setHoverScore] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check auth and load existing rating
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          setUserId(user.id);

          // Load existing rating
          const { data: existing } = await supabase
            .from("ratings")
            .select("score")
            .eq("novel_id", novelId)
            .eq("user_id", user.id)
            .single();

          if (!cancelled && existing) {
            setSelectedScore(existing.score);
            setHasRated(true);
          }
        }
      } catch {
        // Not logged in or error — ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [novelId]);

  async function handleRate(score: number) {
    if (!userId) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để đánh giá truyện", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng nhập",
          onPress: () => router.push("/(account)/login"),
        },
      ]);
      return;
    }

    if (process.env.EXPO_OS === "ios")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedScore(score);
    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.from("ratings").upsert(
        {
          novel_id: novelId,
          user_id: userId,
          score,
        },
        { onConflict: "novel_id,user_id" }
      );

      if (error) throw error;

      setHasRated(true);
      setSuccessMsg(
        hasRated ? "Đã cập nhật đánh giá!" : "Cảm ơn bạn đã đánh giá!"
      );
      onRated?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Rating error:", err);
      Alert.alert("Lỗi", "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const STAR_LABELS = ["Rất tệ", "Tệ", "Bình thường", "Hay", "Rất hay"];
  const displayScore = hoverScore || selectedScore;

  if (loading) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  // Not logged in — show prompt
  if (!userId) {
    return (
      <View
        style={{
          alignItems: "center",
          paddingVertical: 20,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 14, color: C.textSub, textAlign: "center" }}>
          Đăng nhập để đánh giá truyện này
        </Text>
        <Pressable
          onPress={() => router.push("/(account)/login")}
          style={{
            backgroundColor: C.accent,
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
            Đăng nhập
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      {/* Label */}
      <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
        {hasRated ? "Đánh giá của bạn" : "Đánh giá truyện này"}
      </Text>

      {/* Stars */}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayScore;
          return (
            <Pressable
              key={star}
              onPress={() => handleRate(star)}
              onPressIn={() => setHoverScore(star)}
              onPressOut={() => setHoverScore(0)}
              disabled={submitting}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  color: filled ? C.star : C.border,
                }}
              >
                {filled ? "★" : "☆"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Score label */}
      {displayScore > 0 && (
        <Text style={{ fontSize: 13, color: C.textSub }}>
          {displayScore}/5 — {STAR_LABELS[displayScore - 1]}
        </Text>
      )}

      {/* Submitting indicator */}
      {submitting && (
        <ActivityIndicator size="small" style={{ marginTop: 4 }} />
      )}

      {/* Success message */}
      {successMsg && (
        <Text
          style={{
            fontSize: 13,
            color: "#22c55e",
            fontWeight: "600",
            marginTop: 4,
          }}
        >
          {successMsg}
        </Text>
      )}
    </View>
  );
}
