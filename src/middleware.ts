import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'nj_select_deals_default_jwt_secret_key_2026_at_least_32_chars';
const secretKey = new TextEncoder().encode(JWT_SECRET);
const SESSION_COOKIE_NAME = 'njd_session_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let sessionUser: { id: string; name: string; email: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, secretKey);
      sessionUser = {
        id: payload.id as string,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
      };
    } catch (error) {
      sessionUser = null;
    }
  }

  // 1. Protect Admin Routes (/admin/*)
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

  // 2. Protect Customer Account Routes (/account/*)
  if (pathname.startsWith('/account')) {
    if (!sessionUser) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Redirect logged-in users away from /auth/login and /auth/register
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    if (sessionUser) {
      if (sessionUser.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/account', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/auth/login', '/auth/register'],
};
