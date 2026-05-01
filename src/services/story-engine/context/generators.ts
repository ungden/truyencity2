/**
 * Post-write context generators (Phase 28 TIER 2 — extracted from context/assembler.ts).
 *
 * AI-driven generators called AFTER chapter is written:
 *   - saveChapterSummary / generateChapterSummary: per-chapter summary
 *   - generateSummaryAndCharacters: combined extraction (single AI call)
 *   - generateSynopsis: rolling synopsis update (every 5 chapters)
 *   - generateArcPlan: arc plan generation at boundaries
 *   - generateStoryBible: bible refresh (ch.3, then tiered)
 *
 * Pure refactor — no behavior change. Imports preserved as re-exports from
 * assembler.ts so existing callers (orchestrator, summary-orchestrator,
 * memory modules) keep working.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getArchitectVoiceHint } from '../templates/genre-voice-anchors';
import { getGenreArchitectGuide } from '../templates/genre-process-blueprints';
import { GOLDEN_CHAPTER_REQUIREMENTS, UNIVERSAL_ANTI_SEEDS, SUB_GENRE_RULES } from '../templates';
import type { ChapterSummary, GenreType, GeminiConfig } from '../types';

// AI response interfaces (used internally by generators)
interface CombinedAIResponse {
  summary?: string;
  openingSentence?: string;
  mcState?: string;
  cliffhanger?: string;
  characters?: Array<{
    character_name: string;
    status: string;
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>;
}

interface SynopsisAIResponse {
  synopsis_text?: string;
  mc_current_state?: string;
  active_allies?: string[];
  active_enemies?: string[];
  open_threads?: string[];
}

interface ArcSubArcEntry {
  sub_arc_number: number;
  start_chapter: number;
  end_chapter: number;
  theme: string;
  mini_payoff: string;
}

interface ArcPlanAIResponse {
  arc_theme?: string;
  plan_text?: string;
  sub_arcs?: ArcSubArcEntry[];
  chapter_briefs?: Array<{ chapterNumber: number; brief: string; sub_arc_number?: number }>;
  threads_to_advance?: string[];
  threads_to_resolve?: string[];
  new_threads?: string[];
}

// ── Post-Write: Save Chapter Summary ─────────────────────────────────────────

export async function saveChapterSummary(
  projectId: string,
  chapterNumber: number,
  title: string,
  summary: ChapterSummary,
): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from('chapter_summaries').upsert({
    project_id: projectId,
    chapter_number: chapterNumber,
    title,
    summary: summary.summary,
    opening_sentence: summary.openingSentence,
    mc_state: summary.mcState,
    cliffhanger: summary.cliffhanger,
  }, { onConflict: 'project_id,chapter_number' });

  if (error) {
    console.warn(`[ContextAssembler] Failed to save chapter ${chapterNumber} summary: ${error.message}`);
  }
}

// ── Post-Write: Generate Summary via AI ──────────────────────────────────────

export async function generateChapterSummary(
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
  options?: { allowEmptyCliffhanger?: boolean; projectId?: string },
): Promise<ChapterSummary> {
  // Token-optimized: reduced from 3K+3K=6K to 2K+2K=4K chars
  const headSnippet = content.slice(0, 2000);
  const tailSnippet = content.slice(-2000);

  const prompt = `Tóm tắt chương truyện sau. Trả về JSON:
{
  "summary": "tóm tắt 2-3 câu",
  "openingSentence": "câu mở đầu chương (nguyên văn từ nội dung)",
  "mcState": "trạng thái ${protagonistName} cuối chương (cảnh giới, vị trí, tình trạng)",
  "cliffhanger": "tình huống chưa giải quyết cuối chương"
}

Chương ${chapterNumber}: "${title}"

[MỞ ĐẦU]
${headSnippet}

[KẾT CHƯƠNG]
${tailSnippet}

QUY TẮC CLIFFHANGER:
- Nếu không phải chương kết/finale, KHÔNG ĐƯỢC để rỗng
- Trích đúng tình huống căng thẳng hoặc câu chốt mở ở cuối chương
- Chỉ cho phép rỗng khi chương đã khép hoàn toàn theo chủ đích finale`;

  const res = await callGemini(prompt, { ...config, temperature: 0.1, maxTokens: 1024 }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'chapter_summary', chapterNumber } : undefined });
  const parsed = parseJSON<ChapterSummary>(res.content);

  if (!parsed || !parsed.summary?.trim()) {
    throw new Error(`Chapter ${chapterNumber} summary: JSON parse failed — raw: ${res.content.slice(0, 200)}`);
  }

  const allowEmptyCliffhanger = options?.allowEmptyCliffhanger === true;

  if (!parsed.openingSentence?.trim()) {
    parsed.openingSentence = content.slice(0, 160).trim();
  }

  if (!parsed.mcState?.trim()) {
    // Fallback: extract MC state from the tail of the chapter
    parsed.mcState = extractFallbackMcState(content, protagonistName);
  }

  if (!allowEmptyCliffhanger && !parsed.cliffhanger?.trim()) {
    parsed.cliffhanger = extractFallbackCliffhanger(content);
  }

  return parsed;
}

function extractFallbackCliffhanger(content: string): string {
  const tail = content.slice(-900).trim();
  if (!tail) return 'Biến cố cuối chương vẫn chưa ngã ngũ.';

  const sentenceMatches = tail.match(/[^.!?。！？\n]+[.!?。！？]?/g) || [];
  const sentences = sentenceMatches
    .map(s => s.trim())
    .filter(Boolean)
    .slice(-5);

  const hookKeywords = [
    'bất ngờ', 'đột nhiên', 'bỗng', 'kinh hãi', 'sững sờ', 'không thể tin',
    'ngay lúc đó', 'tiếng động', 'bóng đen', 'cánh cửa', 'hô lớn',
  ];

  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    const lower = s.toLowerCase();
    if (lower.includes('?') || lower.includes('...') || hookKeywords.some(k => lower.includes(k))) {
      return s;
    }
  }

  return sentences[sentences.length - 1] || 'Biến cố cuối chương vẫn chưa ngã ngũ.';
}

/**
 * Extract a basic MC state from the chapter tail when AI fails to provide one.
 * Looks for cultivation/power keywords, location hints, and condition markers.
 */
