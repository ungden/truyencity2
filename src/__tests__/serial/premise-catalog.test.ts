import { readFileSync } from 'node:fs';
import { PremiseSchema } from '@/services/serial/contracts';
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';

describe('Song Xuyên premise catalog', () => {
  test('contains exactly ten unique, ranked premises and keeps the selected pilots first', () => {
    expect(SERIAL_PREMISE_CATALOG).toHaveLength(10);
    expect(SERIAL_PREMISE_CATALOG.map(item => item.priority)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(SERIAL_PREMISE_CATALOG.map(item => item.id)).size).toBe(10);
    expect(new Set(SERIAL_PREMISE_CATALOG.map(item => item.premise.title)).size).toBe(10);
    expect(SERIAL_PREMISE_CATALOG.slice(0, 3).map(item => item.id)).toEqual([
      'phe-dan-thuc-tinh', 'hang-ma-phap-khi', 'tiep-van-cuu-chin-thanh',
    ]);
  });

  test('every source file is the exact schema-valid premise exposed in the catalog', () => {
    for (const item of SERIAL_PREMISE_CATALOG) {
      const source = PremiseSchema.parse(JSON.parse(readFileSync(item.sourcePath, 'utf8')));
      expect(item.premise).toEqual(source);
      expect(item.sourcePath).toMatch(/^factory\/serial\/song-xuyen\/\d{2}-[a-z0-9-]+\.json$/);
      expect(item.startLocationId).toMatch(/^[a-z0-9_]{2,48}$/);
    }
  });

  test('each premise has one protagonist, two opponent classes and a six-rung evolving advantage', () => {
    for (const { premise } of SERIAL_PREMISE_CATALOG) {
      expect(premise.castSeed.filter(member => member.role === 'protagonist')).toHaveLength(1);
      const opponentClasses = new Set(
        premise.castSeed.filter(member => member.role === 'antagonist').map(member => member.antagonistClass),
      );
      expect(opponentClasses.size).toBeGreaterThanOrEqual(2);
      expect(premise.goldenFinger.evolution.length).toBeGreaterThanOrEqual(6);
      expect(premise.goldenFinger.evolution.length).toBeLessThanOrEqual(8);
      expect(premise.tierLadder.length).toBeGreaterThanOrEqual(6);
      expect(new Set(premise.goldenFinger.evolution.map(rung => rung.changesUse)).size)
        .toBe(premise.goldenFinger.evolution.length);
    }
  });

  test('catalog metadata makes the chapter-one payoff and closed two-world economy reviewable', () => {
    for (const item of SERIAL_PREMISE_CATALOG) {
      expect(item.chapterOneProof.length).toBeGreaterThan(70);
      expect(item.modernBuyer.length).toBeGreaterThan(30);
      expect(item.otherworldBuyer.length).toBeGreaterThan(30);
      expect(item.otherworldCapitalUse.length).toBeGreaterThan(30);
      expect(item.premise.hiddenThread.length).toBeGreaterThan(80);
      expect(Object.keys(item.premise.conflictLadder)).toEqual(['survival', 'rules', 'ideology', 'self']);
    }
  });

  test('titles are direct Faloo-sized packages rather than short literary names', () => {
    for (const { premise } of SERIAL_PREMISE_CATALOG) {
      const words = premise.title.trim().split(/\s+/);
      expect(words.length).toBeGreaterThanOrEqual(7);
      expect(words.length).toBeLessThanOrEqual(26);
      expect(premise.title).toMatch(/:/);
    }
  });
});
