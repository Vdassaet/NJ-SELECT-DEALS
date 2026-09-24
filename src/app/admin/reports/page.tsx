'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Boxes, 
  Users, 
  RotateCcw, 
  Calendar,
  Download,
  TrendingUp,
  Percent,
  ArrowUpRight
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function AdminReportsPage() {
  const [range, setRange] = useState('30d');
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async (selectedRange: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(range);
  }, [range]);

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'NJ SELECT DEALS STORE REPORT\r\n';
    csvContent += `Reporting Range: ${range.toUpperCase()}\r\n\r\n`;

    // Financial Overview
    csvContent += 'METRIC,VALUE\r\n';
    csvContent += `Gross Sales,${reportData.summary.grossSales.toFixed(2)}\r\n`;
    csvContent += `Total Refunds,${reportData.summary.totalRefunds.toFixed(2)}\r\n`;
    csvContent += `Net Sales,${reportData.summary.netSales.toFixed(2)}\r\n`;
    csvContent += `Discounts Applied,${reportData.summary.totalDiscount.toFixed(2)}\r\n`;
    csvContent += `Taxes Collected,${reportData.summary.totalTax.toFixed(2)}\r\n`;
    csvContent += `Shipping Collected,${reportData.summary.totalShipping.toFixed(2)}\r\n`;
    csvContent += `Total Orders,${reportData.summary.totalOrders}\r\n`;
    csvContent += `Average Order Value,${reportData.summary.averageOrderValue.toFixed(2)}\r\n\r\n`;

    // Top Selling Products
    csvContent += 'TOP SELLING PRODUCTS\r\n';
    csvContent += 'Product Name,Units Sold,Revenue\r\n';
    reportData.topSellingProducts.forEach((p: any) => {
      csvContent += `"${p.name.replace(/"/g, '""')}",${p.unitsSold},${p.revenue.toFixed(2)}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `store_report_${range}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            <span>Store Performance Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated metrics for Sales, Orders, Products, Inventory, Customers, Revenue, Refunds &amp; AOV
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'ytd', label: 'YTD' },
              { id: 'all', label: 'All Time' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  range === r.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={isLoading || !reportData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {isLoading || !reportData ? (
        <div className="p-16 text-center text-slate-500 text-xs">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-bold">Compiling real-time report analytics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Core KPIs: Sales, Revenue, Refunds, AOV */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              1. Revenue &amp; Financial Overview
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gross Sales */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Sales</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">{formatPrice(reportData.summary.grossSales)}</p>
                <span className="text-[11px] text-slate-400 block">Total order checkouts</span>
              </div>

              {/* Net Sales */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Revenue</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-blue-900">{formatPrice(reportData.summary.netSales)}</p>
                <span className="text-[11px] text-slate-400 block">After refunds deducted</span>
              </div>

              {/* Total Refunds */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Refunds</span>
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-2xl font-black text-rose-700">{formatPrice(reportData.summary.totalRefunds)}</p>
                <span className="text-[11px] text-slate-400 block">
                  {reportData.summary.refundedOrdersCount} refunded order(s)
                </span>
              </div>

              {/* Average Order Value (AOV) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Order Value (AOV)</span>
                  <Percent className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-black text-indigo-900">{formatPrice(reportData.summary.averageOrderValue)}</p>
                <span className="text-[11px] text-slate-400 block">Per completed transaction</span>
              </div>
            </div>
          </div>

          {/* 2. Order Breakdown & Tax / Shipping Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Order Status Breakdown (6 cols) */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>2. Orders Report ({reportData.summary.totalOrders} total)</span>
                <ShoppingCart className="w-4 h-4 text-slate-400" />
              </h2>

              <div className="space-y-3">
                {Object.entries(reportData.summary.orderStatusCounts).map(([st, count]: any) => {
                  const pct = reportData.summary.totalOrders > 0
                    ? Math.round((count / reportData.summary.totalOrders) * 100)
                    : 0;

                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-700 uppercase text-[11px]">{st}</span>
                        <span className="text-slate-900">{count} orders ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            st === 'DELIVERED'
                              ? 'bg-emerald-500'
                              : st === 'SHIPPED'
                              ? 'bg-sky-500'
                              : st === 'PROCESSING'
                              ? 'bg-indigo-500'
                              : st === 'CANCELLED'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Components: Tax, Shipping, Discounts (6 cols) */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Tax, Shipping &amp; Discounts</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </h2>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-900 block">Sales Taxes Collected</span>
                    <span className="text-[11px] text-slate-400">Remittable state tax</span>
                  </div>
                  <span className="font-black text-slate-900 text-sm">
                    {formatPrice(reportData.summary.totalTax)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-900 block">Shipping Fees Collected</span>
                    <span className="text-[11px] text-slate-400">Customer paid carrier delivery fees</span>
                  </div>
                  <span className="font-black text-slate-900 text-sm">
                    {formatPrice(reportData.summary.totalShipping)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="font-bold text-rose-700 block">Promo &amp; Coupon Discounts</span>
                    <span className="text-[11px] text-slate-400">Promotional savings granted to buyers</span>
                  </div>
                  <span className="font-black text-rose-700 text-sm">
                    -{formatPrice(reportData.summary.totalDiscount)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Inventory & Customer Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Inventory Valuation (6 cols) */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>3. Inventory Valuation &amp; Health</span>
                <Boxes className="w-4 h-4 text-slate-400" />
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-500 font-bold block">Total Catalog SKUs</span>
                  <span className="text-xl font-black text-slate-900">{reportData.inventory.totalProducts} items</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-500 font-bold block">Total Stock In Units</span>
                  <span className="text-xl font-black text-slate-900">{reportData.inventory.totalStockUnits} units</span>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <span className="text-[11px] text-amber-800 font-bold block">Low-Stock Alerts</span>
                  <span className="text-xl font-black text-amber-900">{reportData.inventory.lowStockCount} items</span>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                  <span className="text-[11px] text-rose-800 font-bold block">Out of Stock</span>
                  <span className="text-xl font-black text-rose-900">{reportData.inventory.outOfStockCount} items</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-700">Estimated Retail Valuation:</span>
                <span className="font-black text-slate-900 text-sm">{formatPrice(reportData.inventory.inventoryRetailValuation)}</span>
              </div>
            </div>

            {/* Customer Metrics (6 cols) */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>4. Customer Analytics</span>
                <Users className="w-4 h-4 text-slate-400" />
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-500 font-bold block">New Registrations ({range})</span>
                  <span className="text-2xl font-black text-slate-900">{reportData.summary.newCustomersCount}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-500 font-bold block">Total Registered Customers</span>
                  <span className="text-2xl font-black text-slate-900">{reportData.summary.totalCustomersCount}</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                <p className="font-bold text-emerald-900">Customer Security Guarantee</p>
                <p className="text-[11px] text-emerald-700">
                  Customer password hashes are strictly quarantined server-side and never queried or exposed in report analytics or client payloads.
                </p>
              </div>
            </div>

          </div>

          {/* 4. Top Selling Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                <span>5. Top Selling Products ({reportData.topSellingProducts.length})</span>
              </h2>
            </div>

            {reportData.topSellingProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Rank</th>
                      <th className="py-3.5 px-4">Product Name</th>
                      <th className="py-3.5 px-4">Units Sold</th>
                      <th className="py-3.5 px-4 text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.topSellingProducts.map((p: any, idx: number) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{p.unitsSold} units</td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatPrice(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 italic">
                No product sales recorded in the selected period.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
