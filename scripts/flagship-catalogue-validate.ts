import { statSync } from 'fs';
import path from 'path';
import { FLAGSHIP_FIRST_30_MANIFEST } from '../src/services/story-engine/flagship/portfolio-data';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from '../src/services/story-engine/flagship/catalogue-data';
import { validateFlagshipCatalogue } from '../src/services/story-engine/flagship/catalogue';

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

console.log(JSON.stringify({
  valid: true,
  catalogueId: catalogue.catalogueId,
  packages: catalogue.packages.length,
  sourceIllustrations: catalogue.packages.length,
  renderedCovers: catalogue.packages.length,
  dimensions: '1086x1448',
  watermark: 'truyencity.com',
  totalAssetBytes: totalBytes,
  storySpecsMaterialized: 0,
  productionMutation: false,
}, null, 2));
