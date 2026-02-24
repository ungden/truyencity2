/**
 * Story Engine v2 — Chapter Writer
 *
 * 3-agent workflow: Architect → Writer → Critic
 * Each agent is a single Gemini call with a specialized system prompt.
 *
 * Ported features from v1:
 * - Critic fail-closed (không auto-approve khi lỗi)
 * - Critic hard-enforce continuity critical/major
 * - Critic nhận FULL content (không cắt 8000 chars)
 * - finishReason truncation check
 * - Architect scene fallback ≥ 4 scenes
 * - Scene word estimate correction
 * - Rewrite instructions → Writer (không chỉ Architect)
 * - Constraint Extractor (per-project rules)
 * - Topic section (topicPromptHints + parallel world ban)
 * - Multi-POV per scene
 * - Character Voice Guide
 * - Emotional Arc planning
 * - Golden Chapter Requirements (ch.1-3)
 * - Vocabulary Hints injection
 * - Rich Style Context + per-scene pacing
 * - Cliffhanger dedup từ structured summary
 * - Title similarity check (70% threshold)
 * - isFinalArc trong prompt
 * - ENGAGEMENT_CHECKLIST + power budget
 * - Full continuity checklist trong Critic
 * - SƯỚNG VĂN instruction
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getStyleByGenre, buildTitleRulesPrompt, GOLDEN_CHAPTER_REQUIREMENTS, ENGAGEMENT_CHECKLIST, SCENE_EXPANSION_RULES, ANTI_CLICHE_RULES, SUBTEXT_DIALOGUE_RULES, COMEDY_MECHANICS_RULES } from '../config';
import { getConstraintExtractor } from '../memory/constraint-extractor';
import { GENRE_CONFIG } from '../../../lib/types/genre-config';
import { buildStyleContext, getEnhancedStyleBible, CLIFFHANGER_TECHNIQUES } from '../memory/style-bible';
import { titleChecker } from '../memory/title-checker';
import type {
  WriteChapterResult, ChapterOutline, CriticOutput, CriticIssue,
  GenreType, GeminiConfig, EmotionalArc, SceneOutline,
} from '../types';
import type { SceneType } from '../memory/style-bible';

// ── System Prompts ───────────────────────────────────────────────────────────

const ARCHITECT_SYSTEM = `Bạn là ARCHITECT AGENT — chuyên gia lên kế hoạch chương truyện dài kỳ tiếng Việt.

NHIỆM VỤ: Tạo blueprint chi tiết cho 1 chương.

QUY TẮC:
1. Pacing theo "ức chế → bùng nổ" — mỗi chương ít nhất 1 khoảnh khắc thỏa mãn hoặc sảng khoái (kể cả truyện điền viên, kinh doanh cũng cần thu hoạch, chốt deal hoặc sự bình yên hài hước).
2. TỐI THIỂU 4-5 scenes, mỗi scene có động lực/mục tiêu rõ ràng (tương tác, xây dựng, mâu thuẫn, khám phá, kinh doanh).
3. Consistency tuyệt đối với context (nhân vật, sức mạnh/tài chính, vị trí).
4. Kết chương phải có lực kéo đọc tiếp (Ending Hook). Đối với truyện tranh đấu thì là cliffhanger nguy hiểm. Đối với truyện sinh hoạt, kinh doanh, điền viên thì là sự tò mò, mong đợi kết quả hoặc một bước ngoặt nhỏ.
5. Nếu có hook/cliffhanger từ chương trước → PHẢI giải quyết ngay đầu chương.
6. Tránh kéo dài bi kịch/khó khăn: ưu tiên để MC luôn có hướng giải quyết, tiến triển dần hoặc thu hoạch nhỏ.
7. Đa góc nhìn (Multi-POV): CÓ THỂ chuyển POV sang nhân vật khác cho 1-2 scenes NẾU phù hợp để tăng tính hấp dẫn.
8. Tình huống hài hước: Ưu tiên thiết kế tình huống "Não bổ" (người khác tự suy diễn cao siêu về hành động ngớ ngẩn của MC) hoặc "Phản kém" (Tương phản hình tượng). Cấm trò đùa kiểu phương Tây.
9. NHỊP ĐIỆU ĐA DẠNG (BẮT BUỘC): Trong 4-6 scenes, PHẢI có ít nhất 1 scene nhịp CHẬM (đối thoại chiêm nghiệm, nội tâm sâu, ký ức, slice-of-life, phản ứng cảm xúc). CẤM toàn bộ scenes đều là chiến đấu/hành động. Ngay cả arc chiến đấu khốc liệt nhất cũng phải có 1 khoảnh khắc MC dừng lại thở, suy nghĩ, hoặc tương tác đời thường.
10. COMEDY BEAT (BẮT BUỘC): Mỗi chương PHẢI có ít nhất 1 khoảnh khắc hài hước tự nhiên. Ghi rõ "comedyBeat" trong JSON. Dùng Não Bổ (bystander suy diễn cao siêu), Vô Sỉ (MC lật lọng), Phản Kém (gap moe), hoặc nội tâm tự giễu nhại. Ngay cả trong trận chiến sinh tử, MC hoặc đồng đội PHẢI có ít nhất 1 suy nghĩ khô khan/tự chế giễu.

OUTPUT: JSON theo format ChapterOutline.`;

const WRITER_SYSTEM = `Bạn là WRITER AGENT — nhà văn chuyên nghiệp viết truyện dài kỳ tiếng Việt.

PHONG CÁCH: Chi tiết sống động. KHÔNG BAO GIỜ tóm tắt — luôn SHOW, don't tell. Dùng đúng giọng văn của thể loại (ví dụ: kinh doanh thì dùng từ ngữ tài chính/thương trường, điền viên thì miêu tả món ăn, thiên nhiên).

FORMAT ĐỐI THOẠI: Dấu gạch ngang dài (—) đầu dòng mới. Mỗi lời thoại 1 dòng riêng.

QUY TẮC BẮT BUỘC:
- KHÔNG dùng markdown (**, ##, etc). Văn xuôi thuần túy.
- PHẢI đủ số từ yêu cầu. CẤM tóm tắt cốt truyện. Nếu thiếu từ → CÂU CHƯƠNG bằng cách viết thêm chi tiết 5 giác quan, nội tâm nhiều lớp, phản ứng của người xung quanh, hoặc kéo dài hành động.
- MỖI ĐOẠN HỘI THOẠI: Không nói thẳng tuột. Áp dụng "hội thoại kẹp dao" (mỉa mai, ẩn dụ, giấu diếm cảm xúc).
- YẾU TỐ HÀI HƯỚC (BẮT BUỘC): Mỗi chương PHẢI có ít nhất 1 khoảnh khắc hài hước. Dùng tình huống (hiểu lầm, vô sỉ, tự vả, não bổ, nội tâm tự giễu nhại khô khan). CẤM nhân vật kể chuyện cười/chơi chữ. Ngay cả lúc căng thẳng nhất, MC phải có 1 suy nghĩ nội tâm tự mỉa mai hoặc bình luận khô khan — đây là cốt lõi của webnovel Trung Quốc đỉnh cao.
- CẤM SỬ DỤNG VĂN PHONG AI: Loại bỏ hoàn toàn các cụm từ sáo rỗng như "Hít một ngụm khí lạnh", "Không thể tin nổi", "Đột nhiên", "Khẽ nhếch mép". Tả hành động thực tế thay vì dùng văn mẫu.
- CHỐNG LẶP TỪ (CỰC KỲ QUAN TRỌNG): KHÔNG dùng cùng một tính từ/màu sắc/trạng từ quá 3 lần trong chương. Sau lần 3, BẮT BUỘC dùng từ đồng nghĩa hoặc miêu tả gián tiếp. TUYỆT ĐỐI KHÔNG dùng cùng tính từ 2 lần trong 1 đoạn văn. Đặc biệt chú ý: màu sắc (tím sẫm, vàng kim), cảm xúc (kinh hoàng, sững sờ), âm thanh (ken két, rít lên), trạng thái (mờ ảo, đặc quánh).
- Mỗi scene cần: mô tả bối cảnh chi tiết + hành động/tương tác + nội tâm + đối thoại.
- Tiếng Việt tự nhiên: dùng thành ngữ, xưng hô đúng vai vế, từ vựng phù hợp bối cảnh.
- KHÔNG viết "Cliffhanger:" hay bất kỳ chỉ dẫn tiếng Anh nào.
- SƯỚNG VĂN MAINSTREAM CÓ KIỂM SOÁT: ưu tiên cảm giác tiến triển tích cực qua chiến lược, trí tuệ, quan hệ, thu hoạch, kinh doanh hoặc khám phá — KHÔNG chỉ bằng power-up hay bạo lực.
- Hạn chế kéo dài trạng thái tụt dốc; nên có điểm hồi phục hoặc lợi ích bù đắp.
- NỘI TÂM ĐA LỚP (BẮT BUỘC mỗi scene chính): Mỗi scene quan trọng PHẢI có ít nhất 1 đoạn nội tâm 3 lớp: (Bề mặt) MC nghĩ/nói gì → (Sâu hơn) MC thực sự cảm thấy gì → (Sâu nhất) Nỗi sợ/khao khát/bí mật mà MC không dám thừa nhận. Ví dụ: "Anh cười nhạt nói đây là chuyện nhỏ (bề mặt) → nhưng bàn tay giấu sau lưng siết chặt đến trắng bệch (thật sự) → bởi vì mỗi lần thấy máu, hình ảnh cha mẹ gục xuống lại hiện lên rõ mồn một (sâu nhất)."
- NHỊP ĐIỆU ĐA DẠNG: Phải có ít nhất 1 scene/đoạn nhịp chậm trong chương. Sau đỉnh điểm căng thẳng, MC cần 1 khoảnh khắc thở — ăn bát mì, nhìn bầu trời, nói chuyện phiếm. Đỉnh cao chỉ cao khi có thung lũng làm tương phản.`;

const CRITIC_SYSTEM = `Bạn là CRITIC AGENT — biên tập viên nghiêm khắc đánh giá chất lượng.

TIÊU CHÍ ĐÁNH GIÁ (thang 1-10):
1. overallScore: Tổng thể
2. dopamineScore: Có khoảnh khắc sảng khoái? (chốt deal, thu hoạch, vả mặt, đột phá, ấm áp chữa lành)
3. pacingScore: Nhịp truyện hợp lý? CÓ scene nhịp chậm tương phản không? Nếu TOÀN BỘ scenes đều cùng cường độ cao → pacingScore tối đa 5.
4. endingHookScore: Kết chương có lực kéo đọc tiếp? (sự tò mò, mong chờ kết quả hoặc cliffhanger)

KIỂM TRA BỔ SUNG (BẮT BUỘC):
5. COMEDY: Chương có ít nhất 1 khoảnh khắc hài hước tự nhiên không? (nội tâm tự giễu, não bổ, gap moe, vô sỉ). Nếu KHÔNG CÓ bất kỳ yếu tố hài nào → tạo issue type "quality", severity "major", description "Thiếu comedy beat — chương không có khoảnh khắc hài hước nào".
6. LẶP TỪ: Đếm các tính từ/trạng từ/màu sắc xuất hiện nhiều nhất. Nếu BẤT KỲ từ nào xuất hiện >5 lần → tạo issue type "quality", severity "major", mô tả từ bị lặp và số lần. Nếu >8 lần → severity "critical".
7. NỘI TÂM ĐA LỚP: Chương có ít nhất 2 đoạn nội tâm đi sâu hơn bề mặt không? (không chỉ "anh cảm thấy đau" mà phải tả cụ thể cảm giác, ký ức liên quan, nỗi sợ ẩn giấu). Nếu thiếu → tạo issue type "quality", severity "moderate".
8. GIỌNG NÓI NHÂN VẬT: Các nhân vật có giọng nói khác biệt nhau không? Nếu bỏ tên đi mà không phân biệt được ai nói → tạo issue type "dialogue", severity "moderate".

ISSUES: Liệt kê vấn đề (pacing/consistency/dopamine/quality/word_count/dialogue/continuity)

KIỂM TRA MÂU THUẪN (BẮT BUỘC):
- Nếu nhân vật đã CHẾT mà xuất hiện lại sống -> type "continuity", severity "critical"
- Nếu sức mạnh/tài sản MC bị THOÁI LUI vô lý -> type "continuity", severity "critical"
- Nếu vi phạm quy tắc thế giới đã thiết lập -> type "continuity", severity "critical"
- Nếu nhân vật hành xử trái ngược hoàn toàn với tính cách -> type "continuity", severity "major"

VERDICT:
- APPROVE (overallScore >= 6 VÀ đủ từ): approved=true, requiresRewrite=false
- REVISE (4-5): approved=false, requiresRewrite=false
- REWRITE (<=3 HOẶC <60% target words HOẶC continuity critical/major HOẶC thiếu ending hook ở non-finale): approved=false, requiresRewrite=true
- LƯU Ý: Nếu có ≥2 issues severity "major" (kể cả comedy, lặp từ, nội tâm) → overallScore giảm tối thiểu 1 điểm.

LƯU Ý THỂ LOẠI:
- Truyện kinh doanh/điền viên/sinh hoạt KHÔNG CẦN cliffhanger nguy hiểm, chỉ cần "Ending Hook" gây tò mò, mong đợi kết quả. KHÔNG đánh lỗi pacing nếu truyện nhịp độ chậm ấm áp.

OUTPUT: JSON theo format CriticOutput.`;

// ── Write Chapter ────────────────────────────────────────────────────────────

export interface WriteChapterOptions {
  projectId?: string;
  protagonistName?: string;
  topicId?: string;
  isFinalArc?: boolean;
  genreBoundary?: string;
  worldBible?: string;
}

export async function writeChapter(
  chapterNumber: number,
  contextString: string,
  genre: GenreType,
  targetWordCount: number,
  previousTitles: string[],
  config: GeminiConfig,
  maxRetries: number = 3,
  options?: WriteChapterOptions,
): Promise<WriteChapterResult> {
  const startTime = Date.now();
  const style = getStyleByGenre(genre);
  let rewriteInstructions = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Step 1: Architect
    const outline = await runArchitect(
      chapterNumber,
      contextString,
      targetWordCount,
      previousTitles,
      rewriteInstructions,
      config,
      options,
    );

    // Step 2: Writer
    let content = await runWriter(
      outline,
      contextString,
      genre,
      style,
      targetWordCount,
      config,
      rewriteInstructions,
      options,
    );

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
    const critic = await runCritic(
      outline,
      content,
      targetWordCount,
      contextString,
      config,
      options?.isFinalArc === true,
    );

    if (critic.requiresRewrite && attempt < maxRetries - 1) {
      rewriteInstructions = critic.rewriteInstructions || 'Cải thiện chất lượng tổng thể.';
      continue;
    }

    // Extract title with similarity check
    const title = extractTitle(content, chapterNumber, outline.title, previousTitles);

    return {
      chapterNumber,
      title,
      content,
      wordCount: finalWordCount,
      qualityScore: critic.overallScore,
      criticReport: critic,
      outline,
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
  options?: WriteChapterOptions,
): Promise<ChapterOutline> {
  const titleRules = buildTitleRulesPrompt(previousTitles);
  const minScenes = Math.max(4, Math.ceil(targetWords / 600));
  const wordsPerScene = Math.round(targetWords / minScenes);

  // Golden Chapter requirements for ch.1-3
  const isGolden = chapterNumber <= 3;
  const goldenReqs = isGolden
    ? GOLDEN_CHAPTER_REQUIREMENTS[`chapter${chapterNumber}` as keyof typeof GOLDEN_CHAPTER_REQUIREMENTS]
    : null;

  // Load constraints if projectId available
  let constraintSection = '';
  if (options?.projectId) {
    try {
      constraintSection = await loadConstraintSection(options.projectId, context, options.protagonistName || '');
    } catch {
      // Non-fatal
    }
  }

  // Build topic section
  const topicSection = buildTopicSection(options?.topicId);

  // Emotional arc planning
  const emotionalArcGuide = `
CẢM XÚC ARC (bắt buộc lên kế hoạch):
- Mở đầu: cảm xúc gì cho người đọc? (tò mò, lo lắng, phẫn nộ...)
- Giữa chương: chuyển sang cảm xúc gì? (căng thẳng, hồi hộp, đau lòng...)
- Cao trào: đỉnh điểm cảm xúc? (phấn khích, sốc, hả hê...)
- Kết: để lại cảm xúc gì? (háo hức đọc tiếp, day dứt, mong chờ...)
Nguyên tắc: PHẢI có contrast cảm xúc giữa các phần (buồn→vui, sợ→phấn khích)`;

  // Engagement checklist
  const engagementGuide = `
ENGAGEMENT (mỗi chương phải có):
${ENGAGEMENT_CHECKLIST.perChapter.map((e: string) => '- ' + e).join('\n')}

NGÂN SÁCH SỨC MẠNH (BẮT BUỘC):
- Trong arc 20 chương: tối đa ${ENGAGEMENT_CHECKLIST.powerBudget.perArcRules.maxPowerUps} power-up, tối đa ${ENGAGEMENT_CHECKLIST.powerBudget.perArcRules.maxBreakthroughs} breakthrough
- ${ENGAGEMENT_CHECKLIST.powerBudget.perArcRules.nonPowerChapters}
- KHÔNG được cho MC tăng cảnh giới/sức mạnh mỗi chương`;

  // Final arc handling
  const finalArcGuide = options?.isFinalArc
    ? `KẾT THÚC CHƯƠNG (ARC CUỐI):
- KHÔNG dùng cliffhanger — kết thúc thỏa mãn
- Nếu đây là chương cuối cùng: viết epilogue, giải quyết mọi xung đột
- Nếu gần cuối: có thể dùng mild suspense nhưng không mở plot thread mới`
    : `CLIFFHANGER TECHNIQUES (chọn 1 cho cuối chương):
${CLIFFHANGER_TECHNIQUES.map((c: { name: string; example: string }) => '- ' + c.name + ': ' + c.example).join('\n')}`;

  const prompt = `Lên kế hoạch cho CHƯƠNG ${chapterNumber}.

${context}

${constraintSection}
${topicSection}

${titleRules}

Target: ${targetWords} từ. Tối thiểu ${minScenes} scenes (mỗi ~${wordsPerScene} từ).
${rewriteInstructions ? `\nYÊU CẦU SỬA: ${rewriteInstructions}` : ''}
${isGolden ? `\nGOLDEN CHAPTER ${chapterNumber}:\nMust have: ${goldenReqs?.mustHave.join(', ')}\nAvoid: ${goldenReqs?.avoid.join(', ')}` : ''}

${emotionalArcGuide}

${finalArcGuide}

${engagementGuide}

ĐA GÓC NHÌN (MULTI-POV):
- POV mặc định là nhân vật chính
- CÓ THỂ chuyển POV sang nhân vật khác cho 1-2 scenes NẾU phù hợp cốt truyện
- Nếu đổi POV, ghi rõ "pov" trong từng scene object

Trả về JSON ChapterOutline:
{
  "chapterNumber": ${chapterNumber},
  "title": "tiêu đề hấp dẫn",
  "summary": "tóm tắt 2-3 câu",
  "pov": "tên nhân vật POV mặc định",
  "location": "địa điểm chính",
  "scenes": [
    {"order":1, "setting":"...", "characters":["..."], "goal":"...", "conflict":"...", "resolution":"...", "estimatedWords":${wordsPerScene}, "pov":"nhân vật POV"}
  ],
  "tensionLevel": 7,
  "dopaminePoints": [{"type":"face_slap", "scene":1, "description":"...", "intensity":8, "setup":"...", "payoff":"..."}],
  "emotionalArc": {"opening":"tò mò", "midpoint":"căng thẳng", "climax":"phấn khích", "closing":"háo hức"},
  "comedyBeat": "MÔ TẢ khoảnh khắc hài hước: loại hình (não bổ/vô sỉ/phản kém/nội tâm tự giễu), xảy ra ở scene nào, nội dung cụ thể",
  "slowScene": "Scene số mấy là scene nhịp chậm (đối thoại/chiêm nghiệm/slice-of-life) để tạo tương phản nhịp điệu",
  "cliffhanger": "tình huống lơ lửng (BẮT BUỘC nếu không phải finale arc)",
  "targetWordCount": ${targetWords}
}`;

  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 16384, systemPrompt: ARCHITECT_SYSTEM }, { jsonMode: true });

  // Check finishReason for truncation
  if (res.finishReason === 'length' || res.finishReason === 'MAX_TOKENS') {
    console.warn(`[Architect] Chapter ${chapterNumber}: output truncated (finishReason=${res.finishReason})`);
  }

  const parsed = parseJSON<ChapterOutline>(res.content);

  if (!parsed || !parsed.scenes?.length) {
    throw new Error(`Architect chapter ${chapterNumber}: JSON parse failed — raw: ${res.content.slice(0, 300)}`);
  }

  // Validate: ensure enough scenes
  if (!parsed.scenes || parsed.scenes.length < minScenes) {
    parsed.scenes = generateMinimalScenes(minScenes, wordsPerScene, parsed.pov || options?.protagonistName || '');
  }

  // Fix scene word estimates if too low
  const totalSceneWords = parsed.scenes.reduce((s, sc) => s + (sc.estimatedWords || 0), 0);
  if (totalSceneWords < targetWords * 0.8) {
    const perScene = Math.round(targetWords / parsed.scenes.length);
    for (const scene of parsed.scenes) {
      scene.estimatedWords = perScene;
    }
  }

  // Enforce targetWordCount
  parsed.targetWordCount = targetWords;

  // Enforce non-empty cliffhanger for non-finale arcs
  if (!options?.isFinalArc && !parsed.cliffhanger?.trim()) {
    parsed.cliffhanger = synthesizeFallbackCliffhanger(parsed);
  }

  return parsed;
}

// ── Writer Agent ─────────────────────────────────────────────────────────────

async function runWriter(
  outline: ChapterOutline,
  context: string,
  genre: GenreType,
  style: ReturnType<typeof getStyleByGenre>,
  targetWords: number,
  config: GeminiConfig,
  rewriteInstructions: string,
  options?: WriteChapterOptions,
): Promise<string> {
  const totalTargetWords = outline.targetWordCount || targetWords;

  // Build rich style context
  const richStyleContext = buildStyleContext(genre, getDominantSceneType(outline));
  const enhancedStyle = getEnhancedStyleBible(genre);

  // Build per-scene guidance with POV
  const sceneGuidance = outline.scenes.map(s => {
    const sceneType = inferSceneType(s);
    const pacing = enhancedStyle.pacingRules[sceneType];
    const povHint = s.pov && s.pov !== outline.pov
      ? `\n  👁 POV: ${s.pov} (GÓC NHÌN KHÁC — viết từ suy nghĩ, cảm xúc, nhận thức của ${s.pov}, KHÔNG của protagonist)`
      : '';
    return `- Scene ${s.order}: ${s.goal} → Conflict: ${s.conflict} → Resolution: ${s.resolution}
  Bối cảnh: ${s.setting} | Nhân vật: ${s.characters.join(', ')}${povHint}
  ⚠️ Viết TỐI THIỂU ${s.estimatedWords} từ cho scene này
  📝 Nhịp điệu: câu ${pacing.sentenceLength.min}-${pacing.sentenceLength.max} từ, tốc độ ${pacing.paceSpeed === 'fast' ? 'NHANH' : pacing.paceSpeed === 'slow' ? 'CHẬM' : 'VỪA'}`;
  }).join('\n\n');

  // Detect multi-POV
  const hasMultiPOV = outline.scenes.some(s => s.pov && s.pov !== outline.pov);
  const multiPOVGuide = hasMultiPOV
    ? `\nCHUYỂN GÓC NHÌN (MULTI-POV):
- Khi chuyển POV sang nhân vật khác, PHẢI có dấu hiệu rõ ràng (xuống dòng + dấu hiệu cảnh mới)
- Viết nội tâm, cảm xúc, nhận thức đúng nhân vật POV đó — KHÔNG biết thông tin nhân vật khác giấu
- Mỗi POV phải có giọng văn/ngữ điệu khác biệt phù hợp tính cách nhân vật\n`
    : '';

  // Vocabulary hints
  const vocabHints = buildVocabularyHints(outline, enhancedStyle.vocabulary);

  // Character voice guide
  const charVoiceGuide = buildCharacterVoiceGuide(outline, options?.worldBible);

  // Emotional arc
  const emotionalArcSection = outline.emotionalArc
    ? `\nCẢM XÚC ARC (PHẢI tuân thủ):
- Mở đầu: ${outline.emotionalArc.opening}
- Giữa chương: ${outline.emotionalArc.midpoint}
- Cao trào: ${outline.emotionalArc.climax}
- Kết thúc: ${outline.emotionalArc.closing}
→ Viết sao cho người đọc CẢM NHẬN được sự chuyển đổi cảm xúc rõ ràng.`
    : '';

  // Topic section
  const topicSection = buildTopicSection(options?.topicId);

  // Rewrite instructions for Writer
  const rewriteSection = rewriteInstructions
    ? `\nYÊU CẦU SỬA TỪ LẦN TRƯỚC: ${rewriteInstructions}\n`
    : '';

  const styleGuide = [
    `Giọng văn: ${style.authorVoice}`,
    `Tỷ lệ đối thoại: ${style.dialogueRatio[0]}-${style.dialogueRatio[1]}%`,
    `Nhịp: ${style.pacingStyle}`,
    style.genreConventions.slice(0, 10).join('\n'),
  ].join('\n');

  const prompt = `Viết CHƯƠNG ${outline.chapterNumber}: "${outline.title}"

${rewriteSection}BLUEPRINT:
${JSON.stringify(outline, null, 2)}

CONTEXT:
${context}

SCENES (viết ĐẦY ĐỦ cho MỖI scene — KHÔNG bỏ qua scene nào):
${sceneGuidance}
${multiPOVGuide}
${emotionalArcSection}

KỸ THUẬT CÂU CHƯƠNG (BẮT BUỘC ÁP DỤNG ĐỂ ĐẠT ĐỘ DÀI):
- 🖐️ ${SCENE_EXPANSION_RULES.expansionTechniques.find(t => t.name === 'FiveSenses')?.description}: ${SCENE_EXPANSION_RULES.expansionTechniques.find(t => t.name === 'FiveSenses')?.example}
- 🧠 ${SCENE_EXPANSION_RULES.expansionTechniques.find(t => t.name === 'InnerMonologueLayers')?.description}: ${SCENE_EXPANSION_RULES.expansionTechniques.find(t => t.name === 'InnerMonologueLayers')?.example}
- 👥 ${SCENE_EXPANSION_RULES.expansionTechniques.find(t => t.name === 'BystanderReactions')?.description}: ${SCENE_EXPANSION_RULES.expansionTechniques.find(t => t.name === 'BystanderReactions')?.example}

HỘI THOẠI KẸP DAO (SUBTEXT):
${SUBTEXT_DIALOGUE_RULES.rules.map(r => `- ${r}`).join('\n')}

TẤU HÀI WEBNOVEL (COMEDY MECHANICS):
- ${COMEDY_MECHANICS_RULES.description}
${COMEDY_MECHANICS_RULES.mechanics.map(m => `- ${m.name}: ${m.description}`).join('\n')}
- Lệnh CẤM Tuyện Đối: ${COMEDY_MECHANICS_RULES.forbidden.join(', ')}

CẤM SỬ DỤNG VĂN MẪU AI (ANTI-CLICHÉ):
- ${ANTI_CLICHE_RULES.description}
- Các từ bị CẤM: ${ANTI_CLICHE_RULES.blacklist.join(', ')}
- Hướng dẫn thay thế: ${ANTI_CLICHE_RULES.guidance}

CHỐNG LẶP MÀU SẮC & TÍNH TỪ (CỰC KỲ QUAN TRỌNG — vi phạm sẽ bị REWRITE):
${ANTI_CLICHE_RULES.colorRepetitionRule}

DOPAMINE (phải có):
${outline.dopaminePoints.map(dp => `- ${dp.type}: Setup: ${dp.setup} → Payoff: ${dp.payoff}`).join('\n')}

COMEDY BEAT (BẮT BUỘC — chương KHÔNG CÓ hài hước sẽ bị REWRITE):
${outline.comedyBeat ? `Kế hoạch: ${outline.comedyBeat}` : 'Tự chọn 1 khoảnh khắc: MC nội tâm tự giễu nhại, hoặc bystander não bổ suy diễn, hoặc gap moe phá hình tượng.'}

SCENE NHỊP CHẬM (BẮT BUỘC — toàn bộ cùng cường độ cao sẽ bị trừ điểm):
${outline.slowScene ? `Scene nhịp chậm: ${outline.slowScene}` : 'Chọn 1 scene để giảm nhịp: MC dừng lại ăn uống/nghỉ ngơi/nói chuyện phiếm/chiêm nghiệm. Tạo tương phản "thung lũng" trước hoặc sau cao trào.'}

CLIFFHANGER: ${outline.cliffhanger}
${topicSection}
PHONG CÁCH:
${styleGuide}

${vocabHints}

${charVoiceGuide}

${richStyleContext}

ĐỘ DÀI YÊU CẦU (BẮT BUỘC):
- Viết TỐI THIỂU ${totalTargetWords} từ
- CẤM TÓM TẮT. Phải kéo dài thời gian và không gian của từng cảnh.
- Chương dưới ${Math.round(totalTargetWords * 0.7)} từ sẽ bị từ chối
- Tổng ${outline.scenes.length} scenes x ~${Math.round(totalTargetWords / outline.scenes.length)} từ/scene
- KHÔNG dùng markdown. Viết văn thuần túy.

Bắt đầu viết:`;

  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM });

  // Check finishReason
  if (res.finishReason === 'length' || res.finishReason === 'MAX_TOKENS') {
    console.warn(`[Writer] Chapter ${outline.chapterNumber}: output truncated`);
  }

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

  // Take larger tail context (10K chars instead of 2K)
  const lastPart = partialContent.slice(-10000);

  const prompt = `Tiếp tục viết phần còn lại. ĐÃ VIẾT ${currentWords} từ, CẦN THÊM ${remaining} từ.

NỘI DUNG ĐÃ VIẾT (phần cuối):
...${lastPart}

SCENES CÒN LẠI THEO BLUEPRINT:
${JSON.stringify(outline.scenes.slice(-3))}

TIẾP TỤC NGAY TỪ CHỖ DỪNG — không lặp lại:`;

  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM });
  return res.content || null;
}

// ── Critic Agent ─────────────────────────────────────────────────────────────

async function runCritic(
  outline: ChapterOutline,
  content: string,
  targetWords: number,
  previousContext: string,
  config: GeminiConfig,
  isFinalArc: boolean,
): Promise<CriticOutput> {
  const wordCount = countWords(content);
  const wordRatio = wordCount / targetWords;

  // Show FULL content to critic (not truncated)
  const contentPreview = content;

  // Cross-chapter context for contradiction detection
  const crossChapterSection = previousContext
    ? `BỐI CẢNH CÂU CHUYỆN (dùng để KIỂM TRA mâu thuẫn):
${previousContext.slice(0, 5000)}

`
    : '';

  // Build repetition report for Critic
  const repetitionReport = buildRepetitionReport(content);

  const prompt = `Đánh giá chương nghiêm túc:

${crossChapterSection}OUTLINE: ${outline.title} — ${outline.summary}
TARGET DOPAMINE: ${outline.dopaminePoints.map(dp => `${dp.type}: ${dp.description}`).join('; ')}
TARGET WORDS: ${targetWords}
ACTUAL WORDS: ${wordCount} (đạt ${Math.round(wordRatio * 100)}% target)

${wordRatio < 0.6 ? '⚠️ CẢNH BÁO: Số từ DƯỚI 60% target → requiresRewrite PHẢI = true' : ''}
${wordRatio < 0.8 ? '⚠️ LƯU Ý: Số từ dưới 80% target → giảm điểm overallScore' : ''}
${!isFinalArc ? '⚠️ NON-FINALE: Kết chương PHẢI có ending hook/cliffhanger rõ ràng. Nếu thiếu, tạo issue severity major và requiresRewrite=true.' : '⚠️ FINALE ARC: Có thể kết chương đóng, không bắt buộc cliffhanger.'}

BÁO CÁO LẶP TỪ (tự động phân tích):
${repetitionReport}

NỘI DUNG CHƯƠNG (FULL):
${contentPreview}

Đánh giá và trả về JSON:
{
  "overallScore": <1-10>,
  "dopamineScore": <1-10>,
  "pacingScore": <1-10>,
  "endingHookScore": <1-10>,
  "issues": [{"type": "word_count|pacing|logic|detail|continuity|quality|dialogue", "description": "...", "severity": "minor|moderate|major|critical"}],
  "approved": <true nếu overallScore >= 6 VÀ wordRatio >= 70%>,
  "requiresRewrite": <true nếu overallScore <= 3 HOẶC wordRatio < 60% HOẶC có lỗi continuity major/critical>,
  "rewriteInstructions": "hướng dẫn cụ thể nếu cần rewrite — PHẢI nêu rõ từ bị lặp cần thay thế, scene nào thiếu comedy, scene nào thiếu nội tâm đa lớp"
}

KIỂM TRA MÂU THUẪN (BẮT BUỘC):
- Nếu nhân vật đã CHẾT mà xuất hiện lại sống -> type "continuity", severity "critical", requiresRewrite=true
- Nếu sức mạnh/cảnh giới MC bị THOÁI LUI vô lý -> type "continuity", severity "critical", requiresRewrite=true
- Nếu vi phạm quy tắc thế giới đã thiết lập -> type "continuity", severity "critical", requiresRewrite=true
- Nếu nhân vật hành xử trái ngược hoàn toàn với tính cách -> type "continuity", severity "major", requiresRewrite=true

KIỂM TRA CHẤT LƯỢNG BỔ SUNG (BẮT BUỘC):
- COMEDY: Nếu chương KHÔNG có khoảnh khắc hài hước nào → issue type "quality", severity "major"
- LẶP TỪ: Dùng BÁO CÁO LẶP TỪ ở trên. Nếu có từ >5 lần → issue type "quality", severity "major". Nếu >8 lần → severity "critical", requiresRewrite=true
- NỘI TÂM: Nếu không có đoạn nội tâm đi sâu hơn bề mặt → issue type "quality", severity "moderate"
- GIỌNG NÓI: Nếu các nhân vật nói giống nhau → issue type "dialogue", severity "moderate"
- NHỊP ĐIỆU: Nếu toàn bộ scenes đều cùng cường độ cao (không có scene chậm) → pacingScore tối đa 5`;

  try {
    const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 4096, systemPrompt: CRITIC_SYSTEM }, { jsonMode: true });

    if (!res.content) {
      // Fail closed: don't approve on error
      return createFailClosedCriticOutput(wordCount, targetWords);
    }

    const parsed = parseJSON<CriticOutput>(res.content);

    if (!parsed) {
      return createFailClosedCriticOutput(wordCount, targetWords);
    }

    // Hard enforcement: critical/major continuity issues must be rewritten
    const forcedRewriteIssues = (parsed.issues || []).filter((issue: CriticIssue) => {
      if (issue.type !== 'continuity') return false;
      return issue.severity === 'critical' || issue.severity === 'major';
    });

    if (forcedRewriteIssues.length > 0) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, 3);
      if (!parsed.rewriteInstructions || parsed.rewriteInstructions.trim().length === 0) {
        parsed.rewriteInstructions = `Sửa lỗi continuity: ${forcedRewriteIssues.map((i: CriticIssue) => i.description).join('; ')}`;
      }
    }

    // Override: force rewrite if word count is critically low
    if (wordRatio < 0.6) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      if (!parsed.rewriteInstructions) {
        parsed.rewriteInstructions = `Chương quá ngắn (${wordCount}/${targetWords} từ). Phải viết đầy đủ.`;
      }
    }

    // Hard enforcement: severe word repetition triggers rewrite
    const repetitionIssues = detectSevereRepetition(content);
    if (repetitionIssues.length > 0) {
      parsed.issues = parsed.issues || [];
      for (const ri of repetitionIssues) {
        parsed.issues.push(ri);
      }
      // Only force rewrite for critical repetition (8+ occurrences)
      const hasCritical = repetitionIssues.some(ri => ri.severity === 'critical');
      if (hasCritical) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        const repetitionGuide = repetitionIssues.map(ri => ri.description).join('; ');
        parsed.rewriteInstructions = (parsed.rewriteInstructions || '') + ` Sửa lặp từ: ${repetitionGuide}`;
      } else {
        // Major repetition: penalize score but don't force rewrite
        parsed.overallScore = Math.min(parsed.overallScore || 10, parsed.overallScore - 1);
      }
    }

    // Hard enforcement for non-finale chapters: ending hook is required
    if (!isFinalArc && !hasCliffhangerSignal(content)) {
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'pacing',
        description: 'Kết chương thiếu lực kéo đọc tiếp (cliffhanger/ending hook yếu hoặc không có).',
        severity: 'major',
      });
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, 5);
      if (!parsed.rewriteInstructions || parsed.rewriteInstructions.trim().length === 0) {
        parsed.rewriteInstructions = 'Viết lại đoạn kết để có cliffhanger/hook rõ ràng, tạo lý do đọc tiếp ngay chương sau.';
      }
    }

    return parsed;
  } catch (error) {
    // Fail closed: don't approve on error
    return createFailClosedCriticOutput(wordCount, targetWords);
  }
}

function createFailClosedCriticOutput(wordCount: number, targetWords: number): CriticOutput {
  const wordRatio = wordCount / targetWords;
  return {
    overallScore: 5,
    dopamineScore: 5,
    pacingScore: 5,
    issues: [{ type: 'critic_error', description: 'Critic failed to respond', severity: 'major' }],
    approved: false,
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
    const match = trimmed.match(/^Chương\s+\d+\s*[:\-–—]\s*(.+)/i);
    if (match && match[1].length >= 4 && match[1].length <= 60) {
      return match[1].trim();
    }
  }

  // Title similarity check - if too similar, generate unique fallback
  let finalTitle = outlineTitle || `Chương ${chapterNumber}`;
  if (previousTitles.length > 0) {
    const { similarity } = titleChecker.findMostSimilar(finalTitle, previousTitles);
    if (similarity >= 0.7) {
      // Generate fallback from content
      const sentences = content.slice(0, 500).match(/[^.!?。！？]+[.!?。！？]/g) || [];
      const shortSentence = sentences.find(s => {
        const trimmed = s.trim();
        return trimmed.length >= 5 && trimmed.length <= 40
          && !trimmed.startsWith('—') && !trimmed.startsWith('-')
          && !trimmed.startsWith('"') && !trimmed.startsWith('「');
      });
      finalTitle = shortSentence
        ? shortSentence.trim().replace(/^["'"「『\s]+|["'"」』\s.!?。！？]+$/g, '')
        : `Chương ${chapterNumber}`;
    }
  }

  return finalTitle;
}

function synthesizeFallbackCliffhanger(outline: ChapterOutline): string {
  const lastScene = outline.scenes?.[outline.scenes.length - 1];
  const conflict = lastScene?.conflict?.trim();
  const resolution = lastScene?.resolution?.trim();

  if (conflict && conflict.length > 8) {
    return `Mâu thuẫn cuối chương vẫn chưa khép: ${conflict}`;
  }

  if (resolution && resolution.length > 8) {
    return `Sau khi ${resolution.toLowerCase()}, một biến cố mới bất ngờ xuất hiện.`;
  }

  return 'Khi mọi thứ tưởng như đã yên, một nguy cơ mới đột ngột xuất hiện ngay trước mắt.';
}

function hasCliffhangerSignal(content: string): boolean {
  const tail = content.slice(-500).toLowerCase();
  const signals = [
    // Action / Suspense
    '?', '...', '…', 'bất ngờ', 'đột nhiên', 'bỗng', 'sững sờ', 'kinh hãi',
    'ngay lúc đó', 'vừa khi', 'tiếng động', 'cánh cửa', 'bóng đen', 'khựng lại',
    'không thể tin', 'run lên', 'hô lớn',
    // Business / Curiosity / Chill
    'chờ đợi', 'kết quả', 'ngày mai', 'sáng mai', 'mỉm cười', 'thú vị',
    'bắt đầu', 'chuẩn bị', 'mong đợi', 'thành quả', 'thu hoạch', 'giá trị',
    'chưa biết', 'bí ẩn', 'rốt cuộc', 'suy nghĩ'
  ];

  let score = 0;
  for (const signal of signals) {
    if (tail.includes(signal)) score += 1;
  }

  return score >= 2;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Detect severe word repetition and return CriticIssue objects.
 * Used for hard enforcement in runCritic.
 */
