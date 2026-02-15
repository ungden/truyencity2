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
  maxTokens: number = 16384,
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
- Tối đa 8000 từ cho synopsis, chi tiết đầy đủ mọi sự kiện và nhân vật quan trọng`;

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
    const raw = await aiCall(aiService, systemPrompt, userPrompt, 16384, 0.3);
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
/**
 * Story outline vision data passed to arc planner for directional coherence.
 * Loaded from ai_story_projects.story_outline (persisted in Phase 2).
 */
export interface StoryVision {
  endingVision?: string;
  majorPlotPoints?: string[];
  mainConflict?: string;
  endGoal?: string;
}

export async function generateArcPlan(
  aiService: AIProviderService,
  projectId: string,
  arcNumber: number,
  genre: GenreType,
  protagonistName: string,
  synopsis: SynopsisData | null,
  storyBible: string | null,
  totalPlannedChapters: number,
  storyVision?: StoryVision | null,
): Promise<void> {
  const startChapter = (arcNumber - 1) * 20 + 1;
  const endChapter = arcNumber * 20;
  const isFirstArc = arcNumber === 1;
  const isFinalArc = endChapter >= totalPlannedChapters;
  const remainingChapters = totalPlannedChapters - startChapter + 1;

  const contextParts: string[] = [];

  // Inject endingVision + majorPlotPoints from persisted StoryOutline (Gap 2/7 fix)
  if (storyVision) {
    const visionParts: string[] = [];
    if (storyVision.endingVision) visionParts.push(`KẾT CỤC DỰ KIẾN: ${storyVision.endingVision}`);
    if (storyVision.mainConflict) visionParts.push(`XUNG ĐỘT CHÍNH: ${storyVision.mainConflict}`);
    if (storyVision.endGoal) visionParts.push(`MỤC TIÊU CUỐI: ${storyVision.endGoal}`);
    if (storyVision.majorPlotPoints && storyVision.majorPlotPoints.length > 0) {
      visionParts.push(`CÁC MỐC CỐT TRUYỆN LỚN:\n${storyVision.majorPlotPoints.map((p, i) => `  ${i + 1}. ${typeof p === 'string' ? p : JSON.stringify(p)}`).join('\n')}`);
    }
    if (visionParts.length > 0) {
      contextParts.push(`TẦM NHÌN CỐT TRUYỆN (từ kế hoạch ban đầu):\n${visionParts.join('\n')}`);
    }
  }

  if (storyBible) {
    contextParts.push(`STORY BIBLE:\n${storyBible}`);
  }

  if (synopsis) {
    contextParts.push(`TÓM TẮT CỐT TRUYỆN (đến ch.${synopsis.lastUpdatedChapter}):\n${synopsis.synopsisText}\n\nMC: ${synopsis.mcCurrentState || 'N/A'}\nTuyến mở: ${synopsis.openThreads.join(' | ') || 'N/A'}`);
  }

  const phaseGuidance = isFirstArc
    ? 'ARC MỞ ĐẦU: Giới thiệu MC, thế giới, xung đột chính. Hook mạnh, worldbuilding hấp dẫn.'
    : isFinalArc
    ? `ARC KẾT THÚC (còn ~${remainingChapters} chương): Giải quyết TẤT CẢ tuyến truyện, climax lớn nhất, kết cục thỏa mãn.${storyVision?.endingVision ? ` Hướng đến kết cục: ${storyVision.endingVision}` : ''}`
    : `ARC GIỮA (${arcNumber}/${Math.ceil(totalPlannedChapters / 20)}): Phát triển nhân vật, escalate xung đột, mở tuyến truyện mới.${storyVision?.endingVision ? ` (Nhớ: câu chuyện hướng đến: ${storyVision.endingVision})` : ''}`;

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
// 2b. FINALE DETECTION (Gap 3 fix)
// ============================================================================

/**
 * Ask AI whether the upcoming arc should be the FINAL arc.
 * Called at arc boundaries when chapter >= 60% of target.
 * Returns true if AI judges the story is ready to conclude.
 */
export async function shouldBeFinaleArc(
  aiService: AIProviderService,
  synopsis: SynopsisData | null,
  storyVision: StoryVision | null,
  openThreads: string[],
  currentChapter: number,
  targetChapters: number,
): Promise<boolean> {
  const progress = Math.round((currentChapter / targetChapters) * 100);
  const remainingChapters = targetChapters - currentChapter;

  const contextParts: string[] = [];
  contextParts.push(`TIẾN ĐỘ: Ch.${currentChapter}/${targetChapters} (${progress}%), còn ~${remainingChapters} chương`);

  if (synopsis) {
    contextParts.push(`TÓM TẮT: ${synopsis.synopsisText}`);
    contextParts.push(`MC: ${synopsis.mcCurrentState || 'N/A'}`);
  }

  if (openThreads.length > 0) {
    contextParts.push(`TUYẾN MỞ (${openThreads.length}): ${openThreads.join(' | ')}`);
  }

  if (storyVision?.endingVision) {
    contextParts.push(`KẾT CỤC DỰ KIẾN: ${storyVision.endingVision}`);
  }
  if (storyVision?.endGoal) {
    contextParts.push(`MỤC TIÊU CUỐI: ${storyVision.endGoal}`);
  }

  const systemPrompt = `Bạn là chuyên gia phân tích cấu trúc tiểu thuyết dài kỳ.
Nhiệm vụ: Quyết định xem arc tiếp theo có nên là ARC CUỐI CÙNG hay không.

