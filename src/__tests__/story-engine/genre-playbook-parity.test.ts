/**
 * Genre Playbook Parity Test — Quality Overhaul 3.5
 *
 * Guards GENRE_SETUP_PLAYBOOKS against thin-genre drift: every one of the 16
 * genre playbooks must meet the TIEN_HIEP-level parity floors:
 *   - worldbuildingHooks >= 10
 *   - mcArchetypes      >= 5
 *   - openingScenes     >= 5
 *   - tensionAxes       >= 4
 *
 * Also enforces content hygiene:
 *   - no duplicate hook strings within a genre
 *   - every archetype has non-empty voice + signature and >= 2 antiPatterns
 *   - every opening scene has a non-empty antiPattern (warm-baseline DNA guard)
 *
 * Run: npx jest genre-playbook-parity
 */

import { GENRE_SETUP_PLAYBOOKS } from '@/services/story-engine/templates/genre-setup-playbooks';
import type { GenreType } from '@/services/story-engine/types';

// Exhaustive map keyed by GenreType — if a new genre is added to the union,
// TS fails to compile until it's added here AND to GENRE_SETUP_PLAYBOOKS.
const GENRE_EXHAUSTIVE: Record<GenreType, true> = {
  'tien-hiep': true, 'huyen-huyen': true, 'do-thi': true, 'kiem-hiep': true,
  'lich-su': true, 'khoa-huyen': true, 'vong-du': true, 'dong-nhan': true,
  'mat-the': true, 'linh-di': true, 'quan-truong': true, 'di-gioi': true,
  'ngon-tinh': true, 'quy-tac-quai-dam': true, 'ngu-thu-tien-hoa': true,
  'khoai-xuyen': true,
};

const ALL_GENRES: readonly GenreType[] = Object.keys(GENRE_EXHAUSTIVE) as GenreType[];

const MIN_HOOKS = 10;
const MIN_ARCHETYPES = 5;
const MIN_OPENING_SCENES = 5;
const MIN_TENSION_AXES = 4;
const MIN_ANTI_PATTERNS = 2;

describe('Genre setup playbook parity — all 16 genres meet TIEN_HIEP floors', () => {
  test('registry covers every GenreType', () => {
    for (const g of ALL_GENRES) {
      expect(GENRE_SETUP_PLAYBOOKS[g]).toBeDefined();
    }
    // No extra/unknown keys either
    expect(Object.keys(GENRE_SETUP_PLAYBOOKS).sort()).toEqual([...ALL_GENRES].sort());
  });

  describe.each(ALL_GENRES.map(g => [g] as const))('%s', (genre) => {
    const pb = GENRE_SETUP_PLAYBOOKS[genre];

    test(`worldbuildingHooks >= ${MIN_HOOKS}`, () => {
      expect(pb.worldbuildingHooks.length).toBeGreaterThanOrEqual(MIN_HOOKS);
    });

    test(`mcArchetypes >= ${MIN_ARCHETYPES}`, () => {
      expect(pb.mcArchetypes.length).toBeGreaterThanOrEqual(MIN_ARCHETYPES);
    });

    test(`openingScenes >= ${MIN_OPENING_SCENES}`, () => {
      expect(pb.openingScenes.length).toBeGreaterThanOrEqual(MIN_OPENING_SCENES);
    });

    test(`tensionAxes >= ${MIN_TENSION_AXES}`, () => {
      expect(pb.tensionAxes.length).toBeGreaterThanOrEqual(MIN_TENSION_AXES);
    });

    test('no duplicate hook strings', () => {
      const seen = new Set<string>();
      for (const hook of pb.worldbuildingHooks) {
        expect(seen.has(hook)).toBe(false);
        seen.add(hook);
      }
    });

    test('hooks are non-empty strings', () => {
      for (const hook of pb.worldbuildingHooks) {
        expect(hook.trim().length).toBeGreaterThan(0);
      }
    });

    test(`every archetype has non-empty voice/signature and >= ${MIN_ANTI_PATTERNS} antiPatterns`, () => {
      for (const arch of pb.mcArchetypes) {
        expect(arch.name.trim().length).toBeGreaterThan(0);
        expect(arch.voice.trim().length).toBeGreaterThan(0);
        expect(arch.signature.trim().length).toBeGreaterThan(0);
        expect(arch.antiPatterns.length).toBeGreaterThanOrEqual(MIN_ANTI_PATTERNS);
        for (const ap of arch.antiPatterns) {
          expect(ap.trim().length).toBeGreaterThan(0);
        }
        // antiPatterns within an archetype must be distinct
        expect(new Set(arch.antiPatterns).size).toBe(arch.antiPatterns.length);
      }
    });

    test('archetype names are unique within the genre', () => {
      const names = pb.mcArchetypes.map(a => a.name);
      expect(new Set(names).size).toBe(names.length);
    });

    test('every opening scene has scenario + hook + non-empty antiPattern (warm-baseline guard)', () => {
      for (const scene of pb.openingScenes) {
        expect(scene.scenario.trim().length).toBeGreaterThan(0);
        expect(scene.hook.trim().length).toBeGreaterThan(0);
        expect(scene.antiPattern.trim().length).toBeGreaterThan(0);
      }
    });

    test('every tension axis has name + description + arcShape', () => {
      for (const axis of pb.tensionAxes) {
        expect(axis.name.trim().length).toBeGreaterThan(0);
        expect(axis.description.trim().length).toBeGreaterThan(0);
        expect(axis.arcShape.trim().length).toBeGreaterThan(0);
      }
    });

    test('hookChecklist is sane', () => {
      expect(pb.hookChecklist.minHooks).toBeGreaterThanOrEqual(1);
      expect(pb.hookChecklist.hookTypes.length).toBeGreaterThan(0);
    });
  });
});
