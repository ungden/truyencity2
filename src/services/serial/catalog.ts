import { PremiseSchema, type Premise } from './contracts';

import congPhap from '../../../factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json';
import rauTuoi from '../../../factory/serial/song-xuyen/02-rau-tuoi-doi-ai.json';

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
];
