/**
 * Story Engine v2 — DeepSeek API Client (EXPERIMENT)
 *
 * OpenAI-compatible client for DeepSeek V4 models.
 * Mirrors callGemini() signature so the router can swap them 1:1.
 *
 * Docs: https://api-docs.deepseek.com/quick_start/pricing
 * Base: https://api.deepseek.com  (OpenAI-compatible, /v1/chat/completions)
 *
 * Models (V4, 2026-04):
 *   - deepseek-v4-pro   — premium, 1M context, 384K output, $1.74/$3.48 per 1M
 *   - deepseek-v4-flash — 12x cheaper, 1M context, 384K output, $0.14/$0.28 per 1M
 *
 * Embeddings are NOT supported — stays on Gemini.
 */

import type { GeminiResponse, GeminiConfig } from '../types';
import { getSupabase } from './supabase';
import type { TrackingContext } from './gemini';

const API_BASE = 'https://api.deepseek.com';
const RETRY_DELAYS = [3000, 8000, 20000, 45000, 90000]; // 5 retries, up to 90s backoff for transient failures

// Pricing per 1M tokens. Source: https://api-docs.deepseek.com/quick_start/pricing
// Verified against docs 2026-05-29.
//
// Billing facts (from API reference + reasoning_model guide):
//   - `completion_tokens` ALREADY INCLUDES reasoning/CoT tokens (reasoning_tokens is a
//     breakdown sub-field of completion_tokens_details, NOT an extra line item). So output
//     cost = completion_tokens × outputPerMillion already covers thinking-mode CoT.
//   - `prompt_tokens` = prompt_cache_hit_tokens + prompt_cache_miss_tokens. So
//     missTokens = prompt_tokens − cacheHitTokens (what trackCost computes).
//   - `max_tokens` includes the CoT part (default 32K, max 64K).
//
// NOTE: keys MUST be DeepSeek model names. Earlier versions had Gemini names as keys
// (Phase Q find-replace leftover) → every deepseek-v4-pro call fell through to `_default`
// (Flash price), undercounting Pro ~12×. Cross-check vs `model-tier.ts` MODEL_PRO/FLASH.
//
// ⚠️ PROMO EXPIRY: deepseek-v4-pro runs at 75% off (list $1.74/$3.48 → $0.435/$0.87)
// UNTIL 2026-05-31 15:59 UTC. After that, Pro reverts to LIST (4× higher). pricingFor()
// switches automatically on that timestamp so cost_tracking stays accurate post-promo.
// Flash is NOT on promo (price unchanged).
const PRO_PROMO_END_MS = Date.parse('2026-05-31T15:59:00Z');

