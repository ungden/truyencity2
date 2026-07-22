import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StoryFactoryError } from './contracts';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TRANSIENT_STATUS = new Set([408, 409, 429]);
const RETRY_DELAYS_MS = [1_000, 3_000];

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-3.5-flash': { input: 0.75, output: 4.5 },
  'gemini-3-flash-preview': { input: 0.5, output: 3 },
  'gemini-3.1-pro-preview': { input: 2, output: 12 },
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
    grounding?: 'google_search';
  }): Promise<ProviderResult<string>>;
  json<T>(input: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
    constrainSchema?: boolean;
    grounding?: 'google_search';
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

function retryable(error: unknown): boolean {
  if (error instanceof ProviderHttpError) return TRANSIENT_STATUS.has(error.status) || error.status >= 500;
  if (error instanceof DOMException) return error.name === 'AbortError' || error.name === 'TimeoutError';
  return error instanceof TypeError;
}

export function toGeminiResponseSchema<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>): Record<string, unknown> {
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
    delete node.minLength;
    delete node.maxLength;
    delete node.exclusiveMinimum;
    delete node.exclusiveMaximum;
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

async function generate(input: {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  responseSchema?: Record<string, unknown>;
  jsonMode?: boolean;
  googleSearch?: boolean;
}): Promise<ProviderResult<string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', 'GEMINI_API_KEY is not configured.');

  const generationConfig: Record<string, unknown> = {
    temperature: input.temperature,
    maxOutputTokens: 65_536,
  };
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
      const response = await fetch(`${API_BASE}/models/${input.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(240_000),
      });
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
    grounding?: 'google_search';
  }): Promise<ProviderResult<T>> {
    const responseSchema = toGeminiResponseSchema(input.schema);
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
    try {
      raw = JSON.parse(response.value);
    } catch {
      throw new StoryFactoryError('infra_blocked', 'Provider violated the structured-output JSON contract.');
    }
    const parsed = input.schema.safeParse(raw);
    if (!parsed.success) {
      throw new StoryFactoryError('infra_blocked', 'Provider output failed application schema validation.', parsed.error.issues);
    }
    return { value: parsed.data, usage: response.usage };
  },
};
