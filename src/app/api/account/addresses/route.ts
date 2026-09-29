import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { validatePostalCode } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    const addresses = await prisma.address.findMany({
      where: { userId: session.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to fetch addresses');
  }
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  const rateLimitResult = await checkRateLimit(request, {
    keyPrefix: 'account_address_create',
    limit: 15,
    windowSeconds: 60,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.reset) } }
    );
  }

  try {
    const session = await requireAuth();
    const body = await request.json();
    const { fullName, street, apartment, city, state, postalCode, country, phone, isDefault } = body;

    if (!fullName || !street || !city || !state || !postalCode) {
      return NextResponse.json({ error: 'Please provide complete address information.' }, { status: 400 });
    }

    const zipCheck = validatePostalCode(postalCode);
    if (!zipCheck.valid) {
      return NextResponse.json({ error: zipCheck.error }, { status: 400 });
    }

    // Atomic transaction: if setting default, unset others and create new
    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: session.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId: session.id,
          fullName: String(fullName).trim().slice(0, 100),
          street: String(street).trim().slice(0, 200),
          apartment: apartment ? String(apartment).trim().slice(0, 100) : null,
          city: String(city).trim().slice(0, 100),
          state: String(state).trim().slice(0, 50),
          postalCode: zipCheck.value!,
          country: country ? String(country).slice(0, 50) : 'US',
          phone: phone ? String(phone).trim().slice(0, 30) : null,
          isDefault: Boolean(isDefault),
        },
      });
    });

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to create address');
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  const rateLimitResult = await checkRateLimit(request, {
    keyPrefix: 'account_address_delete',
    limit: 15,
    windowSeconds: 60,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.reset) } }
    );
  }

  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    const deleteResult = await prisma.address.deleteMany({
      where: { id, userId: session.id },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Address deleted successfully' });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to delete address');
  }
}
