import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getSession } from '@/lib/auth';
import {
  calculateInventoryStatus,
  getInventoryMetrics,
  getRecentInventoryLogs,
  recordInventoryLog,
} from '@/lib/inventory-service';

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
    console.error('Inventory fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
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

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
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
        newQty = Math.max(0, parseInt(inventory, 10));
        diff = newQty - prevQty;
        updateData.inventory = newQty;
      } else if (adjustment !== undefined) {
        diff = parseInt(adjustment, 10);
        newQty = Math.max(0, prevQty + diff);
        updateData.inventory = newQty;
      }

      if (lowStockThreshold !== undefined) {
        updateData.lowStockThreshold = Math.max(0, parseInt(lowStockThreshold, 10));
      }

      if (costPrice !== undefined) {
        updateData.costPrice = costPrice === null || costPrice === '' ? null : Math.max(0, parseFloat(costPrice));
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
          reason: reason || (diff > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT'),
          performedBy: session?.email || 'ADMIN',
          userId: session?.id || null,
        });
      }

      return {
        product: updatedProduct,
        log,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Inventory update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update inventory' }, { status: 500 });
  }
}
