import { prisma } from '@/lib/prisma';
import { FileText, DollarSign, Percent, AlertCircle } from 'lucide-react';
import TaxReportActions from './TaxReportActions';
import { startOfDay, subDays, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function TaxReportsPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams.period || 'all';
  let dateFilter: any = undefined;
  const now = new Date();

  switch (period) {
    case 'last7': dateFilter = { gte: startOfDay(subDays(now, 7)) }; break;
    case 'last30': dateFilter = { gte: startOfDay(subDays(now, 30)) }; break;
    case 'thisMonth': dateFilter = { gte: startOfMonth(now) }; break;
    case 'thisQuarter': dateFilter = { gte: startOfQuarter(now) }; break;
    case 'thisYear': dateFilter = { gte: startOfYear(now) }; break;
  }

  const allOrders = await prisma.order.findMany({
    where: dateFilter ? { createdAt: dateFilter } : undefined,
    include: { refunds: true },
    orderBy: { createdAt: 'desc' }
  });

  let totalCompletedOrders = 0;
  let totalCancelledOrders = 0;
  let totalRefundedOrders = 0;
  let totalPartiallyRefundedOrders = 0;

  let netSales = 0;
  let grossTaxCollected = 0;
  let taxRefundedTotal = 0;
  let netCustomerPayments = 0;

  for (const o of allOrders) {
    const isCancelled = o.status === 'CANCELLED';

    if (isCancelled) {
      totalCancelledOrders++;
    } else {
      if (o.paymentStatus === 'REFUNDED') totalRefundedOrders++;
      else if (o.paymentStatus === 'PARTIALLY_REFUNDED') totalPartiallyRefundedOrders++;
      else if (o.paymentStatus === 'PAID') totalCompletedOrders++;
    }

    const oRefundedAmount = isCancelled ? 0 : o.refunds.reduce((sum, r) => sum + r.amountRefunded, 0);
    const oTaxRefunded = isCancelled ? 0 : o.refunds.reduce((sum, r) => sum + r.taxRefunded, 0);
    const finalProductPrice = isCancelled ? 0 : o.subtotal;
    const orderTax = isCancelled ? 0 : o.tax;
    const orderShipping = isCancelled ? 0 : o.shippingCost;

    netSales += (finalProductPrice - oRefundedAmount);
    grossTaxCollected += orderTax;
    taxRefundedTotal += oTaxRefunded;
    const totalOrderPaid = finalProductPrice + orderShipping + orderTax;
    netCustomerPayments += (totalOrderPaid - (oRefundedAmount + oTaxRefunded));
  }

  const netTaxCollected = grossTaxCollected - taxRefundedTotal;

  const remittances = await prisma.taxRemittance.findMany({
    where: dateFilter ? { paymentDate: dateFilter } : undefined
  });
  const totalRemitted = remittances.reduce((sum, r) => sum + r.amountPaid, 0);
  const outstandingTaxBalance = netTaxCollected - totalRemitted;

  return (
    <div className="max-w-7xl mx-auto space-y-8 print:w-full print:max-w-none print:m-0 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500 print:hidden" />
            NJ Select Deals - Sales Tax Summary
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Government reporting dashboard.
            <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-md font-mono text-xs">Period: {period.toUpperCase()}</span>
          </p>
        </div>
        <div className="print:hidden">
          <TaxReportActions />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-4 print:break-inside-avoid">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Sales</p>
          <p className="text-3xl font-black text-slate-900">{'$' + netSales.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">After discounts & refunds, excl. tax</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Tax Collected</p>
          <p className="text-3xl font-black text-slate-900">{'$' + netTaxCollected.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Collected minus refunded tax</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Customer Payments</p>
          <p className="text-3xl font-black text-emerald-600">{'$' + netCustomerPayments.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Total revenue collected & retained</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Outstanding Tax Balance</p>
          <p className="text-3xl font-black text-white">{'$' + outstandingTaxBalance.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">Liability minus remitted</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Completed</span>
          <span className="text-lg font-black text-slate-700">{totalCompletedOrders}</span>
        </div>
        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Cancelled</span>
          <span className="text-lg font-black text-slate-400">{totalCancelledOrders}</span>
        </div>
        <div className="bg-red-50 px-4 py-3 rounded-xl border border-red-100 flex justify-between items-center">
          <span className="text-xs font-bold text-red-800 uppercase">Full Refunds</span>
          <span className="text-lg font-black text-red-600">{totalRefundedOrders}</span>
        </div>
        <div className="bg-orange-50 px-4 py-3 rounded-xl border border-orange-100 flex justify-between items-center">
          <span className="text-xs font-bold text-orange-800 uppercase">Partial Refunds</span>
          <span className="text-lg font-black text-orange-600">{totalPartiallyRefundedOrders}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-inside-avoid">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">
            Financial Reconciliation
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Gross Tax Collected</span>
              <span className="font-mono text-slate-900">{'$' + grossTaxCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-red-500">
              <span>Sales Tax Refunded</span>
              <span className="font-mono">-{'$' + Math.abs(taxRefundedTotal).toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-sm">
              <span className="text-slate-800">Net Sales Tax</span>
              <span className="font-mono text-slate-900">{'$' + netTaxCollected.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Net Sales Tax</span>
              <span className="font-mono text-slate-900">{'$' + netTaxCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Government Tax Payments</span>
              <span className="font-mono">-{'$' + totalRemitted.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm bg-slate-900 p-2 rounded-lg text-white">
              <span>Outstanding Tax Balance</span>
              <span className="font-mono">{'$' + outstandingTaxBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-before-auto">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 uppercase tracking-wide text-sm">Sales By Order</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Order ID / Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Shipping</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">Sales Tax</th>
                <th className="px-4 py-3 text-right text-red-500">Refunds</th>
                <th className="px-4 py-3 text-right text-emerald-600">Net Paid</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allOrders.map(o => {
                const isCancelled = o.status === 'CANCELLED';
                const oRefunds = isCancelled ? 0 : o.refunds.reduce((sum, r) => sum + r.amountRefunded, 0);
                const oTaxRefunds = isCancelled ? 0 : o.refunds.reduce((sum, r) => sum + r.taxRefunded, 0);
                const finalSellingPrice = isCancelled ? 0 : o.subtotal;
                const orderTax = isCancelled ? 0 : o.tax;
                const orderShipping = isCancelled ? 0 : o.shippingCost;
                const netPaid = isCancelled ? 0 : (finalSellingPrice + orderShipping + orderTax) - (oRefunds + oTaxRefunds);
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-slate-900">{o.orderNumber}</div>
                      <div className="text-[10px] text-slate-400">{o.createdAt.toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 truncate max-w-[150px]">{o.guestEmail}</td>
                    <td className="px-4 py-3 text-right font-mono">{'$' + finalSellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">{'$' + orderShipping.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">{'$' + finalSellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">{'$' + orderTax.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">
                      {oRefunds + oTaxRefunds > 0 ? '-$' + (oRefunds + oTaxRefunds).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      {'$' + netPaid.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={'px-2 py-1 rounded-md text-[10px] font-bold ' + (
                        isCancelled ? 'bg-slate-100 text-slate-600' :
                        o.paymentStatus === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                        o.paymentStatus === 'PARTIALLY_REFUNDED' ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      )}>
                        {isCancelled ? 'CANCELLED' : o.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}