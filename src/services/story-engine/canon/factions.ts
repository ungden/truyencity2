/**
 * Story Engine v2 — Factions Registry (Phase 27 W2.5)
 *
 * Tracks sects, clans, corporations, political parties, underground groups
 * across the novel. Each faction has power level + alliances + rivalries.
 *
 * Pre-Phase-27 problem:
 *   - AI could flip a sect from "MC's enemy" to "MC's ally" with no narrative
 *     setup at ch.500.
 *   - AI invents factions: "Tổ chức Hắc Long từ phía bắc" appears with no
 *     prior mention.
 *   - Power balance loses coherence: faction A "dominant" at ch.100 is "weak"
 *     at ch.300 with no power-shift event.
 *
 * Phase 27 W2.5 fix:
 *   1. Post-write: AI extracts faction-relevant events (intro, alliance change,
 *      rivalry change, power shift, faction fall)
 *   2. Persist to factions table — upsert by faction_name within project
 *   3. Pre-write: getFactionsContext shows top-N active factions with current
 *      alliances + rivalries
 *
 * Đại thần workflow mapping:
 *   "Faction registry" (势力档案) — top web novel authors maintain a faction
 *   chart with explicit power levels + alliance graph. Without it, political
 *   plots break in 1000-chapter novels.
 *
 * Note: this CANON layer holds the registry; state changes (power shifts) are
 * recorded in the same table (not separate state file) since faction metadata
 * IS the running state. The "canon" framing means factions can't be invented
 * mid-story without an extraction event.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

type FactionType = 'sect' | 'clan' | 'corp' | 'political' | 'underground' | 'guild' | 'other';
type FactionStatus = 'active' | 'declining' | 'fallen' | 'hidden';

export interface Faction {
  factionName: string;
  factionType: FactionType;
  powerLevel: number;
  description: string;
  alliances: string[];
  rivalries: string[];
  status: FactionStatus;
  firstSeenChapter: number;
  lastActiveChapter: number;
  importance: number;
}

interface FactionAIResponse {
  factions?: Array<{
    factionName?: string;
    factionType?: FactionType;
    powerLevel?: number;
    description?: string;
    alliances?: string[];
    rivalries?: string[];
    status?: FactionStatus;
    importance?: number;
    eventInChapter?: string;
  }>;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract faction events from chapter content via AI; upsert to factions table.
 * Cadence: every 3 AI writes (factions evolve slowly).
 */
