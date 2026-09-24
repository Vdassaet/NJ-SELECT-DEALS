import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { Truck, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Shipping Policy & Delivery Rates | NJ Select Deals',
  description:
    'Learn about NJ Select Deals shipping speeds, carrier options (USPS, UPS, FedEx), free shipping thresholds over $50, and transit times direct from Paramus, NJ.',
  path: '/shipping',
});

export default function ShippingPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Shipping Policy', url: '/shipping' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Shipping Policy &amp; Delivery Information
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Fast, reliable direct fulfillment from our warehouse in Paramus, New Jersey.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-lg font-black text-slate-900">Standard Delivery &amp; Free Shipping</h2>
          <p>
            We take pride in fast order handling. Qualified orders with a subtotal of <strong>$50.00 or more</strong> receive <strong>FREE Standard Ground Shipping</strong> anywhere within the contiguous United States. For orders below $50.00, standard flat-rate delivery is just $4.99.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="font-black text-slate-900 block">Same-Day Dispatch</span>
            <span className="text-xs text-slate-500">Orders placed by 2:00 PM EST</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="font-black text-slate-900 block">2–5 Business Days</span>
            <span className="text-xs text-slate-500">Typical nationwide transit</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="font-black text-slate-900 block">Verified Tracking</span>
            <span className="text-xs text-slate-500">USPS, UPS &amp; FedEx integration</span>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-lg font-black text-slate-900">Temperature-Sensitive Goods (Chocolates &amp; Creams)</h2>
          <p>
            During warm summer months, all chocolates and sensitive skincare items are packed with insulated bubble materials and temperature-control cooling pads to guarantee arrival in pristine condition.
          </p>
        </div>
      </div>
    </div>
  );
}
