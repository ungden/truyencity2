/**
 * Story Engine v2 — Gemini API Client
 *
 * Single Gemini wrapper for the entire engine. No other AI providers needed.
 * Handles: retries (429/503), response parsing.
 */

import type { GeminiResponse, GeminiConfig } from '../types';
import { getSupabase } from './supabase';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const RETRY_DELAYS = [2000, 5000, 10000];

// ── Cost Tracking ───────────────────────────────────────────────────────────
// Pricing per 1M tokens (Google AI docs, Standard tier)
const PRICING: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'gemini-3.1-flash-lite':        { inputPerMillion: 0.25, outputPerMillion: 1.50 },
  'gemini-3.5-flash':             { inputPerMillion: 0.75, outputPerMillion: 4.50 },
  'gemini-3-flash-preview':       { inputPerMillion: 0.50, outputPerMillion: 3.00 },
  'gemini-3-pro-preview':         { inputPerMillion: 2.00, outputPerMillion: 12.00 },
  'gemini-3.1-pro-preview':       { inputPerMillion: 2.00, outputPerMillion: 12.00 },
  'gemini-3-pro-image-preview':   { inputPerMillion: 2.00, outputPerMillion: 12.00 },
  'gemini-embedding-001':         { inputPerMillion: 0.15, outputPerMillion: 0 },
  // Fallback for unknown models
  '_default':                     { inputPerMillion: 0.50, outputPerMillion: 3.00 },
};

export interface TrackingContext {
  projectId: string;
  task: string;
  /** Chapter being written when this call was made. NULL for outline/bible
   *  tasks not tied to one chapter. Allows per-chapter cost roll-ups. */
  chapterNumber?: number;
}

function trackCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  tracking: TrackingContext,
): void {
  const p = PRICING[model] || PRICING['_default'];
  const cost = (inputTokens * p.inputPerMillion + outputTokens * p.outputPerMillion) / 1_000_000;

  if (process.env.DEBUG_ROUTING === '1') {
    console.warn(`[TRACK-GEMINI] task=${tracking.task} ch=${tracking.chapterNumber ?? 'none'} model=${model} in=${inputTokens} out=${outputTokens}`);
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
    if (error) console.warn('[CostTracking] Insert failed:', error.message);
  });
}

// ── Router ───────────────────────────────────────────────────────────────────
// Routes call to the right provider based on (1) per-task override via
// globalThis.__MODEL_ROUTING__, then (2) the model name on `config.model`.
// Any model name starting with `deepseek-` dispatches to DeepSeek's
// OpenAI-compatible API. Anything else stays on Gemini.
// `gemini-embedding-*` and `gemini-3-pro-image-preview` are unaffected because
// they live in their own helpers (embedTexts, gemini-image.ts) — not callGemini.

declare global {
  // eslint-disable-next-line no-var
  var __MODEL_ROUTING__: Record<string, string> | undefined;
}

function resolveRoute(task: string | undefined): string | null {
  if (!task) return null;
  const routing = globalThis.__MODEL_ROUTING__;
  if (!routing) return null;
  const cleanTask = task.endsWith('_retry') ? task.slice(0, -6) : task;
  return routing[cleanTask] || routing[task] || routing['_default'] || null;
}

// ── Core API Call ────────────────────────────────────────────────────────────
// NOTE: Client-side rate limiter removed — Gemini tier 3 unlimited.
// Server-side 429/503 retries in the call loop handle transient throttling.

