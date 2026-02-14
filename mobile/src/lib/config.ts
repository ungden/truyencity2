// Shared config constants (portable from web)
export const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  CHAPTERS_PER_PAGE: 20,
  COMMENTS_PER_PAGE: 10,
} as const;

export const READING = {
  DEFAULT_FONT_SIZE: 18, // slightly larger for mobile
  MIN_FONT_SIZE: 14,
  MAX_FONT_SIZE: 32,
  DEFAULT_LINE_HEIGHT: 1.8,
  MIN_LINE_HEIGHT: 1.2,
  MAX_LINE_HEIGHT: 2.4,
  DEFAULT_BRIGHTNESS: 100,
  MIN_BRIGHTNESS: 20,
  MAX_BRIGHTNESS: 120,
  ACTIVITY_TIMEOUT_MS: 60000,
  PROGRESS_SAVE_INTERVAL_MS: 5000,
  SESSION_HEARTBEAT_INTERVAL_MS: 30000,
  MARK_AS_READ_THRESHOLD: 95,
} as const;

export const CACHE = {
  READING_PROGRESS_KEY: "reading-progress-v2",
  READING_SETTINGS_KEY: "reading-settings",
  BOOKMARKS_KEY: "bookmarks",
  READING_HISTORY_KEY: "reading-history",
  MAX_HISTORY_ITEMS: 50,
} as const;

export const STORAGE = {
  NOVEL_COVERS_BUCKET: "novel-covers",
  COVERS_BUCKET: "covers",
} as const;

export const SUPABASE_IMAGE_BASE =
  "https://jxhpejyowuihvjpqwarm.supabase.co/storage/v1/object/public";

// ── Reader Themes ──────────────────────────────────────────────
export type ReaderThemeId = "dark" | "light" | "sepia" | "green";

export interface ReaderTheme {
  id: ReaderThemeId;
  label: string;
  bg: string;
  text: string;
  textSecondary: string;
  heading: string;
  accent: string;
  controlBg: string;
  controlBorder: string;
  barBg: string;
  blockquoteBorder: string;
  linkColor: string;
  /** Status bar style */
  statusBar: "light" | "dark";
}

export const READER_THEMES: Record<ReaderThemeId, ReaderTheme> = {
  dark: {
    id: "dark",
    label: "Tối",
    bg: "#09090b",
    text: "#e4e4e7",
    textSecondary: "#71717a",
    heading: "#fafafa",
    accent: "#a78bfa",
    controlBg: "#18181b",
    controlBorder: "#27272a",
    barBg: "#09090b",
    blockquoteBorder: "#52525b",
    linkColor: "#a78bfa",
    statusBar: "light",
  },
  light: {
    id: "light",
    label: "Sáng",
    bg: "#ffffff",
    text: "#1c1c1e",
    textSecondary: "#8e8e93",
    heading: "#000000",
    accent: "#6366f1",
    controlBg: "#f2f2f7",
    controlBorder: "#d1d1d6",
    barBg: "#ffffff",
    blockquoteBorder: "#c7c7cc",
    linkColor: "#6366f1",
    statusBar: "dark",
  },
  sepia: {
    id: "sepia",
    label: "Sepia",
    bg: "#f4ecd8",
    text: "#5b4636",
    textSecondary: "#8b7355",
    heading: "#3e2c1e",
    accent: "#8b6914",
    controlBg: "#ebe3d0",
    controlBorder: "#d4c9b0",
    barBg: "#f4ecd8",
    blockquoteBorder: "#c4b896",
    linkColor: "#8b6914",
    statusBar: "dark",
  },
  green: {
    id: "green",
    label: "Xanh",
    bg: "#dce8d2",
    text: "#2d3e2d",
    textSecondary: "#5a715a",
    heading: "#1a2e1a",
    accent: "#4a7c59",
    controlBg: "#cddcc3",
    controlBorder: "#b5c9a8",
    barBg: "#dce8d2",
    blockquoteBorder: "#9db88e",
    linkColor: "#4a7c59",
    statusBar: "dark",
  },
} as const;

export type ReaderFontFamily = "system" | "serif" | "mono";

export const READER_FONTS: { id: ReaderFontFamily; label: string; fontFamily: string }[] = [
  { id: "system", label: "Sans", fontFamily: "System" },
  { id: "serif", label: "Serif", fontFamily: "Georgia" },
  { id: "mono", label: "Mono", fontFamily: "Menlo" },
];

export const LINE_HEIGHT_PRESETS = [
  { id: "compact", label: "Gọn", value: 1.4 },
  { id: "normal", label: "Vừa", value: 1.7 },
  { id: "relaxed", label: "Rộng", value: 2.0 },
] as const;

export type ReaderSettings = {
  fontSize: number;
  lineHeight: number;
  theme: ReaderThemeId;
  fontFamily: ReaderFontFamily;
  brightness: number;
  ttsSpeed: number;
  autoScrollSpeed: number; // px per second, 0 = off
};
