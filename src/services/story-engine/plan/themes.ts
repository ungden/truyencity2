/**
 * Story Engine v2 — Themes Registry (Phase 27 W3.2)
 *
 * Tracks main + supporting themes that give a 1000-chapter novel coherence.
 * Pre-Phase-27: each chapter wrote whatever the prompt said; thematic
 * coherence ad-hoc. By ch.500 of a "redemption" themed novel, half the
 * chapters were action-focused with no redemption arc reinforcement.
 *
 * Phase 27 W3.2:
 *   1. At master_outline time, AI distills 1-2 main themes + 3-5 supporting
 *      themes from world_description + outline.
 *   2. Each theme has motifs (recurring symbols/objects/situations).
 *   3. Per chapter: track which themes are reinforced (mention motifs OR
 *      demonstrate theme through action).
 *   4. Critic gate: if main theme not reinforced for >30 chapters, flag drift.
 *   5. Architect prompt: shows current themes + suggests motifs to weave in.
 *
 * Đại thần workflow mapping:
 *   "主题/副题" — top web novel authors define main theme at outline time and
 *   reinforce through symbolic motifs every 5-10 chapters. Without this,
 *   novels become "and then this happened" without thematic coherence.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

type ThemeRole = 'main' | 'supporting';

export interface StoryTheme {
  themeRole: ThemeRole;
  themeName: string;
  description: string;
  motifs: string[];
  importance: number;
  reinforcementCount: number;
  lastReinforcedChapter: number | null;
}

interface ThemeGenerationResponse {
  themes?: Array<{
    themeRole?: ThemeRole;
    themeName?: string;
    description?: string;
    motifs?: string[];
    importance?: number;
  }>;
}

// ── Generation (at master_outline time) ──────────────────────────────────────

/**
 * Generate themes for a project. Idempotent — skips if already populated.
 */
