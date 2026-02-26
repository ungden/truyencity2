import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { View, Text, Pressable, TextInput } from "@/tw";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

const COMMENTS_PER_PAGE = 10;

interface Comment {
  id: string;
  novel_id: string;
  user_id: string;
  content: string;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null }[] | { display_name: string | null } | null;
}

/** Safely extract display_name from profiles (can be array or object depending on Supabase join) */
function getDisplayName(profiles: Comment["profiles"]): string {
  if (!profiles) return "Độc giả";
  if (Array.isArray(profiles)) {
    return profiles[0]?.display_name || "Độc giả";
  }
  return profiles.display_name || "Độc giả";
}

interface CommentsSectionProps {
  novelId: string;
  colors: {
    text: string;
    textSub: string;
    textMuted: string;
    accent: string;
    card: string;
    border: string;
    bg: string;
  };
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;

  return `${Math.floor(months / 12)} năm trước`;
}

export default function CommentsSection({
  novelId,
  colors: C,
}: CommentsSectionProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Input state
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch {
        // Not logged in
      }
    })();
  }, []);

  // Load comments
  const fetchComments = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const from = pageNum * COMMENTS_PER_PAGE;
        const to = from + COMMENTS_PER_PAGE - 1;

        const { data, error } = await supabase
          .from("comments")
          .select("id, novel_id, user_id, content, status, created_at, profiles(display_name)")
          .eq("novel_id", novelId)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        const fetched = (data as unknown as Comment[]) || [];
        setHasMore(fetched.length === COMMENTS_PER_PAGE);

        if (append) {
          setComments((prev) => [...prev, ...fetched]);
        } else {
          setComments(fetched);
        }
      } catch (err) {
        console.error("Error fetching comments:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [novelId]
  );

  useEffect(() => {
    fetchComments(0);
  }, [fetchComments]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  }

  async function handleSubmit() {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    if (!userId) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để bình luận", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng nhập",
          onPress: () => router.push("/(account)/login"),
        },
      ]);
      return;
    }

    if (trimmed.length < 2) {
      Alert.alert("Lỗi", "Bình luận quá ngắn");
      return;
    }

    if (trimmed.length > 1000) {
      Alert.alert("Lỗi", "Bình luận tối đa 1000 ký tự");
      return;
    }

    if (process.env.EXPO_OS === "ios")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSubmitting(true);
    setPendingMsg(null);

    try {
      const { error } = await supabase.from("comments").insert({
        novel_id: novelId,
        user_id: userId,
        content: trimmed,
        status: "pending",
      });

      if (error) throw error;

      setCommentText("");
      setPendingMsg("Bình luận của bạn đang chờ duyệt");

      // Clear pending message after 5 seconds
      setTimeout(() => setPendingMsg(null), 5000);
    } catch (err) {
      console.error("Comment submit error:", err);
      Alert.alert("Lỗi", "Không thể gửi bình luận. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {/* ── Comment Input ── */}
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 12,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.text }}>
          Viết bình luận
        </Text>

        {userId ? (
          <>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Chia sẻ cảm nhận của bạn..."
              placeholderTextColor={C.textMuted}
              multiline
              maxLength={1000}
              style={{
                minHeight: 80,
                maxHeight: 160,
                backgroundColor: C.bg,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                color: C.text,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: C.border,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, color: C.textMuted }}>
                {commentText.length}/1000
              </Text>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting || commentText.trim().length < 2}
                style={{
                  backgroundColor:
                    submitting || commentText.trim().length < 2
                      ? C.border
                      : C.accent,
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {submitting && (
                  <ActivityIndicator size="small" color="#fff" />
                )}
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Gửi
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 8, gap: 8 }}>
            <Text
              style={{ fontSize: 13, color: C.textSub, textAlign: "center" }}
            >
              Đăng nhập để bình luận
            </Text>
            <Pressable
              onPress={() => router.push("/(account)/login")}
              style={{
                backgroundColor: C.accent,
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 16,
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}
              >
                Đăng nhập
              </Text>
            </Pressable>
          </View>
        )}

        {/* Pending message */}
        {pendingMsg && (
          <View
            style={{
              backgroundColor: "#f59e0b18",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#f59e0b",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {pendingMsg}
            </Text>
          </View>
        )}
      </View>

      {/* ── Comments List ── */}
      {loading ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator size="small" />
        </View>
      ) : comments.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ fontSize: 14, color: C.textMuted }}>
            Chưa có bình luận nào
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: C.textMuted,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Hãy là người đầu tiên bình luận!
          </Text>
        </View>
      ) : (
        <View style={{ gap: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: C.text,
              marginBottom: 8,
            }}
          >
            Bình luận ({comments.length}
            {hasMore ? "+" : ""})
          </Text>

          {comments.map((comment) => (
            <View
              key={comment.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
                gap: 4,
              }}
            >
              {/* Header: name + time */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: C.accent,
                  }}
                >
                  {getDisplayName(comment.profiles)}
                </Text>
                <Text style={{ fontSize: 11, color: C.textMuted }}>
                  {timeAgo(comment.created_at)}
                </Text>
              </View>

              {/* Content */}
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: C.text,
                }}
              >
                {comment.content}
              </Text>
            </View>
          ))}

          {/* Load more */}
          {hasMore && (
            <Pressable
              onPress={handleLoadMore}
              disabled={loadingMore}
              style={{
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: C.card,
                borderRadius: 12,
                marginTop: 8,
              }}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: C.accent,
                  }}
                >
                  Xem thêm bình luận
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