CÂN NHẮC:
- Nếu đa số tuyến truyện đã sẵn sàng resolution → NÊN kết thúc
- Nếu còn quá nhiều tuyến mở chưa đủ setup → CHƯA kết thúc
- Nếu MC đã đạt hoặc gần đạt mục tiêu cuối → NÊN kết thúc
- Kết thúc tự nhiên tốt hơn kéo dài vô nghĩa
- Còn ${remainingChapters} chương (~${Math.ceil(remainingChapters / 20)} arcs) để kết thúc

Trả về JSON: {"is_finale": true/false, "reason": "lý do ngắn"}`;

  try {
    const raw = await aiCall(aiService, systemPrompt, contextParts.join('\n\n'), 1024, 0.2);
    const json = JSON.parse(extractJSON(raw));
    const isFinale = json.is_finale === true;
    logger.debug('Finale detection result', { currentChapter, targetChapters, isFinale, reason: json.reason });
    return isFinale;
  } catch (e) {
    logger.debug('Finale detection failed, using fallback', { error: e });
    // Fallback: if >= 90% done, default to finale
    return currentChapter >= targetChapters * 0.9;
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
- Tối đa 5000 từ, chi tiết đầy đủ`;

  const userPrompt = `Thế giới ban đầu: ${worldDescription}
Nhân vật chính: ${protagonistName}
Thể loại: ${genre}

NỘI DUNG CÁC CHƯƠNG ĐẦU:
${chaptersText}

Hãy phân tích và tạo STORY BIBLE. Viết dạng text thuần (không JSON), có heading rõ ràng.`;

  try {
    const bible = await aiCall(aiService, systemPrompt, userPrompt, 16384, 0.3);
    await saveStoryBible(projectId, bible);
    logger.debug('Story bible generated', { projectId });
  } catch (e) {
    logger.debug('Story bible generation failed', { projectId, error: e });
  }
}

// ============================================================================
// 3b. STORY BIBLE REFRESH (Gap 5b fix)
// ============================================================================

/**
 * Refresh/update the story bible using current synopsis + recent chapters.
 * Unlike initial generation (from first 3 chapters), this UPDATES the existing bible.
 * Called every 100-200 chapters (every 5-10 arcs) at arc boundaries.
 */
export async function refreshStoryBible(
  aiService: AIProviderService,
  projectId: string,
  genre: GenreType,
  protagonistName: string,
  currentBible: string,
  synopsis: SynopsisData | null,
  recentChapters: RecentChapter[],
  currentChapter: number,
): Promise<void> {
  const synopsisText = synopsis
    ? `TÓM TẮT CỐT TRUYỆN (đến ch.${synopsis.lastUpdatedChapter}):\n${synopsis.synopsisText}\n\nMC: ${synopsis.mcCurrentState || 'N/A'}\nĐồng minh: ${synopsis.activeAllies.join(', ') || 'N/A'}\nKẻ thù: ${synopsis.activeEnemies.join(', ') || 'N/A'}\nTuyến mở: ${synopsis.openThreads.join(' | ') || 'N/A'}`
    : '';

  const recentText = recentChapters.length > 0
    ? recentChapters.map(ch => `--- Ch.${ch.chapterNumber}: ${ch.title} ---\n${ch.content}`).join('\n\n')
    : '';

  const systemPrompt = `Bạn là chuyên gia cập nhật STORY BIBLE cho tiểu thuyết ${genre} dài kỳ.

STORY BIBLE hiện tại đã CŨ (được tạo từ các chương đầu). Nhiệm vụ: CẬP NHẬT nó dựa trên synopsis + chương gần đây.

CẬP NHẬT:
1. THẾ GIỚI: Thêm địa điểm mới, tổ chức mới, quy tắc mới đã xuất hiện
2. NHÂN VẬT CHÍNH: Cập nhật cảnh giới, sức mạnh, vị trí, mục tiêu hiện tại
3. NHÂN VẬT PHỤ: Thêm NPC mới quan trọng, cập nhật trạng thái (đã chết → ghi rõ ĐÃ CHẾT)
4. XUNG ĐỘT: Cập nhật xung đột hiện tại, đánh dấu xung đột đã giải quyết
5. QUY TẮC: Thêm quy tắc mới, giữ nguyên quy tắc cũ vẫn đúng
6. NHÂN VẬT ĐÃ CHẾT: Liệt kê rõ ràng (QUAN TRỌNG - để tránh nhân vật chết sống lại)

NGUYÊN TẮC:
- GIỮ LẠI tất cả thông tin từ bible cũ vẫn đúng
- CẬP NHẬT thông tin đã thay đổi
- THÊM thông tin mới
- ĐÁNH DẤU rõ nhân vật đã chết
- Tối đa 6000 từ, chi tiết đầy đủ`;

  const userPrompt = `STORY BIBLE HIỆN TẠI (cần cập nhật):
${currentBible}

${synopsisText}

CHƯƠNG GẦN ĐÂY (ch.${currentChapter - recentChapters.length + 1} → ch.${currentChapter}):
${recentText}

Nhân vật chính: ${protagonistName}
Chương hiện tại: ${currentChapter}

Hãy viết STORY BIBLE CẬP NHẬT. Viết dạng text thuần (không JSON), có heading rõ ràng.`;

  try {
    const updatedBible = await aiCall(aiService, systemPrompt, userPrompt, 16384, 0.3);
    await saveStoryBible(projectId, updatedBible);
    logger.debug('Story bible refreshed', { projectId, currentChapter });
  } catch (e) {
    logger.debug('Story bible refresh failed (non-fatal)', { projectId, error: e });
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
    const raw = await aiCall(aiService, systemPrompt, userPrompt, 2048, 0.2);
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
