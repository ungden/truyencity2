import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StoryFactoryError } from './contracts';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Gemini uses HTTP 499 when an upstream generation operation is cancelled.
// It is provider-transient just like timeout/rate-limit responses and should be
// retried on the same routed model before the job consumes its durable retry.
const TRANSIENT_STATUS = new Set([408, 409, 429, 499]);
const RETRY_DELAYS_MS = [1_000, 3_000];

/**
 * Default per-request timeout. Setup and planner calls legitimately run long — a
 * pro-class model emitting a full three-chapter window of structured JSON, or a
 * search-grounded research call — so the default stays generous. The chapter tick,
 * which must fit two calls inside the 300s route ceiling, passes CHAPTER_CALL_TIMEOUT_MS
 * explicitly (see pipeline.ts).
 */
const DEFAULT_TIMEOUT_MS = 240_000;

/** Two of these plus commit overhead must fit inside maxDuration = 300s. */
export const CHAPTER_CALL_TIMEOUT_MS = 120_000;

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-3.5-flash': { input: 0.75, output: 4.5 },
  'gemini-3-flash-preview': { input: 0.5, output: 3 },
  'gemini-3.1-pro-preview': { input: 2, output: 12 },
  'gemini-3.6-flash': { input: 1.5, output: 7.5 },
  // Introductory price through 2026-12-31 (launch email 2026-08-13); reverts to
  // 3.6-flash-level pricing after — recheck before relying on the margin.
  'gemini-3.7-flash': { input: 0.75, output: 3.75 },
  // Post-discount pricing announced 2026-07-30.
  'gpt-5.6-luna': { input: 0.2, output: 1.2 },
  'gpt-5.6-terra': { input: 1, output: 6 },
  'meta/muse-spark-1.2': { input: 1.25, output: 4.25 },
  'qwen/qwen3.8-max': { input: 2, output: 6 },
  // Routed through OpenRouter (model ids contain a vendor slash). Prices from the
  // OpenRouter models endpoint, 2026-08-01.
  'deepseek/deepseek-v4-flash-0731': { input: 0.14, output: 0.28 },
  // OpenRouter models endpoint, 2026-08-13 (v4-pro released the same day).
  'deepseek/deepseek-v4-pro-0813': { input: 0.435, output: 0.87 },
  'qwen/qwen3.8-2.4t-a95b': { input: 2, output: 6 },
  'x-ai/grok-4.6': { input: 2, output: 6 },
  'qwen/qwen3.7-flash': { input: 0.03, output: 0.13 },
  'google/gemini-3.6-flash': { input: 1.5, output: 7.5 },
  'moonshotai/kimi-k3': { input: 3, output: 15 },
  'openai/gpt-5.6-terra': { input: 1, output: 6 },
  'x-ai/grok-4.5': { input: 2, output: 6 },
};

/**
 * Per-model wire defaults on the OpenRouter path — same idea as the pricing
 * table: a row per model, not a new code path. v4-pro defaults to heavy hidden
 * reasoning (measured 2026-08-13: 4.8k reasoning tokens before prose, blowing
 * both the 120s chapter budget and the length cap; reasoning off → 3.7k tokens
 * of clean prose in 65s). Reasoning-off is part of this candidate's tested
 * identity under routeVersion or-deepseek-v4-pro-writer-experiment — a route
 * wanting it back on is a different identity and needs its own smoke.
 */
const OPENROUTER_MODEL_PARAMS: Record<string, Record<string, unknown>> = {
  'deepseek/deepseek-v4-pro-0813': { reasoning: { enabled: false } },
  // Reasoning is mandatory on this endpoint (enabled:false 400s); low effort
  // measured 2026-08-13 at 520 reasoning tokens / 79s for a full scene vs
  // 1,024 / 101s at default — the difference between fitting the 120s chapter
  // budget and timing out.
  'x-ai/grok-4.6': { reasoning: { effort: 'low' } },
  // Same mandatory-reasoning endpoint shape as grok-4.6. Default effort passed
  // two smoke chapters clean then blew the 120s budget on a heavy-thinking
  // roll; low effort measured at 1.9k reasoning tokens / 44s for a full scene.
  'qwen/qwen3.8-2.4t-a95b': { reasoning: { effort: 'low' } },
};

