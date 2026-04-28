// Genre helpers - matches reference app styling.
// IMPORTANT: keep this map in sync with src/lib/types/genre-config.ts on the
// web side. Missing entries fall back to a Title-Case slug split (no
// diacritics) which looks broken in Vietnamese — e.g. ngu-thu-tien-hoa →
// "Ngu Thu Tien Hoa" instead of "Ngự Thú Tiến Hóa". Mobile bundles
// independently of web so we duplicate the labels here.

const GENRE_LABELS: Record<string, string> = {
  // Top-level genres (must match web GENRE_CONFIG keys + names)
  "tien-hiep": "Tiên Hiệp",
  "huyen-huyen": "Huyền Huyễn",
  "do-thi": "Đô Thị",
  "kiem-hiep": "Kiếm Hiệp",
  "khoa-huyen": "Khoa Huyễn",
  "lich-su": "Lịch Sử",
  "dong-nhan": "Đồng Nhân",
  "vong-du": "Võng Du",
  "mat-the": "Mạt Thế",
  "linh-di": "Linh Dị",
  "quan-truong": "Quan Trường",
  "di-gioi": "Dị Giới",
  "ngon-tinh": "Ngôn Tình",
  "quy-tac-quai-dam": "Quy Tắc Quái Đàm",
  "ngu-thu-tien-hoa": "Ngự Thú Tiến Hóa",
  "khoai-xuyen": "Khoái Xuyên",
  // Sub-genres / overlay tags (sub_genres array in DB) — keep diacritics so
  // novel-card hashtag rendering reads naturally even when topic_id resolves
  // through this map.
  "da-su": "Dã Sử",
  "quan-su": "Quân Sự",
  "kinh-di": "Kinh Dị",
  "he-thong": "Hệ Thống",
  "xuyen-khong": "Xuyên Không",
  "trong-sinh": "Trọng Sinh",
  "mo-phong": "Mô Phỏng",
  "linh-vuc-tuyet-doi": "Lĩnh Vực Tuyệt Đối",
  "sang-the": "Sáng Thế",
  "hac-am-luu": "Hắc Ám Lưu",
  "kim-bang-bo-quang": "Kim Bảng Bộc Quang",
};

// Colors for #HASHTAG genre tags (text color, matching reference app)
const GENRE_TAG_COLORS: Record<string, string> = {
  "tien-hiep": "#e67e22",
  "huyen-huyen": "#e74c3c",
  "do-thi": "#2ecc71",
  "kiem-hiep": "#d35400",
  "khoa-huyen": "#3498db",
  "lich-su": "#f39c12",
  "da-su": "#f39c12",
  "dong-nhan": "#3498db",
  "vong-du": "#1abc9c",
  "quan-su": "#8e44ad",
  "mat-the": "#7f8c8d",
  "linh-di": "#34495e",
  "quan-truong": "#16a085",
  "di-gioi": "#9b59b6",
  "ngon-tinh": "#e91e63",
  "kinh-di": "#7f8c8d",
  "he-thong": "#9b59b6",
  "xuyen-khong": "#2980b9",
  "trong-sinh": "#27ae60",
  "quy-tac-quai-dam": "#2c3e50",
  "ngu-thu-tien-hoa": "#f39c12",
  "khoai-xuyen": "#9b59b6",
  "mo-phong": "#16a085",
  "linh-vuc-tuyet-doi": "#c0392b",
  "sang-the": "#2980b9",
  "hac-am-luu": "#1a1a1a",
  "kim-bang-bo-quang": "#f1c40f",
};

// Background badge colors (for covers and older style)
const GENRE_COLORS: Record<string, string> = {
  "tien-hiep": "bg-amber-600",
  "huyen-huyen": "bg-red-500",
  "do-thi": "bg-emerald-600",
  "kiem-hiep": "bg-orange-700",
  "khoa-huyen": "bg-blue-600",
  "lich-su": "bg-orange-600",
  "da-su": "bg-orange-600",
  "dong-nhan": "bg-blue-500",
  "vong-du": "bg-cyan-600",
  "quan-su": "bg-purple-600",
  "mat-the": "bg-stone-600",
  "linh-di": "bg-slate-700",
  "quan-truong": "bg-teal-600",
  "di-gioi": "bg-violet-600",
  "ngon-tinh": "bg-pink-500",
  "kinh-di": "bg-gray-600",
  "he-thong": "bg-purple-500",
  "xuyen-khong": "bg-blue-700",
  "trong-sinh": "bg-green-600",
  "quy-tac-quai-dam": "bg-slate-800",
  "ngu-thu-tien-hoa": "bg-amber-500",
  "khoai-xuyen": "bg-violet-700",
  "mo-phong": "bg-teal-700",
  "linh-vuc-tuyet-doi": "bg-red-700",
  "sang-the": "bg-blue-800",
  "hac-am-luu": "bg-zinc-900",
  "kim-bang-bo-quang": "bg-yellow-500",
};

export function getGenreLabel(slug: string | null | undefined): string {
  if (!slug) return "";
  // Defensive fallback when a slug isn't in the map yet (e.g. a topic_id from
  // a freshly seeded novel that we haven't translated). Convert dashes to
  // spaces and Title-Case so it doesn't render as e.g. "ngu-thu-hoc-vien".
  // The user-visible string still won't have Vietnamese diacritics, so add
  // any missing slugs to GENRE_LABELS above as soon as you spot them.
  return (
    GENRE_LABELS[slug] ||
    slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function getGenreColor(slug: string | null | undefined): string {
  if (!slug) return "bg-gray-500";
  return GENRE_COLORS[slug] || "bg-gray-500";
}

export function getGenreTagColor(slug: string | null | undefined): string {
  if (!slug) return "#999999";
  return GENRE_TAG_COLORS[slug] || "#999999";
}

export const ALL_GENRES = Object.keys(GENRE_LABELS);
