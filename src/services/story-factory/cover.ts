import { createHash } from 'node:crypto';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordGeminiUsageEvent, type GeminiUsageContext, type GeminiUsageMetadata } from '@/services/gemini-usage-ledger';
import { StoryFactoryError } from './contracts';

const WIDTH = 1_200;
const HEIGHT = 1_800;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function wrapTitle(title: string, maxCharacters = 24): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of title.trim().split(/\s+/u)) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxCharacters) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  if (lines.length > 8) throw new StoryFactoryError('setup_blocked', 'Title is too long for the deterministic cover safe area.');
  return lines;
}

function gradientOverlay(): Buffer {
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#070a10" stop-opacity="0.96"/>
        <stop offset="0.8" stop-color="#070a10" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#070a10" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#070a10" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#070a10" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="650" fill="url(#top)"/>
    <rect y="${HEIGHT - 220}" width="${WIDTH}" height="220" fill="url(#bottom)"/>
  </svg>`);
}

function typographyElement(title: string): React.ReactElement {
  const lines = wrapTitle(title);
  const fontSize = Math.max(42, Math.min(84, Math.floor(500 / Math.max(1, lines.length))));
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        color: '#fff9ec',
        fontFamily: 'sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 90,
              left: 54,
              right: 54,
              height: 520,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize,
              lineHeight: 1.12,
              fontWeight: 700,
              textAlign: 'center',
              textShadow: '0 3px 2px #070a10, 3px 0 2px #070a10, 0 -3px 2px #070a10, -3px 0 2px #070a10',
            },
            children: lines.map(line => ({
              type: 'div',
              props: { style: { display: 'flex' }, children: line },
            })),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 56,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 3,
              textShadow: '0 2px 2px #070a10, 2px 0 2px #070a10, 0 -2px 2px #070a10, -2px 0 2px #070a10',
            },
            children: 'truyencity.com',
          },
        },
      ],
    },
  } as React.ReactElement;
}

export async function renderCoverTypography(title: string): Promise<Buffer> {
  const response = new ImageResponse(typographyElement(title), { width: WIDTH, height: HEIGHT });
  const overlay = Buffer.from(await response.arrayBuffer());
  const { channels = [] } = await sharp(overlay).stats();
  const alpha = channels[3];
  if (!alpha || alpha.max === 0 || alpha.mean < 0.1) {
    throw new StoryFactoryError('infra_blocked', 'Deterministic cover typography rendered no visible title or watermark pixels.');
  }
  return overlay;
}

async function generateBackground(
  prompt: string,
  usageContext?: GeminiUsageContext,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new StoryFactoryError('infra_blocked', 'GEMINI_API_KEY is not configured for cover generation.');
  const response = await fetch(`${API_BASE}/models/${IMAGE_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}\nVertical Vietnamese web-novel cover background, cinematic composition, clean shapes and controlled texture. Leave the upper safe area readable. Absolutely no text, letters, logos, symbols, signature or watermark.` }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '2:3', imageSize: '2K' },
      },
    }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new StoryFactoryError('infra_blocked', `Cover provider failed with ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const inline = payload?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: unknown }) => part.inlineData)?.inlineData;
  await recordGeminiUsageEvent({
    model: IMAGE_MODEL,
    modelVersion: typeof payload?.modelVersion === 'string' ? payload.modelVersion : undefined,
    responseId: typeof payload?.responseId === 'string' ? payload.responseId : undefined,
    usageMetadata: payload?.usageMetadata as GeminiUsageMetadata | undefined,
    status: inline?.data ? 'succeeded' : 'blocked',
    context: usageContext,
  });
  if (!inline?.data) throw new StoryFactoryError('infra_blocked', 'Cover provider returned no image.');
  return { buffer: Buffer.from(inline.data, 'base64'), mimeType: inline.mimeType || 'image/png' };
}

export async function generateFactoryCover(input: {
  db: SupabaseClient;
  novelId: string;
  title: string;
  backgroundPrompt: string;
  usageContext?: GeminiUsageContext;
}): Promise<{ coverUrl: string; path: string; sha256: string; width: number; height: number }> {
  const background = await generateBackground(input.backgroundPrompt, input.usageContext);
  const typography = await renderCoverTypography(input.title);
  const rendered = await sharp(background.buffer)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .composite([
      { input: gradientOverlay(), top: 0, left: 0 },
      { input: typography, top: 0, left: 0 },
    ])
    .webp({ quality: 91, effort: 6, smartSubsample: true })
    .toBuffer();
  const metadata = await sharp(rendered).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT || metadata.format !== 'webp') {
    throw new StoryFactoryError('infra_blocked', 'Deterministic cover renderer violated the 2:3 WebP contract.');
  }
  const path = `factory/${input.novelId}.webp`;
  const upload = await input.db.storage.from('covers').upload(path, rendered, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '3600',
  });
  if (upload.error) throw new StoryFactoryError('infra_blocked', `Cover upload failed: ${upload.error.message}`);
  const { data } = input.db.storage.from('covers').getPublicUrl(path);
  if (!data.publicUrl) throw new StoryFactoryError('infra_blocked', 'Cover storage did not return a public URL.');
  return {
    coverUrl: data.publicUrl,
    path,
    sha256: createHash('sha256').update(rendered).digest('hex'),
    width: WIDTH,
    height: HEIGHT,
  };
}
