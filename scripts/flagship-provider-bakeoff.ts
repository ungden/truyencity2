import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { buildWriterPrompt, WRITER_SYSTEM } from '../src/services/story-engine/flagship/prompts';
import { WriterOutputSchema } from '../src/services/story-engine/flagship/pipeline';
import { FlagshipLaunchPackV2Schema } from '../src/services/story-engine/flagship/setup-contracts';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
  'google/gemini-3.1-pro-preview',
  'google/gemini-3.5-flash',
  'google/gemini-3.1-flash-lite',
  'z-ai/glm-5.2',
  'tencent/hy3:free',
  'qwen/qwen3.7-plus',
  'qwen/qwen3.7-max',
  'x-ai/grok-4.5',
  'openai/gpt-5.6-luna',
  'openai/gpt-5.6-luna-pro',
] as const;
const DEFAULT_JUDGES = [
  'google/gemini-3.1-pro-preview',
  'openai/gpt-5.6-luna-pro',
] as const;
const AXES = [
  'character_voice', 'scene_tension', 'causal_logic', 'domain_truth',
  'prose_naturalness', 'earned_pleasure', 'desire_to_read_next',
] as const;

const ScoresSchema = z.object(Object.fromEntries(AXES.map(axis => [axis, z.number().min(0).max(10)])) as Record<typeof AXES[number], z.ZodNumber>).strict();
const JudgeSchema = z.object({
  ranking: z.array(z.string().trim().min(1)),
  candidates: z.array(z.object({
    id: z.string().trim().min(1),
    scores: ScoresSchema,
    strength: z.string().trim().min(1),
    failures: z.array(z.string().trim().min(1)).max(3),
  }).strict()),
  winnerReason: z.string().trim().min(1),
}).strict();

type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
  cost_details?: { upstream_inference_cost?: number };
};

type OpenRouterResult = {
  content: string;
  provider?: string;
  finishReason?: string;
  usage: OpenRouterUsage;
  elapsedMs: number;
};

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function csv(value: string | undefined, fallback: readonly string[]): string[] {
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : [...fallback];
}

function parseJson<T>(raw: string, schema: z.ZodType<T>): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return schema.parse(JSON.parse(cleaned));
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(part => typeof part === 'string' ? part : (part as { text?: string })?.text || '').join('');
  return '';
}

function reasoningEffort(model: string): 'low' | 'medium' | 'high' {
  if (model === 'tencent/hy3:free') return 'low';
  if (model === 'z-ai/glm-5.2') return 'high';
  return 'medium';
}

async function callOpenRouter(input: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens: number;
}): Promise<OpenRouterResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is required. It is never read from a repository file.');
  const startedAt = Date.now();
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://truyencity.com',
      'X-Title': 'TruyenCity Flagship Provider Bakeoff',
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      max_tokens: input.maxTokens,
      reasoning: { effort: reasoningEffort(input.model), exclude: true },
      response_format: {
        type: 'json_schema',
        json_schema: { name: input.schemaName, strict: true, schema: input.schema },
      },
    }),
    signal: AbortSignal.timeout(360_000),
  });
  const payload = await response.json() as {
    provider?: string;
    choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>;
    usage?: OpenRouterUsage;
    error?: { message?: string; code?: string | number; metadata?: unknown };
  };
  if (!response.ok || payload.error) {
    throw new Error(`${input.model} OpenRouter ${response.status}: ${payload.error?.message || 'unknown error'}`);
  }
  return {
    content: contentText(payload.choices?.[0]?.message?.content),
    provider: payload.provider,
    finishReason: payload.choices?.[0]?.finish_reason,
    usage: payload.usage || {},
    elapsedMs: Date.now() - startedAt,
  };
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function shuffledLabels(slot: string, models: string[]): Map<string, string> {
  const ordered = [...models].sort((left, right) => {
    const a = createHash('sha256').update(`${slot}:${left}`).digest('hex');
    const b = createHash('sha256').update(`${slot}:${right}`).digest('hex');
    return a.localeCompare(b);
  });
  return new Map(ordered.map((model, index) => [model, `C${String(index + 1).padStart(2, '0')}`]));
}

