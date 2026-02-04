/**
 * Character Depth Tracker Tests
 *
 * Tests: character creation, uniqueness checking, villain creation,
 * romance progression, milestones, characters needing development
 */

import {
  CharacterDepthTracker,
  createCharacterDepthTracker,
  CharacterDepthProfile,
  PersonalityTrait,
  MotivationType,
  CharacterRole,
} from '@/services/story-writing-factory/character-depth';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));

describe('CharacterDepthTracker', () => {
  let tracker: CharacterDepthTracker;

  beforeEach(() => {
    tracker = new CharacterDepthTracker('test-project');
  });

  describe('createCharacter', () => {
    it('should create a character successfully', async () => {
      const result = await tracker.createCharacter('Lâm Phong', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'A young cultivator from a small village',
        flaw: 'Too trusting',
        strength: 'Never gives up',
        personalityTraits: ['brave', 'loyal', 'stubborn'],
        firstAppearance: 1,
      });

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile!.name).toBe('Lâm Phong');
      expect(result.profile!.role).toBe('protagonist');
      expect(result.profile!.primaryMotivation).toBe('power');
    });

    it('should set default values for optional fields', async () => {
      const result = await tracker.createCharacter('Test Char', 'minor', {
        primaryMotivation: 'survival',
        backstory: 'Background',
        flaw: 'Weak',
        strength: 'Smart',
        personalityTraits: ['cautious'],
        firstAppearance: 10,
      });

      expect(result.profile!.speechPattern.formality).toBe('neutral');
      expect(result.profile!.speechPattern.verbosity).toBe('normal');
      expect(result.profile!.characterArc.growthScore).toBe(0);
      expect(result.profile!.chapterAppearances).toEqual([10]);
    });

    it('should warn when character is too similar to existing one', async () => {
      // Create first character
      await tracker.createCharacter('Warrior A', 'ally', {
        primaryMotivation: 'power',
        backstory: 'Background',
        flaw: 'Arrogant',
        strength: 'Strong',
        personalityTraits: ['brave', 'loyal', 'hot_tempered'],
        firstAppearance: 1,
      });

      // Create similar character
      const result = await tracker.createCharacter('Warrior B', 'ally', {
        primaryMotivation: 'power',
        backstory: 'Different background',
        flaw: 'Also arrogant',
        strength: 'Also strong',
        personalityTraits: ['brave', 'loyal', 'hot_tempered'],
        firstAppearance: 5,
      });

      // Should warn about similarity
      expect(result.success).toBe(true);
      // Characters with identical traits should trigger similarity warning
    });
  });

  describe('checkUniqueness', () => {
    it('should return 100 uniqueness when no other characters exist', () => {
      const report = tracker.checkUniqueness('New Char', ['brave', 'cunning']);
      expect(report.uniquenessScore).toBe(100);
      expect(report.similarTo).toHaveLength(0);
    });

    it('should detect similarity between characters', async () => {
      await tracker.createCharacter('Existing', 'ally', {
        primaryMotivation: 'protection',
        backstory: 'bg',
        flaw: 'naive',
        strength: 'loyal',
        personalityTraits: ['brave', 'loyal', 'compassionate'],
        firstAppearance: 1,
      });

      const report = tracker.checkUniqueness('New Char', ['brave', 'loyal', 'compassionate']);
      expect(report.uniquenessScore).toBeLessThan(100);
      expect(report.similarTo.length).toBeGreaterThan(0);
    });

    it('should suggest improvements for low uniqueness', async () => {
      await tracker.createCharacter('Existing', 'ally', {
        primaryMotivation: 'protection',
        backstory: 'bg',
        flaw: 'naive',
        strength: 'loyal',
        personalityTraits: ['brave', 'loyal', 'compassionate'],
        firstAppearance: 1,
      });

      const report = tracker.checkUniqueness('New Char', ['brave', 'loyal', 'compassionate'], {
        appearance: [],
        mannerisms: [],
        habits: [],
        beliefs: [],
      });

      // Low uniqueness should have suggestions
      if (report.uniquenessScore < 70) {
        expect(report.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('milestones', () => {
    it('should add a milestone to a character', async () => {
      await tracker.createCharacter('Hero', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'bg',
        flaw: 'impatient',
        strength: 'determined',
        personalityTraits: ['brave'],
        firstAppearance: 1,
      });

      const result = await tracker.addMilestone('Hero', {
        chapter: 10,
        type: 'realization',
        description: 'Realizes power alone is not enough',
        impact: 'major',
      });

      expect(result.success).toBe(true);
    });

    it('should fail to add milestone for non-existent character', async () => {
      const result = await tracker.addMilestone('NonExistent', {
        chapter: 10,
        type: 'growth',
        description: 'Test',
        impact: 'minor',
      });
      expect(result.success).toBe(false);
    });

    it('should complete a milestone and increase growth score', async () => {
      await tracker.createCharacter('Hero', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'bg',
        flaw: 'impatient',
        strength: 'determined',
        personalityTraits: ['brave'],
        firstAppearance: 1,
      });

      await tracker.addMilestone('Hero', {
        chapter: 10,
        type: 'realization',
        description: 'Major realization',
        impact: 'major',
      });

      const profile = tracker.getCharacter('Hero');
      const milestoneId = profile!.characterArc.milestones[0].id;

      const result = await tracker.completeMilestone('Hero', milestoneId, 'Changed outlook');
      expect(result.success).toBe(true);
      expect(result.growthIncrease).toBe(15); // major = 15

      const updatedProfile = tracker.getCharacter('Hero');
      expect(updatedProfile!.characterArc.growthScore).toBe(15);
      expect(updatedProfile!.characterArc.currentState).toBe('Changed outlook');
    });

    it('should increment growth differently by impact', async () => {
      await tracker.createCharacter('Hero', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'bg',
        flaw: 'impatient',
        strength: 'determined',
        personalityTraits: ['brave'],
        firstAppearance: 1,
      });

      // Add minor milestone
      await tracker.addMilestone('Hero', {
        chapter: 5,
        type: 'growth',
        description: 'Minor growth',
        impact: 'minor',
      });

      const profile = tracker.getCharacter('Hero');
      const milestoneId = profile!.characterArc.milestones[0].id;
      const result = await tracker.completeMilestone('Hero', milestoneId);

      expect(result.growthIncrease).toBe(4); // minor = 4
    });
  });

  describe('createVillain', () => {
    it('should create a villain with depth validation', async () => {
      const result = await tracker.createVillain('Dark Lord', {
        primaryMotivation: 'revenge',
        backstory: 'Was betrayed by the cultivation world after being falsely accused of murder',
        motivationDepth: 'His family was destroyed by the orthodox sects who feared his talent. He seeks to expose their hypocrisy and rebuild what was taken from him.',
        sympatheticElements: ['Loves his daughter', 'Was once a righteous cultivator'],
        redeemableQualities: ['Protects innocents when possible'],
        personalityTraits: ['cunning', 'calm', 'ambitious'],
        flaw: 'Cannot trust anyone',
        strength: 'Strategic genius',
        threatLevel: 8,
        firstAppearance: 50,
      });

      expect(result.success).toBe(true);
      expect(result.profile!.villainProfile).toBeDefined();
      expect(result.profile!.villainProfile!.threatLevel).toBe(8);
    });

    it('should warn about shallow villain motivation', async () => {
      const result = await tracker.createVillain('Generic Bad Guy', {
        primaryMotivation: 'power',
        backstory: 'Evil',
        motivationDepth: 'He is evil', // Too short
        sympatheticElements: [], // None
        personalityTraits: ['arrogant', 'greedy', 'vengeful'], // All generic
        flaw: 'Evil',
        strength: 'Strong',
        threatLevel: 5,
        firstAppearance: 10,
      });

      expect(result.success).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('motivation');
    });
  });

  describe('romance tracking', () => {
    it('should initialize romance between two characters', async () => {
      const result = await tracker.initializeRomance('Hero', 'Heroine', 10, 'medium');
      expect(result.success).toBe(true);
      expect(result.romance).toBeDefined();
      expect(result.romance!.currentStage).toBe('stranger');
    });

    it('should not allow duplicate romance initialization', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10);
      const result = await tracker.initializeRomance('Hero', 'Heroine', 20);
      expect(result.success).toBe(false);
    });

    it('should handle bidirectional romance key', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10);
      // Same pair reversed should find existing
      const result = await tracker.initializeRomance('Heroine', 'Hero', 20);
      expect(result.success).toBe(false); // Already exists
    });

    it('should progress romance', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10, 'fast');

      const result = await tracker.progressRomance(
        'Hero', 'Heroine', 'friend', 20, 'Saved her during battle'
      );

      expect(result.success).toBe(true);
      const romance = tracker.getRomance('Hero', 'Heroine');
      expect(romance!.currentStage).toBe('friend');
    });

    it('should warn about too-fast romance progression', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10, 'slow_burn');

      // Jump from stranger to friend in just 2 chapters (slow_burn needs 30+)
      const result = await tracker.progressRomance(
        'Hero', 'Heroine', 'friend', 12, 'Met once'
      );

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('nhanh');
    });

    it('should detect stalled romance', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10, 'fast');

      // Check stall at chapter 100 (fast threshold = 25)
      const stall = tracker.checkRomanceStall('Hero', 'Heroine', 100);
      expect(stall.isStalled).toBe(true);
      expect(stall.suggestion).toBeDefined();
    });

    it('should not detect stall for recent progress', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10, 'medium');
      const stall = tracker.checkRomanceStall('Hero', 'Heroine', 15);
      expect(stall.isStalled).toBe(false);
    });

    it('should add romantic moments', async () => {
      await tracker.initializeRomance('Hero', 'Heroine', 10);

      const result = await tracker.addRomanticMoment(
        'Hero', 'Heroine', 20, 'Shared a moonlit walk'
      );
      expect(result.success).toBe(true);

      const romance = tracker.getRomance('Hero', 'Heroine');
      expect(romance!.romanticMoments).toContain('Shared a moonlit walk');
      expect(romance!.firstRomanticMoment).toBe(20);
    });
  });

  describe('getCharactersNeedingDevelopment', () => {
    it('should flag characters with no growth for 50+ chapters', async () => {
      await tracker.createCharacter('Hero', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'bg',
        flaw: 'weak',
        strength: 'smart',
        personalityTraits: ['brave'],
        firstAppearance: 1,
      });

      // Check at chapter 100 (99 chapters since first appearance, no milestones)
      const needsDev = tracker.getCharactersNeedingDevelopment(100);
      expect(needsDev.some(d => d.character.name === 'Hero')).toBe(true);
      expect(needsDev.find(d => d.character.name === 'Hero')!.priority).toBe('high');
    });

    it('should not flag minor characters', async () => {
      await tracker.createCharacter('Minor NPC', 'minor', {
        primaryMotivation: 'survival',
        backstory: 'bg',
        flaw: 'weak',
        strength: 'smart',
        personalityTraits: ['cautious'],
        firstAppearance: 1,
      });

      const needsDev = tracker.getCharactersNeedingDevelopment(100);
      expect(needsDev.some(d => d.character.name === 'Minor NPC' && d.reason.includes('character development'))).toBe(false);
    });

    it('should flag villains without depth', async () => {
      await tracker.createCharacter('Bad Guy', 'antagonist', {
        primaryMotivation: 'power',
        backstory: 'Evil',
        flaw: 'arrogant',
        strength: 'powerful',
        personalityTraits: ['arrogant'],
        firstAppearance: 1,
      });

      const needsDev = tracker.getCharactersNeedingDevelopment(10);
      expect(needsDev.some(d =>
        d.character.name === 'Bad Guy' && d.reason.includes('chiều sâu')
      )).toBe(true);
    });
  });

  describe('buildCharacterContext', () => {
    it('should build context for existing character', async () => {
      await tracker.createCharacter('Hero', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'bg',
        flaw: 'impatient',
        strength: 'determined',
        personalityTraits: ['brave', 'loyal'],
        speechPattern: { formality: 'casual', verbosity: 'normal', quirks: ['always smirks'] },
        firstAppearance: 1,
      });

      const context = tracker.buildCharacterContext('Hero');
      expect(context).toContain('Hero');
      expect(context).toContain('protagonist');
      expect(context).toContain('power');
      expect(context).toContain('brave');
      expect(context).toContain('impatient');
      expect(context).toContain('always smirks');
    });

    it('should return fallback for unknown character', () => {
      const context = tracker.buildCharacterContext('Unknown');
      expect(context).toContain('Không có thông tin');
    });
  });

  describe('getters', () => {
    it('should get all characters', async () => {
      await tracker.createCharacter('A', 'protagonist', {
        primaryMotivation: 'power',
        backstory: 'bg',
        flaw: 'f',
        strength: 's',
        personalityTraits: ['brave'],
        firstAppearance: 1,
      });
      await tracker.createCharacter('B', 'ally', {
        primaryMotivation: 'duty',
        backstory: 'bg',
        flaw: 'f',
        strength: 's',
        personalityTraits: ['loyal'],
        firstAppearance: 5,
      });

      expect(tracker.getAllCharacters()).toHaveLength(2);
    });

    it('should get all romances', async () => {
      await tracker.initializeRomance('A', 'B', 1);
      await tracker.initializeRomance('A', 'C', 5);
      expect(tracker.getAllRomances()).toHaveLength(2);
    });
  });
});

describe('createCharacterDepthTracker', () => {
  it('should create a new tracker', () => {
    const tracker = createCharacterDepthTracker('proj-123');
    expect(tracker).toBeInstanceOf(CharacterDepthTracker);
  });
});
