/**
 * Cache Service Unit Tests
 *
 * Uses the synchronous in-memory methods (getSync/setSync) since
 * tests run without Redis configured.
 */

import { cacheService, CACHE_TTL } from '@/lib/cache/cache-service';

describe('CacheService', () => {
  beforeEach(() => {
    cacheService.clear();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cacheService.setSync('test-key', { data: 'test' });
      const result = cacheService.getSync<{ data: string }>('test-key');

      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for missing keys', () => {
      const result = cacheService.getSync('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', async () => {
      cacheService.setSync('expiring-key', 'value', 1); // 1ms TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = cacheService.getSync('expiring-key');
      expect(result).toBeNull();
    });

    it('should respect custom TTL', () => {
      const customTTL = 1000;
      cacheService.setSync('custom-ttl', 'value', customTTL);

      const result = cacheService.getSync('custom-ttl');
      expect(result).toBe('value');
    });
  });

  describe('delete', () => {
    it('should delete specific key', async () => {
      cacheService.setSync('delete-test', 'value');
      await cacheService.delete('delete-test');

      expect(cacheService.getSync('delete-test')).toBeNull();
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', () => {
      cacheService.setSync('user:1:data', 'data1');
      cacheService.setSync('user:1:settings', 'settings1');
      cacheService.setSync('user:2:data', 'data2');

      const deleted = cacheService.deletePattern('user:1');

      expect(deleted).toBe(2);
      expect(cacheService.getSync('user:1:data')).toBeNull();
      expect(cacheService.getSync('user:1:settings')).toBeNull();
      expect(cacheService.getSync('user:2:data')).toBe('data2');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cacheService.setSync('cached', 'existing');

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
      expect(cacheService.getSync('new-key')).toBe('fetched');
    });

    it('should propagate fetcher errors', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(cacheService.getOrSet('error-key', fetcher)).rejects.toThrow('Fetch failed');
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all user-related entries', () => {
      cacheService.setSync('user_subscription:user-1', 'sub');
      cacheService.setSync('user_credits:user-1', 'credits');
      cacheService.setSync('project_list:user-1', 'projects');
      cacheService.setSync('user_subscription:user-2', 'other');

      cacheService.invalidateUserCache('user-1');

      expect(cacheService.getSync('user_subscription:user-1')).toBeNull();
      expect(cacheService.getSync('user_credits:user-1')).toBeNull();
      expect(cacheService.getSync('project_list:user-1')).toBeNull();
      expect(cacheService.getSync('user_subscription:user-2')).toBe('other');
    });
  });

  describe('invalidateProjectCache', () => {
    it('should invalidate project-related entries', () => {
      cacheService.setSync('story_context:proj-1', 'context');
      cacheService.setSync('chapter_list:proj-1', 'chapters');
      cacheService.setSync('story_context:proj-2', 'other');

      cacheService.invalidateProjectCache('proj-1');

      expect(cacheService.getSync('story_context:proj-1')).toBeNull();
      expect(cacheService.getSync('chapter_list:proj-1')).toBeNull();
      expect(cacheService.getSync('story_context:proj-2')).toBe('other');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cacheService.setSync('stat-1', 'value');
      cacheService.setSync('stat-2', 'value');
      cacheService.getSync('stat-1'); // hit
      cacheService.getSync('stat-1'); // hit
      cacheService.getSync('missing'); // miss

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
      cacheService.setSync('clear-1', 'value');
      cacheService.setSync('clear-2', 'value');

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
