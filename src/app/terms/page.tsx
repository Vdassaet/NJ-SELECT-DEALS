import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { sanitizeJsonLd } from '@/lib/security-client';

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
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbs) }}
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

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">4. Returns, Refunds &amp; Final Sale Merchandise</h2>
          <p>
            NJ Select Deals sells liquid goods, beauty products, cosmetics, personal care, hair care, food, candy, chocolate, and other consumable or hygiene-sensitive products. For sanitary, health, and consumer safety reasons, these items are strictly <strong>Final Sale and Non-Returnable</strong> once dispatched from our warehouse.
          </p>
          <p>
            We do not accept returns or issue refunds due to change of mind, customer ordering mistakes, or subjective dissatisfaction with scent, flavor, or texture. For comprehensive details, please review our full <a href="/returns" className="text-brand-600 font-bold hover:underline">Return &amp; Refund Policy</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">5. Damaged, Defective, or Incorrect Shipments</h2>
          <p>
            If a product arrives materially damaged, leaking, broken, defective, or incorrect, the customer must notify NJ Select Deals at <a href="mailto:support@njselectdeals.com" className="text-brand-600 font-bold hover:underline">support@njselectdeals.com</a> within <strong>48 hours of carrier delivery</strong>. Mandatory clear photographs of the damaged product, interior packaging, outer shipping carton, and the legible carrier shipping label must be provided. Original packaging must be retained until the investigation is complete. NJ Select Deals will review the claim and, where appropriate at its discretion, may offer a replacement, store credit, or refund. Refunds are not automatically guaranteed.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">6. Order Cancellations &amp; Delivery Address Accuracy</h2>
          <p>
            Customers are responsible for providing complete, accurate delivery addresses and confirming item details prior to checkout. Refused deliveries, failed delivery attempts, or packages returned due to incorrect addresses provided by the customer do not qualify for automatic refunds. Orders may only be cancelled prior to entering warehouse processing or fulfillment; once an order has entered fulfillment or has shipped, it cannot be cancelled or recalled.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">7. Statutory Rights &amp; Legal Compliance</h2>
          <p>
            Nothing in these Terms or in our store policies is intended to limit any rights or remedies that cannot legally be excluded or limited under applicable federal, state, or local law.
          </p>
        </section>
      </div>
    </div>
  );
}