export interface ProviderUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  finishReason: string;
  grounding?: {
    searchQueries: string[];
    sourceUrls: string[];
  };
}

export interface ProviderResult<T> {
  value: T;
  usage: ProviderUsage;
}

export interface StoryModelProvider {
  text(input: {
    model: string;
    system: string;
    prompt: string;
    temperature?: number;
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
    thinkingBudget?: number;
    grounding?: 'google_search';
    timeoutMs?: number;
    reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    verbosity?: 'low' | 'medium' | 'high';
  }): Promise<ProviderResult<string>>;
  json<T>(input: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
    constrainSchema?: boolean;
    schemaComplexity?: 'default' | 'omit_large_array_max' | 'omit_array_max';
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
    thinkingBudget?: number;
    grounding?: 'google_search';
    timeoutMs?: number;
    reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    verbosity?: 'low' | 'medium' | 'high';
  }): Promise<ProviderResult<T>>;
}

class ProviderHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function cost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] ?? { input: 0.75, output: 4.5 };
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

function mergeUsage(first: ProviderUsage, second: ProviderUsage): ProviderUsage {
  return {
    ...second,
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    costUsd: first.costUsd + second.costUsd,
    grounding: first.grounding || second.grounding
      ? {
        searchQueries: [...(first.grounding?.searchQueries ?? []), ...(second.grounding?.searchQueries ?? [])],
        sourceUrls: [...(first.grounding?.sourceUrls ?? []), ...(second.grounding?.sourceUrls ?? [])],
      }
      : undefined,
  };
}

function retryable(error: unknown): boolean {
  if (error instanceof ProviderHttpError) return TRANSIENT_STATUS.has(error.status) || error.status >= 500;
  if (error instanceof DOMException) return error.name === 'AbortError' || error.name === 'TimeoutError';
  return error instanceof TypeError;
}

/**
 * Node's fetch occasionally leaves a TLS request pending after AbortSignal.timeout
 * fires. The signal alone therefore did not guarantee that a factory stage returned
 * to its retry/lease logic. Race the request with an explicit rejection as well as
 * aborting its socket so callers always regain control at the configured deadline.
 */
async function fetchWithHardTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new DOMException(`Provider request exceeded ${timeoutMs}ms.`, 'TimeoutError'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      fetch(url, { ...init, signal: controller.signal }),
      timedOut,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function toGeminiResponseSchema<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  options: { complexity?: 'default' | 'omit_large_array_max' | 'omit_array_max' } = {},
): Record<string, unknown> {
  // responseFormat accepts JSON Schema, not the older OpenAPI-flavoured schema
  // used by responseJsonSchema. Keep it inline because Gemini rejects some
  // deeply referenced schemas before generation.
  const converted = zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' }) as Record<string, unknown>;
  delete converted.$schema;
  const normalize = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(normalize);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(node, 'const')) {
      node.enum = [node.const];
      delete node.const;
    }
    delete node.pattern;
    // Gemini's documented structured-output subset supports string enum and
    // format, but not minLength/maxLength. Preserve those application
    // constraints as provider-supported description guidance instead of
    // silently dropping them and paying for predictably invalid output.
    const stringLengthRules: string[] = [];
    if (typeof node.minLength === 'number') {
      stringLengthRules.push(`minimum ${node.minLength} characters`);
    }
    if (typeof node.maxLength === 'number') {
      stringLengthRules.push(`maximum ${node.maxLength} characters`);
    }
    if (stringLengthRules.length) {
      const guidance = `Application constraint: string length must satisfy ${stringLengthRules.join(' and ')}.`;
      node.description = typeof node.description === 'string' && node.description.trim()
        ? `${node.description.trim()} ${guidance}`
        : guidance;
    }
    delete node.minLength;
    delete node.maxLength;
    delete node.exclusiveMinimum;
    delete node.exclusiveMaximum;
    if (options.complexity === 'omit_array_max') delete node.maxItems;
    if (options.complexity === 'omit_large_array_max'
      && typeof node.maxItems === 'number'
      && node.maxItems > 16) {
      delete node.maxItems;
    }
    Object.values(node).forEach(normalize);
    if (Array.isArray(node.anyOf) && node.anyOf.every(option => (
      !!option && typeof option === 'object'
      && Object.keys(option as Record<string, unknown>).every(key => key === 'type')
    ))) {
      node.type = node.anyOf.flatMap(option => {
        const type = (option as { type: string | string[] }).type;
        return Array.isArray(type) ? type : [type];
      });
      delete node.anyOf;
    }
  };
  normalize(converted);
  return converted;
}

