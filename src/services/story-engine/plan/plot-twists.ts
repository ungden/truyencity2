/**
 * Story Engine v2 — Plot Twists Registry (Phase 27 W3.1)
 *
 * Pre-planned major narrative reveals that span 50-500 chapters. Different
 * from foreshadowing (single hint → single payoff) — twists are major
 * reversals that reshape reader's understanding of preceding chapters.
 *
 * Examples:
 *   - "The mentor was the villain all along" (identity reveal at ch.300)
 *   - "MC's older brother is actually adopted" (origin reveal at ch.450)
 *   - "Demon lord MC defeated at ch.100 was a body double" (death-faked at ch.700)
 *
 * Pre-Phase-27 problem:
 *   - Twists weren't pre-planned — AI either invented them ad-hoc (no setup,
 *     unsatisfying) or never delivered them (boring 1000ch).
 *   - Setup chapters weren't tracked → reveal at ch.300 felt arbitrary because
 *     the hints planted at ch.50, ch.120, ch.180 weren't intentional.
 *
 * Phase 27 W3.1 fix:
 *   1. At master_outline generation, AI plans 5-15 major twists distributed
 *      across volumes with explicit setup chapters + reveal chapters.
 *   2. Persist to plot_twists table.
 *   3. Pre-write: getPlotTwistsContext shows upcoming twists (seeding +
 *      imminent) so Architect plants hints + Critic verifies setup chapters
 *      contain hints.
 *   4. Post-write: updateTwistStatus auto-advances status based on chapter
 *      number (planned → seeding → imminent → revealed).
 *
 * Đại thần workflow mapping:
 *   "反转表" (twist register) — top web novel authors plan major twists at
 *   outline stage. Mèo Béo's Phàm Nhân has 8-12 major twists pre-planned;
 *   Nhĩ Căn's Quỷ Bí has 15+ identity reveals all set up from ch.10.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

type TwistType = 'identity' | 'betrayal' | 'origin' | 'death-faked' | 'power-hidden' | 'world-truth' | 'enemy-true' | 'other';
type TwistStatus = 'planned' | 'seeding' | 'imminent' | 'revealed' | 'abandoned';

export interface PlotTwist {
  twistName: string;
  twistType: TwistType;
  description: string;
  setupChapters: number[];
  revealChapter: number;
  setupHints: string[];
  status: TwistStatus;
  importance: number;
  volumeNumber: number | null;
  notes: string | null;
}

interface TwistGenerationResponse {
  twists?: Array<{
    twistName?: string;
    twistType?: TwistType;
    description?: string;
    setupChapters?: number[];
    revealChapter?: number;
    setupHints?: string[];
    importance?: number;
    volumeNumber?: number;
    notes?: string;
  }>;
}

// ── Generation (at master_outline time) ──────────────────────────────────────

/**
 * Generate the plot-twist registry for a novel. Called once at project setup
 * AFTER master_outline (volumes are known so twists can be distributed).
 * Idempotent — skip if registry already populated.
 */