export async function extractAndUpdateFactions(
  projectId: string,
  chapterNumber: number,
  content: string,
  characters: string[],
  config: GeminiConfig,
): Promise<{ created: number; updated: number }> {
  try {
    const db = getSupabase();

    // Load existing factions to inform the model.
    const { data: existing } = await db
      .from('factions')
      .select('faction_name,faction_type,power_level,status,description,alliances,rivalries,importance')
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .limit(20);

    const existingBrief = (existing || []).length > 0
      ? (existing || []).map(f =>
          `- ${f.faction_name} (${f.faction_type}, power=${f.power_level}, status=${f.status}); allies=[${(f.alliances || []).join(',')}]; rivals=[${(f.rivalries || []).join(',')}]`,
        ).join('\n')
      : '(chưa có faction nào được tracked)';

    const prompt = `Bạn là faction-tracker cho truyện dài kỳ. Trích các SỰ KIỆN PHE PHÁI trong chương — phe mới xuất hiện, alliance/rivalry thay đổi, power shift, phe sụp đổ.

CHARACTERS XUẤT HIỆN: ${characters.slice(0, 12).join(', ')}

EXISTING FACTIONS (KHÔNG được lặp tên trừ khi UPDATE chính phe đó):
${existingBrief}

CHƯƠNG ${chapterNumber}:
${content.slice(0, 8000)}

Trả về JSON:
{
  "factions": [
    {
      "factionName": "<tên cụ thể, KHÔNG generic ('phe ác', 'tổ chức bí mật')>",
      "factionType": "sect|clan|corp|political|underground|guild|other",
      "powerLevel": <0-100, ước lượng so với các phe khác>,
      "description": "<1-2 câu mô tả phe — values/methods/identity>",
      "alliances": ["faction A", "faction B"],
      "rivalries": ["faction X"],
      "status": "active|declining|fallen|hidden",
      "importance": <0-100; main antagonist/MC's faction = 80-100; minor = 20-40>,
      "eventInChapter": "<sự kiện cụ thể chương này — vd 'phe X công kích phe Y', 'phe Z sụp đổ', 'liên minh X-Y tan vỡ'>"
    }
  ]
}

QUY TẮC:
- factionName phải LÀ TÊN RIÊNG cụ thể: "Tông Môn Vạn Hoa Cung" không phải "phe phái".
- KHÔNG bịa phe không có trong chương.
- Nếu chương không có faction event quan trọng → trả "factions": [].
- Nếu chương UPDATE phe đã có (vd thay đổi power_level), giữ nguyên factionName cũ.
- KHÔNG ghi event nhỏ (vd 1 thành viên phe đến gặp MC) — chỉ ghi power shifts, alliance/rivalry changes, faction emergence/fall.
- Tối đa 5 events per chapter.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.2, maxTokens: 2048 },
      { jsonMode: true, tracking: { projectId, task: 'factions_extraction', chapterNumber } },
    );

    if (!res.content) return { created: 0, updated: 0 };

    const parsed = parseJSON<FactionAIResponse>(res.content);
    if (!parsed?.factions?.length) return { created: 0, updated: 0 };

    let created = 0;
    let updated = 0;
    const validTypes = new Set<FactionType>(['sect', 'clan', 'corp', 'political', 'underground', 'guild', 'other']);
    const validStatuses = new Set<FactionStatus>(['active', 'declining', 'fallen', 'hidden']);

    const existingNames = new Set((existing || []).map(f => f.faction_name.toLowerCase()));

    for (const f of parsed.factions.slice(0, 5)) {
      if (!f.factionName || f.factionName.length < 3) continue;
      const factionType: FactionType = validTypes.has(f.factionType as FactionType) ? f.factionType as FactionType : 'other';
      const status: FactionStatus = validStatuses.has(f.status as FactionStatus) ? f.status as FactionStatus : 'active';

      const isUpdate = existingNames.has(f.factionName.toLowerCase());
      const row = {
        project_id: projectId,
        faction_name: f.factionName,
        faction_type: factionType,
        power_level: typeof f.powerLevel === 'number' ? Math.max(0, Math.min(100, f.powerLevel)) : 50,
        description: f.description?.slice(0, 500) || null,
        alliances: Array.isArray(f.alliances) ? f.alliances.slice(0, 8) : [],
        rivalries: Array.isArray(f.rivalries) ? f.rivalries.slice(0, 8) : [],
        status,
        first_seen_chapter: chapterNumber,
        last_active_chapter: chapterNumber,
        importance: typeof f.importance === 'number' ? Math.max(0, Math.min(100, f.importance)) : 50,
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from('factions').upsert(row, { onConflict: 'project_id,faction_name' });
      if (error) {
        console.warn(`[factions] Upsert failed for "${f.factionName}": ${error.message}`);
      } else if (isUpdate) {
        updated++;
      } else {
        created++;
      }
    }

    if (created > 0 || updated > 0) {
      console.log(`[factions] Ch.${chapterNumber}: created ${created}, updated ${updated}.`);
    }
    return { created, updated };
  } catch (e) {
    console.warn(`[factions] extractAndUpdateFactions threw:`, e instanceof Error ? e.message : String(e));
    return { created: 0, updated: 0 };
  }
}

/**
 * Format top-N active factions as a context block for Architect / Critic.
 * Sorted by importance desc, filtered to active/declining/hidden (skip fallen
 * unless explicitly requested).
 */
export async function getFactionsContext(
  projectId: string,
  currentChapter: number,
  options: { limit?: number; maxChars?: number } = {},
): Promise<string | null> {
  void currentChapter;
  const limit = options.limit ?? 8;
  const maxChars = options.maxChars ?? 3500;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('factions')
      .select('faction_name,faction_type,power_level,status,description,alliances,rivalries,importance,last_active_chapter')
      .eq('project_id', projectId)
      .in('status', ['active', 'declining', 'hidden'])
      .order('importance', { ascending: false })
      .limit(limit);

    if (!data?.length) return null;

    const lines: string[] = ['[FACTIONS — PHE PHÁI ĐANG HOẠT ĐỘNG, CẤM bịa phe mới hoặc flip alliance không có lý do]'];

    let totalChars = lines[0].length;
    for (const f of data) {
      const allies = (f.alliances || []).slice(0, 4).join(', ');
      const rivals = (f.rivalries || []).slice(0, 4).join(', ');
      const lineParts = [
        `🏛️ ${f.faction_name} [${f.faction_type}, power=${f.power_level}, ${f.status}]`,
        f.description ? `   ${f.description.slice(0, 200)}` : null,
        allies ? `   Allies: ${allies}` : null,
        rivals ? `   Rivals: ${rivals}` : null,
        `   Last active: ch.${f.last_active_chapter ?? '?'}`,
      ].filter(Boolean);
      const block = lineParts.join('\n');
      if (totalChars + block.length > maxChars) {
        lines.push(`  ... (${data.length - lines.length + 1} more truncated)`);
        break;
      }
      lines.push(block);
      totalChars += block.length;
    }

    lines.push('\n→ KHÔNG bịa phe mới chưa được intro. Alliance/rivalry chỉ thay đổi qua narrative event rõ ràng.');

    return lines.join('\n');
  } catch (e) {
    console.warn(`[factions] getFactionsContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
