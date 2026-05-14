/**
 * Story Engine — Topic positioning stage (Phase S, 2026-05-15).
 *
 * Phase 0 of setup pipeline v3. Inspired by oh-story-claudecode 对标
 * benchmark workflow + InkOS Architect topic confirmation.
 *
 * Inputs:
 *   - target genre
 *   - target sub-genres (0+ tags)
 *   - target chapter count (1000 default)
 *   - optional: user-provided benchmark IDs to anchor against
 *
 * Outputs (saved to ai_story_projects.style_directives.positioning):
 *   - benchmarkIds: 3-5 cards loaded as reference
 *   - differentiationContract: 3 axes where the new novel MUST differ
 *     from loaded benchmarks (1 mandatory, 2 recommended)
 *   - blueOceanAngle: 1-sentence positioning statement
 *   - readerExpectation: what reader of this genre expects (carried
 *     into IDEA stage prompt)
 *   - cautionFromBenchmarks: merged caution patterns from benchmarks
 *
 * Differentiation axis vocabulary (must pick at least 1):
 *   - kernel.readerFantasy   — different reader emotional payoff
 *   - kernel.systemMechanic  — different golden finger / system
 *   - kernel.mcSecret        — different secret driving conceal mechanic
 *   - openingHook            — different ch.1 setup beat
 *   - worldStructure         — different geography/realm/society layer
 *   - powerSystem            — different tier mechanic / cost model
 *   - aesthetic              — different setting tone (era/region/mood)
 *   - structuralDevice       — different plot structure (linear vs
 *     episodic vs replay-loop vs multi-identity vs rules)
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getSupabase } from '../utils/supabase';
import type { GeminiConfig, GenreType } from '../types';
import {
  loadBenchmarksForGenre,
  formatBenchmarksForPrompt,
  type BenchmarkCard,
} from '../templates/benchmark-cards';

export type DifferentiationAxis =
  | 'kernel.readerFantasy'
  | 'kernel.systemMechanic'
  | 'kernel.mcSecret'
  | 'openingHook'
  | 'worldStructure'
  | 'powerSystem'
  | 'aesthetic'
  | 'structuralDevice';

export interface PositioningOutput {
  readonly benchmarkIds: string[];
  readonly differentiationContract: Array<{
    readonly axis: DifferentiationAxis;
    readonly mandatory: boolean;
    readonly newNovelDirection: string;
    readonly contrastWithBenchmarks: string;
  }>;
  readonly blueOceanAngle: string;
  readonly readerExpectation: string;
  readonly cautionFromBenchmarks: string[];
  /** Free-form summary for admin review */
  readonly positioningSummary: string;
}

export interface PositioningInput {
  readonly projectId: string;
  readonly genre: GenreType;
  readonly subGenres?: string[];
  readonly targetChapters?: number;
  /** Optional user hints — premise idea, title hint, etc. */
  readonly userHint?: string;
}

const POSITIONING_SYSTEM = `Bạn là Story Positioning Strategist cho TruyenCity — platform sản xuất webnovel tiếng Việt theo phong cách sảng văn 起点中文网.

Nhiệm vụ: nhận genre + sub-genre + benchmark cards (3-5 top performers Trung Quốc 2024-2026 trong cùng genre), đưa ra POSITIONING CONTRACT cho bộ truyện mới — phải differentiate from benchmarks ở ≥1 axis.

Output là JSON theo schema dưới. KHÔNG copy benchmark verbatim — phải tổng hợp + tạo angle mới.`;