function detectSevereRepetition(content: string): CriticIssue[] {
  const text = content.toLowerCase();
  const issues: CriticIssue[] = [];

  const tracked: Record<string, string[]> = {
    'tím sẫm': ['tím sẫm', 'tím đen', 'sắc tím'],
    'vàng kim': ['vàng kim', 'ánh vàng kim'],
    'đỏ rực': ['đỏ rực', 'đỏ thẫm', 'đỏ rỉ sét'],
    'rực rỡ': ['rực rỡ'],
    'kinh hoàng': ['kinh hoàng', 'kinh hãi', 'kinh ngạc'],
    'pixel hóa': ['pixel hóa', 'pixel'],
    'rỉ sét': ['rỉ sét'],
    'ken két': ['ken két'],
    'đặc quánh': ['đặc quánh'],
    'mờ ảo': ['mờ ảo', 'mờ nhạt'],
    'bùng phát': ['bùng phát', 'bùng nổ'],
  };

  for (const [groupName, variants] of Object.entries(tracked)) {
    let total = 0;
    for (const variant of variants) {
      const regex = new RegExp(variant, 'gi');
      const matches = text.match(regex);
      if (matches) total += matches.length;
    }
    if (total >= 8) {
      issues.push({
        type: 'quality',
        description: `Lặp từ nghiêm trọng: "${groupName}" xuất hiện ${total} lần. Thay bằng từ đồng nghĩa hoặc miêu tả gián tiếp.`,
        severity: 'critical',
      });
    } else if (total >= 5) {
      issues.push({
        type: 'quality',
        description: `Lặp từ: "${groupName}" xuất hiện ${total} lần. Giảm xuống tối đa 3 lần, dùng từ thay thế.`,
        severity: 'major',
      });
    }
  }

  return issues;
}

