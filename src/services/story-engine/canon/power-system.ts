/**
 * Story Engine v2 — Power System Canon (Phase 27 W2.4)
 *
 * Comprehensive RULES document for the world's power system. Generated ONCE at
 * project setup, persisted as `ai_story_projects.power_system_canon` JSONB.
 *
 * Different from state/mc-power-state.ts:
 *   - mc-power-state.ts tracks MC's CURRENT level per chapter
 *   - canon/power-system.ts holds the RULES governing everyone (ladder, breakthrough
 *     conditions, ceiling, side effects, item tiers)
 *
 * Đại thần workflow mapping:
 *   "修炼体系/力量体系" — top web novel authors design comprehensive power-system
 *   rules at the OUTLINING stage (vd Phàm Nhân Tu Tiên has a 50-page bible
 *   covering Luyện Khí 1-13 → Trúc Cơ → Kết Đan → ... with breakthrough conditions
 *   for each cảnh giới). Without this, AI at ch.500 can have characters skip
 *   cảnh giới or regress without explanation.
 *
 * For non-cultivation genres (do-thi, ngon-tinh, quan-truong), this canon
 * captures the relevant "power" axis: business scale (revenue tiers), political
 * influence ladder, social rank progression.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PowerSystemCanon {
  /** Genre this canon was generated for. */
  genre: string;
  /** Ordered ladder of cảnh giới / power tiers (low → high). */
  ladder: Array<{
    tierIndex: number;
    name: string;
    description: string;
    requirements: string;
    ceiling: string; // What's max possible at this tier?
    typicalDuration: string; // How long to stay at this tier?
  }>;
  /** Breakthrough conditions between tiers. */
  breakthroughs: Array<{
    from: string;
    to: string;
    conditions: string;
    sideEffects: string;
    failureMode: string; // What happens if breakthrough fails?
  }>;
  /** Item / artifact tier system. */
  itemTiers?: Array<{ tierName: string; description: string; powerExample: string }>;
  /** Core rules of how power works (1-3 paragraphs, narrative). */
  coreRules: string;
  /** Common violations to flag (vd "MC skips cảnh giới without insight"). */
  commonViolations: string[];
  /** Genre-specific notes (e.g. "do-thi: power = business scale, not combat"). */
  genreNotes?: string;
}

// ── Generation ───────────────────────────────────────────────────────────────

/**
 * Generate the power-system canon at project setup. One-time AI call.
 */
