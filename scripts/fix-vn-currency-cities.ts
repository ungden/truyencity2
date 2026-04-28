/**
 * Fix Vietnam-set novels:
 * 1. Replace fake currency "nguyên/xu" with real VND ("đồng / nghìn đồng / triệu đồng")
 *    in both description (blurb) and world_description (engine context).
 * 2. In description, annotate fictional Vietnamese cities with real-world equivalent:
 *    - Hải Long Đô → TP. Hồ Chí Minh / Sài Gòn
 *    - Phượng Đô → Hà Nội
 *    - Trung Đô → Huế
 *    World_description keeps fictional names for in-story branding.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig } from '@/services/story-engine/types';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const VN_SLUGS = [
  'van-phong-13-quy-tac-sinh-ton-sau-6h-toi',
  'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong',
  'tro-lai-1995-de-che-bat-dong-san-hai-long-do',
  'group-chat-van-gioi-ta-la-admin-kiem-ca-map',
  'ngo-tac-song-huong-moi-xac-mot-uoc-nguyen',
];

/** Replace fake currency in raw text with real VND. */
function patchCurrency(s: string): string {
  return s
    // TIỀN TỆ block — replace fictional currency declaration with real VND
    .replace(/TIỀN TỆ:[^\n]*xu[^\n]*nguyên[^\n]*\n/gi, 'TIỀN TỆ: VND (đồng / nghìn đồng / triệu đồng / tỷ đồng) — đơn vị tiền tệ thực của Đại Nam, ngang giá VND của Việt Nam ngoài đời.\n')
    // "X xu/<unit>" → "X đồng/<unit>" — only when not part of compound like "5 xuất"
    .replace(/(\d+(?:[\.,]\d+)?)\s*xu(\b|\s)/g, '$1 đồng$2')
    // "X nguyên/m²" → "X nghìn đồng/m²"
    .replace(/(\d+(?:[\.,]\d+)?)\s*nguyên\b/g, '$1 nghìn đồng')
    // standalone "nguyên" as currency unit (rare) — leave any "nguyên" word that is not a number followed by it
    ;
}

async function regenBlurb(novelId: string, title: string, mc: string, genre: string, topicId: string | null, world: string): Promise<void> {
  const cfg: GeminiConfig = {
    model: 'deepseek-v4-flash',
    temperature: 0.85,
    maxTokens: 2500,
    systemPrompt: `Bạn là biên tập viên webnovel TruyenCity. Viết MÔ TẢ TRUYỆN (back-cover blurb) cho trang chi tiết.

QUY TẮC NGHIÊM:
1. PHẢI dùng đúng tên nhân vật chính được cấp. KHÔNG sáng tác tên khác. Tên này phải xuất hiện ÍT NHẤT 2 lần trong blurb.
2. ĐÚNG 3 đoạn, tổng 180-260 từ tiếng Việt CÓ DẤU đầy đủ.
3. TIỀN TỆ Việt Nam: dùng "đồng / nghìn đồng / triệu đồng / tỷ đồng" (VND). KHÔNG được dùng "nguyên", "xu", "lượng vàng", hay bất kỳ tên fake currency nào.
4. THÀNH PHỐ HƯ CẤU PHẢI ANNOTATE bằng tên thực ngay sau lần đầu nhắc đến — dùng dấu ngoặc tròn:
   - "Hải Long Đô (tựa TP. Hồ Chí Minh)"
   - "Phượng Đô (tựa Hà Nội)"
   - "Trung Đô (tựa Huế)" hoặc "Cố Đô Trung Đô (tựa Cố Đô Huế)"
   Chỉ annotate 1 lần, các lần sau dùng tên fictional.
5. CẤM TUYỆT ĐỐI dùng từ kỹ thuật: "Bàn Tay Vàng", "Hệ thống X", "MC", "Sảng văn", "BOM", "out-play", "engine", "vả mặt", "khí vận chi tử".

Trả về JSON: { "description": "đoạn1\\n\\nđoạn2\\n\\nđoạn3" }`,
  };

  const prompt = `Truyện: "${title}"
Tên nhân vật chính (PHẢI DÙNG TÊN NÀY, KHÔNG ĐỔI): ${mc}
Thể loại: ${genre}${topicId ? ` / ${topicId}` : ''}

Bối cảnh thế giới (tham khảo):
${world.slice(0, 1500)}

Viết MÔ TẢ TRUYỆN 3 đoạn 180-260 từ. Tên "${mc}" phải xuất hiện ≥2 lần. Tiền tệ phải là VND đồng. Thành phố hư cấu phải annotate tên thực 1 lần ở lần xuất hiện đầu.`;

  const res = await callGemini(prompt, cfg, { jsonMode: true, tracking: { projectId: novelId, task: 'fix_vn' } });
  const parsed = parseJSON<{ description?: string }>(res.content);
  if (!parsed?.description) throw new Error('parse failed');
  const newDesc = parsed.description.trim();
  if (!newDesc.includes(mc)) throw new Error(`MC "${mc}" missing`);
  if (/\b\d+\s*xu\b/.test(newDesc) || /\bnguyên\b/.test(newDesc)) {
    throw new Error('still has fake currency: ' + newDesc.match(/\b\d+\s*(xu|nguyên)\b/)?.[0]);
  }
  await s.from('novels').update({ description: newDesc }).eq('id', novelId);
  console.log(`  ✓ desc: ${newDesc.split(/\s+/).length}w`);
}

async function main(): Promise<void> {
  for (const slug of VN_SLUGS) {
    const { data: n } = await s.from('novels').select('id,title').eq('slug', slug).single();
    if (!n) continue;
    const { data: p } = await s.from('ai_story_projects')
      .select('id,main_character,genre,topic_id,world_description')
      .eq('novel_id', n.id as string).single();
    if (!p) continue;

    console.log(`\n▶ ${n.title}`);

    // 1. Patch world_description currency block
    const oldWorld = p.world_description as string;
    const newWorld = patchCurrency(oldWorld);
    if (newWorld !== oldWorld) {
      const { error } = await s.from('ai_story_projects')
        .update({ world_description: newWorld })
        .eq('id', p.id as string);
      if (error) console.error('  ✗ world_desc patch failed:', error.message);
      else console.log('  ✓ world_desc currency patched (đồng)');
    } else {
      console.log('  · world_desc no change needed');
    }

    // 2. Regen blurb with currency + city annotation rules
    let success = false;
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        await regenBlurb(
          n.id as string,
          n.title as string,
          p.main_character as string,
          p.genre as string,
          p.topic_id as string | null,
          newWorld,
        );
        success = true;
      } catch (e) {
        console.log(`  attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!success) console.error(`  ✗ all 3 blurb attempts failed`);
  }
}
main().catch(console.error);