function extractFallbackMcState(content: string, protagonistName: string): string {
  const tail = content.slice(-2000).toLowerCase();

  // Try to find cultivation/power level mentions
  const powerKeywords = [
    'cảnh giới', 'đột phá', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh',
    'hóa thần', 'luyện hư', 'độ kiếp', 'đại thừa', 'tiên nhân',
    'cấp bậc', 'rank', 'level', 'bậc',
  ];
  const locationKeywords = ['đang ở', 'tại', 'quay về', 'rời khỏi', 'đến'];
  const conditionKeywords = ['bị thương', 'hồi phục', 'mệt mỏi', 'tỉnh lại', 'ngất', 'khỏe mạnh'];

  const parts: string[] = [];

  // Check for power/cultivation state
  for (const kw of powerKeywords) {
    const idx = tail.lastIndexOf(kw);
    if (idx >= 0) {
      // Extract surrounding context (up to 80 chars)
      const start = Math.max(0, idx - 20);
      const end = Math.min(tail.length, idx + kw.length + 60);
      const snippet = content.slice(content.length - 2000 + start, content.length - 2000 + end).trim();
      if (snippet.length > 10) {
        parts.push(snippet.replace(/\n/g, ' ').slice(0, 100));
        break;
      }
    }
  }

  // Check for condition
  for (const kw of conditionKeywords) {
    if (tail.includes(kw)) {
      parts.push(kw);
      break;
    }
  }

  if (parts.length > 0) {
    return `${protagonistName}: ${parts.join(', ')}`;
  }

  // Last resort: generic state
  return `${protagonistName} cuối chương — xem nội dung để biết chi tiết`;
}

// ── Post-Write: Combined Summary + Character Extraction (single AI call) ─────

