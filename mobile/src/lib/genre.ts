// Genre helpers - matches reference app styling

const GENRE_LABELS: Record<string, string> = {
  "tien-hiep": "Tiên Hiệp",
  "huyen-huyen": "Huyền Huyễn",
  "do-thi": "Đô Thị",
  "khoa-huyen": "Khoa Huyễn",
  "lich-su": "Lịch Sử",
  "da-su": "Dã Sử",
  "dong-nhan": "Đồng Nhân",
  "vong-du": "Võng Du",
  "quan-su": "Quân Sự",
  "ngon-tinh": "Ngôn Tình",
  "kinh-di": "Kinh Dị",
  "he-thong": "Hệ Thống",
  "xuyen-khong": "Xuyên Không",
  "trong-sinh": "Trọng Sinh",
};

// Colors for #HASHTAG genre tags (text color, matching reference app)
const GENRE_TAG_COLORS: Record<string, string> = {
  "tien-hiep": "#e67e22",
  "huyen-huyen": "#e74c3c",
  "do-thi": "#2ecc71",
  "khoa-huyen": "#3498db",
  "lich-su": "#f39c12",
  "da-su": "#f39c12",
  "dong-nhan": "#3498db",
  "vong-du": "#1abc9c",
  "quan-su": "#8e44ad",
  "ngon-tinh": "#e91e63",
  "kinh-di": "#7f8c8d",
  "he-thong": "#9b59b6",
  "xuyen-khong": "#2980b9",
  "trong-sinh": "#27ae60",
};

// Background badge colors (for covers and older style)
const GENRE_COLORS: Record<string, string> = {
  "tien-hiep": "bg-amber-600",
  "huyen-huyen": "bg-red-500",
  "do-thi": "bg-emerald-600",
  "khoa-huyen": "bg-blue-600",
  "lich-su": "bg-orange-600",
  "da-su": "bg-orange-600",
  "dong-nhan": "bg-blue-500",
  "vong-du": "bg-cyan-600",
  "quan-su": "bg-purple-600",
  "ngon-tinh": "bg-pink-500",
  "kinh-di": "bg-gray-600",
  "he-thong": "bg-purple-500",
  "xuyen-khong": "bg-blue-700",
  "trong-sinh": "bg-green-600",
};

export function getGenreLabel(slug: string | null | undefined): string {
  if (!slug) return "";
  return GENRE_LABELS[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
