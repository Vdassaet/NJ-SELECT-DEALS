import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { sanitizeJsonLd } from '@/lib/security-client';
import { FileText, Mail } from 'lucide-react';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Return & Refund Policy | NJ Select Deals',
  description:
    'Review the official NJ Select Deals Return and Refund Policy. Learn about our health, safety, and hygiene standards for personal care, beauty, liquids, and confectionery.',
  path: '/returns',
});

export default function ReturnsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Return & Refund Policy', url: '/returns' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbs) }}
      />

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5 text-brand-600" />
          <span>Store Policies</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Return &amp; Refund Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          At NJ Select Deals, we carefully inspect and package orders before shipment. Please review our policy regarding returns, refunds, damaged shipments, and order issues below.
        </p>
      </div>

      {/* Policy Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        
        <section className="space-y-4">
          <p>
            At NJ Select Deals, we carefully inspect and package orders before shipment.
          </p>
          <p>
            Due to the nature of certain products we sell, including personal care products, beauty products, liquids, cosmetics, health and hygiene products, and food/candy items, we generally do not accept returns for customer preference, change of mind, or ordering the wrong item.
          </p>
          <p>
            If you receive an item that is damaged, defective, incorrect, or materially different from what you ordered, please contact us at:{' '}
            <a href="mailto:njselectdeals@gmail.com" className="text-brand-600 font-bold hover:underline">
              njselectdeals@gmail.com
            </a>
          </p>
          <p>
            Please contact us as soon as possible after delivery and provide your order number, a description of the issue, and clear photos of the product and packaging when applicable.
          </p>
          <p>
            NJ Select Deals will review each case individually. Depending on the circumstances, we may offer a replacement, store credit, refund, or another appropriate resolution.
          </p>
          <p className="font-bold text-slate-900">
            Refunds or replacements are NOT automatic and are subject to review.
          </p>
          <p>
            If an item is damaged during shipping, customers should contact us promptly so that we can review the claim and determine the appropriate resolution.
          </p>
          <p>
            For products that are sealed for health, hygiene, safety, or sanitary reasons, we generally cannot accept returns once the seal has been opened.
          </p>
          <p>
            For food, candy, chocolate, liquids, and other consumable products, returns are generally not accepted after delivery unless the item arrived damaged, defective, incorrect, or otherwise qualifies for a resolution under this policy.
          </p>
          <p>
            Customer preference, change of mind, accidental orders, or failure to verify product details before purchasing generally do not qualify for a refund or return.
          </p>
          <p>
            Return shipping costs are not automatically covered by NJ Select Deals. If a return is specifically authorized by NJ Select Deals, we will provide instructions regarding the return and explain who is responsible for the shipping cost.
          </p>
        </section>

        {/* Legal Compliance */}
        <section className="space-y-3 pt-6 border-t border-slate-100 bg-slate-50/60 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 p-8 sm:p-10 rounded-b-3xl">
          <h2 className="text-base font-black text-slate-900">
            Applicable Law &amp; Statutory Rights
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Requests are reviewed individually. NJ Select Deals will comply with applicable federal, state, and local consumer-protection laws. Nothing in this policy limits any statutory rights that cannot be legally excluded.
          </p>
          
          <div className="pt-4 border-t border-slate-200/80 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Customer Support Contact
            </h3>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 pt-1">
              <div className="flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-brand-600" />
                <a href="mailto:njselectdeals@gmail.com" className="text-brand-600 hover:underline">
                  njselectdeals@gmail.com
                </a>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              NJ Select Deals LLC • Passaic, New Jersey
            </p>
          </div>
        </section>

      </div>

      {/* Helpful Quick Links */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-4 px-2">
        <Link href="/terms" className="hover:text-slate-900 transition-colors">
          View Terms of Service &rarr;
        </Link>
        <Link href="/faq" className="hover:text-slate-900 transition-colors">
          Frequently Asked Questions &rarr;
        </Link>
        <Link href="/contact" className="hover:text-slate-900 transition-colors">
          Contact Customer Care &rarr;
        </Link>
      </div>

    </div>
  );
}
