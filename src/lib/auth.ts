import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { UserSession } from './types';
import { isTokenRevoked, isUserSessionRevoked, revokeToken } from './session-revocation';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    // Explicit, restricted key for local dev only
    return new TextEncoder().encode('development_only_jwt_secret_must_be_replaced_in_production_32_chars');
  }
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production.');
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = 'njd_session_token';

export function getSessionCookieConfig() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  const secretKey = getJwtSecret();
  const jti = crypto.randomUUID();

  return new jose.SignJWT({
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secretKey);

    // Verify token has not been revoked (session invalidation)
    if (payload.jti && (await isTokenRevoked(payload.jti as string))) {
      return null;
    }

    // Verify user-level session revocation cutoff (e.g. after password change)
    if (payload.id && (await isUserSessionRevoked(payload.id as string, payload.iat))) {
      return null;
    }

    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as 'ADMIN' | 'CUSTOMER',
    };
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Invalidate the provided token or current session cookie.
 */
export async function invalidateSession(token?: string): Promise<void> {
  try {
    let targetToken = token;
    if (!targetToken) {
      const cookieStore = cookies();
      targetToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }
    if (!targetToken) return;

    const secretKey = getJwtSecret();
    const { payload } = await jose.jwtVerify(targetToken, secretKey);
    if (payload.jti) {
      const exp = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 60 * 60 * 24 * 7;
      await revokeToken(payload.jti as string, Math.max(60, exp));
    }
  } catch (err) {
    // If token is already invalid, no-op
  }
}

/**
 * Returns the currently authenticated user with live ground-truth database verification.
 * Returns null if unauthenticated or not found in database.
 */
export async function getVerifiedUser(): Promise<UserSession | null> {
  try {
    const session = await getSession();
    if (!session || !session.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

/**
 * Ensures user is authenticated and still exists in the active database.
 */
export async function requireAuth(): Promise<UserSession> {
  const session = await getSession();
  if (!session || !session.id) {
    throw new Error('UNAUTHORIZED');
  }

  // Database verification: Ensure user wasn't deleted or disabled
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Ensures user is authenticated and holds verified ADMIN privileges in the database.
 * Never trusts stale role information inside client-supplied JWTs.
 */
export async function requireAdmin(): Promise<UserSession> {
  const session = await getSession();
  if (!session || !session.id) {
    throw new Error('UNAUTHORIZED');
  }

  // Authoritative live database check: Never trust stale or forged role in JWT
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
