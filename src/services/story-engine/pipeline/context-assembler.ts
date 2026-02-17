/**
 * Story Engine v2 — Context Assembler
 *
 * Loads and assembles the 4-layer context from DB before writing a chapter.
 * Also handles post-write persistence (summary, synopsis, arc plan, bible).
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getGenreBoundaryText } from '../config';
import type {
  ContextPayload, ChapterSummary, GenreType, GeminiConfig,
} from '../types';

// ── Load Context ─────────────────────────────────────────────────────────────

export async function loadContext(
  projectId: string,
  novelId: string,
  chapterNumber: number,
): Promise<ContextPayload> {
  const db = getSupabase();
  const prevChapter = chapterNumber - 1;

  // Parallel DB queries
  const [
    bridgeResult,
    bibleResult,
    synopsisResult,
    recentResult,
    arcResult,
    titlesResult,
    openingsResult,
    cliffhangersResult,
    charStatesResult,
  ] = await Promise.all([
    // Layer 0: Chapter Bridge
    prevChapter > 0
      ? Promise.all([
          db.from('chapter_summaries').select('summary,mc_state,cliffhanger').eq('project_id', projectId).eq('chapter_number', prevChapter).maybeSingle(),
          db.from('chapters').select('content').eq('novel_id', novelId).eq('chapter_number', prevChapter).maybeSingle(),
        ])
      : Promise.resolve([{ data: null }, { data: null }] as const),
    // Layer 1: Story Bible
    db.from('ai_story_projects').select('story_bible').eq('id', projectId).maybeSingle(),
    // Layer 2: Synopsis
    db.from('story_synopsis').select('synopsis_text,mc_current_state,active_allies,active_enemies,open_threads,last_updated_chapter').eq('project_id', projectId).order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
    // Layer 3: Recent Chapters
    db.from('chapters').select('content,title,chapter_number').eq('novel_id', novelId).lt('chapter_number', chapterNumber).order('chapter_number', { ascending: false }).limit(15),
    // Layer 4: Arc Plan
    db.from('arc_plans').select('arc_number,start_chapter,end_chapter,arc_theme,plan_text,chapter_briefs,threads_to_advance,threads_to_resolve,new_threads').eq('project_id', projectId).order('arc_number', { ascending: false }).limit(1).maybeSingle(),
    // Anti-repetition: titles
    db.from('chapters').select('title').eq('novel_id', novelId).order('chapter_number', { ascending: false }).limit(500),
    // Anti-repetition: openings
    db.from('chapter_summaries').select('opening_sentence').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(50),
    // Anti-repetition: cliffhangers
    db.from('chapter_summaries').select('cliffhanger').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(10),
    // Character states
    db.from('character_states').select('character_name,status,power_level,power_realm_index,location,notes,chapter_number').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(50),
  ]);

  // Build payload
  const [summaryData, endingData] = bridgeResult as [{ data: any }, { data: any }];
  const bridge = summaryData?.data;
  const ending = endingData?.data;

  const bible = bibleResult?.data?.story_bible;
  const synopsis = synopsisResult?.data;
  const recentChapters = (recentResult?.data || []).reverse();
  const arc = arcResult?.data;

  // Deduplicate character states (latest per character)
  const charMap = new Map<string, any>();
  for (const cs of (charStatesResult?.data || [])) {
    if (!charMap.has(cs.character_name)) charMap.set(cs.character_name, cs);
  }
  const characters = [...charMap.values()];
  const aliveChars = characters.filter(c => c.status === 'alive');
  const deadChars = characters.filter(c => c.status === 'dead');

  let charText: string | undefined;
  if (characters.length > 0) {
    const parts: string[] = ['[NHÂN VẬT HIỆN TẠI — CẤM MÂU THUẪN]'];
    for (const c of aliveChars) {
      let line = `• ${c.character_name} (${c.status})`;
      if (c.power_level) line += ` — ${c.power_level}`;
      if (c.location) line += ` tại ${c.location}`;
      if (c.notes) line += ` | ${c.notes}`;
      parts.push(line);
    }
    if (deadChars.length > 0) {
      parts.push(`\nĐÃ CHẾT (KHÔNG ĐƯỢC XUẤT HIỆN): ${deadChars.map(c => c.character_name).join(', ')}`);
    }
    charText = parts.join('\n');
  }

  // Chapter brief from arc plan
  let chapterBrief: string | undefined;
  if (arc?.chapter_briefs && Array.isArray(arc.chapter_briefs)) {
    const brief = (arc.chapter_briefs as Array<{ chapterNumber: number; brief: string }>)
      .find(b => b.chapterNumber === chapterNumber);
    chapterBrief = brief?.brief;
  }

  return {
    previousSummary: bridge?.summary,
    previousMcState: bridge?.mc_state,
    previousCliffhanger: bridge?.cliffhanger,
    previousEnding: ending?.content ? ending.content.slice(-500) : undefined,
    storyBible: bible,
    hasStoryBible: !!bible,
    synopsis: synopsis?.synopsis_text,
    recentChapters: recentChapters.map((c: any) =>
      `[Ch.${c.chapter_number}: "${c.title}"]\n${(c.content || '').slice(0, 3000)}`
    ),
    arcPlan: arc?.plan_text,
    chapterBrief,
    previousTitles: (titlesResult?.data || []).map((t: any) => t.title).filter(Boolean),
    recentOpenings: (openingsResult?.data || []).map((o: any) => o.opening_sentence).filter(Boolean),
    recentCliffhangers: (cliffhangersResult?.data || []).map((c: any) => c.cliffhanger).filter(Boolean),
    characterStates: charText,
    genreBoundary: undefined, // set by orchestrator
    ragContext: undefined,    // set by orchestrator
    arcChapterSummaries: undefined, // loaded separately for synopsis generation
  };
}

// ── Assemble Context String ──────────────────────────────────────────────────

export function assembleContext(payload: ContextPayload, chapterNumber: number): string {
  const parts: string[] = [];

  // Layer 0: Chapter Bridge (highest priority)
  if (payload.previousCliffhanger || payload.previousSummary) {
    parts.push('[CẦU NỐI CHƯƠNG — BẮT BUỘC TUÂN THỦ]');
    if (payload.previousCliffhanger) {
      parts.push(`Cliffhanger chương trước: ${payload.previousCliffhanger}`);
      parts.push('→ PHẢI bắt đầu NGAY SAU tình huống này. KHÔNG skip, KHÔNG tóm tắt lại.');
    }
    if (payload.previousMcState) parts.push(`Trạng thái MC: ${payload.previousMcState}`);
    if (payload.previousSummary) parts.push(`Tóm tắt: ${payload.previousSummary}`);
    if (payload.previousEnding) parts.push(`300 ký tự cuối: ...${payload.previousEnding.slice(-300)}`);
  }

  // Character states
  if (payload.characterStates) parts.push(payload.characterStates);

  // Genre boundary
  if (payload.genreBoundary) parts.push(payload.genreBoundary);

  // RAG context
  if (payload.ragContext) parts.push(payload.ragContext);

  // Scalability modules
  if (payload.plotThreads) parts.push(payload.plotThreads);
  if (payload.beatGuidance) parts.push(payload.beatGuidance);
  if (payload.worldRules) parts.push(payload.worldRules);

  // Layer 1: Story Bible
  if (payload.storyBible) {
    parts.push('[STORY BIBLE]');
    parts.push(payload.storyBible.slice(0, 4000));
  }

  // Layer 2: Synopsis
  if (payload.synopsis) {
    parts.push('[TỔNG QUAN CỐT TRUYỆN]');
    parts.push(payload.synopsis.slice(0, 3000));
  }

  // Layer 3: Recent Chapters
  if (payload.recentChapters.length > 0) {
    parts.push(`[${payload.recentChapters.length} CHƯƠNG GẦN NHẤT]`);
    for (const ch of payload.recentChapters) {
      parts.push(ch);
    }
  }

  // Layer 4: Arc Plan
  if (payload.arcPlan) {
    parts.push('[KẾ HOẠCH ARC HIỆN TẠI]');
    parts.push(payload.arcPlan.slice(0, 3000));
    if (payload.chapterBrief) {
      parts.push(`[BRIEF CHO CHƯƠNG ${chapterNumber}]: ${payload.chapterBrief}`);
    }
  }

  // Anti-repetition
  if (payload.recentOpenings.length > 0) {
    parts.push(`[CÂU MỞ ĐẦU ĐÃ DÙNG — KHÔNG LẶP]: ${payload.recentOpenings.slice(0, 10).join(' | ')}`);
  }
  if (payload.recentCliffhangers.length > 0) {
    parts.push(`[CLIFFHANGER ĐÃ DÙNG — KHÔNG LẶP]: ${payload.recentCliffhangers.slice(0, 5).join(' | ')}`);
  }

  return parts.join('\n\n');
}

// ── Post-Write: Save Chapter Summary ─────────────────────────────────────────

export async function saveChapterSummary(
  projectId: string,
  chapterNumber: number,
  title: string,
  summary: ChapterSummary,
): Promise<void> {
  const db = getSupabase();
  await db.from('chapter_summaries').upsert({
    project_id: projectId,
    chapter_number: chapterNumber,
    title,
    summary: summary.summary,
    opening_sentence: summary.openingSentence,
    mc_state: summary.mcState,
    cliffhanger: summary.cliffhanger,
  }, { onConflict: 'project_id,chapter_number' });
}

// ── Post-Write: Generate Summary via AI ──────────────────────────────────────

export async function generateChapterSummary(
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
): Promise<ChapterSummary> {
  const prompt = `Tóm tắt chương truyện sau. Trả về JSON:
{
  "summary": "tóm tắt 2-3 câu",
  "openingSentence": "câu mở đầu chương (nguyên văn từ nội dung)",
  "mcState": "trạng thái ${protagonistName} cuối chương (cảnh giới, vị trí, tình trạng)",
  "cliffhanger": "tình huống chưa giải quyết cuối chương (hoặc rỗng)"
}

Chương ${chapterNumber}: "${title}"
${content.slice(0, 6000)}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.1, maxTokens: 1024 });
  const parsed = parseJSON<ChapterSummary>(res.content);

  return parsed || {
    summary: `Chương ${chapterNumber}: ${title}`,
    openingSentence: content.slice(0, 100),
    mcState: '',
    cliffhanger: '',
  };
}

// ── Post-Write: Generate Synopsis ────────────────────────────────────────────

export async function generateSynopsis(
  projectId: string,
  oldSynopsis: string | undefined,
  arcSummaries: Array<{ chapter_number: number; title: string; summary: string }>,
  genre: GenreType,
  protagonistName: string,
  lastChapter: number,
  config: GeminiConfig,
): Promise<void> {
  const summaryText = arcSummaries
    .map(s => `Ch.${s.chapter_number} "${s.title}": ${s.summary}`)
    .join('\n');

  const prompt = `Bạn là biên tập viên truyện ${genre}. Viết TỔNG QUAN CỐT TRUYỆN cập nhật.

${oldSynopsis ? `Synopsis cũ:\n${oldSynopsis}\n\n` : ''}Các chương mới:\n${summaryText}

Trả về JSON:
{
  "synopsis_text": "tổng quan 500-800 từ, bao gồm tất cả sự kiện quan trọng",
  "mc_current_state": "trạng thái hiện tại của ${protagonistName}",
  "active_allies": ["danh sách đồng minh"],
  "active_enemies": ["danh sách kẻ thù"],
  "open_threads": ["các tuyến truyện đang mở"]
}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 2048 });
  const parsed = parseJSON<any>(res.content);
  if (!parsed) return;

  const db = getSupabase();
  await db.from('story_synopsis').upsert({
    project_id: projectId,
    synopsis_text: parsed.synopsis_text || '',
    mc_current_state: parsed.mc_current_state || '',
    active_allies: parsed.active_allies || [],
    active_enemies: parsed.active_enemies || [],
    open_threads: parsed.open_threads || [],
    last_updated_chapter: lastChapter,
  }, { onConflict: 'project_id' });
}

// ── Post-Write: Generate Arc Plan ────────────────────────────────────────────

export async function generateArcPlan(
  projectId: string,
  arcNumber: number,
  genre: GenreType,
  protagonistName: string,
  synopsis: string | undefined,
  storyBible: string | undefined,
  totalPlanned: number,
  config: GeminiConfig,
): Promise<void> {
  const startChapter = (arcNumber - 1) * 20 + 1;
  const endChapter = Math.min(arcNumber * 20, totalPlanned);

  const prompt = `Bạn là Story Architect cho truyện ${genre}.

${synopsis ? `TỔNG QUAN:\n${synopsis}\n\n` : ''}${storyBible ? `STORY BIBLE:\n${storyBible.slice(0, 2000)}\n\n` : ''}
Lập kế hoạch ARC ${arcNumber} (chương ${startChapter}-${endChapter}) cho ${protagonistName}.
Tổng dự kiến: ${totalPlanned} chương.

Trả về JSON:
{
  "arc_theme": "foundation|conflict|growth|...",
  "plan_text": "mô tả arc 300-500 từ",
  "chapter_briefs": [{"chapterNumber": ${startChapter}, "brief": "brief ngắn"}...],
  "threads_to_advance": ["thread cần đẩy"],
  "threads_to_resolve": ["thread cần giải quyết"],
  "new_threads": ["thread mới"]
}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 4096 });
  const parsed = parseJSON<any>(res.content);
  if (!parsed) return;

  const db = getSupabase();
  await db.from('arc_plans').upsert({
    project_id: projectId,
    arc_number: arcNumber,
    start_chapter: startChapter,
    end_chapter: endChapter,
    arc_theme: parsed.arc_theme || 'growth',
    plan_text: parsed.plan_text || '',
    chapter_briefs: parsed.chapter_briefs || [],
    threads_to_advance: parsed.threads_to_advance || [],
    threads_to_resolve: parsed.threads_to_resolve || [],
    new_threads: parsed.new_threads || [],
  }, { onConflict: 'project_id,arc_number' });
}

// ── Post-Write: Generate/Refresh Story Bible ─────────────────────────────────

export async function generateStoryBible(
  projectId: string,
  genre: GenreType,
  protagonistName: string,
  worldDescription: string,
  firstChapters: string[],
  config: GeminiConfig,
): Promise<void> {
  const chapterText = firstChapters.slice(0, 3).map((c, i) => `Ch.${i + 1}:\n${c.slice(0, 3000)}`).join('\n\n');

  const prompt = `Phân tích các chương đầu của truyện ${genre} và tạo STORY BIBLE.

Thế giới: ${worldDescription}
Nhân vật chính: ${protagonistName}

${chapterText}

Viết Story Bible bao gồm:
1. Hệ thống thế giới (tu luyện/phép thuật/công nghệ)
2. Nhân vật chính: tính cách, mục tiêu, sức mạnh
3. Nhân vật phụ quan trọng
4. Quy tắc thế giới (KHÔNG được vi phạm)
5. Phong cách viết (giọng văn, xưng hô)
6. Bối cảnh chính

Viết dạng text thuần, 800-1500 từ.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 4096 });
  if (!res.content || res.content.length < 100) return;

  const db = getSupabase();
  await db.from('ai_story_projects').update({ story_bible: res.content }).eq('id', projectId);
}
