import type { GeminiConfig, GeminiResponse } from '../types';
import { callGemini, type TrackingContext } from '../utils/gemini';
import { getSupabase } from '../utils/supabase';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];

class NonRetryableProviderError extends Error {}

export type FlagshipProvider = 'gemini' | 'deepseek' | 'openai';

type OpenAIUsage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
};

type OpenAIResponse = {
  id?: string;
  status?: string;
  incomplete_details?: { reason?: string };
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  usage?: OpenAIUsage;
  error?: { message?: string; code?: string; type?: string };
};

export interface FlagshipProviderOptions {
  jsonMode?: boolean;
  tracking?: TrackingContext;
  schemaName?: string;
}

export function flagshipProviderForModel(model: string): FlagshipProvider {
  if (model.startsWith('gemini-')) return 'gemini';
  if (model.startsWith('deepseek-')) return 'deepseek';
  if (model.startsWith('gpt-')) return 'openai';
  throw new Error(`Unsupported flagship model route: ${model}`);
}

function schemaName(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return (cleaned || 'flagship_output').slice(0, 64);
}

function outputText(payload: OpenAIResponse): string {
  return (payload.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text as string)
    .join('');
}

function openAIPrice(model: string): { input: number; cached: number; output: number } {
  if (model === 'gpt-5.6-luna') return { input: 1, cached: 0.1, output: 6 };
  if (model === 'gpt-5.6-terra') return { input: 2.5, cached: 0.25, output: 15 };
  if (model === 'gpt-5.6-sol' || model === 'gpt-5.6') return { input: 5, cached: 0.5, output: 30 };
  return { input: 0, cached: 0, output: 0 };
}

function openAICost(model: string, usage: OpenAIUsage): number {
  const price = openAIPrice(model);
  const input = Number(usage.input_tokens || 0);
  const cached = Number(usage.input_tokens_details?.cached_tokens || 0);
  const cacheWrite = Number(usage.input_tokens_details?.cache_write_tokens || 0);
  const regular = Math.max(0, input - cached - cacheWrite);
  return (regular * price.input + cached * price.cached + cacheWrite * price.input * 1.25
    + Number(usage.output_tokens || 0) * price.output) / 1_000_000;
}

function trackOpenAICost(model: string, usage: OpenAIUsage, tracking: TrackingContext): void {
  getSupabase().from('cost_tracking').insert({
    project_id: tracking.projectId,
    model,
    task: tracking.task,
    chapter_number: tracking.chapterNumber ?? null,
    input_tokens: Number(usage.input_tokens || 0),
    output_tokens: Number(usage.output_tokens || 0),
    cost: openAICost(model, usage),
  }).then(({ error }) => {
    if (error) console.warn('[FlagshipOpenAICost] Insert failed:', error.message);
  });
}

async function callOpenAI(
  userPrompt: string,
  config: GeminiConfig,
  options: FlagshipProviderOptions,
): Promise<GeminiResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  if (config.model.endsWith('-pro')) {
    throw new Error('Official flagship OpenAI routes use the base model slug; Pro mode is disabled for production Writer calls.');
  }

  const format = options.jsonMode
    ? config.responseJsonSchema
      ? {
          type: 'json_schema',
          name: schemaName(options.schemaName || options.tracking?.task || 'flagship_output'),
          strict: true,
          schema: config.responseJsonSchema,
        }
      : { type: 'json_object' }
    : undefined;
  const body: Record<string, unknown> = {
    model: config.model,
    instructions: config.systemPrompt,
    input: userPrompt,
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxTokens,
    store: false,
  };
  if (format) body.text = { format };

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(800_000),
      });
      let payload: OpenAIResponse;
      try {
        payload = await response.json() as OpenAIResponse;
      } catch (error) {
        const retryableStatus = [408, 409, 429].includes(response.status) || response.status >= 500;
        if (retryableStatus && attempt < RETRY_DELAYS_MS.length) continue;
        throw new NonRetryableProviderError(`OpenAI ${response.status} returned a malformed response envelope: ${error instanceof Error ? error.message : String(error)}`);
      }
      if ([408, 409, 429].includes(response.status) || response.status >= 500) {
        if (attempt < RETRY_DELAYS_MS.length) continue;
      }
      if (!response.ok || payload.error) {
        throw new NonRetryableProviderError(`OpenAI ${response.status}: ${payload.error?.message || payload.error?.code || 'unknown error'}`);
      }
      const content = outputText(payload);
      if (!content) throw new NonRetryableProviderError(`OpenAI ${config.model} returned no output_text.`);
      const usage = payload.usage || {};
      if (options.tracking) trackOpenAICost(config.model, usage, options.tracking);
      return {
        content,
        promptTokens: Number(usage.input_tokens || 0),
        completionTokens: Number(usage.output_tokens || 0),
        estimatedCostUsd: openAICost(config.model, usage),
        finishReason: payload.status === 'incomplete'
          ? payload.incomplete_details?.reason === 'max_output_tokens' ? 'MAX_TOKENS' : 'INCOMPLETE'
          : 'STOP',
      };
    } catch (error) {
      if (error instanceof NonRetryableProviderError) throw error;
      if (attempt >= RETRY_DELAYS_MS.length) throw error;
    }
  }
  throw new Error('OpenAI: all retries exhausted');
}

/**
 * One exact provider per flagship model route. This dispatcher never changes
 * the selected model and never falls back to another transport or provider.
 */
export async function callFlagshipModel(
  userPrompt: string,
  config: GeminiConfig,
  options: FlagshipProviderOptions = {},
): Promise<GeminiResponse> {
  const provider = flagshipProviderForModel(config.model);
  if (provider === 'openai') return callOpenAI(userPrompt, config, options);
  return callGemini(userPrompt, config, {
    jsonMode: options.jsonMode,
    tracking: options.tracking,
    disableRouting: true,
  });
}