export interface CombinedSummaryAndCharacters {
  summary: ChapterSummary;
  characters: Array<{
    character_name: string;
    status: 'alive' | 'dead' | 'missing' | 'unknown';
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>;
}

/**
 * Generate chapter summary AND extract character states in a single AI call.
 * Saves ~1 AI call per chapter compared to separate generateChapterSummary + extractAndSaveCharacterStates.
 */
export async function generateSummaryAndCharacters(
  chapterNumber: number,
  title: string,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
  options?: { allowEmptyCliffhanger?: boolean; projectId?: string },
): Promise<CombinedSummaryAndCharacters> {
  // Token-optimized: reduced from 4K+4K+3K=11K to 2K+2K+1K=5K chars
  // Gemini can extract summary + characters from smaller snippets effectively
  const headSnippet = content.slice(0, 2000);
  const tailSnippet = content.slice(-2000);
  // Mid section for character extraction context
  const midStart = Math.floor(content.length * 0.3);
  const midSnippet = content.length > 8000
    ? content.slice(midStart, midStart + 1000)
    : '';

  const prompt = `Phân tích chương truyện sau, thực hiện 2 nhiệm vụ ĐỒNG THỜI. Trả về JSON:
{
  "summary": "tóm tắt 2-3 câu",
  "openingSentence": "câu mở đầu chương (nguyên văn)",
  "mcState": "trạng thái ${protagonistName} cuối chương (cảnh giới, vị trí, tình trạng)",
  "cliffhanger": "tình huống chưa giải quyết cuối chương",
  "characters": [
    {
      "character_name": "TÊN RIÊNG đầy đủ (VD: 'Lâm Phong', 'Aria'). CẤM số, mã code, nhãn chung",
      "status": "alive|dead|missing|unknown",
      "power_level": "cảnh giới/sức mạnh hoặc null",
      "power_realm_index": null,
      "location": "vị trí cuối chương hoặc null",
      "personality_quirks": "đặc điểm tính cách nổi bật hoặc null",
      "notes": "ghi chú quan trọng hoặc null"
    }
  ]
}

Chương ${chapterNumber}: "${title}"
Nhân vật chính: ${protagonistName}

[MỞ ĐẦU]
${headSnippet}
${midSnippet ? `\n[GIỮA CHƯƠNG]\n${midSnippet}` : ''}

[KẾT CHƯƠNG]
${tailSnippet}

QUY TẮC:
- CLIFFHANGER: Nếu không phải finale, KHÔNG để rỗng. Trích đúng tình huống căng thẳng cuối chương.
- CHARACTERS: Chỉ nhân vật CÓ TÊN RIÊNG thực sự. CẤM số, mã code, mô tả chung.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.1, maxTokens: 2048 }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'combined_summary', chapterNumber } : undefined });
  const parsed = parseJSON<CombinedAIResponse>(res.content);

  if (!parsed || !parsed.summary?.trim()) {
    throw new Error(`Chapter ${chapterNumber} combined summary: JSON parse failed — raw: ${res.content.slice(0, 200)}`);
  }

  const allowEmptyCliffhanger = options?.allowEmptyCliffhanger === true;

  // Build summary
  const summary: ChapterSummary = {
    summary: parsed.summary,
    openingSentence: parsed.openingSentence?.trim() || content.slice(0, 160).trim(),
    mcState: parsed.mcState?.trim() || extractFallbackMcState(content, protagonistName),
    cliffhanger: parsed.cliffhanger?.trim() || (allowEmptyCliffhanger ? '' : extractFallbackCliffhanger(content)),
  };

  return {
    summary,
    characters: Array.isArray(parsed.characters) ? parsed.characters.map(c => ({
      ...c,
      status: (c.status || 'unknown') as 'alive' | 'dead' | 'missing' | 'unknown',
    })) : [],
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

  // P2.4: MC name lock prepended to prompt — prevents synopsis regen drifting MC name
  // when chapter summaries contain wrong name (e.g. due to upstream Writer bug).
  // Synopsis is the canonical "what happened" used by future chapter contexts; if
  // synopsis says "Trần Vũ" instead of "Lê Minh", the drift propagates indefinitely.
  const mcLock = `[QUY TẮC TUYỆT ĐỐI — MC NAME LOCK]
Nhân vật chính của truyện này TÊN = "${protagonistName}". KHÔNG dùng bất kỳ tên nào khác để chỉ MC.
Nếu chapter summaries phía dưới có tên khác (do bug chương trước drift), SỬA về "${protagonistName}" khi viết synopsis.
Synopsis output PHẢI chứa "${protagonistName}" ít nhất 5 lần và KHÔNG chứa tên khác như nhân vật chính.

`;

  const prompt = `${mcLock}Bạn là biên tập viên truyện ${genre}. Viết TỔNG QUAN CỐT TRUYỆN cập nhật.

${oldSynopsis ? `Synopsis cũ:\n${oldSynopsis}\n\n` : ''}Các chương mới:\n${summaryText}

Trả về JSON:
{
  "synopsis_text": "tổng quan 500-800 từ, bao gồm tất cả sự kiện quan trọng — gọi MC bằng '${protagonistName}'",
  "mc_current_state": "trạng thái hiện tại của ${protagonistName}",
  "active_allies": ["danh sách đồng minh"],
  "active_enemies": ["danh sách kẻ thù"],
  "open_threads": ["các tuyến truyện đang mở"]
}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 2048 }, { jsonMode: true, tracking: { projectId, task: 'synopsis' } });
  const parsed = parseJSON<SynopsisAIResponse>(res.content);
  if (!parsed || !parsed.synopsis_text?.trim()) {
    throw new Error(`Synopsis generation failed: JSON parse error — raw: ${res.content.slice(0, 200)}`);
  }

  // P2.4 verification: synopsis MUST contain the expected MC name. If it doesn't,
  // the AI ignored the MC lock — likely drift in upstream summaries propagated.
  // Don't save the bad synopsis; throw to surface the issue + retry on next cron tick.
  const synopsisText = parsed.synopsis_text;
  if (!synopsisText.includes(protagonistName)) {
    throw new Error(`Synopsis missing MC name "${protagonistName}" — possible name drift; not saving. First 200 chars: ${synopsisText.slice(0, 200)}`);
  }

  const db = getSupabase();
  const { error: synopsisErr } = await db.from('story_synopsis').upsert({
    project_id: projectId,
    synopsis_text: parsed.synopsis_text || '',
    mc_current_state: parsed.mc_current_state || '',
    active_allies: parsed.active_allies || [],
    active_enemies: parsed.active_enemies || [],
    open_threads: parsed.open_threads || [],
    last_updated_chapter: lastChapter,
  }, { onConflict: 'project_id' });

  if (synopsisErr) {
    console.warn(`[ContextAssembler] Failed to save synopsis for project ${projectId}: ${synopsisErr.message}`);
  }
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
  storyVision?: { endingVision?: string; majorPlotPoints?: string[]; mainConflict?: string; endGoal?: string },
  worldDescription?: string,  // 2026-04-29 audit fix: anchor arc plan to canonical premise (same pattern as chapter-writer Layer -1).
  masterOutline?: unknown,
): Promise<void> {
  const startChapter = (arcNumber - 1) * 20 + 1;
  const endChapter = Math.min(arcNumber * 20, totalPlanned);

  if (!worldDescription?.trim() || worldDescription.trim().length < 500) {
    throw new Error(`Arc plan generation refused: world_description missing/incomplete for project ${projectId}`);
  }
  const parsedMasterOutline = typeof masterOutline === 'string'
    ? parseJSON<{ volumes?: unknown[]; majorArcs?: unknown[] }>(masterOutline)
    : masterOutline;
  const hasMasterOutline = !!parsedMasterOutline && typeof parsedMasterOutline === 'object' && (
    (Array.isArray((parsedMasterOutline as { volumes?: unknown[] }).volumes) && (parsedMasterOutline as { volumes?: unknown[] }).volumes!.length > 0)
    || (Array.isArray((parsedMasterOutline as { majorArcs?: unknown[] }).majorArcs) && (parsedMasterOutline as { majorArcs?: unknown[] }).majorArcs!.length > 0)
  );
  if (!hasMasterOutline) {
    throw new Error(`Arc plan generation refused: master_outline missing/incomplete for project ${projectId}`);
  }

  // 2026-04-30 fix: Arc 1 plan covers chương 1-20 — without warm-baseline rule
  // injection, AI was emitting rock-bottom openings (chủ nhà giục trả tiền, MC
  // bế tắc, etc.) that conflict with WRITER_SYSTEM warm-baseline rule. Inject
  // golden chapter requirements + universal anti-seeds + voice anchor when
  // arc 1 is being planned so chapter 1-3 briefs are bestseller-grade.
  let openingRulesBlock = '';
  if (arcNumber === 1) {
    const ch1Must = GOLDEN_CHAPTER_REQUIREMENTS.chapter1.mustHave.map(r => `  • ${r}`).join('\n');
    const ch1Avoid = GOLDEN_CHAPTER_REQUIREMENTS.chapter1.avoid.map(r => `  ✗ ${r}`).join('\n');
    const ch2Must = GOLDEN_CHAPTER_REQUIREMENTS.chapter2.mustHave.map(r => `  • ${r}`).join('\n');
    const ch3Must = GOLDEN_CHAPTER_REQUIREMENTS.chapter3.mustHave.map(r => `  • ${r}`).join('\n');
    const antiSeeds = UNIVERSAL_ANTI_SEEDS.slice(0, 12).map(s => `  ✗ ${s}`).join('\n');
    const voiceHint = getArchitectVoiceHint(genre);
    openingRulesBlock = `\n[GOLDEN CHAPTER REQUIREMENTS — ARC 1 ONLY, BẮT BUỘC ALIGN]
Chương 1 PHẢI tuân thủ:
${ch1Must}
Chương 1 CẤM:
${ch1Avoid}
Chương 2 PHẢI:
${ch2Must}
Chương 3 PHẢI:
${ch3Must}

[UNIVERSAL ANTI-SEEDS — CẤM TUYỆT ĐỐI cho mọi chapter brief trong arc 1]:
${antiSeeds}
${voiceHint}

→ chapter_briefs cho chương 1-3 PHẢI propose scenes thỏa mãn các rule trên.
   CẤM TUYỆT ĐỐI brief mở chương 1 với "MC nghèo đói / chủ nhà giục / bế tắc / tự tử".
   MC PHẢI mở chương 1 với golden finger ACTIVE + competence visible + opportunity-driven hook.

[SẢNG VĂN ARC 1 HARD BANS — TUYỆT ĐỐI]:
   ✗ ZERO mysterious organization tracking MC trong arc 1. Tổ chức bí ẩn defer arc 4+.
   ✗ KHÔNG "MC vừa làm X đã bị Y phát hiện". Mỗi MC milestone scale 1 tầng nhận thức world (xã→huyện→tỉnh→quốc — KHÔNG SKIP TẦNG).
   ✗ MAX 1 antagonist active arc 1 (LOCAL scale: hàng xóm/đồng nghiệp/chợ). Antagonist mới chỉ unlock sau khi MC kết thúc xung đột với cái cũ.
   ✗ KHÔNG "world full of trọng sinh khác". MC trọng sinh là DUY NHẤT — world NGÂY THƠ về golden finger MC.
   ✗ WARM BASELINE 5 chương đầu: ZERO active threat. MC làm việc routine trong domain nhỏ. KHÔNG có stalker / sát thủ / tổ chức bí ẩn / kẻ thù kiếp trước follow-through ở chương 1-5.
   ✗ "Vừa mua sắm ít đồ đã bị 5 thằng chú ý" = REJECT. Reader cần warm-up time để root for MC.
\n`;
  }

  const isClosingPhase = endChapter >= totalPlanned * 0.8;
  const closingInstruction = isClosingPhase ? 
    `\n\nCHÚ Ý QUAN TRỌNG (GIAI ĐOẠN ĐÓNG TRUYỆN): Truyện đang ở ${Math.round((endChapter/totalPlanned)*100)}% tiến độ.
Yêu cầu:
- BẮT ĐẦU ĐÓNG CÁC PLOT THREADS: Đưa các tuyến truyện phụ, ân oán cũ vào danh sách "threads_to_resolve".
- KHÔNG MỞ THÊM THREAD MỚI LỚN ("new_threads" chỉ nên là các tình tiết dẫn tới final boss/climax).
- Gom các nhân vật lại gần nhau để chuẩn bị cho đại chiến/sự kiện cuối cùng.` : '';

  // 2026-04-29 audit fix: WORLD DESCRIPTION anchor (Layer -1) — same defense as
  // chapter-writer pipeline. If synopsis is shallow or storyBible missing or
  // storyVision is empty (story_outline schema bug), this guarantees arc plan
  // still has the canonical premise to ground future chapter_briefs against.
  let worldBlock = '';
  if (worldDescription?.trim()) {
    worldBlock = `[WORLD DESCRIPTION — PREMISE GỐC, ARC PLAN PHẢI BÁM SÁT]\n${worldDescription.slice(0, 4000)}\n\n`;
  }

  const masterBlock = `[MASTER OUTLINE — KHUNG TOÀN TRUYỆN, ARC PLAN PHẢI KHỚP]\n${JSON.stringify(parsedMasterOutline).slice(0, 4000)}\n\n`;

  // StoryVision injection for directional coherence
  let visionBlock = '';
  if (storyVision) {
    const vParts: string[] = ['[STORY VISION — HƯỚNG ĐI TỔNG THỂ]'];
    if (storyVision.mainConflict) vParts.push(`Xung đột chính: ${storyVision.mainConflict}`);
    if (storyVision.endGoal) vParts.push(`Mục tiêu cuối: ${storyVision.endGoal}`);
    if (storyVision.endingVision) vParts.push(`Kết cục: ${storyVision.endingVision}`);
    if (storyVision.majorPlotPoints?.length) {
      vParts.push('Plot points: ' + storyVision.majorPlotPoints.slice(0, 6).join(' → '));
    }
    visionBlock = vParts.join('\n') + '\n\n';
  }

  // Per-genre process blueprint — scene types + arc template + quality floor + creative space.
  // Always inject for arc plans regardless of arc number, since these are stable per-genre rules.
  const genreArchGuide = getGenreArchitectGuide(genre);

  const prompt = `Bạn là Story Architect cho truyện ${genre}.

${worldBlock}${masterBlock}${visionBlock}${synopsis ? `TỔNG QUAN:\n${synopsis}\n\n` : ''}${storyBible ? `STORY BIBLE:\n${storyBible.slice(0, 2000)}\n\n` : ''}${genreArchGuide}${openingRulesBlock}
Lập kế hoạch ARC ${arcNumber} (chương ${startChapter}-${endChapter}) cho ${protagonistName}.
Tổng dự kiến: ${totalPlanned} chương.${closingInstruction}

CẤU TRÚC SUB-ARC (HYPERPOP 2024-2026 STANDARD):
- Chia arc 20 chương thành 2-4 SUB-ARCS, mỗi sub-arc 5-10 chương resolve TỰ THÂN.
- Mỗi sub-arc có "mini-payoff" (kết quả cụ thể MC đạt được, conflict resolve, milestone) ở chương cuối.
- Sub-arc liên kết tuyến với nhau (cliffhanger cuối sub-arc 1 dẫn vào sub-arc 2) NHƯNG mỗi sub-arc đứng được độc lập như 1 mini-story.
- Đây là chuẩn modern (微短剧 IP adaptation): reader có thể đọc 5-10 chương 1 lần và cảm thấy có closure, không cần đọc 30 chương mới hiểu.

THREAD RETIREMENT QUOTA (LONG-FORM SUSTAINABILITY):
- Mỗi arc PHẢI mark ≥1 thread "to_resolve" (close existing plot thread). Tránh thread accumulation.
- Nếu open_threads > 8 (truyện đã có nhiều thread chưa đóng) → arc này PHẢI resolve ≥2 oldest threads trước khi open new.
- "new_threads" tối đa 2-3 mỗi arc (không quá load).
- Reader fatigue compounds nếu thread cứ open mà không close — engine phải force closure.

Phase 22 Stage 2 Q4: chapter_briefs phải SCENE-LEVEL không chỉ 1 dòng.
Mỗi chapter brief phải liệt kê 3-5 scenes với goal/conflict cụ thể, callbacks tới hint cũ,
và mini-payoff dự kiến. Đây là blueprint Architect dùng từng chương.

Trả về JSON:
{
  "arc_theme": "foundation|conflict|growth|...",
  "plan_text": "mô tả arc 500-800 từ — gồm hook arc, escalation curve, climax, payoff",
  "sub_arcs": [
    {"sub_arc_number": 1, "start_chapter": ${startChapter}, "end_chapter": ${startChapter + 6}, "theme": "tên sub-arc (vd: Khởi nghiệp tại quán net Net Việt)", "mini_payoff": "MC đạt được gì cụ thể cuối sub-arc (vd: Quán net có 50 khách/ngày)"},
    ...
  ],
  "chapter_briefs": [
    {
      "chapterNumber": ${startChapter},
      "brief": "1-2 câu high-level summary",
      "sub_arc_number": 1,
      "scenes": [
        {"order": 1, "goal": "MC làm gì", "conflict": "đối kháng từ ai/cái gì", "resolution": "kết quả scene", "estimated_words": 700, "characters": ["MC", "X"]},
        {"order": 2, "goal": "...", "conflict": "...", "resolution": "...", "estimated_words": 700, "characters": [...]},
        ...
      ],
      "callbacks": ["nhắc về scene/sự kiện ch.X (nếu có)"],
      "foreshadow_plant": ["hint mới gieo (nếu có)"],
      "foreshadow_payoff": ["hint cũ payoff (nếu có)"],
      "mini_dopamine": "1 face-slap / harvest / recognition / breakthrough"
    },
    ...
  ],
  "threads_to_advance": ["thread cần đẩy"],
  "threads_to_resolve": ["thread cần giải quyết"],
  "new_threads": ["thread mới"]
}`;

  // Phase 23 fix: bumped 4096 → 16384. Q4 scene-level schema (chapter_briefs with scenes[],
  // callbacks, foreshadow_plant/payoff per chapter) easily exceeds 4096 tokens for 20-chapter
  // arc → JSON parse error from truncated output. 16K fits comfortably.
  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 16384 }, { jsonMode: true, tracking: { projectId, task: 'arc_plan' } });
  const parsed = parseJSON<ArcPlanAIResponse>(res.content);
  if (!parsed || !parsed.plan_text?.trim()) {
    throw new Error(`Arc plan generation failed: JSON parse error — raw: ${res.content.slice(0, 200)}`);
  }

  const db = getSupabase();
  const { error: arcErr } = await db.from('arc_plans').upsert({
    project_id: projectId,
    arc_number: arcNumber,
    start_chapter: startChapter,
    end_chapter: endChapter,
    arc_theme: parsed.arc_theme || 'growth',
    plan_text: parsed.plan_text || '',
    sub_arcs: parsed.sub_arcs || [],
    chapter_briefs: parsed.chapter_briefs || [],
    threads_to_advance: parsed.threads_to_advance || [],
    threads_to_resolve: parsed.threads_to_resolve || [],
    new_threads: parsed.new_threads || [],
  }, { onConflict: 'project_id,arc_number' });

  if (arcErr) {
    console.warn(`[ContextAssembler] Failed to save arc plan ${arcNumber} for project ${projectId}: ${arcErr.message}`);
  }
}

