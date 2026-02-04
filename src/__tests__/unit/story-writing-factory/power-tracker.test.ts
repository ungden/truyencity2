/**
 * Power Tracker Tests
 *
 * Tests: initialization, power state management, breakthrough validation,
 * skill learning, item acquisition, enemy scaling, battle context
 */

import {
  PowerTracker,
  createPowerTracker,
  PowerState,
  ProgressionEvent,
} from '@/services/story-writing-factory/power-tracker';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: null })),
          eq: jest.fn(() => Promise.resolve({ data: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

describe('PowerTracker', () => {
  let tracker: PowerTracker;

  beforeEach(() => {
    tracker = new PowerTracker('test-project');
  });

  describe('initialization', () => {
    it('should create with default cultivation realms', () => {
      expect(tracker).toBeDefined();
      expect(tracker.getPowerSystem().length).toBeGreaterThan(0);
    });

    it('should accept custom power system', () => {
      const customRealms = [
        { name: 'Level 1', rank: 1, subLevels: 10, description: 'Beginner', abilities: ['Basic'], breakthroughDifficulty: 'easy' as const },
        { name: 'Level 2', rank: 2, subLevels: 10, description: 'Advanced', abilities: ['Advanced'], breakthroughDifficulty: 'medium' as const },
      ];
      const customTracker = new PowerTracker('proj', customRealms);
      expect(customTracker.getPowerSystem()).toEqual(customRealms);
    });
  });

  describe('character power state', () => {
    it('should return undefined for unknown character', () => {
      const state = tracker.getPowerState('Unknown Character');
      expect(state).toBeUndefined();
    });

    it('should initialize character with defaults', async () => {
      const state = await tracker.initializeCharacter('Hero');
      expect(state.characterName).toBe('Hero');
      expect(state.realm).toBe('Luyện Khí'); // First realm
      expect(state.level).toBe(1);
      expect(state.abilities).toEqual([]);
      expect(state.items).toEqual([]);
      expect(state.totalBreakthroughs).toBe(0);
    });

    it('should initialize character with custom realm/level', async () => {
      const state = await tracker.initializeCharacter('Elder', 'Kim Đan', 5);
      expect(state.realm).toBe('Kim Đan');
      expect(state.level).toBe(5);
    });

    it('should retrieve initialized character', async () => {
      await tracker.initializeCharacter('Hero', 'Trúc Cơ', 2);
      const state = tracker.getPowerState('Hero');
      expect(state).toBeDefined();
      expect(state!.realm).toBe('Trúc Cơ');
      expect(state!.level).toBe(2);
    });
  });

  describe('validateBreakthrough', () => {
    it('should validate reasonable breakthrough', async () => {
      await tracker.initializeCharacter('Hero', 'Luyện Khí', 9);

      const validation = tracker.validateBreakthrough('Hero', 'Trúc Cơ', 1, 50);
      expect(validation.isValid).toBe(true);
    });

    it('should reject skipping realms', async () => {
      await tracker.initializeCharacter('Hero', 'Luyện Khí', 9);

      // Jump from Luyện Khí to Kim Đan (skip Trúc Cơ)
      const validation = tracker.validateBreakthrough('Hero', 'Kim Đan', 1, 50);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('bỏ qua'))).toBe(true);
    });

    it('should warn about too-fast breakthrough', async () => {
      const state = await tracker.initializeCharacter('Hero', 'Luyện Khí', 9);
      state.lastBreakthroughChapter = 48; // Just 2 chapters ago

      const validation = tracker.validateBreakthrough('Hero', 'Trúc Cơ', 1, 50);
      expect(validation.warnings.some(w => w.includes('quá nhanh'))).toBe(true);
    });

    it('should warn about unknown character', () => {
      const validation = tracker.validateBreakthrough('Unknown', 'Luyện Khí', 1, 10);
      expect(validation.warnings.some(w => w.includes('chưa có'))).toBe(true);
    });

    it('should handle invalid realm names', async () => {
      await tracker.initializeCharacter('Hero', 'Luyện Khí', 1);
      const validation = tracker.validateBreakthrough('Hero', 'NonExistentRealm', 1, 50);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('recordBreakthrough', () => {
    it('should record a valid breakthrough', async () => {
      await tracker.initializeCharacter('Hero', 'Luyện Khí', 9);

      const result = await tracker.recordBreakthrough('Hero', 50, 'Trúc Cơ', 1, 'Meditation insight');
      expect(result.success).toBe(true);

      const state = tracker.getPowerState('Hero');
      expect(state!.realm).toBe('Trúc Cơ');
      expect(state!.level).toBe(1);
      expect(state!.totalBreakthroughs).toBe(1);
      expect(state!.lastBreakthroughChapter).toBe(50);
    });

    it('should reject invalid breakthrough', async () => {
      await tracker.initializeCharacter('Hero', 'Luyện Khí', 1);

      // Try to skip to Kim Đan
      const result = await tracker.recordBreakthrough('Hero', 10, 'Kim Đan', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('recordSkillLearned', () => {
    it('should record a new skill', async () => {
      await tracker.initializeCharacter('Hero');

      const result = await tracker.recordSkillLearned('Hero', 10, 'Flame Sword Technique');
      expect(result.success).toBe(true);

      const state = tracker.getPowerState('Hero');
      expect(state!.abilities).toContain('Flame Sword Technique');
    });

    it('should reject duplicate skill', async () => {
      await tracker.initializeCharacter('Hero');

      await tracker.recordSkillLearned('Hero', 10, 'Basic Slash');
      const result = await tracker.recordSkillLearned('Hero', 20, 'Basic Slash');
      expect(result.success).toBe(false);
    });
  });

  describe('recordItemAcquired', () => {
    it('should record item acquisition', async () => {
      await tracker.initializeCharacter('Hero');

      const result = await tracker.recordItemAcquired('Hero', 20, {
        name: 'Spirit Sword',
        type: 'weapon',
        grade: 'Mid',
      });

      expect(result.success).toBe(true);
      const state = tracker.getPowerState('Hero');
      expect(state!.items.length).toBe(1);
      expect(state!.items[0].name).toBe('Spirit Sword');
      expect(state!.items[0].acquiredChapter).toBe(20);
    });
  });

  describe('getProgressionSummary', () => {
    it('should return fallback for unknown character', () => {
      const summary = tracker.getProgressionSummary('Unknown');
      expect(summary).toContain('Chưa có thông tin');
    });

    it('should return formatted summary', async () => {
      await tracker.initializeCharacter('Hero', 'Kim Đan', 3);
      await tracker.recordSkillLearned('Hero', 10, 'Basic Attack');

      const summary = tracker.getProgressionSummary('Hero');
      expect(summary).toContain('Hero');
      expect(summary).toContain('Kim Đan');
      expect(summary).toContain('Kỹ năng: 1');
    });
  });

  describe('parsePowerLevel', () => {
    it('should parse realm + level correctly', () => {
      const level1 = tracker.parsePowerLevel('Luyện Khí 5');
      const level2 = tracker.parsePowerLevel('Kim Đan 3');

      expect(level2).toBeGreaterThan(level1);
    });

    it('should handle string without number', () => {
      const level = tracker.parsePowerLevel('Luyện Khí');
      expect(level).toBeGreaterThan(0);
    });

    it('should return base value for unknown realm', () => {
      const level = tracker.parsePowerLevel('Unknown Realm 5');
      expect(level).toBe(5); // Just sub-level, no realm base
    });
  });

  describe('validateEnemyScaling', () => {
    it('should flag impossible win against much stronger enemy', async () => {
      await tracker.initializeCharacter('Hero', 'Luyện Khí', 3);

      const result = tracker.validateEnemyScaling('Hero', 'Kim Đan 5', 'clean_victory', 10);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('không hợp lý'))).toBe(true);
    });

    it('should accept reasonable outcome for power gap', async () => {
      await tracker.initializeCharacter('Hero', 'Kim Đan', 3);

      const result = tracker.validateEnemyScaling('Hero', 'Kim Đan 5', 'narrow_escape', 100);
      // 2 level gap with narrow_escape is fine
      expect(result.issues.filter(i => i.includes('không hợp lý'))).toHaveLength(0);
    });

    it('should handle unknown protagonist gracefully', () => {
      const result = tracker.validateEnemyScaling('Unknown', 'Luyện Khí 1', 'clean_victory', 1);
      expect(result.valid).toBe(true); // No protagonist state = can't validate
    });
  });

  describe('getBattleContext', () => {
    it('should generate battle context string', async () => {
      await tracker.initializeCharacter('Hero', 'Kim Đan', 3);

      const context = tracker.getBattleContext('Hero', 'Nguyên Anh 1', 100);
      expect(context).toContain('Battle Power Context');
      expect(context).toContain('Kim Đan');
      expect(context).toContain('Power Gap');
    });

    it('should handle unknown protagonist', () => {
      const context = tracker.getBattleContext('Unknown', 'Luyện Khí 1', 1);
      expect(context).toContain('not found');
    });
  });

  describe('getExpectedRealm', () => {
    it('should return early realm for early chapter', () => {
      const expected = tracker.getExpectedRealm(10, 2000);
      expect(expected.realm).toBe('Luyện Khí');
    });

    it('should return later realm for later chapter', () => {
      const expected = tracker.getExpectedRealm(1800, 2000);
      // Should be near the end of the power system
      expect(expected.realm).not.toBe('Luyện Khí');
    });
  });

  describe('getAllPowerStates', () => {
    it('should return all initialized characters', async () => {
      await tracker.initializeCharacter('A', 'Luyện Khí', 1);
      await tracker.initializeCharacter('B', 'Trúc Cơ', 2);

      const states = tracker.getAllPowerStates();
      expect(states).toHaveLength(2);
    });
  });
});

describe('createPowerTracker', () => {
  it('should create a new tracker instance', () => {
    const tracker = createPowerTracker('proj-123');
    expect(tracker).toBeInstanceOf(PowerTracker);
  });
});
