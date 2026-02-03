/**
 * Rate Limiter Unit Tests
 */

import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
} from '@/lib/security/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Reset rate limiter state between tests
    rateLimiter.reset('test-client');
  });

  describe('check', () => {
    it('should allow first request', () => {
      const result = rateLimiter.check('test-client', RATE_LIMIT_CONFIGS.standard);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
    });

    it('should track remaining tokens', () => {
      const config = { tokensPerInterval: 5, intervalMs: 60000, maxTokens: 5 };

      rateLimiter.check('test-client-2', config);
      rateLimiter.check('test-client-2', config);
      const result = rateLimiter.check('test-client-2', config);

      expect(result.remaining).toBe(2); // 5 - 3
    });

    it('should block when tokens exhausted', () => {
      const config = { tokensPerInterval: 2, intervalMs: 60000, maxTokens: 2 };

      rateLimiter.check('test-client-3', config); // 1 token left
      rateLimiter.check('test-client-3', config); // 0 tokens left
      const result = rateLimiter.check('test-client-3', config); // blocked

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should include reset time', () => {
      const result = rateLimiter.check('test-client-4', RATE_LIMIT_CONFIGS.standard);

      expect(result.resetIn).toBeGreaterThan(0);
      expect(result.resetIn).toBeLessThanOrEqual(60000);
    });
  });

  describe('reset', () => {
    it('should reset client rate limit', () => {
      const config = { tokensPerInterval: 1, intervalMs: 60000, maxTokens: 1 };

      rateLimiter.check('test-client-5', config); // Use the token
      rateLimiter.reset('test-client-5');
      const result = rateLimiter.check('test-client-5', config);

      expect(result.allowed).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      rateLimiter.check('stats-test', RATE_LIMIT_CONFIGS.standard);
      const stats = rateLimiter.getStats();

      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });
});

describe('getClientIdentifier', () => {
  it('should prefer userId when provided', () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('192.168.1.1'),
      },
    } as unknown as Request;

    const result = getClientIdentifier(mockRequest, 'user-123');

    expect(result).toBe('user:user-123');
  });

  it('should use x-forwarded-for when no userId', () => {
    const mockRequest = {
      headers: {
        get: jest.fn((header: string) => {
          if (header === 'x-forwarded-for') return '10.0.0.1, 192.168.1.1';
          return null;
        }),
      },
    } as unknown as Request;

    const result = getClientIdentifier(mockRequest);

    expect(result).toBe('ip:10.0.0.1');
  });

  it('should use x-real-ip as fallback', () => {
    const mockRequest = {
      headers: {
        get: jest.fn((header: string) => {
          if (header === 'x-real-ip') return '172.16.0.1';
          return null;
        }),
      },
    } as unknown as Request;

    const result = getClientIdentifier(mockRequest);

    expect(result).toBe('ip:172.16.0.1');
  });

  it('should return unknown when no IP available', () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    } as unknown as Request;

    const result = getClientIdentifier(mockRequest);

    expect(result).toBe('ip:unknown');
  });
});
