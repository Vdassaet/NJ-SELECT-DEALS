import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    const where: any = {};

    if (session.role === 'ADMIN') {
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

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ orders: [], error: 'Failed to fetch orders' }, { status: 500 });
  }
}
