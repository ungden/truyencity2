/**
 * Story Outline generator — used by both orchestrator (S1 self-heal) and
 * cron route (init-prep tier).
 *
 * Schema upgrade 2026-04-30: added cast roster, world_rules, tone_flags,
 * anti_tropes — fields the Architect/Writer rely on for grounded scene
 * planning. Previously story_outline was just premise + plot points, which
 * forced the Architect to invent supporting characters / world rules
 * ad-hoc → drift.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';
import { getGenreSetupRequirements } from '../templates/genre-process-blueprints';

export interface StoryOutline {
  id: string;
  title: string;
  genre: GenreType;
  premise: string;
  themes: string[];
  mainConflict: string;
  targetChapters: number;
  targetArcs: number;
  protagonist: {
    name: string;
    startingState: string;
    endGoal: string;
    characterArc: string;
  };
  majorPlotPoints: Array<{
    id: string;
    name: string;
    description?: string;
    targetArc: number;
    type: string;
    importance: string;
  }>;
  endingVision: string;
  uniqueHooks: string[];
  /** Named cast roster — Architect uses to seed scenes without inventing characters. */
  castRoster?: Array<{
    name: string;
    role: string;          // "đối tác kinh doanh" / "nhân viên" / "đối thủ" / "người yêu" / "kẻ thù gia tộc"
    relationToMC: string;  // "bạn thân từ cấp 3" / "đối thủ cạnh tranh" / "người dạy MC nghề"
    introduceArc: number;  // Arc nào nhân vật xuất hiện
    archeType?: string;    // "mentor" / "loyal-friend" / "rival" / "love-interest"
  }>;
  /** Concrete world rules — Constraint Extractor indexes from this. */
  worldRules?: string[];
  /** Tone & pacing flags — Critic uses to enforce. */
  toneFlags?: {
    proactiveRatio?: number;       // 0-100, % chương MC chủ động
    comedyDensity?: 'low' | 'medium' | 'high';
    pacingTarget?: 'slow' | 'medium' | 'fast';
  };
  /** Anti-trope bans — concrete things story will NOT do. */
  antiTropes?: string[];
}

export async function generateStoryOutline(
  projectId: string,
  novelTitle: string,
  genre: GenreType,
  protagonistName: string,
  worldDescription: string,
  totalChapters: number,
  config: GeminiConfig,
): Promise<StoryOutline | null> {
  const arcs = 5;
  const mid = Math.ceil(arcs / 2);
  const genreSetup = getGenreSetupRequirements(genre);

  const prompt = `Lập Story Outline cho truyện "${novelTitle}" (${genre}).
NHÂN VẬT CHÍNH: ${protagonistName}
WORLD/BỐI CẢNH (BẮT BUỘC TUÂN THỦ):
${worldDescription.slice(0, 6000)}

${genreSetup}

CHẤT LƯỢNG ĐẠI THẦN — required fields:
1. premise: hook 2-3 câu gói ghém golden finger + stakes + opening situation
2. themes: 4-6 themes concrete (KHÔNG generic "growth/love/success")
3. mainConflict: 1-2 câu xung đột TRỤC (KHÔNG vague — phải có actor + stake)
4. protagonist: name, startingState (concrete: nghề + tài sản + tình cảm + weakness), endGoal, characterArc (internal change concrete)
5. majorPlotPoints: 4 plot points (inciting/midpoint/climax/resolution), MỖI cái có description 1-2 câu CỤ THỂ (KHÔNG chỉ "Cơ hội đầu tiên" — phải nêu tên nhân vật + scene cụ thể)
6. castRoster: 4-6 nhân vật phụ NAMED — Architect dùng để build scenes:
   - mỗi nhân vật: name (full họ tên) + role + relationToMC (concrete intersect) + introduceArc + archeType
   - VD: { name: "Khánh", role: "bạn cùng quê", relationToMC: "bạn thân từ cấp 3, sau thành đối tác kinh doanh", introduceArc: 1, archeType: "loyal-friend" }
7. worldRules: 4-6 quy tắc CỤ THỂ định hình narrative — Constraint Extractor index từ đây.
   - VD: ["Hệ Thống chỉ active trong bếp", "Tiền thưởng từ HT chỉ đổi skill, không tiền mặt", "Nâng tier cần MC nấu thật 100 lần"]
8. toneFlags:
   - proactiveRatio: 0-100, % chương MC chủ động (do-thi/quan-truong nên 80+, fantasy nên 60+)
   - comedyDensity: "low" / "medium" / "high"
   - pacingTarget: "slow" / "medium" / "fast"
9. antiTropes: 3-5 things story KHÔNG làm — concrete bans cho genre này.
   - VD: ["KHÔNG combat (MC = đầu bếp + doanh nhân)", "KHÔNG harem (single love interest)", "KHÔNG instant master skill"]

Trả về JSON:
{"id":"story_${Date.now()}","title":"${novelTitle}","genre":"${genre}","premise":"...","themes":["...","..."],"mainConflict":"...","targetChapters":${totalChapters},"targetArcs":${arcs},"protagonist":{"name":"${protagonistName}","startingState":"...","endGoal":"...","characterArc":"..."},"majorPlotPoints":[{"id":"pp1","name":"...","description":"...","targetArc":1,"type":"inciting_incident","importance":"critical"},{"id":"pp3","name":"...","description":"...","targetArc":${mid},"type":"midpoint","importance":"critical"},{"id":"pp5","name":"...","description":"...","targetArc":${arcs - 1},"type":"climax","importance":"critical"},{"id":"pp6","name":"...","description":"...","targetArc":${arcs},"type":"resolution","importance":"critical"}],"castRoster":[{"name":"...","role":"...","relationToMC":"...","introduceArc":1,"archeType":"..."}],"worldRules":["...","..."],"toneFlags":{"proactiveRatio":80,"comedyDensity":"medium","pacingTarget":"medium"},"antiTropes":["...","..."],"endingVision":"...","uniqueHooks":[]}

QUY TẮC:
- premise PHẢI mention golden finger từ world_description (KHÔNG vague "anh ta nhận được sức mạnh kỳ lạ")
- castRoster ≥4 named, MỖI người có concrete intersect (KHÔNG generic "người bạn")
- worldRules ≥4 cụ thể (KHÔNG generic "thế giới có pháp thuật")
- antiTropes ≥3 concrete bans
- KHÔNG dùng tên truyện nổi tiếng có thật làm reference`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.5,
    maxTokens: 8192,
    systemPrompt: 'Bạn là STORY ARCHITECT đại thần. CHỈ trả về JSON hợp lệ. Cast/world_rules/anti_tropes BẮT BUỘC concrete, KHÔNG generic.',
  }, { jsonMode: true, tracking: { projectId, task: 'story_outline' } });

  return parseJSON<StoryOutline>(res.content);
}
