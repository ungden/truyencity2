/**
 * Cache Service Unit Tests
 */

import { cacheService, CACHE_TTL } from '@/lib/cache/cache-service';

describe('CacheService', () => {
  beforeEach(() => {
    cacheService.clear();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cacheService.set('test-key', { data: 'test' });
      const result = cacheService.get<{ data: string }>('test-key');

      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for missing keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', async () => {
      cacheService.set('expiring-key', 'value', 1); // 1ms TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = cacheService.get('expiring-key');
      expect(result).toBeNull();
    });

    it('should respect custom TTL', () => {
      const customTTL = 1000;
      cacheService.set('custom-ttl', 'value', customTTL);

      const result = cacheService.get('custom-ttl');
      expect(result).toBe('value');
    });
  });

  describe('delete', () => {
    it('should delete specific key', () => {
      cacheService.set('delete-test', 'value');
      cacheService.delete('delete-test');

      expect(cacheService.get('delete-test')).toBeNull();
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', () => {
      cacheService.set('user:1:data', 'data1');
      cacheService.set('user:1:settings', 'settings1');
      cacheService.set('user:2:data', 'data2');

      const deleted = cacheService.deletePattern('user:1');

      expect(deleted).toBe(2);
      expect(cacheService.get('user:1:data')).toBeNull();
      expect(cacheService.get('user:1:settings')).toBeNull();
      expect(cacheService.get('user:2:data')).toBe('data2');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cacheService.set('cached', 'existing');

      const fetcher = jest.fn().mockResolvedValue('new');
      const result = await cacheService.getOrSet('cached', fetcher);

      expect(result).toBe('existing');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result if not exists', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched');
      const result = await cacheService.getOrSet('new-key', fetcher);

      expect(result).toBe('fetched');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cacheService.get('new-key')).toBe('fetched');
    });

    it('should propagate fetcher errors', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(cacheService.getOrSet('error-key', fetcher)).rejects.toThrow('Fetch failed');
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all user-related entries', () => {
      cacheService.set('user_subscription:user-1', 'sub');
      cacheService.set('user_credits:user-1', 'credits');
      cacheService.set('project_list:user-1', 'projects');
      cacheService.set('user_subscription:user-2', 'other');

      cacheService.invalidateUserCache('user-1');

      expect(cacheService.get('user_subscription:user-1')).toBeNull();
      expect(cacheService.get('user_credits:user-1')).toBeNull();
      expect(cacheService.get('project_list:user-1')).toBeNull();
      expect(cacheService.get('user_subscription:user-2')).toBe('other');
    });
  });

  describe('invalidateProjectCache', () => {
    it('should invalidate project-related entries', () => {
      cacheService.set('story_context:proj-1', 'context');
      cacheService.set('chapter_list:proj-1', 'chapters');
      cacheService.set('story_context:proj-2', 'other');

      cacheService.invalidateProjectCache('proj-1');

      expect(cacheService.get('story_context:proj-1')).toBeNull();
      expect(cacheService.get('chapter_list:proj-1')).toBeNull();
      expect(cacheService.get('story_context:proj-2')).toBe('other');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cacheService.set('stat-1', 'value');
      cacheService.set('stat-2', 'value');
      cacheService.get('stat-1'); // hit
      cacheService.get('stat-1'); // hit
      cacheService.get('missing'); // miss

      const stats = cacheService.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset stats', () => {
      cacheService.set('clear-1', 'value');
      cacheService.set('clear-2', 'value');

      cacheService.clear();

      const stats = cacheService.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

describe('CACHE_TTL', () => {
  it('should have expected TTL values', () => {
    expect(CACHE_TTL.storyContext).toBe(5 * 60 * 1000);
    expect(CACHE_TTL.userSubscription).toBe(10 * 60 * 1000);
    expect(CACHE_TTL.tierLimits).toBe(60 * 60 * 1000);
    expect(CACHE_TTL.userCredits).toBe(60 * 1000);
  });
});
