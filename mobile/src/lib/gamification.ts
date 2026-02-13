// Gamification system — cultivation-themed levels & achievements
// All calculations are client-side from existing Supabase data

// ─── XP Sources ───────────────────────────────────────────────
export const XP_REWARDS = {
  CHAPTER_READ: 10,
  NOVEL_STARTED: 25,
  NOVEL_COMPLETED: 200,
  READING_HOUR: 50,
  BOOKMARK: 5,
  RATING: 15,
  COMMENT: 20,
  STREAK_DAY: 30,
} as const;

// ─── User Stats (input to XP calculation) ─────────────────────
export interface UserStats {
  chaptersRead: number;
  novelsStarted: number;
  novelsCompleted: number;
  totalReadingSeconds: number;
  bookmarkCount: number;
  ratingCount: number;
  commentCount: number;
  currentStreak: number;
  longestStreak: number;
  uniqueGenres: number;
}

export const EMPTY_STATS: UserStats = {
  chaptersRead: 0,
  novelsStarted: 0,
  novelsCompleted: 0,
  totalReadingSeconds: 0,
  bookmarkCount: 0,
  ratingCount: 0,
  commentCount: 0,
  currentStreak: 0,
  longestStreak: 0,
  uniqueGenres: 0,
};

// ─── XP Calculation ───────────────────────────────────────────
export function calculateXP(stats: UserStats): number {
  return (
    stats.chaptersRead * XP_REWARDS.CHAPTER_READ +
    stats.novelsStarted * XP_REWARDS.NOVEL_STARTED +
    stats.novelsCompleted * XP_REWARDS.NOVEL_COMPLETED +
    Math.floor(stats.totalReadingSeconds / 3600) * XP_REWARDS.READING_HOUR +
    stats.bookmarkCount * XP_REWARDS.BOOKMARK +
    stats.ratingCount * XP_REWARDS.RATING +
    stats.commentCount * XP_REWARDS.COMMENT +
    stats.currentStreak * XP_REWARDS.STREAK_DAY
  );
}

// ─── Cultivation Levels ───────────────────────────────────────
export interface CultivationLevel {
  level: number;
  title: string;
  subtitle: string;
  minXP: number;
  color: string;
}

export const CULTIVATION_LEVELS: CultivationLevel[] = [
  { level: 1, title: "Phàm Nhân", subtitle: "Người thường", minXP: 0, color: "#9CA3AF" },
  { level: 2, title: "Luyện Khí", subtitle: "Bắt đầu tu luyện", minXP: 100, color: "#6EE7B7" },
  { level: 3, title: "Trúc Cơ", subtitle: "Xây nền móng", minXP: 500, color: "#34D399" },
  { level: 4, title: "Kim Đan", subtitle: "Kết kim đan", minXP: 1500, color: "#FBBF24" },
  { level: 5, title: "Nguyên Anh", subtitle: "Nguyên thần hóa anh", minXP: 3500, color: "#F59E0B" },
  { level: 6, title: "Hóa Thần", subtitle: "Thần thức giác ngộ", minXP: 7000, color: "#F97316" },
  { level: 7, title: "Luyện Hư", subtitle: "Luyện hư hợp đạo", minXP: 12000, color: "#EF4444" },
  { level: 8, title: "Hợp Thể", subtitle: "Thân thần hợp nhất", minXP: 20000, color: "#DC2626" },
  { level: 9, title: "Đại Thừa", subtitle: "Đại đạo viên mãn", minXP: 35000, color: "#A855F7" },
  { level: 10, title: "Độ Kiếp", subtitle: "Vượt thiên kiếp", minXP: 55000, color: "#8B5CF6" },
  { level: 11, title: "Tiên Nhân", subtitle: "Phi thăng thành tiên", minXP: 80000, color: "#6366F1" },
  { level: 12, title: "Tiên Vương", subtitle: "Xưng vương tiên giới", minXP: 120000, color: "#4F46E5" },
  { level: 13, title: "Tiên Đế", subtitle: "Đế tôn vô thượng", minXP: 200000, color: "#FFD700" },
];

