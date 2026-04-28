/**
 * Sync project.main_character with story_outline.protagonist.name.
 *
 * 9/10 Phase 20A representative novels had a mismatch: spawn script seeded
 * project.main_character with one name (e.g. "Nguyễn Đại Nam") but the
 * DeepSeek-generated outline invented a different name (e.g. "Lý Minh"),
 * and the engine writes chapters using outline.protagonist.name. So all
 * existing chapters use the OUTLINE name. To preserve 100+ already-written
 * chapters, we sync project + description to match what's in chapters.
 *
 * For each mismatched novel:
 *  1. Update project.main_character ← outline.protagonist.name
 *  2. Regenerate description (blurb) using the corrected MC name
 *
 * Chapters remain untouched.
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

function isVietnamSet(genre: string, world: string): boolean {
  return /Đại Nam|Hải Long Đô|Phượng Đô|Trung Đô|Sài Gòn|Hà Nội|TP\.\s*HCM|Việt Nam/i.test(world)
    || (genre === 'do-thi' && !/dị giới|hoà ngân|fantasy/i.test(world))
    || genre === 'quan-truong'
    || (genre === 'linh-di' && /Dân Quốc|cố đô|sông Hương/i.test(world));
}

async function regenBlurb(novelId: string, title: string, mc: string, genre: string, topicId: string | null, world: string): Promise<string> {
  const isVN = isVietnamSet(genre, world);

  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.85,
    maxTokens: 2500,
    systemPrompt: `Bạn là biên tập viên webnovel TruyenCity. Viết MÔ TẢ TRUYỆN (back-cover blurb) cho trang chi tiết.

QUY TẮC NGHIÊM:
1. PHẢI dùng đúng tên nhân vật chính được cấp. KHÔNG sáng tác tên khác. Tên này phải xuất hiện ÍT NHẤT 2 lần trong blurb.
2. ĐÚNG 3 đoạn, tổng 200-280 từ tiếng Việt CÓ DẤU đầy đủ. Phân cách 3 đoạn bằng \\n\\n.
3. Đoạn 1 (60-90 từ): Hook mở đầu — bối cảnh CỤ THỂ + giới thiệu nhân vật chính + tình huống bất thường.
4. Đoạn 2 (80-120 từ): Tease năng lực / xung đột / mục tiêu của nhân vật chính. KHÔNG spoil.
5. Đoạn 3 (50-90 từ): Câu nhử + closing hook khiến reader muốn đọc.
${isVN ? '6. TIỀN TỆ Việt Nam: chỉ dùng "đồng / nghìn đồng / triệu đồng / tỷ đồng" (VND). KHÔNG dùng "nguyên" làm đơn vị tiền, KHÔNG dùng "xu".\n7. THÀNH PHỐ HƯ CẤU lần đầu xuất hiện PHẢI annotate tên thực: "Hải Long Đô (tựa TP. Hồ Chí Minh)", "Phượng Đô (tựa Hà Nội)", "Trung Đô (tựa Huế)" / "Cố Đô Trung Đô (tựa Cố Đô Huế)". Annotate 1 lần ở first occurrence.' : ''}

CẤM TUYỆT ĐỐI dùng từ kỹ thuật / spec engine: "Bàn Tay Vàng", "Hệ thống X" (cụm này), "MC", "Vòng lặp", "Cấu trúc 4 hồi", "Sảng văn", "BOM", "out-play", "engine", "vả mặt", "khí vận chi tử".

Trả về JSON: { "description": "đoạn1\\n\\nđoạn2\\n\\nđoạn3" }`,
  };

  const prompt = `Truyện: "${title}"
Tên nhân vật chính (PHẢI DÙNG ĐÚNG TÊN NÀY, KHÔNG ĐỔI): ${mc}
Thể loại: ${genre}${topicId ? ` / ${topicId}` : ''}

Bối cảnh thế giới (tham khảo, không copy nguyên văn):
${world.slice(0, 1500)}

Viết MÔ TẢ TRUYỆN 3 đoạn 200-280 từ. Tên "${mc}" PHẢI xuất hiện ≥2 lần.${isVN ? ' Tiền tệ VND. Thành phố hư cấu annotate tên thực 1 lần.' : ''}`;

  const res = await callGemini(prompt, cfg, { jsonMode: true, tracking: { projectId: novelId, task: 'sync_mc' } });
  const parsed = parseJSON<{ description?: string }>(res.content);
  const desc = parsed?.description?.trim();
  if (!desc) throw new Error('parse failed');
  if (!desc.includes(mc)) throw new Error(`MC "${mc}" not in blurb`);
  if (isVN && /\b\d[\d.,]*\s*(xu|nguyên)\b/.test(desc)) throw new Error('still has fake currency');
  // Final defensive sanitize: kill any remaining "MC" / "Bàn Tay Vàng"
  const cleaned = desc
    .replace(/\bMC\b/g, mc)
    .replace(/\bMain\b/g, mc)
    .replace(/Bàn Tay Vàng/gi, 'năng lực đặc biệt')
    .replace(/Sảng văn(\s+\w+)?/gi, '')
    .replace(/Cấu trúc 4 hồi/gi, '')
    .replace(/Vòng lặp \w+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return cleaned;
}

async function main(): Promise<void> {
  for (const slug of SLUGS) {
    const { data: n } = await s.from('novels').select('id,title,description').eq('slug', slug).single();
    if (!n) continue;
    const { data: p } = await s.from('ai_story_projects')
      .select('id,main_character,genre,topic_id,story_outline,world_description')
      .eq('novel_id', n.id as string).single();
    if (!p) continue;

    const projectMC = p.main_character as string;
    const outlineMC = (p.story_outline as any)?.protagonist?.name as string | undefined;

    if (!outlineMC) {
      console.log(`\n⏭  SKIP ${n.title} — no outline.protagonist.name`);
      continue;
    }
    if (projectMC === outlineMC) {
      console.log(`\n✓  ${n.title} — already in sync (${projectMC})`);
      continue;
    }

    console.log(`\n▶ ${n.title}`);
    console.log(`  project.MC="${projectMC}" → outline.MC="${outlineMC}"`);

    // Update project.main_character
    const { error: pErr } = await s.from('ai_story_projects')
      .update({ main_character: outlineMC })
      .eq('id', p.id as string);
    if (pErr) {
      console.error(`  ✗ project update: ${pErr.message}`);
      continue;
    }
    console.log(`  ✓ project.main_character → ${outlineMC}`);

    // Regen description with correct MC name
    let success = false;
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        const newDesc = await regenBlurb(
          n.id as string,
          n.title as string,
          outlineMC,
          p.genre as string,
          p.topic_id as string | null,
          p.world_description as string,
        );
        await s.from('novels').update({ description: newDesc }).eq('id', n.id as string);
        console.log(`  ✓ description regen (${newDesc.split(/\s+/).length}w)`);
        success = true;
      } catch (e) {
        console.log(`  attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!success) console.error(`  ✗ blurb regen failed after 3 attempts`);
  }
}
main().catch(console.error);
