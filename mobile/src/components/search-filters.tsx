import React, { useState } from "react";
import { Modal } from "react-native";
import { View, Text, Pressable, ScrollView } from "@/tw";
import type { SearchFilters as SearchFiltersType, NovelStatusValue } from "@/hooks/use-search";

const ALL_GENRES: { id: string; label: string; icon: string }[] = [
  { id: "tien-hiep", label: "Tiên Hiệp", icon: "🗡️" },
  { id: "huyen-huyen", label: "Huyền Huyễn", icon: "🌌" },
  { id: "do-thi", label: "Đô Thị", icon: "🏙️" },
  { id: "kiem-hiep", label: "Kiếm Hiệp", icon: "⚔️" },
  { id: "lich-su", label: "Lịch Sử", icon: "📜" },
  { id: "khoa-huyen", label: "Khoa Huyễn", icon: "🔬" },
  { id: "vong-du", label: "Võng Du", icon: "🎮" },
  { id: "dong-nhan", label: "Đồng Nhân", icon: "🌟" },
  { id: "mat-the", label: "Mạt Thế", icon: "☢️" },
  { id: "linh-di", label: "Linh Dị", icon: "👻" },
  { id: "quan-truong", label: "Quan Trường", icon: "🏛️" },
  { id: "di-gioi", label: "Dị Giới", icon: "🌍" },
  { id: "ngon-tinh", label: "Ngôn Tình", icon: "💕" },
  { id: "trong-sinh", label: "Trọng Sinh", icon: "🔄" },
  { id: "kinh-doanh", label: "Kinh Doanh", icon: "💼" },
  { id: "gia-toc", label: "Gia Tộc", icon: "🏠" },
];

const STATUS_OPTIONS: { value: NovelStatusValue; label: string }[] = [
  { value: "Đang ra", label: "Đang ra" },
  { value: "Hoàn thành", label: "Hoàn thành" },
  { value: "Tạm dừng", label: "Tạm dừng" },
];

const CHAPTER_BUCKETS: { id: string; label: string; min?: number; max?: number }[] = [
  { id: "all", label: "Tất cả" },
  { id: "lt50", label: "<50 chương", max: 50 },
  { id: "50-200", label: "50-200", min: 50, max: 200 },
  { id: "200-500", label: "200-500", min: 200, max: 500 },
  { id: "500-1000", label: "500-1000", min: 500, max: 1000 },
  { id: "gt1000", label: ">1000 chương", min: 1000 },
];

const SORT_OPTIONS = [
  { value: "chapter_count", label: "Nhiều chương" },
  { value: "updated_at", label: "Mới cập nhật" },
  { value: "created_at", label: "Mới đăng" },
] as const;

const PRIMARY = "#7c3aed";
const SURFACE = "rgba(255,255,255,0.08)";
const TEXT_DIM = "#a1a1aa";
const TEXT_BRIGHT = "#e8e6f0";
const DANGER = "#ef4444";

interface Props {
  filters: SearchFiltersType;
  setFilters: (f: Partial<SearchFiltersType>) => void;
  resetFilters: () => void;
}

