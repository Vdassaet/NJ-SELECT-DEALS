import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema, STORE_INFO } from '@/lib/seo';
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Contact Us & Customer Support | NJ Select Deals',
  description:
    'Contact NJ Select Deals customer support. Reach out for order inquiries, returns, shipping assistance, or product recommendations. Located in Paramus, New Jersey.',
  path: '/contact',
});

export default function ContactPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contact Us', url: '/contact' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Contact Customer Care
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          We are here to assist with tracking updates, order adjustments, and product questions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">Email Support</h3>
          <p className="text-xs text-slate-500">Fast replies within 2-4 hours</p>
          <a
            href="mailto:support@njselectdeals.com"
            className="text-xs font-bold text-brand-600 hover:underline block"
          >
            support@njselectdeals.com
          </a>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
            <Phone className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">Phone Line</h3>
          <p className="text-xs text-slate-500">Mon-Fri 9:00 AM – 6:00 PM EST</p>
          <a
            href="tel:18005553325"
            className="text-xs font-bold text-brand-600 hover:underline block"
          >
            (800) 555-DEAL
          </a>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">Warehouse Location</h3>
          <p className="text-xs text-slate-500">Paramus Distribution Center</p>
          <span className="text-xs text-slate-700 font-semibold block">
            100 Route 17 North, Paramus, NJ
          </span>
        </div>
      </div>
    </div>
  );
}
