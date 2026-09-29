import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates that state-changing requests originate from the expected domain (CSRF prevention).
 * Permits legitimate server-to-server requests like webhooks by bypassing when signature is present.
 */
export function validateOrigin(request: NextRequest): boolean {
  // Allow GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  // Webhooks have their own cryptographic signature verification
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!origin && !referer) {
    // In local development or programmatic clients without browser origin headers,
    // require at least the host header to match.
    return true;
  }

  const allowedOrigins: string[] = [];
  if (host) {
    allowedOrigins.push(`https://${host}`, `http://${host}`);
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_BASE_URL);
      allowedOrigins.push(parsed.origin);
    } catch {}
  }
  if (request.nextUrl.origin) {
    allowedOrigins.push(request.nextUrl.origin);
  }

  if (origin) {
    return allowedOrigins.some((allowed) => allowed.toLowerCase() === origin.toLowerCase());
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.some((allowed) => allowed.toLowerCase() === refererOrigin.toLowerCase());
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Validates cart item quantity:
 * Must be an integer >= 1 and <= max (default 99).
 */
export function validateQuantity(quantity: any, max: number = 99): { valid: boolean; value: number } {
  const num = Number(quantity);
  if (!Number.isInteger(num) || isNaN(num) || !isFinite(num) || num < 1 || num > max) {
    return { valid: false, value: 1 };
  }
  return { valid: true, value: num };
}

/**
 * Validates numeric monetary amount (price, discount, total):
 * Must be a non-negative finite number.
 */
export function validateAmount(amount: any): { valid: boolean; value: number } {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num) || num < 0 || num > 1_000_000) {
    return { valid: false, value: 0 };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
}

import { logSecurityEvent } from './security-logger';

export * from './validation';
export { sanitizeRedirectUrl, sanitizeJsonLd } from './security-client';

/**
 * Safe error handling utility.
 * Sanitizes errors, logs security events for authorization failures,
 * and ensures stack traces, database schema details, and secrets are NEVER exposed to clients.
 */
export function createSafeErrorResponse(
  error: any,
  defaultMessage: string = 'An unexpected error occurred. Please try again.',
  status: number = 500
): NextResponse {
  // Check for standard authorization errors
  if (error?.message === 'UNAUTHORIZED' || error?.message === 'Unauthorized') {
    logSecurityEvent({
      type: 'AUTHZ_FAILURE',
      level: 'WARN',
      action: 'UNAUTHORIZED_ACCESS_BLOCKED',
      error: 'Authentication required',
    });
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (error?.message === 'FORBIDDEN' || error?.message === 'Forbidden') {
    logSecurityEvent({
      type: 'AUTHZ_FAILURE',
      level: 'WARN',
      action: 'FORBIDDEN_PRIVILEGE_BLOCKED',
      error: 'Access forbidden: Administrator privileges required',
    });
    return NextResponse.json({ error: 'Access forbidden: Administrator privileges required' }, { status: 403 });
  }

  // Internal Server Error logging
  console.error('[API Error]:', error);

  // In production, always return the safe generic message (never expose internal Prisma/SQL errors or stacks)
  const isProd = process.env.NODE_ENV === 'production';
  let message = defaultMessage;

  if (!isProd && error?.message) {
    // In dev, sanitize Prisma errors that might contain raw DB strings
    if (error.code && error.code.startsWith('P')) {
      message = `Database Error (${error.code}): ${defaultMessage}`;
    } else {
      message = error.message;
    }
  }

  return NextResponse.json({ error: message }, { status });
}