/**
 * OpenAI Responses API path for gpt-* routed models.
 *
 * This is a routed provider: a stage's model comes from the versioned route and
 * nothing ever substitutes another model on failure — the same no-substitution
 * contract the Gemini path honours. Strict JSON schema needs
 * additionalProperties:false and every property required, which the schemas we
 * route here already satisfy.
 */
async function openaiGenerate(input: {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  responseSchema?: Record<string, unknown>;
  jsonMode?: boolean;
  timeoutMs?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  verbosity?: 'low' | 'medium' | 'high';
}): Promise<ProviderResult<string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', 'OPENAI_API_KEY is not configured for a gpt-* route.');
  const strictSchema = input.responseSchema
    ? JSON.parse(JSON.stringify(input.responseSchema), (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const node = value as Record<string, unknown>;
        // Strict mode rejects array-length keywords; preserve the constraint as
        // guidance so the model still aims for it — application Zod re-validates.
        const lengthRules: string[] = [];
        if (typeof node.minItems === 'number') lengthRules.push(`at least ${node.minItems} items`);
        if (typeof node.maxItems === 'number') lengthRules.push(`at most ${node.maxItems} items`);
        if (lengthRules.length) {
          const guidance = `Application constraint: array must have ${lengthRules.join(' and ')}.`;
          node.description = typeof node.description === 'string' && node.description.trim()
            ? `${node.description} ${guidance}`
            : guidance;
          delete node.minItems;
          delete node.maxItems;
        }
        if (node.type === 'object' && node.properties) {
          return {
            ...node,
            additionalProperties: false,
            required: Object.keys(node.properties as Record<string, unknown>),
          };
        }
        return node;
      }
      return value;
    })
    : undefined;
  // Reasoning-tier models reject the temperature parameter outright (400) — sampling
  // is governed by reasoning effort. Per the GPT-5.6 guide: effort defaults to
  // medium (forcing 'low' everywhere measurably weakened constraint-heavy calls),
  // and text.verbosity is the documented lever for output length — 5.6 is more
  // concise by default than its predecessors, so long-form callers pass 'high'.
  const text: Record<string, unknown> = {};
  if (strictSchema) text.format = { type: 'json_schema', name: 'response', schema: strictSchema, strict: true };
  else if (input.jsonMode) text.format = { type: 'json_object' };
  if (input.verbosity) text.verbosity = input.verbosity;
  const body: Record<string, unknown> = {
    model: input.model,
    instructions: input.system,
    input: [{ role: 'user', content: input.prompt }],
    max_output_tokens: 65_536,
    reasoning: { effort: input.reasoningEffort ?? 'medium' },
    ...(Object.keys(text).length ? { text } : {}),
  };
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
      const response = await fetchWithHardTimeout('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new ProviderHttpError(response.status, `OpenAI ${input.model} ${response.status}: ${detail.slice(0, 500)}`);
      }
      const payload = await response.json();
      const value = (typeof payload?.output_text === 'string' && payload.output_text.trim())
        || (Array.isArray(payload?.output)
          ? payload.output
            .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item?.content ?? [])
            .filter((part: { type?: string }) => part?.type === 'output_text')
            .map((part: { text?: string }) => part.text ?? '')
            .join('')
            .trim()
          : '');
      const finishReason = payload?.status ?? 'UNKNOWN';
      if (!value || payload?.status === 'incomplete') {
        throw new StoryFactoryError('infra_blocked', `OpenAI returned ${value ? 'truncated' : 'empty'} output (${finishReason}).`);
      }
      const inputTokens = payload?.usage?.input_tokens ?? 0;
      const outputTokens = payload?.usage?.output_tokens ?? 0;
      return {
        value,
        usage: {
          model: input.model,
          inputTokens,
          outputTokens,
          costUsd: cost(input.model, inputTokens, outputTokens),
          finishReason,
        },
      };
    } catch (error) {
      if (error instanceof StoryFactoryError) throw error;
      if (!retryable(error) || attempt === RETRY_DELAYS_MS.length) {
        throw new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
      }
    }
  }
  throw new StoryFactoryError('infra_blocked', 'Provider retry loop ended unexpectedly.');
}

