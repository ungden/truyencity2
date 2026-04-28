/**
 * V2: regenerate descriptions FORCING the correct main_character name from
 * ai_story_projects to appear in the blurb. Previous V1 let DeepSeek invent
 * its own protagonist name → 9/10 mismatched, would confuse readers when
 * chapter 1 used the project's actual MC name.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig } from '@/services/story-engine/types';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const SLUGS = [
  'van-phong-13-quy-tac-sinh-ton-sau-6h-toi',
  'slime-cua-ta-nuot-ca-rong',
  'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong',
  'de-che-van-hoa-ta-mang-chau-kiet-luan-sang-di-gioi',
  'group-chat-van-gioi-ta-la-admin-kiem-ca-map',
  'tro-lai-1995-de-che-bat-dong-san-hai-long-do',
  'be-quan-1-van-nam-tu-truong-bo-lac-da-hoa-cat-bui',
  'lao-to-cua-ta-de-tu-mang-phu-lai-keo-aggro',
  'ngo-tac-song-huong-moi-xac-mot-uoc-nguyen',
];

async function regen(novelId: string, title: string, mc: string, genre: string, topicId: string | null, world: string): Promise<void> {
  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.85,
    maxTokens: 2500,
    systemPrompt: `Bạn là biên tập viên webnovel TruyenCity. Viết MÔ TẢ TRUYỆN (back-cover blurb) cho trang chi tiết.

QUY TẮC NGHIÊM:
1. PHẢI dùng đúng tên nhân vật chính được cấp. KHÔNG được sáng tác tên khác. Tên này xuất hiện ÍT NHẤT 2 lần trong blurb.
2. ĐÚNG 3 đoạn, tổng 180-260 từ tiếng Việt CÓ DẤU đầy đủ.
3. Đoạn 1 (60-90 từ): Hook mở đầu — bối cảnh CỤ THỂ + giới thiệu nhân vật chính + tình huống bất thường vừa xảy ra.
4. Đoạn 2 (70-110 từ): Tease bí ẩn / năng lực / xung đột / mục tiêu của nhân vật chính. KHÔNG spoil cuối truyện.
5. Đoạn 3 (40-80 từ): Câu nhử + closing hook khiến reader muốn đọc.

CẤM TUYỆT ĐỐI dùng các từ kỹ thuật / spec engine: "Bàn Tay Vàng", "Hệ thống X", "Vòng lặp", "MC", "Sảng văn", "BOM", "out-play", "engine", "vả mặt", "khí vận chi tử".

Trả về JSON: { "description": "đoạn1\\n\\nđoạn2\\n\\nđoạn3" }`,
  };

  const prompt = `Truyện: "${title}"
Tên nhân vật chính (PHẢI DÙNG TÊN NÀY, KHÔNG ĐỔI): ${mc}
Thể loại: ${genre}${topicId ? ` / ${topicId}` : ''}

Bối cảnh thế giới (tham khảo, không copy):
${world.slice(0, 1500)}

Viết MÔ TẢ TRUYỆN 3 đoạn 180-260 từ. Tên nhân vật chính "${mc}" phải xuất hiện ít nhất 2 lần.`;

  const res = await callGemini(prompt, cfg, { jsonMode: true, tracking: { projectId: novelId, task: 'regen_v2' } });
  const parsed = parseJSON<{ description?: string }>(res.content);
  if (!parsed?.description) throw new Error('parse failed');
  const newDesc = parsed.description.trim();
  // Verify MC name appears
  if (!newDesc.includes(mc)) {
    throw new Error(`MC "${mc}" not in blurb`);
  }
  await s.from('novels').update({ description: newDesc }).eq('id', novelId);
  console.log(`  ✓ ${title} (${newDesc.split(/\s+/).length}w)`);
}

async function main(): Promise<void> {
  for (const slug of SLUGS) {
    const { data: n } = await s.from('novels').select('id,title').eq('slug', slug).single();
    if (!n) continue;
    const { data: p } = await s.from('ai_story_projects')
      .select('main_character,genre,topic_id,world_description')
      .eq('novel_id', n.id as string).single();
    if (!p) continue;
    console.log(`\n▶ ${n.title} — MC: ${p.main_character}`);
    let success = false;
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        await regen(
          n.id as string,
          n.title as string,
          p.main_character as string,
          p.genre as string,
          p.topic_id as string | null,
          p.world_description as string,
        );
        success = true;
      } catch (e) {
        console.log(`  attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!success) console.error(`  ✗ all 3 attempts failed`);
  }
}
main().catch(console.error);
