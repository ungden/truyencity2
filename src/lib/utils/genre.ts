import { GENRE_CONFIG, type GenreKey } from '@/lib/types/genre-config';

/**
 * Centralized genre helpers.
 * Single source of truth for slug -> Vietnamese name, color, and icon.
 */

const GENRE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_CONFIG).map(([k, v]) => [k, v.name])
);

const GENRE_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_CONFIG).map(([k, v]) => [k, v.icon])
);

/** Map genre slug -> Tailwind bg class for badges */
const GENRE_COLORS: Record<string, string> = {
  'tien-hiep': 'bg-amber-600',
  'huyen-huyen': 'bg-purple-600',
  'do-thi': 'bg-emerald-600',
  'khoa-huyen': 'bg-blue-600',
  'lich-su': 'bg-orange-700',
  'dong-nhan': 'bg-pink-600',
  'vong-du': 'bg-cyan-600',
};

/** Translate genre slug to Vietnamese display name. */
export function getGenreLabel(slug: string | null | undefined): string {
  if (!slug) return '';
  return GENRE_LABELS[slug] || slug;
}

/** Get Tailwind bg color class for a genre slug. */
export function getGenreColor(slug: string | null | undefined): string {
  if (!slug) return 'bg-gray-600';
  return GENRE_COLORS[slug] || 'bg-gray-600';
}

/** Get emoji icon for a genre slug. */
export function getGenreIcon(slug: string | null | undefined): string {
  if (!slug) return '';
  return GENRE_ICONS[slug] || '';
}

/** Check if a slug is a valid genre key. */
export function isValidGenre(slug: string): slug is GenreKey {
  return slug in GENRE_CONFIG;
}
