/**
 * Server-Side Session Invalidation Engine
 *
 * Implements real-time token revocation on logout or credential change.
 * Supports Upstash Redis when available, with in-memory fallback.
 */

// In-memory revocation cache: maps jti -> expiry timestamp (ms)
const revokedJtiCache = new Map<string, number>();

// In-memory user-level revocation timestamp cache: maps userId -> timestamp (ms)
const userRevocationCutoff = new Map<string, number>();

// Automatic cleanup every 60 seconds
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [jti, exp] of revokedJtiCache.entries()) {
      if (now > exp) {
        revokedJtiCache.delete(jti);
      }
    }
  }, 60000);
  if (typeof (cleanupTimer as any)?.unref === 'function') {
    (cleanupTimer as any).unref();
  }
}

/**
 * Revokes a specific JWT token by its unique identifier (jti).
 */
export async function revokeToken(jti: string, ttlSeconds: number = 60 * 60 * 24 * 7): Promise<void> {
  const expiryTimestamp = Date.now() + ttlSeconds * 1000;
  revokedJtiCache.set(jti, expiryTimestamp);

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/SET/revoked_token:${jti}/1/EX/${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch (err) {
      console.warn('Failed to persist token revocation to Redis:', err);
    }
  }
}

/**
 * Checks whether a specific token jti has been invalidated.
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  // Check local memory cache
  const localExp = revokedJtiCache.get(jti);
  if (localExp) {
    if (Date.now() < localExp) {
      return true;
    } else {
      revokedJtiCache.delete(jti);
    }
  }

  // Check Redis if configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/GET/revoked_token:${jti}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result !== null) {
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to query Redis token revocation:', err);
    }
  }

  return false;
}

/**
 * Invalidates all sessions for a user issued before the current timestamp.
 * Useful on password change or administrative account lockout.
 */
export async function revokeAllUserSessions(userId: string, ttlSeconds: number = 60 * 60 * 24 * 7): Promise<void> {
  const cutoffTime = Date.now();
  userRevocationCutoff.set(userId, cutoffTime);

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/SET/user_revocation_cutoff:${userId}/${cutoffTime}/EX/${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch (err) {
      console.warn('Failed to set user revocation cutoff in Redis:', err);
    }
  }
}

/**
 * Checks whether a user's session was issued before their latest revocation cutoff.
 */
export async function isUserSessionRevoked(userId: string, issuedAtSeconds?: number): Promise<boolean> {
  if (!issuedAtSeconds) return false;
  const tokenIssuedMs = issuedAtSeconds * 1000;

  // Check in-memory cutoff
  const localCutoff = userRevocationCutoff.get(userId);
  if (localCutoff && tokenIssuedMs < localCutoff) {
    return true;
  }

  // Check Redis cutoff
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/GET/user_revocation_cutoff:${userId}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          const redisCutoff = Number(data.result);
          if (!isNaN(redisCutoff) && tokenIssuedMs < redisCutoff) {
            return true;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to check user revocation cutoff in Redis:', err);
    }
  }

  return false;
}
