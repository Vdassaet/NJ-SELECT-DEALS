import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getSession } from '@/lib/auth';
import {
  calculateInventoryStatus,
  getInventoryMetrics,
  getRecentInventoryLogs,
  recordInventoryLog,
} from '@/lib/inventory-service';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { validateInventoryCount, validatePrice } from '@/lib/validation';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    const [products, metrics, history] = await Promise.all([
      prisma.product.findMany({
        orderBy: { inventory: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          brand: true,
          price: true,
          salePrice: true,
          costPrice: true,
          inventory: true,
          reservedQuantity: true,
          lowStockThreshold: true,
          isActive: true,
          category: {
            select: { name: true, slug: true },
          },
        },
      }),
      getInventoryMetrics(),
      getRecentInventoryLogs(25),
    ]);

    const formattedProducts = products.map((p) => {
      const stockMeta = calculateInventoryStatus(
        p.inventory,
        p.lowStockThreshold,
        p.reservedQuantity || 0
      );
      return {
        ...p,
        availableQuantity: stockMeta.availableQuantity,
        inventoryStatus: stockMeta.status,
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      metrics,
      history,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to fetch inventory');
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();
    const session = await getSession();

    const body = await request.json();
    const {
      productId,
      inventory,
      lowStockThreshold,
      costPrice,
      adjustment,
      reason,
    } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'Valid Product ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          sku: true,
          inventory: true,
          lowStockThreshold: true,
          costPrice: true,
          price: true,
        },
      });

      if (!current) {
        throw new Error('Product not found');
      }

      const prevQty = current.inventory;
      let newQty = prevQty;
      let diff = 0;
      const updateData: any = {};

      if (inventory !== undefined) {
        const invCheck = validateInventoryCount(inventory);
        if (!invCheck.valid) {
          throw new Error(invCheck.error);
        }
        newQty = invCheck.value!;
        diff = newQty - prevQty;
        updateData.inventory = newQty;
      } else if (adjustment !== undefined) {
        const adj = Number(adjustment);
        if (!Number.isInteger(adj) || isNaN(adj) || adj < -1_000_000 || adj > 1_000_000) {
          throw new Error('Adjustment must be an integer between -1,000,000 and 1,000,000');
        }
        diff = adj;
        newQty = Math.max(0, prevQty + diff);
        updateData.inventory = newQty;
      }

      if (lowStockThreshold !== undefined) {
        const thresh = Number(lowStockThreshold);
        if (!Number.isInteger(thresh) || isNaN(thresh) || thresh < 0 || thresh > 100_000) {
          throw new Error('Low stock threshold must be an integer between 0 and 100,000');
        }
        updateData.lowStockThreshold = thresh;
      }

      if (costPrice !== undefined) {
        if (costPrice === null || costPrice === '') {
          updateData.costPrice = null;
        } else {
          const costCheck = validatePrice(costPrice, 0, 1_000_000);
          if (!costCheck.valid) {
            throw new Error(costCheck.error);
          }
          updateData.costPrice = costCheck.value!;
        }
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: updateData,
        select: {
          id: true,
          name: true,
          sku: true,
          inventory: true,
          reservedQuantity: true,
          lowStockThreshold: true,
          costPrice: true,
          price: true,
        },
      });

      // Record audit history log if quantity was altered
      let log = null;
      if (diff !== 0 || inventory !== undefined || adjustment !== undefined) {
        log = await recordInventoryLog(tx, {
          productId: current.id,
          sku: current.sku,
          previousQuantity: prevQty,
          newQuantity: newQty,
          difference: diff,
          reason: reason ? String(reason).slice(0, 100) : (diff > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT'),
          performedBy: session?.email || adminUser.email || 'ADMIN',
          userId: session?.id || adminUser.id || null,
        });
      }

      return {
        product: updatedProduct,
        log,
      };
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'UPDATE_INVENTORY', productId, previousQuantity: result.log?.previousQuantity, newQuantity: result.product.inventory },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    if (error.message && (error.message.includes('must be') || error.message === 'Product not found')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return createSafeErrorResponse(error, 'Failed to update inventory');
  }
}