export async function generatePlotTwists(
  projectId: string,
  genre: GenreType,
  totalChapters: number,
  worldDescription: string,
  masterOutlineSummary: string | null,
  config: GeminiConfig,
): Promise<{ created: number }> {
  try {
    const db = getSupabase();
    const { count } = await db
      .from('plot_twists')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if ((count ?? 0) > 0) {
      // Already generated.
      return { created: 0 };
    }

    // Genre-specific twist count target.
    const targetTwists = genre === 'do-thi' || genre === 'quan-truong' || genre === 'ngon-tinh'
      ? Math.max(5, Math.round(totalChapters / 150))
      : Math.max(8, Math.round(totalChapters / 100));

    const prompt = `Bạn là master plotter cho truyện ${genre}. Thiết kế ${targetTwists} PRE-PLANNED PLOT TWISTS lớn cho truyện ${totalChapters} chương — đây là những reveal quan trọng nhất, khiến reader thốt lên "ồ hóa ra...".

Twists KHÁC foreshadowing nhỏ:
- Foreshadowing = 1 hint → 1 payoff (nhỏ, ~50-100 chương)
- Twists = chuỗi 3-7 setup hints → 1 reveal LỚN reshape narrative (50-500 chương)

WORLD DESCRIPTION:
${worldDescription.slice(0, 4000)}

${masterOutlineSummary ? `MASTER OUTLINE (volumes):\n${masterOutlineSummary.slice(0, 3000)}\n\n` : ''}Trả về JSON:
{
  "twists": [
    {
      "twistName": "<tên twist ngắn — vd 'Sư phụ là kẻ thù thực sự', 'MC là con của Đế Quân ẩn danh'>",
      "twistType": "identity|betrayal|origin|death-faked|power-hidden|world-truth|enemy-true|other",
      "description": "<2-3 câu mô tả twist, BAO GỒM bối cảnh + impact lên MC>",
      "setupChapters": [<chương nào sẽ plant hints — 3-7 chapter numbers, từ early đến late, dồn cụm cuối>],
      "revealChapter": <chương nào REVEAL>,
      "setupHints": [
        "<hint 1: hành động/dialog/object tinh tế ở setupChapters[0]>",
        "<hint 2: ...>",
        // 3-7 hints tương ứng với setupChapters
      ],
      "importance": <0-100; main-arc-driving = 80-100; supporting = 50-70>,
      "volumeNumber": <volume nào reveal happens>,
      "notes": "<dependencies — vd 'depends on Volume 3 climax'>"
    }
  ]
}

QUY TẮC THIẾT KẾ TWISTS:
1. SỐ LƯỢNG: ${targetTwists} twists cho ${totalChapters} chương.
2. PHÂN BỐ: spread đều across volumes. KHÔNG tập trung tất cả ở volume cuối — mỗi volume nên có ≥1 reveal.
3. SETUP CHAINS: mỗi twist có 3-7 setupChapters trải đều từ chương sớm đến chương reveal. Hints phải TINH TẾ (background detail, throwaway dialog) không obvious.
4. ESCALATION: twists volume sau phải BIGGER hoặc reshape twists trước (Russian doll). KHÔNG có twist tier 2 ở volume 8.
5. GENRE FIT: tien-hiep/huyen-huyen có nhiều identity/origin/world-truth twists; do-thi/quan-truong có nhiều betrayal/enemy-true; ngon-tinh có origin/identity.
6. NO REPEAT: KHÔNG có 2 twists cùng twistType ở 2 volume liên tiếp.
7. revealChapter phải nằm trong khoảng [setupChapters[N-1], totalChapters]. Setup chain ≥30 chương trước reveal.

Generate ${targetTwists} twists đặc trưng + memorable. Đại thần dùng twists để khiến reader đọc lại từ đầu sau khi reveal.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.7, maxTokens: 8192 },
      { jsonMode: true, tracking: { projectId, task: 'plot_twists_generation' } },
    );

    if (!res.content) return { created: 0 };

    const parsed = parseJSON<TwistGenerationResponse>(res.content);
    if (!parsed?.twists?.length) return { created: 0 };

    const validTypes = new Set<TwistType>(['identity', 'betrayal', 'origin', 'death-faked', 'power-hidden', 'world-truth', 'enemy-true', 'other']);

    const rows = parsed.twists
      .filter(t => t.twistName && t.description && typeof t.revealChapter === 'number')
      .slice(0, targetTwists * 2) // safety cap
      .map(t => ({
        project_id: projectId,
        twist_name: t.twistName!.slice(0, 200),
        twist_type: validTypes.has(t.twistType as TwistType) ? t.twistType : 'other',
        description: t.description!.slice(0, 1000),
        setup_chapters: Array.isArray(t.setupChapters) ? t.setupChapters.filter(c => typeof c === 'number') : [],
        reveal_chapter: t.revealChapter!,
        setup_hints: Array.isArray(t.setupHints) ? t.setupHints.slice(0, 8) : [],
        status: 'planned' as TwistStatus,
        importance: typeof t.importance === 'number' ? Math.max(0, Math.min(100, t.importance)) : 50,
        volume_number: typeof t.volumeNumber === 'number' ? t.volumeNumber : null,
        notes: t.notes?.slice(0, 500) ?? null,
      }));

    if (rows.length === 0) return { created: 0 };

    const { error } = await db.from('plot_twists').insert(rows);
    if (error) {
      console.warn(`[plot-twists] Insert failed: ${error.message}`);
      return { created: 0 };
    }
    console.log(`[plot-twists] Generated ${rows.length} twists for project ${projectId}.`);
    return { created: rows.length };
  } catch (e) {
    console.warn(`[plot-twists] generatePlotTwists threw:`, e instanceof Error ? e.message : String(e));
    return { created: 0 };
  }
}

// ── Status auto-advance ──────────────────────────────────────────────────────

/**
 * Advance twist status based on current chapter number:
 *   - planned → seeding when first setup_chapter reached
 *   - seeding → imminent when reveal_chapter within 10 chapters
 *   - imminent → revealed when reveal_chapter passed
 *
 * Called from orchestrator post-write. Cheap pure SQL update.
 */
export async function advanceTwistStatuses(projectId: string, chapterNumber: number): Promise<void> {
  try {
    const db = getSupabase();
    const { data: rows } = await db
      .from('plot_twists')
      .select('id,status,setup_chapters,reveal_chapter')
      .eq('project_id', projectId)
      .in('status', ['planned', 'seeding', 'imminent']);
    if (!rows?.length) return;

    const updates: Array<{ id: string; status: TwistStatus }> = [];
    for (const row of rows) {
      const setupChapters = (row.setup_chapters || []) as number[];
      const reveal = row.reveal_chapter as number;
      let newStatus: TwistStatus = row.status as TwistStatus;

      if (row.status === 'planned' && setupChapters.length > 0 && chapterNumber >= setupChapters[0]) {
        newStatus = 'seeding';
      }
      if ((row.status === 'planned' || row.status === 'seeding') && reveal - chapterNumber <= 10 && reveal - chapterNumber >= 0) {
        newStatus = 'imminent';
      }
      if (chapterNumber >= reveal) {
        newStatus = 'revealed';
      }

      if (newStatus !== row.status) {
        updates.push({ id: row.id, status: newStatus });
      }
    }

    for (const u of updates) {
      await db.from('plot_twists').update({ status: u.status, updated_at: new Date().toISOString() }).eq('id', u.id);
    }
  } catch (e) {
    console.warn(`[plot-twists] advanceTwistStatuses threw:`, e instanceof Error ? e.message : String(e));
  }
}

// ── Context block ────────────────────────────────────────────────────────────

/**
 * Format upcoming + active twists for Architect / Critic.
 * Shows: twists in seeding state with setup hints due within 30ch + imminent
 * twists ready to reveal. Hides revealed/abandoned/far-future twists.
 */
export async function getPlotTwistsContext(
  projectId: string,
  currentChapter: number,
  options: { maxChars?: number } = {},
): Promise<string | null> {
  const maxChars = options.maxChars ?? 3000;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('plot_twists')
      .select('twist_name,twist_type,description,setup_chapters,reveal_chapter,setup_hints,status,importance,volume_number')
      .eq('project_id', projectId)
      .in('status', ['seeding', 'imminent'])
      .order('importance', { ascending: false })
      .limit(8);

    if (!data?.length) return null;

    const lines: string[] = ['[PLOT TWISTS — REVEAL DÀI HẠN, SETUP TINH TẾ KHÔNG ĐƯỢC SPOILER]'];

    let totalChars = lines[0].length;
    for (const t of data) {
      const setupChapters = (t.setup_chapters || []) as number[];
      const setupHints = (t.setup_hints || []) as string[];
      const due = setupChapters.find(c => Math.abs(c - currentChapter) <= 3);
      const reveal = t.reveal_chapter as number;
      const distanceToReveal = reveal - currentChapter;

      const block: string[] = [
        `\n🎭 [${t.status}] "${t.twist_name}" (importance ${t.importance})`,
        `   • Type: ${t.twist_type} | Reveal at ch.${reveal} (còn ${distanceToReveal} chương)`,
        `   • Description: ${t.description.slice(0, 200)}`,
      ];
      if (due !== undefined) {
        const hintIdx = setupChapters.indexOf(due);
        if (hintIdx >= 0 && setupHints[hintIdx]) {
          block.push(`   ⚡ HINT TO PLANT TRONG/GẦN CHƯƠNG NÀY: "${setupHints[hintIdx]}"`);
        }
      }
      if (t.status === 'imminent') {
        block.push(`   🔥 IMMINENT — reveal trong vòng 10 chương. Build tension nếu chương này không phải reveal chapter.`);
      }
      const blockText = block.join('\n');
      if (totalChars + blockText.length > maxChars) {
        lines.push(`  ... (${data.length - lines.length + 1} more twists truncated)`);
        break;
      }
      lines.push(blockText);
      totalChars += blockText.length;
    }

    lines.push('\n→ Plant setup hints TINH TẾ. CẤM spoiler twist trong dialog/narration. Imminent twist gần reveal_chapter → tăng tension nhưng KHÔNG reveal sớm.');

    return lines.join('\n');
  } catch (e) {
    console.warn(`[plot-twists] getPlotTwistsContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
