/**
 * Story Engine v2 — Gemini API Client
 *
 * Single Gemini wrapper for the entire engine. No other AI providers needed.
 * Handles: rate limiting, retries, response parsing.
 */

import type { GeminiResponse, GeminiConfig } from '../types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const RETRY_DELAYS = [2000, 5000, 10000];

// ── Rate Limiter (token bucket, 2000 RPM) ────────────────────────────────────

const rateLimit = {
  tokens: 2000,
  maxTokens: 2000,
  refillRate: 2000 / 60, // ~33 tokens/sec
  lastRefill: Date.now(),
};

function refillTokens(): void {
  const now = Date.now();
  const elapsed = (now - rateLimit.lastRefill) / 1000;
  rateLimit.tokens = Math.min(rateLimit.maxTokens, rateLimit.tokens + elapsed * rateLimit.refillRate);
  rateLimit.lastRefill = now;
}

async function waitForRateLimit(): Promise<void> {
  refillTokens();
  if (rateLimit.tokens >= 1) {
    rateLimit.tokens -= 1;
    return;
  }
  const waitMs = ((1 - rateLimit.tokens) / rateLimit.refillRate) * 1000;
  await new Promise(r => setTimeout(r, Math.ceil(waitMs)));
  refillTokens();
  rateLimit.tokens -= 1;
}

// ── Core API Call ────────────────────────────────────────────────────────────

export async function callGemini(
  userPrompt: string,
  config: GeminiConfig,
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  await waitForRateLimit();

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      topP: 0.95,
      topK: 40,
      // NOTE: frequencyPenalty/presencePenalty NOT supported by thinking models
      // (gemini-3-flash-preview). Sending them causes empty content response.
    },
  };

  if (config.systemPrompt) {
    body.systemInstruction = { parts: [{ text: config.systemPrompt }] };
  }

  const url = `${API_BASE}/models/${config.model}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });

      if (res.status === 429 || res.status === 503) {
        rateLimit.tokens = Math.max(0, rateLimit.tokens - 10);
        if (attempt < RETRY_DELAYS.length) continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const content = candidate?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';

      return {
        content,
        promptTokens: data?.usageMetadata?.promptTokenCount || 0,
        completionTokens: data?.usageMetadata?.candidatesTokenCount || 0,
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
        `${API_BASE}/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
