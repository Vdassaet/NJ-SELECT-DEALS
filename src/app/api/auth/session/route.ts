export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getVerifiedUser();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}

