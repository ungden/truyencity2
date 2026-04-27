/**
 * Story Engine v2 — Pacing Director
 *
 * Generates per-arc pacing blueprints that control chapter mood,
 * intensity, and type variety. Prevents the "every chapter same structure"
 * problem by enforcing rhythmic variation.
 *
 * DB table: arc_pacing_blueprints
 *   project_id UUID, arc_number INT, blueprint JSONB,
 *   created_at TIMESTAMPTZ
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export type ChapterMood =
  | 'buildup'          // Chậm, worldbuilding, setup
  | 'rising'           // Tension leo thang, hé lộ
  | 'calm_before_storm'// Yên tĩnh, nội tâm, tình cảm
  | 'climax'           // Chiến đấu/deal lớn/revelation
  | 'aftermath'        // Hậu quả + seed mới
  | 'training'         // Rèn luyện, phát triển, exploration
  | 'villain_focus'    // POV/focus phản diện
  | 'comedic_break'    // Chương hài, nhẹ nhàng
  | 'revelation'       // Bí mật lớn được hé lộ
  | 'transition'       // Chuyển cảnh, di chuyển, setup arc mới
  | 'breathing';       // Anti-self-torture: small wins, casual competence, peaceful growth

export interface ChapterPacing {
  chapterNumber: number;
  mood: ChapterMood;
  /** Optional secondary mood for hybrid chapters (e.g., climax + comedic_break = epic comedy fight).
   * Modern hits 2024-2026 (《谁让他修仙的！》phản set comedy) blend moods within a single chapter. */
  secondaryMood?: ChapterMood;
  intensityLevel: number;  // 1-10
  suggestedStructure: string;
  dopamineRequired: boolean;
  cliffhangerIntensity: 'none' | 'mild' | 'strong' | 'extreme';
}

export interface PacingBlueprint {
  arcNumber: number;
  chapters: ChapterPacing[];
  requiredVariety: string[]; // e.g., "must have 1 villain_focus chapter"
}

// ── Generate Pacing Blueprint (called with arc plan) ─────────────────────────

