/**
 * Read-only catalog check for the two approved Song Xuyên pilot packages.
 *
 *   npm run serial:premises
 *   npm run serial:premises -- --id=cua-hang-cong-phap-tu-tien
 *   npm run serial:premises -- --json
 *
 * This script validates imports through PremiseSchema. It never loads credentials,
 * touches Supabase or calls a model.
 */
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';

const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const selectedId = value('id');
const selected = selectedId
  ? SERIAL_PREMISE_CATALOG.filter(item => item.id === selectedId)
  : SERIAL_PREMISE_CATALOG;

if (selectedId && selected.length === 0) {
  throw new Error(`Unknown premise id "${selectedId}".`);
}
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(selected, null, 2));
} else {
  for (const item of selected) {
    console.log(JSON.stringify({
      priority: item.priority,
      id: item.id,
      title: item.premise.title,
      lane: item.premise.lane,
      payoffStance: item.premise.payoffStance,
      cast: item.premise.castSeed.length,
      evolutionRungs: item.premise.goldenFinger.evolution.length,
      worlds: item.premise.worldKernel.worlds.map(world => world.name),
      progressionSystems: item.premise.worldKernel.progressionSystems.length,
      openingChapters: item.premise.worldKernel.openingContract.map(contract => contract.chapterNumber),
      source: item.sourcePath,
      dryRun: `npm run serial:operator -- seed --premise=${item.sourcePath}`,
    }, null, 2));
  }
}
