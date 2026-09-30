import { prisma } from '@/lib/prisma';
import { Landmark, Search, Calendar, FileText } from 'lucide-react';
import RecordPaymentButton from './RecordPaymentButton';

export const dynamic = 'force-dynamic';

export default async function TaxRemittancePage() {
  const remittances = await prisma.taxRemittance.findMany({
    orderBy: { paymentDate: 'desc' },
  });

  // Calculate totals to show in summary
  const totalRemitted = remittances.reduce((sum, r) => sum + r.amountPaid, 0);

  // We need to compare this to total net tax collected.
  // Net Tax = (Order.tax for completed sales) - (RefundRecord.taxRefunded)
  const orders = await prisma.order.findMany({
    where: { paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] }, status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    select: { tax: true }
  });
  const totalTaxCollected = orders.reduce((sum, o) => sum + o.tax, 0);

  const refunds = await prisma.refundRecord.findMany({
    select: { taxRefunded: true }
  });
  const totalTaxRefunded = refunds.reduce((sum, r) => sum + r.taxRefunded, 0);

  const netTaxLiability = totalTaxCollected - totalTaxRefunded;
  const remainingBalance = netTaxLiability - totalRemitted;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-brand-500" />
            Tax Remittance History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track payments made to the New Jersey Division of Taxation or other government agencies.
          </p>
        </div>
        <RecordPaymentButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gross Tax Collected</p>
          <p className="text-2xl font-black text-slate-800">${totalTaxCollected.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tax Refunded</p>
          <p className="text-2xl font-black text-red-500">${totalTaxRefunded.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Remitted</p>
          <p className="text-2xl font-black text-emerald-600">${totalRemitted.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Outstanding Balance</p>
          <p className="text-2xl font-black text-white">${remainingBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Payment Date</th>
                <th className="px-6 py-4">Tax Period</th>
                <th className="px-6 py-4">Agency</th>
                <th className="px-6 py-4 text-right">Amount Paid</th>
                <th className="px-6 py-4">Conf. Number</th>
                <th className="px-6 py-4">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {remittances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Landmark className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold">No tax payments recorded yet.</p>
                    <p className="text-xs mt-1">When you pay the government, record it here to track your balance.</p>
                  </td>
                </tr>
              ) : (
                remittances.map((remittance) => (
                  <tr key={remittance.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {remittance.paymentDate.toISOString().split('T')[0]}
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand-600">{remittance.taxPeriod}</td>
                    <td className="px-6 py-4 text-slate-600">{remittance.agency}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-right">
                      ${remittance.amountPaid.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{remittance.confirmationNumber || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{remittance.paymentMethod || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