export async function generatePacingBlueprint(
  projectId: string,
  arcNumber: number,
  arcStartChapter: number,
  arcEndChapter: number,
  genre: GenreType,
  arcPlanText: string | undefined,
  config: GeminiConfig,
): Promise<void> {
  const db = getSupabase();

  // Check if blueprint already exists
  const { data: existing } = await db
    .from('arc_pacing_blueprints')
    .select('arc_number')
    .eq('project_id', projectId)
    .eq('arc_number', arcNumber)
    .maybeSingle();

  if (existing) return;

  const chapterCount = arcEndChapter - arcStartChapter + 1;

  const prompt = `Bạn là Pacing Director chuyên thiết kế nhịp truyện cho webnovel dài kỳ.

Arc ${arcNumber}: Chương ${arcStartChapter}-${arcEndChapter} (${chapterCount} chương)
Thể loại: ${genre}
${arcPlanText ? `Kế hoạch arc: ${arcPlanText.slice(0, 2000)}` : ''}

NHIỆM VỤ: Thiết kế nhịp cho từng chương trong arc này.

NGUYÊN TẮC NHỊP TRUYỆN ĐẲNG CẤP (CHỐNG TỰ NGƯỢC, TƯ DUY THEO GIAI ĐOẠN):
1. 1 SỰ KIỆN ngược có thể trải 1-3 chương — climax/villain_focus được phép 2 chương liên tiếp NẾU thuộc cùng 1 sự kiện (ví dụ: chương 1 MC bị truy đuổi → chương 2 MC chiến đấu lật ngược).
2. CẤM 3 chương climax/villain_focus liên tiếp — đây là dấu hiệu kéo dài lê thê.
3. Sau khi 1 SỰ KIỆN ngược kết thúc (climax → aftermath) → BẮT BUỘC ≥1-3 chương breathing/calm_before_storm/comedic_break/training trước khi mở sự kiện ngược mới.
4. CẤM 2 GIAI ĐOẠN ngược back-to-back: ví dụ "climax(A) → aftermath(A) → climax(B)" thiếu breathing giữa.
5. Mở arc bằng 2-3 chương buildup/setup (CHẬM, gây tò mò)
6. Giữa arc có ≥2 "calm before storm" hoặc "breathing" — chương yên tĩnh, MC small wins/casual competence
7. Kết arc bằng aftermath + transition sang arc mới
8. Tối thiểu 60% chương trong arc là breathing/calm_before_storm/comedic_break/training (chương "phát triển êm" / Sảng Văn flow). MC mở rộng sự nghiệp, recognition, smooth wins LÀ TRỤC CHÍNH — climax/villain_focus là gia vị, KHÔNG phải xương sống.

BẮT BUỘC TRONG MỖI ARC (${chapterCount} chương):
- Tối đa 1 chương villain_focus (cho phép 0 nếu arc thuộc loại "scale-up / kinh doanh / luyện công" mà arc plan không yêu cầu villain).
- Tối đa 2 chương climax (cho phép 0 nếu arc smooth-flow). Ngoại lệ cho thể loại non-combat (do-thi/ngon-tinh/quan-truong): arc có thể 0 villain_focus + 0 climax — climax thay bằng "deal lớn ký kết" / "recognition đỉnh cao" / "milestone đạt được" (vẫn dán nhãn climax mood nhưng nội dung không vũ lực).
- Ít nhất 3 chương calm_before_storm hoặc breathing (Sảng Văn dominant).
- Ít nhất 1 chương comedic_break.
- ≥1 chương revelation TÙY CHỌN (chỉ thêm nếu arc plan yêu cầu — KHÔNG ép mỗi arc).
- Tối đa 4 chương training/scale-up liên tiếp (cho phép arc thuần cultivation/scale-up).
- CẤM 3 chương climax/villain_focus liên tiếp.
- Sau aftermath của 1 sự kiện → BẮT BUỘC ≥1-3 chương breathing trước khi mở sự kiện ngược mới.

MOOD TYPES:
- buildup: Nhịp chậm, worldbuilding, introduce elements. Cliffhanger: mild
- rising: Tension tăng dần, hé lộ. Cliffhanger: strong
- calm_before_storm: Yên tĩnh, nội tâm, tình cảm, slice of life. Cliffhanger: none/mild
- climax: Action/deal/revelation cực đại. Cliffhanger: strong (KHÔNG extreme — tránh gây kìm nén)
- aftermath: Hậu quả, tổng kết, seed arc mới. Cliffhanger: mild
- training: MC rèn luyện/explore, side character development. Cliffhanger: mild
- villain_focus: POV phản diện, mưu kế, backstory villain. Cliffhanger: strong
- comedic_break: Hài hước, nhẹ nhàng, Gap Moe. Cliffhanger: none/mild
- revelation: Bí mật lớn, twist. Cliffhanger: strong
- transition: Chuyển địa điểm, gặp nhân vật mới. Cliffhanger: mild
- breathing: Anti-self-torture chapter — MC small wins, casual competence, peaceful growth, recognition. Cliffhanger: none/mild

MOOD BLENDING (TÙY CHỌN — modern 2024-2026):
- Một số chương có thể blend 2 mood (primary + secondary) để tạo hybrid scene. Hits 2024 như 《谁让他修仙的！》phản set comedy có "climax + comedic_break" cùng chương.
- Cách dùng: set "secondaryMood" ở chương cần blend. VD: climax(primary) + comedic_break(secondary) = trận chiến epic nhưng có khoảnh khắc hài.
- KHÔNG blend mọi chương — chỉ ~10-20% chương có blend, còn lại single-mood chuẩn.

Trả về JSON:
{
  "chapters": [
    {
      "chapterNumber": ${arcStartChapter},
      "mood": "buildup",
      "secondaryMood": null,
      "intensityLevel": 3,
      "suggestedStructure": "Mô tả ngắn cấu trúc chương (VD: 'Giới thiệu địa điểm mới + gặp NPC bí ẩn + hint trouble')",
      "dopamineRequired": false,
      "cliffhangerIntensity": "mild"
    }
  ],
  "requiredVariety": ["Max 1 villain_focus", "≥2 calm_before_storm or breathing", "≥1 comedic_break", "No 2 climax/villain_focus in a row"]
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.4,
    maxTokens: 4096,
    systemPrompt: 'Bạn là Pacing Director cho webnovel dài kỳ. Thiết kế nhịp truyện đa dạng, không lặp lại.',
  }, { jsonMode: true, tracking: { projectId, task: 'pacing', chapterNumber: arcStartChapter } });

  const parsed = parseJSON<PacingBlueprint>(res.content);
  if (!parsed?.chapters?.length) return;

  const { error: upsertErr } = await db.from('arc_pacing_blueprints').upsert({
    project_id: projectId,
    arc_number: arcNumber,
    blueprint: parsed,
  }, { onConflict: 'project_id,arc_number' });
  if (upsertErr) console.warn('[PacingDirector] Failed to save pacing blueprint: ' + upsertErr.message);
}

// ── Get Chapter Pacing (pre-write injection) ─────────────────────────────────

export async function getChapterPacingContext(
  projectId: string,
  chapterNumber: number,
): Promise<string | null> {
  const arcNumber = Math.ceil(chapterNumber / 20);
  const db = getSupabase();

  const { data } = await db
    .from('arc_pacing_blueprints')
    .select('blueprint')
    .eq('project_id', projectId)
    .eq('arc_number', arcNumber)
    .maybeSingle();

  if (!data?.blueprint) return null;

  const blueprint = data.blueprint as PacingBlueprint;
  const chapterPacing = blueprint.chapters?.find(c => c.chapterNumber === chapterNumber);

  if (!chapterPacing) return null;

  const parts: string[] = ['═══ NHỊP TRUYỆN CHƯƠNG NÀY ═══'];

  // Anti-self-torture adjacency check: forbid 3+ consecutive high-tension moods
  // (1 event có thể span 2 chương climax/villain_focus liên tiếp, nhưng 3 chương là dấu hiệu lê thê)
  const HIGH_TENSION_MOODS: ChapterMood[] = ['climax', 'villain_focus'];
  const last2Moods = getRecentMoods(blueprint, chapterNumber, 2);
  if (
    last2Moods.length === 2 &&
    last2Moods.every(m => HIGH_TENSION_MOODS.includes(m)) &&
    HIGH_TENSION_MOODS.includes(chapterPacing.mood)
  ) {
    parts.push(`🚫 EVENT QUÁ DÀI: 2 chương trước đã là high-tension (${last2Moods.join(' → ')}) — chương này KHÔNG được tiếp tục. PHẢI chuyển sang aftermath/calm_before_storm/breathing/comedic_break để giai đoạn ngược kết thúc.`);
  }

  // Cross-chapter emotional arc enforcement: detect consecutive same-mood chapters
  const recentMoods = getRecentMoods(blueprint, chapterNumber, 3);
  if (recentMoods.length >= 2) {
    const allSame = recentMoods.every(m => m === recentMoods[0]);
    if (allSame) {
      const moodName = recentMoods[0];
      parts.push(`⚠️ CẢNH BÁO NHỊP ĐƠN ĐIỆU: ${recentMoods.length} chương gần nhất đều mood "${moodName}".`);
      parts.push(`→ Chương này PHẢI tạo CONTRAST cảm xúc rõ ràng — đổi nhịp, đổi cường độ.`);
      if (moodName === 'climax') {
        parts.push(`→ Sau ${recentMoods.length} chương climax: CẦN chương aftermath/calm hoặc comedic_break.`);
      } else if (moodName === 'training') {
        parts.push(`→ Sau ${recentMoods.length} chương training: CẦN event, revelation, hoặc conflict mới.`);
      } else if (moodName === 'buildup') {
        parts.push(`→ Sau ${recentMoods.length} chương buildup: Người đọc đang mất kiên nhẫn — CẦN rising hoặc micro-climax.`);
      }
    }

    // Also warn if intensity has been flat (within ±1) for 3+ chapters
    const recentIntensities = getRecentIntensities(blueprint, chapterNumber, 3);
    if (recentIntensities.length >= 3) {
      const min = Math.min(...recentIntensities);
      const max = Math.max(...recentIntensities);
      if (max - min <= 1) {
        parts.push(`⚠️ CƯỜNG ĐỘ PHẲNG: ${recentIntensities.length} chương gần nhất cường độ ${min}-${max}/10. CẦN biến động lớn hơn.`);
      }
    }
  }

  const moodGuides: Record<ChapterMood, string> = {
    buildup: '🏗 BUILDUP — Nhịp CHẬM. Tập trung worldbuilding, setup. KHÔNG cần dopamine lớn. Gây TÒ MÒ, không gây kích thích.',
    rising: '📈 RISING — Tension LEO THANG. Hé lộ thông tin mới. Stakes bắt đầu rõ ràng. Nhịp tăng dần.',
    calm_before_storm: '🌅 CALM BEFORE STORM — Yên tĩnh, nội tâm, tình cảm. Chương "hơi thở" trước bão tố. Slice of life, hài hước nhẹ, phát triển quan hệ.',
    climax: '⚡ CLIMAX — Action cực đại / Deal lớn / Revelation. Nhịp NHANH, câu ngắn, tension tối đa. Đây là chương người đọc chờ đợi.',
    aftermath: '🔄 AFTERMATH — Hậu quả và tổng kết. MC xử lý kết quả, phản ứng các bên. Seed arc mới.',
    training: '🎯 TRAINING — MC rèn luyện, explore, side character phát triển. Nhịp vừa, focus growth.',
    villain_focus: '🦹 VILLAIN FOCUS — POV/focus phản diện. Cho thấy kẻ thù suy nghĩ, mưu kế, backstory. Tạo chiều sâu cho villain.',
    comedic_break: '😂 COMEDIC BREAK — Hài hước là chính. Gap Moe, Não Bổ, tình huống ngớ ngẩn. Nhẹ nhàng, thư giãn.',
    revelation: '💡 REVELATION — Bí mật lớn được hé lộ. Plot twist, thay đổi nhận thức. Khoảnh khắc "WOW".',
    transition: '🚶 TRANSITION — Chuyển cảnh, di chuyển, gặp nhân vật mới. Setup cho phần tiếp theo.',
    breathing: '🌿 BREATHING — Anti-self-torture chapter. MC small wins / casual competence / peaceful growth / recognition. KHÔNG có setback nghiêm trọng. Cliffhanger: none/mild.',
  };

  parts.push(moodGuides[chapterPacing.mood] || `Mood: ${chapterPacing.mood}`);
  if (chapterPacing.secondaryMood) {
    parts.push(`🎭 MOOD BLEND (secondary): ${moodGuides[chapterPacing.secondaryMood] || chapterPacing.secondaryMood}`);
    parts.push('→ Đây là chương HYBRID — kết hợp primary + secondary mood. VD: climax + comedic_break = trận chiến epic có khoảnh khắc hài. Đan xen, KHÔNG chia khúc tách rời.');
  }
  parts.push(`Cường độ: ${chapterPacing.intensityLevel}/10`);
  parts.push(`Gợi ý cấu trúc: ${chapterPacing.suggestedStructure}`);

  if (chapterPacing.dopamineRequired) {
    parts.push('💊 DOPAMINE BẮT BUỘC — Chương này CẦN ít nhất 1 khoảnh khắc sảng khoái');
  } else {
    parts.push('💊 Dopamine: KHÔNG bắt buộc. Tập trung vào mood và setup.');
  }

  const cliffGuides: Record<string, string> = {
    none: 'Kết chương: Kết thúc tự nhiên, không cần hook mạnh',
    mild: 'Kết chương: Hook nhẹ — gợi tò mò, mong chờ',
    strong: 'Kết chương: Cliffhanger RÕ — tình huống căng thẳng, muốn biết kết quả',
    extreme: 'Kết chương: Cliffhanger CỰC MẠNH — twist sốc, nguy hiểm, revelation',
  };
  parts.push(cliffGuides[chapterPacing.cliffhangerIntensity] || '');

  return parts.join('\n');
}

// ── Cross-chapter Mood Helpers ───────────────────────────────────────────────

/**
 * Compute mood-adjusted target word count. Modern hyperpop pacing (2024-2026)
 * favors variable chapter length: dense climax/villain_focus, lean breathing/comedic.
 * baseTarget = project.target_chapter_length (default 2500-3000).
 */
export function adjustWordCountForMood(baseTarget: number, mood: ChapterMood): number {
  // baseTarget = 2800 (AI write target). Output → split thành 2 reader chapters via orchestrator.
  // Per-mood multipliers scale AI write length, not reader chapter length.
  const factors: Record<ChapterMood, number> = {
    climax: 1.20,           // Dense, action-packed → slightly longer
    villain_focus: 1.10,    // Villain POV needs depth
    revelation: 1.15,       // Reveal needs build-up + reaction
    rising: 1.05,           // Tension build
    aftermath: 1.00,        // Standard
    buildup: 1.00,          // Setup full-length (Sảng Văn buildup là MC mở rộng)
    training: 1.00,         // Skill development full-length (training arcs là core Sảng Văn)
    villain_focus_unused: 1.00,
    transition: 0.95,
    calm_before_storm: 1.00,// Sảng Văn equal-priority — không truncate
    comedic_break: 1.00,    // Comedy chapters đầy đủ, không bị giảm
    breathing: 1.00,        // Sảng Văn flow — breathing chapter is the MAIN content, not filler
  } as Record<ChapterMood, number>;

  const factor = factors[mood] ?? 1.00;
  const adjusted = Math.round(baseTarget * factor);
  // Clamp to reasonable range
  return Math.max(1500, Math.min(adjusted, 4500));
}

/**
 * Look up the mood for a given chapter from the blueprint. Returns null if no blueprint.
 */
export async function getChapterMood(projectId: string, chapterNumber: number): Promise<ChapterMood | null> {
  const arcNumber = Math.ceil(chapterNumber / 20);
  const db = getSupabase();
  const { data } = await db
    .from('arc_pacing_blueprints')
    .select('blueprint')
    .eq('project_id', projectId)
    .eq('arc_number', arcNumber)
    .maybeSingle();
  if (!data?.blueprint) return null;
  const bp = data.blueprint as PacingBlueprint;
  return bp.chapters?.find(c => c.chapterNumber === chapterNumber)?.mood ?? null;
}

/**
 * Get moods of the N chapters immediately before chapterNumber from the blueprint.
 * Returns moods in chronological order (oldest first).
 */
function getRecentMoods(blueprint: PacingBlueprint, chapterNumber: number, count: number): ChapterMood[] {
  if (!blueprint.chapters?.length) return [];
  return blueprint.chapters
    .filter(c => c.chapterNumber < chapterNumber && c.chapterNumber >= chapterNumber - count)
    .sort((a, b) => a.chapterNumber - b.chapterNumber)
    .map(c => c.mood);
}

/**
 * Get intensity levels of the N chapters immediately before chapterNumber.
 */
function getRecentIntensities(blueprint: PacingBlueprint, chapterNumber: number, count: number): number[] {
  if (!blueprint.chapters?.length) return [];
  return blueprint.chapters
    .filter(c => c.chapterNumber < chapterNumber && c.chapterNumber >= chapterNumber - count)
    .sort((a, b) => a.chapterNumber - b.chapterNumber)
    .map(c => c.intensityLevel);
}