export async function generatePowerSystemCanon(
  projectId: string,
  genre: GenreType,
  worldDescription: string,
  storyOutline: string | null,
  config: GeminiConfig,
): Promise<PowerSystemCanon | null> {
  try {
    const db = getSupabase();

    // Skip if already generated.
    const { data: existing } = await db
      .from('ai_story_projects')
      .select('power_system_canon')
      .eq('id', projectId)
      .maybeSingle();
    if (existing?.power_system_canon) {
      return existing.power_system_canon as PowerSystemCanon;
    }

    const prompt = `Bạn là worldbuilding architect cho truyện ${genre}. Thiết kế HỆ THỐNG SỨC MẠNH (power system) toàn diện cho thế giới truyện này — sẽ là CANON cố định trong toàn bộ 1000+ chương.

WORLD DESCRIPTION:
${worldDescription.slice(0, 4000)}

${storyOutline ? `STORY OUTLINE:\n${storyOutline.slice(0, 2000)}\n\n` : ''}Trả về JSON:
{
  "genre": "${genre}",
  "ladder": [
    {
      "tierIndex": 1,
      "name": "<tên tier — vd 'Luyện Khí Sơ Kỳ' (cultivation), 'Khởi Nghiệp Cá Thể' (do-thi), 'Tổ Trưởng' (quan-truong)>",
      "description": "<mô tả 1-2 câu>",
      "requirements": "<điều kiện đạt tier — vd 'thông mạch + linh khí 100' / 'doanh thu 500tr/tháng'>",
      "ceiling": "<max khả năng tại tier — vd 'sát thương vật lý cấp đan dược' / 'quản lý 10-20 nhân viên'>",
      "typicalDuration": "<thường mất bao lâu — vd '2-5 năm tu luyện', '6 tháng-1 năm'>"
    }
    // SỐ LƯỢNG TIERS: 6-10 cho cultivation/fantasy. 4-6 cho do-thi/business. 5-8 cho quan-truong.
  ],
  "breakthroughs": [
    {
      "from": "<tên tier>",
      "to": "<tên tier kế>",
      "conditions": "<điều kiện đột phá cụ thể — vd 'tích đủ linh khí + ngộ ra Đạo Tâm'>",
      "sideEffects": "<hậu quả/side-effect — vd 'tổn hao 30% kinh mạch nếu ép', 'mệt mỏi 7 ngày'>",
      "failureMode": "<hậu quả nếu đột phá thất bại — vd 'tẩu hỏa nhập ma', 'tu vi giảm 1 cấp'>"
    }
  ],
  "itemTiers": [
    {
      "tierName": "<vd 'Phàm Khí / Linh Khí / Pháp Khí / Bảo Vật / Thần Khí' hoặc 'Cấp đầu vào / Cấp doanh nghiệp / Cấp tập đoàn'>",
      "description": "<mô tả tier vật phẩm>",
      "powerExample": "<ví dụ vật phẩm cụ thể>"
    }
  ],
  "coreRules": "<2-3 đoạn paragraph mô tả CORE RULES của hệ thống — không thể vi phạm. Vd cultivation: 'Tu luyện theo trình tự, không thể nhảy cóc cảnh giới. Mỗi cảnh giới phải tích đủ linh khí + ngộ Đạo Tâm. Đột phá ép → tẩu hỏa nhập ma không thể quay lại.'>",
  "commonViolations": [
    "<những lỗi AI thường mắc khi viết — để Critic flag>",
    // vd: "MC skip cảnh giới mà không có lý do narrative", "MC dùng skill cấp cao hơn tier hiện tại", "Đột phá liên tục không có cooldown"
  ],
  "genreNotes": "<lưu ý đặc thù genre — vd 'do-thi: power = business scale + network. KHÔNG phải combat. KHÔNG có cảnh giới.'>"
}

QUY TẮC THIẾT KẾ:
1. Hệ thống PHẢI cohesive với genre. Cultivation/fantasy → cảnh giới ladder rõ. Do-thi/business → revenue/scale tier. Quan-truong → chính trị rank.
2. Mỗi tier có CEILING rõ — KHÔNG để tier 1 có thể giết tier 5 dễ dàng.
3. Breakthroughs có ĐIỀU KIỆN cụ thể — KHÔNG handwave "MC ngộ ra rồi đột phá".
4. CommonViolations → list những lỗi AI hay mắc khi viết, để Critic catch.
5. Genre-specific: NGON-TINH có thể không có power ladder formal — describe 'social standing' / 'emotional bond level' ladder thay thế. LINH-DI có thể là 'ma lực level / curse intensity' ladder.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.4, maxTokens: 8192 },
      { jsonMode: true, tracking: { projectId, task: 'power_system_canon_generation' } },
    );

    if (!res.content) {
      console.warn(`[power-system] Empty response for project ${projectId}`);
      return null;
    }

    const parsed = parseJSON<PowerSystemCanon>(res.content);
    if (!parsed?.ladder?.length) {
      console.warn(`[power-system] Invalid canon shape for project ${projectId}`);
      return null;
    }

    // Persist.
    const { error } = await db
      .from('ai_story_projects')
      .update({ power_system_canon: parsed as unknown as Record<string, unknown> })
      .eq('id', projectId);
    if (error) {
      console.warn(`[power-system] Persist failed: ${error.message}`);
    }

    console.log(`[power-system] Generated canon for project ${projectId}: ${parsed.ladder.length} tiers, ${parsed.breakthroughs?.length ?? 0} breakthroughs, ${parsed.commonViolations?.length ?? 0} common violations.`);
    return parsed;
  } catch (e) {
    console.warn(`[power-system] generatePowerSystemCanon threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Context Block ────────────────────────────────────────────────────────────

/**
 * Format the canon as a compact context block for Architect / Critic.
 * Emits ladder + breakthrough conditions + commonViolations (used by Critic
 * for detection rules).
 */
export async function getPowerSystemCanonContext(
  projectId: string,
  options: { maxChars?: number } = {},
): Promise<string | null> {
  const maxChars = options.maxChars ?? 5000;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('ai_story_projects')
      .select('power_system_canon')
      .eq('id', projectId)
      .maybeSingle();
    if (!data?.power_system_canon) return null;

    const canon = data.power_system_canon as PowerSystemCanon;
    const lines: string[] = ['[POWER SYSTEM CANON — QUY TẮC SỨC MẠNH BẤT KHẢ XÂM PHẠM]'];

    if (canon.ladder?.length) {
      lines.push('\n📊 LADDER (low → high):');
      for (const t of canon.ladder.slice(0, 12)) {
        lines.push(`  ${t.tierIndex}. ${t.name}: ${t.description.slice(0, 100)}`);
        lines.push(`     • Requirements: ${t.requirements.slice(0, 100)}`);
        lines.push(`     • Ceiling: ${t.ceiling.slice(0, 100)}`);
      }
    }

    if (canon.breakthroughs?.length) {
      lines.push('\n⚡ BREAKTHROUGH CONDITIONS:');
      for (const b of canon.breakthroughs.slice(0, 8)) {
        lines.push(`  ${b.from} → ${b.to}: ${b.conditions.slice(0, 120)}`);
        if (b.sideEffects) lines.push(`     ⚠️ Side effects: ${b.sideEffects.slice(0, 100)}`);
      }
    }

    if (canon.coreRules) {
      lines.push(`\n📜 CORE RULES (KHÔNG VI PHẠM):\n${canon.coreRules.slice(0, 1500)}`);
    }

    if (canon.commonViolations?.length) {
      lines.push('\n🚫 COMMON VIOLATIONS (Critic check + reject):');
      for (const v of canon.commonViolations.slice(0, 8)) {
        lines.push(`  ✗ ${v.slice(0, 200)}`);
      }
    }

    if (canon.genreNotes) {
      lines.push(`\n📝 GENRE NOTES: ${canon.genreNotes.slice(0, 400)}`);
    }

    let block = lines.join('\n');
    if (block.length > maxChars) {
      block = block.slice(0, maxChars - 50) + '\n... [truncated]';
    }
    return block;
  } catch (e) {
    console.warn(`[power-system] getPowerSystemCanonContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
