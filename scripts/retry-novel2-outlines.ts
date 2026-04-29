/**
 * One-off retry for the realign script's novel 2 (now slugged
 * he-thong-co-hoi-neet-van-khoa-khoi-nghiep-phuong-do) — its
 * story_outline regen failed with parseJSON null on the first run.
 * world_description + title + slug are already updated; just need
 * outlines.
 *
 * Idempotent: safe to re-run if it fails again.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig, GenreType, StoryOutline } from '@/services/story-engine/types';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const SLUG = 'he-thong-co-hoi-neet-van-khoa-khoi-nghiep-phuong-do';
const MC_NAME = 'Lê Mạnh Khang';
const TITLE = 'Hệ Thống Cơ Hội: NEET Văn Khoa Khởi Nghiệp Phượng Đô';
const GENRE: GenreType = 'do-thi';
const TOTAL_PLANNED = 600;

async function main(): Promise<void> {
  const { data: novel } = await s.from('novels').select('id').eq('slug', SLUG).maybeSingle();
  if (!novel?.id) throw new Error(`Novel not found: ${SLUG}`);
  const { data: project } = await s.from('ai_story_projects').select('id, world_description').eq('novel_id', novel.id).maybeSingle();
  if (!project?.id) throw new Error('Project not found');
  const projectId = project.id as string;
  const worldDesc = project.world_description as string;

  console.log(`▶ Retry outlines for ${SLUG}`);
  console.log(`  Project: ${projectId}`);

  // Story outline with retry
  const cfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.75, maxTokens: 8192 };
  const prompt = `Bạn là biên tập viên xuất bản truyện mạng TQ. Thiết kế dàn ý chi tiết:

TIÊU ĐỀ: ${TITLE}
NHÂN VẬT CHÍNH: ${MC_NAME}
GENRE: ${GENRE} (sub: kinh-doanh)
WORLD: ${worldDesc.slice(0, 2500)}

Trả về JSON CANONICAL SCHEMA:
{
  "id": "string", "title": "${TITLE}", "genre": "${GENRE}",
  "premise": "1-2 câu premise (Hệ Thống Cơ Hội pop-up + MC NEET freelance + khởi nghiệp media Phượng Đô)",
  "themes": ["khởi nghiệp NEET", "ngành truyền thông VN", "growth mindset"],
  "mainConflict": "MC indie vs agency lớn độc quyền + tự kỷ luật",
  "targetChapters": ${TOTAL_PLANNED},
  "protagonist": {
    "name": "${MC_NAME}",
    "startingState": "24 tuổi NEET 4 tháng, sinh viên Văn Hóa-Du Lịch, freelance content quán net Net Việt, 127K xu, phòng trọ 4M Cầu Giấy",
    "endGoal": "Empire truyền thông Đại Nam, IPO, đa chi nhánh",
    "characterArc": "NEET frustrated → freelance ổn định → studio nhỏ → agency mid → empire qua 4 phase"
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Pop-up HỆ THỐNG CƠ HỘI hiện trên màn quán net, gợi ý hợp đồng Sáng Tạo Media 5M"},
    {"chapter": 50, "event": "Hoàn thành 5 hợp đồng đầu, lên Level 5, mở khóa Phân Tích Audience"},
    {"chapter": 200, "event": "Studio 3 người + agency mid-size brand campaign Phượng Đô"},
    {"chapter": 400, "event": "Đối đầu Brand Connect Group, talent poaching war"},
    {"chapter": 600, "event": "IPO empire truyền thông Đại Nam"}
  ],
  "endingVision": "MC = ông trùm truyền thông Đại Nam, studio thành agency hàng đầu, định hình ngành content VN",
  "uniqueHooks": ["pop-up smart matchmaking", "level-up nghề viết content thật", "Phượng Đô urban hustle realistic"]
}

YÊU CẦU CỨNG: protagonist.name = "${MC_NAME}", KHÔNG combat, KHÔNG huyền bí, KHÔNG harem. Trả JSON thuần.`;

  let outline: StoryOutline | null = null;
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await callGemini(prompt, cfg);
      outline = parseJSON<StoryOutline>(res.content);
      if (outline) break;
      console.warn(`  ⚠ story_outline attempt ${i}/3 parseJSON null — retrying`);
    } catch (e) {
      console.warn(`  ⚠ story_outline attempt ${i}/3 error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!outline) throw new Error('story_outline failed after 3 attempts');
  if (outline.protagonist) outline.protagonist.name = MC_NAME;
  await s.from('ai_story_projects').update({ story_outline: outline }).eq('id', projectId);
  console.log(`  ✓ story_outline saved`);

  // Master outline with retry
  const masterCfg: GeminiConfig = { model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096 };
  let master = null;
  for (let i = 1; i <= 3; i++) {
    master = await generateMasterOutline(projectId, TITLE, GENRE, worldDesc, TOTAL_PLANNED, masterCfg);
    if (master?.majorArcs?.length) break;
    console.warn(`  ⚠ master_outline attempt ${i}/3 incomplete — retrying`);
  }
  if (!master?.majorArcs?.length) throw new Error('master_outline failed after 3 attempts');
  console.log(`  ✓ master_outline saved (${master.majorArcs.length} arcs)`);

  const lastArcEnd = Math.max(...master.majorArcs.map(a => a.endChapter || 0));
  if (lastArcEnd > 0 && Math.abs(lastArcEnd - TOTAL_PLANNED) / TOTAL_PLANNED > 0.1) {
    const newTotal = Math.round(lastArcEnd / 50) * 50 || lastArcEnd;
    await s.from('ai_story_projects').update({ total_planned_chapters: newTotal }).eq('id', projectId);
    console.log(`  ✓ total_planned auto-synced ${TOTAL_PLANNED} → ${newTotal}`);
  }

  // Reset quota
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  await s.from('project_daily_quotas').update({
    written_chapters: 0, status: 'active', next_due_at: new Date().toISOString(),
    retry_count: 0, last_error: null, updated_at: new Date().toISOString(),
  }).eq('project_id', projectId).eq('vn_date', vnDate);
  console.log(`  ✓ quota reset`);
  console.log(`✓ Done.`);
}

main().catch(console.error);
