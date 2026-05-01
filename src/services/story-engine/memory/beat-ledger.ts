/**
 * Story Engine v2 — Beat Ledger (memory layer)
 *
 * Tracks beat usage with cooldowns + categories. Each scene/event type
 * (tournament, betrayal, breakthrough, ...) has a cooldown after use so we
 * don't repeat the same beat every 5 chapters. Recorded post-write via regex
 * detection on chapter content.
 *
 * Phase 27 split: extracted from memory/plot-tracker.ts (was 4-in-1 file).
 */

import { getSupabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

type BeatCategory = 'plot' | 'emotional' | 'setting';

interface BeatEntry {
  beatType: string;
  category: BeatCategory;
  chapterNumber: number;
  cooldownUntil: number;
}

// Cooldown in chapters before a beat can be reused.
const BEAT_COOLDOWNS: Record<string, number> = {
  // Plot beats
  war: 50, betrayal: 40, sacrifice: 40, inheritance: 35,
  tournament: 30, family_reunion: 30, auction: 25, revelation: 25,
  secret_realm: 20, assassination: 20, alliance: 20, rescue_mission: 15,
  treasure_hunt: 18, sect_conflict: 15, escape: 15, trial: 12,
  investigation: 12, duel: 10, breakthrough: 8, merchant: 8, training: 5,
  // Emotional beats
  revenge: 25, loss: 25, humiliation: 20, despair: 15,
  reunion: 20, romance: 15, triumph: 12, shock: 10,
  loyalty: 10, satisfaction: 10, hope: 8, growth: 8,
  relief: 8, anger: 8, tension: 5, curiosity: 3,
  // Setting beats
  underworld: 25, prison: 25, ancient_ruins: 20, battlefield: 20,
  divine_realm: 20, mortal_realm: 15, ocean: 15, palace: 12,
  sky: 12, cave: 10, mountain: 8, marketplace: 8,
  wilderness: 8, city: 5, sect_grounds: 3,
};

// Vietnamese patterns for beat detection.
const BEAT_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: 'tournament',    re: /(?:thi đấu|đại hội|võ đài|tranh đoạt|tỷ thí)/i },
  { type: 'auction',       re: /(?:đấu giá|phiên chợ|mua bán|trả giá)/i },
  { type: 'breakthrough',  re: /(?:đột phá|lên cảnh giới|ngưng tụ|hóa thần|thông mạch)/i },
  { type: 'betrayal',      re: /(?:phản bội|lật mặt|đâm sau lưng|bán đứng)/i },
  { type: 'revenge',       re: /(?:báo thù|trả thù|rửa hận|phục thù)/i },
  { type: 'treasure_hunt', re: /(?:kho báu|di tích|bảo vật|thần khí|linh dược)/i },
  { type: 'duel',          re: /(?:quyết đấu|sinh tử chiến|đối đầu|thách đấu)/i },
  { type: 'training',      re: /(?:tu luyện|tập luyện|bế quan|đóng cửa tu hành)/i },
  { type: 'face_slap',     re: /(?:quỳ xuống|xin tha|nhận sai|bẽ mặt|mất mặt|tát vào mặt)/i },
  { type: 'romance',       re: /(?:tình cảm|yêu|thương|hôn|ôm|e thẹn)/i },
  { type: 'secret_realm',  re: /(?:bí cảnh|không gian bí mật|cổ tích|di tích cổ)/i },
  { type: 'war',           re: /(?:đại chiến|chiến tranh|công thành|vạn quân)/i },
];

const EMOTIONAL_BEATS = new Set([
  'humiliation', 'revenge', 'triumph', 'despair', 'hope', 'shock',
  'romance', 'sacrifice', 'loyalty', 'growth', 'loss', 'reunion',
  'tension', 'relief', 'curiosity', 'anger', 'satisfaction',
]);

const SETTING_BEATS = new Set([
  'sect_grounds', 'wilderness', 'city', 'ancient_ruins', 'mortal_realm',
  'divine_realm', 'underworld', 'mountain', 'ocean', 'sky', 'cave',
  'palace', 'marketplace', 'battlefield', 'prison',
]);

function categorize(beatType: string): BeatCategory {
  if (EMOTIONAL_BEATS.has(beatType)) return 'emotional';
  if (SETTING_BEATS.has(beatType)) return 'setting';
  return 'plot';
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Build beat guidance context: which beats to use and avoid.
 */
export async function buildBeatContext(
  projectId: string,
  chapterNumber: number,
  arcNumber: number,
): Promise<string | null> {
  void arcNumber;
  try {
    const db = getSupabase();

    const { data: entries } = await db
      .from('beat_usage')
      .select('beat_type,beat_category,chapter_number,cooldown_until')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: false })
      .limit(200);

    if (!entries) return null;

    const beats: BeatEntry[] = entries.map(e => ({
      beatType: e.beat_type,
      category: e.beat_category as BeatCategory,
      chapterNumber: e.chapter_number,
      cooldownUntil: e.cooldown_until || 0,
    }));

    const onCooldown = beats
      .filter(b => b.cooldownUntil > chapterNumber)
      .map(b => b.beatType);
    const cooldownSet = new Set(onCooldown);

    const recentBeats = beats
      .filter(b => b.chapterNumber >= chapterNumber - 5)
      .map(b => `${b.beatType} (ch.${b.chapterNumber})`);

    const recentTypes = new Set(beats.filter(b => b.chapterNumber >= chapterNumber - 5).map(b => b.beatType));
    const allBeatTypes = Object.keys(BEAT_COOLDOWNS);
    const suggested = allBeatTypes
      .filter(b => !cooldownSet.has(b) && !recentTypes.has(b))
      .slice(0, 5);

    const lines: string[] = ['═══ BEAT GUIDELINES ═══'];
    if (suggested.length > 0) {
      lines.push(`Gợi ý beats: ${suggested.join(', ')}`);
    }
    if (cooldownSet.size > 0) {
      lines.push(`TRÁNH (đang cooldown): ${[...cooldownSet].slice(0, 10).join(', ')}`);
    }
    if (recentBeats.length > 0) {
      lines.push(`Gần đây: ${recentBeats.slice(0, 5).join(', ')}`);
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Detect beats in chapter content via regex patterns and record them.
 */
export async function detectAndRecordBeats(
  projectId: string,
  chapterNumber: number,
  arcNumber: number,
  content: string,
): Promise<void> {
  try {
    const detected: Array<{ beatType: string; category: BeatCategory; intensity: number }> = [];

    for (const { type, re } of BEAT_PATTERNS) {
      const matches = content.match(new RegExp(re.source, 'gi'));
      if (matches && matches.length > 0) {
        const category = categorize(type);
        detected.push({
          beatType: type,
          category,
          intensity: Math.min(10, matches.length * 2),
        });
      }
    }

    if (detected.length === 0) return;

    const db = getSupabase();
    const rows = detected.map(d => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      arc_number: arcNumber,
      beat_category: d.category,
      beat_type: d.beatType,
      intensity: d.intensity,
      cooldown_until: chapterNumber + (BEAT_COOLDOWNS[d.beatType] || 10),
    }));

    await db.from('beat_usage').insert(rows);
  } catch {
    // Non-fatal
  }
}
