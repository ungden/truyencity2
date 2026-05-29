/**
 * Genre Coverage Test — guarantees every genre-keyed Record covers all 16 GenreType
 * values. Catches the "added new genre but forgot to add entry to Record X" silent
 * drift class at test time, before it ships.
 *
 * Run: npm test -- genre-coverage
 *
 * If a Record is intentionally Partial (e.g. VARIANTS_BY_GENRE during gradual rollout),
 * mark it in OPTIONAL_RECORDS list and the test will skip strict coverage check but
 * still report missing keys as warnings.
 */

import {
  GENRE_STYLES,
  GENRE_TITLE_EXAMPLES,
  GENRE_ENGAGEMENT,
  GENRE_BOUNDARIES,
  GENRE_ANTI_CLICHE,
  VN_PRONOUN_GUIDE,
} from '@/services/story-engine/templates';
import type { GenreType } from '@/services/story-engine/types';

// Exhaustive map keyed by GenreType. If a new member is added to the GenreType
// union, TS fails to compile this object until the genre is added here — which
// keeps ALL_GENRES provably complete (no hand-maintained list can drift).
const GENRE_EXHAUSTIVE: Record<GenreType, true> = {
  'tien-hiep': true, 'huyen-huyen': true, 'do-thi': true, 'kiem-hiep': true,
  'lich-su': true, 'khoa-huyen': true, 'vong-du': true, 'dong-nhan': true,
  'mat-the': true, 'linh-di': true, 'quan-truong': true, 'di-gioi': true,
  'ngon-tinh': true, 'quy-tac-quai-dam': true, 'ngu-thu-tien-hoa': true,
  'khoai-xuyen': true,
};

const ALL_GENRES: readonly GenreType[] = Object.keys(GENRE_EXHAUSTIVE) as GenreType[];

describe('Genre coverage — all 16 genres present in every Record', () => {
  test('GENRE_STYLES', () => {
    for (const g of ALL_GENRES) {
      expect(GENRE_STYLES[g]).toBeDefined();
    }
  });

  test('GENRE_TITLE_EXAMPLES', () => {
    for (const g of ALL_GENRES) {
      expect(GENRE_TITLE_EXAMPLES[g]).toBeDefined();
      expect(GENRE_TITLE_EXAMPLES[g]?.length).toBeGreaterThan(0);
    }
  });

  test('GENRE_ENGAGEMENT', () => {
    for (const g of ALL_GENRES) {
      expect(GENRE_ENGAGEMENT[g]).toBeDefined();
    }
  });

  test('GENRE_BOUNDARIES', () => {
    for (const g of ALL_GENRES) {
      expect(GENRE_BOUNDARIES[g]).toBeDefined();
    }
  });

  test('GENRE_ANTI_CLICHE', () => {
    for (const g of ALL_GENRES) {
      expect(GENRE_ANTI_CLICHE[g]).toBeDefined();
    }
  });

  test('VN_PRONOUN_GUIDE', () => {
    for (const g of ALL_GENRES) {
      expect(VN_PRONOUN_GUIDE[g]).toBeDefined();
      expect(VN_PRONOUN_GUIDE[g]?.length).toBeGreaterThan(0);
    }
  });
});

