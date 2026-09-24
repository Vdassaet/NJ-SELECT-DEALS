import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Return Policy & 30-Day Money-Back Guarantee | NJ Select Deals',
  description:
    'Our 30-day return policy and money-back guarantee. Simple returns and prompt refunds on authentic beauty and confectionery products at NJ Select Deals.',
  path: '/returns',
});

export default function ReturnsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Return Policy', url: '/returns' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          30-Day Return Policy &amp; Refunds
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Shop with total peace of mind with our 100% satisfaction guarantee.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-lg font-black text-slate-900">30-Day Money-Back Guarantee</h2>
          <p>
            If you are not 100% satisfied with your purchase, you may return unopened items in their original condition within <strong>30 days of delivery</strong> for a full refund to your original payment method.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-lg font-black text-slate-900">How to Initiate a Return</h2>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
            <li>Contact our customer support team at <strong>support@njselectdeals.com</strong> with your Order Number (e.g. ORD-2026...).</li>
            <li>We will email you a prepaid return shipping label and simple instructions.</li>
            <li>Drop off the package at any authorized carrier drop-off point.</li>
            <li>Once received and inspected at our Paramus warehouse, your refund will be processed within 2 to 3 business days.</li>
          </ol>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-lg font-black text-slate-900">Damaged or Defective Items</h2>
          <p>
            In the rare event that an item arrives damaged in transit or defective, please notify us within 48 hours of delivery. We will promptly dispatch an express replacement or issue a full refund without requiring you to return the damaged item.
          </p>
        </div>
      </div>
    </div>
  );
}
