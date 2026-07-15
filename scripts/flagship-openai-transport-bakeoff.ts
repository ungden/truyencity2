import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { buildWriterPrompt, WRITER_SYSTEM } from '../src/services/story-engine/flagship/prompts';
import { WriterOutputSchema } from '../src/services/story-engine/flagship/pipeline';
import { FlagshipLaunchPackV2Schema } from '../src/services/story-engine/flagship/setup-contracts';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
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

type ReasoningMode = 'standard' | 'pro';
type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
};
type OfficialResponse = {
  id?: string;
  status?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: Usage;
  error?: { type?: string; code?: string; message?: string };
};
type Candidate = {
  id: string;
  route: string;
  transport: 'openai_official' | 'openrouter';
  mode: ReasoningMode;
  title: string;
  prose: string;
  words: number;
  elapsedMs: number;
  usage?: Usage | Record<string, unknown>;
  estimatedCostUsd: number;
};

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function csv(value: string | undefined, fallback: string[]): string[] {
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : fallback;
}

function parseJson<T>(raw: string, schema: z.ZodType<T>): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return schema.parse(JSON.parse(cleaned));
}

function outputText(payload: OfficialResponse): string {
  return (payload.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text as string)
    .join('');
}

function prices(model: string): { input: number; cached: number; output: number } {
  if (model === 'gpt-5.6-sol') return { input: 5, cached: 0.5, output: 30 };
  if (model === 'gpt-5.6-terra') return { input: 2.5, cached: 0.25, output: 15 };
  return { input: 1, cached: 0.1, output: 6 };
}

function officialCost(model: string, usage: Usage): number {
  const rate = prices(model);
  const input = Number(usage.input_tokens || 0);
  const cached = Number(usage.input_tokens_details?.cached_tokens || 0);
  const cacheWrite = Number(usage.input_tokens_details?.cache_write_tokens || 0);
  const regular = Math.max(0, input - cached - cacheWrite);
  return (regular * rate.input + cached * rate.cached + cacheWrite * rate.input * 1.25
    + Number(usage.output_tokens || 0) * rate.output) / 1_000_000;
}

async function callOfficial(input: {
  model: string;
  mode: ReasoningMode;
  effort: 'medium' | 'high';
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  maxOutputTokens: number;
}): Promise<{ content: string; elapsedMs: number; usage: Usage; estimatedCostUsd: number; responseId?: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is required and must be supplied through process environment.');
  const startedAt = Date.now();
  const reasoning = input.mode === 'pro'
    ? { effort: input.effort, mode: 'pro' as const }
    : { effort: input.effort };
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: input.model,
      instructions: input.systemPrompt,
      input: input.userPrompt,
      reasoning,
      max_output_tokens: input.maxOutputTokens,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
    }),
    signal: AbortSignal.timeout(900_000),
  });
  const payload = await response.json() as OfficialResponse;
  if (!response.ok || payload.error) {
    throw new Error(`${input.model}/${input.mode} OpenAI ${response.status}: ${payload.error?.message || 'unknown error'}`);
  }
  const content = outputText(payload);
  if (!content) throw new Error(`${input.model}/${input.mode} returned no output_text.`);
  const usage = payload.usage || {};
  return {
    content,
    elapsedMs: Date.now() - startedAt,
    usage,
    estimatedCostUsd: officialCost(input.model, usage),
    responseId: payload.id,
  };
}

function label(slot: string, route: string): string {
  return `C${createHash('sha256').update(`${slot}:${route}`).digest('hex').slice(0, 8).toUpperCase()}`;
}