export async function callGemini(
  userPrompt: string,
  config: GeminiConfig,
  options?: { jsonMode?: boolean; tracking?: TrackingContext; disableRouting?: boolean },
): Promise<GeminiResponse> {
  // 1. Per-task routing override (set via globalThis.__MODEL_ROUTING__)
  // 2. Otherwise, model name itself decides: anything starting with `deepseek-`
  //    routes to DeepSeek. This makes DEFAULT_CONFIG.model = 'gemini-3.1-flash-lite'
  //    enough to switch the whole pipeline.
  const routed = options?.disableRouting ? null : resolveRoute(options?.tracking?.task);
  const targetModel = routed || config.model;
  if (process.env.DEBUG_ROUTING === '1') {
    console.warn(`[ROUTER] task=${options?.tracking?.task || 'NO_TASK'} target=${targetModel}`);
  }
  if (targetModel.startsWith('deepseek-')) {
    const { callDeepSeek } = await import('./deepseek');
    return callDeepSeek(userPrompt, { ...config, model: targetModel }, options);
  }
  if (routed) {
    // Routed to a different Gemini model name — override
    config = { ...config, model: routed };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // Gemini 3 family recommends temperature=1.0 (lower temps cause looping per docs).
  // We force 1.0 when target model matches `gemini-3*` AND caller didn't explicitly
  // override below 0.7. Caller can still send temp 0.2-0.6 for deterministic stages
  // (length-normalizer, setup-pipeline retries on stuck novels).
  //
  // Phase T+1 (2026-05-15): force-1.0 override caused Gia Tộc Tu Tiên world stage
  // to return empty content. Direct API call with temp=0.4 returns 5342 chars
  // valid JSON; wrapper at forced temp=1.0 returns 0. Now respect caller temp if
  // explicitly set <0.7 (signals "deterministic stage needed").
  const isGemini3 = config.model.startsWith('gemini-3');
  const isGemini35 = config.model === 'gemini-3.5-flash';
  const callerTemp = config.temperature ?? 1.0;
  const effectiveTemperature = isGemini3 && callerTemp >= 0.7 ? 1.0 : callerTemp;

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: config.maxTokens,
  };

  // Google recommends removing temperature/topP/topK for Gemini 3.5 Flash to optimize reasoning/thinking
  if (isGemini35) {
    if (callerTemp < 0.7) {
      generationConfig.temperature = callerTemp;
    }
  } else {
    generationConfig.temperature = effectiveTemperature;
    generationConfig.topP = 0.95;
    generationConfig.topK = 40;
  }

  // Thinking control for Gemini 3 thinking models (gemini-3-flash-preview, gemini-3-pro-*).
  // Per-task tier:
  //   - Chapter-writing volume tasks → GEMINI_CHAPTER_THINKING_LEVEL || 'low'.
  //     'low' avoids the failure mode where hidden thinking tokens consume the
  //     maxOutputTokens budget and truncate JSON output (caused Architect retries).
  //   - Setup creative stages → GEMINI_THINKING_LEVEL || 'high'.
  //
  // Phase T+1 (2026-05-15) — flash-lite is NOT a thinking model. Setting
  // thinkingConfig on gemini-3.1-flash-lite caused empty-content returns on
  // specific prompt combinations (Gia Tộc Tu Tiên + tu-tiên-gia-tộc kernel).
  // Gate to ONLY actual thinking models (gemini-3-flash-preview, gemini-3-pro-*).
  const isThinkingModel = config.model === 'gemini-3.5-flash'
    || config.model === 'gemini-3-flash-preview'
    || config.model.startsWith('gemini-3-pro');
  if ((isGemini3 || isGemini35) && isThinkingModel) {
    const task = options?.tracking?.task || '';
    const isChapterTask = ['architect', 'writer', 'writer_continuation', 'critic', 'continuity_guardian', 'auto_revision'].includes(task);
    const valid = (v: string): v is 'low' | 'medium' | 'high' => ['low', 'medium', 'high'].includes(v);
    let level: string | undefined = config.thinkingLevel;
    if (!level && isChapterTask) {
      const envChapter = (process.env.GEMINI_CHAPTER_THINKING_LEVEL || '').toLowerCase();
      level = valid(envChapter) ? envChapter : 'low';
    } else if (!level) {
      const envSetup = (process.env.GEMINI_THINKING_LEVEL || '').toLowerCase();
      level = valid(envSetup) ? envSetup : 'high';
    }
    if (level) {
      generationConfig.thinkingConfig = { thinkingLevel: level };
    }
  }

  // JSON mode: force Gemini to return raw JSON (no markdown wrapping)
  if (options?.jsonMode) {
    if (config.responseJsonSchema) {
      // This client still calls the legacy generateContent endpoint. Its stable
      // structured-output fields are responseMimeType + responseJsonSchema;
      // responseFormat belongs to the newer API surface and is not accepted by
      // every generateContent model rollout yet.
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseJsonSchema = config.responseJsonSchema;
    } else {
      generationConfig.responseMimeType = 'application/json';
    }
  }

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig,
  };

  if (config.systemPrompt) {
    body.systemInstruction = { parts: [{ text: config.systemPrompt }] };
  }

  // API key passed via header (not URL query param) to avoid log/proxy exposure
  const url = `${API_BASE}/models/${config.model}:generateContent`;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        // 2026-05-12: bumped 120s → 240s for Gemini 3 thinking models — thinking_level
        // high can spend 60-180s reasoning before emitting tokens; old 120s timeout
        // truncated JSON mid-string. 240s gives headroom on chapter-scale prompts.
        signal: AbortSignal.timeout(240000),
      });

      if (res.status === 429 || res.status === 503) {
        if (attempt < RETRY_DELAYS.length) continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const content = candidate?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';

      const promptTokens = data?.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data?.usageMetadata?.candidatesTokenCount || 0;

      // Fire-and-forget cost tracking
      if (options?.tracking) {
        trackCost(config.model, promptTokens, completionTokens, options.tracking);
      }

      return {
        content,
        promptTokens,
        completionTokens,
        finishReason: candidate?.finishReason || 'STOP',
      };
    } catch (e) {
      if (attempt >= RETRY_DELAYS.length) throw e;
    }
  }

  throw new Error('Gemini: all retries exhausted');
}

// ── Embedding API ────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 768;

export async function embedTexts(
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT',
): Promise<(number[] | null)[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || texts.length === 0) return texts.map(() => null);

  const results: (number[] | null)[] = [];
  const BATCH = 100;

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const embedding = await embedBatchInternal(batch, taskType, apiKey);
    results.push(...embedding);
  }

  return results;
}

async function embedBatchInternal(
  texts: string[],
  taskType: string,
  apiKey: string,
): Promise<(number[] | null)[]> {
  const requests = texts.map(text => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text: text.slice(0, 8000) }] },
    taskType,
    outputDimensionality: EMBEDDING_DIM,
  }));

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));

      const res = await fetch(
        `${API_BASE}/models/${EMBEDDING_MODEL}:batchEmbedContents`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ requests }),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (res.status === 429 || res.status === 503) continue;
      if (!res.ok) return texts.map(() => null);

      const data = await res.json();
      const embeddings = data?.embeddings;
      if (!Array.isArray(embeddings)) return texts.map(() => null);

      return embeddings.map((e: { values?: number[] }) => {
        const v = e?.values;
        return Array.isArray(v) && v.length === EMBEDDING_DIM ? v : null;
      });
    } catch {
      if (attempt >= 2) return texts.map(() => null);
    }
  }
  return texts.map(() => null);
}
