#!/usr/bin/env tsx

import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from '../src/services/story-engine/flagship/catalogue-data';

const ROOT = path.resolve(__dirname, '..');
const requested = new Set(process.argv.slice(2).map(value => value.toUpperCase()));

function publicPath(assetPath: string): string {
  return path.join(ROOT, 'public', assetPath.replace(/^\//, ''));
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);
}

function wrapTitle(title: string, maxCharacters = 19): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxCharacters) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function typographySvg(width: number, height: number, title: string, watermark: string): Buffer {
  const lines = wrapTitle(title);
  const longest = Math.max(...lines.map(line => line.length));
  const fontSize = lines.length >= 3 ? 70 : longest >= 18 ? 78 : 88;
  const lineHeight = Math.round(fontSize * 1.08);
  const titleBlockHeight = lines.length * lineHeight;
  const firstBaseline = Math.round(50 + (320 - titleBlockHeight) / 2 + fontSize * 0.82);
  const tspans = lines.map((line, index) => `<tspan x="${width / 2}" y="${firstBaseline + index * lineHeight}">${escapeXml(line)}</tspan>`).join('');

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="titleShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#111923" stop-opacity="0.88"/>
          <stop offset="0.68" stop-color="#111923" stop-opacity="0.46"/>
          <stop offset="1" stop-color="#111923" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="500" fill="url(#titleShade)"/>
      <text text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="#F4EBDD" stroke="#111923" stroke-width="9" paint-order="stroke fill" stroke-linejoin="round">${tspans}</text>
      <text x="${width / 2}" y="${height - 34}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30" letter-spacing="2" fill="#F4EBDD" stroke="#111923" stroke-width="4" paint-order="stroke fill">${escapeXml(watermark)}</text>
    </svg>
  `);
}

const packages = FLAGSHIP_FIRST_30_CATALOGUE_V1.packages.filter(item => !requested.size || requested.has(item.slotId));
if (!packages.length) throw new Error('No catalogue slots matched the requested ids.');

async function main(): Promise<void> {
  for (const item of packages) {
    const source = publicPath(item.coverArt.sourceAssetPath);
    const target = publicPath(item.coverArt.assetPath);
    const { width, height, title, watermark } = item.coverArt.renderSpec;
    if (!existsSync(source)) throw new Error(`Missing source illustration for ${item.slotId}: ${source}`);
    mkdirSync(path.dirname(target), { recursive: true });

    await sharp(source)
      .rotate()
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .composite([{ input: typographySvg(width, height, title, watermark), top: 0, left: 0 }])
      .webp({ quality: 90, effort: 6, smartSubsample: true })
      .toFile(target);

    process.stdout.write(`${item.slotId} ${width}x${height} ${target}\n`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
