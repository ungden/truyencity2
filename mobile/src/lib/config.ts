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
