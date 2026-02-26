/**
 * Cache Service - Redis-backed caching with in-memory fallback
 *
 * Provides caching for:
 * - Story context (expensive to compute)
 * - User subscriptions
 * - Tier limits
 * - Frequently accessed data
 *
 * Uses Upstash Redis when available (works across Vercel serverless instances),
 * otherwise falls back to a per-instance in-memory Map.
 */

import { logger } from '@/lib/security/logger';
import { getRedis } from '@/lib/redis/upstash';

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

const REDIS_PREFIX = 'cache:';

class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private maxSize: number = 1000; // Maximum in-memory cache entries

  constructor() {
    // Cleanup expired in-memory entries every minute
    if (process.env.NODE_ENV !== 'test' && typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanupMemory(), 60 * 1000);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get value from cache (Redis first, then in-memory)
   */
  async get<T>(key: CacheKey): Promise<T | null> {
    // Try Redis
    const redis = getRedis();
    if (redis) {
      try {
        const raw = await redis.get<T>(REDIS_PREFIX + key);
        if (raw !== null && raw !== undefined) {
          this.stats.hits++;
          return raw;
        }
        this.stats.misses++;
        return null;
      } catch (err) {
        logger.warn('Redis GET failed, falling back to memory', { key, error: String(err) });
      }
    }

    // Fallback: in-memory
    return this.getMemory<T>(key);
  }

  /**
   * Synchronous in-memory get (for callers that cannot await)
   */
  getSync<T>(key: CacheKey): T | null {
    return this.getMemory<T>(key);
  }

  /**
   * Set value in cache (writes to Redis AND in-memory)
   */
  async set<T>(key: CacheKey, value: T, ttl?: number): Promise<void> {
    const ttlMs = ttl || this.getTTLForKey(key);

    // Write to Redis (fire-and-forget, non-fatal)
    const redis = getRedis();
    if (redis) {
      try {
        const ttlSec = Math.max(1, Math.round(ttlMs / 1000));
        await redis.set(REDIS_PREFIX + key, value, { ex: ttlSec });
      } catch (err) {
        logger.warn('Redis SET failed', { key, error: String(err) });
      }
    }

    // Always write to in-memory as well (local fast path)
    this.setMemory(key, value, ttlMs);
  }

  /**
   * Synchronous in-memory set (for callers that cannot await)
   */
  setSync<T>(key: CacheKey, value: T, ttl?: number): void {
    this.setMemory(key, value, ttl || this.getTTLForKey(key));
  }

  /**
   * Delete value from cache
   */
  async delete(key: CacheKey): Promise<void> {
    this.memoryCache.delete(key);

    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(REDIS_PREFIX + key);
      } catch (err) {
        logger.warn('Redis DEL failed', { key, error: String(err) });
      }
    }
  }

  /**
   * Delete all entries matching a pattern (in-memory only — Redis SCAN avoided for simplicity)
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
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
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    try {
      const value = await fetcher();
      await this.set(key, value, ttl);
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
   * Clear entire in-memory cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.memoryCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(
    fetchers: Array<{ key: CacheKey; fetcher: () => Promise<unknown>; ttl?: number }>,
  ): Promise<void> {
    await Promise.allSettled(
      fetchers.map(async ({ key, fetcher, ttl }) => {
        try {
          const value = await fetcher();
          await this.set(key, value, ttl);
        } catch (error) {
          logger.error('Cache warmup failed', error as Error, { key });
        }
      }),
    );
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.memoryCache.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }
    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  private setMemory<T>(key: string, value: T, ttlMs: number): void {
    if (this.memoryCache.size >= this.maxSize) this.evictLRU();
    this.memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs, hits: 0 });
  }

  private getTTLForKey(key: string): number {
    if (key.startsWith('story_context:')) return CACHE_TTL.storyContext;
    if (key.startsWith('user_subscription:')) return CACHE_TTL.userSubscription;
    if (key === 'tier_limits') return CACHE_TTL.tierLimits;
    if (key.startsWith('user_credits:')) return CACHE_TTL.userCredits;
    if (key.startsWith('project_list:')) return CACHE_TTL.projectList;
    if (key.startsWith('chapter_list:')) return CACHE_TTL.chapterList;
    return CACHE_TTL.default;
  }

  private cleanupMemory(): void {
    const now = Date.now();
    let expired = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        expired++;
      }
    }
    if (expired > 0) {
      logger.debug('Cache cleanup', { expired, remaining: this.memoryCache.size });
    }
  }

  private evictLRU(): void {
    let minHits = Infinity;
    let minKey: string | null = null;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }
    if (minKey) this.memoryCache.delete(minKey);
  }
}

// Singleton instance
export const cacheService = new CacheService();

/**
 * Cache decorator for async functions
 */
export function cached<T>(
  keyFn: (...args: unknown[]) => CacheKey,
  ttl?: number,
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyFn(...args);
      return cacheService.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}
