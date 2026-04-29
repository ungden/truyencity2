/**
 * Force-generate master_outline + story_outline for 6 hand-crafted novels.
 * These were inserted via SQL bypassing seeder's outline generation step.
 *
 * Usage: npx tsx scripts/generate-outlines-for-novels.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local manually
try {
  const envText = readFileSync('.env.local', 'utf-8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  }
} catch { /* ignore */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_PROJECT_IDS = (process.env.TARGET_PROJECTS || [
  '788ff59e-7333-4ba8-adb8-5b450b5f90ab',
  '3a50eeeb-034d-4994-8776-390a5aa5597a',
  'cdf9f1f0-a8b6-49ec-b6ec-ad4d03bc69c4',
  '19ac0169-b987-4926-aeb8-77f00b660e65',
  '9516a987-63ef-4dbe-87e5-d8111070564a',
  '374d5990-3914-4ebf-a845-488ead0e85e8',
].join(',')).split(',').filter(Boolean);

async function callGemini(prompt: string, jsonMode = true): Promise<string> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 8192,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function generateMaster(title: string, genre: string, world: string, totalChapters: number, mc: string): Promise<Record<string, unknown>> {
  const prompt = `Bạn là Trưởng Biên Tập quy hoạch Master Outline cho Webnovel Việt Nam (style TQ).

TRUYỆN: "${title}"
THỂ LOẠI: ${genre}
NHÂN VẬT CHÍNH: ${mc}
TỔNG CHƯƠNG: ${totalChapters}

BỐI CẢNH + WORLD (BẮT BUỘC TUÂN THỦ):
${world.slice(0, 6000)}

NHIỆM VỤ: Lập Master Outline. PHẢI dựa NGUYÊN VẸN trên bối cảnh world ở trên — KHÔNG thay đổi setting, MC, golden finger, hoặc anti-tropes đã đặt. KHÔNG injection từ template/example khác.

Trả về JSON:
{
  "mainPlotline": "Mục tiêu xuyên suốt của MC (rút từ world description)",
  "finalBossOrGoal": "Cột mốc tối thượng cuối truyện (theo phase 5 / arc 5 trong world description)",
  "worldMapProgression": ["địa điểm 1","địa điểm 2","..."],
  "majorArcs": [
    {
      "arcName": "Tên arc lớn",
      "startChapter": 1,
      "endChapter": 300,
      "description": "Nội dung chính",
      "keyMilestone": "Thành tựu cụ thể MC đạt được cuối arc"
    }
  ]
}

QUY TẮC:
- 5 arcs tổng (~${Math.round(totalChapters / 5)} chương/arc — tổng KHÔNG vượt ${totalChapters})
- DÙNG tên địa danh trong world description (KHÔNG bịa)
- DÙNG concept golden finger trong world (KHÔNG thay)
- KHÔNG inject "Net Việt", "Phượng Đô modern" nếu world không có
- KHÔNG thêm yếu tố combat MC nếu world chỉ rõ MC = vendor/creator
- TUÂN THỦ ANTI-TROPES trong world (no_system, no_harem, etc.)
- Cộng dồn endChapter của arc cuối cùng PHẢI bằng ${totalChapters}.`;

  const txt = await callGemini(prompt, true);
  return JSON.parse(txt);
}

async function generateStoryOutline(title: string, genre: string, world: string, totalChapters: number, mc: string): Promise<Record<string, unknown>> {
  const prompt = `Lập Story Outline (premise + protagonist + plot points + ending vision) cho truyện "${title}" thể loại ${genre}.

NHÂN VẬT CHÍNH: ${mc}

WORLD/BỐI CẢNH (BẮT BUỘC TUÂN THỦ):
${world.slice(0, 6000)}

Trả về JSON:
{
  "title": "${title}",
  "genre": "${genre}",
  "premise": "Hook 2-3 câu mô tả truyện (rút từ world description)",
  "themes": ["theme 1","theme 2","theme 3"],
  "mainConflict": "Xung đột chính (theo arc structure trong world)",
  "targetChapters": ${totalChapters},
  "protagonist": {
    "name": "${mc}",
    "startingState": "Trạng thái khởi điểm (CHÍNH XÁC từ world description)",
    "endGoal": "Mục tiêu cuối (từ phase 5 trong world)",
    "characterArc": "Hành trình phát triển nhân cách"
  },
  "majorPlotPoints": [
    {"chapter": 50, "name": "Tên milestone", "description": "Mô tả ngắn"},
    {"chapter": 300, "name": "...", "description": "..."}
  ],
  "uniqueHooks": ["hook 1 từ world","hook 2","hook 3"],
  "endingVision": "Kết cục dự kiến (từ arc 5 trong world)"
}

QUY TẮC: TUYỆT ĐỐI TUÂN world description. KHÔNG bịa setting/character/golden finger.`;

  const txt = await callGemini(prompt, true);
  return JSON.parse(txt);
}

async function main() {
  console.log('Loading 6 projects...');
  const { data: projects, error } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, genre, main_character, world_description, total_planned_chapters, novels:novels!inner(title)')
    .in('id', TARGET_PROJECT_IDS);

  if (error) throw error;
  if (!projects?.length) throw new Error('No projects found');

  for (const p of projects) {
    const novel = (Array.isArray(p.novels) ? p.novels[0] : p.novels) as { title: string };
    console.log(`\n[${novel.title}]`);

    try {
      console.log('  Generating master_outline...');
      const master = await generateMaster(novel.title, p.genre, p.world_description || '', p.total_planned_chapters, p.main_character);
      console.log(`  ✓ Master: ${(master.majorArcs as Array<unknown>)?.length || 0} arcs`);

      console.log('  Generating story_outline...');
      const story = await generateStoryOutline(novel.title, p.genre, p.world_description || '', p.total_planned_chapters, p.main_character);
      console.log(`  ✓ Story: ${(story.majorPlotPoints as Array<unknown>)?.length || 0} plot points`);

      const { error: updErr } = await supabase
        .from('ai_story_projects')
        .update({ master_outline: master, story_outline: story })
        .eq('id', p.id);

      if (updErr) console.error(`  ✗ Update failed: ${updErr.message}`);
      else console.log(`  ✓ Saved to DB`);
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
