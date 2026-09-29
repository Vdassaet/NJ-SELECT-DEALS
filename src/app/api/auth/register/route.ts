import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse, validatePasswordStrength, validateEmail } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF / Origin Validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // 2. Rate Limiting (3 registration attempts per minute per IP)
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'auth_register',
      limit: 3,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      logSecurityEvent({
        type: 'SUSPICIOUS_AUTH',
        level: 'WARN',
        action: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        ip: getClientIp(request),
      });
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.reset) },
        }
      );
    }

    // 3. Input Validation
    const body = await request.json().catch(() => ({}));
    const { name, email, password } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters long.' }, { status: 400 });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }
    const cleanEmail = emailCheck.value!;

    // Strong password complexity validation
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Explicitly enforce role CUSTOMER (prevent role injection)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim().slice(0, 100),
        email: cleanEmail,
        passwordHash,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const token = await createSessionToken(newUser);

    logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'USER_REGISTERED',
      userId: newUser.id,
      userEmail: cleanEmail,
      ip: getClientIp(request),
    });

    const response = NextResponse.json({
      success: true,
      user: newUser,
      message: 'Account created successfully',
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
    return createSafeErrorResponse(error, 'An error occurred during registration. Please try again.');
  }
}
