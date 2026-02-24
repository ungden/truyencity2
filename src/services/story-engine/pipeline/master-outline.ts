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

export async function generateMasterOutline(
  projectId: string,
  title: string,
  genre: GenreType,
  synopsis: string,
  totalPlannedChapters: number,
  config: GeminiConfig
): Promise<MasterOutline | null> {
  const prompt = `Bạn là Trưởng Biên Tập (Chief Editor) chuyên quy hoạch Đại cương truyện dài kỳ (Master Outline) cho một bộ Webnovel Trung Quốc.

Nhiệm vụ của bạn là quy hoạch lộ trình tổng thể cho bộ truyện: "${title}"
Thể loại: ${genre}
Độ dài dự kiến: ${totalPlannedChapters} chương
Tóm tắt ý tưởng gốc (Synopsis): ${synopsis}

Hãy lập ra Master Outline bao gồm mục tiêu tối thượng, Kẻ thù/Trùm cuối, Lộ trình di chuyển (Bản đồ) và chia nhỏ thành các Đại Cốt Truyện (Major Arcs) từ chương 1 đến chương ${totalPlannedChapters}.

Trả về ĐÚNG định dạng JSON sau:
{
  "mainPlotline": "Mục tiêu tối thượng xuyên suốt truyện của MC (VD: Phục thù, Thành Thần, Tìm người thân)",
  "finalBossOrGoal": "Kẻ thù cuối cùng hoặc Cảnh giới tối cao cần đạt được ở cuối truyện (Được giấu mặt từ đầu nhưng rải rác manh mối)",
  "worldMapProgression": ["Tân thủ thôn", "Học viện", "Kinh thành", "Vực ngoại", "Thần giới"],
  "majorArcs": [
    {
      "arcName": "Tên Arc lớn (VD: Quật khởi tại gia tộc)",
      "startChapter": 1,
      "endChapter": 100,
      "description": "Nội dung chính của Arc này",
      "keyMilestone": "Thành tựu MC đạt được cuối Arc (Đột phá cảnh giới, Thu phục dị hỏa, Giết kẻ thù A)"
    }
  ]
}

Quy tắc:
1. Độ dài mỗi Arc từ 50-200 chương tùy tổng số chương. Cộng dồn endChapter của Arc cuối cùng phải bằng ${totalPlannedChapters}.
2. Lộ trình bản đồ (worldMapProgression) phải tương ứng với sự tiến cấp của MC.
3. Không lan man, tập trung vào plot chính.`;

  try {
    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: "Bạn là Master Architect chuyên lập Đại cương tổng thể cho tiểu thuyết mạng.",
    }, { jsonMode: true });

    const parsed = parseJSON<MasterOutline>(res.content);
    
    // Save to DB
    const db = getSupabase();
    await db.from('ai_story_projects')
      .update({ master_outline: parsed as any })
      .eq('id', projectId);

    return parsed;
  } catch (error) {
    console.error('Failed to generate master outline:', error);
    return null;
  }
}
