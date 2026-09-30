import { prisma } from '@/lib/prisma';
import { FileText, Download, Calendar, DollarSign, Percent, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TaxReportsPage() {
  // 1. Fetch Orders
  const allOrders = await prisma.order.findMany({
    include: { refunds: true }
  });

  // Calculate Counters
  let totalCompletedOrders = 0;
  let totalCancelledOrders = 0;
  let totalRefundedOrders = 0;
  let totalPartiallyRefundedOrders = 0;

  // Calculate Financials
  let grossProductSales = 0;
  let storeDiscounts = 0;
  let netTaxableProductSales = 0;
  let nonTaxableSales = 0;
  let taxableShipping = 0;
  let nonTaxableShipping = 0;
  let salesTaxCollected = 0;

  for (const o of allOrders) {
    if (o.status === 'CANCELLED' && o.paymentStatus !== 'REFUNDED' && o.paymentStatus !== 'PARTIALLY_REFUNDED') {
      // It was cancelled before payment or without completing a taxable sale
      totalCancelledOrders++;
      continue;
    }

    if (o.paymentStatus === 'REFUNDED') {
      totalRefundedOrders++;
      // Even if refunded, we count the original sale, and subtract refunds later to get NET
    } else if (o.paymentStatus === 'PARTIALLY_REFUNDED') {
      totalPartiallyRefundedOrders++;
    } else if (o.paymentStatus === 'PAID') {
      totalCompletedOrders++;
    }

    // Accumulate original financials for all successfully charged orders (including those refunded later)
    if (o.paymentStatus !== 'PENDING' && o.paymentStatus !== 'FAILED') {
      grossProductSales += (o.taxableSubtotal + o.nonTaxableSubtotal + o.discount);
      storeDiscounts += o.discount;
      netTaxableProductSales += o.taxableSubtotal;
      nonTaxableSales += o.nonTaxableSubtotal;
      taxableShipping += o.taxableShipping;
      nonTaxableShipping += o.nonTaxableShipping;
      salesTaxCollected += o.tax;
    }
  }

  // 2. Calculate Refunds
  const allRefunds = await prisma.refundRecord.findMany();
  let productRefunded = 0;
  let salesTaxRefunded = 0;

  for (const r of allRefunds) {
    productRefunded += r.amountRefunded;
    salesTaxRefunded += r.taxRefunded;
  }

  // 3. Final Net
  const totalTaxableReceipts = netTaxableProductSales + taxableShipping;
  const netSalesTax = salesTaxCollected - salesTaxRefunded;

  // 4. Payments
  const remittances = await prisma.taxRemittance.findMany();
  const previousTaxPayments = remittances.reduce((sum, r) => sum + r.amountPaid, 0);
  const outstandingTaxBalance = netSalesTax - previousTaxPayments;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            NJ Select Deals – Sales Tax Summary
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Government reporting dashboard for New Jersey Division of Taxation.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-900 font-bold px-4 py-2 rounded-xl transition-colors text-sm">
            <Download className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completed Orders</p>
            <p className="text-2xl font-black text-slate-800">{totalCompletedOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cancelled Orders</p>
            <p className="text-2xl font-black text-slate-500">{totalCancelledOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Refunds</p>
            <p className="text-2xl font-black text-red-500">{totalRefundedOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Partial Refunds</p>
            <p className="text-2xl font-black text-orange-500">{totalPartiallyRefundedOrders}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              Receipts & Revenue
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Gross Product Sales</span>
              <span className="font-mono text-slate-900">${grossProductSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-red-500">
              <span>Store Discounts (Tax Deductible)</span>
              <span className="font-mono">-${storeDiscounts.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 my-2 pt-2 flex justify-between items-center text-sm font-semibold">
              <span className="text-slate-800">Net Taxable Product Sales</span>
              <span className="font-mono text-slate-900">${netTaxableProductSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Non-Taxable Sales</span>
              <span className="font-mono text-slate-900">${nonTaxableSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Taxable Shipping Revenue</span>
              <span className="font-mono text-slate-900">${taxableShipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Non-Taxable Shipping Revenue</span>
              <span className="font-mono text-slate-900">${nonTaxableShipping.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 my-2 pt-2 flex justify-between items-center text-base font-black bg-brand-50 p-3 rounded-lg text-brand-900">
              <span>Total Taxable Receipts</span>
              <span className="font-mono">${totalTaxableReceipts.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-400" />
              Tax Liability & Remittance
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Sales Tax Collected</span>
              <span className="font-mono text-slate-900">${salesTaxCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-red-500">
              <span>Sales Tax Refunded</span>
              <span className="font-mono">-${salesTaxRefunded.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 my-2 pt-2 flex justify-between items-center text-sm font-semibold">
              <span className="text-slate-800">Net Sales Tax Liability</span>
              <span className="font-mono text-slate-900">${netSalesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-emerald-600">
              <span>Previous Tax Payments (Remitted)</span>
              <span className="font-mono">-${previousTaxPayments.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 my-2 pt-2 flex justify-between items-center text-lg font-black bg-slate-900 p-4 rounded-xl text-white shadow-inner">
              <span>Outstanding Tax Balance</span>
              <span className="font-mono">${outstandingTaxBalance.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-800 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              This report reconciles transactions based on the order and refund creation dates. Consult your accountant before filing state tax returns.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
