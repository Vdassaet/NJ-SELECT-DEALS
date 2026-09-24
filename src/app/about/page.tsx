import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema, STORE_INFO } from '@/lib/seo';
import { ShieldCheck, Truck, Award, Users, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = generateSEOMetadata({
  title: 'About NJ Select Deals | Direct Single-Store E-Commerce',
  description:
    'Learn about NJ Select Deals. Headquartered in Paramus, New Jersey, providing authentic hair care, skincare, confectionery, and personal care products with direct fulfillment.',
  path: '/about',
});

export default function AboutPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About Us', url: '/about' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          About NJ Select Deals
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Authentic beauty, hair care, skincare, and gourmet confectionery delivered directly from our New Jersey distribution center.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-900">Our Direct Store Promise</h2>
          <p>
            Founded with a commitment to quality and transparency, <strong>NJ Select Deals</strong> is a dedicated single-store merchant. Unlike open multi-vendor marketplaces filled with questionable unauthorized sellers and counterfeits, every product listed in our store is sourced directly through certified manufacturers, verified distributors, and authorized brand representatives.
          </p>
          <p>
            Operating out of our climate-controlled fulfillment warehouse in <strong>Paramus, New Jersey</strong>, we handle inventory directly, inspect every batch for expiration dates, and package orders with custom thermal and protective packaging for delicate cosmetics and confectionery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-brand-700 font-black text-xs uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Guaranteed Authentic</span>
            </div>
            <p className="text-xs text-slate-600">
              Zero third-party marketplace sellers. You always receive authentic original formulations with intact batch codes and manufacturer seals.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-brand-700 font-black text-xs uppercase">
              <Truck className="w-4 h-4 text-sky-600" />
              <span>Direct NJ Express Shipping</span>
            </div>
            <p className="text-xs text-slate-600">
              Same-day order processing before 2:00 PM EST via USPS, UPS, and FedEx with verified live tracking numbers and prompt delivery nationwide.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-xl font-black text-slate-900">Store Headquarters &amp; Contact</h2>
          <p>
            Have a question about an order or product ingredients? Our dedicated customer care team is available 7 days a week:
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li><strong>Fulfillment &amp; Offices:</strong> 100 Route 17 North, Paramus, NJ 07652</li>
            <li><strong>Support Email:</strong> support@njselectdeals.com</li>
            <li><strong>Toll-Free Phone:</strong> (800) 555-DEAL</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
