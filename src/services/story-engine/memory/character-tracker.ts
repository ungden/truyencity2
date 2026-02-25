/**
 * Story Engine v2 — Character Tracker
 *
 * Extracts character states from chapter content via AI and stores in DB.
 * Replaces extractAndSaveCharacterStates() from v1 context-generators.ts.
 *
 * Non-fatal: all errors are caught so chapter writing continues.
 */

import { getSupabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['alive', 'dead', 'missing', 'unknown']);

/**
 * Validate character name to filter garbage from AI extraction.
 * Rejects: numbers only, single chars, special chars, generic labels, too long names.
 */
function isValidCharacterName(name: string): boolean {
  if (!name || name.length < 2) return false;
  if (name.length > 50) return false;
  // Reject pure numbers (e.g., "001", "123")
  if (/^\d+$/.test(name)) return false;
  // Reject names that are just punctuation/special chars
  if (/^[^a-zA-ZÀ-ỹ\u4e00-\u9fff]+$/.test(name)) return false;
  // Reject generic AI labels
  const genericLabels = new Set([
    'unknown', 'null', 'none', 'n/a', 'unnamed', 'nhân vật', 'npc',
    'người lạ', 'tên', 'character', 'protagonist', 'mc', 'main character',
    'nhân vật chính', 'phản diện', 'villain', 'boss',
  ]);
  if (genericLabels.has(name.toLowerCase())) return false;
  // Reject names starting with numbers followed by short text (e.g., "001_guard", "12 Ám Vệ")
  if (/^\d{2,}/.test(name)) return false;
  // Reject group descriptions containing parentheses (e.g., "Đám đông tu sĩ (Tu sĩ trung niên, Thiếu niên tu sĩ)")
  if (name.includes('(') && name.includes(')')) return false;
  // Reject names containing comma-separated lists (e.g., "A, B, C")
  if ((name.match(/,/g) || []).length >= 2) return false;
  return true;
}

// ── Public: Save Character States from Combined Summary Result ───────────────

/**
 * Save character states extracted by the combined summary+character AI call.
 * No AI call needed — data comes from the combined result.
 */
export async function saveCharacterStatesFromCombined(
  projectId: string,
  chapterNumber: number,
  characters: Array<{
    character_name: string;
    status: string;
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>,
): Promise<void> {
  try {
    if (!characters || characters.length === 0) return;

    const rows = characters
      .filter(s => s.character_name && isValidCharacterName(s.character_name.trim()))
      .map(s => ({
        project_id: projectId,
        chapter_number: chapterNumber,
        character_name: s.character_name.trim(),
        status: VALID_STATUSES.has(s.status) ? s.status : 'alive',
        power_level: s.power_level || null,
        power_realm_index: typeof s.power_realm_index === 'number' ? s.power_realm_index : null,
        location: s.location || null,
        personality_quirks: s.personality_quirks || null,
        notes: s.notes || null,
      }));

    if (rows.length === 0) return;

    const db = getSupabase();
    const { error: upsertErr } = await db.from('character_states').upsert(rows, {
      onConflict: 'project_id,chapter_number,character_name',
    });
    if (upsertErr) console.warn('[CharacterTracker] Failed to save combined character states: ' + upsertErr.message);
  } catch {
    // Non-fatal
  }
}

// ── Public: Load Latest Character States for Context ─────────────────────────

