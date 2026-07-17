#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.runtime' });
dotenv.config();

const apply = process.argv.includes('--apply');
const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, 'blueprints/flagship-portfolio-v1/cover-render-manifest.json'), 'utf8')) as {
  entries: Array<{ slotId: string; title: string; watermark: string; width: number; height: number; sourceSha256: string; renderedSha256: string }>;
};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main(): Promise<void> {
  const { data: projects, error } = await db.from('ai_story_projects')
    .select('id,novel_id,style_directives,novels!ai_story_projects_novel_id_fkey(title,cover_url)')
    .not('style_directives->>portfolio_slot_id', 'is', null);
  if (error) throw error;
  const bySlot = new Map((projects || []).map(project => [(project.style_directives as { portfolio_slot_id?: string }).portfolio_slot_id, project]));
  const rows = [];
  for (const entry of manifest.entries) {
    const project = bySlot.get(entry.slotId);
    if (!project) throw new Error(`Missing project for ${entry.slotId}.`);
    const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
    const slot = entry.slotId.toLowerCase();
    const source = readFileSync(path.join(root, `public/covers/flagship-first-30/source/${slot}.webp`));
    const rendered = readFileSync(path.join(root, `public/covers/flagship-first-30/${slot}.webp`));
    const metadata = await sharp(rendered).metadata();
    const sourceSha = createHash('sha256').update(source).digest('hex');
    const renderedSha = createHash('sha256').update(rendered).digest('hex');
    if (novel?.title !== entry.title || novel.cover_url !== `https://www.truyencity.com/covers/flagship-first-30/${slot}.webp`
      || metadata.width !== 1200 || metadata.height !== 1800 || entry.watermark !== 'truyencity.com'
      || sourceSha !== entry.sourceSha256 || renderedSha !== entry.renderedSha256) {
      throw new Error(`Cover manifest mismatch for ${entry.slotId}.`);
    }
    rows.push({
      project_id: project.id, novel_id: project.novel_id, cover_url: novel.cover_url,
      title: entry.title, watermark: entry.watermark, width: 1200, height: 1800,
      source_sha256: sourceSha, rendered_sha256: renderedSha,
      renderer_version: 'flagship-cover-v3.1-deterministic-2x3', approved: true,
      verified_at: new Date().toISOString(),
    });
  }
  console.log(JSON.stringify({ dryRun: !apply, verified: rows.length, ratio: '2:3' }, null, 2));
  if (!apply) return;
  const { error: upsertError } = await db.from('story_cover_manifests_v3').upsert(rows, { onConflict: 'project_id' });
  if (upsertError) throw upsertError;
  console.log(JSON.stringify({ imported: rows.length }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
