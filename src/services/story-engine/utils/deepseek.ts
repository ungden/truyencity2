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

// Pricing per 1M tokens (cache miss — conservative)
const PRICING: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'deepseek-v4-pro':   { inputPerMillion: 1.74, outputPerMillion: 3.48 },
  'deepseek-v4-flash': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  // Legacy aliases
  'deepseek-reasoner': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-chat':     { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  '_default':          { inputPerMillion: 0.14, outputPerMillion: 0.28 },
};

function trackCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  tracking: TrackingContext,
): void {
  const p = PRICING[model] || PRICING['_default'];
  const cost = (inputTokens * p.inputPerMillion + outputTokens * p.outputPerMillion) / 1_000_000;

  if (process.env.DEBUG_ROUTING === '1') {
    console.warn(`[TRACK-DEEPSEEK] task=${tracking.task} ch=${tracking.chapterNumber ?? 'none'} model=${model} in=${inputTokens} out=${outputTokens}`);
  }

  getSupabase().from('cost_tracking').insert({
    project_id: tracking.projectId,
    model,
    task: tracking.task,
    chapter_number: tracking.chapterNumber ?? null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost,
  }).then(({ error }) => {
    if (error) console.warn('[DeepSeekCost] Insert failed:', error.message);
  });
}

export async function callDeepSeek(
  userPrompt: string,
  config: GeminiConfig,
  options?: { jsonMode?: boolean; tracking?: TrackingContext },
): Promise<GeminiResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const messages: Array<{ role: string; content: string }> = [];
  if (config.systemPrompt) {
    messages.push({ role: 'system', content: config.systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: Math.min(config.maxTokens, 32768), // V4 supports 384K; 32K is plenty for any one call
    top_p: 0.95,
  };

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
        signal: AbortSignal.timeout(180000), // 3 min — DeepSeek thinking mode slower
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
      // Fall back to reasoning_content if content is empty (some endpoints behave differently).
      const content = choice?.message?.content || choice?.message?.reasoning_content || '';
      const finishReason = choice?.finish_reason || 'stop';

      const promptTokens = data?.usage?.prompt_tokens || 0;
      const completionTokens = data?.usage?.completion_tokens || 0;

      if (options?.tracking) {
        trackCost(config.model, promptTokens, completionTokens, options.tracking);
      }

      return {
        content,
        promptTokens,
        completionTokens,
        finishReason: finishReason.toUpperCase(),
      };
    } catch (e) {
      if (attempt >= RETRY_DELAYS.length) throw e;
    }
  }

  throw new Error('DeepSeek: all retries exhausted');
}
