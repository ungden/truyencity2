/**
 * Rate Limiter - Protect API endpoints from abuse
 *
 * Uses Upstash sliding-window rate limiter when Redis is available (works
 * across Vercel serverless instances).  Falls back to an in-memory token
 * bucket when Redis is not configured.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/redis/upstash';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  tokensPerInterval: number;
  intervalMs: number;
  maxTokens: number;
}

// ---------------------------------------------------------------------------
// Configs
// ---------------------------------------------------------------------------

/** Default configs for different endpoint types */
export const RATE_LIMIT_CONFIGS = {
  /** Standard API endpoints */
  standard: {
    tokensPerInterval: 60,
    intervalMs: 60 * 1000, // 1 minute
    maxTokens: 60,
  },
  /** AI writing endpoints (expensive operations) */
  aiWriting: {
    tokensPerInterval: 10,
    intervalMs: 60 * 1000,
    maxTokens: 10,
  },
  /** External API (Claude Code integration) */
  external: {
    tokensPerInterval: 30,
    intervalMs: 60 * 1000,
    maxTokens: 30,
  },
  /** Auth endpoints (login, register) */
  auth: {
    tokensPerInterval: 5,
    intervalMs: 60 * 1000,
    maxTokens: 5,
  },
  /** Strict rate limit for sensitive operations */
  strict: {
    tokensPerInterval: 3,
    intervalMs: 60 * 1000,
    maxTokens: 3,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

// ---------------------------------------------------------------------------
// Upstash rate limiters (one per config type, lazily created)
// ---------------------------------------------------------------------------

const _upstashLimiters = new Map<RateLimitType, Ratelimit>();

function getUpstashLimiter(type: RateLimitType): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  let limiter = _upstashLimiters.get(type);
  if (limiter) return limiter;

  const cfg = RATE_LIMIT_CONFIGS[type];
  const windowSec = Math.max(1, Math.round(cfg.intervalMs / 1000));

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.maxTokens, `${windowSec} s`),
    prefix: `rl:${type}`,
    analytics: false,
  });

  _upstashLimiters.set(type, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback (original token-bucket implementation)
// ---------------------------------------------------------------------------

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (process.env.NODE_ENV !== 'test' && typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  check(
    identifier: string,
    config: RateLimitConfig = RATE_LIMIT_CONFIGS.standard,
  ): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    let entry = this.store.get(identifier);

    if (!entry) {
      entry = { tokens: config.maxTokens - 1, lastRefill: now };
      this.store.set(identifier, entry);
      return { allowed: true, remaining: entry.tokens, resetIn: config.intervalMs };
    }

    const timePassed = now - entry.lastRefill;
    const refillAmount = Math.floor((timePassed / config.intervalMs) * config.tokensPerInterval);

    if (refillAmount > 0) {
      entry.tokens = Math.min(config.maxTokens, entry.tokens + refillAmount);
      entry.lastRefill = now;
    }

    if (entry.tokens > 0) {
      entry.tokens -= 1;
      this.store.set(identifier, entry);
      return {
        allowed: true,
        remaining: entry.tokens,
        resetIn: config.intervalMs - (now - entry.lastRefill),
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetIn: config.intervalMs - (now - entry.lastRefill),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000;
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.lastRefill > maxAge) this.store.delete(key);
    }
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  getStats(): { totalEntries: number } {
    return { totalEntries: this.store.size };
  }
}

// ---------------------------------------------------------------------------
// Unified RateLimiter class
// ---------------------------------------------------------------------------

class RateLimiter {
  private fallback = new InMemoryRateLimiter();

  /**
   * Check if request should be rate limited.
   *
   * Tries Upstash first; on any failure falls back to in-memory.
   */
  async checkAsync(
    identifier: string,
    type: RateLimitType = 'standard',
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const upstash = getUpstashLimiter(type);

    if (upstash) {
      try {
        const result = await upstash.limit(identifier);
        return {
          allowed: result.success,
          remaining: result.remaining,
          resetIn: result.reset - Date.now(),
        };
      } catch (err) {
        // Redis down — fall through to in-memory
        console.warn('[rate-limiter] Upstash call failed, falling back to in-memory:', err);
      }
    }

    // Fallback: synchronous in-memory check
    return this.fallback.check(identifier, RATE_LIMIT_CONFIGS[type]);
  }

  /**
   * Synchronous check (always uses in-memory).
   * Kept for backward-compatibility with existing callers that cannot await.
   */
  check(
    identifier: string,
    config: RateLimitConfig = RATE_LIMIT_CONFIGS.standard,
  ): { allowed: boolean; remaining: number; resetIn: number } {
    return this.fallback.check(identifier, config);
  }

  reset(identifier: string): void {
    this.fallback.reset(identifier);
  }

  getStats(): { totalEntries: number } {
    return this.fallback.getStats();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// ---------------------------------------------------------------------------
// Helpers (unchanged)
// ---------------------------------------------------------------------------

/** Extract client identifier from request */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/** Create a 429 response */
export function createRateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetIn / 1000)),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Date.now() + resetIn),
      },
    },
  );
}

/** Add rate-limit headers to an existing response */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  resetIn: number,
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Remaining', String(remaining));
  headers.set('X-RateLimit-Reset', String(Date.now() + resetIn));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
