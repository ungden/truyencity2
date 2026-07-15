#!/usr/bin/env tsx

/**
 * Verify the rendered flagship cover contract.
 *
 * ImageGen only produces the art-only source.  The final cover is rendered by
 * scripts/render-flagship-covers.ts, which deterministically adds the approved
 * Vietnamese title and truyencity.com watermark.  This check keeps a content
 * hash for both files so a title change cannot silently leave an old cover in
 * the catalogue.
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from '../src/services/story-engine/flagship/catalogue-data';
import { FLAGSHIP_FIRST_30_MANIFEST } from '../src/services/story-engine/flagship/portfolio-data';
import { validateFlagshipCatalogue } from '../src/services/story-engine/flagship/catalogue';

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'blueprints/flagship-portfolio-v1/cover-render-manifest.json');

type CoverEntry = {
  slotId: string;
  title: string;
  watermark: 'truyencity.com';
  width: 1086;
  height: 1448;
  sourceSha256: string;
  renderedSha256: string;
};

type CoverManifest = {
  schemaVersion: 1;
  catalogueId: 'flagship-first-30-catalogue';
  generatedAt: string;
  entries: CoverEntry[];
};

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function assetPath(value: string): string {
  return path.join(ROOT, 'public', value.replace(/^\//, ''));
}

async function buildManifest(): Promise<CoverManifest> {
  const { catalogue } = validateFlagshipCatalogue(FLAGSHIP_FIRST_30_MANIFEST, FLAGSHIP_FIRST_30_CATALOGUE_V1, {
    requireCoverFiles: true,
    workspaceRoot: ROOT,
  });
  const entries: CoverEntry[] = [];

  for (const item of catalogue.packages) {
    const sourcePath = assetPath(item.coverArt.sourceAssetPath);
    const renderedPath = assetPath(item.coverArt.assetPath);
    const source = readFileSync(sourcePath);
    const rendered = readFileSync(renderedPath);
    const metadata = await sharp(rendered).metadata();
    if (metadata.format !== 'webp' || metadata.width !== 1086 || metadata.height !== 1448) {
      throw new Error(`${item.slotId} rendered cover must be WebP 1086x1448; got ${metadata.format} ${metadata.width}x${metadata.height}`);
    }
    const sourceMetadata = await sharp(source).metadata();
    if (sourceMetadata.format !== 'webp' || sourceMetadata.width !== 1086 || sourceMetadata.height !== 1448) {
      throw new Error(`${item.slotId} source illustration must be WebP 1086x1448; got ${sourceMetadata.format} ${sourceMetadata.width}x${sourceMetadata.height}`);
    }
    entries.push({
      slotId: item.slotId,
      title: item.title,
      watermark: item.coverArt.renderSpec.watermark,
      width: item.coverArt.renderSpec.width,
      height: item.coverArt.renderSpec.height,
      sourceSha256: sha256(source),
      renderedSha256: sha256(rendered),
    });
  }

  return {
    schemaVersion: 1,
    catalogueId: catalogue.catalogueId,
    generatedAt: catalogue.generatedAt,
    entries,
  };
}

function compare(expected: CoverManifest, actual: unknown): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error('Cover render manifest is stale. Run `npm run flagship:covers:verify -- --write-manifest` after rendering covers.');
  }
}

async function main(): Promise<void> {
  const expected = await buildManifest();
  if (process.argv.includes('--write-manifest')) {
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(expected, null, 2)}\n`);
    console.log(JSON.stringify({ valid: true, written: MANIFEST_PATH, covers: expected.entries.length }, null, 2));
    return;
  }
  if (!existsSync(MANIFEST_PATH)) throw new Error(`Missing ${MANIFEST_PATH}; run with --write-manifest once.`);
  compare(expected, JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
  console.log(JSON.stringify({ valid: true, covers: expected.entries.length, catalogueId: expected.catalogueId }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
