'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Printer } from 'lucide-react';
import { ChangeEvent } from 'react';

export default function TaxReportActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'all';

  const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
    router.push(`/admin/tax-reports?period=${e.target.value}`);
  };

  const handleExportCSV = () => {
    window.location.href = `/api/admin/reports/tax-csv?period=${period}`;
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select 
        value={period} 
        onChange={handlePeriodChange}
        className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
      >
        <option value="last7">Last 7 Days</option>
        <option value="last30">Last 30 Days</option>
        <option value="thisMonth">This Month</option>
        <option value="thisQuarter">This Quarter</option>
        <option value="thisYear">This Year</option>
        <option value="all">All Time</option>
      </select>
      
      <button 
        onClick={handleExportCSV}
        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors text-sm"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
      <button 
        onClick={handlePrintPDF}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-900 font-bold px-4 py-2 rounded-xl transition-colors text-sm"
      >
        <Printer className="w-4 h-4" />
        Print PDF
      </button>
    </div>
  );
}