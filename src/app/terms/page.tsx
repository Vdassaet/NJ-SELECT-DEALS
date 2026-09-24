import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Terms of Service | NJ Select Deals',
  description:
    'Review the Terms of Service governing purchases, product pricing, orders, and site usage on the official NJ Select Deals store.',
  path: '/terms',
});

export default function TermsPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Terms of Service', url: '/terms' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-500">Effective Date: January 1, 2026</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or ordering from NJ Select Deals, you agree to be bound by these Terms of Service and all applicable federal and state laws of New Jersey.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">2. Products and Pricing</h2>
          <p>
            All products listed on NJ Select Deals are subject to availability. We strive for extreme pricing accuracy; in the event of an inadvertent technical error, we reserve the right to cancel or adjust affected orders prior to shipment.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">3. Verified Customer Reviews</h2>
          <p>
            To uphold the integrity of our customer community, product reviews can only be submitted by verified purchasers of that specific item. Reviews containing abusive language or irrelevant advertising are subject to moderation and removal.
          </p>
        </section>
      </div>
    </div>
  );
}
