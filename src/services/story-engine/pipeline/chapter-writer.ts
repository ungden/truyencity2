/**
 * Story Engine v2 — Chapter Writer
 *
 * 3-agent workflow: Architect → Writer → Critic
 * Each agent is a single Gemini call with a specialized system prompt.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getStyleByGenre, buildTitleRulesPrompt } from '../config';
import type {
  WriteChapterResult, ChapterOutline, CriticOutput,
  GenreType, GeminiConfig,
} from '../types';

// ── System Prompts ───────────────────────────────────────────────────────────

const ARCHITECT_SYSTEM = `Bạn là ARCHITECT AGENT — chuyên gia lên kế hoạch chương truyện dài kỳ tiếng Việt.

NHIỆM VỤ: Tạo blueprint chi tiết cho 1 chương.

QUY TẮC:
1. Pacing theo "ức chế → bùng nổ" — mỗi chương ít nhất 1 khoảnh khắc sảng khoái
2. TỐI THIỂU 4-5 scenes, mỗi scene có mục tiêu + xung đột rõ ràng
3. Consistency tuyệt đối với context (nhân vật, sức mạnh, vị trí)
4. Cliffhanger cuối chương — tạo lý do đọc tiếp
5. Nếu có cliffhanger từ chương trước → PHẢI giải quyết ngay đầu chương

OUTPUT: JSON theo format ChapterOutline.`;

const WRITER_SYSTEM = `Bạn là WRITER AGENT — nhà văn chuyên nghiệp viết truyện dài kỳ tiếng Việt.

PHONG CÁCH: Chi tiết sống động. KHÔNG BAO GIỜ tóm tắt — luôn SHOW, don't tell.

FORMAT ĐỐI THOẠI: Dấu gạch ngang dài (—) đầu dòng mới. Mỗi lời thoại 1 dòng riêng.

QUY TẮC:
- KHÔNG dùng markdown (**, ##, etc). Văn xuôi thuần túy.
- PHẢI đủ số từ yêu cầu. Nếu thiếu → viết thêm scenes.
- Mỗi scene cần: mô tả bối cảnh + hành động + nội tâm + đối thoại.
- KHÔNG lặp lại từ/cụm từ. Đa dạng từ vựng.
- Tiếng Việt tự nhiên: dùng thành ngữ, xưng hô đúng vai vế.
- Thuật ngữ Hán-Việt khi cần thiết (tu tiên, kiếm hiệp).
- KHÔNG viết "Cliffhanger:" hay bất kỳ chỉ dẫn bằng tiếng Anh nào.`;

const CRITIC_SYSTEM = `Bạn là CRITIC AGENT — biên tập viên nghiêm khắc đánh giá chất lượng.

TIÊU CHÍ ĐÁNH GIÁ (thang 1-10):
1. overallScore: Tổng thể
2. dopamineScore: Có khoảnh khắc sảng khoái?
3. pacingScore: Nhịp truyện hợp lý?

ISSUES: Liệt kê vấn đề (pacing/consistency/dopamine/quality/word_count/dialogue)

VERDICT:
- APPROVE (overallScore >= 6 VÀ đủ từ): approved=true, requiresRewrite=false
- REVISE (4-5): approved=false, requiresRewrite=false
- REWRITE (<=3 HOẶC <60% target words): approved=false, requiresRewrite=true, kèm rewriteInstructions

OUTPUT: JSON theo format CriticOutput.`;

// ── Write Chapter ────────────────────────────────────────────────────────────

export async function writeChapter(
  chapterNumber: number,
  contextString: string,
  genre: GenreType,
  targetWordCount: number,
  previousTitles: string[],
  config: GeminiConfig,
  maxRetries: number = 3,
): Promise<WriteChapterResult> {
  const startTime = Date.now();
  const style = getStyleByGenre(genre);
  let rewriteInstructions = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Step 1: Architect
    const outline = await runArchitect(chapterNumber, contextString, targetWordCount, previousTitles, rewriteInstructions, config);

    // Step 2: Writer
    let content = await runWriter(outline, contextString, style, targetWordCount, config);

    // Request continuation if truncated
    const wordCount = countWords(content);
    if (wordCount < targetWordCount * 0.7) {
      const continuation = await requestContinuation(content, outline, targetWordCount, config);
      if (continuation) content = content + '\n\n' + continuation;
    }

    // Clean content
    content = cleanContent(content);
    const finalWordCount = countWords(content);

    // Step 3: Critic
    const critic = await runCritic(outline, content, targetWordCount, config);

    if (critic.requiresRewrite && attempt < maxRetries - 1) {
      rewriteInstructions = critic.rewriteInstructions || 'Cải thiện chất lượng tổng thể.';
      continue;
    }

    // Extract title
    const title = extractTitle(content, chapterNumber, outline.title, previousTitles);

    return {
      chapterNumber,
      title,
      content,
      wordCount: finalWordCount,
      qualityScore: critic.overallScore,
      criticReport: critic,
      duration: Date.now() - startTime,
    };
  }

  throw new Error(`Chapter ${chapterNumber}: all ${maxRetries} attempts failed`);
}

// ── Architect Agent ──────────────────────────────────────────────────────────

async function runArchitect(
  chapterNumber: number,
  context: string,
  targetWords: number,
  previousTitles: string[],
  rewriteInstructions: string,
  config: GeminiConfig,
): Promise<ChapterOutline> {
  const titleRules = buildTitleRulesPrompt(previousTitles);

  const prompt = `Lên kế hoạch cho CHƯƠNG ${chapterNumber}.

${context}

${titleRules}

Target: ${targetWords} từ. Tối thiểu 4-5 scenes.
${rewriteInstructions ? `\nYÊU CẦU SỬA: ${rewriteInstructions}` : ''}

Trả về JSON ChapterOutline:
{
  "chapterNumber": ${chapterNumber},
  "title": "tiêu đề hấp dẫn",
  "summary": "tóm tắt 2-3 câu",
  "pov": "tên nhân vật POV",
  "location": "địa điểm chính",
  "scenes": [{"order":1, "setting":"...", "characters":["..."], "goal":"...", "conflict":"...", "resolution":"...", "estimatedWords":500}],
  "tensionLevel": 7,
  "dopaminePoints": [{"type":"face_slap", "scene":1, "description":"...", "intensity":8}],
  "cliffhanger": "tình huống lơ lửng",
  "targetWordCount": ${targetWords}
}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 8192, systemPrompt: ARCHITECT_SYSTEM });
  const parsed = parseJSON<ChapterOutline>(res.content);

  return parsed || {
    chapterNumber,
    title: `Chương ${chapterNumber}`,
    summary: '',
    pov: '',
    location: '',
    scenes: [{ order: 1, setting: '', characters: [], goal: '', conflict: '', resolution: '', estimatedWords: targetWords }],
    tensionLevel: 5,
    dopaminePoints: [],
    cliffhanger: '',
    targetWordCount: targetWords,
  };
}

// ── Writer Agent ─────────────────────────────────────────────────────────────

async function runWriter(
  outline: ChapterOutline,
  context: string,
  style: ReturnType<typeof getStyleByGenre>,
  targetWords: number,
  config: GeminiConfig,
): Promise<string> {
  const styleGuide = [
    `Giọng văn: ${style.authorVoice}`,
    `Tỷ lệ đối thoại: ${style.dialogueRatio[0]}-${style.dialogueRatio[1]}%`,
    `Nhịp: ${style.pacingStyle}`,
    style.genreConventions.slice(0, 10).join('\n'),
  ].join('\n');

  const prompt = `Viết CHƯƠNG ${outline.chapterNumber}: "${outline.title}"

BLUEPRINT:
${JSON.stringify(outline, null, 2)}

CONTEXT:
${context}

PHONG CÁCH:
${styleGuide}

YÊU CẦU: Viết đầy đủ ${targetWords}+ từ. KHÔNG tóm tắt. Chi tiết từng scene.
BẮT ĐẦU VIẾT:`;

  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM });
  return res.content;
}

// ── Request Continuation ─────────────────────────────────────────────────────

async function requestContinuation(
  partialContent: string,
  outline: ChapterOutline,
  targetWords: number,
  config: GeminiConfig,
): Promise<string | null> {
  const currentWords = countWords(partialContent);
  const remaining = targetWords - currentWords;
  if (remaining < 300) return null;

  const prompt = `Tiếp tục viết phần còn lại. ĐÃ VIẾT ${currentWords} từ, CẦN THÊM ${remaining} từ.

NỘI DUNG ĐÃ VIẾT (500 từ cuối):
...${partialContent.slice(-2000)}

SCENES CÒN LẠI THEO BLUEPRINT:
${JSON.stringify(outline.scenes.slice(-3))}

TIẾP TỤC NGAY TỪ CHỖ DỪNG — không lặp lại phần đã viết:`;

  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM });
  return res.content || null;
}

// ── Critic Agent ─────────────────────────────────────────────────────────────

async function runCritic(
  outline: ChapterOutline,
  content: string,
  targetWords: number,
  config: GeminiConfig,
): Promise<CriticOutput> {
  const wordCount = countWords(content);
  const wordRatio = wordCount / targetWords;

  const prompt = `Đánh giá chương truyện.

BLUEPRINT: ${outline.title} — ${outline.scenes.length} scenes, target ${targetWords} từ
THỰC TẾ: ${wordCount} từ (${Math.round(wordRatio * 100)}% target)

NỘI DUNG:
${content.slice(0, 8000)}

Trả về JSON CriticOutput:
{
  "overallScore": 7,
  "dopamineScore": 7,
  "pacingScore": 7,
  "issues": [{"type":"word_count","severity":"major","description":"...","suggestion":"..."}],
  "approved": true,
  "requiresRewrite": false,
  "rewriteInstructions": ""
}

LƯU Ý: Nếu <60% target words → requiresRewrite=true.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 2048, systemPrompt: CRITIC_SYSTEM });
  const parsed = parseJSON<CriticOutput>(res.content);

  if (parsed) {
    // Hard enforce word count rule
    if (wordRatio < 0.6 && !parsed.requiresRewrite) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.rewriteInstructions = `Chỉ đạt ${wordCount}/${targetWords} từ (${Math.round(wordRatio * 100)}%). Cần viết đầy đủ hơn.`;
    }
    return parsed;
  }

  // Fallback: auto-approve if word count OK
  return {
    overallScore: wordRatio >= 0.8 ? 6 : 4,
    dopamineScore: 5,
    pacingScore: 5,
    issues: [],
    approved: wordRatio >= 0.7,
    requiresRewrite: wordRatio < 0.6,
    rewriteInstructions: wordRatio < 0.6 ? `Thiếu từ: ${wordCount}/${targetWords}` : undefined,
  };
}

// ── Content Cleaning ─────────────────────────────────────────────────────────

function cleanContent(content: string): string {
  let cleaned = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^(?:Scene|Cảnh|SCENE)\s*\d+\s*[:：]\s*/gm, '')
    .replace(/\bCliffhanger\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Strip repetition loops
  cleaned = cleaned.replace(/(\S+(?:\s+\S+){1,5}?)(?:\s+\1){2,}/g, '$1');
  cleaned = cleaned.replace(/(\S{2,})(?:\s+\1){2,}/g, '$1');

  return cleaned;
}

// ── Title Extraction ─────────────────────────────────────────────────────────

function extractTitle(
  content: string,
  chapterNumber: number,
  outlineTitle: string,
  previousTitles: string[],
): string {
  // Try outline title first
  if (outlineTitle && outlineTitle.length >= 4 && outlineTitle.length <= 60) {
    if (!previousTitles.slice(0, 20).includes(outlineTitle)) {
      return outlineTitle;
    }
  }

  // Try extracting from content
  const lines = content.split('\n').slice(0, 8);
  for (const line of lines) {
    const trimmed = line.trim();
    // Match "Chương N: Title" or "Chương N - Title"
    const match = trimmed.match(/^Chương\s+\d+\s*[:\-–—]\s*(.+)/i);
    if (match && match[1].length >= 4 && match[1].length <= 60) {
      return match[1].trim();
    }
  }

  // Fallback
  return outlineTitle || `Chương ${chapterNumber}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
