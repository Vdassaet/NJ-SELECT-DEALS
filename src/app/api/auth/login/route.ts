export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Auto-bootstrap initial admin if database is newly provisioned and unseeded
    if (!user) {
      const defaultAdminEmail = (process.env.ADMIN_EMAIL || 'admin@njselectdeals.com').toLowerCase().trim();
      const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecure123!';

      if (cleanEmail === defaultAdminEmail && password === defaultAdminPassword) {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount === 0) {
          const { hashPassword } = await import('@/lib/auth');
          const passwordHash = await hashPassword(defaultAdminPassword);
          user = await prisma.user.create({
            data: {
              email: defaultAdminEmail,
              name: 'Store Owner',
              passwordHash,
              role: 'ADMIN',
            },
          });
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred while signing in. Please check your database connection.' },
      { status: 500 }
    );
  }
}

