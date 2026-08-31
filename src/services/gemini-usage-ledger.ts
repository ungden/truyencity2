import { AsyncLocalStorage } from 'node:async_hooks';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const TOKENS_PER_MILLION = 1_000_000;
const GEMINI_3_SEARCH_USD_PER_QUERY = 0.014;
const GEMINI_25_SEARCH_USD_PER_QUERY = 0.035;

export const GEMINI_PRICING_VERSION = 'google-ai-developer-api-2026-08-30-standard';

export interface GeminiUsageMetadata {
  promptTokenCount?: unknown;
  cachedContentTokenCount?: unknown;
  candidatesTokenCount?: unknown;
  thoughtsTokenCount?: unknown;
  toolUsePromptTokenCount?: unknown;
  totalTokenCount?: unknown;
  promptTokensDetails?: unknown;
  cacheTokensDetails?: unknown;
  candidatesTokensDetails?: unknown;
  toolUsePromptTokensDetails?: unknown;
  serviceTier?: unknown;
}

export interface GeminiUsageContext {
  operation: string;
  sourceType: string;
  sourceId?: string;
  projectId?: string;
  novelId?: string;
  userId?: string;
}

interface GeminiModelPrice {
  input: number;
  cachedInput?: number;
  output: number;
  imageOutput?: number;
  largePromptThreshold?: number;
  largePrompt?: Pick<GeminiModelPrice, 'input' | 'cachedInput' | 'output' | 'imageOutput'>;
  searchUsdPerQuery: number;
}

export interface GeminiUsageCost {
  promptTokens: number;
  cachedInputTokens: number;
  candidateTokens: number;
  candidateTextTokens: number;
  candidateImageTokens: number;
  thinkingTokens: number;
  toolUsePromptTokens: number;
  totalTokens: number;
  groundingSearchQueries: number;
  tokenCostUsd: number | null;
  groundingCostUpperUsd: number;
  priceStatus: 'priced' | 'unpriced';
  pricing: Record<string, unknown>;
}

