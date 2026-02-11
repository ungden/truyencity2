/**
 * Cache Service - In-memory caching with TTL
 *
 * Provides caching for:
 * - Story context (expensive to compute)
 * - User subscriptions
 * - Tier limits
 * - Frequently accessed data
 *
 * For production scale, replace with Redis
 */

import { logger } from '@/lib/security/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  storyContext: 5 * 60 * 1000, // 5 minutes
  userSubscription: 10 * 60 * 1000, // 10 minutes
  tierLimits: 60 * 60 * 1000, // 1 hour (rarely changes)
  userCredits: 60 * 1000, // 1 minute (changes frequently)
  projectList: 2 * 60 * 1000, // 2 minutes
  chapterList: 5 * 60 * 1000, // 5 minutes
  default: 5 * 60 * 1000, // 5 minutes
} as const;

export type CacheKey =
  | `story_context:${string}`
  | `user_subscription:${string}`
  | `tier_limits`
  | `user_credits:${string}`
  | `project_list:${string}`
  | `chapter_list:${string}`
  | string;

class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private maxSize: number = 1000; // Maximum cache entries

  constructor() {
    // Cleanup expired entries every minute
    if (process.env.NODE_ENV !== 'test' && typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: CacheKey): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: CacheKey, value: T, ttl?: number): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.getTTLForKey(key));

    this.cache.set(key, {
      value,
      expiresAt,
      hits: 0,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: CacheKey): void {
    this.cache.delete(key);
  }

  /**
   * Delete all entries matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fetcher();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Cache fetch failed', error as Error, { key });
      throw error;
    }
  }

  /**
   * Invalidate user-related cache entries
   */
  invalidateUserCache(userId: string): void {
    this.deletePattern(`user_subscription:${userId}`);
    this.deletePattern(`user_credits:${userId}`);
    this.deletePattern(`project_list:${userId}`);
  }

  /**
   * Invalidate project-related cache entries
   */
  invalidateProjectCache(projectId: string): void {
    this.deletePattern(`story_context:${projectId}`);
    this.deletePattern(`chapter_list:${projectId}`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(
    fetchers: Array<{ key: CacheKey; fetcher: () => Promise<unknown>; ttl?: number }>
  ): Promise<void> {
    await Promise.allSettled(
      fetchers.map(async ({ key, fetcher, ttl }) => {
        try {
          const value = await fetcher();
          this.set(key, value, ttl);
        } catch (error) {
          logger.error('Cache warmup failed', error as Error, { key });
        }
      })
    );
  }

  /**
   * Get TTL based on key pattern
   */
  private getTTLForKey(key: string): number {
    if (key.startsWith('story_context:')) return CACHE_TTL.storyContext;
    if (key.startsWith('user_subscription:')) return CACHE_TTL.userSubscription;
    if (key === 'tier_limits') return CACHE_TTL.tierLimits;
    if (key.startsWith('user_credits:')) return CACHE_TTL.userCredits;
    if (key.startsWith('project_list:')) return CACHE_TTL.projectList;
    if (key.startsWith('chapter_list:')) return CACHE_TTL.chapterList;
    return CACHE_TTL.default;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      logger.debug('Cache cleanup', { expired, remaining: this.cache.size });
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    // Find entry with lowest hits
    let minHits = Infinity;
    let minKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }

    if (minKey) {
      this.cache.delete(minKey);
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Singleton instance
export const cacheService = new CacheService();

/**
 * Cache decorator for async functions
 */
export function cached<T>(
  keyFn: (...args: unknown[]) => CacheKey,
  ttl?: number
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyFn(...args);
      return cacheService.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}
