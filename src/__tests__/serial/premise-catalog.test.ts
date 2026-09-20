import { readFileSync, readdirSync } from 'node:fs';
import { PremiseSchema } from '@/services/serial/contracts';
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';

describe('Song Xuyên production packages', () => {
  test('catalog and source directory contain exactly the two selected pilots', () => {
    expect(SERIAL_PREMISE_CATALOG.map(item => item.id)).toEqual([
      'cua-hang-cong-phap-tu-tien', 'rau-tuoi-doi-ai',
    ]);
    expect(SERIAL_PREMISE_CATALOG.map(item => item.priority)).toEqual([1, 2]);
    expect(readdirSync('factory/serial/song-xuyen').filter(file => file.endsWith('.json'))).toEqual([
      '01-cua-hang-cong-phap-tu-tien.json', '02-rau-tuoi-doi-ai.json',
    ]);
  });

  test('every source file is the exact schema-valid v2 package exposed in catalog', () => {
    for (const item of SERIAL_PREMISE_CATALOG) {
      const source = PremiseSchema.parse(JSON.parse(readFileSync(item.sourcePath, 'utf8')));
      expect(item.premise).toEqual(source);
      expect(source.schemaVersion).toBe(2);
      expect(source.presentation.coverPath).toMatch(/^\/covers\/serial-pilots\/.+\.webp$/);
      expect(source.presentation.sellingPoints).toHaveLength(4);
      expect(source.worldKernel.worlds).toHaveLength(2);
      expect(source.worldKernel.openingContract.map(contract => contract.chapterNumber)).toEqual([1, 2, 3, 4]);
    }
  });

  test('all canon references resolve and cast have named upward paths', () => {
    for (const { premise } of SERIAL_PREMISE_CATALOG) {
      const locations = new Set(premise.worldKernel.worlds.flatMap(world => world.locations.map(location => location.id)));
      const systems = new Map(premise.worldKernel.progressionSystems.map(system => [system.id, system]));
      for (const member of premise.castSeed) {
        expect(locations.has(member.startLocationId)).toBe(true);
        expect(member.milestones.length).toBeGreaterThanOrEqual(3);
        for (const state of member.startingProgressions) {
          const system = systems.get(state.systemId)!;
          expect(system.ranks.some(rank => rank.id === state.rankId)).toBe(true);
        }
      }
      expect(premise.voiceSheet.reactionRule).toMatch(/gọi đúng|đúng tên/);
      expect(premise.voiceSheet.reactionRule).toMatch(/đặt hàng|hợp đồng|tranh mua/);
    }
  });

  test('opening contract always names rank, visible result, expert reaction and next trade', () => {
    for (const { premise } of SERIAL_PREMISE_CATALOG) {
      for (const chapter of premise.worldKernel.openingContract) {
        expect(chapter.namedLevelOrGrade.length).toBeGreaterThan(10);
        expect(chapter.visibleResult.length).toBeGreaterThan(20);
        expect(chapter.witnessReaction.length).toBeGreaterThan(20);
        expect(chapter.commercialAction.length).toBeGreaterThan(20);
      }
      expect(premise.blurb).not.toMatch(/thi triều|biến người[^.]{0,30}zombie/i);
      expect(premise.blurb).toMatch(/bán|đổi|giao dịch/i);
    }
  });

  test('titles are direct Faloo-sized packages', () => {
    for (const { premise } of SERIAL_PREMISE_CATALOG) {
      expect(premise.title).toMatch(/:/);
      expect(premise.title.trim().split(/\s+/).length).toBeGreaterThanOrEqual(7);
    }
  });
});
