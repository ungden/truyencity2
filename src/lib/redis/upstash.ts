/**
 * Upstash Redis Client — singleton for serverless environments
 *
 * Uses REST-based Redis (works in Vercel Edge + Serverless).
 * Returns null gracefully when env vars are not set,
 * so callers can fall back to in-memory implementations.
 */

import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
let _initialized = false;

/**
 * Get the singleton Upstash Redis client.
 * Returns null if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured.
 */
export function getRedis(): Redis | null {
  if (_initialized) return _redis;
  _initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.info('[redis] Upstash env vars not set — falling back to in-memory');
    _redis = null;
    return null;
  }

  try {
    _redis = new Redis({ url, token });
    console.info('[redis] Upstash Redis client initialised');
  } catch (err) {
    console.warn('[redis] Failed to initialise Upstash Redis:', err);
    _redis = null;
  }

  return _redis;
}
