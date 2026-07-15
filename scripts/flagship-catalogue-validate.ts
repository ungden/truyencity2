import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { FLAGSHIP_FIRST_30_MANIFEST } from '../src/services/story-engine/flagship/portfolio-data';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from '../src/services/story-engine/flagship/catalogue-data';
import { validateFlagshipCatalogue } from '../src/services/story-engine/flagship/catalogue';
import { FlagshipLaunchPackV2Schema } from '../src/services/story-engine/flagship/setup-contracts';

const root = process.cwd();
const { catalogue } = validateFlagshipCatalogue(
  FLAGSHIP_FIRST_30_MANIFEST,
  FLAGSHIP_FIRST_30_CATALOGUE_V1,
  { requireCoverFiles: true, workspaceRoot: root },
);

const totalBytes = catalogue.packages.reduce((total, item) => {
  const finalPath = path.join(root, 'public', item.coverArt.assetPath.replace(/^\//, ''));
  const sourcePath = path.join(root, 'public', item.coverArt.sourceAssetPath.replace(/^\//, ''));
  return total + statSync(finalPath).size + statSync(sourcePath).size;
}, 0);

const materializedRoot = path.join(root, 'blueprints/flagship-portfolio-v1/materialized');
const materializedSlots = catalogue.packages.flatMap(item => {
  const launchPath = path.join(materializedRoot, item.slotId.toLowerCase(), 'launch-pack.json');
  if (!existsSync(launchPath)) return [];
  const launchPack = FlagshipLaunchPackV2Schema.parse(JSON.parse(readFileSync(launchPath, 'utf8')));
  if (launchPack.storySpec.title !== item.title) {
    throw new Error(`Materialized title for ${item.slotId} does not match its catalogue cover/title.`);
  }
  return [item.slotId];
});

console.log(JSON.stringify({
  valid: true,
  catalogueId: catalogue.catalogueId,
  packages: catalogue.packages.length,
  sourceIllustrations: catalogue.packages.length,
  renderedCovers: catalogue.packages.length,
  dimensions: '1086x1448',
  watermark: 'truyencity.com',
  totalAssetBytes: totalBytes,
  storySpecsMaterialized: materializedSlots.length,
  materializedSlots,
  catalogueCardsRemaining: catalogue.packages.length - materializedSlots.length,
  productionMutation: false,
}, null, 2));
