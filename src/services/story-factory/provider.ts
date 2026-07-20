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
  }): Promise<ProviderResult<string>>;
  json<T>(input: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
    constrainSchema?: boolean;
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
  // zod-to-json-schema's OpenAPI target is compatible with Gemini's supported
  // subset except for boolean exclusive bounds. Normalize only those bounds so
  // we do not introduce unsupported keywords from another schema dialect.
  const converted = zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as Record<string, unknown>;
  delete converted.$schema;
  const normalize = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(normalize);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (node.exclusiveMinimum === true && typeof node.minimum === 'number') {
      node.exclusiveMinimum = node.minimum;
      delete node.minimum;
    } else if (node.exclusiveMinimum === false) delete node.exclusiveMinimum;
    if (node.exclusiveMaximum === true && typeof node.maximum === 'number') {
      node.exclusiveMaximum = node.maximum;
      delete node.maximum;
    } else if (node.exclusiveMaximum === false) delete node.exclusiveMaximum;
    Object.values(node).forEach(normalize);
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
}): Promise<ProviderResult<string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', 'GEMINI_API_KEY is not configured.');

  const generationConfig: Record<string, unknown> = {
    temperature: input.temperature,
    maxOutputTokens: 65_536,
  };
  if (input.responseSchema || input.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }
  if (input.responseSchema) {
    generationConfig.responseJsonSchema = input.responseSchema;
  }
  const body = {
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
    generationConfig,
  };

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

export const geminiProvider: StoryModelProvider = {
  async text(input) {
    return generate({ ...input, temperature: input.temperature ?? 1 });
  },
  async json<T>(input: {
    model: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
    constrainSchema?: boolean;
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
