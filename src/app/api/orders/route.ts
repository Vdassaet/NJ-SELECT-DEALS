import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getVerifiedUser } from '@/lib/auth';
import { createSafeErrorResponse } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Rate limiting (30 requests/min)
  const rateLimitResult = await checkRateLimit(request, {
    keyPrefix: 'orders_list',
    limit: 30,
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
    const verifiedUser = await getVerifiedUser();
    const isAdmin = verifiedUser?.role === 'ADMIN';

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    const where: any = {};

    if (isAdmin) {
      // Admin can see all orders or filter
      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (q && q.trim()) {
        const query = q.trim();
        where.OR = [
          { orderNumber: { contains: query, mode: 'insensitive' } },
          { shippingName: { contains: query, mode: 'insensitive' } },
          { guestEmail: { contains: query, mode: 'insensitive' } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ];
      }
    } else {
      // Customer can ONLY see their own orders
      where.userId = session.id;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Sanitize internal payment gateway tokens for non-admin customers
    const sanitizedOrders = isAdmin
      ? orders
      : orders.map((order) => {
          const { stripePaymentId, stripeSessionId, ...safeOrder } = order;
          return safeOrder;
        });

    return NextResponse.json({ orders: sanitizedOrders });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return createSafeErrorResponse(error, 'Failed to fetch orders');
  }
}
