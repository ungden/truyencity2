/**
 * Story Engine v2 — Reader Persona Critic Pass (Phase 29 Feature 2)
 *
 * The main Critic is a "neutral editor" — it grades by craft and continuity
 * rules. But web-novel readers are NOT neutral — they read for specific
 * pleasures and bounce when those pleasures are missing.
 *
 * This module runs 3 LIGHTWEIGHT specialist Critics in parallel, each
 * impersonating one reader archetype. Their issues get APPENDED to the main
 * Critic's issue pool — they don't gate approval (that's the main Critic's
 * job), but they surface concerns the neutral Critic would miss:
 *
 *   - sảng văn reader: bounces if dopamine peaks are weak / face-slap missing
 *     / MC win-streak too easy or too dry
 *   - logic reader: bounces if power scaling violates rules / motivation hổng
 *     / coincidence-driven plot armor
 *   - emotion reader: bounces if no chemistry beats / family/love is neglected
 *     / MC reads as emotionless tool
 *
 * Aggregation: if ≥2/3 personas flag the SAME issue category → promote to
 * 'major' severity (cross-persona consensus = real problem). Single-persona
 * flags stay at the persona's reported severity.
 *
 * Gate: env `ENABLE_READER_PERSONA_CRITIC=true` (default OFF for A/B safety).
 *
 * Cost: 3× DeepSeek Flash calls per chapter, ~$0.012 each. For 200 chapters/day
 * on a 100-novel fleet = $2.4/day = ~$72/month at full ON.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { CriticIssue, GeminiConfig, GenreType } from '../types';

const PERSONAS = ['sangvan', 'logic', 'emotion'] as const;
type Persona = typeof PERSONAS[number];

const MAX_CONTENT_CHARS = 20_000; // tighter than main Critic — persona just needs gist
const MAX_ISSUES_PER_PERSONA = 5;

interface PersonaResponse {
  issues: Array<{
    category: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    description: string;
    suggestion?: string;
  }>;
}

const PERSONA_PROMPTS: Record<Persona, { label: string; focus: string; rubric: string }> = {
  sangvan: {
    label: 'Reader sảng văn (90% reader base — đọc để giải trí, dopamine, face-slap, win streak)',
    focus: 'PEAK DOPAMINE / FACE-SLAP / RECOGNITION / WIN STREAK',
    rubric: `1. Có ≥2 dopamine peak trong chương không? (face-slap, recognition, milestone, harvest, breakthrough)
2. First peak có ≤50% chương không? (không kéo setup quá lâu)
3. MC có WIN, có thắng có recognition không? Hay cứ bị động chịu trận?
4. Có face-slap nào landing không (kẻ khinh thường bị đánh mặt)?
5. Có moment WOW reader sẽ screenshot share không?
6. Có pile-on suffering không (MC khổ liên tục, không có dopamine bù)?
7. Setup-to-payoff ratio: setup quá nhiều mà payoff quá ít = kìm nén tệ.

KHI nào flag:
- 0 dopamine peak hoặc peak duy nhất ở cuối → critical
- MC bị động cả chương, không có WIN nào → major
- Setup ≥3 beats không có payoff → major
- Toàn dialogue chính trị / suy tư, không có action moment → moderate
- Face-slap nhỏ thiếu hoặc quá yếu → minor`,
  },
  logic: {
    label: 'Reader logic (10-15% reader nhưng REVIEW gắt nhất — đọc để thấy thế giới chặt chẽ)',
    focus: 'RULE CONSISTENCY / MOTIVATION / PLOT ARMOR / COINCIDENCE',
    rubric: `1. MC win nhờ kế / chuẩn bị / khả năng — hay nhờ MAY MẮN / coincidence không setup?
2. Power scaling có hợp lý không? Đối thủ trên cấp đột nhiên thua MC mà không lý do?
3. Nhân vật phụ có MOTIVE hợp lý cho hành động của họ không?
4. Quyết định MC có được chuẩn bị bởi setup trước không? Hay đột ngột "biết phải làm gì"?
5. Information reveal có lý do không? (vì sao MC biết bí mật này, từ đâu?)
6. Có "vô lý kẻ thù im lặng" không? (kẻ thù mạnh hơn nhưng không hành động hợp lý)
7. Resource/money/timeline có nhất quán không?

KHI nào flag:
- MC win bằng deus ex machina / coincidence chưa setup → critical
- Power scaling break (đối thủ trên cấp thua không lý do) → critical
- Plot armor visible (MC né đòn không lý do, nhân vật phụ bị nerf để MC win) → major
- Motivation thiếu cho quyết định lớn → major
- Coincidence nhỏ không setup → moderate
- Detail thế giới (giá tiền, khoảng cách, thời gian) sai nhẹ → minor`,
  },
  emotion: {
    label: 'Reader cảm xúc (đọc cho tuyến tình cảm, family, mentor, romance)',
    focus: 'CHEMISTRY / FAMILY / EMOTIONAL BEATS / MC HUMANITY',
    rubric: `1. Chương có moment kết nối người (family, friend, love interest, mentor) không?
2. MC có cảm xúc thể hiện ra ngoài không? Hay chỉ là tool tính toán cold?
3. Nếu có nữ chính / love interest / family — họ có agency / có moment riêng không? Hay chỉ làm nền cho MC?
4. Có bonding beat nào (chia sẻ, lo lắng, nhớ nhung, biết ơn) không?
5. MC có tradeoff cảm xúc không? (vì lợi ích phải hy sinh điều mình quý)?
6. Khi MC win — có ai để CHIA SẺ niềm vui không? Hay chỉ thắng cô độc?
7. Có dialog chemistry (banter, tease, hiểu nhau) không?

KHI nào flag:
- MC vô cảm cả chương, không có moment người → major
- Love interest 5+ chương không xuất hiện hoặc không có line riêng → major
- Family/người thân của MC bị quên (không nhắc) → moderate
- Win không có ai chia sẻ → moderate
- MC nhắc người thân nhưng không có scene tương tác → minor

LƯU Ý: KHÔNG flag nếu chương rõ ràng là combat/strategy chapter — judge theo context.`,
  },
};

function buildPrompt(persona: Persona, content: string, genre: GenreType): string {
  const cfg = PERSONA_PROMPTS[persona];
  return `Bạn là ${cfg.label}.

Đây là 1 chương web-novel ${genre} đã viết xong. Bạn ĐỌC nó như 1 reader thực sự, không phải biên tập viên.

Tập trung CHỈ vào: **${cfg.focus}**

CHƯƠNG (cắt đầu ${MAX_CONTENT_CHARS} chars):
"""
${content.slice(0, MAX_CONTENT_CHARS)}
"""

RUBRIC:
${cfg.rubric}

Trả về JSON:
{
  "issues": [
    {
      "category": "<từ khóa ngắn — vd 'no_dopamine_peak', 'mc_passive', 'plot_armor', 'no_chemistry_beat', 'love_interest_absent'>",
      "severity": "<minor|moderate|major|critical>",
      "description": "vấn đề cụ thể, dẫn chứng từ chương",
      "suggestion": "khuyến nghị cụ thể (optional)"
    }
  ]
}

GIỚI HẠN: tối đa ${MAX_ISSUES_PER_PERSONA} issues. CHỈ flag nếu THỰC SỰ có vấn đề — đừng bịa để có gì đó nói. Nếu chương ổn theo rubric của bạn, trả issues: [].

KHÔNG đánh giá overall quality / continuity / craft — đó là việc Critic chính. Chỉ flag từ góc nhìn ${persona} reader.`;
}

async function runOnePersona(
  persona: Persona,
  content: string,
  genre: GenreType,
  config: GeminiConfig,
  projectId?: string,
  chapterNumber?: number,
): Promise<CriticIssue[]> {
  const prompt = buildPrompt(persona, content, genre);
  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.3, maxTokens: 1536 },
      {
        jsonMode: true,
        tracking: {
          projectId: projectId || 'ad-hoc',
          task: `reader_persona_${persona}`,
          chapterNumber,
        },
      },
    );
    if (!res.content) return [];
    const parsed = parseJSON<PersonaResponse>(res.content);
    if (!parsed?.issues || !Array.isArray(parsed.issues)) return [];

    return parsed.issues.slice(0, MAX_ISSUES_PER_PERSONA).map(it => ({
      type: 'reader_persona' as const,
      severity: it.severity,
      description: `[${persona}/${it.category}] ${it.description}`,
      suggestion: it.suggestion,
      persona,
    }));
  } catch (e) {
    console.warn(`[reader-persona/${persona}] threw:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}

/**
 * Aggregate per-persona issues. If ≥2 personas flag the SAME category, promote
 * the consolidated entry to 'major' (cross-persona consensus). The category
 * keyword is parsed from the prefix `[persona/category]` we attach in
 * runOnePersona — comparing categories across personas catches "all 3
 * personas hated this chapter for related reasons" patterns.
 */
