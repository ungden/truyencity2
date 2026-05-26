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

// Pricing per 1M tokens. Pricing source: https://api-docs.deepseek.com/quick_start/pricing
// NOTE: keys MUST be DeepSeek model names. Earlier versions of this file had
// Gemini model names as keys (`gemini-3-flash-preview` / `gemini-3.1-flash-lite`)
// — leftover from Phase Q find-replace — which caused every real
// `deepseek-v4-pro` call to fall through to `_default` (Flash price) and
// undercount Pro spend by ~12×. Cross-check vs `model-tier.ts` MODEL_PRO/FLASH.
//
// DeepSeek-V4-Pro currently sells at 75% off promo: list $1.74/$3.48 → effective
// $0.435/$0.87. Cache-hit and cache-miss rates are per-model (NOT flat ratio —
// Flash hit is 2% of miss, Pro hit is 0.83% of miss). Effective prices below.
// If 75% promo ends, bump Pro back to list ($1.74/$3.48 + $0.0145 cache hit).
const PRICING: Record<string, { inputCacheMiss: number; inputCacheHit: number; outputPerMillion: number }> = {
  'deepseek-v4-pro':   { inputCacheMiss: 0.435, inputCacheHit: 0.003625, outputPerMillion: 0.87 },
  'deepseek-v4-flash': { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
  // Legacy aliases (kept for old rows / fallback)
  'deepseek-reasoner': { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
  'deepseek-chat':     { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
  '_default':          { inputCacheMiss: 0.14,  inputCacheHit: 0.0028,   outputPerMillion: 0.28 },
};

function trackCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheHitTokens: number,
  tracking: TrackingContext,
  metadata?: Record<string, unknown>,
): void {
  const p = PRICING[model] || PRICING['_default'];
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

      // P6.1: explicit empty-content guard. Without this, an empty response (rare but happens
      // when DeepSeek V4 thinking model emits only reasoning then truncates) returned silently
      // → caller saves empty chapter to DB. Throw so retry loop or upstream handler kicks in.
      if (!content || content.trim().length === 0) {
        // Don't retry on truncation (length cause) — that's a maxTokens issue, not transient.
        if (finishReason === 'length' || finishReason === 'LENGTH') {
          throw new Error(`DeepSeek truncation: empty content with finish_reason=${finishReason}. Increase maxTokens.`);
        }
        // Otherwise treat as transient and retry
        if (attempt < RETRY_DELAYS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        throw new Error(`DeepSeek empty content after ${RETRY_DELAYS.length} retries (finish_reason=${finishReason})`);
      }

      const promptTokens = data?.usage?.prompt_tokens || 0;
      const completionTokens = data?.usage?.completion_tokens || 0;
      // DeepSeek reports prompt_cache_hit_tokens for prefix-cached requests.
      // 10% discount applied to these tokens. Available since V3.
      const cacheHitTokens = data?.usage?.prompt_cache_hit_tokens || 0;

      if (options?.tracking) {
        trackCost(config.model, promptTokens, completionTokens, cacheHitTokens, options.tracking, {
          thinking_enabled: shouldUseThinking,
          reasoning_effort: shouldUseThinking ? (config.deepseekReasoningEffort || 'high') : null,
        });
      }

      return {
        content,
        promptTokens,
        completionTokens,
        finishReason: finishReason.toUpperCase(),
      };
    } catch (e) {
      console.warn(`  [DeepSeek Warning] Attempt ${attempt + 1}/${RETRY_DELAYS.length + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
      if (attempt >= RETRY_DELAYS.length) throw e;
    }
  }

  throw new Error('DeepSeek: all retries exhausted');
}