/**
 * Analyze word repetition in chapter content.
 * Returns a human-readable report for the Critic to use.
 * Tracks colors, adjectives, and common AI-repetitive patterns.
 */
function buildRepetitionReport(content: string): string {
  const text = content.toLowerCase();

  // Words/phrases to track for repetition
  const tracked: Record<string, string[]> = {
    // Colors
    'tím sẫm': ['tím sẫm', 'tím đen', 'sắc tím'],
    'vàng kim': ['vàng kim', 'ánh vàng kim'],
    'đỏ rực': ['đỏ rực', 'đỏ thẫm', 'đỏ rỉ sét'],
    'bạc trắng': ['bạc trắng', 'trắng bạc', 'bạc lạnh'],
    'đen ngòm': ['đen ngòm', 'đen kịt', 'đen tuyền'],
    // Adjectives
    'rực rỡ': ['rực rỡ'],
    'mờ ảo': ['mờ ảo', 'mờ nhạt'],
    'đặc quánh': ['đặc quánh'],
    'chập chờn': ['chập chờn'],
    // Emotions
    'kinh hoàng': ['kinh hoàng', 'kinh hãi', 'kinh ngạc'],
    'sững sờ': ['sững sờ', 'sững người'],
    // Sounds
    'ken két': ['ken két'],
    'rít lên': ['rít lên', 'rít'],
    // States
    'pixel hóa': ['pixel hóa', 'pixel'],
    'rỉ sét': ['rỉ sét'],
    'tan rã': ['tan rã', 'phân rã'],
    'bùng phát': ['bùng phát', 'bùng nổ'],
    'run rẩy': ['run rẩy', 'run lên'],
  };

  const counts: Array<{ group: string; count: number; variants: string }> = [];

  for (const [groupName, variants] of Object.entries(tracked)) {
    let total = 0;
    const found: string[] = [];
    for (const variant of variants) {
      const regex = new RegExp(variant, 'gi');
      const matches = text.match(regex);
      if (matches) {
        total += matches.length;
        found.push(`${variant}(${matches.length})`);
      }
    }
    if (total >= 3) {
      counts.push({ group: groupName, count: total, variants: found.join(', ') });
    }
  }

  if (counts.length === 0) {
    return 'Không phát hiện lặp từ nghiêm trọng.';
  }

  counts.sort((a, b) => b.count - a.count);
  const lines = counts.map(c => {
    const severity = c.count >= 8 ? '🔴 CRITICAL' : c.count >= 5 ? '🟡 MAJOR' : '⚪ MINOR';
    return `${severity}: "${c.group}" xuất hiện ${c.count} lần [${c.variants}]`;
  });

  return lines.join('\n');
}

