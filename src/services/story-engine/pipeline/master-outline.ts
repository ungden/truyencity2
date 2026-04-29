import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

export interface MasterOutline {
  mainPlotline: string;
  finalBossOrGoal: string;
  worldMapProgression: string[];
  majorArcs: Array<{
    arcName: string;
    startChapter: number;
    endChapter: number;
    description: string;
    keyMilestone: string;
  }>;
}

// Genre-aware framing for master outline. Urban/business genres use proactive
// goal-driven framing (achievement, market scale) instead of villain-first.
const PROACTIVE_GENRES: GenreType[] = ['do-thi', 'quan-truong', 'ngon-tinh'];

// Combat-leaning vocabulary that LEAKS into non-combat genres — flag and sanitize.
const COMBAT_LEAK_PATTERNS = [
  /trùm cuối/i, /kẻ thù cuối/i, /đại chiến/i, /đánh bại.*kẻ thù/i,
  /giết.*kẻ thù/i, /chinh phạt/i, /chiến tranh/i, /huyết chiến/i,
  /diệt.*ma/i, /phong sát/i, /trảm.*ma/i, /thí kiếm/i,
];

const POWER_LEAK_PATTERNS = [
  /đột phá.*cảnh giới/i, /thu phục.*dị/i, /tu vi/i, /pháp bảo/i,
  /linh khí/i, /đan dược/i, /nguyên anh/i, /kim đan/i,
];

/**
 * Validate master outline doesn't leak combat/power tropes into non-combat genres.
 * Returns list of issues (empty = clean).
 */
function validateMasterOutlineForGenre(outline: MasterOutline, genre: GenreType): string[] {
  if (!PROACTIVE_GENRES.includes(genre)) return []; // combat genres can have these

  const issues: string[] = [];
  const allText = JSON.stringify(outline).toLowerCase();

  for (const pat of COMBAT_LEAK_PATTERNS) {
    if (pat.test(allText)) issues.push(`Combat leak: ${pat.source}`);
  }
  for (const pat of POWER_LEAK_PATTERNS) {
    if (pat.test(allText)) issues.push(`Power-system leak: ${pat.source}`);
  }
  return issues;
}

/**
 * Sanitize final goal: replace combat villain framing with proactive milestone.
 */
function sanitizeFinalGoal(goal: string, genre: GenreType): string {
  if (!goal) return goal;
  let s = goal;
  // Replace common combat phrasing with milestone-style
  s = s.replace(/trùm cuối/gi, 'cột mốc tối thượng');
  s = s.replace(/kẻ thù cuối cùng/gi, 'mục tiêu cuối cùng');
  s = s.replace(/đánh bại/gi, 'vượt qua');
  s = s.replace(/diệt/gi, 'hoàn thành');
  if (genre === 'do-thi') {
    s = s.replace(/giết/gi, 'cạnh tranh thắng');
  } else if (genre === 'ngon-tinh') {
    s = s.replace(/giết/gi, 'vượt qua');
  } else if (genre === 'quan-truong') {
    s = s.replace(/giết/gi, 'hạ bệ');
  }
  return s;
}

/**
 * Sanitize milestone: remove combat keywords, replace with achievement-style.
 */
function sanitizeMilestone(milestone: string, genre: GenreType): string {
  if (!milestone) return milestone;
  let s = milestone;
  s = s.replace(/đột phá.*cảnh giới/gi, 'đạt cấp độ mới');
  s = s.replace(/thu phục.*dị/gi, 'có được tài nguyên quan trọng');
  s = s.replace(/giết kẻ thù/gi, 'vượt qua đối thủ');
  if (genre === 'do-thi') {
    s = s.replace(/đánh bại/gi, 'vượt mặt');
  }
  return s;
}

