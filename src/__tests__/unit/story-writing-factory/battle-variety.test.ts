/**
 * Battle Variety Tracker Tests
 *
 * Tests: variety scoring, enemy scaling validation, battle recording,
 * variety reports, battle context building
 */

import {
  BattleVarietyTracker,
  createBattleVarietyTracker,
  BATTLE_TEMPLATES,
  BattleType,
  TacticalApproach,
  CombatElement,
  BattleOutcome,
  BattleRecord,
} from '@/services/story-writing-factory/battle-variety';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

describe('BattleVarietyTracker', () => {
  let tracker: BattleVarietyTracker;

  beforeEach(() => {
    tracker = new BattleVarietyTracker('test-project-id');
  });

  describe('analyzeBattle', () => {
    it('should return base score for first battle', () => {
      const result = tracker.analyzeBattle(
        'duel',
        'brute_force',
        ['skill_clash', 'technique_counter', 'power_reveal'],
        1
      );

      expect(result.varietyScore).toBeGreaterThanOrEqual(0);
      expect(result.varietyScore).toBeLessThanOrEqual(100);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should penalize insufficient combat elements', () => {
      // duel requires minElements: 3, giving only 1
      const result = tracker.analyzeBattle(
        'duel',
        'brute_force',
        ['skill_clash'],
        1
      );

      expect(result.issues.some(i => i.includes('Thiếu combat elements'))).toBe(true);
      expect(result.varietyScore).toBeLessThan(70);
    });

    it('should not penalize when enough elements provided', () => {
      const result = tracker.analyzeBattle(
        'duel',
        'outsmart',
        ['skill_clash', 'technique_counter', 'power_reveal', 'hidden_card'],
        1
      );

      expect(result.issues.filter(i => i.includes('Thiếu'))).toHaveLength(0);
    });

    it('should suggest unused elements', () => {
      const result = tracker.analyzeBattle(
        'boss_fight',
        'attrition',
        ['skill_clash'],
        1
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('validateEnemyScaling', () => {
    it('should flag impossible wins against much stronger enemies', () => {
      const result = tracker.validateEnemyScaling(
        'Luyện Khí 3',
        'Kim Đan 5',
        'clean_victory',
        50,
        2000
      );

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should accept reasonable power gap with victory', () => {
      const result = tracker.validateEnemyScaling(
        'Kim Đan 3',
        'Kim Đan 5',
        'pyrrhic_victory',
        100,
        2000
      );

      // 2 level gap is reasonable for a pyrrhic victory
      expect(result.issues.filter(i => i.includes('không hợp lý')).length).toBe(0);
    });

    it('should flag MC losing to much weaker enemies without reason', () => {
      const result = tracker.validateEnemyScaling(
        'Nguyên Anh 5',
        'Luyện Khí 3',
        'defeat_recovery',
        500,
        2000
      );

      expect(result.issues.some(i => i.includes('MC mạnh hơn nhiều'))).toBe(true);
    });

    it('should accept draws and narrow escapes against stronger foes', () => {
      const result = tracker.validateEnemyScaling(
        'Trúc Cơ 1',
        'Kim Đan 1',
        'narrow_escape',
        50,
        2000
      );

      // Narrow escape against stronger enemy is fine
      expect(result.issues.filter(i => i.includes('không hợp lý')).length).toBe(0);
    });
  });

  describe('recordBattle', () => {
    it('should record a battle and track it internally', async () => {
      await tracker.recordBattle({
        chapterNumber: 10,
        battleType: 'duel',
        tacticalApproach: 'outsmart',
        outcome: 'clean_victory',
        protagonistPowerLevel: 'Luyện Khí 5',
        enemyPowerLevel: 'Luyện Khí 3',
        enemyType: 'rival',
        elementsUsed: ['skill_clash', 'technique_counter'],
        wordCount: 2000,
        duration: 'medium',
        varietyScore: 75,
        issues: [],
      });

      // After recording, analyzeBattle should know about the recent battle
      const analysis = tracker.analyzeBattle('duel', 'outsmart', ['skill_clash'], 15);
      // The tracker should have prior data now
      expect(analysis).toBeDefined();
    });
  });

  describe('getVarietyReport', () => {
    it('should return empty report when no battles recorded', () => {
      const report = tracker.getVarietyReport();
      expect(report.totalBattles).toBe(0);
      expect(report.avgVarietyScore).toBe(70); // Default
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should generate report with recorded battles', async () => {
      // Record several battles
      for (let i = 0; i < 5; i++) {
        await tracker.recordBattle({
          chapterNumber: i * 10 + 1,
          battleType: 'duel',
          tacticalApproach: 'brute_force',
          outcome: 'clean_victory',
          protagonistPowerLevel: 'Luyện Khí 5',
          enemyPowerLevel: 'Luyện Khí 3',
          enemyType: 'rival',
          elementsUsed: ['skill_clash'],
          wordCount: 1500,
          duration: 'medium',
          varietyScore: 60,
          issues: [],
        });
      }

      const report = tracker.getVarietyReport();
      expect(report.totalBattles).toBe(5);
      expect(report.typeDistribution.duel).toBe(5);
      expect(report.approachDistribution.brute_force).toBe(5);
      expect(report.overusedTypes).toContain('duel');
      // MC wins all 5 = >80% win rate
      expect(report.recommendations.some(r => r.includes('MC thắng quá nhiều'))).toBe(true);
    });
  });

  describe('buildBattleContext', () => {
    it('should build context string for a battle type', () => {
      const context = tracker.buildBattleContext('boss_fight', 100);
      expect(context).toContain('boss_fight');
      expect(context).toContain('Min elements needed');
      expect(context).toContain('Suggested elements');
    });
  });
});

describe('BATTLE_TEMPLATES', () => {
  it('should have all expected battle types', () => {
    const expectedTypes: BattleType[] = [
      'duel', 'group_fight', 'ambush', 'defense', 'siege',
      'tournament', 'assassination', 'chase', 'escape',
      'boss_fight', 'minion_wave', 'surprise_attack',
    ];

    for (const type of expectedTypes) {
      expect(BATTLE_TEMPLATES[type]).toBeDefined();
      expect(BATTLE_TEMPLATES[type].minElements).toBeGreaterThan(0);
      expect(BATTLE_TEMPLATES[type].suggestedElements.length).toBeGreaterThan(0);
      expect(BATTLE_TEMPLATES[type].suggestedApproaches.length).toBeGreaterThan(0);
    }
  });

  it('should have reasonable word count ranges', () => {
    for (const [type, template] of Object.entries(BATTLE_TEMPLATES)) {
      expect(template.typicalLength.min).toBeLessThan(template.typicalLength.max);
      expect(template.typicalLength.min).toBeGreaterThan(0);
    }
  });
});

describe('createBattleVarietyTracker', () => {
  it('should create a new tracker instance', () => {
    const tracker = createBattleVarietyTracker('project-123');
    expect(tracker).toBeInstanceOf(BattleVarietyTracker);
  });
});
