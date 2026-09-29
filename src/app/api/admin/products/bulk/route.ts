import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();

    const body = await request.json();
    const { action, productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0 || productIds.length > 500) {
      return NextResponse.json({ error: 'Please select between 1 and 500 products.' }, { status: 400 });
    }

    const cleanIds = productIds
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, 500);

    if (cleanIds.length === 0) {
      return NextResponse.json({ error: 'No valid product IDs provided.' }, { status: 400 });
    }

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: `BULK_${action.toUpperCase()}`, count: cleanIds.length },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    if (action === 'activate') {
      await prisma.product.updateMany({
        where: { id: { in: cleanIds } },
        data: { isActive: true },
      });
      return NextResponse.json({ success: true, message: `Activated ${cleanIds.length} products` });
    }

    if (action === 'deactivate') {
      await prisma.product.updateMany({
        where: { id: { in: cleanIds } },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, message: `Deactivated ${cleanIds.length} products` });
    }

    if (action === 'delete') {
      await prisma.product.deleteMany({
        where: { id: { in: cleanIds } },
      });
      return NextResponse.json({ success: true, message: `Deleted ${cleanIds.length} products` });
    }

    return NextResponse.json({ error: 'Invalid bulk action specified' }, { status: 400 });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to perform bulk action');
  }
}