function loadOpenRouterCandidates(slot: string, files: string[]): Candidate[] {
  for (const file of files) {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as {
      stories?: Array<{
        slot?: string;
        generated?: Array<{
          ok?: boolean;
          model?: string;
          title?: string;
          prose?: string;
          words?: number;
          elapsedMs?: number;
          usage?: Record<string, unknown>;
          estimatedCostUsd?: number;
        }>;
      }>;
    };
    const story = raw.stories?.find(item => item.slot === slot);
    if (!story) continue;
    return (story.generated || [])
      .filter(item => item.ok && (item.model === 'openai/gpt-5.6-luna' || item.model === 'openai/gpt-5.6-luna-pro'))
      .map(item => {
        const mode: ReasoningMode = item.model?.endsWith('-pro') ? 'pro' : 'standard';
        const route = `openrouter:${mode}`;
        return {
          id: label(slot, route), route, transport: 'openrouter' as const, mode,
          title: item.title || '', prose: item.prose || '', words: Number(item.words || 0),
          elapsedMs: Number(item.elapsedMs || 0), usage: item.usage,
          estimatedCostUsd: Number(item.estimatedCostUsd || 0),
        };
      });
  }
  throw new Error(`No standardized OpenRouter Luna candidates found for ${slot}.`);
}

function validateJudge(result: z.infer<typeof JudgeSchema>, ids: string[]): void {
  const expected = [...ids].sort();
  const ranked = [...result.ranking].sort();
  const scored = result.candidates.map(item => item.id).sort();
  if (JSON.stringify(expected) !== JSON.stringify(ranked) || JSON.stringify(expected) !== JSON.stringify(scored)) {
    throw new Error('Judge omitted, duplicated or invented candidate ids.');
  }
}

