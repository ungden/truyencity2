import React, { useState } from "react";
import { Modal } from "react-native";
import { View, Text, Pressable, ScrollView } from "@/tw";
import type { SearchFilters as SearchFiltersType } from "@/hooks/use-search";

const ALL_GENRES: { id: string; label: string }[] = [
  { id: "tien-hiep", label: "Tiên Hiệp" },
  { id: "huyen-huyen", label: "Huyền Huyễn" },
  { id: "do-thi", label: "Đô Thị" },
  { id: "kiem-hiep", label: "Kiếm Hiệp" },
  { id: "lich-su", label: "Lịch Sử" },
  { id: "khoa-huyen", label: "Khoa Huyễn" },
  { id: "vong-du", label: "Võng Du" },
  { id: "dong-nhan", label: "Đồng Nhân" },
  { id: "mat-the", label: "Mạt Thế" },
  { id: "linh-di", label: "Linh Dị" },
  { id: "quan-truong", label: "Quan Trường" },
  { id: "di-gioi", label: "Dị Giới" },
  { id: "ngon-tinh", label: "Ngôn Tình" },
  { id: "trong-sinh", label: "Trọng Sinh" },
  { id: "kinh-doanh", label: "Kinh Doanh" },
  { id: "gia-toc", label: "Gia Tộc" },
];

const CHAPTER_BUCKETS = [
  { label: "Tất cả", min: undefined, max: undefined },
  { label: "<50 chương", min: undefined, max: 50 },
  { label: "50-200", min: 50, max: 200 },
  { label: "200-500", min: 200, max: 500 },
  { label: "500-1000", min: 500, max: 1000 },
  { label: ">1000 chương", min: 1000, max: undefined },
];

const SORT_OPTIONS = [
  { value: "chapter_count", label: "Nhiều chương" },
  { value: "updated_at", label: "Mới cập nhật" },
  { value: "created_at", label: "Mới đăng" },
] as const;

interface Props {
  filters: SearchFiltersType;
  setFilters: (f: Partial<SearchFiltersType>) => void;
  resetFilters: () => void;
}

export default function SearchFilterBar({ filters, setFilters, resetFilters }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const activeCount =
    (filters.genres?.length || 0) +
    (filters.status ? 1 : 0) +
    (filters.minChapters != null || filters.maxChapters != null ? 1 : 0);

  return (
    <View>
      {/* Quick filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}
      >
        <Pressable
          onPress={() => setModalOpen(true)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: activeCount > 0 ? "#7c3aed" : "rgba(255,255,255,0.08)",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ color: activeCount > 0 ? "#fff" : "#a1a1aa", fontSize: 13, fontWeight: "600" }}>
            ⚙ Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
          </Text>
        </Pressable>

        {/* Sort chip */}
        {SORT_OPTIONS.map((opt) => {
          const active = filters.sortBy === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFilters({ sortBy: opt.value, sortDir: "desc" })}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{ color: active ? "#fff" : "#a1a1aa", fontSize: 13 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Reset */}
        {activeCount > 0 && (
          <Pressable
            onPress={resetFilters}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
          >
            <Text style={{ color: "#ef4444", fontSize: 13 }}>Xoá lọc</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Filter modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#131620", maxHeight: "85%", borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: "#e8e6f0", fontSize: 18, fontWeight: "700" }}>Bộ lọc tìm kiếm</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={12}>
                <Text style={{ color: "#7c3aed", fontSize: 16, fontWeight: "600" }}>Xong</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}>
              {/* Genre filter */}
              <View>
                <Text style={{ color: "#e8e6f0", fontSize: 15, fontWeight: "600", marginBottom: 10 }}>Thể loại</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {ALL_GENRES.map((g) => {
                    const active = filters.genres?.includes(g.id) || false;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => {
                          const current = filters.genres || [];
                          const next = active ? current.filter((x) => x !== g.id) : [...current, g.id];
                          setFilters({ genres: next });
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : "#d4d4d8", fontSize: 13 }}>{g.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Status filter */}
              <View>
                <Text style={{ color: "#e8e6f0", fontSize: 15, fontWeight: "600", marginBottom: 10 }}>Tình trạng</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    { value: null, label: "Tất cả" },
                    { value: "ongoing" as const, label: "Đang ra" },
                    { value: "completed" as const, label: "Hoàn thành" },
                  ].map((opt) => {
                    const active = filters.status === opt.value;
                    return (
                      <Pressable
                        key={String(opt.value)}
                        onPress={() => setFilters({ status: opt.value })}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                          backgroundColor: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
                          flex: 1,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : "#d4d4d8", fontSize: 13, fontWeight: "600" }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Chapter count filter */}
              <View>
                <Text style={{ color: "#e8e6f0", fontSize: 15, fontWeight: "600", marginBottom: 10 }}>Số chương</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {CHAPTER_BUCKETS.map((b) => {
                    const active =
                      filters.minChapters === b.min && filters.maxChapters === b.max;
                    return (
                      <Pressable
                        key={b.label}
                        onPress={() => setFilters({ minChapters: b.min, maxChapters: b.max })}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: active ? "#7c3aed" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : "#d4d4d8", fontSize: 13 }}>{b.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Reset all */}
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
                <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "600" }}>Xoá tất cả bộ lọc</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
