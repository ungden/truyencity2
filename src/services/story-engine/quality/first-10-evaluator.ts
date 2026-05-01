/**
 * Story Engine v2 — First-10 Chapter Evaluator (Phase 25)
 *
 * After chapter 10 is written, evaluate the opening 10 chapters against the
 * 5 dimensions that decide whether a long-form (1000+ chapter) novel hooks
 * readers and sustains over time:
 *
 *   1. uspClarity         — Does the truyện have a distinct USP that's
 *                            visible by ch.3? (Phàm Nhân = "phàm + thận trọng",
 *                            Quỷ Bí = "occult pathway + bí ẩn tầng")
 *   2. hookStrength       — Does ch.1 grip enough to pull reader into ch.2-3?
 *                            (5-beat opening: hook → setup → conflict → escalation → cliff)
 *   3. payoffCadence      — Are there ≥3 dopamine peaks in ch.1-10? (face-slap,
 *                            recognition, milestone, harvest)
 *   4. coreLoopEstablished — Has the genre's pleasure loop been demonstrated by
 *                             ch.3? (tien-hiep: bottleneck → resource → tradeoff
 *                             → breakthrough; do-thi: opportunity → expertise →
 *                             result → recognition)
 *   5. genreFidelity      — Does the truyện stay inside its genre, or has it
 *                            drifted? (do-thi MC fighting with sword = drift)
 *
 * Verdict: pass / marginal / fail. Persisted to first_10_evaluations table.
 * Marginal/fail records become admin dashboard alerts — outline may need regen.
 *
 * Idempotent — uses a UNIQUE constraint on project_id so the eval runs at
 * most once per project. Cron retries (or repeated reaches of ch.10 if
 * chapters are reset) skip if a row already exists.
 *
 * Cost: 1 DeepSeek call (~$0.005) once per project lifetime. Non-blocking —
 * runs as a post-write task; chapters keep being written even if eval is
 * marginal/fail (the alert is for human review, not auto-pause).
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getSupabase } from '../utils/supabase';
import { getGenreContractForCritic } from '../templates/genre-process-blueprints';
import type { GeminiConfig, GenreType, StoryKernel } from '../types';

const EVAL_AT_CHAPTER = 10;
const PER_CHAPTER_DIGEST_CHARS = 4000;

interface First10Evaluation {
  uspClarity: number;
  hookStrength: number;
  payoffCadence: number;
  coreLoopEstablished: number;
  genreFidelity: number;
  overallScore: number;
  verdict: 'pass' | 'marginal' | 'fail';
  issues: Array<{
    dimension: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    description: string;
  }>;
  recommendations: string[];
}

/**
 * Evaluate the first 10 chapters of a project. Idempotent — checks
 * `first_10_evaluations` for an existing row before running.
 *
 * Returns null if:
 *  - project already evaluated
 *  - <10 chapters available
 *  - AI call empty / parse failed
 */