export default function SearchFilterBar({ filters, setFilters, resetFilters }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const activeGenres = filters.genres || [];
  const activeStatuses = filters.statuses || [];
  const chapterFilterActive = filters.minChapters != null || filters.maxChapters != null;
  const activeChapterBucket = chapterFilterActive
    ? CHAPTER_BUCKETS.find((b) => b.min === filters.minChapters && b.max === filters.maxChapters)
    : undefined;

  const activeCount =
    activeGenres.length + activeStatuses.length + (chapterFilterActive ? 1 : 0);

  // ── Active filter chips (shown inline below the main filter row) ──────────
  const ActiveFilterChips = activeCount > 0 && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 8 }}
    >
      {activeGenres.map((id) => {
        const g = ALL_GENRES.find((x) => x.id === id);
        if (!g) return null;
        return (
          <Pressable
            key={`g-${id}`}
            onPress={() => setFilters({ genres: activeGenres.filter((x) => x !== id) })}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: PRIMARY,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>{g.icon} {g.label}</Text>
            <Text style={{ color: "#fff", fontSize: 14, opacity: 0.7 }}>×</Text>
          </Pressable>
        );
      })}
      {activeStatuses.map((s) => (
        <Pressable
          key={`s-${s}`}
          onPress={() => setFilters({ statuses: activeStatuses.filter((x) => x !== s) })}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: PRIMARY,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>{s}</Text>
          <Text style={{ color: "#fff", fontSize: 14, opacity: 0.7 }}>×</Text>
        </Pressable>
      ))}
      {activeChapterBucket && activeChapterBucket.id !== "all" && (
        <Pressable
          onPress={() => setFilters({ minChapters: undefined, maxChapters: undefined })}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: PRIMARY,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>{activeChapterBucket.label}</Text>
          <Text style={{ color: "#fff", fontSize: 14, opacity: 0.7 }}>×</Text>
        </Pressable>
      )}
    </ScrollView>
  );

  return (
    <View>
      {/* Quick filter row — filter button + sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
      >
        {/* PRIMARY: Bộ lọc button — bigger + always purple-tinted for visibility */}
        <Pressable
          onPress={() => setModalOpen(true)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: activeCount > 0 ? PRIMARY : "rgba(124,58,237,0.18)",
            borderWidth: 1,
            borderColor: activeCount > 0 ? PRIMARY : "rgba(124,58,237,0.4)",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ color: activeCount > 0 ? "#fff" : "#c4b5fd", fontSize: 14, fontWeight: "700" }}>
            ⚙
          </Text>
          <Text style={{ color: activeCount > 0 ? "#fff" : "#c4b5fd", fontSize: 14, fontWeight: "600" }}>
            Bộ lọc
          </Text>
          {activeCount > 0 && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.25)",
                paddingHorizontal: 6,
                borderRadius: 999,
                minWidth: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{activeCount}</Text>
            </View>
          )}
        </Pressable>

        {/* Sort chips */}
        {SORT_OPTIONS.map((opt) => {
          const active = filters.sortBy === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFilters({ sortBy: opt.value, sortDir: "desc" })}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: active ? PRIMARY : SURFACE,
              }}
            >
              <Text style={{ color: active ? "#fff" : TEXT_DIM, fontSize: 13 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        {activeCount > 0 && (
          <Pressable
            onPress={resetFilters}
            style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 }}
          >
            <Text style={{ color: DANGER, fontSize: 13 }}>Xoá lọc</Text>
          </Pressable>
        )}
      </ScrollView>

      {ActiveFilterChips}

      {/* Filter modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#131620",
              maxHeight: "85%",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{ color: TEXT_BRIGHT, fontSize: 18, fontWeight: "700" }}>
                Bộ lọc tìm kiếm{activeCount > 0 ? ` (${activeCount})` : ""}
              </Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={12}>
                <Text style={{ color: PRIMARY, fontSize: 16, fontWeight: "600" }}>Xong</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 24 }}>
              {/* Số chương — most-requested filter, surface first */}
              <View>
                <Text style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: "600", marginBottom: 10 }}>
                  Số chương
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {CHAPTER_BUCKETS.map((b) => {
                    const active =
                      (b.id === "all" && !chapterFilterActive) ||
                      (b.min === filters.minChapters && b.max === filters.maxChapters);
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() =>
                          setFilters({ minChapters: b.min, maxChapters: b.max })
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 999,
                          backgroundColor: active ? PRIMARY : SURFACE,
                        }}
                      >
                        <Text
                          style={{
                            color: active ? "#fff" : "#d4d4d8",
                            fontSize: 13,
                            fontWeight: active ? "600" : "400",
                          }}
                        >
                          {b.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Tình trạng — multi-select */}
              <View>
                <Text style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: "600", marginBottom: 10 }}>
                  Tình trạng
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const active = activeStatuses.includes(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          const next = active
                            ? activeStatuses.filter((s) => s !== opt.value)
                            : [...activeStatuses, opt.value];
                          setFilters({ statuses: next });
                        }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 999,
                          backgroundColor: active ? PRIMARY : SURFACE,
                        }}
                      >
                        <Text
                          style={{
                            color: active ? "#fff" : "#d4d4d8",
                            fontSize: 13,
                            fontWeight: active ? "600" : "400",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Thể loại — with icons for quick visual scan */}
              <View>
                <Text style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: "600", marginBottom: 10 }}>
                  Thể loại
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {ALL_GENRES.map((g) => {
                    const active = activeGenres.includes(g.id);
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => {
                          const next = active
                            ? activeGenres.filter((x) => x !== g.id)
                            : [...activeGenres, g.id];
                          setFilters({ genres: next });
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: active ? PRIMARY : SURFACE,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{g.icon}</Text>
                        <Text
                          style={{
                            color: active ? "#fff" : "#d4d4d8",
                            fontSize: 13,
                            fontWeight: active ? "600" : "400",
                          }}
                        >
                          {g.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Reset all */}
              {activeCount > 0 && (
                <Pressable
                  onPress={resetFilters}
                  style={{
                    marginTop: 8,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: "rgba(239,68,68,0.15)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: DANGER, fontSize: 14, fontWeight: "600" }}>
                    Xoá tất cả bộ lọc ({activeCount})
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
