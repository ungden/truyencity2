/**
 * Story Engine v2 — Worldbuilding Canon (Phase 27 W3.3)
 *
 * Comprehensive worldbuilding doc — cosmology, history, cultures, regions,
 * economy. Generated ONCE at project setup. Persisted as
 * ai_story_projects.worldbuilding_canon JSONB.
 *
 * Different from world_description (high-level premise blob):
 *   - world_description: 1-2 page narrative premise hand-crafted at spawn
 *   - worldbuilding_canon: structured, queryable, AI-generated bible
 *
 * Đại thần workflow mapping:
 *   "设定集" — top web novel authors maintain ~200-page setting bibles
 *   covering every aspect of the world. Phàm Nhân Tu Tiên has detailed
 *   cosmology (3 realms, 7 sects per realm), history (Đại Năng war eras),
 *   cultures (sect customs, taboos), economy (linh thạch tiers + trade).
 *
 * Without comprehensive canon, AI at ch.500 invents inconsistent world rules:
 *   - "Giáo phái Thiên Long thờ Đạo Tâm Tổ" (ch.50) → "thờ Tử Vũ Tiên Tôn" (ch.500)
 *   - "1 lượng linh thạch = 100 ngân lượng" (ch.30) → "10 ngân lượng" (ch.450)
 *   - "Đại lục Cửu Châu có 9 quốc" (ch.100) → "12 quốc" (ch.600)
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorldbuildingCanon {
  /** How the universe works at fundamental level. */
  cosmology: string;
  /** Historical eras with key events. */
  history: Array<{
    age: string;
    description: string;
    keyEvents: string[];
  }>;
  /** Cultures + customs + taboos + religions. */
  cultures: Array<{
    name: string;
    customs: string;
    taboos: string[];
    religion?: string;
    socialStructure?: string;
  }>;
  /** Geographic regions. */
  regions: Array<{
    name: string;
    description: string;
    climate?: string;
    dominantFactions?: string[];
    characteristics: string;
  }>;
  /** Economy + currency. */
  economy: {
    currency: string;
    currencyTiers?: string[];
    tradeRoutes?: string;
    keyResources?: string[];
  };
  /** Daily life details — what regular people eat, wear, do. */
  dailyLife?: string;
  /** Common violations to flag in Critic. */
  commonViolations: string[];
}

// ── Generation ───────────────────────────────────────────────────────────────

/**
 * Generate worldbuilding canon at setup. One-time AI call, idempotent.
 */
