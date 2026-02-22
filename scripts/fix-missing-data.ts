/**
 * Fix Missing Data Script
 * 
 * Fixes 3 issues:
 * 1. Generate story_outline for 169 projects missing it
 * 2. Generate master_outline for 1 project missing it
 * 3. Generate cover for 1 novel missing it
 * 
 * Usage: npx tsx scripts/fix-missing-data.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function callGemini(prompt: string, systemPrompt?: string, maxTokens = 4096): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(3000 * attempt);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });

      if (res.status === 429 || res.status === 503) {
        console.log(`  Rate limited (${res.status}), retrying in ${3 * (attempt + 1)}s...`);
        await sleep(5000 * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const content = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
      return content;
    } catch (e) {
      if (attempt >= 2) throw e;
    }
  }
  throw new Error('All retries failed');
}

function extractJSON(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();
  return text.trim();
}

function parseJSON<T>(text: string): T | null {
  const raw = extractJSON(text);
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Attempt repair
    try {
      const repaired = repairJSON(raw);
      return JSON.parse(repaired) as T;
    } catch {
      return null;
    }
  }
}

function repairJSON(input: string): string {
  let s = input.trim();
  // Fix odd quotes
  if ((s.match(/"/g) || []).length % 2 !== 0) {
    s += '"';
  }
  // Remove trailing partial key-value
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/g, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/,\s*$/, '');
  // Count and close brackets
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
  for (let i = 0; i < brackets; i++) s += ']';
  for (let i = 0; i < braces; i++) s += '}';
  return s;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Fix 1: Generate story_outline ────────────────────────────────────────────

interface StoryOutline {
  id: string;
  title: string;
  genre: string;
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
    description: string;
    targetArc: number;
    type: string;
    importance: string;
  }>;
  endingVision: string;
  uniqueHooks: string[];
}

async function generateStoryOutline(project: {
  id: string;
  genre: string;
  main_character: string;
  world_description: string;
  total_planned_chapters: number;
  novel_title: string;
  novel_description: string;
}): Promise<StoryOutline | null> {
  const targetChapters = project.total_planned_chapters || 1500;
  const chaptersPerArc = 20;
  const targetArcs = Math.ceil(targetChapters / chaptersPerArc);

  const prompt = `Tạo dàn ý tổng thể cho truyện:

TITLE: ${project.novel_title}
GENRE: ${project.genre}
PROTAGONIST: ${project.main_character}
PREMISE: ${project.novel_description?.substring(0, 500) || project.world_description?.substring(0, 500)}

TARGET: ${targetChapters} chương, ${targetArcs} arcs (mỗi arc ~${chaptersPerArc} chương)

Trả về JSON:
{
  "id": "story_${Date.now()}",
  "title": "${project.novel_title}",
  "genre": "${project.genre}",
  "premise": "Mô tả premise 2-3 câu hấp dẫn",
  "themes": ["theme1", "theme2", "theme3"],
  "mainConflict": "Xung đột chính xuyên suốt truyện",
  "targetChapters": ${targetChapters},
  "targetArcs": ${targetArcs},
  "protagonist": {
    "name": "${project.main_character}",
    "startingState": "Trạng thái ban đầu",
    "endGoal": "Mục tiêu cuối cùng",
    "characterArc": "Hành trình phát triển"
  },
  "majorPlotPoints": [
    {"id": "pp1", "name": "Khởi đầu", "description": "...", "targetArc": 1, "type": "inciting_incident", "importance": "critical"},
    {"id": "pp2", "name": "Rising Action 1", "description": "...", "targetArc": ${Math.ceil(targetArcs * 0.2)}, "type": "rising_action", "importance": "major"},
    {"id": "pp3", "name": "Midpoint", "description": "...", "targetArc": ${Math.ceil(targetArcs / 2)}, "type": "midpoint", "importance": "critical"},
    {"id": "pp4", "name": "Rising Action 2", "description": "...", "targetArc": ${Math.ceil(targetArcs * 0.7)}, "type": "rising_action", "importance": "major"},
    {"id": "pp5", "name": "Climax", "description": "...", "targetArc": ${targetArcs - 1}, "type": "climax", "importance": "critical"},
    {"id": "pp6", "name": "Resolution", "description": "...", "targetArc": ${targetArcs}, "type": "resolution", "importance": "critical"}
  ],
  "endingVision": "Kết thúc như thế nào",
  "uniqueHooks": ["Hook 1", "Hook 2", "Hook 3"]
}`;

  const systemPrompt = `Bạn là STORY ARCHITECT - chuyên gia lên kế hoạch webnovel.

NHIỆM VỤ: Tạo dàn ý tổng thể cho toàn bộ truyện, đảm bảo:
1. Premise hấp dẫn, hook reader từ đầu
2. Character arc rõ ràng cho nhân vật chính
3. Main conflict escalate đúng tempo
4. Major plot points phân bố đều
5. Ending vision thỏa mãn

OUTPUT: JSON với story outline đầy đủ. CHỈ trả về JSON, không thêm text.`;

  const content = await callGemini(prompt, systemPrompt, 4096);
  return parseJSON<StoryOutline>(content);
}

// ── Fix 2: Generate master_outline ───────────────────────────────────────────

interface MasterOutline {
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

async function generateMasterOutline(project: {
  id: string;
  genre: string;
  total_planned_chapters: number;
  novel_title: string;
  novel_description: string;
}): Promise<MasterOutline | null> {
  const totalChapters = project.total_planned_chapters || 1500;

  const prompt = `Bạn là Trưởng Biên Tập (Chief Editor) chuyên quy hoạch Đại cương truyện dài kỳ (Master Outline) cho một bộ Webnovel Trung Quốc.

Nhiệm vụ của bạn là quy hoạch lộ trình tổng thể cho bộ truyện: "${project.novel_title}"
Thể loại: ${project.genre}
Độ dài dự kiến: ${totalChapters} chương
Tóm tắt ý tưởng gốc (Synopsis): ${project.novel_description?.substring(0, 500)}

Hãy lập ra Master Outline bao gồm mục tiêu tối thượng, Kẻ thù/Trùm cuối, Lộ trình di chuyển (Bản đồ) và chia nhỏ thành các Đại Cốt Truyện (Major Arcs) từ chương 1 đến chương ${totalChapters}.

Trả về ĐÚNG định dạng JSON sau:
{
  "mainPlotline": "Mục tiêu tối thượng xuyên suốt truyện của MC",
  "finalBossOrGoal": "Kẻ thù cuối cùng hoặc Cảnh giới tối cao",
  "worldMapProgression": ["Tân thủ thôn", "Học viện", "Kinh thành", "Vực ngoại", "Thần giới"],
  "majorArcs": [
    {
      "arcName": "Tên Arc",
      "startChapter": 1,
      "endChapter": 100,
      "description": "Nội dung chính",
      "keyMilestone": "Thành tựu MC đạt được"
    }
  ]
}

Quy tắc:
1. Độ dài mỗi Arc từ 50-200 chương. endChapter Arc cuối = ${totalChapters}.
2. worldMapProgression tương ứng với tiến cấp MC.
3. Không lan man, tập trung plot chính.
CHỈ trả về JSON.`;

  const content = await callGemini(prompt, 'Bạn là Master Architect chuyên lập Đại cương tổng thể cho tiểu thuyết mạng.', 2048);
  return parseJSON<MasterOutline>(content);
}

// ── Fix 3: Generate cover ────────────────────────────────────────────────────

async function generateCoverForNovel(novel: {
  id: string;
  title: string;
  description: string;
  genres: string[];
  cover_prompt: string | null;
}): Promise<string | null> {
  // Use existing cover_prompt or build one
  const prompt = novel.cover_prompt || buildCoverPrompt(novel.title, novel.genres?.[0] || 'fantasy', novel.description);

  console.log('  Generating cover image via Gemini...');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '3:4',
      },
    },
  };

  const url = `${API_BASE}/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('  Cover generation failed:', res.status, errText.slice(0, 200));
    return null;
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];

  // Find image part
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) {
    console.error('  No image in response');
    return null;
  }

  // Upload to Supabase Storage
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const mimeType = imagePart.inlineData.mimeType;
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const filename = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('covers')
    .upload(filename, imageBuffer, { contentType: mimeType });

  if (uploadError) {
    console.error('  Upload failed:', uploadError.message);
    return null;
  }

  const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(filename);
  return publicUrl.publicUrl;
}

function buildCoverPrompt(title: string, genre: string, description: string): string {
  return `A photo of a glossy, design-forward webnovel book cover.
Genre: ${genre}.
Story description: ${description?.substring(0, 300)}
Title text must be exactly: "${title}". Place at the top-center in large bold serif font, high contrast, perfectly readable.
At the bottom-center, include small text: "Truyencity.com"
No other text besides the title and Truyencity.com.
Vertical 3:4 composition, cinematic lighting, high-detail illustration, premium publishing quality.
No watermark, no signature, no logos besides Truyencity.com.`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('=== FIX MISSING DATA SCRIPT ===');
  console.log('Started:', new Date().toISOString());
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // FIX 1: story_outline for projects missing it
  // ──────────────────────────────────────────────────────────────────────────
  console.log('━━━ FIX 1: Generate story_outline ━━━');

  const { data: missingOutlineProjects } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, genre, main_character, world_description, total_planned_chapters')
    .is('story_outline', null);

  if (!missingOutlineProjects || missingOutlineProjects.length === 0) {
    console.log('All projects already have story_outline!');
  } else {
    console.log(`Found ${missingOutlineProjects.length} projects missing story_outline`);

    // Get novel titles/descriptions
    const novelIds = missingOutlineProjects.map(p => p.novel_id).filter(Boolean);
    const { data: novels } = await supabase
      .from('novels')
      .select('id, title, description')
      .in('id', novelIds);

    const novelMap = new Map((novels || []).map(n => [n.id, n]));

    let success = 0;
    let failed = 0;
    const BATCH_SIZE = 5;  // Process in batches to avoid rate limits

    for (let i = 0; i < missingOutlineProjects.length; i += BATCH_SIZE) {
      const batch = missingOutlineProjects.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (project) => {
        const novel = novelMap.get(project.novel_id);
        const title = novel?.title || 'Unknown';

        try {
          const outline = await generateStoryOutline({
            id: project.id,
            genre: project.genre,
            main_character: project.main_character,
            world_description: project.world_description,
            total_planned_chapters: project.total_planned_chapters,
            novel_title: title,
            novel_description: novel?.description || '',
          });

          if (!outline) {
            console.log(`  [FAIL] ${title.substring(0, 40)} - parse error`);
            failed++;
            return;
          }

          const { error } = await supabase
            .from('ai_story_projects')
            .update({ story_outline: outline as any })
            .eq('id', project.id);

          if (error) {
            console.log(`  [FAIL] ${title.substring(0, 40)} - DB error: ${error.message}`);
            failed++;
          } else {
            success++;
          }
        } catch (e) {
          console.log(`  [FAIL] ${title.substring(0, 40)} - ${e instanceof Error ? e.message : 'unknown'}`);
          failed++;
        }
      });

      await Promise.all(promises);
      
      const total = Math.min(i + BATCH_SIZE, missingOutlineProjects.length);
      console.log(`  Progress: ${total}/${missingOutlineProjects.length} (${success} ok, ${failed} fail)`);

      // Rate limit pause between batches
      if (i + BATCH_SIZE < missingOutlineProjects.length) {
        await sleep(2000);
      }
    }

    console.log(`  DONE: ${success} success, ${failed} failed out of ${missingOutlineProjects.length}`);
  }
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // FIX 2: master_outline for 1 project missing it
  // ──────────────────────────────────────────────────────────────────────────
  console.log('━━━ FIX 2: Generate master_outline ━━━');

  const { data: missingMasterProjects } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, genre, total_planned_chapters')
    .is('master_outline', null);

  if (!missingMasterProjects || missingMasterProjects.length === 0) {
    console.log('All projects already have master_outline!');
  } else {
    console.log(`Found ${missingMasterProjects.length} projects missing master_outline`);

    for (const project of missingMasterProjects) {
      const { data: novel } = await supabase
        .from('novels')
        .select('title, description')
        .eq('id', project.novel_id)
        .single();

      const title = novel?.title || 'Unknown';
      console.log(`  Generating for: ${title.substring(0, 50)}`);

      try {
        const outline = await generateMasterOutline({
          id: project.id,
          genre: project.genre,
          total_planned_chapters: project.total_planned_chapters,
          novel_title: title,
          novel_description: novel?.description || '',
        });

        if (!outline) {
          console.log(`  [FAIL] Parse error`);
          continue;
        }

        const { error } = await supabase
          .from('ai_story_projects')
          .update({ master_outline: outline as any })
          .eq('id', project.id);

        if (error) {
          console.log(`  [FAIL] DB error: ${error.message}`);
        } else {
          console.log(`  [OK] master_outline saved (${outline.majorArcs?.length} arcs)`);
        }
      } catch (e) {
        console.log(`  [FAIL] ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
  }
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // FIX 3: Generate cover for novel missing it
  // ──────────────────────────────────────────────────────────────────────────
  console.log('━━━ FIX 3: Generate missing covers ━━━');

  const { data: missingCoverNovels } = await supabase
    .from('novels')
    .select('id, title, description, genres, cover_prompt')
    .is('cover_url', null);

  if (!missingCoverNovels || missingCoverNovels.length === 0) {
    console.log('All novels already have covers!');
  } else {
    console.log(`Found ${missingCoverNovels.length} novels missing covers`);

    for (const novel of missingCoverNovels) {
      console.log(`  Generating cover for: ${novel.title.substring(0, 50)}`);

      try {
        const coverUrl = await generateCoverForNovel(novel);

        if (!coverUrl) {
          console.log(`  [FAIL] No image generated`);
          continue;
        }

        const { error } = await supabase
          .from('novels')
          .update({ cover_url: coverUrl })
          .eq('id', novel.id);

        if (error) {
          console.log(`  [FAIL] DB error: ${error.message}`);
        } else {
          console.log(`  [OK] Cover saved: ${coverUrl.substring(0, 80)}...`);
        }
      } catch (e) {
        console.log(`  [FAIL] ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
  }
  console.log('');

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('━━━ COMPLETE ━━━');
  console.log(`Total time: ${elapsed}s`);
  console.log('Done:', new Date().toISOString());
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
