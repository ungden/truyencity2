#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

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
const projectId = value('--project-id');
const novelId = value('--novel-id');
const coverUrl = value('--cover-url');
const apply = args.includes('--apply');
if (!source || !output || !title) throw new Error('--source, --output and --title are required.');
if (watermark !== 'truyencity.com') throw new Error('Flagship v3 watermark must be exactly truyencity.com.');
if (apply && (!projectId || !novelId || !coverUrl)) throw new Error('--apply requires --project-id, --novel-id and --cover-url.');

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

async function main(): Promise<void> {
  mkdirSync(path.dirname(path.resolve(output!)), { recursive: true });
  await sharp(path.resolve(source!))
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .composite([{ input: overlay(), top: 0, left: 0 }])
    .webp({ quality: 91, effort: 6, smartSubsample: true })
    .toFile(path.resolve(output!));

  const metadata = await sharp(path.resolve(output!)).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT || metadata.format !== 'webp') {
    throw new Error(`Rendered cover contract failed: ${metadata.format} ${metadata.width}x${metadata.height}.`);
  }
  const sourceSha256 = createHash('sha256').update(readFileSync(path.resolve(source!))).digest('hex');
  const renderedSha256 = createHash('sha256').update(readFileSync(path.resolve(output!))).digest('hex');
  const manifest = {
    output: path.resolve(output!),
    width: WIDTH,
    height: HEIGHT,
    ratio: '2:3',
    title,
    watermark,
    sourceSha256,
    renderedSha256,
    rendererVersion: 'flagship-cover-v3.1-deterministic-type',
    approved: true,
  };
  console.log(JSON.stringify({ dryRun: !apply, ...manifest }, null, 2));
  if (!apply) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is missing.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: project, error: projectError } = await db.from('ai_story_projects')
    .select('id,novel_id,novels!ai_story_projects_novel_id_fkey(title)').eq('id', projectId!).single();
  if (projectError || !project || project.novel_id !== novelId) throw new Error(projectError?.message || 'Project/novel mismatch.');
  const linked = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  if (linked?.title !== title) throw new Error(`Cover title mismatch: database=${linked?.title}, renderer=${title}.`);
  const { error: coverError } = await db.from('story_cover_manifests_v3').upsert({
    project_id: projectId,
    novel_id: novelId,
    cover_url: coverUrl,
    title,
    watermark,
    width: WIDTH,
    height: HEIGHT,
    source_sha256: sourceSha256,
    rendered_sha256: renderedSha256,
    renderer_version: manifest.rendererVersion,
    approved: true,
    verified_at: new Date().toISOString(),
  });
  if (coverError) throw coverError;
  const { error: novelError } = await db.from('novels').update({ cover_url: coverUrl }).eq('id', novelId!);
  if (novelError) throw novelError;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