// ── Post-Write: Generate/Refresh Story Bible ─────────────────────────────────

export async function generateStoryBible(
  projectId: string,
  genre: GenreType,
  protagonistName: string,
  worldDescription: string,
  chapters: string[],
  config: GeminiConfig,
  synopsis?: string,
): Promise<void> {
  // Use synopsis + recent chapters if available (for refresh), otherwise use first chapters
  const chapterText = chapters.slice(0, 3).map((c, i) => `Ch.${i + 1}:\n${c.slice(0, 3000)}`).join('\n\n');

  const prompt = `Phân tích ${synopsis ? 'các chương gần đây' : 'các chương đầu'} của truyện ${genre} và tạo/cập nhật STORY BIBLE.

Thế giới: ${worldDescription}
Nhân vật chính: ${protagonistName}
${synopsis ? `\nTỔNG QUAN HIỆN TẠI:\n${synopsis.slice(0, 2000)}\n` : ''}

NỘI DUNG CHƯƠNG:
${chapterText}

Viết Story Bible bao gồm:
1. Hệ thống thế giới (tu luyện/phép thuật/công nghệ)
2. Nhân vật chính: tính cách, mục tiêu, sức mạnh
3. Nhân vật phụ quan trọng
4. Quy tắc thế giới (KHÔNG được vi phạm)
5. Phong cách viết (giọng văn, xưng hô)
6. Bối cảnh chính

Viết dạng text thuần, 800-1500 từ.`;

  const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 4096 }, { tracking: { projectId, task: 'story_bible' } });
  if (!res.content || res.content.length < 100) return;

  const db = getSupabase();
  const { error: bibleErr } = await db.from('ai_story_projects').update({ story_bible: res.content }).eq('id', projectId);

  if (bibleErr) {
    console.warn(`[ContextAssembler] Failed to save story bible for project ${projectId}: ${bibleErr.message}`);
  }
}
