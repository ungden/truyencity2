import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Alert, ActionSheetIOS, Platform } from "react-native";
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
  profiles?:
    | { display_name: string | null }[]
    | { display_name: string | null }
    | null;
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

const REPORT_REASONS: { key: string; label: string }[] = [
  { key: "spam", label: "Spam / quảng cáo" },
  { key: "harassment", label: "Quấy rối / xúc phạm" },
  { key: "inappropriate", label: "Nội dung không phù hợp" },
  { key: "other", label: "Lý do khác" },
];

export default function CommentsSection({
  novelId,
  colors: C,
}: CommentsSectionProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Input state
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  // Check auth + load blocked user list
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          // Fetch the reader's block list so we can filter comments client-side
          // (RLS keeps the rows readable; we just hide them).
          const { data: blocks } = await supabase
            .from("user_blocks")
            .select("blocked_id")
            .eq("blocker_id", user.id);
          if (blocks) {
            setBlockedUserIds(
              new Set(blocks.map((b: any) => b.blocked_id as string))
            );
          }
        }
      } catch {
        // Not logged in — OK
      }
    })();
  }, []);

  // Load comments
  const fetchComments = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);
      setFetchError(null);

      try {
        const from = pageNum * COMMENTS_PER_PAGE;
        const to = from + COMMENTS_PER_PAGE - 1;

        const { data, error } = await supabase
          .from("comments")
          .select(
            "id, novel_id, user_id, content, status, created_at, profiles(display_name)"
          )
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
        setFetchError("Không thể tải bình luận. Kiểm tra kết nối mạng.");
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
      setPendingMsg(
        "Bình luận của bạn đang chờ duyệt. Chúng tôi sẽ kiểm duyệt trong vòng 24 giờ."
      );

      // Clear pending message after 6 seconds
      setTimeout(() => setPendingMsg(null), 6000);
    } catch (err) {
      console.error("Comment submit error:", err);
      Alert.alert("Lỗi", "Không thể gửi bình luận. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Moderation actions (Apple Guideline 1.2) ──────────────────────────

  function requireAuth(next: () => void) {
    if (!userId) {
      Alert.alert("Đăng nhập", "Bạn cần đăng nhập để thực hiện thao tác này", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng nhập",
          onPress: () => router.push("/(account)/login"),
        },
      ]);
      return;
    }
    next();
  }

  async function reportComment(commentId: string, reason: string) {
    try {
      const { error } = await supabase.rpc("report_comment", {
        p_comment_id: commentId,
        p_reason: reason,
      });
      if (error) throw error;
      Alert.alert(
        "Đã ghi nhận",
        "Cảm ơn bạn đã báo cáo. Đội kiểm duyệt sẽ xem xét trong vòng 24 giờ và gỡ bỏ nội dung nếu vi phạm."
      );
    } catch (err: any) {
      console.warn("[comments] report failed:", err);
      Alert.alert(
        "Lỗi",
        err?.message || "Không thể gửi báo cáo. Vui lòng thử lại."
      );
    }
  }

  async function blockUser(blockedId: string, displayName: string) {
    try {
      const { error } = await supabase.rpc("block_user", {
        p_blocked_id: blockedId,
      });
      if (error) throw error;
      setBlockedUserIds((prev) => new Set(prev).add(blockedId));
      Alert.alert(
        "Đã chặn",
        `Bạn sẽ không còn thấy bình luận từ ${displayName}.`
      );
    } catch (err: any) {
      console.warn("[comments] block failed:", err);
      Alert.alert(
        "Lỗi",
        err?.message || "Không thể chặn người dùng. Vui lòng thử lại."
      );
    }
  }

  function askReportReason(commentId: string) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Báo cáo bình luận",
          message: "Chọn lý do báo cáo:",
          options: [...REPORT_REASONS.map((r) => r.label), "Hủy"],
          cancelButtonIndex: REPORT_REASONS.length,
        },
        (buttonIndex) => {
          if (buttonIndex < REPORT_REASONS.length) {
            reportComment(commentId, REPORT_REASONS[buttonIndex].key);
          }
        }
      );
    } else {
      // Android: use stacked alerts as a fallback
      Alert.alert("Báo cáo bình luận", "Chọn lý do báo cáo:", [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => reportComment(commentId, r.key),
        })),
        { text: "Hủy", style: "cancel" as const },
      ]);
    }
  }

  function handleModerateComment(comment: Comment) {
    requireAuth(() => {
      const displayName = getDisplayName(comment.profiles);
      const isOwn = comment.user_id === userId;

      if (Platform.OS === "ios") {
        const options = isOwn
          ? ["Hủy"]
          : ["Báo cáo", `Chặn ${displayName}`, "Hủy"];

        if (isOwn) {
          // Nothing to do — users can't report or block themselves
          return;
        }

        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            destructiveButtonIndex: 0,
            cancelButtonIndex: options.length - 1,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              askReportReason(comment.id);
            } else if (buttonIndex === 1) {
              Alert.alert(
                "Chặn người dùng",
                `Chặn ${displayName}? Bạn sẽ không còn thấy bình luận của họ.`,
                [
                  { text: "Hủy", style: "cancel" },
                  {
                    text: "Chặn",
                    style: "destructive",
                    onPress: () => blockUser(comment.user_id, displayName),
                  },
                ]
              );
            }
          }
        );
      } else {
        // Android fallback
        if (isOwn) return;
        Alert.alert("Thao tác", `Bình luận của ${displayName}`, [
          { text: "Hủy", style: "cancel" },
          { text: "Báo cáo", onPress: () => askReportReason(comment.id) },
          {
            text: "Chặn người dùng",
            style: "destructive",
            onPress: () => blockUser(comment.user_id, displayName),
          },
        ]);
      }
    });
  }

  // Filter out comments from blocked users
  const visibleComments = comments.filter(
    (c) => !blockedUserIds.has(c.user_id)
  );

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
            {/* Content policy disclosure — required by Apple Guideline 1.2 */}
            <Text
              style={{
                fontSize: 10,
                color: C.textMuted,
                lineHeight: 14,
                marginTop: 2,
              }}
            >
              TruyenCity có chính sách không dung thứ với nội dung xúc phạm,
              quấy rối hoặc không phù hợp. Bình luận vi phạm sẽ bị gỡ bỏ và tài
              khoản có thể bị khóa.
            </Text>
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
      ) : fetchError ? (
        <View
          style={{
            alignItems: "center",
            paddingVertical: 24,
            gap: 10,
          }}
        >
          <Text
            style={{ fontSize: 14, color: C.textMuted, textAlign: "center" }}
          >
            {fetchError}
          </Text>
          <Pressable
            onPress={() => fetchComments(0)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text
              style={{
                color: C.accent,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Thử lại
            </Text>
          </Pressable>
        </View>
      ) : visibleComments.length === 0 ? (
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
            Bình luận ({visibleComments.length}
            {hasMore ? "+" : ""})
          </Text>

          {visibleComments.map((comment) => (
            <View
              key={comment.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
                gap: 4,
              }}
            >
              {/* Header: name + time + moderate */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
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
                {comment.user_id !== userId && (
                  <Pressable
                    onPress={() => handleModerateComment(comment)}
                    hitSlop={12}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                    accessibilityLabel="Báo cáo hoặc chặn"
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: C.textMuted,
                        fontWeight: "700",
                      }}
                    >
                      ⋯
                    </Text>
                  </Pressable>
                )}
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
