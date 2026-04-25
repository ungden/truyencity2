/**
 * Retry outline generation for Bộ 1 (Trở Về Năm 2000) — debug parse failure.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig, StoryOutline } from '@/services/story-engine/types';

const PROJECT_ID = 'cc8d6751-40f4-40c6-a32a-9a3af761b6bd';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main(): Promise<void> {
  const { data: project } = await s.from('ai_story_projects')
    .select('*,novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', PROJECT_ID).single();

  if (!project) throw new Error('project not found');
  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  console.log(`Project: ${project.id} — "${novel?.title}"`);

  const total = project.total_planned_chapters as number;

  // Slimmer story_outline prompt — less context to reduce parse complexity
  const prompt = `Tạo dàn ý JSON cho truyện đô thị trọng sinh kinh doanh:

TITLE: ${novel?.title}
PROTAGONIST: ${project.main_character}
GENRE: do-thi
TARGET: ${total} chương

WORLD: Năm 1999, Đại Nam Quốc vừa Đổi Mới. Sinh viên Bách Khoa Hải Long Đô trọng sinh từ 2026, có ký ức 25 năm tương lai về tập đoàn, bất động sản, công nghệ. Bắt đầu xây Lạc Hồng Tech từ một quán net.

ĐỐI THỦ: Đại Phong Group (~FPT), Vạn Thái (~Vingroup), Đại Hoa Tencent, Tân Lục Microsoft.

LỘ TRÌNH: net cafe → outsourcing → e-commerce → bất động sản → game → fintech → smartphone → quốc tế.

CẤM dùng: Việt Nam, Hà Nội, Sài Gòn, FPT, Vingroup, Mỹ, Trung Quốc, Nhật.

Trả về JSON ĐÚNG FORMAT (không markdown, không text thêm):
{
  "title": "${novel?.title}",
  "genre": "do-thi",
  "premise": "2-3 câu hấp dẫn",
  "themes": ["khởi nghiệp", "trọng sinh", "đế chế công nghệ"],
  "mainConflict": "Xung đột chính 1 câu",
  "targetChapters": ${total},
  "protagonist": {
    "name": "${project.main_character}",
    "startingState": "20 tuổi sinh viên năm 2 ĐH Bách Khoa Hải Long Đô, gia đình nghèo",
    "endGoal": "Xây Lạc Hồng Tech thành đế chế công nghệ thế giới",
    "characterArc": "Từ sinh viên tự ti → doanh nhân khắc nghiệt → ông trùm tham vọng nhưng vẫn giữ tình"
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Trọng sinh, mở quán net đầu tiên"},
    {"chapter": ${Math.ceil(total * 0.2)}, "event": "Lạc Hồng Tech outsourcing thắng lớn hợp đồng Tân Lục"},
    {"chapter": ${Math.ceil(total / 2)}, "event": "Mua đất Quận 7 Hải Long Đô — bước nhảy bất động sản"},
    {"chapter": ${Math.ceil(total * 0.7)}, "event": "Đối đầu Đại Hoa Tencent ngay tại Đại Nam"},
    {"chapter": ${total - 50}, "event": "Lạc Hồng vươn ra Phù Tang, Tây Âu"},
    {"chapter": ${total}, "event": "Đế chế công nghệ Lạc Hồng đứng đầu thế giới"}
  ],
  "endingVision": "Lạc Hồng trở thành tập đoàn công nghệ #1 toàn cầu, MC ngồi trên đỉnh cao nhưng vẫn về thăm quán net cũ",
  "uniqueHooks": [
    "Trọng sinh thập niên 2000 với ký ức 25 năm chính xác",
    "Đè bẹp Đại Hoa Tencent ngay tại sân nhà",
    "Xây dựng đế chế từ 5 ngàn xu vốn liếng"
  ]
}`;

  console.log('Attempting story_outline retry (slimmer prompt)...');

  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.5,
    maxTokens: 3072,
    systemPrompt: 'Trả về JSON CHÍNH XÁC theo schema yêu cầu. Không markdown, không giải thích.',
  };
  const res = await callGemini(prompt, cfg, {
    jsonMode: true,
    tracking: { projectId: PROJECT_ID, task: 'story_outline' },
  });

  console.log(`Response: ${res.content.length} chars, finish=${res.finishReason}`);
  console.log(`First 200 chars: ${res.content.slice(0, 200)}`);
  console.log(`Last 200 chars: ${res.content.slice(-200)}`);

  const outline = parseJSON<StoryOutline>(res.content);
  if (!outline) {
    console.error('\n✗ Parse failed. Raw content:');
    console.error(res.content);
    process.exit(1);
  }

  console.log(`\n✓ Parsed OK: title="${outline.title}", themes=${outline.themes?.length}, plot points=${outline.majorPlotPoints?.length}`);

  await s.from('ai_story_projects')
    .update({ story_outline: outline as unknown as Record<string, unknown> })
    .eq('id', PROJECT_ID);
  console.log('  ✓ story_outline saved');

  // Master outline
  console.log('\nGenerating master_outline...');
  const masterCfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 4096,
  };
  const master = await generateMasterOutline(
    PROJECT_ID,
    novel?.title as string,
    'do-thi',
    project.world_description as string,
    total,
    masterCfg,
  );
  if (!master) throw new Error('master_outline failed');
  console.log(`  ✓ master_outline saved (${master.majorArcs.length} arcs)`);

  await s.from('ai_story_projects').update({ status: 'active' }).eq('id', PROJECT_ID);
  console.log('  ✓ Activated');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