function exactCandidateSet(result: z.infer<typeof JudgeSchema>, ids: string[]): void {
  const expected = [...ids].sort();
  const ranked = [...result.ranking].sort();
  const scored = result.candidates.map(item => item.id).sort();
  if (JSON.stringify(ranked) !== JSON.stringify(expected) || JSON.stringify(scored) !== JSON.stringify(expected)) {
    throw new Error('Judge omitted, duplicated or invented a blind candidate id.');
  }
}

function effectiveCost(usage: OpenRouterUsage): number {
  if (typeof usage.cost === 'number' && usage.cost > 0) return usage.cost;
  return Number(usage.cost_details?.upstream_inference_cost || 0);
}

async function main(): Promise<void> {
  const models = csv(arg('models'), DEFAULT_MODELS);
  const judges = csv(arg('judges'), DEFAULT_JUDGES);
  const slots = csv(arg('slots'), ['hx-04', 'th-01', 'dt-11']);
  const concurrency = Math.max(1, Math.min(8, Number.parseInt(arg('concurrency') || '4', 10)));
  const targetWords = Math.max(800, Math.min(2200, Number.parseInt(arg('target-words') || '1200', 10)));
  const output = arg('output') || path.join('/tmp', `truyencity-provider-bakeoff-${Date.now()}.json`);
  const writerSchema = toGeminiResponseJsonSchema(WriterOutputSchema);
  const judgeSchema = toGeminiResponseJsonSchema(JudgeSchema);
  const stories: Array<Record<string, unknown>> = [];

  for (const slot of slots) {
    const launchPath = path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/materialized', slot, 'launch-pack.json');
    const pack = FlagshipLaunchPackV2Schema.parse(JSON.parse(readFileSync(launchPath, 'utf8')));
    const plan = pack.rollingChapterPlans.find(item => item.chapterNumber === 1);
    if (!plan) throw new Error(`${slot} has no prepared chapter-one plan.`);
    const labels = shuffledLabels(slot, models);
    const writerPrompt = buildWriterPrompt({
      storySpec: pack.storySpec,
      chapterPlan: plan,
      storyState: pack.storyState,
      targetWordCount: targetWords,
    });
    console.log(`[${slot}] generating ${models.length} blind writer candidates`);
    const generated = await mapLimit(models, concurrency, async model => {
      try {
        const response = await callOpenRouter({
          model,
          systemPrompt: WRITER_SYSTEM,
          userPrompt: writerPrompt,
          schema: writerSchema,
          schemaName: 'flagship_writer_output',
          maxTokens: 16_384,
        });
        const parsed = parseJson(response.content, WriterOutputSchema);
        console.log(`[${slot}] ${model} ok ${response.elapsedMs}ms provider=${response.provider || 'unknown'}`);
        return {
          id: labels.get(model), model, ok: true as const, ...response,
          title: parsed.title, prose: parsed.content,
          words: parsed.content.trim().split(/\s+/).length,
          estimatedCostUsd: effectiveCost(response.usage),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[${slot}] ${model} failed: ${message}`);
        return { id: labels.get(model), model, ok: false as const, error: message };
      }
    });
    const successful = generated.filter((item): item is Extract<typeof generated[number], { ok: true }> => item.ok);
    if (successful.length < 2) throw new Error(`${slot} has fewer than two schema-valid candidates.`);
    const candidateIds = successful.map(item => item.id as string);
    const judgePrompt = `Đây là blind review chương 1 của cùng một truyện. Không đoán model và không thưởng vì văn hoa hoặc đủ checklist.
STORY=${JSON.stringify({
  identity: pack.storySpec.storyIdentity,
  premise: pack.storySpec.premise,
  protagonist: pack.storySpec.protagonist,
  pleasureProfile: pack.storySpec.pleasureProfile,
})}
PLAN=${JSON.stringify(plan)}
CANDIDATES=${JSON.stringify(successful.map(item => ({ id: item.id, title: item.title, prose: item.prose })))}
TARGET_WORDS=${targetWords}; acceptable range=${Math.floor(targetWords * 0.75)}-${Math.ceil(targetWords * 1.25)} từ.
Chấm 0-10 cho đúng bảy trục: ${AXES.join(', ')}. Hạ mạnh bản né độ dài, kéo dài để lấy lợi thế, văn sáo AI, giọng nhân vật đồng dạng, cảm xúc tuyên bố thay vì diễn ra, nhân quả giả, chi tiết nghề/thế giới mơ hồ, sảng cảm chưa kiếm được và hook chỉ là câu dọa. Xếp hạng toàn bộ candidate, không hòa; mỗi candidate tối đa ba lỗi cụ thể.`;
    console.log(`[${slot}] running ${judges.length} independent blind judges`);
    const judged = await mapLimit(judges, Math.min(3, concurrency), async model => {
      try {
        const response = await callOpenRouter({
          model,
          systemPrompt: 'Bạn là biên tập viên độc lập cho truyện mạng nam tần tiếng Việt. Chỉ trả JSON theo schema.',
          userPrompt: judgePrompt,
          schema: judgeSchema,
          schemaName: 'flagship_blind_provider_judge',
          maxTokens: 12_288,
        });
        const parsed = parseJson(response.content, JudgeSchema);
        exactCandidateSet(parsed, candidateIds);
        console.log(`[${slot}] judge ${model} ok ${response.elapsedMs}ms`);
        return { model, ok: true as const, ...response, result: parsed, estimatedCostUsd: effectiveCost(response.usage) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[${slot}] judge ${model} failed: ${message}`);
        return { model, ok: false as const, error: message };
      }
    });
    const successfulJudges = judged.filter(item => item.ok);
    if (successfulJudges.length < 2) {
      throw new Error(`${slot} has fewer than two schema-valid independent judge results.`);
    }
    stories.push({ slot, labels: Object.fromEntries(labels), generated, judges: judged });
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), models, judges, slots, stories }, null, 2)}\n`, 'utf8');
  }

  const aggregates = models.map(model => {
    const generations = stories.flatMap(story => (story.generated as Array<Record<string, unknown>>).filter(item => item.model === model));
    const successful = generations.filter(item => item.ok === true);
    const modelLabels = new Map(stories.map(story => [story.slot as string, (story.labels as Record<string, string>)[model]]));
    const scores: number[] = [];
    let borda = 0;
    let firstPlaceVotes = 0;
    for (const story of stories) {
      const id = modelLabels.get(story.slot as string);
      for (const judge of (story.judges as Array<Record<string, unknown>>).filter(item => item.ok === true)) {
        const result = judge.result as z.infer<typeof JudgeSchema>;
        const index = result.ranking.indexOf(id as string);
        if (index >= 0) {
          borda += result.ranking.length - index;
          if (index === 0) firstPlaceVotes += 1;
        }
        const candidate = result.candidates.find(item => item.id === id);
        if (candidate) scores.push(...AXES.map(axis => candidate.scores[axis]));
      }
    }
    return {
      model,
      success: successful.length,
      attempted: generations.length,
      schemaPassRate: generations.length ? successful.length / generations.length : 0,
      lengthPassRate: successful.length ? successful.filter(item => {
        const words = Number(item.words || 0);
        return words >= targetWords * 0.75 && words <= targetWords * 1.25;
      }).length / successful.length : 0,
      averageWords: successful.length ? successful.reduce((sum, item) => sum + Number(item.words || 0), 0) / successful.length : 0,
      averageLatencyMs: successful.length ? successful.reduce((sum, item) => sum + Number(item.elapsedMs || 0), 0) / successful.length : 0,
      estimatedGenerationCostUsd: successful.reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0),
      averageGenerationCostUsd: successful.length
        ? successful.reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0) / successful.length
        : 0,
      estimatedCostPer30ChaptersUsd: successful.length
        ? successful.reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0) / successful.length * 30
        : 0,
      blindAverageAxis: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
      borda,
      firstPlaceVotes,
    };
  }).sort((left, right) => right.borda - left.borda || right.blindAverageAxis - left.blindAverageAxis);
  const judgeCost = stories.flatMap(story => story.judges as Array<Record<string, unknown>>)
    .filter(item => item.ok === true)
    .reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0);
  const summary = {
    output,
    targetWords,
    models,
    judges,
    stories: slots.length,
    rankingPolicy: 'blind-quality-first; latency is observational and excluded from ranking; cost is reported per accepted writer output',
    judgeCostUsd: judgeCost,
    ranking: aggregates,
  };
  console.log(`BAKEOFF_SUMMARY=${JSON.stringify(summary)}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
