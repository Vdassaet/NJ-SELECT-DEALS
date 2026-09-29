import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
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
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'PASSWORD_RESET_REQUESTED',
      userId: user?.id,
      userEmail: cleanEmail,
      ip: getClientIp(request),
    });

    if (user) {
      const resetToken = await createPasswordResetToken(user);
      const host = request.headers.get('host');
      const origin = request.nextUrl.origin;
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (host ? `https://${host}` : origin);
      const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

      // Dispatch reset email via Resend or log for development
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name || 'Valued Customer',
        resetUrl,
      });

      console.log(`[PASSWORD RESET DISPATCHED] For: ${user.email} | URL: ${resetUrl}`);
    }

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
