import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 });
    }

    if (action === 'activate') {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { isActive: true },
      });
      return NextResponse.json({ success: true, message: `Activated ${productIds.length} products` });
    }

    if (action === 'deactivate') {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, message: `Deactivated ${productIds.length} products` });
    }

    if (action === 'delete') {
      await prisma.product.deleteMany({
        where: { id: { in: productIds } },
      });
      return NextResponse.json({ success: true, message: `Deleted ${productIds.length} products` });
    }

    return NextResponse.json({ error: 'Invalid bulk action specified' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Bulk product action error:', error);
    return NextResponse.json({ error: error.message || 'Failed to perform bulk action' }, { status: 500 });
  }
}
