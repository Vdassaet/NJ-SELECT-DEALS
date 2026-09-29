import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPasswordResetToken, hashPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';
import { revokeAllUserSessions } from '@/lib/session-revocation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. CSRF / Origin Validation
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // 2. Rate Limiting (5 attempts per minute per IP)
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: 'auth_reset_password',
    limit: 5,
    windowSeconds: 60,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Password reset token is required.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: 'Password cannot exceed 128 characters.' }, { status: 400 });
    }

    // 3. Cryptographically verify reset token
    const tokenPayload = await verifyPasswordResetToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'This password reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // 4. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || user.email.toLowerCase() !== tokenPayload.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Account not found or invalid reset token.' },
        { status: 400 }
      );
    }

    // 5. Enforce single-use token: ensure password hash suffix matches the token's hashPrefix
    const currentHashPrefix = user.passwordHash.slice(-12);
    if (currentHashPrefix !== tokenPayload.hashPrefix) {
      return NextResponse.json(
        { error: 'This password reset link has already been used. Please request a new one if needed.' },
        { status: 400 }
      );
    }

    // 6. Hash new password and update in database
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // 7. Revoke all previous active sessions across all devices
    await revokeAllUserSessions(user.id);

    logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'PASSWORD_RESET_COMPLETED',
      userId: user.id,
      userEmail: user.email,
      ip: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated. You can now sign in with your new password.',
    });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to reset password. Please try again.');
  }
}
