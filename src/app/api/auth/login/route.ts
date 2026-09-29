import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF / Origin Validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // 2. Rate Limiting (5 login attempts per minute per IP to block brute force)
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'auth_login',
      limit: 5,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      logSecurityEvent({
        type: 'SUSPICIOUS_AUTH',
        level: 'WARN',
        action: 'LOGIN_RATE_LIMIT_EXCEEDED',
        ip: getClientIp(request),
      });
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.reset) },
        }
      );
    }

    // 3. Input Validation
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Valid email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || cleanEmail.length > 254) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Account-level rate limiting to prevent distributed brute force against a single account
    const accountRateLimit = await checkRateLimit(request, {
      keyPrefix: 'auth_account',
      identifier: cleanEmail,
      skipIp: true,
      limit: 5,
      windowSeconds: 60,
    });
    if (!accountRateLimit.success) {
      logSecurityEvent({
        type: 'SUSPICIOUS_AUTH',
        level: 'WARN',
        action: 'ACCOUNT_LOGIN_RATE_LIMIT_EXCEEDED',
        ip: getClientIp(request),
        userEmail: cleanEmail,
      });
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Please wait a minute.' },
        { status: 429, headers: { 'Retry-After': String(accountRateLimit.reset) } }
      );
    }

    // 4. Ground-truth User Query (No auto-bootstrap fallback)
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      logSecurityEvent({
        type: 'FAILED_LOGIN',
        level: 'WARN',
        action: 'USER_LOGIN_FAILED_NONEXISTENT_USER',
        ip: getClientIp(request),
        userEmail: cleanEmail,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      logSecurityEvent({
        type: 'FAILED_LOGIN',
        level: 'WARN',
        action: 'USER_LOGIN_FAILED_PASSWORD_MISMATCH',
        ip: getClientIp(request),
        userId: user.id,
        userEmail: cleanEmail,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = await createSessionToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      message: 'Logged in successfully',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    return createSafeErrorResponse(error, 'An error occurred while signing in. Please try again.');
  }
}