function generateMinimalScenes(count: number, wordsPerScene: number, defaultPOV: string): SceneOutline[] {
  return Array.from({ length: count }, (_, i) => ({
    order: i + 1,
    setting: '',
    characters: [],
    goal: `Scene ${i + 1}`,
    conflict: '',
    resolution: '',
    estimatedWords: wordsPerScene,
    pov: defaultPOV,
  }));
}

async function loadConstraintSection(projectId: string, context: string, protagonistName: string): Promise<string> {
  try {
    const keywords: string[] = [protagonistName];

    // Extract potential character/location names from context
    const nameMatches = context.match(/[A-Z][a-zÀ-ỹ]+(?:\s+[A-Z][a-zÀ-ỹ]+)*/g) || [];
    for (const name of nameMatches.slice(0, 10)) {
      if (name.length > 2 && !keywords.includes(name)) {
        keywords.push(name);
      }
    }

    const extractor = getConstraintExtractor(projectId);
    const constraints = await extractor.getRelevantConstraints(projectId, keywords);

    if (constraints.length === 0) return '';

    const hard = constraints.filter(c => c.immutable);
    const soft = constraints.filter(c => !c.immutable);

    const parts: string[] = [];
    if (hard.length > 0) {
      parts.push('## RÀNG BUỘC CỨNG (TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM):');
      for (const c of hard) parts.push(`- ${c.context}`);
    }
    if (soft.length > 0) {
      parts.push('## TRẠNG THÁI HIỆN TẠI (có thể thay đổi nếu có lý do):');
      for (const c of soft) parts.push(`- ${c.context}`);
    }

    return '\n' + parts.join('\n') + '\n';
  } catch {
    return '';
  }
}

