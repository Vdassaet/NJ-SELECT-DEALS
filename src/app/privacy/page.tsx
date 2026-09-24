import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy | NJ Select Deals',
  description:
    'Learn how NJ Select Deals protects customer personal data, processes secure payment transactions, and honors consumer privacy rights.',
  path: '/privacy',
});

export default function PrivacyPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Privacy Policy', url: '/privacy' },
  ]);

  return (
    <div className="store-container py-12 max-w-4xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500">Effective Date: January 1, 2026</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">1. Information We Collect</h2>
          <p>
            When you purchase from NJ Select Deals, we collect information necessary to fulfill your order, including your name, delivery address, phone number, and email address. We do not store full credit card numbers on our servers; payments are processed securely through certified PCI-DSS compliant gateways like Stripe.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">2. How We Use Your Information</h2>
          <p>
            Your information is used strictly to process transactions, dispatch shipments, send automated tracking notifications, prevent fraud, and provide customer support. We never sell, rent, or trade your personal information to third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-slate-900">3. Contacting Our Data Protection Team</h2>
          <p>
            For inquiries regarding your personal data or to request account deletion, please email <strong>privacy@njselectdeals.com</strong> or write to 100 Route 17 North, Paramus, NJ 07652.
          </p>
        </section>
      </div>
    </div>
  );
}