export async function runFirst10Evaluation(
  projectId: string,
  novelId: string,
  genre: GenreType,
  protagonistName: string,
  config: GeminiConfig,
): Promise<First10Evaluation | null> {
  const db = getSupabase();

  // Idempotency check — skip if already evaluated.
  const { data: existing } = await db
    .from('first_10_evaluations')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();
  if (existing) {
    return null;
  }

  // Read chapters 1-10 from the novel's chapter rows.
  const { data: chapters, error: chErr } = await db
    .from('chapters')
    .select('chapter_number, title, content')
    .eq('novel_id', novelId)
    .lte('chapter_number', EVAL_AT_CHAPTER)
    .order('chapter_number', { ascending: true });

  if (chErr) {
    console.warn(`[First10] Chapter fetch failed for project ${projectId}: ${chErr.message}`);
    return null;
  }
  if (!chapters || chapters.length < EVAL_AT_CHAPTER) {
    console.warn(`[First10] Only ${chapters?.length || 0} chapters available, skipping eval`);
    return null;
  }

  const { data: projectRow } = await db
    .from('ai_story_projects')
    .select('story_outline')
    .eq('id', projectId)
    .maybeSingle();
  const setupKernel = projectRow?.story_outline && typeof projectRow.story_outline === 'object'
    ? (projectRow.story_outline as { setupKernel?: StoryKernel }).setupKernel
    : undefined;
  const kernelBlock = setupKernel ? `[STORY KERNEL — CH.1-10 PHẢI CHỨNG MINH MÁY TRUYỆN NÀY]
Reader fantasy: ${setupKernel.readerFantasy}
Protagonist engine: ${setupKernel.protagonistEngine}
Pleasure loop: ${setupKernel.pleasureLoop?.join(' → ')}
System: ${setupKernel.systemMechanic?.name} | input ${setupKernel.systemMechanic?.input} | output ${setupKernel.systemMechanic?.output} | limit ${setupKernel.systemMechanic?.limit} | reward ${setupKernel.systemMechanic?.reward}
Social reactor: ${setupKernel.socialReactor?.witnesses?.join(', ')} | ${setupKernel.socialReactor?.reactionModes?.join(', ')}
Novelty ladder: ${setupKernel.noveltyLadder?.map(n => `${n.chapterRange}: ${n.newToy}`).join(' / ')}
Control: ${setupKernel.controlRules?.payoffCadence}; ${setupKernel.controlRules?.attentionGradient}

Đánh giá thêm: reader fantasy có hiện không, pleasureLoop có được demo trước ch.3 không, social reactor có hoạt động trước ch.10 không, novelty có seed mà không drift không.

` : '';

  const digest = chapters
    .map(c => `--- CHƯƠNG ${c.chapter_number}: ${c.title} ---\n${(c.content || '').slice(0, PER_CHAPTER_DIGEST_CHARS)}`)
    .join('\n\n');

  const genreContract = getGenreContractForCritic(genre);

  const prompt = `Bạn là biên tập viên web-novel hàng đầu. Đánh giá 10 CHƯƠNG ĐẦU của một truyện ${genre} theo 5 dimension cốt lõi quyết định truyện có giữ chân được reader hay không.
${genreContract}
NHÂN VẬT CHÍNH: ${protagonistName}
${kernelBlock}

10 CHƯƠNG ĐẦU (mỗi chương cắt đầu ${PER_CHAPTER_DIGEST_CHARS} chars):
${digest}

Trả về JSON:
{
  "uspClarity": <1-10 — USP có rõ ràng + memorable trong 3 chương đầu không? Vd Phàm Nhân = "phàm nhân + thận trọng + bình nhỏ + tu tiên sinh tồn"; Quỷ Bí = "occult pathway + bí ẩn tầng tầng". 1-3 = không có USP. 4-6 = USP mơ hồ. 7-9 = USP rõ. 10 = USP độc đáo + đáng nhớ>,
  "hookStrength": <1-10 — Ch.1 có hook đủ mạnh kéo reader sang ch.2-3 không? Cần 5-beat opening (hook → setup → conflict → escalation → cliff). 1-3 = mở chậm/lan man. 4-6 = ổn nhưng chậm. 7-9 = hook mạnh. 10 = không thể bỏ xuống>,
  "payoffCadence": <1-10 — 10 chương có ≥3 dopamine peaks rõ ràng (face-slap, recognition, milestone, harvest, breakthrough)? Cadence đều mỗi 3-5 chương? 1-3 = không có payoff. 4-6 = thưa. 7-9 = đều đặn. 10 = peak dày + escalating>,
  "coreLoopEstablished": <1-10 — Core loop của genre đã establish trong ch.1-3 chưa? Reader có hiểu vòng lặp khoái cảm? Tien-hiep loop = bottleneck → resource → tradeoff → breakthrough. Do-thi loop = opportunity → expertise → result → recognition. 1-3 = không thấy loop. 4-6 = loop mơ hồ. 7-9 = loop rõ. 10 = loop chạy mượt + reader biết chờ peak gì>,
  "genreFidelity": <1-10 — Truyện có giữ đúng genre không hay drift? Tien-hiep thiếu cảnh giới = drift. Do-thi MC đánh nhau bằng võ công = drift nặng. Linh-di không có dread = drift. 1-3 = lệch hoàn toàn. 4-6 = mixed. 7-9 = đúng genre. 10 = chuẩn xác từ trang đầu>,
  "overallScore": <1-10 — average của 5 dimension trên, làm tròn>,
  "verdict": "<pass | marginal | fail>",
  "issues": [
    {
      "dimension": "<USP|hook|payoff|loop|genre>",
      "severity": "<minor|moderate|major|critical>",
      "description": "vấn đề cụ thể, dẫn chứng từ chương nào"
    }
  ],
  "recommendations": ["khuyến nghị cụ thể nếu marginal/fail — vd 'regen ch.1 với hook rõ hơn', 'thêm dopamine peak ở ch.3', 'remove combat scenes ở ch.5 (lệch genre)'"]
}

THANG ĐO VERDICT (BẮT BUỘC tuân thủ):
- pass: overallScore >= 7 VÀ TẤT CẢ 5 dimension >= 5
- marginal: overallScore 5-6 HOẶC 1-2 dimension <= 4 nhưng KHÔNG có dimension <= 2
- fail: overallScore <= 4 HOẶC bất kỳ dimension <= 3 HOẶC genreFidelity <= 5

Đánh giá KHẮT KHE — đây là gate quyết định liệu truyện có nên tiếp tục viết hay cần regen outline. Đại thần không tha cho ch.1-10 yếu — ch.1-10 quyết định reader stay or bounce.`;

  const res = await callGemini(
    prompt,
    { ...config, temperature: 0.2, maxTokens: 4096 },
    { jsonMode: true, tracking: { projectId, task: 'first_10_evaluation', chapterNumber: EVAL_AT_CHAPTER } },
  );

  if (!res.content) {
    console.warn(`[First10] Empty response for project ${projectId}`);
    return null;
  }

  const parsed = parseJSON<First10Evaluation>(res.content);
  if (!parsed || typeof parsed.uspClarity !== 'number') {
    console.warn(`[First10] JSON parse failed for project ${projectId}`);
    return null;
  }

  // Clamp scores to 1-10 in case model returned out-of-range.
  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
  parsed.uspClarity = clamp(parsed.uspClarity);
  parsed.hookStrength = clamp(parsed.hookStrength);
  parsed.payoffCadence = clamp(parsed.payoffCadence);
  parsed.coreLoopEstablished = clamp(parsed.coreLoopEstablished);
  parsed.genreFidelity = clamp(parsed.genreFidelity);
  parsed.overallScore = clamp(parsed.overallScore);

  // Sanity-check verdict matches the rule (model may misclassify).
  const minDim = Math.min(
    parsed.uspClarity, parsed.hookStrength, parsed.payoffCadence,
    parsed.coreLoopEstablished, parsed.genreFidelity,
  );
  if (parsed.overallScore <= 4 || minDim <= 3 || parsed.genreFidelity <= 5) {
    parsed.verdict = 'fail';
  } else if (parsed.overallScore <= 6 || minDim <= 4) {
    parsed.verdict = 'marginal';
  } else {
    parsed.verdict = 'pass';
  }

  // Persist to DB. UNIQUE(project_id) constraint guards against double-insert
  // if two cron runs race past the early existence check.
  const { error: insErr } = await db.from('first_10_evaluations').insert({
    project_id: projectId,
    novel_id: novelId,
    evaluated_at_chapter: EVAL_AT_CHAPTER,
    usp_clarity: parsed.uspClarity,
    hook_strength: parsed.hookStrength,
    payoff_cadence: parsed.payoffCadence,
    core_loop: parsed.coreLoopEstablished,
    genre_fidelity: parsed.genreFidelity,
    overall_score: parsed.overallScore,
    verdict: parsed.verdict,
    issues: parsed.issues || [],
    recommendations: parsed.recommendations || [],
  });

  if (insErr) {
    // Race condition / duplicate insert is fine — eval is idempotent.
    if (!insErr.message.includes('duplicate')) {
      console.warn(`[First10] DB insert failed: ${insErr.message}`);
    }
  }

  console.log(
    `[First10] Project ${projectId}: ${parsed.verdict} ` +
    `(overall=${parsed.overallScore}, USP=${parsed.uspClarity}, hook=${parsed.hookStrength}, ` +
    `payoff=${parsed.payoffCadence}, loop=${parsed.coreLoopEstablished}, genre=${parsed.genreFidelity})`,
  );

  return parsed;
}
