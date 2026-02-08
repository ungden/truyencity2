import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip internal metadata blocks from novel descriptions.
 * 
 * The content seeder appends structured metadata (TÓM TẮT, NHÂN VẬT CHÍNH,
 * THẾ GIỚI, CULTIVATION SYSTEM, MODERN SETTING, etc.) after the synopsis.
 * This function keeps only the reader-facing intro + synopsis.
 */
const METADATA_HEADERS = [
  'NHÂN VẬT CHÍNH',
  'NHAN VAT CHINH',
  'THẾ GIỚI',
  'THE GIOI',
  'CULTIVATION SYSTEM',
  'CULTIVATION_SYSTEM',
  'MAGIC SYSTEM',
  'MAGIC_SYSTEM',
  'MODERN SETTING',
  'MODERN_SETTING',
  'TECH LEVEL',
  'TECH_LEVEL',
  'HISTORICAL PERIOD',
  'HISTORICAL_PERIOD',
  'GAME SYSTEM',
  'GAME_SYSTEM',
  'ORIGINAL WORK',
  'ORIGINAL_WORK',
];

export function cleanNovelDescription(raw: string | null | undefined): string {
  if (!raw) return '';
  let text = raw;

  // Find the earliest metadata header and cut everything from there
  let cutIndex = text.length;
  for (const header of METADATA_HEADERS) {
    const idx = text.indexOf(header);
    if (idx !== -1 && idx < cutIndex) {
      cutIndex = idx;
    }
  }

  text = text.slice(0, cutIndex).trim();

  // Remove the "TÓM TẮT" / "TOM TAT" label but keep its content
  text = text.replace(/\n\n?TÓM TẮT\n/g, '\n\n');
  text = text.replace(/\n\n?TOM TAT\n/g, '\n\n');

  // Clean up excess whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
