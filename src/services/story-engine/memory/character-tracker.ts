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

// ── Contradiction Detection (MemPalace-inspired) ───────────────────────────

export interface CharacterContradiction {
  characterName: string;
  // Phase 22 Stage 2 Q7: expanded type set so Continuity Guardian can flag all 6 issue classes
  // (was 3) and route them all through autoReviseChapter for fix.
  type: 'resurrection' | 'power_regression' | 'status_flip' | 'location_teleport' | 'personality_flip' | 'info_leak' | 'subplot_reopen';
  severity: 'warning' | 'critical';
  description: string;
  previousChapter: number;
  currentChapter: number;
}

/**
 * Detect contradictions between new character states and their last known states.
 * Runs BEFORE saving new states so it can flag issues for the Critic/Architect.
 *
 * Detects:
 * - Resurrection: character was dead, now alive (critical)
 * - Power regression: power_realm_index decreased without explanation (warning)
 * - Status flip: character flips alive↔missing↔dead without narrative support (warning)
 */
export async function detectCharacterContradictions(
  projectId: string,
  currentChapter: number,
  newCharacters: Array<{
    character_name: string;
    status: string;
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    notes: string | null;
  }>,
): Promise<CharacterContradiction[]> {
  try {
    if (!newCharacters || newCharacters.length === 0) return [];

    const db = getSupabase();
    const contradictions: CharacterContradiction[] = [];

    // Get most recent states for all characters in this project
    // Use a subquery approach: get the max chapter_number per character
    const charNames = newCharacters
      .map(c => c.character_name.trim())
      .filter(n => isValidCharacterName(n));

    if (charNames.length === 0) return [];

    const { data: previousStates } = await db
      .from('character_states')
      .select('character_name, status, power_realm_index, chapter_number')
      .eq('project_id', projectId)
      .in('character_name', charNames)
      .lt('chapter_number', currentChapter)
      .order('chapter_number', { ascending: false });

    if (!previousStates || previousStates.length === 0) return [];

    // Deduplicate: keep only the latest state per character
    const latestByChar = new Map<string, typeof previousStates[0]>();
    for (const state of previousStates) {
      if (!latestByChar.has(state.character_name)) {
        latestByChar.set(state.character_name, state);
      }
    }

    for (const newChar of newCharacters) {
      const name = newChar.character_name.trim();
      const prev = latestByChar.get(name);
      if (!prev) continue;

      // 1. Resurrection detection: was dead, now alive
      if (prev.status === 'dead' && newChar.status === 'alive') {
        contradictions.push({
          characterName: name,
          type: 'resurrection',
          severity: 'critical',
          description: `${name} đã chết ở Ch.${prev.chapter_number} nhưng xuất hiện sống lại ở Ch.${currentChapter} mà không có cơ chế hồi sinh`,
          previousChapter: prev.chapter_number,
          currentChapter,
        });
      }

      // 2. Power regression: realm index went down
      // 2026-04-29 continuity overhaul: severity scaled by drop magnitude.
      // 1-level drops (which sometimes have valid reasons like sealing/curse) → warning.
      // ≥2-level drops are almost always AI errors → critical, triggers auto-revise.
      // Notes containing seal/curse/loss markers are downgraded to warning even at 2+ levels.
      if (
        typeof prev.power_realm_index === 'number' &&
        typeof newChar.power_realm_index === 'number' &&
        newChar.power_realm_index < prev.power_realm_index
      ) {
        const drop = prev.power_realm_index - newChar.power_realm_index;
        const NARRATIVE_LOSS_PATTERNS = /(phong ấn|trúng độc|bị thương|bị nguyền|tự phế|hủy|tổn hao|đoạt mất|bị cướp|chân nguyên tổn thương|tu vi tan vỡ)/i;
        const hasNarrativeReason = (newChar.notes && NARRATIVE_LOSS_PATTERNS.test(newChar.notes)) ||
          (newChar.power_level && NARRATIVE_LOSS_PATTERNS.test(newChar.power_level));
        const severity: 'warning' | 'critical' = (drop >= 2 && !hasNarrativeReason) ? 'critical' : 'warning';
        contradictions.push({
          characterName: name,
          type: 'power_regression',
          severity,
          description: `${name} bị tụt cảnh giới ${drop} bậc: index ${prev.power_realm_index} (Ch.${prev.chapter_number}) → ${newChar.power_realm_index} (Ch.${currentChapter})${hasNarrativeReason ? ' [có lý do narrative trong notes]' : ' [KHÔNG có lý do giải thích]'}`,
          previousChapter: prev.chapter_number,
          currentChapter,
        });
      }

      // 3. Status flip: missing→alive without explanation is suspicious
      // (dead→alive already caught above as resurrection)
      if (prev.status === 'missing' && newChar.status === 'alive') {
        // Check if notes explain the return
        const hasExplanation = newChar.notes &&
          /trở về|xuất hiện lại|tìm thấy|giải cứu|trốn thoát|quay lại/i.test(newChar.notes);
        if (!hasExplanation) {
          contradictions.push({
            characterName: name,
            type: 'status_flip',
            severity: 'warning',
            description: `${name} đang mất tích từ Ch.${prev.chapter_number} nhưng xuất hiện lại ở Ch.${currentChapter} mà không có giải thích`,
            previousChapter: prev.chapter_number,
            currentChapter,
          });
        }
      }
    }

    return contradictions;
  } catch {
    return []; // Non-fatal
  }
}

/**
 * Format contradictions into a prompt string for the Architect/Writer.
 * Returns null if no contradictions.
 */
export function formatContradictionWarnings(contradictions: CharacterContradiction[]): string | null {
  if (contradictions.length === 0) return null;
  const criticals = contradictions.filter(c => c.severity === 'critical');
  const warnings = contradictions.filter(c => c.severity === 'warning');

  const lines: string[] = ['⚠️ CẢNH BÁO MÂU THUẪN NHÂN VẬT:'];
  for (const c of criticals) {
    lines.push(`🚫 [CRITICAL] ${c.description}`);
  }
  for (const c of warnings) {
    lines.push(`⚠️ [WARNING] ${c.description}`);
  }
  lines.push('→ PHẢI giải quyết mâu thuẫn hoặc cung cấp lý do hợp lý trong nội dung chương.');
  return lines.join('\n');
}

// ── Public: Load Latest Character States for Context ─────────────────────────

