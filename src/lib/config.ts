// Application-wide configuration constants

export const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  CHAPTERS_PER_PAGE: 20,
  COMMENTS_PER_PAGE: 10,
  USERS_PER_PAGE: 10,
  TOPICS_PER_PAGE: 12,
} as const;

export const READING = {
  DEFAULT_FONT_SIZE: 16,
  MIN_FONT_SIZE: 12,
  MAX_FONT_SIZE: 32,
  DEFAULT_LINE_HEIGHT: 1.6,
  MIN_LINE_HEIGHT: 1.2,
  MAX_LINE_HEIGHT: 2.4,
  DEFAULT_COLUMN_WIDTH: 60,
  MIN_COLUMN_WIDTH: 40,
  MAX_COLUMN_WIDTH: 80,
  DEFAULT_BRIGHTNESS: 100,
  MIN_BRIGHTNESS: 20,
  MAX_BRIGHTNESS: 120,
  ACTIVITY_TIMEOUT_MS: 60000, // 60 seconds
  PROGRESS_SAVE_INTERVAL_MS: 5000, // 5 seconds
  SESSION_HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  MARK_AS_READ_THRESHOLD: 95, // percentage
} as const;

export const AI_WRITER = {
  DEFAULT_MODEL: 'qwen/qwen3-235b-a22b-thinking-2507',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_CHAPTER_LENGTH: 2500,
  MIN_CHAPTER_LENGTH: 1000,
  MAX_CHAPTER_LENGTH: 5000,
  DEFAULT_TOTAL_CHAPTERS: 100,
  MIN_TOTAL_CHAPTERS: 10,
  MAX_TOTAL_CHAPTERS: 2000,
  JOB_POLL_INTERVAL_MS: 2000, // 2 seconds
  MAX_RECENT_JOBS: 5,
} as const;

export const STORAGE = {
  NOVEL_COVERS_BUCKET: 'novel-covers',
  COVERS_BUCKET: 'covers',
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/webp'] as const,
} as const;

export const CACHE = {
  READING_PROGRESS_KEY: 'reading-progress-v2',
  READING_SETTINGS_KEY: 'reading-settings',
  BOOKMARKS_KEY: 'bookmarks',
  READING_HISTORY_KEY: 'reading-history',
  MAX_HISTORY_ITEMS: 50,
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  LIBRARY: '/library',
  BROWSE: '/browse',
  RANKING: '/ranking',
  ADMIN: '/admin',
  ADMIN_NOVELS: '/admin/novels',
  ADMIN_USERS: '/admin/users',
  ADMIN_COMMENTS: '/admin/comments',
  ADMIN_AI_WRITER: '/admin/ai-writer',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

export const BREAKPOINTS = {
  MOBILE: 768,
} as const;