function buildTopicSection(topicId?: string): string {
  if (!topicId) return '';

  for (const genreConfig of Object.values(GENRE_CONFIG)) {
    const topic = genreConfig.topics.find(t => t.id === topicId);
    if (topic && topic.topicPromptHints) {
      return `\nTHÔNG TIN ĐẶC THÙ THỂ LOẠI (${topic.name}):\n` + 
             topic.topicPromptHints.map(h => `- ${h}`).join('\n') + '\n';
    }
  }

  return '';
}

function getDominantSceneType(outline: ChapterOutline): string {
  const sceneCounts: Record<string, number> = {};

  for (const scene of outline.scenes) {
    const type = inferSceneType(scene);
    sceneCounts[type] = (sceneCounts[type] || 0) + 1;
  }

  for (const dp of outline.dopaminePoints || []) {
    if (['face_slap', 'power_reveal', 'revenge'].includes(dp.type)) {
      sceneCounts['action'] = (sceneCounts['action'] || 0) + 1;
    } else if (['breakthrough'].includes(dp.type)) {
      sceneCounts['cultivation'] = (sceneCounts['cultivation'] || 0) + 1;
    } else if (['beauty_encounter'].includes(dp.type)) {
      sceneCounts['romance'] = (sceneCounts['romance'] || 0) + 1;
    }
  }

  let maxType = 'action';
  let maxCount = 0;
  for (const [type, count] of Object.entries(sceneCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }
  return maxType;
}

function inferSceneType(scene: { goal: string; conflict: string; resolution?: string; setting?: string }): SceneType {
  const text = `${scene.goal} ${scene.conflict} ${scene.resolution || ''} ${scene.setting || ''}`.toLowerCase();

  if (/chiến đấu|đánh|tấn công|kiếm|quyền|sát|giết|đấu|chiêu thức|pháp thuật/.test(text)) return 'action';
  if (/tu luyện|đột phá|đan điền|linh khí|cảnh giới|thiền/.test(text)) return 'cultivation';
  if (/tiết lộ|bí mật|phát hiện|sự thật/.test(text)) return 'revelation';
  if (/tình cảm|yêu|nhớ|thương|nàng|mỹ nhân/.test(text)) return 'romance';
  if (/hội thoại|nói chuyện|bàn bạc|thương lượng/.test(text)) return 'dialogue';
  if (/nguy hiểm|căng thẳng|bẫy|vây/.test(text)) return 'tension';
  if (/hài|cườii|buồn cườii/.test(text)) return 'comedy';
  return 'dialogue';
}

function buildVocabularyHints(outline: ChapterOutline, vocabulary: any): string {
  if (!vocabulary) return '';

  const hints: string[] = ['TỪ VỰNG BẮT BUỘC SỬ DỤNG (dùng ít nhất 5-8 biểu đạt):'];

  const hasAction = outline.scenes.some(s => inferSceneType(s) === 'action');
  const hasCultivation = outline.scenes.some(s => inferSceneType(s) === 'cultivation');
  const dopamineTypes = (outline.dopaminePoints || []).map(d => d.type);

  if (hasAction || dopamineTypes.includes('face_slap') || dopamineTypes.includes('power_reveal')) {
    hints.push(`Chiêu thức: ${vocabulary.powerExpressions?.techniques?.slice(0, 4).join(', ') || ''}`);
    hints.push(`Uy lực: ${vocabulary.powerExpressions?.weakToStrong?.slice(0, 4).join(', ') || ''}`);
  }

  if (hasCultivation || dopamineTypes.includes('breakthrough')) {
    hints.push(`Đột phá: ${vocabulary.powerExpressions?.breakthrough?.slice(0, 4).join(', ') || ''}`);
  }

  if (dopamineTypes.includes('face_slap') || dopamineTypes.includes('revenge')) {
    hints.push(`Khinh bỉ: ${vocabulary.emotions?.contempt?.slice(0, 4).join(', ') || ''}`);
    hints.push(`Phẫn nộ: ${vocabulary.emotions?.anger?.slice(0, 4).join(', ') || ''}`);
  }

  hints.push(`Kinh ngạc: ${vocabulary.emotions?.shock?.slice(0, 4).join(', ') || ''}`);
  hints.push(`Quyết tâm: ${vocabulary.emotions?.determination?.slice(0, 3).join(', ') || ''}`);

  if ((outline.tensionLevel || 50) >= 70) {
    hints.push(`Bầu không khí: ${vocabulary.atmosphere?.tense?.slice(0, 3).join(', ') || ''}`);
  }

  hints.push(`Xưng hô bề trên: ${vocabulary.honorifics?.superior?.slice(0, 4).join(', ') || ''}`);
  hints.push(`Xưng hô ngang hàng: ${vocabulary.honorifics?.peer?.slice(0, 4).join(', ') || ''}`);

  return hints.join('\n');
}

function buildCharacterVoiceGuide(outline: ChapterOutline, worldBible?: string): string {
  // Extract character names from outline
  const charNames = new Set<string>();
  for (const scene of outline.scenes) {
    for (const char of scene.characters) {
      charNames.add(char);
    }
  }

  if (charNames.size === 0) return '';

  const lines: string[] = [
    'GIỌNG NÓI NHÂN VẬT (BẮT BUỘC — mỗi nhân vật PHẢI có giọng khác biệt rõ rệt):',
    '',
    'NGUYÊN TẮC VÀNG: Che tên nhân vật, người đọc vẫn PHẢI nhận ra ai đang nói qua cách dùng từ.',
    '',
    'QUY TẮC GIỌNG NÓI THEO VAI TRÒ:',
    '• MC (nhân vật chính): Câu ngắn, dứt khoát. Khi căng thẳng dùng từ thô/chửi nhẹ. Có nội tâm tự giễu nhại, bình luận khô khan. Xưng "ta/tôi" tùy hoàn cảnh.',
    '• Đồng minh nữ/AI: Dùng thuật ngữ chuyên môn khi nghiêm túc, mỉa mai khi bình thường. Xưng hô theo quan hệ (ví dụ: "Ngài" khi công việc, bỏ formality khi hoảng).',
    '• Phản diện cấp cao: KHÔNG BAO GIỜ chửi bới. Nói lịch sự, dùng ẩn dụ, giấu sát khí trong lời ngọt. Câu dài, nhấn nhá.',
    '• Phản diện cấp thấp: Nói nhiều, khoe khoang, dùng từ thô. Câu ngắn, hung hãn.',
    '• Bystander/NPC: Ngắn gọn, dùng tiếng lóng/phương ngữ. Phản ứng cảm xúc trực tiếp.',
    '• Trẻ em/em gái: Câu ngắn, từ đơn giản, ngây thơ nhưng đôi khi sâu sắc bất ngờ.',
    '',
  ];

  for (const name of charNames) {
    lines.push(`- ${name}: ÁP DỤNG quy tắc giọng nói phù hợp vai trò ở trên. Tạo ít nhất 1 đặc điểm ngôn ngữ riêng (cách xưng hô, thói quen ngôn ngữ, hoặc cách phản ứng đặc trưng).`);
  }

  return lines.join('\n');
}

// Re-export for backward compatibility
export { GOLDEN_CHAPTER_REQUIREMENTS, ENGAGEMENT_CHECKLIST };
