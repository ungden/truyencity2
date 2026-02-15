/**
 * Story Writing Factory - Context Generators
 *
 * AI-powered generators for the 4-layer context system:
 * 1. Synopsis Generator — rolling synopsis updated every 20 chapters
 * 2. Arc Planner — detailed 20-chapter arc plan
 * 3. Story Bible Generator — world/character reference from first chapters
 * 4. Chapter Summarizer — per-chapter summary after writing
 *
 * All generators use Gemini 3 Flash Preview (1M context, free).
 */

import { AIProviderService } from '../ai-provider';
import {
  saveSynopsis,
  saveArcPlan,
  saveStoryBible,
  SynopsisData,
  ArcPlanData,
  ChapterSummaryRow,
  RecentChapter,
} from './context-loader';
import { GenreType } from './types';
import { logger } from '@/lib/security/logger';

// ============================================================================
// SHARED
// ============================================================================

const MODEL = 'gemini-3-flash-preview';
const PROVIDER = 'gemini' as const;

async function aiCall(
  aiService: AIProviderService,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096,
  temperature: number = 0.5,
): Promise<string> {
  const result = await aiService.chat({
    provider: PROVIDER,
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    maxTokens,
  });

  if (!result.content) {
    throw new Error('AI returned empty response');
  }
  return result.content;
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJSON(text: string): string {
  // Remove markdown code blocks
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return cleaned;
  return cleaned.slice(start, end + 1);
}

// ============================================================================
// 1. SYNOPSIS GENERATOR
// ============================================================================

/**
 * Generate a rolling synopsis from the old synopsis + last arc's chapter summaries.
 * Called at arc boundaries (chapter % 20 == 1).
 */
export async function generateSynopsis(
  aiService: AIProviderService,
  projectId: string,
  oldSynopsis: SynopsisData | null,
  arcChapterSummaries: ChapterSummaryRow[],
  genre: GenreType,
  protagonistName: string,
  lastChapterNumber: number,
): Promise<void> {
  if (arcChapterSummaries.length === 0 && !oldSynopsis) {
    return; // Nothing to summarize yet
  }

  const oldSynopsisText = oldSynopsis
    ? `TÓM TẮT CŨ (đến chương ${oldSynopsis.lastUpdatedChapter}):\n${oldSynopsis.synopsisText}\n\nMC: ${oldSynopsis.mcCurrentState || 'N/A'}\nĐồng minh: ${oldSynopsis.activeAllies.join(', ') || 'N/A'}\nKẻ thù: ${oldSynopsis.activeEnemies.join(', ') || 'N/A'}\nTuyến mở: ${oldSynopsis.openThreads.join(' | ') || 'N/A'}`
    : 'Chưa có tóm tắt trước đó (đây là arc đầu tiên).';

  const summariesText = arcChapterSummaries.length > 0
    ? arcChapterSummaries.map(s =>
      `Ch.${s.chapterNumber} "${s.title}": ${s.summary}${s.mcState ? ` [MC: ${s.mcState}]` : ''}${s.cliffhanger ? ` [Cliffhanger: ${s.cliffhanger}]` : ''}`
    ).join('\n')
    : 'Không có chapter summaries cho arc vừa rồi.';

  const systemPrompt = `Bạn là chuyên gia tóm tắt tiểu thuyết ${genre} dài kỳ. Nhiệm vụ: viết TÓM TẮT CỐT TRUYỆN ngắn gọn nhưng đầy đủ, bao gồm mọi sự kiện quan trọng, nhân vật, mối quan hệ.

QUAN TRỌNG:
- Tóm tắt TOÀN BỘ câu chuyện từ đầu đến hiện tại, KHÔNG chỉ arc mới
- Giữ lại TẤT CẢ tên nhân vật, địa điểm, sự kiện quan trọng
- Ghi rõ trạng thái hiện tại của MC (cảnh giới, vị trí, mục tiêu)
- Liệt kê tuyến truyện còn mở (chưa giải quyết)
- Tối đa 2000 từ cho synopsis, ngắn gọn súc tích`;

  const userPrompt = `Nhân vật chính: ${protagonistName}
Thể loại: ${genre}

${oldSynopsisText}

TÓM TẮT CÁC CHƯƠNG MỚI (arc vừa kết thúc):
${summariesText}

Hãy viết TÓM TẮT TỔNG HỢP mới kết hợp tóm tắt cũ + nội dung mới.

Trả về JSON:
{
  "synopsis_text": "Tóm tắt toàn bộ câu chuyện từ đầu đến chương ${lastChapterNumber}...",
  "mc_current_state": "Trạng thái hiện tại của ${protagonistName}: cảnh giới, vị trí, mục tiêu trước mắt",
  "active_allies": ["Tên đồng minh 1", "Tên đồng minh 2"],
  "active_enemies": ["Tên kẻ thù 1", "Tên kẻ thù 2"],
  "open_threads": ["Tuyến truyện chưa giải quyết 1", "Tuyến truyện chưa giải quyết 2"]
}`;

  try {
    const raw = await aiCall(aiService, systemPrompt, userPrompt, 6144, 0.3);
    const json = JSON.parse(extractJSON(raw));

    await saveSynopsis(
      projectId,
      json.synopsis_text || raw,
      json.mc_current_state || null,
      json.active_allies || [],
      json.active_enemies || [],
      json.open_threads || [],
      lastChapterNumber,
    );

    logger.debug('Synopsis generated', { projectId, lastChapterNumber });
  } catch (e) {
    logger.debug('Synopsis generation failed', { projectId, error: e });
    // Non-fatal: continue without updated synopsis
  }
}

// ============================================================================
// 2. ARC PLANNER
// ============================================================================

/**
 * Generate a detailed 20-chapter arc plan.
 * Called at arc boundaries (chapter % 20 == 1).
 */
export async function generateArcPlan(
  aiService: AIProviderService,
  projectId: string,
  arcNumber: number,
  genre: GenreType,
  protagonistName: string,
  synopsis: SynopsisData | null,
  storyBible: string | null,
  totalPlannedChapters: number,
): Promise<void> {
  const startChapter = (arcNumber - 1) * 20 + 1;
  const endChapter = arcNumber * 20;
  const isFirstArc = arcNumber === 1;
  const isFinalArc = endChapter >= totalPlannedChapters;
  const remainingChapters = totalPlannedChapters - startChapter + 1;

  const contextParts: string[] = [];

  if (storyBible) {
    contextParts.push(`STORY BIBLE:\n${storyBible}`);
  }

  if (synopsis) {
    contextParts.push(`TÓM TẮT CỐT TRUYỆN (đến ch.${synopsis.lastUpdatedChapter}):\n${synopsis.synopsisText}\n\nMC: ${synopsis.mcCurrentState || 'N/A'}\nTuyến mở: ${synopsis.openThreads.join(' | ') || 'N/A'}`);
  }

  const phaseGuidance = isFirstArc
    ? 'ARC MỞ ĐẦU: Giới thiệu MC, thế giới, xung đột chính. Hook mạnh, worldbuilding hấp dẫn.'
    : isFinalArc
    ? `ARC KẾT THÚC (còn ~${remainingChapters} chương): Giải quyết TẤT CẢ tuyến truyện, climax lớn nhất, kết cục thỏa mãn.`
    : `ARC GIỮA (${arcNumber}/${Math.ceil(totalPlannedChapters / 20)}): Phát triển nhân vật, escalate xung đột, mở tuyến truyện mới.`;

  const systemPrompt = `Bạn là chuyên gia lên kế hoạch tiểu thuyết ${genre} dài kỳ. Nhiệm vụ: tạo KẾ HOẠCH CHI TIẾT cho 20 chương tiếp theo.

NGUYÊN TẮC:
- Mỗi chương phải có mục đích rõ ràng trong arc tổng thể
- Tension curve: tăng dần, climax ở ~chương 15-17, resolution ở 18-20
- Xen kẽ action/dialogue/reflection, KHÔNG đơn điệu
- Plant foreshadowing sớm, harvest muộn
- Mỗi arc phải có ít nhất 1 twist bất ngờ
- ${phaseGuidance}`;

  const userPrompt = `${contextParts.join('\n\n')}

Nhân vật chính: ${protagonistName}
Arc ${arcNumber}: Chương ${startChapter} đến ${endChapter}
Tổng số chương dự kiến: ${totalPlannedChapters}

Hãy tạo kế hoạch arc chi tiết. Trả về JSON:
{
  "arc_theme": "Chủ đề chính của arc này (1 câu)",
  "plan_text": "Mô tả tổng quan arc: mở đầu, phát triển, climax, kết thúc. Liệt kê các sự kiện chính, nhân vật mới, địa điểm mới. 300-500 từ.",
  "chapter_briefs": {
    "${startChapter}": "Brief chương ${startChapter}: ...",
    "${startChapter + 1}": "Brief chương ${startChapter + 1}: ...",
    "${startChapter + 2}": "Brief chương ${startChapter + 2}: ..."
  },
  "threads_to_advance": ["Tuyến truyện cần tiến triển trong arc này"],
  "threads_to_resolve": ["Tuyến truyện cần giải quyết xong trong arc này"],
  "new_threads": ["Tuyến truyện mới mở trong arc này"]
}

LƯU Ý: chapter_briefs phải có ĐỦ 20 entries (từ ${startChapter} đến ${endChapter}).`;

  try {
    const raw = await aiCall(aiService, systemPrompt, userPrompt, 8192, 0.6);
    const json = JSON.parse(extractJSON(raw));

    await saveArcPlan(
      projectId,
      arcNumber,
      startChapter,
      endChapter,
      json.arc_theme || null,
      json.plan_text || raw,
      json.chapter_briefs || null,
      json.threads_to_advance || [],
      json.threads_to_resolve || [],
      json.new_threads || [],
    );

    logger.debug('Arc plan generated', { projectId, arcNumber });
  } catch (e) {
    logger.debug('Arc plan generation failed', { projectId, arcNumber, error: e });
  }
}

// ============================================================================
// 3. STORY BIBLE GENERATOR
// ============================================================================

/**
 * Generate a story bible from the first N chapters + world_description.
 * Called once after chapter 3 is written (or on first arc boundary if missing).
 */
export async function generateStoryBible(
  aiService: AIProviderService,
  projectId: string,
  genre: GenreType,
  protagonistName: string,
  worldDescription: string,
  firstChapters: RecentChapter[],
): Promise<void> {
  if (firstChapters.length === 0) return;

  const chaptersText = firstChapters
    .map(ch => `--- Chương ${ch.chapterNumber}: ${ch.title} ---\n${ch.content}`)
    .join('\n\n');

  const systemPrompt = `Bạn là chuyên gia phân tích tiểu thuyết ${genre}. Nhiệm vụ: tạo STORY BIBLE (tài liệu tham khảo) từ các chương đầu tiên.

STORY BIBLE bao gồm:
1. THẾ GIỚI: Bối cảnh, địa lý, hệ thống sức mạnh, quy tắc, tổ chức
2. NHÂN VẬT CHÍNH: Tên, tính cách, ngoại hình, sức mạnh, động lực, bí mật
3. NHÂN VẬT PHỤ: Tên, vai trò, mối quan hệ với MC, tính cách nổi bật
4. XUNG ĐỘT: Xung đột chính, xung đột phụ, kẻ thù
5. QUY TẮC QUAN TRỌNG: Những gì KHÔNG BAO GIỜ được mâu thuẫn (số lượng, cấp bậc, giới hạn)
6. GIỌNG VĂN: Phong cách viết, tone, đặc trưng ngôn ngữ

QUAN TRỌNG:
- Chỉ ghi những gì ĐÃ ĐƯỢC THIẾT LẬP trong các chương
- KHÔNG thêm thông tin tưởng tượng
- Tối đa 1500 từ, súc tích`;

  const userPrompt = `Thế giới ban đầu: ${worldDescription}
Nhân vật chính: ${protagonistName}
Thể loại: ${genre}

NỘI DUNG CÁC CHƯƠNG ĐẦU:
${chaptersText}

Hãy phân tích và tạo STORY BIBLE. Viết dạng text thuần (không JSON), có heading rõ ràng.`;

  try {
    const bible = await aiCall(aiService, systemPrompt, userPrompt, 4096, 0.3);
    await saveStoryBible(projectId, bible);
    logger.debug('Story bible generated', { projectId });
  } catch (e) {
    logger.debug('Story bible generation failed', { projectId, error: e });
  }
}

// ============================================================================
// 4. CHAPTER SUMMARIZER
// ============================================================================

/**
 * Generate a summary of a just-written chapter.
 * Called after each chapter write.
 */
export async function summarizeChapter(
  aiService: AIProviderService,
  projectId: string,
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
): Promise<{ summary: string; openingSentence: string; mcState: string; cliffhanger: string }> {
  const systemPrompt = `Bạn là chuyên gia tóm tắt chương tiểu thuyết. Viết tóm tắt ngắn gọn, đầy đủ sự kiện chính.`;

  const userPrompt = `Chương ${chapterNumber}: ${title}
Nhân vật chính: ${protagonistName}

NỘI DUNG:
${content}

Trả về JSON:
{
  "summary": "Tóm tắt 2-3 câu: sự kiện chính, nhân vật xuất hiện, kết quả",
  "opening_sentence": "Câu mở đầu đầu tiên của chương (copy nguyên văn)",
  "mc_state": "Trạng thái MC cuối chương: cảnh giới, vị trí, cảm xúc, mục tiêu tiếp theo",
  "cliffhanger": "Cliffhanger/hook cuối chương (nếu có, 1 câu)"
}`;

  try {
    const raw = await aiCall(aiService, systemPrompt, userPrompt, 1024, 0.2);
    const json = JSON.parse(extractJSON(raw));
    return {
      summary: json.summary || `Chương ${chapterNumber}: ${title}`,
      openingSentence: json.opening_sentence || '',
      mcState: json.mc_state || '',
      cliffhanger: json.cliffhanger || '',
    };
  } catch {
    // Fallback: extract opening manually
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('Chương '));
    const opening = lines[0]?.slice(0, 100) || '';
    return {
      summary: `Chương ${chapterNumber}: ${title}`,
      openingSentence: opening,
      mcState: '',
      cliffhanger: '',
    };
  }
}
