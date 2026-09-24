import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { InventoryMetrics, InventoryLogItem, InventoryStatus } from '@/lib/types';

/**
 * Calculates stock status and effective available quantity
 */
export function calculateInventoryStatus(
  inventory: number,
  lowStockThreshold: number = 5,
  reservedQuantity: number = 0
): {
  availableQuantity: number;
  status: InventoryStatus;
  isOutOfStock: boolean;
  isLowStock: boolean;
} {
  const available = Math.max(0, inventory - reservedQuantity);
  const isOutOfStock = available <= 0;
  const isLowStock = available > 0 && available <= lowStockThreshold;
  const status: InventoryStatus = isOutOfStock
    ? 'OUT_OF_STOCK'
    : isLowStock
    ? 'LOW_STOCK'
    : 'IN_STOCK';

  return {
    availableQuantity: available,
    status,
    isOutOfStock,
    isLowStock,
  };
}

export interface RecordInventoryLogParams {
  productId: string;
  sku: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  reason: string;
  orderNumber?: string | null;
  performedBy?: string | null;
  userId?: string | null;
}

/**
 * Appends an audit trail entry in inventory_logs inside an existing Prisma transaction or client
 */
export async function recordInventoryLog(
  tx: Prisma.TransactionClient | typeof prisma,
  params: RecordInventoryLogParams
) {
  return tx.inventoryLog.create({
    data: {
      productId: params.productId,
      sku: params.sku,
      previousQuantity: params.previousQuantity,
      newQuantity: params.newQuantity,
      difference: params.difference,
      reason: params.reason,
      orderNumber: params.orderNumber || null,
      performedBy: params.performedBy || 'SYSTEM',
      userId: params.userId || null,
    },
  });
}

export interface AdjustStockInput {
  productId: string;
  adjustment?: number; // Relative change (+5, -2)
  newInventory?: number; // Absolute quantity (e.g. set to 25)
  reason: string;
  orderNumber?: string | null;
  performedBy?: string | null;
  userId?: string | null;
}

/**
 * Atomically adjusts a product's inventory level and records an audit log
 */
export async function adjustProductInventory(input: AdjustStockInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
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

    if (!product) {
      throw new Error(`Product with ID "${input.productId}" not found.`);
    }

    const previousQuantity = product.inventory;
    let newQuantity: number;
    let difference: number;

    if (input.newInventory !== undefined) {
      newQuantity = Math.max(0, input.newInventory);
      difference = newQuantity - previousQuantity;
    } else if (input.adjustment !== undefined) {
      difference = input.adjustment;
      newQuantity = Math.max(0, previousQuantity + difference);
    } else {
      throw new Error('Either "adjustment" or "newInventory" must be provided.');
    }

    const updated = await tx.product.update({
      where: { id: product.id },
      data: { inventory: newQuantity },
    });

    const log = await recordInventoryLog(tx, {
      productId: product.id,
      sku: product.sku,
      previousQuantity,
      newQuantity,
      difference,
      reason: input.reason,
      orderNumber: input.orderNumber,
      performedBy: input.performedBy,
      userId: input.userId,
    });

    return {
      product: updated,
      log,
      status: calculateInventoryStatus(newQuantity, product.lowStockThreshold),
    };
  });
}

/**
 * Calculates high-level inventory metrics for the Admin Dashboard and Inventory Manager
 */
export async function getInventoryMetrics(): Promise<InventoryMetrics> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      inventory: true,
      reservedQuantity: true,
      lowStockThreshold: true,
      costPrice: true,
      price: true,
    },
  });

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inStockCount = 0;
  let inventoryValuation = 0;

  for (const p of products) {
    const available = Math.max(0, p.inventory - (p.reservedQuantity || 0));

    if (available <= 0) {
      outOfStockCount++;
    } else if (available <= p.lowStockThreshold) {
      lowStockCount++;
    } else {
      inStockCount++;
    }

    // Inventory valuation: prefer costPrice if set, otherwise fallback to selling price
    const unitValue = p.costPrice != null && p.costPrice > 0 ? p.costPrice : p.price;
    inventoryValuation += Math.max(0, p.inventory) * unitValue;
  }

  return {
    totalProducts: products.length,
    lowStockCount,
    outOfStockCount,
    inStockCount,
    inventoryValuation: Math.round(inventoryValuation * 100) / 100,
  };
}

/**
 * Retrieves the most recent inventory audit log entries
 */
export async function getRecentInventoryLogs(limit: number = 10): Promise<InventoryLogItem[]> {
  const logs = await prisma.inventoryLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          price: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return logs as unknown as InventoryLogItem[];
}
