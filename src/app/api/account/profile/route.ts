import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword, verifyPassword, createSessionToken, getSessionCookieConfig, SESSION_COOKIE_NAME } from '@/lib/auth';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { validatePasswordStrength } from '@/lib/validation';
import { revokeAllUserSessions } from '@/lib/session-revocation';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to fetch profile');
  }
}

export async function PUT(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  // Rate Limiting (10 profile updates per minute per IP)
  const rateLimitResult = await checkRateLimit(request, {
    keyPrefix: 'account_profile_update',
    limit: 10,
    windowSeconds: 60,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many profile update requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.reset) } }
    );
  }

  try {
    const session = await requireAuth();
    const body = await request.json();
    const { name, phone, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: { name?: string; phone?: string | null; passwordHash?: string } = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updateData.name = name.trim().slice(0, 100);
    }
    if (phone !== undefined) {
      updateData.phone = phone ? String(phone).trim().slice(0, 30) : null;
    }

    let passwordChanged = false;
    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password.' }, { status: 400 });
      }
      const isMatch = await verifyPassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        logSecurityEvent(
          'FAILED_LOGIN',
          { reason: 'INCORRECT_CURRENT_PASSWORD_ON_CHANGE', userId: session.id, email: user.email },
          request,
          { userId: session.id, role: session.role }
        );
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }
      const passValidation = validatePasswordStrength(newPassword);
      if (!passValidation.valid) {
        return NextResponse.json({ error: passValidation.error }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(newPassword);
      passwordChanged = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });

    if (passwordChanged) {
      // Invalidate all previously issued sessions for this user
      await revokeAllUserSessions(session.id);
      // Issue a brand new session token so the active device remains securely logged in
      const freshToken = await createSessionToken({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      });
      response.cookies.set(SESSION_COOKIE_NAME, freshToken, getSessionCookieConfig());

      logSecurityEvent(
        'PASSWORD_RESET',
        { action: 'PASSWORD_CHANGED', userId: session.id, email: user.email },
        request,
        { userId: session.id, role: session.role }
      );
    }

    return response;
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to update profile');
  }
}
