export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, invalidateSession, getSession } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security-logger';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getSession();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Invalidate the session token in the revocation registry
  if (token) {
    await invalidateSession(token);
  }

  if (session) {
    logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'USER_LOGOUT',
      userId: session.id,
      userEmail: session.email,
      ip: getClientIp(request),
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    maxAge: 0,
    path: '/',
  });

  return response;
}
