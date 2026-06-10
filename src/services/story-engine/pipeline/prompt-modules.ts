/**
 * Quality Overhaul 4.1 — modular prompt registry (flag-gated v1).
 *
 * Problem: ARCHITECT_SYSTEM is ~25K tokens; instruction-following decays for
 * rules buried mid-prompt — exactly where the template-ending bans and
 * repetition rules live. LLMs weight instructions CLOSEST to the generation
 * point most heavily.
 *
 * v1 scope (deliberately conservative — prompt behavior shifts are the
 * riskiest change class in this engine):
 *  - A formal PromptModule registry with placement semantics. The engine
 *    already composes genre suffix / voice hint / process guide ad-hoc; new
 *    modules should be registered here instead of inlined.
 *  - The highest-value module shipped: `hard-bans-recap`, appended at the
 *    VERY END of the Architect dynamic suffix (closest to generation),
 *    restating the most-violated hard rules in ~700 chars.
 *  - Flag: style_directives.modular_prompts (default OFF). Enable per-novel,
 *    A/B 30 chapters against the template-ending canary hit rate, then fleet.
 *
 * The full ARCHITECT_SYSTEM carve (core ≤10K + conditional modules) is
 * follow-up work gated on this A/B showing positive signal.
 */

import type { GenreType } from '../types';

export interface ModuleCtx {
  genre?: GenreType;
  subGenres?: string[];
  chapterNumber: number;
  totalPlanned?: number;
  /** Pacing mood for this chapter when known (breathing/climax/...) */
  beatMood?: string;
  flags?: {
    foreknowledge?: boolean;
    concealment?: boolean;
    vietnamSetting?: boolean;
    nonCombat?: boolean;
  };
}

export interface PromptModule {
  id: string;
  /**
   * 'system' — cacheable system prompt segment (novel-stable);
   * 'static' — cacheable user-prompt prefix segment;
   * 'dynamic_end' — appended at the END of the dynamic suffix, closest to
   *                 the generation point (highest instruction weight).
   */
  placement: 'system' | 'static' | 'dynamic_end';
  applies(ctx: ModuleCtx): boolean;
  text(ctx: ModuleCtx): string;
}

// ── Modules ──────────────────────────────────────────────────────────────────

/**
 * The most-violated hard rules, restated last. Audit evidence: template
 * endings/openings slip through ~10-15% despite 7 detection layers because
 * the bans sit mid-prompt in a 25K-token system block.
 */
const hardBansRecap: PromptModule = {
  id: 'hard-bans-recap',
  placement: 'dynamic_end',
  applies: () => true,
  text: (ctx) => `
═══ RECAP CUỐI — 5 LUẬT CỨNG HAY BỊ VI PHẠM NHẤT (đọc lại TRƯỚC KHI trả JSON) ═══
1. CLIFFHANGER = SỰ KIỆN/QUYẾT ĐỊNH CỤ THỂ. CẤM TUYỆT ĐỐI: "ván cờ/trò chơi/cuộc chiến mới bắt đầu", "hắn là X đây là thế giới của hắn", "sẵn sàng đối mặt tất cả", mọi tuyên ngôn vĩ mô trừu tượng.
2. SCENE 1 MỞ BẰNG ACTION: MC đang LÀM gì cụ thể trong 100 từ đầu. CẤM mở bằng tả thiết lập tĩnh + MC bất động + suy ngẫm.
3. MỖI SCENE PHẢI CÓ goal + conflict + resolution CỤ THỂ (tên người, vật, số) — không placeholder, không abstract.
4. ${ctx.chapterNumber > 1 ? 'Scene 1 TIẾP DIỄN cliffhanger chương trước — không restart, không tóm tắt lại, không reset quan hệ nhân vật.' : 'Chương 1: golden finger ACTIVE từ đầu, hook là CƠ HỘI (không phải thảm họa), wow đầu tiên ≤50% chương.'}
5. ≥2 dopamine peaks, peak đầu ≤50% chương; setup ≤30%, payoff ≥40%.${ctx.flags?.nonCombat ? '\n6. GENRE PHI-COMBAT: xung đột giải quyết qua kênh thương mại/chính trị/xã hội — KHÔNG đánh nhau vật lý, KHÔNG gangster.' : ''}
═══════════════════════════════════════════`,
};

const REGISTRY: PromptModule[] = [hardBansRecap];

// ── Assembly ─────────────────────────────────────────────────────────────────

/** Compose all applicable module texts for a placement slot. */
export function assemblePromptModules(
  placement: PromptModule['placement'],
  ctx: ModuleCtx,
): string {
  return REGISTRY
    .filter(m => m.placement === placement && m.applies(ctx))
    .map(m => m.text(ctx))
    .join('\n');
}

/** Registry introspection — used by tests. */
export function listPromptModules(): ReadonlyArray<Pick<PromptModule, 'id' | 'placement'>> {
  return REGISTRY.map(({ id, placement }) => ({ id, placement }));
}
