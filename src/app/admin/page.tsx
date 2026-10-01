import React from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle, 
  Plus, 
  Layers, 
  Boxes, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle2,
  Calendar,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { formatPrice, formatDate } from '@/lib/utils';
import { getInventoryMetrics } from '@/lib/inventory-service';
import SalesPerformanceInteractive from '@/components/admin/SalesPerformanceInteractive';

export const dynamic = 'force-dynamic';

async function getAdminMetrics() {
  try {
    const now = new Date();

    // Start of Today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 7 days ago
    const startOf7DaysAgo = new Date();
    startOf7DaysAgo.setDate(now.getDate() - 7);

    // 30 days ago
    const startOf30DaysAgo = new Date();
    startOf30DaysAgo.setDate(now.getDate() - 30);

    // Filter to strictly exclude cancelled and failed orders from revenue metrics
    const validSalesFilter = {
      status: { not: 'CANCELLED' as OrderStatus },
      paymentStatus: { notIn: ['CANCELLED', 'FAILED'] as PaymentStatus[] },
    };

    const [
      allOrders,
      validOrders,
      totalUsers,
      recentOrders,
      inventoryMetrics,
      allOrderItems,
    ] = await Promise.all([
      // All orders for pipeline count
      prisma.order.findMany({
        select: {
          id: true,
          total: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      // Successfully executed orders for sales financial metrics
      prisma.order.findMany({
        where: validSalesFilter,
        select: {
          id: true,
          subtotal: true,
          discount: true,
          shippingCost: true,
          tax: true,
          total: true,
          amountRefunded: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: { name: true, email: true } },
        },
      }),
      getInventoryMetrics(),
      // Top Products must strictly come from completed/non-cancelled purchases
      prisma.orderItem.findMany({
        where: {
          order: validSalesFilter,
        },
        take: 100,
        select: {
          productId: true,
          productName: true,
          productImage: true,
          quantity: true,
          total: true,
        },
      }),
    ]);

    const getNetOrderAmount = (ord: { total: number; amountRefunded?: number | null; paymentStatus?: string }) => {
      if (ord.paymentStatus === 'REFUNDED') return 0;
      return Math.max(0, ord.total - (ord.amountRefunded || 0));
    };

    // Calculate separated financial components: Product Revenue, Shipping, Tax, Total
    const calculateBreakdown = (orders: typeof validOrders) => {
      let productRevenue = 0;
      let shippingCollected = 0;
      let taxCollected = 0;
      let totalCollected = 0;

      orders.forEach((ord) => {
        if (ord.paymentStatus === 'REFUNDED') return;
        const refunded = ord.amountRefunded || 0;
        productRevenue += Math.max(0, ord.subtotal);
        shippingCollected += ord.shippingCost || 0;
        taxCollected += ord.tax || 0;
        totalCollected += Math.max(0, ord.total - refunded);
      });

      return {
        productRevenue: Math.round(productRevenue * 100) / 100,
        shippingCollected: Math.round(shippingCollected * 100) / 100,
        taxCollected: Math.round(taxCollected * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        orderCount: orders.length,
      };
    };

    // Filter valid orders by timeframe
    const todayOrders = validOrders.filter((o) => o.createdAt >= startOfToday);
    const weeklyOrders = validOrders.filter((o) => o.createdAt >= startOf7DaysAgo);
    const monthlyOrders = validOrders.filter((o) => o.createdAt >= startOf30DaysAgo);

    const todayBreakdown = calculateBreakdown(todayOrders);
    const weeklyBreakdown = calculateBreakdown(weeklyOrders);
    const monthlyBreakdown = calculateBreakdown(monthlyOrders);
    const grossBreakdown = calculateBreakdown(validOrders);

    // Precise sales sums excluding cancelled orders
    const todaySales = todayBreakdown.totalCollected;
    const weeklySales = weeklyBreakdown.totalCollected;
    const monthlySales = monthlyBreakdown.totalCollected;
    const totalRevenue = grossBreakdown.totalCollected;

    // Order status pipeline breakdown
    let pendingOrders = 0;
    let processingOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;

    allOrders.forEach((ord) => {
      switch (ord.status) {
        case 'PENDING':
          pendingOrders++;
          break;
        case 'PROCESSING':
          processingOrders++;
          break;
        case 'SHIPPED':
          shippedOrders++;
          break;
        case 'DELIVERED':
          deliveredOrders++;
          break;
        case 'CANCELLED':
          cancelledOrders++;
          break;
      }
    });

    // Chart Buckets: Today (8 intervals of 3 hours)
    const todayBuckets = [
      { label: '12am', startH: 0, endH: 3 },
      { label: '3am', startH: 3, endH: 6 },
      { label: '6am', startH: 6, endH: 9 },
      { label: '9am', startH: 9, endH: 12 },
      { label: '12pm', startH: 12, endH: 15 },
      { label: '3pm', startH: 15, endH: 18 },
      { label: '6pm', startH: 18, endH: 21 },
      { label: '9pm', startH: 21, endH: 24 },
    ].map((b) => {
      const matching = todayOrders.filter((o) => {
        const h = o.createdAt.getHours();
        return h >= b.startH && h < b.endH;
      });
      return {
        label: b.label,
        amount: Math.round(matching.reduce((sum, o) => sum + getNetOrderAmount(o), 0) * 100) / 100,
        orderCount: matching.length,
      };
    });

    // Chart Buckets: Weekly (last 7 calendar days)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyBuckets = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const matching = validOrders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd);
      const dayName = i === 0 ? 'Today' : daysOfWeek[d.getDay()];
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

      weeklyBuckets.push({
        label: dayName,
        sublabel: dateStr,
        amount: Math.round(matching.reduce((sum, o) => sum + getNetOrderAmount(o), 0) * 100) / 100,
        orderCount: matching.length,
      });
    }

    // Chart Buckets: Monthly (6 intervals of 5 days)
    const monthlyBuckets = [];
    for (let i = 5; i >= 0; i--) {
      const startDay = new Date(now);
      startDay.setDate(now.getDate() - (i + 1) * 5);
      const endDay = new Date(now);
      endDay.setDate(now.getDate() - i * 5);

      const matching = validOrders.filter((o) => o.createdAt >= startDay && o.createdAt <= endDay);
      const label = `${endDay.getMonth() + 1}/${endDay.getDate()}`;
      monthlyBuckets.push({
        label,
        sublabel: `${startDay.getMonth() + 1}/${startDay.getDate()} - ${endDay.getMonth() + 1}/${endDay.getDate()}`,
        amount: Math.round(matching.reduce((sum, o) => sum + getNetOrderAmount(o), 0) * 100) / 100,
        orderCount: matching.length,
      });
    }

    // Chart Buckets: All-time historical
    const allTimeBuckets: { label: string; amount: number; orderCount: number }[] = [];
    if (validOrders.length > 0) {
      const dateMap = new Map<string, { amount: number; count: number }>();
      validOrders.forEach((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        const existing = dateMap.get(key) || { amount: 0, count: 0 };
        existing.amount += getNetOrderAmount(o);
        existing.count += 1;
        dateMap.set(key, existing);
      });

      dateMap.forEach((val, key) => {
        allTimeBuckets.push({
          label: key,
          amount: Math.round(val.amount * 100) / 100,
          orderCount: val.count,
        });
      });
    }

    if (allTimeBuckets.length < 4) {
      weeklyBuckets.forEach((wb) => {
        if (!allTimeBuckets.some((at) => at.label === wb.sublabel || at.label === wb.label)) {
          allTimeBuckets.push({
            label: wb.sublabel || wb.label,
            amount: wb.amount,
            orderCount: wb.orderCount,
          });
        }
      });
    }

    // Top Products aggregation
    const productMap: Record<string, { id: string; name: string; image: string | null; units: number; revenue: number }> = {};
    allOrderItems.forEach((item) => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          id: item.productId,
          name: item.productName,
          image: item.productImage,
          units: 0,
          revenue: 0,
        };
      }
      productMap[item.productId].units += item.quantity;
      productMap[item.productId].revenue += item.total;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return {
      todaySales,
      weeklySales,
      monthlySales,
      totalRevenue,
      validOrdersCount: validOrders.length,
      todayOrdersCount: todayOrders.length,
      weeklyOrdersCount: weeklyOrders.length,
      monthlyOrdersCount: monthlyOrders.length,
      totalOrders: allOrders.length,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalUsers,
      recentOrders,
      inventoryMetrics,
      topProducts,
      chartData: {
        today: todayBuckets,
        weekly: weeklyBuckets,
        monthly: monthlyBuckets,
        allTime: allTimeBuckets,
      },
      breakdowns: {
        today: todayBreakdown,
        weekly: weeklyBreakdown,
        monthly: monthlyBreakdown,
        gross: grossBreakdown,
      },
    };
  } catch (error) {
    console.error('Error loading admin dashboard metrics:', error);
    return {
      todaySales: 0,
      weeklySales: 0,
      monthlySales: 0,
      totalRevenue: 0,
      validOrdersCount: 0,
      todayOrdersCount: 0,
      weeklyOrdersCount: 0,
      monthlyOrdersCount: 0,
      totalOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalUsers: 0,
      recentOrders: [],
      inventoryMetrics: {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        inStockCount: 0,
        inventoryValuation: 0,
      },
      topProducts: [],
      chartData: {
        today: [],
        weekly: [],
        monthly: [],
        allTime: [],
      },
      breakdowns: {
        today: { productRevenue: 0, shippingCollected: 0, taxCollected: 0, totalCollected: 0, orderCount: 0 },
        weekly: { productRevenue: 0, shippingCollected: 0, taxCollected: 0, totalCollected: 0, orderCount: 0 },
        monthly: { productRevenue: 0, shippingCollected: 0, taxCollected: 0, totalCollected: 0, orderCount: 0 },
        gross: { productRevenue: 0, shippingCollected: 0, taxCollected: 0, totalCollected: 0, orderCount: 0 },
      },
    };
  }
}

export default async function AdminDashboardPage() {
  const metrics = await getAdminMetrics();

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Store Management Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time sales velocity, order pipelines, inventory health, and top performing products
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/products/new"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>

          <Link
            href="/admin/orders"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Process Orders</span>
          </Link>

          <Link
            href="/admin/reports"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-extrabold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-brand-600" />
            <span>View Reports</span>
          </Link>
        </div>
      </div>

      {/* SALES PERFORMANCE INTERACTIVE SECTION: Today, Weekly, Monthly, Gross Sales with Charts */}
      <SalesPerformanceInteractive
        todaySales={metrics.todaySales}
        weeklySales={metrics.weeklySales}
        monthlySales={metrics.monthlySales}
        grossSales={metrics.totalRevenue}
        validOrdersCount={metrics.validOrdersCount}
        todayOrdersCount={metrics.todayOrdersCount}
        weeklyOrdersCount={metrics.weeklyOrdersCount}
        monthlyOrdersCount={metrics.monthlyOrdersCount}
        breakdowns={metrics.breakdowns}
        chartData={metrics.chartData}
      />

      {/* ORDER PIPELINE SECTION: Total, Pending, Processing, Shipped, Delivered */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
          <span>Fulfillment &amp; Order Pipeline</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Orders */}
          <Link href="/admin/orders" className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all block">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Orders</span>
              <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xl font-black text-slate-900">{metrics.totalOrders}</p>
            <span className="text-[10px] text-brand-600 font-bold block mt-1">View list →</span>
          </Link>

          {/* Pending Orders */}
          <Link href="/admin/orders?status=PENDING" className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 hover:border-amber-300 shadow-sm transition-all block">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-amber-900">{metrics.pendingOrders}</p>
            <span className="text-[10px] text-amber-700 font-bold block mt-1">Awaiting review</span>
          </Link>

          {/* Processing Orders */}
          <Link href="/admin/orders?status=PROCESSING" className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 hover:border-indigo-300 shadow-sm transition-all block">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Processing</span>
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-indigo-900">{metrics.processingOrders}</p>
            <span className="text-[10px] text-indigo-700 font-bold block mt-1">Ready for packing</span>
          </Link>

          {/* Shipped Orders */}
          <Link href="/admin/orders?status=SHIPPED" className="bg-sky-50/50 p-4 rounded-2xl border border-sky-200 hover:border-sky-300 shadow-sm transition-all block">
            <div className="flex items-center justify-between text-sky-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Shipped</span>
              <Truck className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-sky-900">{metrics.shippedOrders}</p>
            <span className="text-[10px] text-sky-700 font-bold block mt-1">In transit</span>
          </Link>

          {/* Delivered Orders */}
          <Link href="/admin/orders?status=DELIVERED" className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 hover:border-emerald-300 shadow-sm transition-all block">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Delivered</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-black text-emerald-900">{metrics.deliveredOrders}</p>
            <span className="text-[10px] text-emerald-700 font-bold block mt-1">Completed</span>
          </Link>
        </div>
      </div>

      {/* STOCK & INVENTORY ALERTS: Low-stock products, Out-of-stock products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Low-Stock Products</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-800">{metrics.inventoryMetrics.lowStockCount}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">Items below threshold</span>
            <Link href="/admin/inventory" className="text-[11px] font-bold text-amber-700 hover:underline">
              Inspect stock →
            </Link>
          </div>
        </div>

        {/* Out of Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Out-of-Stock Products</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-800">{metrics.inventoryMetrics.outOfStockCount}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">Zero inventory remaining</span>
            <Link href="/admin/inventory" className="text-[11px] font-bold text-rose-700 hover:underline">
              Restock now →
            </Link>
          </div>
        </div>

        {/* Total Catalog Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Catalog</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.inventoryMetrics.totalProducts}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">Valuation: {formatPrice(metrics.inventoryMetrics.inventoryValuation)}</span>
            <Link href="/admin/products" className="text-[11px] font-bold text-brand-600 hover:underline">
              Manage items →
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Recent Orders (Left 7 cols) & Top Products (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Recent Orders</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Latest purchases and buyer activity</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentOrders.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {metrics.recentOrders.map((ord: any) => (
                <div key={ord.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/orders/${ord.id}`} className="font-mono font-bold text-slate-900 hover:text-brand-600">
                        {ord.orderNumber}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-medium">({ord.items?.length || 0} items)</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {ord.shippingName} • {formatDate(ord.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{formatPrice(ord.total)}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      ord.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : ord.status === 'SHIPPED'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : ord.status === 'PROCESSING'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : ord.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              No orders placed yet.
            </div>
          )}
        </div>

        {/* Top Products (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Top Products</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Bestselling items from completed sales</p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.topProducts.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {metrics.topProducts.map((p, idx) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center space-x-3 max-w-[70%]">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="font-bold text-slate-900 truncate">
                      {p.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-black text-slate-900">{formatPrice(p.revenue)}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      {p.units} unit{p.units > 1 ? 's' : ''} sold
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              No product purchase activity recorded yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
