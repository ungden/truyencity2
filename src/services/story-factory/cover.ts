import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StoryFactoryError } from './contracts';

const WIDTH = 1_200;
const HEIGHT = 1_800;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]!);
}

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

function typographyOverlay(title: string): Buffer {
  const lines = wrapTitle(title);
  const fontSize = Math.max(42, Math.min(84, Math.floor(500 / Math.max(1, lines.length))));
  const lineHeight = Math.round(fontSize * 1.12);
  const startY = 100 + Math.round((520 - lines.length * lineHeight) / 2) + fontSize;
  const spans = lines.map((line, index) =>
    `<tspan x="${WIDTH / 2}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`,
  ).join('');
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
    <text text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800"
      font-size="${fontSize}" fill="#fff9ec" stroke="#070a10" stroke-width="10"
      paint-order="stroke fill" stroke-linejoin="round">${spans}</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 72}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="34"
      letter-spacing="3" fill="#fff9ec" stroke="#070a10" stroke-width="5"
      paint-order="stroke fill">truyencity.com</text>
  </svg>`);
}

async function generateBackground(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
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
  if (!inline?.data) throw new StoryFactoryError('infra_blocked', 'Cover provider returned no image.');
  return { buffer: Buffer.from(inline.data, 'base64'), mimeType: inline.mimeType || 'image/png' };
}

export async function generateFactoryCover(input: {
  db: SupabaseClient;
  novelId: string;
  title: string;
  backgroundPrompt: string;
}): Promise<{ coverUrl: string; path: string; sha256: string; width: number; height: number }> {
  const background = await generateBackground(input.backgroundPrompt);
  const rendered = await sharp(background.buffer)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .composite([{ input: typographyOverlay(input.title), top: 0, left: 0 }])
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
