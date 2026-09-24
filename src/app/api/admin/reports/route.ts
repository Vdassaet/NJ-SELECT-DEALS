import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d'; // 7d, 30d, 90d, ytd, all

    const now = new Date();
    let startDate: Date | null = new Date();

    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else if (range === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = null; // all time
    }

    const orderWhere: any = {};
    if (startDate) {
      orderWhere.createdAt = { gte: startDate };
    }

    // 1. Fetch Orders in range
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch all products for inventory report
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        costPrice: true,
        inventory: true,
        lowStockThreshold: true,
        category: { select: { name: true } },
      },
    });

    // 3. Fetch customers registered
    const userWhere: any = { role: 'CUSTOMER' };
    if (startDate) {
      userWhere.createdAt = { gte: startDate };
    }
    const newCustomersCount = await prisma.user.count({ where: userWhere });
    const totalCustomersCount = await prisma.user.count({ where: { role: 'CUSTOMER' } });

    // 4. Calculate Sales & Revenue Metrics
    let grossSales = 0;
    let netSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalShipping = 0;
    let totalRefunds = 0;
    let refundedOrdersCount = 0;

    const orderStatusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    orders.forEach((ord) => {
      grossSales += ord.total;
      totalDiscount += ord.discount;
      totalTax += ord.tax;
      totalShipping += ord.shippingCost;

      if (ord.paymentStatus === 'REFUNDED') {
        totalRefunds += ord.total;
        refundedOrdersCount += 1;
      }

      if (orderStatusCounts[ord.status] !== undefined) {
        orderStatusCounts[ord.status] += 1;
      }
    });

    netSales = grossSales - totalRefunds;
    const completedOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const averageOrderValue = completedOrders.length > 0 ? (grossSales - totalRefunds) / completedOrders.length : 0;

    // 5. Product Sales Aggregation
    const productSalesMap: Record<string, { id: string; name: string; sku: string; unitsSold: number; revenue: number }> = {};

    orders.forEach((ord) => {
      if (ord.status !== 'CANCELLED') {
        ord.items.forEach((item) => {
          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              id: item.productId,
              name: item.productName,
              sku: item.productId,
              unitsSold: 0,
              revenue: 0,
            };
          }
          productSalesMap[item.productId].unitsSold += item.quantity;
          productSalesMap[item.productId].revenue += item.total;
        });
      }
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 6. Inventory Breakdown
    let totalStockUnits = 0;
    let inventoryRetailValuation = 0;
    let inventoryCostValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalStockUnits += p.inventory;
      inventoryRetailValuation += p.inventory * p.price;
      inventoryCostValuation += p.inventory * (p.costPrice || p.price * 0.6);
      if (p.inventory === 0) outOfStockCount++;
      else if (p.inventory <= p.lowStockThreshold) lowStockCount++;
    });

    // 7. Group sales by daily buckets for chart/timeline
    const dailyMap: Record<string, { date: string; sales: number; orders: number }> = {};
    orders.forEach((o) => {
      const d = o.createdAt.toISOString().split('T')[0];
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, sales: 0, orders: 0 };
      }
      dailyMap[d].sales += o.total;
      dailyMap[d].orders += 1;
    });

    const timeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      range,
      summary: {
        grossSales,
        netSales,
        totalRefunds,
        refundedOrdersCount,
        totalDiscount,
        totalTax,
        totalShipping,
        totalOrders: orders.length,
        averageOrderValue,
        orderStatusCounts,
        newCustomersCount,
        totalCustomersCount,
      },
      inventory: {
        totalProducts: products.length,
        totalStockUnits,
        inventoryRetailValuation,
        inventoryCostValuation,
        lowStockCount,
        outOfStockCount,
      },
      topSellingProducts,
      timeline,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Reports generation error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