/**
 * OpenRouter path for models whose id carries a vendor slash (deepseek/…, qwen/…).
 * Same routed-vendor contract as the other paths: the model comes from the versioned
 * route; on failure the stage throws and retries the SAME route. JSON output uses
 * OpenAI-compatible response_format json_schema (strict) with the same length-keyword
 * stripping as the direct OpenAI path; application Zod re-validates afterwards.
 */
async function openrouterGenerate(input: {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  responseSchema?: Record<string, unknown>;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<ProviderResult<string>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', 'OPENROUTER_API_KEY is not configured for a slash-vendor route.');
  const strictSchema = input.responseSchema
    ? JSON.parse(JSON.stringify(input.responseSchema), (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const node = value as Record<string, unknown>;
        delete node.minItems;
        delete node.maxItems;
        if (node.type === 'object' && node.properties) {
          return {
            ...node,
            additionalProperties: false,
            required: Object.keys(node.properties as Record<string, unknown>),
          };
        }
        return node;
      }
      return value;
    })
    : undefined;
  // Some upstream vendors (Alibaba) reject response_format unless the literal word
  // "json" appears in the messages. Harmless for everyone else.
  const jsonHint = (input.responseSchema || input.jsonMode)
    ? '\n\nTrả về đúng một object JSON hợp lệ.'
    : '';
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.prompt + jsonHint },
    ],
    temperature: input.temperature,
    max_tokens: 65_536,
    ...(strictSchema
      ? { response_format: { type: 'json_schema', json_schema: { name: 'response', schema: strictSchema, strict: true } } }
      : input.jsonMode
        ? { response_format: { type: 'json_object' } }
        : {}),
    ...(OPENROUTER_MODEL_PARAMS[input.model] ?? {}),
  };
  let formatDowngraded = false;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
      const response = await fetchWithHardTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://truyencity.com',
          'X-Title': 'TruyenCity Story Factory',
        },
        body: JSON.stringify(body),
      }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        // A vendor that has not enabled json_schema yet (DeepSeek v4-pro on its
        // release day) rejects the response_format TYPE itself. Downgrade the
        // wire format once to plain JSON mode with the schema stated in-prompt —
        // the same route on the same model; application Zod still enforces the
        // real contract afterwards.
        if (!formatDowngraded && strictSchema && response.status === 400
          && /response_format type is unavailable/i.test(detail)) {
          formatDowngraded = true;
          body.response_format = { type: 'json_object' };
          (body.messages as Array<{ role: string; content: string }>)[1].content =
            `${input.prompt}\n\nTrả về đúng một object JSON hợp lệ theo JSON Schema sau, giữ nguyên toàn bộ tên field, không markdown:\n${JSON.stringify(strictSchema)}`;
          continue;
        }
        throw new ProviderHttpError(response.status, `OpenRouter ${input.model} ${response.status}: ${detail.slice(0, 500)}`);
      }
      const payload = await response.json();
      const choice = payload?.choices?.[0];
      const value = (choice?.message?.content ?? '').trim();
      const finishReason = choice?.finish_reason ?? 'UNKNOWN';
      if (!value || finishReason === 'length') {
        throw new StoryFactoryError('infra_blocked', `OpenRouter returned ${value ? 'truncated' : 'empty'} output (${finishReason}).`);
      }
      const inputTokens = payload?.usage?.prompt_tokens ?? 0;
      const outputTokens = payload?.usage?.completion_tokens ?? 0;
      return {
        value,
        usage: {
          model: input.model,
          inputTokens,
          outputTokens,
          costUsd: cost(input.model, inputTokens, outputTokens),
          finishReason,
        },
      };
    } catch (error) {
      if (error instanceof StoryFactoryError) throw error;
      if (!retryable(error) || attempt === RETRY_DELAYS_MS.length) {
        throw new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
      }
    }
  }
  throw new StoryFactoryError('infra_blocked', 'Provider retry loop ended unexpectedly.');
}

