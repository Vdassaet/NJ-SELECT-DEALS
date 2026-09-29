import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window cache
const memoryCache = new Map<string, RateLimitRecord>();

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryCache.entries()) {
      if (now > record.resetAt) {
        memoryCache.delete(key);
      }
    }
  }, 60000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  identifier?: string;
  skipIp?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Extracts a dependable client identifier (IP address) from request headers.
 * Avoids trusting client-spoofed leftmost entries in X-Forwarded-For.
 */
export function getClientIp(request: NextRequest): string {
  // 1. Next.js / Edge verified socket IP
  if ((request as any).ip) {
    return (request as any).ip;
  }

  // 2. Cloudflare verified connecting IP
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // 3. Trusted reverse-proxy direct IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 4. X-Forwarded-For: Use rightmost entry added by the closest reverse proxy,
  // rather than the leftmost entry which can be arbitrarily spoofed by the client.
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      // Pick the rightmost entry (proxy-appended), mitigating client header injection
      return ips[ips.length - 1];
    }
  }

  return '127.0.0.1';
}

/**
 * Production-ready rate limiter.
 * Supports Upstash Redis REST API when configured (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN).
 * Falls back to sliding-window memory cache for single-instance or local execution.
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  let identifierKey = `${options.keyPrefix}:${ip}`;
  if (options.identifier) {
    identifierKey = options.skipIp
      ? `${options.keyPrefix}:${options.identifier}`
      : `${options.keyPrefix}:${options.identifier}:${ip}`;
  }
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  // 1. If Upstash Redis is configured, use distributed rate limiting
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      // INCR with EXPIRE using pipeline or REST API
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', identifierKey],
          ['TTL', identifierKey],
        ]),
      });

      if (response.ok) {
        const results = await response.json();
        const count = results[0]?.result || 1;
        let ttl = results[1]?.result;

        // If newly created key, set expiration
        if (ttl === -1 || count === 1) {
          await fetch(`${redisUrl}/EXPIRE/${identifierKey}/${options.windowSeconds}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });
          ttl = options.windowSeconds;
        }

        const remaining = Math.max(0, options.limit - count);
        return {
          success: count <= options.limit,
          limit: options.limit,
          remaining,
          reset: Math.max(0, ttl || options.windowSeconds),
        };
      }
    } catch (redisError) {
      console.warn('Distributed rate limit check failed, falling back to memory limiter:', redisError);
    }
  }

  // 2. Fallback to in-memory sliding window limiter
  const record = memoryCache.get(identifierKey);

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryCache.set(identifierKey, newRecord);
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: options.windowSeconds,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, options.limit - record.count);
  const secondsLeft = Math.ceil((record.resetAt - now) / 1000);

  return {
    success: record.count <= options.limit,
    limit: options.limit,
    remaining,
    reset: secondsLeft,
  };
}
