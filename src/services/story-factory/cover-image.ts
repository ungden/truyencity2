import { recordGeminiUsageEvent, type GeminiUsageContext, type GeminiUsageMetadata } from '@/services/gemini-usage-ledger';
import { StoryFactoryError } from './contracts';

/**
 * The cover backdrop call, dispatched by model id the same way `provider.ts` dispatches
 * text: `gpt-image-*` goes to OpenAI's images endpoint, everything else to Gemini. The
 * title is not drawn by the model — `cover.ts` renders it deterministically over the
 * result — so what matters here is composition and a clean upper safe area, not the
 * model's ability to spell.
 *
 * Default is `gpt-image-2.5-sunburst` (2026-09-08), OpenAI's premium tier. The previous
 * default, `gemini-3-pro-image` (Nano Banana Pro), is still Google's best image model —
 * the newer-sounding `gemini-3.1-flash-image` is the cheap high-volume tier, not an
 * upgrade — so the alternative here is a different vendor, not an older model.
 */
export const COVER_IMAGE_MODEL = process.env.COVER_IMAGE_MODEL?.trim() || 'gpt-image-2.5-sunburst';

/** low · medium · high · xhigh · max. A cover is generated once per novel, so buy quality. */
export const COVER_IMAGE_QUALITY = process.env.COVER_IMAGE_QUALITY?.trim() || 'xhigh';

/**
 * Exact 2:3, both edges multiples of 16 (OpenAI's constraint), and slightly larger than
 * the 1200x1800 canvas so sharp downsamples instead of stretching.
 */
export const OPENAI_COVER_SIZE = '1216x1824';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const REQUEST_TIMEOUT_MS = 240_000;

/** Published per-image prices at standard sizes. Used only when the API reports no usage. */
const QUALITY_FALLBACK_USD: Record<string, number> = {
  low: 0.006, medium: 0.013, high: 0.053, xhigh: 0.094, max: 0.211,
};
/** OpenAI image output tokens, $30 per 1M. */
const IMAGE_OUTPUT_USD_PER_TOKEN = 30 / 1_000_000;

export interface CoverBackdrop {
  buffer: Buffer;
  mimeType: string;
  model: string;
  /** Best available figure: derived from reported tokens, else the published tier price. */
  costUsd: number;
  costBasis: 'reported_tokens' | 'published_tier' | 'gemini_ledger';
}

export function isOpenAiCoverModel(model: string): boolean {
  return model.startsWith('gpt-image');
}

/** The instruction every backend gets, on top of the story's own cover prompt. */
export function coverInstruction(prompt: string): string {
  return `${prompt}
Vertical Vietnamese web-novel cover background, cinematic composition, clean shapes and controlled texture. Leave the upper safe area readable. Absolutely no text, letters, logos, symbols, signature or watermark.`;
}

async function generateWithOpenAi(input: { prompt: string; model: string }): Promise<CoverBackdrop> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new StoryFactoryError(
      'infra_blocked',
      `Cover model ${input.model} needs OPENAI_API_KEY. Set it, or set COVER_IMAGE_MODEL=gemini-3-pro-image to use Gemini.`,
    );
  }

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: input.model,
      prompt: coverInstruction(input.prompt),
      size: OPENAI_COVER_SIZE,
      quality: COVER_IMAGE_QUALITY,
      output_format: 'png',
      n: 1,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new StoryFactoryError(
      'infra_blocked',
      `Cover provider failed with ${response.status}: ${(await response.text()).slice(0, 500)}`,
    );
  }

  const payload = await response.json() as {
    data?: Array<{ b64_json?: string }>;
    usage?: { output_tokens?: number };
  };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new StoryFactoryError('infra_blocked', 'Cover provider returned no image.');

  const outputTokens = payload.usage?.output_tokens;
  return {
    buffer: Buffer.from(encoded, 'base64'),
    mimeType: 'image/png',
    model: input.model,
    costUsd: outputTokens
      ? Number((outputTokens * IMAGE_OUTPUT_USD_PER_TOKEN).toFixed(4))
      : (QUALITY_FALLBACK_USD[COVER_IMAGE_QUALITY] ?? 0),
    costBasis: outputTokens ? 'reported_tokens' : 'published_tier',
  };
}

async function generateWithGemini(input: {
  prompt: string; model: string; usageContext?: GeminiUsageContext;
}): Promise<CoverBackdrop> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', `Cover model ${input.model} needs GEMINI_API_KEY.`);

  const response = await fetch(`${GEMINI_API_BASE}/models/${input.model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: coverInstruction(input.prompt) }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '2:3', imageSize: '2K' },
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new StoryFactoryError(
      'infra_blocked',
      `Cover provider failed with ${response.status}: ${(await response.text()).slice(0, 500)}`,
    );
  }

  const payload = await response.json();
  const inline = payload?.candidates?.[0]?.content?.parts
    ?.find((part: { inlineData?: unknown }) => part.inlineData)?.inlineData;

  await recordGeminiUsageEvent({
    model: input.model,
    modelVersion: typeof payload?.modelVersion === 'string' ? payload.modelVersion : undefined,
    responseId: typeof payload?.responseId === 'string' ? payload.responseId : undefined,
    usageMetadata: payload?.usageMetadata as GeminiUsageMetadata | undefined,
    status: inline?.data ? 'succeeded' : 'blocked',
    context: input.usageContext,
  });

  if (!inline?.data) throw new StoryFactoryError('infra_blocked', 'Cover provider returned no image.');
  return {
    buffer: Buffer.from(inline.data, 'base64'),
    mimeType: inline.mimeType || 'image/png',
    model: input.model,
    // Gemini image spend is already itemised in the usage ledger; do not double count it.
    costUsd: 0,
    costBasis: 'gemini_ledger',
  };
}

export async function generateCoverBackdrop(input: {
  prompt: string;
  model?: string;
  usageContext?: GeminiUsageContext;
}): Promise<CoverBackdrop> {
  const model = input.model?.trim() || COVER_IMAGE_MODEL;
  return isOpenAiCoverModel(model)
    ? generateWithOpenAi({ prompt: input.prompt, model })
    : generateWithGemini({ prompt: input.prompt, model, usageContext: input.usageContext });
}
