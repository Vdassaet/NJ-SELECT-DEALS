import React from 'react';
import { Metadata } from 'next';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { HelpCircle, ChevronDown } from 'lucide-react';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Frequently Asked Questions (FAQ) | NJ Select Deals',
  description:
    'Find answers to common questions about shipping speeds, return policies, authentic product sourcing, order tracking, and payment security at NJ Select Deals.',
  path: '/faq',
});

const faqs = [
  {
    q: 'Are all products sold on NJ Select Deals authentic?',
    a: 'Yes, 100%. We operate as a direct single-store merchant with zero third-party sellers. All inventory is sourced directly from certified brand distributors and reputable manufacturers.',
  },
  {
    q: 'How fast will my order ship?',
    a: 'Orders placed before 2:00 PM EST Monday through Friday ship the same business day from our Paramus, NJ warehouse. Standard delivery takes 2 to 5 business days nationwide.',
  },
  {
    q: 'How do I qualify for Free Shipping?',
    a: 'All orders with a merchandise subtotal of $50 or higher automatically receive free standard ground shipping at checkout with no coupon code required.',
  },
  {
    q: 'What is your return policy?',
    a: 'We offer a 30-day money-back guarantee. If you are not satisfied with unopened or defective merchandise, simply reach out to support@njselectdeals.com to receive a prepaid return label and prompt refund.',
  },
  {
    q: 'How can I track my shipment?',
    a: 'As soon as your package is dispatched, we email you a confirmation notice with carrier details (USPS, UPS, FedEx) and a live tracking link. You can also view real-time tracking in your account order history.',
  },
];

export default function FAQPage() {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'FAQ', url: '/faq' },
  ]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <div className="store-container py-12 max-w-4xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Common questions regarding orders, authentic stock, shipping windows, and store policies.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2"
          >
            <h3 className="font-black text-slate-900 text-sm flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