const PRICING: Record<string, { inputCacheMiss: number; inputCacheHit: number; outputPerMillion: number }> = {
  'deepseek-v4-flash': { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
  // Legacy aliases — docs: deepseek-chat/deepseek-reasoner map to v4-flash (non-thinking/thinking), same price.
  'deepseek-reasoner': { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
  'deepseek-chat':     { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
  '_default':          { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
};

/** Pricing for a model, with deepseek-v4-pro promo→list switch at PRO_PROMO_END_MS. */
function pricingFor(model: string): { inputCacheMiss: number; inputCacheHit: number; outputPerMillion: number } {
  if (model === 'deepseek-v4-pro') {
    return Date.now() < PRO_PROMO_END_MS
      ? { inputCacheMiss: 0.435, inputCacheHit: 0.003625, outputPerMillion: 0.87 }  // 75% promo
      : { inputCacheMiss: 1.74,  inputCacheHit: 0.0145,   outputPerMillion: 3.48 }; // list (post-promo)
  }
  return PRICING[model] || PRICING['_default'];
}

function trackCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheHitTokens: number,
  tracking: TrackingContext,
  metadata?: Record<string, unknown>,
): number {
  const p = pricingFor(model);
  // Per-model cache hit rate (not a flat ratio — Flash hit is 2% of miss, Pro hit is 0.83%).
  const cacheMissTokens = Math.max(0, inputTokens - cacheHitTokens);
  const inputCost = (cacheMissTokens * p.inputCacheMiss + cacheHitTokens * p.inputCacheHit) / 1_000_000;
  const outputCost = (outputTokens * p.outputPerMillion) / 1_000_000;
  const cost = inputCost + outputCost;

  if (process.env.DEBUG_ROUTING === '1') {
    const hitPct = inputTokens > 0 ? Math.round((cacheHitTokens / inputTokens) * 100) : 0;
    console.warn(`[TRACK-DEEPSEEK] task=${tracking.task} ch=${tracking.chapterNumber ?? 'none'} model=${model} in=${inputTokens} (cache:${hitPct}%) out=${outputTokens} cost=$${cost.toFixed(4)}`);
  }

  getSupabase().from('cost_tracking').insert({
    project_id: tracking.projectId,
    model,
    task: tracking.task,
    chapter_number: tracking.chapterNumber ?? null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost,
    metadata: { cache_hit_tokens: cacheHitTokens, ...(metadata || {}) },
  }).then(({ error }) => {
    if (error) console.warn('[DeepSeekCost] Insert failed:', error.message);
  });
  return cost;
}

export async function callDeepSeek(
  userPrompt: string,
  config: GeminiConfig,
  options?: { jsonMode?: boolean; tracking?: TrackingContext },
): Promise<GeminiResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const messages: Array<{ role: string; content: string }> = [];
  if (config.systemPrompt) {
    messages.push({ role: 'system', content: config.systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const thinkingTasks = config.deepseekThinkingTasks;
  const taskName = options?.tracking?.task;
  const shouldUseThinking =
    config.deepseekThinkingEnabled === true &&
    (!thinkingTasks || thinkingTasks.length === 0 || (taskName ? thinkingTasks.includes(taskName) : false));

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: Math.min(config.maxTokens, 32768), // V4 supports 384K; 32K is plenty for any one call
  };

  if (shouldUseThinking) {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = config.deepseekReasoningEffort || 'high';
  } else {
    body.temperature = config.temperature;
    body.top_p = 0.95;
  }

  // JSON mode — DeepSeek supports OpenAI-compatible response_format
  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const url = `${API_BASE}/chat/completions`;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000), // 5 min — DeepSeek thinking mode slower
      });

      if (res.status === 429 || res.status === 503 || res.status === 502) {
        if (attempt < RETRY_DELAYS.length) continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`DeepSeek ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const choice = data?.choices?.[0];
      // DeepSeek V4 thinking models may split output into reasoning_content + content.
      // The final answer is in content; reasoning is thinking scratch. Use content only.
      // In non-thinking compatibility mode only, keep the old fallback for odd endpoints.
      const reasoningContent = choice?.message?.reasoning_content || '';
      const content = choice?.message?.content || (shouldUseThinking ? '' : reasoningContent);
      const finishReason = choice?.finish_reason || 'stop';

      const promptTokens = data?.usage?.prompt_tokens || 0;
      const completionTokens = data?.usage?.completion_tokens || 0;
      // prompt_tokens = prompt_cache_hit_tokens + prompt_cache_miss_tokens (per docs).
      const cacheHitTokens = data?.usage?.prompt_cache_hit_tokens || 0;
      // reasoning_tokens is a breakdown of completion_tokens (already billed within it) —
      // record it so we can see how much of the output cost was CoT, the silent burn vector.
      const reasoningTokens = data?.usage?.completion_tokens_details?.reasoning_tokens || 0;

      // COST-VISIBILITY FIX (2026-05-29): DeepSeek bills EVERY HTTP-200 response — including
      // empty-content ones (thinking model nhả reasoning rồi cụt content). reasoning tokens
      // count vào completion_tokens và bị tính tiền. Trước đây trackCost chỉ chạy SAU empty-guard
      // (chỉ trên success), nên các response rỗng bị tính tiền nhưng KHÔNG ghi sổ → cost_tracking
      // mù, balance âm mà DB báo $0. Track NGAY khi có usage, bất kể content rỗng hay không.
      const p = pricingFor(config.model);
      const cacheMissTokens = Math.max(0, promptTokens - cacheHitTokens);
      let estimatedCostUsd = (
        cacheMissTokens * p.inputCacheMiss
        + cacheHitTokens * p.inputCacheHit
        + completionTokens * p.outputPerMillion
      ) / 1_000_000;
      if (options?.tracking && (promptTokens > 0 || completionTokens > 0)) {
        estimatedCostUsd = trackCost(config.model, promptTokens, completionTokens, cacheHitTokens, options.tracking, {
          thinking_enabled: shouldUseThinking,
          reasoning_effort: shouldUseThinking ? (config.deepseekReasoningEffort || 'high') : null,
          reasoning_tokens: reasoningTokens,
          empty_content: !content || content.trim().length === 0,
          finish_reason: finishReason,
        });
      }

      // P6.1: explicit empty-content guard. Without this, an empty response (rare but happens
      // when DeepSeek V4 thinking model emits only reasoning then truncates) returned silently
      // → caller saves empty chapter to DB.
      // NO RETRY-ON-EMPTY (2026-05-29): retrying an empty HTTP-200 just re-bills full reasoning
      // tokens with no guarantee of non-empty output — a silent money drain. An empty-on-200 is
      // NOT a transient network blip; it's a model/config issue. Fail fast → upstream (cron) retries
      // next tick with backoff, instead of looping 6× here and billing each loop.
      if (!content || content.trim().length === 0) {
        if (finishReason === 'length' || finishReason === 'LENGTH') {
          throw new Error(`DeepSeek truncation: empty content with finish_reason=${finishReason}. Increase maxTokens.`);
        }
        throw new Error(`DeepSeek empty content (finish_reason=${finishReason}) — not retrying to avoid re-billing reasoning tokens.`);
      }

      return {
        content,
        promptTokens,
        completionTokens,
        finishReason: finishReason.toUpperCase(),
        estimatedCostUsd,
      };
    } catch (e) {
      console.warn(`  [DeepSeek Warning] Attempt ${attempt + 1}/${RETRY_DELAYS.length + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
      if (attempt >= RETRY_DELAYS.length) throw e;
    }
  }

  throw new Error('DeepSeek: all retries exhausted');
}