async function main(): Promise<void> {
  const slots = csv(arg('slots'), ['hx-04', 'th-01', 'dt-11']);
  const targetWords = Math.max(800, Math.min(2200, Number.parseInt(arg('target-words') || '1200', 10)));
  const output = arg('output') || path.join('/tmp', `truyencity-openai-transport-bakeoff-${Date.now()}.json`);
  const sourceFiles = csv(arg('openrouter-results'), [
    '/tmp/truyencity-provider-bakeoff-hx04-v2.json',
    '/tmp/truyencity-provider-bakeoff-th-dt.json',
  ]);
  const writerSchema = toGeminiResponseJsonSchema(WriterOutputSchema);
  const judgeSchema = toGeminiResponseJsonSchema(JudgeSchema);
  const stories: Array<{ slot: string; candidates: Candidate[]; judges: Array<Record<string, unknown>> }> = [];

  for (const slot of slots) {
    const packPath = path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/materialized', slot, 'launch-pack.json');
    const pack = FlagshipLaunchPackV2Schema.parse(JSON.parse(readFileSync(packPath, 'utf8')));
    const plan = pack.rollingChapterPlans.find(item => item.chapterNumber === 1);
    if (!plan) throw new Error(`${slot} has no chapter-one plan.`);
    const writerPrompt = buildWriterPrompt({
      storySpec: pack.storySpec,
      chapterPlan: plan,
      storyState: pack.storyState,
      targetWordCount: targetWords,
    });
    const candidates = loadOpenRouterCandidates(slot, sourceFiles);
    for (const mode of ['standard', 'pro'] as const) {
      const route = `openai_official:${mode}`;
      console.log(`[${slot}] generating ${route}`);
      const response = await callOfficial({
        model: 'gpt-5.6-luna', mode, effort: 'medium',
        systemPrompt: WRITER_SYSTEM, userPrompt: writerPrompt,
        schema: writerSchema, schemaName: 'flagship_writer_output', maxOutputTokens: 16_384,
      });
      const parsed = parseJson(response.content, WriterOutputSchema);
      candidates.push({
        id: label(slot, route), route, transport: 'openai_official', mode,
        title: parsed.title, prose: parsed.content,
        words: parsed.content.trim().split(/\s+/).filter(Boolean).length,
        ...response,
      });
      console.log(`[${slot}] ${route} ok words=${candidates.at(-1)?.words} cost=$${response.estimatedCostUsd.toFixed(4)}`);
    }
    const blind = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
    const judgePrompt = `Blind review bốn chương được viết từ cùng một StorySpec và ChapterPlan. Không đoán model hoặc transport.
STORY=${JSON.stringify({ identity: pack.storySpec.storyIdentity, premise: pack.storySpec.premise, protagonist: pack.storySpec.protagonist, pleasureProfile: pack.storySpec.pleasureProfile })}
PLAN=${JSON.stringify(plan)}
CANDIDATES=${JSON.stringify(blind.map(item => ({ id: item.id, title: item.title, prose: item.prose })))}
TARGET_WORDS=${targetWords}; acceptable range=${Math.floor(targetWords * 0.75)}-${Math.ceil(targetWords * 1.25)} từ.
Chấm 0-10 đúng bảy trục: ${AXES.join(', ')}. Hạ mạnh bản né độ dài hoặc kéo dài để lấy lợi thế, văn sáo AI, giọng đồng dạng, cảm xúc tuyên bố, nhân quả giả, domain mơ hồ, payoff chưa kiếm được và hook chỉ là lời dọa. Xếp hạng toàn bộ, không hòa; nêu tối đa ba lỗi cụ thể cho từng bản.`;
    const judges: Array<Record<string, unknown>> = [];
    for (const judge of [
      { model: 'gpt-5.6-sol', effort: 'high' as const },
      { model: 'gpt-5.6-terra', effort: 'high' as const },
    ]) {
      console.log(`[${slot}] judging with ${judge.model}`);
      const response = await callOfficial({
        model: judge.model, mode: 'standard', effort: judge.effort,
        systemPrompt: 'Bạn là biên tập viên độc lập truyện mạng nam tần tiếng Việt. Chỉ trả JSON đúng schema.',
        userPrompt: judgePrompt, schema: judgeSchema,
        schemaName: 'openai_transport_blind_judge', maxOutputTokens: 12_288,
      });
      const result = parseJson(response.content, JudgeSchema);
      validateJudge(result, blind.map(item => item.id));
      judges.push({ model: judge.model, ...response, result });
    }
    stories.push({ slot, candidates, judges });
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), targetWords, slots, stories }, null, 2)}\n`, 'utf8');
  }

  const routes = ['openai_official:standard', 'openai_official:pro', 'openrouter:standard', 'openrouter:pro'];
  const ranking = routes.map(route => {
    const candidates = stories.flatMap(story => story.candidates.filter(item => item.route === route));
    const scores: number[] = [];
    const ranks: number[] = [];
    let firstPlaceVotes = 0;
    for (const story of stories) {
      const candidate = story.candidates.find(item => item.route === route);
      if (!candidate) continue;
      for (const judge of story.judges) {
        const result = judge.result as z.infer<typeof JudgeSchema>;
        const index = result.ranking.indexOf(candidate.id);
        if (index >= 0) { ranks.push(index + 1); if (index === 0) firstPlaceVotes += 1; }
        const scored = result.candidates.find(item => item.id === candidate.id);
        if (scored) scores.push(...AXES.map(axis => scored.scores[axis]));
      }
    }
    return {
      route,
      averageAxis: scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length),
      averageRank: ranks.reduce((sum, rank) => sum + rank, 0) / Math.max(1, ranks.length),
      firstPlaceVotes,
      averageWords: candidates.reduce((sum, item) => sum + item.words, 0) / Math.max(1, candidates.length),
      averageCostUsd: candidates.reduce((sum, item) => sum + item.estimatedCostUsd, 0) / Math.max(1, candidates.length),
      costPer30ChaptersUsd: candidates.reduce((sum, item) => sum + item.estimatedCostUsd, 0) / Math.max(1, candidates.length) * 30,
      averageLatencyMs: candidates.reduce((sum, item) => sum + item.elapsedMs, 0) / Math.max(1, candidates.length),
    };
  }).sort((a, b) => a.averageRank - b.averageRank || b.averageAxis - a.averageAxis);
  console.log(`OPENAI_TRANSPORT_BAKEOFF=${JSON.stringify({ output, ranking })}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
