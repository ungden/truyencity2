import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import { PortfolioManifestV1Schema, PortfolioSlotIdV1Schema, type PortfolioManifestV1 } from './portfolio';

const concrete = z.string().trim().min(20);
const named = z.string().trim().min(2);

export const FlagshipStoryPackageV1Schema = z.object({
  schemaVersion: z.literal(1),
  slotId: PortfolioSlotIdV1Schema,
  title: named.max(80),
  tagline: concrete.max(180),
  logline: concrete.max(360),
  catalogueDescription: concrete.max(900),
  protagonistSeed: concrete.max(500),
  settingSeed: concrete.max(500),
  openingHook: concrete.max(500),
  serialPromise: concrete.max(500),
  visualFingerprint: z.string().trim().min(16),
  coverArt: z.object({
    assetPath: z.string().regex(/^\/covers\/flagship-first-30\/[a-z0-9-]+\.webp$/),
    sourceAssetPath: z.string().regex(/^\/covers\/flagship-first-30\/source\/[a-z0-9-]+\.webp$/),
    alt: concrete.max(240),
    imagePrompt: concrete.max(2400),
    renderSpec: z.object({
      width: z.literal(1086),
      height: z.literal(1448),
      title: named.max(80),
      watermark: z.literal('truyencity.com'),
    }).strict(),
  }).strict(),
  status: z.literal('concept_package_ready'),
  storySpecStatus: z.literal('not_materialized'),
  writerIsolation: z.literal(true),
}).strict();

export const FlagshipCatalogueV1Schema = z.object({
  schemaVersion: z.literal(1),
  catalogueId: z.literal('flagship-first-30-catalogue'),
  generatedAt: z.string().datetime(),
  packages: z.array(FlagshipStoryPackageV1Schema).length(30),
}).strict().superRefine((catalogue, ctx) => {
  const unique = (values: string[], pathKey: string, message: string) => {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packages', pathKey], message });
  };
  unique(catalogue.packages.map(item => item.slotId), 'slotId', 'Catalogue slot ids must be unique.');
  unique(catalogue.packages.map(item => item.title.toLocaleLowerCase('vi-VN')), 'title', 'Catalogue titles must be unique.');
  unique(catalogue.packages.map(item => item.visualFingerprint), 'visualFingerprint', 'Every cover must have a distinct visual fingerprint.');
  unique(catalogue.packages.map(item => item.coverArt.assetPath), 'coverArt.assetPath', 'Every cover must have a distinct asset path.');
  unique(catalogue.packages.map(item => item.coverArt.sourceAssetPath), 'coverArt.sourceAssetPath', 'Every cover must have a distinct source asset path.');
  catalogue.packages.forEach((item, index) => {
    if (item.coverArt.renderSpec.title !== item.title) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['packages', index, 'coverArt', 'renderSpec', 'title'], message: 'Cover render title must match the catalogue title exactly.' });
    }
  });
});

export type FlagshipStoryPackageV1 = z.infer<typeof FlagshipStoryPackageV1Schema>;
export type FlagshipCatalogueV1 = z.infer<typeof FlagshipCatalogueV1Schema>;

export function validateFlagshipCatalogue(
  manifestInput: unknown,
  catalogueInput: unknown,
  options: { requireCoverFiles?: boolean; workspaceRoot?: string } = {},
): { manifest: PortfolioManifestV1; catalogue: FlagshipCatalogueV1 } {
  const manifest = PortfolioManifestV1Schema.parse(manifestInput);
  const catalogue = FlagshipCatalogueV1Schema.parse(catalogueInput);
  const expected = manifest.slots.map(slot => slot.slotId).sort();
  const actual = catalogue.packages.map(item => item.slotId).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('Flagship catalogue does not cover the manifest exactly.');
  if (options.requireCoverFiles) {
    const root = options.workspaceRoot || process.cwd();
    const missing = catalogue.packages
      .flatMap(item => [item.coverArt.assetPath, item.coverArt.sourceAssetPath])
      .filter(assetPath => !existsSync(path.join(root, 'public', assetPath.replace(/^\//, ''))));
    if (missing.length) throw new Error(`Flagship catalogue is missing cover assets: ${missing.join(', ')}`);
  }
  return { manifest, catalogue };
}
