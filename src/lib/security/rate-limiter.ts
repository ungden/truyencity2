/**
 * Rate Limiter - Protect API endpoints from abuse
 *
 * Implements token bucket algorithm with in-memory storage
 * For production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  tokensPerInterval: number;
  intervalMs: number;
  maxTokens: number;
}

// Default configs for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Standard API endpoints
  standard: {
    tokensPerInterval: 60,
    intervalMs: 60 * 1000, // 1 minute
    maxTokens: 60,
  },
  // AI writing endpoints (expensive operations)
  aiWriting: {
    tokensPerInterval: 10,
    intervalMs: 60 * 1000, // 1 minute
    maxTokens: 10,
  },
  // External API (Claude Code integration)
  external: {
    tokensPerInterval: 30,
    intervalMs: 60 * 1000, // 1 minute
    maxTokens: 30,
  },
  // Auth endpoints (login, register)
  auth: {
    tokensPerInterval: 5,
    intervalMs: 60 * 1000, // 1 minute
    maxTokens: 5,
  },
  // Strict rate limit for sensitive operations
  strict: {
    tokensPerInterval: 3,
    intervalMs: 60 * 1000, // 1 minute
    maxTokens: 3,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    if (process.env.NODE_ENV !== 'test' && typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Check if request should be rate limited
   * @returns { allowed: boolean, remaining: number, resetIn: number }
   */
  check(
    identifier: string,
    config: RateLimitConfig = RATE_LIMIT_CONFIGS.standard
  ): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const key = identifier;

    let entry = this.store.get(key);

    if (!entry) {
      // First request - initialize with full tokens
      entry = {
        tokens: config.maxTokens - 1, // Consume one token
        lastRefill: now,
      };
      this.store.set(key, entry);
      return { allowed: true, remaining: entry.tokens, resetIn: config.intervalMs };
    }

    // Calculate token refill
    const timePassed = now - entry.lastRefill;
    const refillAmount = Math.floor((timePassed / config.intervalMs) * config.tokensPerInterval);

    if (refillAmount > 0) {
      entry.tokens = Math.min(config.maxTokens, entry.tokens + refillAmount);
      entry.lastRefill = now;
    }

    // Check if we have tokens available
    if (entry.tokens > 0) {
      entry.tokens -= 1;
      this.store.set(key, entry);
      return {
        allowed: true,
        remaining: entry.tokens,
        resetIn: config.intervalMs - (now - entry.lastRefill),
      };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetIn: config.intervalMs - (now - entry.lastRefill),
    };
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.lastRefill > maxAge) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get current stats (for debugging)
   */
  getStats(): { totalEntries: number } {
    return { totalEntries: this.store.size };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Helper to get client identifier from request
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  // Prefer user ID if available
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Create rate limit response
 */
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
    }
  );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  resetIn: number
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
