import { PremiseSchema, type Premise } from './contracts';

import congPhap from '../../../factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json';
import rauTuoi from '../../../factory/serial/song-xuyen/02-rau-tuoi-doi-ai.json';
import cardProfession from '../../../factory/serial/lanes/card-profession.json';
import clanLegacy from '../../../factory/serial/lanes/clan-legacy.json';
import beastTaming from '../../../factory/serial/lanes/beast-taming.json';
import ruleHorror from '../../../factory/serial/lanes/rule-horror.json';

/** One immutable approval package: commercial premise plus its complete World Kernel. */
export interface SerialPremiseCatalogEntry {
  id: string;
  priority: number;
  sourcePath: string;
  premise: Premise;
}

const entry = (
  metadata: Omit<SerialPremiseCatalogEntry, 'premise'>,
  candidate: unknown,
): SerialPremiseCatalogEntry => ({ ...metadata, premise: PremiseSchema.parse(candidate) });

/** Review-only catalog. Listing or validating it never seeds data or calls a model. */
export const SERIAL_PREMISE_CATALOG: SerialPremiseCatalogEntry[] = [
  entry({
    id: 'cua-hang-cong-phap-tu-tien',
    priority: 1,
    sourcePath: 'factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json',
  }, congPhap),
  entry({
    id: 'rau-tuoi-doi-ai',
    priority: 2,
    sourcePath: 'factory/serial/song-xuyen/02-rau-tuoi-doi-ai.json',
  }, rauTuoi),
  // Faloo lanes measured 2026-09-24 (docs/FALOO_TRENDS_2026-09-24.md), ordered by signal strength.
  entry({ id: 'card-profession', priority: 3, sourcePath: 'factory/serial/lanes/card-profession.json' }, cardProfession),
  entry({ id: 'clan-legacy', priority: 4, sourcePath: 'factory/serial/lanes/clan-legacy.json' }, clanLegacy),
  entry({ id: 'beast-taming', priority: 5, sourcePath: 'factory/serial/lanes/beast-taming.json' }, beastTaming),
  entry({ id: 'rule-horror', priority: 6, sourcePath: 'factory/serial/lanes/rule-horror.json' }, ruleHorror),
];