function aggregate(allIssues: CriticIssue[]): CriticIssue[] {
  // Bucket by category keyword.
  const byCategory = new Map<string, CriticIssue[]>();
  for (const issue of allIssues) {
    const match = issue.description.match(/^\[\w+\/(\w+)\]/);
    const category = match?.[1] || 'misc';
    const bucket = byCategory.get(category) || [];
    bucket.push(issue);
    byCategory.set(category, bucket);
  }

  const result: CriticIssue[] = [];
  for (const [category, bucket] of byCategory.entries()) {
    if (bucket.length >= 2) {
      // Promote: collapse to one major-severity issue summarizing both.
      const personas = [...new Set(bucket.map(b => b.persona))].filter(Boolean);
      result.push({
        type: 'reader_persona',
        severity: 'major',
        description: `[CONSENSUS ${personas.join('+')}/${category}] ${bucket.length} reader personas flagged: ${bucket.map(b => b.description.replace(/^\[[^\]]+\]\s*/, '')).join(' | ')}`,
        suggestion: bucket.find(b => b.suggestion)?.suggestion,
      });
    } else {
      // Single-persona flag: keep as-is at original severity.
      result.push(...bucket);
    }
  }
  return result;
}

/**
 * Run all 3 reader personas in parallel and return aggregated issues.
 * Returns [] when env flag is OFF or all personas error out.
 */
export async function runReaderPersonaCritic(
  content: string,
  genre: GenreType,
  config: GeminiConfig,
  projectId?: string,
  chapterNumber?: number,
): Promise<CriticIssue[]> {
  if (process.env.ENABLE_READER_PERSONA_CRITIC !== 'true') {
    return [];
  }
  if (!content || content.length < 1000) {
    return [];
  }

  const results = await Promise.all(
    PERSONAS.map(p => runOnePersona(p, content, genre, config, projectId, chapterNumber)),
  );

  const flat = results.flat();
  return aggregate(flat);
}