export function getCurrentLevel(xp: number): CultivationLevel {
  let current = CULTIVATION_LEVELS[0];
  for (const level of CULTIVATION_LEVELS) {
    if (xp >= level.minXP) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevel(xp: number): CultivationLevel | null {
  for (const level of CULTIVATION_LEVELS) {
    if (xp < level.minXP) {
      return level;
    }
  }
  return null;
}

export function getLevelProgress(xp: number): number {
  const current = getCurrentLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 1;
  const range = next.minXP - current.minXP;
  const progress = xp - current.minXP;
  return Math.min(progress / range, 1);
}

// ─── Achievements / Badges ────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
  category: "reading" | "social" | "dedication";
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Reading ──
  {
    id: "first_chapter",
    title: "Khởi Đầu",
    description: "Đọc chương đầu tiên",
    icon: "📖",
    condition: (s) => s.chaptersRead >= 1,
    category: "reading",
  },
  {
    id: "bookworm_10",
    title: "Mọt Sách",
    description: "Đọc 10 chương",
    icon: "🐛",
    condition: (s) => s.chaptersRead >= 10,
    category: "reading",
  },
  {
    id: "avid_reader_50",
    title: "Đọc Giả Chăm Chỉ",
    description: "Đọc 50 chương",
    icon: "📚",
    condition: (s) => s.chaptersRead >= 50,
    category: "reading",
  },
  {
    id: "chapter_centurion",
    title: "Bách Chương Đại Sư",
    description: "Đọc 100 chương",
    icon: "🏅",
    condition: (s) => s.chaptersRead >= 100,
    category: "reading",
  },
  {
    id: "chapter_master_500",
    title: "Ngũ Bách Chương",
    description: "Đọc 500 chương",
    icon: "👑",
    condition: (s) => s.chaptersRead >= 500,
    category: "reading",
  },
  {
    id: "chapter_legend_1000",
    title: "Thiên Chương Truyền Kỳ",
    description: "Đọc 1000 chương",
    icon: "🏆",
    condition: (s) => s.chaptersRead >= 1000,
    category: "reading",
  },
  {
    id: "first_novel",
    title: "Người Mới",
    description: "Bắt đầu đọc truyện đầu tiên",
    icon: "🌱",
    condition: (s) => s.novelsStarted >= 1,
    category: "reading",
  },
  {
    id: "explorer_5",
    title: "Nhà Thám Hiểm",
    description: "Đọc 5 truyện khác nhau",
    icon: "🧭",
    condition: (s) => s.novelsStarted >= 5,
    category: "reading",
  },
  {
    id: "explorer_20",
    title: "Đại Thám Hiểm Gia",
    description: "Đọc 20 truyện khác nhau",
    icon: "🗺️",
    condition: (s) => s.novelsStarted >= 20,
    category: "reading",
  },
  {
    id: "completionist_1",
    title: "Hoàn Thành Gia",
    description: "Đọc xong 1 truyện",
    icon: "✅",
    condition: (s) => s.novelsCompleted >= 1,
    category: "reading",
  },
  {
    id: "completionist_10",
    title: "Đại Hoàn Thành",
    description: "Đọc xong 10 truyện",
    icon: "🎯",
    condition: (s) => s.novelsCompleted >= 10,
    category: "reading",
  },
  // ── Social ──
  {
    id: "first_bookmark",
    title: "Đánh Dấu",
    description: "Đánh dấu truyện đầu tiên",
    icon: "🔖",
    condition: (s) => s.bookmarkCount >= 1,
    category: "social",
  },
  {
    id: "collector_10",
    title: "Nhà Sưu Tầm",
    description: "Đánh dấu 10 truyện",
    icon: "📌",
    condition: (s) => s.bookmarkCount >= 10,
    category: "social",
  },
  {
    id: "first_rating",
    title: "Nhà Phê Bình",
    description: "Đánh giá truyện đầu tiên",
    icon: "⭐",
    condition: (s) => s.ratingCount >= 1,
    category: "social",
  },
  {
    id: "critic_10",
    title: "Đại Phê Bình Gia",
    description: "Đánh giá 10 truyện",
    icon: "🌟",
    condition: (s) => s.ratingCount >= 10,
    category: "social",
  },
  {
    id: "first_comment",
    title: "Người Bình Luận",
    description: "Viết bình luận đầu tiên",
    icon: "💬",
    condition: (s) => s.commentCount >= 1,
    category: "social",
  },
  {
    id: "commenter_20",
    title: "Tán Gia",
    description: "Viết 20 bình luận",
    icon: "🗣️",
    condition: (s) => s.commentCount >= 20,
    category: "social",
  },
  // ── Dedication ──
  {
    id: "streak_3",
    title: "Kiên Trì",
    description: "Đọc 3 ngày liên tục",
    icon: "🔥",
    condition: (s) => s.currentStreak >= 3,
    category: "dedication",
  },
  {
    id: "streak_7",
    title: "Tuần Lễ Đọc",
    description: "Đọc 7 ngày liên tục",
    icon: "🔥",
    condition: (s) => s.currentStreak >= 7,
    category: "dedication",
  },
  {
    id: "streak_30",
    title: "Tháng Đọc",
    description: "Đọc 30 ngày liên tục",
    icon: "💎",
    condition: (s) => s.currentStreak >= 30,
    category: "dedication",
  },
  {
    id: "reading_10h",
    title: "10 Giờ Đọc",
    description: "Tổng thời gian đọc 10 giờ",
    icon: "⏰",
    condition: (s) => s.totalReadingSeconds >= 36000,
    category: "dedication",
  },
  {
    id: "reading_100h",
    title: "100 Giờ Đọc",
    description: "Tổng thời gian đọc 100 giờ",
    icon: "⌛",
    condition: (s) => s.totalReadingSeconds >= 360000,
    category: "dedication",
  },
  {
    id: "genre_explorer",
    title: "Đa Thể Loại",
    description: "Đọc truyện từ 5 thể loại khác nhau",
    icon: "🎭",
    condition: (s) => s.uniqueGenres >= 5,
    category: "dedication",
  },
];

export function getUnlockedAchievements(stats: UserStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.condition(stats));
}

export function getLockedAchievements(stats: UserStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !a.condition(stats));
}
