/**
 * Regenerate novel.description for 6 manually-seeded novels using Gemini.
 * One-shot script — run once after manual seeding.
 *
 * Usage: npx tsx scripts/regenerate-novel-descriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local manually (handles complex values better than dotenv)
const envPath = '.env.local';
try {
  const envText = readFileSync(envPath, 'utf-8');
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
} catch {
  console.warn('Could not load .env.local');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Project IDs to regenerate (defaults to Novel 3 since world updated; can extend)
const TARGET_PROJECT_IDS = [
  'cdf9f1f0-a8b6-49ec-b6ec-ad4d03bc69c4', // Nguyễn Hoàng Phúc (Quán net — REFRAMED)
];

async function callGemini(prompt: string): Promise<string> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

async function generateDescription(
  title: string,
  genre: string,
  subGenres: string[],
  mainCharacter: string,
  worldSummary: string,
  toneProfile: string,
  startingArchetype: string,
): Promise<string> {
  const prompt = `Bạn là chuyên gia viết "Giới Thiệu Truyện" cho webnovel TQ phong cách Việt Nam (TruyenCity.com).

NHIỆM VỤ: Viết phần GIỚI THIỆU TRUYỆN (book description / synopsis) cho truyện sau, bằng tiếng Việt tự nhiên — KHÔNG dùng văn convert thô.

THÔNG TIN TRUYỆN:
- Tên: "${title}"
- Thể loại chính: ${genre}
- Sub-genre: ${subGenres.join(', ') || 'không'}
- Nhân vật chính: ${mainCharacter}
- Tone: ${toneProfile} | Starting archetype: ${startingArchetype}
- Bối cảnh + concept: ${worldSummary.slice(0, 4000)}

YÊU CẦU OUTPUT:
- Format 3-4 đoạn ngắn, mỗi đoạn 2-4 câu
- Đoạn 1: Hook (tình huống + mở đầu hấp dẫn, gợi câu hỏi)
- Đoạn 2: Giới thiệu MC + golden finger / năng lực
- Đoạn 3: Tease conflict + journey ngắn gọn
- Đoạn 4 (tùy chọn): Lời mời gọi cuốn hút (1-2 câu kết)

PHONG CÁCH VIẾT:
- Tiếng Việt tự nhiên, KHÔNG văn mẫu AI ("khẽ nhếch mép", "không khỏi", "ánh mắt phức tạp")
- Câu ngắn-dài xen kẽ, có nhịp điệu
- Hookline rõ — câu mở đầu phải khiến reader muốn đọc tiếp
- KHÔNG spoiler ending
- KHÔNG nhắc đến "Truyện City" / "AI" / "engine" / "rebirth thật vào năm 2025"
- Tone match: nếu cozy → ấm áp; pragmatic → calculating; epic → bi tráng
- 250-450 từ tổng

VÍ DỤ HOOK STYLE TỐT:
- "Năm 2027, Hệ Thống Phong Vân giáng xuống. Lê Minh Khôi, sinh viên IT năm 4, mở bảng class — class ẩn 'Mã Lập Trình Sư'."
- "Phúc kế thừa quán net từ ông ngoại. Đêm thứ ba, một hiệp sĩ trung cổ bước qua cửa hỏi WiFi."

CHỈ TRẢ VỀ phần giới thiệu — KHÔNG meta comment, KHÔNG markdown headers, KHÔNG quotes bao quanh.`;

  return callGemini(prompt);
}

async function main() {
  console.log('Loading 6 target projects...');
  const { data: projects, error } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, genre, sub_genres, main_character, world_description, style_directives, novels:novels!inner(id, title)')
    .in('id', TARGET_PROJECT_IDS);

  if (error) throw error;
  if (!projects?.length) throw new Error('No projects found');

  console.log(`Found ${projects.length} projects. Generating descriptions...`);

  for (const p of projects) {
    const novel = (Array.isArray(p.novels) ? p.novels[0] : p.novels) as { id: string; title: string };
    const styleDir = (p.style_directives || {}) as Record<string, string>;
    const tone = styleDir.tone_profile || 'pragmatic';
    const archetype = styleDir.starting_archetype || 'professional';

    console.log(`\n[${novel.title}] generating...`);
    try {
      const desc = await generateDescription(
        novel.title,
        p.genre,
        p.sub_genres || [],
        p.main_character,
        p.world_description || '',
        tone,
        archetype,
      );

      console.log(`  → ${desc.length} chars`);

      const { error: updErr } = await supabase
        .from('novels')
        .update({ description: desc })
        .eq('id', novel.id);

      if (updErr) {
        console.error(`  ✗ Update failed: ${updErr.message}`);
      } else {
        console.log(`  ✓ Updated`);
      }
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
