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
      "name": "<tên tier kèm các tiểu cảnh giới rõ ràng — vd 'Luyện Khí Sơ Kỳ / Trung Kỳ / Hậu Kỳ / Viên Mãn'>",
      "description": "<mô tả chi tiết biến đổi cơ thể/năng lượng và giới hạn sức mạnh chiến đấu của cảnh giới này (ví dụ: phạm vi khống chế, tốc độ di chuyển, lực phá hoại)>",
      "requirements": "<điều kiện/nguyên liệu cần để tích lũy tu vi hoặc đạt tới đỉnh phong của tier này>",
      "ceiling": "<max khả năng tại tier — vd 'Không thể chịu được một đòn của Trúc Cơ kỳ, tuổi thọ tối đa 120 năm'>",
      "typicalDuration": "<thời gian tích lũy trung bình cần thiết — vd '5-10 năm khổ tu'>"
    }
    // SỐ LƯỢNG TIERS: 6-10 cho cultivation/fantasy. 4-6 cho do-thi/business. 5-8 cho quan-truong.
  ],
  "breakthroughs": [
    {
      "from": "<tên tier>",
      "to": "<tên tier kế>",
      "conditions": "<điều kiện đột phá cực kỳ cụ thể — đan dược trợ giúp bắt buộc (ví dụ: Trúc Cơ Đan để bảo hộ kinh mạch), yêu cầu ngộ tính tinh thần (đạo tâm, ý cảnh), linh địa thích hợp (linh mạch cấp cao)>",
      "sideEffects": "<hậu quả/tổn thương cơ thể khi cố gắng đột phá cưỡng ép>",
      "failureMode": "<hậu quả thảm khốc nếu đột phá thất bại — tẩu hỏa nhập ma, đan điền vỡ nát, tu vi tụt lùi về cảnh giới trước, hoặc tử vong>"
    }
  ],
  "itemTiers": [
    {
      "tierName": "<vd 'Pháp Khí / Bảo Khí / Linh Bảo / Thông Thiên Linh Bảo' (phù hợp với cảnh giới nào sử dụng)>",
      "description": "<mô tả phân cấp bảo vật, đan dược, trận pháp tương ứng với cảnh giới tu luyện>",
      "powerExample": "<ví dụ cụ thể về uy lực vật phẩm>"
    }
  ],
  "coreRules": "<2-3 đoạn paragraph mô tả CORE RULES của hệ thống — không thể vi phạm. Vd cultivation: 'Cảnh giới thâm nghiêm, chênh lệch thực lực giữa các đại cảnh giới là tuyệt đối (người Trúc Cơ hoàn toàn nghiền nát Luyện Khí). Không thể nhảy cóc cảnh giới. Đột phá bắt buộc phải có đan dược phụ trợ phù hợp và ngộ đạo tâm, không có chuyện tự nhiên đột phá.'>",
  "commonViolations": [
    "<những lỗi AI thường mắc khi viết — để Critic flag>",
    // vd: "MC đột phá liên tục không có thời gian cooldown", "MC skip cảnh giới mà không giải thích đan dược/linh địa sử dụng", "Pháp bảo cấp cao được sử dụng bởi tu sĩ cấp thấp mà không gặp phản phệ"
  ],
  "genreNotes": "<lưu ý đặc thù genre — vd 'do-thi: power = business scale + network. KHÔNG phải combat. KHÔNG có cảnh giới.'>"
}

QUY TẮC THIẾT KẾ:
1. Hệ thống PHẢI cohesive với genre. Cultivation/fantasy → cảnh giới ladder rõ. Do-thi/business → revenue/scale tier. Quan-truong → chính trị rank.
2. Mỗi tier có CEILING rõ — KHÔNG để tier thấp đánh bại dễ dàng tier cao hơn.
3. Breakthroughs có ĐIỀU KIỆN và RỦI RO cụ thể — yêu cầu các yếu tố đan dược trợ giúp và ngộ tính để tạo tính căng thẳng kịch tính chuẩn truyện mạng Trung Quốc.
4. Tỷ lệ phân cấp vật phẩm/đan dược phải tương ứng khớp nối hoàn hảo với cảnh giới nhân vật.
5. CommonViolations -> list những lỗi AI hay mắc khi viết, để Critic catch.
6. Genre-specific: NGON-TINH có thể mô tả 'social standing' / 'influence' ladder. LINH-DI có thể là 'curse intensity' / 'supernatural resistance' ladder.`;

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
