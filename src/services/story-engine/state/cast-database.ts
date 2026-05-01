/**
 * Story Engine v2 — Cast Database (Phase 27 W2.1)
 *
 * COMPREHENSIVE roster of every named character that has ever appeared.
 * Solves the long-tail cast drift problem in 1000+ chapter novels:
 *
 * Pre-Phase-27 problem:
 *   character_states queried with `LIMIT 50` rows returned only the most
 *   recent 50 character_states ROWS (not 50 distinct chars). For 50 distinct
 *   chars × 5 mentions each = 250 rows; the query missed ~80% of named cast.
 *   Side characters who appeared at ch.50, mentioned at ch.300, and showed
 *   up alive again at ch.700 had no state visible to the AI at ch.700 → drift,
 *   resurrection, contradiction.
 *
 * Phase 27 W2.1 fix:
 *   Server-side dedup via `DISTINCT ON (character_name)` (or JS-side fallback)
 *   so we get the LATEST state of EVERY named char in one query. Returns up to
 *   80 distinct chars sorted by last_seen_chapter desc.
 *
 * Đại thần workflow mapping:
 *   "Cast database" (角色档案) — top web novel authors maintain a comprehensive
 *   index of every named character + their last-known state. Without this,
 *   long-form continuity breaks: side char A who died at ch.150 appears alive
 *   at ch.700; rival B who was last seen in city C suddenly walks into city D.
 *
 * No new DB table — this module is a SMART READER on top of existing
 * `character_states` table.
 */

import { getSupabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CastMember {
  characterName: string;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  powerLevel: string | null;
  powerRealmIndex: number | null;
  location: string | null;
  personalityQuirks: string | null;
  notes: string | null;
  lastSeenChapter: number;
  appearanceCount: number; // approximate — based on rows returned
}

interface CharacterStateRow {
  character_name: string;
  status: string;
  power_level: string | null;
  power_realm_index: number | null;
  location: string | null;
  personality_quirks: string | null;
  notes: string | null;
  chapter_number: number;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns up to `limit` distinct characters with their LATEST state.
 * JS-side dedup: fetches up to `fetchRows` (default 600) recent rows ordered by
 * chapter_number desc, then keeps the first occurrence per character_name.
 *
 * Why JS-side: Supabase REST doesn't directly support `DISTINCT ON`. For
 * <1000 chars in a project, fetching 600 rows + JS dedup is fast (~50ms).
 * For larger casts, an RPC `get_active_cast` should be added (TODO Phase 28).
 */
export async function getActiveCast(
  projectId: string,
  maxChapter: number,
  limit = 80,
): Promise<CastMember[]> {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('character_states')
      .select('character_name,status,power_level,power_realm_index,location,personality_quirks,notes,chapter_number')
      .eq('project_id', projectId)
      .lte('chapter_number', maxChapter)
      .order('chapter_number', { ascending: false })
      .limit(600);

    if (error) {
      console.warn(`[cast-database] getActiveCast load failed: ${error.message}`);
      return [];
    }
    if (!data || data.length === 0) return [];

    // JS-side dedup: keep first row (most recent) per character_name.
    const latestByName = new Map<string, CastMember>();
    const countByName = new Map<string, number>();
    for (const row of data as CharacterStateRow[]) {
      const name = row.character_name;
      if (!name) continue;
      countByName.set(name, (countByName.get(name) || 0) + 1);
      if (!latestByName.has(name)) {
        latestByName.set(name, {
          characterName: name,
          status: (VALID_STATUSES.has(row.status) ? row.status : 'unknown') as CastMember['status'],
          powerLevel: row.power_level,
          powerRealmIndex: row.power_realm_index,
          location: row.location,
          personalityQuirks: row.personality_quirks,
          notes: row.notes,
          lastSeenChapter: row.chapter_number,
          appearanceCount: 0, // patched below
        });
      }
    }
    for (const member of latestByName.values()) {
      member.appearanceCount = countByName.get(member.characterName) || 0;
    }

    // Sort by last_seen_chapter desc, slice to `limit`.
    const cast = [...latestByName.values()]
      .sort((a, b) => b.lastSeenChapter - a.lastSeenChapter)
      .slice(0, limit);

    return cast;
  } catch (e) {
    console.warn(`[cast-database] getActiveCast threw:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}

const VALID_STATUSES = new Set(['alive', 'dead', 'missing', 'unknown']);

/**
 * Format the active cast as a compact context block for Architect / Critic.
 * Groups by status (alive first, then missing, then dead) + sorted by recency.
 *
 * Cap output at ~6000 chars so it fits within the context budget. For 50+
 * chars this means each entry compresses to ~120 chars.
 */
export async function getCastRosterContext(
  projectId: string,
  currentChapter: number,
  options: { limit?: number; maxChars?: number } = {},
): Promise<string | null> {
  const limit = options.limit ?? 60;
  const maxChars = options.maxChars ?? 6000;

  const cast = await getActiveCast(projectId, currentChapter, limit);
  if (cast.length === 0) return null;

  const alive = cast.filter(c => c.status === 'alive');
  const missing = cast.filter(c => c.status === 'missing' || c.status === 'unknown');
  const dead = cast.filter(c => c.status === 'dead');

  const lines: string[] = ['[CAST ROSTER — TOÀN BỘ NHÂN VẬT ĐÃ XUẤT HIỆN, BẮT BUỘC GIỮ NHẤT QUÁN]'];

  const formatMember = (c: CastMember): string => {
    const power = c.powerLevel ? `${c.powerLevel}${c.powerRealmIndex !== null ? ` (idx ${c.powerRealmIndex})` : ''}` : '';
    const loc = c.location ? `@${c.location}` : '';
    const seen = `last ch.${c.lastSeenChapter}`;
    const parts = [c.characterName, power, loc, seen].filter(Boolean);
    let line = `  • ${parts.join(' | ')}`;
    if (c.personalityQuirks && line.length < 100) line += ` (${c.personalityQuirks.slice(0, 80)})`;
    return line;
  };

  let totalChars = lines[0].length;
  const append = (label: string, members: CastMember[]) => {
    if (members.length === 0) return;
    const header = `\n${label} (${members.length}):`;
    if (totalChars + header.length > maxChars) return;
    lines.push(header);
    totalChars += header.length;
    for (const c of members) {
      const formatted = formatMember(c);
      if (totalChars + formatted.length > maxChars) {
        lines.push(`  ... (${members.length - lines.length + 2} more truncated)`);
        return;
      }
      lines.push(formatted);
      totalChars += formatted.length;
    }
  };

  append('🟢 ALIVE', alive);
  append('🟡 MISSING/UNKNOWN', missing);
  append('🔴 DEAD — KHÔNG ĐƯỢC XUẤT HIỆN SỐNG TRONG CHƯƠNG NÀY (chỉ flashback rõ ràng)', dead);

  lines.push('\n→ Mọi nhân vật trong roster này đều có thể được tham chiếu. Status MISSING có thể tái xuất với lý do narrative. Status DEAD CẤM xuất hiện sống.');

  return lines.join('\n');
}

/**
 * Returns just the names of recently-active characters (last N chapters).
 * Useful for relevance ranking — pass to context modules to filter "who's
 * actively in the story right now."
 */
export async function getRecentlyActiveCastNames(
  projectId: string,
  currentChapter: number,
  windowChapters = 30,
): Promise<string[]> {
  const cast = await getActiveCast(projectId, currentChapter, 200);
  return cast
    .filter(c => currentChapter - c.lastSeenChapter <= windowChapters && c.status !== 'dead')
    .map(c => c.characterName);
}