export async function generateWorldbuildingCanon(
  projectId: string,
  genre: GenreType,
  worldDescription: string,
  storyOutlineSummary: string | null,
  config: GeminiConfig,
): Promise<WorldbuildingCanon | null> {
  try {
    const db = getSupabase();
    const { data: existing } = await db
      .from('ai_story_projects')
      .select('worldbuilding_canon')
      .eq('id', projectId)
      .maybeSingle();
    if ((existing as { worldbuilding_canon?: unknown } | null)?.worldbuilding_canon) {
      return (existing as { worldbuilding_canon: WorldbuildingCanon }).worldbuilding_canon;
    }

    const prompt = `Bạn là worldbuilding architect cho truyện ${genre}. Thiết kế WORLDBUILDING CANON toàn diện — sẽ là bible cố định trong toàn bộ 1000+ chương.

WORLD DESCRIPTION (premise gốc):
${worldDescription.slice(0, 5000)}

${storyOutlineSummary ? `STORY OUTLINE:\n${storyOutlineSummary.slice(0, 2000)}\n\n` : ''}Trả về JSON:
{
  "cosmology": "<2-3 paragraph mô tả vũ trụ vận hành thế nào — dimensions, metaphysics, fundamental laws. Cụ thể với genre: cultivation = đạo lý ngũ hành thiên địa; do-thi = bối cảnh kinh tế VN/TQ hiện đại; ngon-tinh = social structure; linh-di = supernatural rules.>",
  "history": [
    {
      "age": "<tên age — vd 'Thượng Cổ Thời Đại', 'Triều Đại Đại Tấn', 'Era 1985-2010'>",
      "description": "<2-3 câu mô tả era>",
      "keyEvents": ["<event 1>", "<event 2>", "<event 3>"]
    }
    // 3-5 historical ages
  ],
  "cultures": [
    {
      "name": "<tên văn hóa — vd 'Tu Tiên Giới', 'Phàm Tục Thế Tục', 'Vùng Đông Bắc'>",
      "customs": "<2-3 câu mô tả phong tục>",
      "taboos": ["<taboo 1>", "<taboo 2>"],
      "religion": "<tôn giáo/tín ngưỡng nếu có>",
      "socialStructure": "<vd 'gia trưởng', 'phong kiến', 'meritocratic'>"
    }
    // 2-4 cultures
  ],
  "regions": [
    {
      "name": "<tên vùng — vd 'Đại Châu Cửu Hoa', 'Quận Phú Mỹ Hưng', 'Đảo Bắc Cực'>",
      "description": "<1-2 câu mô tả vùng>",
      "climate": "<khí hậu>",
      "dominantFactions": ["<faction 1>", "<faction 2>"],
      "characteristics": "<đặc trưng vùng — vd 'giàu linh khí', 'quan trường', 'biên giới hỗn loạn'>"
    }
    // 4-8 regions covering MC's likely travel + key locations
  ],
  "economy": {
    "currency": "<đơn vị tiền chính — vd 'Linh Thạch (hạ/trung/thượng phẩm)', 'Đồng Việt Nam', 'Vàng + Bạc + Đồng'>",
    "currencyTiers": ["<tier 1>", "<tier 2>"],
    "tradeRoutes": "<mô tả mạng lưới thương mại>",
    "keyResources": ["<resource 1>", "<resource 2>"]
  },
  "dailyLife": "<1-2 paragraph mô tả cuộc sống thường nhật của người dân — họ ăn gì, mặc gì, làm gì hàng ngày>",
  "commonViolations": [
    "<lỗi AI thường mắc khi viết, để Critic flag>",
    // vd: "Linh thạch giá trị thay đổi tùy chương", "Vùng A khí hậu khác nhau giữa các chương", "Văn hóa Đại Tấn nhầm với Đại Đường"
  ]
}

QUY TẮC:
1. CONSISTENCY: mọi chi tiết PHẢI fit với genre + world_description gốc. KHÔNG mâu thuẫn.
2. DEPTH: cosmology + history phải có depth — KHÔNG chỉ "thế giới có ma pháp". Cụ thể về ai/gì/khi nào/tại sao.
3. CULTURES diverse: ít nhất 2 văn hóa khác biệt. Genre cultivation = sect culture vs phàm tục; do-thi = quê vs thành phố; ngon-tinh = MC's family vs love interest's family.
4. REGIONS PHỦ KÍN MC's journey: nếu MC sẽ đi từ "ngôi làng" đến "Đế Đô" qua 1000 chương, list tất cả major regions.
5. ECONOMY có TIER cụ thể: KHÔNG abstract "tiền". Cụ thể số đơn vị + tỷ giá tương đối.
6. commonViolations[] dùng cho Critic gate — list những lỗi inconsistency dễ mắc.

Đại thần Phàm Nhân Tu Tiên có 200-page setting bible. Hãy thiết kế comprehensive canon cho truyện này.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 12288 },
      { jsonMode: true, tracking: { projectId, task: 'worldbuilding_canon_generation' } },
    );

    if (!res.content) return null;

    const parsed = parseJSON<WorldbuildingCanon>(res.content);
    if (!parsed?.cosmology) return null;

    const { error } = await db
      .from('ai_story_projects')
      .update({ worldbuilding_canon: parsed as unknown as Record<string, unknown> })
      .eq('id', projectId);
    if (error) {
      console.warn(`[worldbuilding] Persist failed: ${error.message}`);
    }

    console.log(`[worldbuilding] Generated canon for project ${projectId}: ${parsed.history?.length ?? 0} eras, ${parsed.cultures?.length ?? 0} cultures, ${parsed.regions?.length ?? 0} regions.`);
    return parsed;
  } catch (e) {
    console.warn(`[worldbuilding] generateWorldbuildingCanon threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Context block ────────────────────────────────────────────────────────────

/**
 * Format the canon as a compact context block for Architect / Critic.
 * Cap at ~6000 chars — full canon may be 10K+ chars total.
 */
export async function getWorldbuildingCanonContext(
  projectId: string,
  options: { maxChars?: number } = {},
): Promise<string | null> {
  const maxChars = options.maxChars ?? 6000;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('ai_story_projects')
      .select('worldbuilding_canon')
      .eq('id', projectId)
      .maybeSingle();
    if (!(data as { worldbuilding_canon?: WorldbuildingCanon } | null)?.worldbuilding_canon) return null;

    const canon = (data as { worldbuilding_canon: WorldbuildingCanon }).worldbuilding_canon;
    const lines: string[] = ['[WORLDBUILDING CANON — BIBLE BẤT KHẢ XÂM PHẠM]'];

    if (canon.cosmology) {
      lines.push('\n🌌 COSMOLOGY:');
      lines.push(canon.cosmology.slice(0, 1500));
    }

    if (canon.history?.length) {
      lines.push('\n📜 HISTORY:');
      for (const h of canon.history.slice(0, 5)) {
        lines.push(`  • ${h.age}: ${h.description.slice(0, 200)}`);
        if (h.keyEvents?.length) {
          lines.push(`    Key events: ${h.keyEvents.slice(0, 3).join(' | ')}`);
        }
      }
    }

    if (canon.cultures?.length) {
      lines.push('\n🏛️ CULTURES:');
      for (const c of canon.cultures.slice(0, 4)) {
        lines.push(`  • ${c.name}: ${c.customs.slice(0, 150)}`);
        if (c.taboos?.length) lines.push(`    Taboos: ${c.taboos.slice(0, 3).join(', ')}`);
        if (c.religion) lines.push(`    Religion: ${c.religion}`);
      }
    }

    if (canon.regions?.length) {
      lines.push('\n🗺️ REGIONS:');
      for (const r of canon.regions.slice(0, 8)) {
        lines.push(`  • ${r.name}: ${r.description.slice(0, 150)}`);
        if (r.dominantFactions?.length) lines.push(`    Factions: ${r.dominantFactions.slice(0, 3).join(', ')}`);
      }
    }

    if (canon.economy) {
      lines.push('\n💰 ECONOMY:');
      lines.push(`  Currency: ${canon.economy.currency}`);
      if (canon.economy.currencyTiers?.length) lines.push(`  Tiers: ${canon.economy.currencyTiers.join(' < ')}`);
      if (canon.economy.keyResources?.length) lines.push(`  Resources: ${canon.economy.keyResources.slice(0, 4).join(', ')}`);
    }

    if (canon.commonViolations?.length) {
      lines.push('\n🚫 COMMON VIOLATIONS (Critic check):');
      for (const v of canon.commonViolations.slice(0, 6)) {
        lines.push(`  ✗ ${v.slice(0, 200)}`);
      }
    }

    let block = lines.join('\n');
    if (block.length > maxChars) {
      block = block.slice(0, maxChars - 50) + '\n... [truncated]';
    }
    return block;
  } catch (e) {
    console.warn(`[worldbuilding] getWorldbuildingCanonContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
