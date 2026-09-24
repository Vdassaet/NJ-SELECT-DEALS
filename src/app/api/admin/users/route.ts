import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    // Passwords strictly excluded
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        addresses: {
          take: 2,
          select: {
            id: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            isDefault: true,
            type: true,
          },
        },
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
            reviews: true,
          },
        },
      },
    });

    const sanitizedUsers = users.map((u) => {
      const totalSpent = u.orders.reduce((acc, curr) => acc + curr.total, 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        addresses: u.addresses,
        totalOrders: u._count.orders,
        totalSpent,
        totalReviews: u._count.reviews,
        recentOrderDate: u.orders[0]?.createdAt || null,
      };
    });

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Users fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
