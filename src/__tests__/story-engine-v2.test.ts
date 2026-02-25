/**
 * Story Engine v2 Integration Tests
 * 
 * Tests the 3-agent pipeline and 4-layer context system.
 */

import type { SceneOutline, ChapterOutline, ContextPayload } from '@/services/story-engine/types';
import { getEnhancedStyleBible } from '@/services/story-engine/memory/style-bible';
import { titleChecker } from '@/services/story-engine/memory/title-checker';
import { shouldBeFinaleArc } from '@/services/story-engine/memory/summary-manager';

describe('Story Engine v2', () => {
  describe('Types', () => {
    it('should have correct SceneOutline with pov field', () => {
      const scene: SceneOutline = {
        order: 1,
        setting: 'Test location',
        characters: ['MC'],
        goal: 'Test goal',
        conflict: 'Test conflict',
        resolution: 'Test resolution',
        estimatedWords: 500,
        pov: 'MC',
      };
      expect(scene.pov).toBe('MC');
    });

    it('should have ChapterOutline with emotionalArc field', () => {
      const outline: ChapterOutline = {
        chapterNumber: 1,
        title: 'Test',
        summary: 'Test summary',
        pov: 'MC',
        location: 'Test',
        scenes: [],
        tensionLevel: 5,
        dopaminePoints: [],
        emotionalArc: {
          opening: 'curiosity',
          midpoint: 'tension',
          climax: 'excitement',
          closing: 'anticipation',
        },
        cliffhanger: 'Test cliffhanger',
        targetWordCount: 2800,
      };
      expect(outline.emotionalArc?.opening).toBe('curiosity');
    });

    it('should have ContextPayload with synopsisStructured and arcPlanThreads', () => {
      const payload: ContextPayload = {
        hasStoryBible: false,
        recentChapters: [],
        previousTitles: [],
        recentOpenings: [],
        recentCliffhangers: [],
        knownCharacterNames: ['MC', 'Ally1', 'Enemy1'],
        synopsisStructured: {
          mc_current_state: 'Training',
          active_allies: ['Ally1'],
          active_enemies: ['Enemy1'],
          open_threads: ['Thread1'],
        },
        arcPlanThreads: {
          threads_to_advance: ['Thread1'],
          threads_to_resolve: [],
          new_threads: ['Thread2'],
        },
      };
      expect(payload.synopsisStructured?.mc_current_state).toBe('Training');
      expect(payload.arcPlanThreads?.threads_to_advance).toContain('Thread1');
    });
  });

  describe('Style Bible', () => {
    it('should have pacing rules for all scene types', () => {
      const style = getEnhancedStyleBible('tien-hiep');
      
      expect(style.pacingRules).toBeDefined();
      expect(style.pacingRules.action).toBeDefined();
      expect(style.pacingRules.cultivation).toBeDefined();
      expect(style.pacingRules.dialogue).toBeDefined();
      expect(style.pacingRules.tension).toBeDefined();
    });

    it('should have vocabulary guide', () => {
      const style = getEnhancedStyleBible('tien-hiep');
      
      expect(style.vocabulary).toBeDefined();
      expect(style.vocabulary.emotions).toBeDefined();
      expect(style.vocabulary.honorifics).toBeDefined();
    });
  });

  describe('Title Checker', () => {
    it('should detect similar titles', () => {
      const result = titleChecker.findMostSimilar('Huyết Chiến Vạn Thú Sơn', [
        'Huyết Chiến Vạn Thú Sơn',
        'Đại Náo Vạn Bảo Lâu',
      ]);
      
      expect(result.similarity).toBe(1); // Exact match
      expect(result.mostSimilar).toBe('Huyết Chiến Vạn Thú Sơn');
    });

    it('should detect low similarity for different titles', () => {
      const result = titleChecker.findMostSimilar('Hoàn Toàn Khác Biệt', [
        'Huyết Chiến Vạn Thú Sơn',
        'Đại Náo Vạn Bảo Lâu',
      ]);
      
      expect(result.similarity).toBeLessThan(0.5);
    });
  });

  describe('Summary Manager', () => {
    it('should detect finale arc correctly', () => {
      // Near end
      expect(shouldBeFinaleArc(990, 1000)).toBe(true);
      
      // 95% progress
      expect(shouldBeFinaleArc(950, 1000)).toBe(true);
      
      // 85% with few threads
      expect(shouldBeFinaleArc(850, 1000, ['Thread1'])).toBe(true);
      
      // Mid story
      expect(shouldBeFinaleArc(500, 1000)).toBe(false);
    });
  });
});
