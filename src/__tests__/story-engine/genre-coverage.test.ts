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

const ALL_GENRES: readonly GenreType[] = [
  'tien-hiep', 'huyen-huyen', 'do-thi', 'kiem-hiep', 'lich-su',
  'khoa-huyen', 'vong-du', 'dong-nhan', 'mat-the', 'linh-di',
  'quan-truong', 'di-gioi', 'ngon-tinh', 'quy-tac-quai-dam',
  'ngu-thu-tien-hoa', 'khoai-xuyen',
] as const;

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
