#!/usr/bin/env tsx

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 1800;
const args = process.argv.slice(2);
const value = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
};
const source = value('--source');
const output = value('--output');
const title = value('--title');
const watermark = value('--watermark') || 'truyencity.com';
if (!source || !output || !title) throw new Error('--source, --output and --title are required.');

const escapeXml = (input: string): string =>
  input.replace(/[<>&'"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!);

function wrap(input: string, max = 22): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of input.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > max) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > 6) throw new Error('Title is too long for the 2:3 cover safe area.');
  return lines;
}

function overlay(): Buffer {
  const lines = wrap(title!);
  const fontSize = Math.max(54, Math.min(88, Math.floor(440 / Math.max(1, lines.length))));
  const lineHeight = Math.round(fontSize * 1.1);
  const startY = 115 + Math.round((440 - lines.length * lineHeight) / 2) + fontSize;
  const titleSpans = lines.map((line, index) =>
    `<tspan x="${WIDTH / 2}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`,
  ).join('');
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#080b12" stop-opacity="0.94"/>
        <stop offset="0.78" stop-color="#080b12" stop-opacity="0.58"/>
        <stop offset="1" stop-color="#080b12" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#080b12" stop-opacity="0.86"/>
        <stop offset="1" stop-color="#080b12" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="620" fill="url(#top)"/>
    <rect y="${HEIGHT - 220}" width="${WIDTH}" height="220" fill="url(#bottom)"/>
    <text text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800"
      font-size="${fontSize}" fill="#fff9ec" stroke="#080b12" stroke-width="10"
      paint-order="stroke fill" stroke-linejoin="round">${titleSpans}</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 72}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="34"
      letter-spacing="3" fill="#fff9ec" stroke="#080b12" stroke-width="5"
      paint-order="stroke fill">${escapeXml(watermark)}</text>
  </svg>`);
}

mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
await sharp(path.resolve(source))
  .rotate()
  .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
  .composite([{ input: overlay(), top: 0, left: 0 }])
  .webp({ quality: 91, effort: 6, smartSubsample: true })
  .toFile(path.resolve(output));

const metadata = await sharp(path.resolve(output)).metadata();
if (metadata.width !== WIDTH || metadata.height !== HEIGHT || metadata.format !== 'webp') {
  throw new Error(`Rendered cover contract failed: ${metadata.format} ${metadata.width}x${metadata.height}.`);
}
console.log(JSON.stringify({
  output: path.resolve(output),
  width: WIDTH,
  height: HEIGHT,
  ratio: '2:3',
  title,
  watermark,
}, null, 2));