export async function generateMasterOutline(
  projectId: string,
  title: string,
  genre: GenreType,
  synopsis: string,
  totalPlannedChapters: number,
  config: GeminiConfig
): Promise<MasterOutline | null> {
  const isProactive = PROACTIVE_GENRES.includes(genre);

  const goalGuidance = isProactive
    ? `MỤC TIÊU TỐI THƯỢỢNG cho thể loại proactive (do-thi/kinh-doanh/quan-truong/ngon-tinh): tập trung vào MILESTONE/ACHIEVEMENT của MC (xây đế chế kinh doanh đa quốc gia, leo lên đỉnh chính trường, đạt được người yêu trọn vẹn). KHÔNG ép define "kẻ thù cuối cùng" — đối thủ chỉ là COMPETITOR phản ứng theo từng giai đoạn, KHÔNG phải antagonist xuyên suốt.`
    : `MỤC TIÊU TỐI THƯỢỢNG cho thể loại fantasy/wuxia/horror: có thể là kẻ thù cuối cùng (Trùm cuối) HOẶC cảnh giới tối cao cần đạt được. Trùm cuối được giấu mặt từ đầu, rải rác manh mối.`;

  const finalGoalExample = isProactive
    ? `"Cột mốc tối thượng cuối truyện (VD: Tập đoàn đa quốc gia top 100 thế giới, Vị trí lãnh đạo cao nhất ngành, Cuộc sống gia đình hạnh phúc với người yêu)"`
    : `"Kẻ thù cuối cùng hoặc Cảnh giới tối cao cần đạt được ở cuối truyện (Được giấu mặt từ đầu nhưng rải rác manh mối)"`;

  const worldMapExample = isProactive
    ? `["Khởi nghiệp địa phương", "Mở rộng cấp tỉnh/thành", "Vươn ra cấp quốc gia", "Thâm nhập thị trường khu vực", "Đa quốc gia / dẫn đầu toàn cầu"]`
    : `["Tân thủ thôn", "Học viện", "Kinh thành", "Vực ngoại", "Thần giới"]`;

  const milestoneExample = isProactive
    ? `"Thành tựu cụ thể MC đạt được cuối Arc (VD: Mở chuỗi 50 cửa hàng, Doanh thu 100 tỷ, Ký được hợp đồng quốc tế đầu tiên, Trở thành CEO trẻ nhất ngành)"`
    : `"Thành tựu MC đạt được cuối Arc (Đột phá cảnh giới, Thu phục dị hỏa, Giết kẻ thù A)"`;

  const proactiveRule = isProactive
    ? `\n4. PROACTIVE NARRATIVE: Mỗi Arc tập trung vào HÀNH ĐỘNG + KẾT QUẢ của MC (xây dựng, đạt được, mở rộng), KHÔNG dựa vào "kẻ thù xuất hiện đe dọa MC". Đối thủ kinh doanh/chính trị chỉ REACT sau khi MC đã có thành tựu cụ thể, KHÔNG chủ động hãm hại MC trước.`
    : '';

  const prompt = `Bạn là Trưởng Biên Tập (Chief Editor) chuyên quy hoạch Đại cương truyện dài kỳ (Master Outline) cho một bộ Webnovel Trung Quốc.

Nhiệm vụ của bạn là quy hoạch lộ trình tổng thể cho bộ truyện: "${title}"
Thể loại: ${genre}
Độ dài dự kiến: ${totalPlannedChapters} chương
Tóm tắt ý tưởng gốc (Synopsis): ${synopsis}

${goalGuidance}

Hãy lập ra Master Outline bao gồm mục tiêu tối thượng, Cột mốc tối thượng, Lộ trình di chuyển (Bản đồ) và chia nhỏ thành các Đại Cốt Truyện (Major Arcs) từ chương 1 đến chương ${totalPlannedChapters}.

Trả về ĐÚNG định dạng JSON sau:
{
  "mainPlotline": "Mục tiêu tối thượng xuyên suốt truyện của MC (VD: Xây đế chế kinh doanh, Phục thù, Thành Thần, Tìm người thân)",
  "finalBossOrGoal": ${finalGoalExample},
  "worldMapProgression": ${worldMapExample},
  "majorArcs": [
    {
      "arcName": "Tên Arc lớn (VD: Khởi nghiệp tại quê nhà / Quật khởi tại gia tộc)",
      "startChapter": 1,
      "endChapter": 100,
      "description": "Nội dung chính của Arc này",
      "keyMilestone": ${milestoneExample}
    }
  ]
}

Quy tắc:
1. Độ dài mỗi Arc từ 50-200 chương tùy tổng số chương. Cộng dồn endChapter của Arc cuối cùng phải bằng ${totalPlannedChapters}.
2. Lộ trình bản đồ (worldMapProgression) phải tương ứng với sự tiến cấp của MC.
3. Không lan man, tập trung vào plot chính.${proactiveRule}`;

  try {
    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: "Bạn là Master Architect chuyên lập Đại cương tổng thể cho tiểu thuyết mạng.",
    }, { jsonMode: true, tracking: { projectId, task: 'master_outline' } });

    const parsed = parseJSON<MasterOutline>(res.content);

    if (!parsed) {
      console.error('Failed to parse master outline JSON — skipping DB save');
      return null;
    }

    // DeepSeek sometimes returns shape without majorArcs (truncated / incomplete
    // structured output). Validate before sanitization to avoid downstream
    // .map() on undefined that swallows the real cause via outer try/catch.
    if (!Array.isArray(parsed.majorArcs) || parsed.majorArcs.length === 0) {
      console.error('Master outline missing majorArcs array — DeepSeek returned incomplete shape, skipping DB save');
      return null;
    }

    // Genre-aware validation: detect combat/villain leakage in non-combat genres
    const validationIssues = validateMasterOutlineForGenre(parsed, genre);
    if (validationIssues.length > 0) {
      console.warn(`[MasterOutline] Genre validation issues for ${genre}: ${validationIssues.join('; ')}`);
      // Sanitize: remove combat-leaning content for non-combat genres
      if (isProactive) {
        parsed.finalBossOrGoal = sanitizeFinalGoal(parsed.finalBossOrGoal, genre);
        parsed.majorArcs = parsed.majorArcs.map(a => ({
          ...a,
          keyMilestone: sanitizeMilestone(a.keyMilestone, genre),
        }));
      }
    }

    // Save to DB
    const db = getSupabase();
    await db.from('ai_story_projects')
      .update({ master_outline: parsed as unknown as Record<string, unknown> })
      .eq('id', projectId);

    return parsed;
  } catch (error) {
    console.error('Failed to generate master outline:', error);
    return null;
  }
}