const GEMINI_STANDARD_PRICING: Record<string, GeminiModelPrice> = {
  'gemini-2.5-pro': {
    input: 1.25, cachedInput: 0.125, output: 10, largePromptThreshold: 200_000,
    largePrompt: { input: 2.5, cachedInput: 0.25, output: 15 }, searchUsdPerQuery: GEMINI_25_SEARCH_USD_PER_QUERY,
  },
  'gemini-2.5-flash': { input: 0.3, cachedInput: 0.03, output: 2.5, searchUsdPerQuery: GEMINI_25_SEARCH_USD_PER_QUERY },
  'gemini-2.5-flash-lite': { input: 0.1, cachedInput: 0.01, output: 0.4, searchUsdPerQuery: GEMINI_25_SEARCH_USD_PER_QUERY },
  'gemini-3-flash-preview': { input: 0.5, cachedInput: 0.05, output: 3, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  'gemini-3.1-pro-preview': {
    input: 2, cachedInput: 0.2, output: 12, largePromptThreshold: 200_000,
    largePrompt: { input: 4, cachedInput: 0.4, output: 18 }, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY,
  },
  'gemini-3.5-flash': { input: 1.5, cachedInput: 0.15, output: 9, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  'gemini-3.5-flash-lite': { input: 0.3, cachedInput: 0.03, output: 2.5, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  // Introductory Standard prices currently run through 2026-12-31. The price
  // version is stored on every event, so the rate can change without rewriting history.
  'gemini-3.6-flash': { input: 0.75, cachedInput: 0.075, output: 3.75, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  'gemini-3.7-flash': { input: 0.75, cachedInput: 0.075, output: 3.75, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  'gemini-3-pro-image': { input: 2, output: 12, imageOutput: 120, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  // Existing jobs may still return the preview ID during the provider migration.
  'gemini-3-pro-image-preview': { input: 2, output: 12, imageOutput: 120, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  'gemini-3.1-flash-image': { input: 0.5, output: 3, imageOutput: 60, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
  'gemini-3.1-flash-lite-image': { input: 0.25, output: 1.5, imageOutput: 30, searchUsdPerQuery: GEMINI_3_SEARCH_USD_PER_QUERY },
};

const geminiUsageContext = new AsyncLocalStorage<GeminiUsageContext>();

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function modalityTokens(details: unknown, modality: string): number {
  if (!Array.isArray(details)) return 0;
  return details.reduce((total, detail) => {
    if (!detail || typeof detail !== 'object') return total;
    const row = detail as { modality?: unknown; tokenCount?: unknown };
    return row.modality === modality ? total + count(row.tokenCount) : total;
  }, 0);
}

function selectedPrice(model: string, promptTokens: number): GeminiModelPrice | undefined {
  const standard = GEMINI_STANDARD_PRICING[model];
  if (!standard) return undefined;
  if (standard.largePromptThreshold && promptTokens > standard.largePromptThreshold && standard.largePrompt) {
    return { ...standard, ...standard.largePrompt, largePrompt: undefined };
  }
  return standard;
}

/**
 * Converts the provider's post-call usageMetadata into the exact token buckets
 * exposed by Gemini. "Cost" remains a list-price estimate: invoice credits,
 * cache-storage time, taxes, and the shared Search free allowance are external
 * to an individual response and are intentionally never guessed here.
 */
export function calculateGeminiUsageCost(input: {
  model: string;
  usageMetadata: GeminiUsageMetadata | undefined;
  groundingSearchQueries?: number;
}): GeminiUsageCost {
  const metadata = input.usageMetadata ?? {};
  const promptTokens = count(metadata.promptTokenCount);
  const cachedInputTokens = Math.min(promptTokens, count(metadata.cachedContentTokenCount));
  const candidateTokens = count(metadata.candidatesTokenCount);
  const candidateImageTokens = Math.min(candidateTokens, modalityTokens(metadata.candidatesTokensDetails, 'IMAGE'));
  const candidateTextTokens = Math.max(0, candidateTokens - candidateImageTokens);
  const thinkingTokens = count(metadata.thoughtsTokenCount);
  const toolUsePromptTokens = count(metadata.toolUsePromptTokenCount);
  const totalTokens = count(metadata.totalTokenCount) || promptTokens + candidateTokens + thinkingTokens;
  const groundingSearchQueries = Math.max(0, Math.floor(input.groundingSearchQueries ?? 0));
  const price = selectedPrice(input.model, promptTokens);

  if (!price) {
    return {
      promptTokens, cachedInputTokens, candidateTokens, candidateTextTokens, candidateImageTokens,
      thinkingTokens, toolUsePromptTokens, totalTokens, groundingSearchQueries,
      tokenCostUsd: null,
      groundingCostUpperUsd: 0,
      priceStatus: 'unpriced',
      pricing: {
        version: GEMINI_PRICING_VERSION,
        tier: typeof metadata.serviceTier === 'string' ? metadata.serviceTier : 'STANDARD',
        reason: 'No explicit Standard price entry for this Gemini model. The response is retained but never costed with a fallback guess.',
      },
    };
  }

  const uncachedInputTokens = promptTokens - cachedInputTokens;
  const outputTextAndThinkingTokens = candidateTextTokens + thinkingTokens;
  const tokenCostUsd = (
    uncachedInputTokens * price.input
    + cachedInputTokens * (price.cachedInput ?? price.input)
    + outputTextAndThinkingTokens * price.output
    + candidateImageTokens * (price.imageOutput ?? price.output)
  ) / TOKENS_PER_MILLION;

  return {
    promptTokens, cachedInputTokens, candidateTokens, candidateTextTokens, candidateImageTokens,
    thinkingTokens, toolUsePromptTokens, totalTokens, groundingSearchQueries,
    tokenCostUsd,
    groundingCostUpperUsd: groundingSearchQueries * price.searchUsdPerQuery,
    priceStatus: 'priced',
    pricing: {
      version: GEMINI_PRICING_VERSION,
      tier: 'STANDARD',
      inputUsdPerMillion: price.input,
      cachedInputUsdPerMillion: price.cachedInput ?? price.input,
      outputTextAndThinkingUsdPerMillion: price.output,
      imageOutputUsdPerMillion: price.imageOutput ?? price.output,
      promptPricingBand: price.largePromptThreshold && promptTokens > price.largePromptThreshold ? 'over_200k' : 'up_to_200k_or_not_applicable',
      searchUsdPerQueryAfterSharedFreeAllowance: price.searchUsdPerQuery,
      excludes: ['context_cache_storage', 'shared_search_free_allowance', 'invoice_credits', 'taxes'],
    },
  };
}

export function withGeminiUsageContext<T>(context: GeminiUsageContext, operation: () => Promise<T>): Promise<T> {
  return geminiUsageContext.run(context, operation);
}

export async function recordGeminiUsageEvent(input: {
  model: string;
  modelVersion?: string;
  responseId?: string;
  usageMetadata?: GeminiUsageMetadata;
  groundingSearchQueries?: number;
  status?: 'succeeded' | 'blocked' | 'failed';
  context?: GeminiUsageContext;
}): Promise<GeminiUsageCost> {
  const calculated = calculateGeminiUsageCost({
    model: input.model,
    usageMetadata: input.usageMetadata,
    groundingSearchQueries: input.groundingSearchQueries,
  });
  const context = input.context ?? geminiUsageContext.getStore() ?? {
    operation: 'unattributed_gemini_request',
    sourceType: 'unattributed',
  };
  const sourceKey = input.responseId?.trim()
    ? `gemini:${input.responseId.trim()}`
    : `gemini:${context.sourceType}:${context.sourceId ?? 'none'}:${crypto.randomUUID()}`;

  try {
    const { error } = await getSupabaseAdmin().from('gemini_usage_events').insert({
      provider: 'gemini',
      model: input.model,
      model_version: input.modelVersion ?? null,
      operation: context.operation,
      source_type: context.sourceType,
      source_id: context.sourceId ?? null,
      source_key: sourceKey,
      project_id: context.projectId ?? null,
      novel_id: context.novelId ?? null,
      user_id: context.userId ?? null,
      status: input.status ?? 'succeeded',
      prompt_tokens: calculated.promptTokens,
      cached_input_tokens: calculated.cachedInputTokens,
      candidate_tokens: calculated.candidateTokens,
      candidate_text_tokens: calculated.candidateTextTokens,
      candidate_image_tokens: calculated.candidateImageTokens,
      thinking_tokens: calculated.thinkingTokens,
      tool_use_prompt_tokens: calculated.toolUsePromptTokens,
      total_tokens: calculated.totalTokens,
      grounding_search_queries: calculated.groundingSearchQueries,
      token_cost_usd: calculated.tokenCostUsd,
      grounding_cost_upper_usd: calculated.groundingCostUpperUsd,
      price_status: calculated.priceStatus,
      pricing: calculated.pricing,
    });
    // A duplicate provider response id means a retry reached persistence twice;
    // it is already accounted for and must not turn a paid result into a retry.
    if (error && error.code !== '23505') {
      console.error('[gemini-usage] unable to persist provider usage', {
        operation: context.operation,
        sourceType: context.sourceType,
        model: input.model,
        error: error.message,
      });
    }
  } catch (error) {
    // The provider result has already been paid for. Never throw here: doing so
    // would cause the caller to retry a successful generation and double spend.
    console.error('[gemini-usage] usage persistence threw', {
      operation: context.operation,
      sourceType: context.sourceType,
      model: input.model,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return calculated;
}
