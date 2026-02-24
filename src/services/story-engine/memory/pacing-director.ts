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
  | 'transition';      // Chuyển cảnh, di chuyển, setup arc mới

export interface ChapterPacing {
  chapterNumber: number;
  mood: ChapterMood;
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

NGUYÊN TẮC NHỊP TRUYỆN ĐẲNG CẤP:
1. KHÔNG viết 2 chương climax liên tiếp — phải có "hơi thở" giữa các cao trào
2. Mở arc bằng 2-3 chương buildup/setup (CHẬM, gây tò mò)
3. Giữa arc có "calm before storm" — chương yên tĩnh trước bão tố
4. Climax nên kéo dài 2-3 chương liên tục (không chỉ 1)
5. Kết arc bằng aftermath + transition sang arc mới

BẮT BUỘC TRONG MỖI ARC (${chapterCount} chương):
- Ít nhất 1 chương villain_focus (hiểu kẻ thù suy nghĩ gì)
- Ít nhất 1 chương calm_before_storm (tình cảm, hài hước nhẹ)
- Ít nhất 1 chương revelation (bí mật được hé lộ)
- Ít nhất 2 chương climax (cao trào chính)
- Tối đa 3 chương training liên tiếp

MOOD TYPES:
- buildup: Nhịp chậm, worldbuilding, introduce elements. Cliffhanger: mild
- rising: Tension tăng dần, hé lộ. Cliffhanger: strong
- calm_before_storm: Yên tĩnh, nội tâm, tình cảm, slice of life. Cliffhanger: none/mild
- climax: Action/deal/revelation cực đại. Cliffhanger: extreme
- aftermath: Hậu quả, tổng kết, seed arc mới. Cliffhanger: mild
- training: MC rèn luyện/explore, side character development. Cliffhanger: mild
- villain_focus: POV phản diện, mưu kế, backstory villain. Cliffhanger: strong
- comedic_break: Hài hước, nhẹ nhàng, Gap Moe. Cliffhanger: none/mild
- revelation: Bí mật lớn, twist. Cliffhanger: extreme
- transition: Chuyển địa điểm, gặp nhân vật mới. Cliffhanger: mild

Trả về JSON:
{
  "chapters": [
    {
      "chapterNumber": ${arcStartChapter},
      "mood": "buildup",
      "intensityLevel": 3,
      "suggestedStructure": "Mô tả ngắn cấu trúc chương (VD: 'Giới thiệu địa điểm mới + gặp NPC bí ẩn + hint trouble')",
      "dopamineRequired": false,
      "cliffhangerIntensity": "mild"
    }
  ],
  "requiredVariety": ["Must have 1 villain_focus", "Must have 1 calm_before_storm"]
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.4,
    maxTokens: 4096,
    systemPrompt: 'Bạn là Pacing Director cho webnovel dài kỳ. Thiết kế nhịp truyện đa dạng, không lặp lại.',
  }, { jsonMode: true });

  const parsed = parseJSON<PacingBlueprint>(res.content);
  if (!parsed?.chapters?.length) return;

  await db.from('arc_pacing_blueprints').upsert({
    project_id: projectId,
    arc_number: arcNumber,
    blueprint: parsed,
  }, { onConflict: 'project_id,arc_number' });
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
  };

  parts.push(moodGuides[chapterPacing.mood] || `Mood: ${chapterPacing.mood}`);
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