export async function generateStoryThemes(
  projectId: string,
  genre: GenreType,
  worldDescription: string,
  storyOutlineSummary: string | null,
  config: GeminiConfig,
): Promise<{ created: number }> {
  try {
    const db = getSupabase();
    const { count } = await db
      .from('story_themes')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if ((count ?? 0) > 0) return { created: 0 };

    const prompt = `Bạn là literary editor cho truyện ${genre}. Distill THEMES (chủ đề) từ world + outline. Themes là sợi chỉ xuyên suốt 1000+ chương — giữ truyện coherent thay vì rời rạc.

WORLD DESCRIPTION:
${worldDescription.slice(0, 4000)}

${storyOutlineSummary ? `STORY OUTLINE:\n${storyOutlineSummary.slice(0, 2000)}\n\n` : ''}Trả về JSON:
{
  "themes": [
    {
      "themeRole": "main",
      "themeName": "<tên ngắn 2-5 từ — vd 'Trưởng thành qua mất mát', 'Quyền lực và lương tâm', 'Truy tìm gốc rễ'>",
      "description": "<2-3 câu giải thích theme này — về cái gì, conflict trung tâm>",
      "motifs": [
        "<symbol/object/situation gợi nhớ theme — vd 'mưa đêm', 'cây cổ thụ', 'tiếng chuông xa'>",
        // 3-6 motifs per theme
      ],
      "importance": <0-100>
    }
    // 1-2 main themes + 3-5 supporting themes = 4-7 total
  ]
}

QUY TẮC:
1. MAIN themes (1-2): drive entire novel. Reinforce mỗi 5-15 chương. Bare minimum.
2. SUPPORTING themes (3-5): texture, sub-plots. Reinforce mỗi 20-40 chương.
3. MOTIFS phải SPECIFIC + SENSORY, không abstract. Vd: KHÔNG "tự do", DÙNG "cánh chim bay qua thành lũy" / "tiếng sáo xa vọng".
4. THEMES phải ĐỘC ĐÁO genre — KHÔNG generic ("good vs evil"). Specific với premise.
5. Genre fit: cultivation/fantasy → growth/sacrifice/cosmic; do-thi → ambition/family/integrity; ngon-tinh → memory/devotion/forgiveness; quan-truong → power/loyalty/idealism.

Generate themes that give this specific story its identity — không có chúng, truyện sẽ trở thành "and then..." chuỗi sự kiện.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.6, maxTokens: 3072 },
      { jsonMode: true, tracking: { projectId, task: 'themes_generation' } },
    );

    if (!res.content) return { created: 0 };

    const parsed = parseJSON<ThemeGenerationResponse>(res.content);
    if (!parsed?.themes?.length) return { created: 0 };

    const validRoles = new Set<ThemeRole>(['main', 'supporting']);
    const rows = parsed.themes
      .filter(t => t.themeName && t.description)
      .slice(0, 8)
      .map(t => ({
        project_id: projectId,
        theme_role: validRoles.has(t.themeRole as ThemeRole) ? t.themeRole : 'supporting',
        theme_name: t.themeName!.slice(0, 100),
        description: t.description!.slice(0, 500),
        motifs: Array.isArray(t.motifs) ? t.motifs.slice(0, 8) : [],
        importance: typeof t.importance === 'number' ? Math.max(0, Math.min(100, t.importance)) : 50,
        reinforcement_count: 0,
        last_reinforced_chapter: null,
      }));

    if (rows.length === 0) return { created: 0 };

    const { error } = await db.from('story_themes').insert(rows);
    if (error) {
      console.warn(`[themes] Insert failed: ${error.message}`);
      return { created: 0 };
    }
    console.log(`[themes] Generated ${rows.length} themes for project ${projectId}.`);
    return { created: rows.length };
  } catch (e) {
    console.warn(`[themes] generateStoryThemes threw:`, e instanceof Error ? e.message : String(e));
    return { created: 0 };
  }
}

// ── Reinforcement detection (post-write) ─────────────────────────────────────

/**
 * Detect which themes are reinforced in chapter content via motif matching +
 * AI confirmation. Bumps reinforcement_count + last_reinforced_chapter.
 *
 * Cheap: motif substring matching (no AI call) for explicit references.
 * If 0 motifs matched and content >5000 chars, fires single AI call to detect
 * implicit reinforcement.
 */
export async function detectThemeReinforcement(
  projectId: string,
  chapterNumber: number,
  content: string,
  config: GeminiConfig,
): Promise<{ reinforced: number }> {
  try {
    const db = getSupabase();
    const { data: themes } = await db
      .from('story_themes')
      .select('id,theme_name,motifs')
      .eq('project_id', projectId);
    if (!themes?.length) return { reinforced: 0 };

    const lowerContent = content.toLowerCase();
    const matched: string[] = [];

    for (const t of themes) {
      const motifs = (t.motifs || []) as string[];
      const hits = motifs.filter(m => m && m.length >= 3 && lowerContent.includes(m.toLowerCase()));
      if (hits.length > 0) matched.push(t.id);
    }

    // If no motif matched, fire single AI to check implicit reinforcement.
    if (matched.length === 0 && content.length >= 3000) {
      try {
        const themeBrief = themes.slice(0, 5).map(t => `- ${t.theme_name}`).join('\n');
        const prompt = `Đọc chương truyện ngắn gọn. Liệt kê tên themes (từ list bên dưới) được reinforce thông qua action / dialog / atmosphere — KHÔNG cần literal motif match.

THEMES:
${themeBrief}

CONTENT (truncated):
${content.slice(0, 6000)}

Trả JSON: { "reinforced": ["theme name 1", "theme name 2"] } — list rỗng nếu không có.`;
        const res = await callGemini(
          prompt,
          { ...config, temperature: 0.2, maxTokens: 512 },
          { jsonMode: true, tracking: { projectId, task: 'theme_reinforcement_detect', chapterNumber } },
        );
        if (res.content) {
          const parsed = parseJSON<{ reinforced?: string[] }>(res.content);
          const namesReinforced = parsed?.reinforced || [];
          for (const t of themes) {
            if (namesReinforced.some(n => n.toLowerCase() === t.theme_name.toLowerCase())) {
              matched.push(t.id);
            }
          }
        }
      } catch {
        // Fallback to motif-only detection.
      }
    }

    if (matched.length === 0) return { reinforced: 0 };

    // Bump reinforcement_count + last_reinforced_chapter for matched themes.
    for (const themeId of matched) {
      // Read current count first (Supabase doesn't easily support raw SQL update).
      const { data: cur } = await db
        .from('story_themes')
        .select('reinforcement_count')
        .eq('id', themeId)
        .maybeSingle();
      const newCount = (cur?.reinforcement_count ?? 0) + 1;
      await db
        .from('story_themes')
        .update({
          reinforcement_count: newCount,
          last_reinforced_chapter: chapterNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', themeId);
    }

    return { reinforced: matched.length };
  } catch (e) {
    console.warn(`[themes] detectThemeReinforcement threw:`, e instanceof Error ? e.message : String(e));
    return { reinforced: 0 };
  }
}

// ── Context block ────────────────────────────────────────────────────────────

/**
 * Format themes for Architect / Critic. Highlights MAIN themes that are
 * approaching drift (last_reinforced > 30 chapters ago).
 */
export async function getThemesContext(
  projectId: string,
  currentChapter: number,
): Promise<string | null> {
  try {
    const db = getSupabase();
    const { data: themes } = await db
      .from('story_themes')
      .select('theme_role,theme_name,description,motifs,importance,reinforcement_count,last_reinforced_chapter')
      .eq('project_id', projectId)
      .order('importance', { ascending: false });

    if (!themes?.length) return null;

    const lines: string[] = ['[THEMES — CHỦ ĐỀ XUYÊN SUỐT, REINFORCE QUA MOTIFS]'];

    for (const t of themes) {
      const isMain = t.theme_role === 'main';
      const lastReinforced = t.last_reinforced_chapter as number | null;
      const drift = lastReinforced ? currentChapter - lastReinforced : null;

      const driftFlag = drift !== null && drift > (isMain ? 30 : 60)
        ? ` ⚠️ DRIFT — chưa reinforce ${drift} chương`
        : '';

      const motifs = (t.motifs || []) as string[];
      const motifList = motifs.slice(0, 4).map(m => `"${m}"`).join(', ');

      lines.push(`\n${isMain ? '🎯 MAIN' : '🔹 SUB'}: ${t.theme_name}${driftFlag}`);
      lines.push(`  ${t.description}`);
      if (motifList) lines.push(`  Motifs: ${motifList}`);
      lines.push(`  Reinforced ${t.reinforcement_count}x (last: ch.${lastReinforced ?? 'never'})`);
    }

    lines.push('\n→ Mỗi chương nên reinforce ≥1 theme qua action/motif/atmosphere. Main theme drift >30ch = trigger Critic flag.');

    return lines.join('\n');
  } catch (e) {
    console.warn(`[themes] getThemesContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
