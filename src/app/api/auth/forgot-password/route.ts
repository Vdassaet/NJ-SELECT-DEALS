import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse, validateEmail } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF / Origin Validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // 2. Rate Limiting (3 attempts per minute per IP to prevent email enumeration/abuse)
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'auth_forgot_password',
      limit: 3,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      logSecurityEvent({
        type: 'SUSPICIOUS_AUTH',
        level: 'WARN',
        action: 'FORGOT_PASSWORD_RATE_LIMIT_EXCEEDED',
        ip: getClientIp(request),
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.reset) },
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = emailCheck.value!;

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true },
    });

    logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'PASSWORD_RESET_REQUESTED',
      userId: user?.id,
      userEmail: cleanEmail,
      ip: getClientIp(request),
    });

    // For security, always respond with the exact same neutral message regardless of account existence
    // to prevent user enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
    });
  } catch (error) {
    return createSafeErrorResponse(error, 'An error occurred. Please try again later.');
  }
}