export async function runTopicPositioning(
  input: PositioningInput,
  config: GeminiConfig,
): Promise<PositioningOutput | null> {
  const benchmarks = loadBenchmarksForGenre(input.genre, input.subGenres || [], 5);

  if (benchmarks.length === 0) {
    // No benchmarks for this genre — return permissive output
    return {
      benchmarkIds: [],
      differentiationContract: [],
      blueOceanAngle: `Genre ${input.genre} chưa có benchmark trong library — full creative latitude.`,
      readerExpectation: 'Generic webnovel reader expectations: 6-10 mentions MC name/1K, dialogue em-dash, ch.1 hook + dopamine cadence per 3-5 chương.',
      cautionFromBenchmarks: [],
      positioningSummary: `Genre ${input.genre} (sub: ${(input.subGenres || []).join(', ') || 'none'}) — no benchmarks loaded.`,
    };
  }

  const benchmarkText = formatBenchmarksForPrompt(benchmarks);
  const userHintBlock = input.userHint
    ? `\n## User hint (optional direction)\n${input.userHint}\n`
    : '';

  const prompt = `${POSITIONING_SYSTEM}

## Genre + Sub-genre
- Primary genre: ${input.genre}
- Sub-genre tags: ${(input.subGenres || []).join(', ') || '(none)'}
- Target chapter count: ${input.targetChapters || 1000}
${userHintBlock}
## Benchmarks (top performers 2024-2026 trong cùng genre)

${benchmarkText}

## Nhiệm vụ

1. **Phân tích benchmarks**: tóm tắt 1 đoạn ngắn — readers genre này expect gì? Common patterns đáng chú ý?

2. **Differentiation Contract** — đưa ra 3 axis bộ mới SẼ KHÁC với benchmarks:
   - 1 mandatory axis (cốt lõi, không thể bỏ qua)
   - 2 recommended axes (nice to have, tăng độ khác biệt)
   - Mỗi axis: chọn từ enum ['kernel.readerFantasy', 'kernel.systemMechanic', 'kernel.mcSecret', 'openingHook', 'worldStructure', 'powerSystem', 'aesthetic', 'structuralDevice']
   - Mỗi axis specify: (a) newNovelDirection — bộ mới đi hướng gì cụ thể, (b) contrastWithBenchmarks — so với benchmarks là như nào

3. **Blue Ocean Angle** — 1 câu (≤30 từ) tóm tắt unique positioning của bộ mới

4. **Reader Expectation** — 1 đoạn ngắn (≤100 từ) chỉ ra what reader of this genre+subgenre expect, sẽ inject vào IDEA stage prompt

5. **Caution from benchmarks** — list 3-6 patterns benchmarks có nhưng bộ mới NÊN tránh (vd: pacing chậm quá, copyright risk, philosophy heavy)

6. **Positioning summary** — 1 paragraph (3-5 sentences) tổng kết cho admin review

Trả về JSON exact schema:

\`\`\`json
{
  "differentiationContract": [
    {
      "axis": "kernel.systemMechanic",
      "mandatory": true,
      "newNovelDirection": "<concrete direction>",
      "contrastWithBenchmarks": "<how different>"
    },
    ... 2 more
  ],
  "blueOceanAngle": "<1 sentence>",
  "readerExpectation": "<≤100 words>",
  "cautionFromBenchmarks": ["<pattern 1>", "<pattern 2>", ...],
  "positioningSummary": "<3-5 sentences>"
}
\`\`\`

Trả về JSON. KHÔNG include benchmark IDs trong output (engine tự thêm).`;

  try {
    const res = await callGemini(
      prompt,
      {
        ...config,
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: POSITIONING_SYSTEM,
      },
      {
        jsonMode: true,
        tracking: { projectId: input.projectId, task: 'topic_positioning', chapterNumber: 0 },
      },
    );

    const parsed = parseJSON<Omit<PositioningOutput, 'benchmarkIds'>>(res.content);
    if (!parsed) return null;

    const output: PositioningOutput = {
      benchmarkIds: benchmarks.map(b => b.id),
      differentiationContract: parsed.differentiationContract || [],
      blueOceanAngle: parsed.blueOceanAngle || '',
      readerExpectation: parsed.readerExpectation || '',
      cautionFromBenchmarks: parsed.cautionFromBenchmarks || [],
      positioningSummary: parsed.positioningSummary || '',
    };

    // Validate mandatory axis exists
    const hasMandatory = output.differentiationContract.some(c => c.mandatory);
    if (!hasMandatory) {
      // Force first axis as mandatory if AI forgot
      if (output.differentiationContract.length > 0) {
        output.differentiationContract[0] = {
          ...output.differentiationContract[0],
          mandatory: true,
        };
      }
    }

    // Persist to project.style_directives.positioning
    await persistPositioning(input.projectId, output);

    return output;
  } catch (e) {
    console.warn(
      `[TopicPositioning] threw for ${input.projectId}:`,
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

async function persistPositioning(projectId: string, output: PositioningOutput): Promise<void> {
  try {
    const db = getSupabase();
    const { data: row } = await db
      .from('ai_story_projects')
      .select('style_directives')
      .eq('id', projectId)
      .maybeSingle();
    const styleDirectives = (row?.style_directives as Record<string, unknown>) || {};
    const updated = {
      ...styleDirectives,
      positioning: output,
      positioning_updated_at: new Date().toISOString(),
    };
    const { error } = await db
      .from('ai_story_projects')
      .update({ style_directives: updated })
      .eq('id', projectId);
    if (error) {
      console.warn(
        `[TopicPositioning] failed to persist for ${projectId}: ${error.message}`,
      );
    }
  } catch (e) {
    console.warn(
      `[TopicPositioning] persist threw for ${projectId}:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * Build a context block to inject into downstream IDEA stage prompt.
 * Returns formatted markdown describing the differentiation contract +
 * reader expectations + caution patterns. Idea stage MUST respect this.
 */
export function buildPositioningPromptBlock(positioning: PositioningOutput, benchmarks: BenchmarkCard[]): string {
  const parts: string[] = [];
  parts.push('═══ POSITIONING CONTRACT (must respect) ═══');
  parts.push('');
  parts.push(`**Blue Ocean Angle**: ${positioning.blueOceanAngle}`);
  parts.push('');
  parts.push(`**Reader expectation cho genre này**: ${positioning.readerExpectation}`);
  parts.push('');

  if (positioning.differentiationContract.length > 0) {
    parts.push(`**Differentiation Contract** — bộ truyện này PHẢI khác với benchmarks ở các axis sau:`);
    for (const c of positioning.differentiationContract) {
      const tag = c.mandatory ? '🔴 MANDATORY' : '🟡 RECOMMENDED';
      parts.push(`- ${tag} [${c.axis}]: ${c.newNovelDirection}`);
      parts.push(`  Tương phản: ${c.contrastWithBenchmarks}`);
    }
    parts.push('');
  }

  if (positioning.cautionFromBenchmarks.length > 0) {
    parts.push(`**Caution** — patterns từ benchmarks BỘ MỚI NÊN TRÁNH:`);
    for (const c of positioning.cautionFromBenchmarks) {
      parts.push(`- ${c}`);
    }
    parts.push('');
  }

  if (benchmarks.length > 0) {
    parts.push(`**Benchmark slugs đã load** (admin reference): ${positioning.benchmarkIds.join(', ')}`);
    parts.push('');
  }

  return parts.join('\n');
}