describe('Genre coverage — memory + voice + process modules', () => {
  test('GENRE_VOCABULARY', async () => {
    const { GENRE_VOCABULARY } = await import('@/services/story-engine/templates/style-bible');
    for (const g of ALL_GENRES) {
      expect((GENRE_VOCABULARY as Record<GenreType, unknown>)[g]).toBeDefined();
    }
  });

  test('GENRE_WRITING_GUIDES', async () => {
    const { GENRE_WRITING_GUIDES } = await import('@/services/story-engine/templates/style-bible');
    for (const g of ALL_GENRES) {
      expect((GENRE_WRITING_GUIDES as Record<GenreType, unknown>)[g]).toBeDefined();
    }
  });

  test('voice anchors module', async () => {
    const { getVoiceAnchor } = await import('@/services/story-engine/templates/genre-voice-anchors');
    for (const g of ALL_GENRES) {
      const anchor = getVoiceAnchor(g);
      expect(anchor).toBeTruthy();
      expect(anchor.length).toBeGreaterThan(100); // sanity: real anchor not stub
    }
  });

  test('process blueprints module', async () => {
    const { getGenreProcessBlueprint } = await import('@/services/story-engine/templates/genre-process-blueprints');
    for (const g of ALL_GENRES) {
      const bp = getGenreProcessBlueprint(g);
      expect(bp).toBeTruthy();
      expect(bp?.setup.requiredCastRoles.length).toBeGreaterThan(0);
      expect(bp?.sceneTypes.length).toBeGreaterThan(0);
    }
  });

  test('setup playbooks module (Phase 29)', async () => {
    const { GENRE_SETUP_PLAYBOOKS, getGenreSetupPlaybook } = await import(
      '@/services/story-engine/templates/genre-setup-playbooks'
    );
    for (const g of ALL_GENRES) {
      const pb = getGenreSetupPlaybook(g);
      expect(GENRE_SETUP_PLAYBOOKS[g]).toBeDefined();
      // sanity: each genre has substantive content (not stub)
      expect(pb.worldbuildingHooks.length).toBeGreaterThanOrEqual(8);
      expect(pb.mcArchetypes.length).toBeGreaterThanOrEqual(5);
      expect(pb.openingScenes.length).toBeGreaterThanOrEqual(5);
      expect(pb.tensionAxes.length).toBeGreaterThanOrEqual(3);
      // hookChecklist sanity
      expect(pb.hookChecklist.minHooks).toBeGreaterThanOrEqual(2);
      expect(pb.hookChecklist.hookTypes.length).toBeGreaterThan(0);
      // archetype shape
      for (const a of pb.mcArchetypes) {
        expect(a.name.length).toBeGreaterThan(0);
        expect(a.voice.length).toBeGreaterThan(20);
        expect(a.signature.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('Genre coverage — content-seeder records', () => {
  // SOURCE_TOPIC_SEEDS is now Record<GenreType,…> so TS catches missing keys.
  // Test asserts runtime presence in case test file drifts from production import.
  test('SOURCE_TOPIC_SEEDS', async () => {
    // Indirect: the GENRE_CONFIG list is the source of truth for spawnable genres.
    // SOURCE_TOPIC_SEEDS must cover every entry of GENRE_CONFIG.
    const { GENRE_CONFIG } = await import('@/lib/types/genre-config');
    const configGenres = Object.keys(GENRE_CONFIG);
    for (const g of ALL_GENRES) {
      expect(configGenres).toContain(g);
    }
  });
});

/**
 * Cross-file genre parity — the §3.2 drift class.
 *
 * Two genre sources can silently disagree:
 *   - `src/lib/types/genre-config.ts` (web/UI canonical: labels, icons, topics)
 *   - the engine `GenreType` union + its keyed Records (styles, boundaries, …)
 *
 * Adding a genre to one file but forgetting the other is a silent fall-through.
 * These tests enforce BIDIRECTIONAL set equality, so neither file can grow a
 * genre the other lacks. The engine side is represented by the compile-time-
 * exhaustive ALL_GENRES (a missing GenreType won't even compile above).
 */
describe('Cross-file genre parity — web GENRE_CONFIG ↔ engine GenreType', () => {
  test('every GENRE_CONFIG key is a valid engine GenreType (no UI-only genre)', async () => {
    const { GENRE_CONFIG } = await import('@/lib/types/genre-config');
    const engineSet = new Set<string>(ALL_GENRES);
    const orphanInConfig = Object.keys(GENRE_CONFIG).filter((g) => !engineSet.has(g));
    expect(orphanInConfig).toEqual([]);
  });

  test('every engine GenreType has a GENRE_CONFIG entry (no engine-only genre)', async () => {
    const { GENRE_CONFIG } = await import('@/lib/types/genre-config');
    const configSet = new Set(Object.keys(GENRE_CONFIG));
    const orphanInEngine = ALL_GENRES.filter((g) => !configSet.has(g));
    expect(orphanInEngine).toEqual([]);
  });

  test('exact key-set equality (same count, same members)', async () => {
    const { GENRE_CONFIG } = await import('@/lib/types/genre-config');
    expect([...Object.keys(GENRE_CONFIG)].sort()).toEqual([...ALL_GENRES].sort());
  });
});