async function generate(input: {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  responseSchema?: Record<string, unknown>;
  jsonMode?: boolean;
  googleSearch?: boolean;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  thinkingBudget?: number;
  timeoutMs?: number;
}): Promise<ProviderResult<string>> {
  // Dispatch by the routed model's vendor prefix — a deliberate route selection;
  // on failure the stage throws and retries on the SAME route, never another model.
  if (input.model.includes('/')) {
    if (input.googleSearch) {
      throw new StoryFactoryError('infra_blocked', 'Search grounding is only routed through Gemini.');
    }
    return openrouterGenerate(input);
  }
  if (input.model.startsWith('gpt-')) {
    if (input.googleSearch) {
      throw new StoryFactoryError('infra_blocked', 'Search grounding is only routed through Gemini.');
    }
    return openaiGenerate(input);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', 'GEMINI_API_KEY is not configured.');

  const generationConfig: Record<string, unknown> = {
    temperature: input.temperature,
    maxOutputTokens: 65_536,
  };
  if (input.thinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: input.thinkingLevel };
  } else if (input.thinkingBudget !== undefined) {
    generationConfig.thinkingConfig = { thinkingBudget: input.thinkingBudget };
  }
  if (input.responseSchema && input.model === 'gemini-3.1-pro-preview') {
    generationConfig.responseFormat = {
      text: {
        mimeType: 'APPLICATION_JSON',
        schema: input.responseSchema,
      },
    };
  } else if (input.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseJsonSchema = input.responseSchema;
  } else if (input.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
    generationConfig,
  };
  if (input.googleSearch) body.tools = [{ googleSearch: {} }];

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
      const response = await fetchWithHardTimeout(`${API_BASE}/models/${input.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new ProviderHttpError(response.status, `Gemini ${input.model} ${response.status}: ${detail.slice(0, 500)}`);
      }
      const payload = await response.json();
      const candidate = payload?.candidates?.[0];
      const value = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim() ?? '';
      const finishReason = candidate?.finishReason ?? 'UNKNOWN';
      if (!value || finishReason === 'MAX_TOKENS') {
        throw new StoryFactoryError('infra_blocked', `Gemini returned ${value ? 'truncated' : 'empty'} output (${finishReason}).`);
      }
      const inputTokens = payload?.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = (payload?.usageMetadata?.candidatesTokenCount ?? 0)
        + (payload?.usageMetadata?.thoughtsTokenCount ?? 0);
      const groundingMetadata = candidate?.groundingMetadata;
      const grounding = groundingMetadata ? {
        searchQueries: Array.isArray(groundingMetadata.webSearchQueries)
          ? groundingMetadata.webSearchQueries.filter((query: unknown): query is string => typeof query === 'string')
          : [],
        sourceUrls: Array.isArray(groundingMetadata.groundingChunks)
          ? groundingMetadata.groundingChunks.flatMap((chunk: { web?: { uri?: unknown } }) => (
            typeof chunk?.web?.uri === 'string' ? [chunk.web.uri] : []
          ))
          : [],
      } : undefined;
      return {
        value,
        usage: {
          model: input.model,
          inputTokens,
          outputTokens,
          costUsd: cost(input.model, inputTokens, outputTokens),
          finishReason,
          grounding,
        },
      };
    } catch (error) {
      if (error instanceof StoryFactoryError) throw error;
      if (!retryable(error) || attempt === RETRY_DELAYS_MS.length) {
        throw new StoryFactoryError('infra_blocked', error instanceof Error ? error.message : String(error));
      }
    }
  }
  throw new StoryFactoryError('infra_blocked', 'Provider retry loop ended unexpectedly.');
}

export const geminiProvider: StoryModelProvider = {
  async text(input) {
    return generate({
      ...input,
      temperature: input.temperature ?? 1,
      googleSearch: input.grounding === 'google_search',
    });
  },
  async json<T>(input: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
    constrainSchema?: boolean;
    schemaComplexity?: 'default' | 'omit_large_array_max' | 'omit_array_max';
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
    thinkingBudget?: number;
    grounding?: 'google_search';
    timeoutMs?: number;
  }): Promise<ProviderResult<T>> {
    const responseSchema = toGeminiResponseSchema(input.schema, {
      complexity: input.schemaComplexity ?? 'default',
    });
    const prompt = input.constrainSchema === false
      ? `${input.prompt}\n\nBắt buộc trả đúng một object theo JSON Schema sau, giữ nguyên toàn bộ tên field:\n${JSON.stringify(responseSchema)}`
      : input.prompt;
    const response = await generate({
      ...input,
      prompt,
      temperature: input.temperature ?? 0.7,
      responseSchema: input.constrainSchema === false ? undefined : responseSchema,
      jsonMode: true,
      googleSearch: input.grounding === 'google_search',
    });
    let raw: unknown;
    let usage = response.usage;
    try {
      raw = JSON.parse(response.value);
    } catch {
      if (input.constrainSchema !== false) {
        throw new StoryFactoryError('infra_blocked', 'Provider violated the structured-output JSON contract.', {
          usage,
        });
      }
      const jsonCorrection = await generate({
        ...input,
        prompt: `${prompt}\n\nBản trả trước không phải JSON hợp lệ. Trả lại đúng một object JSON hoàn chỉnh theo schema, không markdown, không giải thích.`,
        temperature: input.temperature ?? 0.7,
        responseSchema: undefined,
        jsonMode: true,
        googleSearch: input.grounding === 'google_search',
      });
      usage = mergeUsage(usage, jsonCorrection.usage);
      try {
        raw = JSON.parse(jsonCorrection.value);
      } catch {
        throw new StoryFactoryError('infra_blocked', 'Provider violated the structured-output JSON contract after one correction.', {
          usage,
        });
      }
    }
    let parsed = input.schema.safeParse(raw);
    if (!parsed.success && (
      input.model.startsWith('gpt-')
      || input.model.includes('/')
      || input.constrainSchema === false
      || (input.schemaComplexity !== undefined && input.schemaComplexity !== 'default')
    )) {
      // Gemini normally enforces exact shapes through constrained decoding;
      // OpenAI-compatible strict mode cannot express array-length constraints,
      // and intentionally unconstrained Gemini calls use JSON mode because an
      // oversized schema is rejected before generation. A wrong-count roll is
      // therefore expected on those paths. One corrective regeneration on the
      // SAME model is a same-route retry, not substitution.
      const corrective = await generate({
        ...input,
        prompt: `${prompt}

Bản trả trước không hợp lệ theo schema ứng dụng: ${JSON.stringify(parsed.error.issues.slice(0, 5))}
Sửa mọi path được liệt kê và rà lại cùng field trên TOÀN BỘ các phần tử, không chỉ phần tử đầu tiên. Với lỗi too_small/too_big, đếm độ dài sau khi trim và tuân thủ chính xác minimum/maximum. Không rút ngắn hoặc làm mất các field đang hợp lệ. Trước khi trả lời, tự kiểm tra toàn object theo schema một lần cuối.
Trả lại đúng một object JSON đã sửa, không giải thích.`,
        // A correction is contract repair, not another creative roll. A low
        // temperature makes the provider preserve valid material and reliably
        // repair every repeated field carrying the same length constraint.
        temperature: Math.min(input.temperature ?? 0.7, 0.2),
        responseSchema: input.constrainSchema === false ? undefined : responseSchema,
        jsonMode: true,
        googleSearch: input.grounding === 'google_search',
      });
      try {
        raw = JSON.parse(corrective.value);
      } catch {
        throw new StoryFactoryError('infra_blocked', 'Provider violated the structured-output JSON contract.', {
          usage: corrective.usage,
        });
      }
      const usageTotal = mergeUsage(usage, corrective.usage);
      parsed = input.schema.safeParse(raw);
      if (!parsed.success) {
        throw new StoryFactoryError('infra_blocked', 'Provider output failed application schema validation after one correction.', {
          issues: parsed.error.issues,
          usage: usageTotal,
        });
      }
      return { value: parsed.data, usage: usageTotal };
    }
    if (!parsed.success) {
      throw new StoryFactoryError('infra_blocked', 'Provider output failed application schema validation.', {
        issues: parsed.error.issues,
        usage,
      });
    }
    return { value: parsed.data, usage };
  },
};
