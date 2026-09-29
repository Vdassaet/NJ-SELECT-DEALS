import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import { isTokenRevoked, isUserSessionRevoked } from '@/lib/session-revocation';

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    return new TextEncoder().encode('development_only_jwt_secret_must_be_replaced_in_production_32_chars');
  }
  return new TextEncoder().encode(secret);
}

const SESSION_COOKIE_NAME = 'njd_session_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secretKey = getJwtSecret();

  let sessionUser: { id: string; name: string; email: string; role: string } | null = null;

  if (token && secretKey) {
    try {
      const { payload } = await jose.jwtVerify(token, secretKey);
      const isRevoked =
        (payload.jti ? await isTokenRevoked(payload.jti as string) : false) ||
        (payload.id ? await isUserSessionRevoked(payload.id as string, payload.iat) : false);

      if (!isRevoked) {
        sessionUser = {
          id: payload.id as string,
          name: payload.name as string,
          email: payload.email as string,
          role: payload.role as string,
        };
      }
    } catch (error) {
      sessionUser = null;
    }
  }

  // 1. Protect Admin API Routes (/api/admin/* and /api/upload)
  if (pathname.startsWith('/api/admin') || pathname === '/api/upload') {
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
  }

  // 2. Protect Admin Page Routes (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!sessionUser) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (sessionUser.role !== 'ADMIN') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // 3. Protect Customer Account Routes (/account/*)
  if (pathname.startsWith('/account')) {
    if (!sessionUser) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect logged-in users away from /auth/login and /auth/register
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    if (sessionUser) {
      if (sessionUser.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/account', request.url));
    }
  }

  const response = NextResponse.next();

  // Apply baseline security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/account',
    '/account/:path*',
    '/auth/login',
    '/auth/register',
    '/api/admin/:path*',
    '/api/upload',
  ],
};
