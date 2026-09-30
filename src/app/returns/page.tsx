import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { sanitizeJsonLd } from '@/lib/security-client';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  Clock, 
  Ban, 
  PackageCheck, 
  FileText, 
  Mail, 
  Phone,
  HelpCircle,
  Truck
} from 'lucide-react';

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
          At NJ Select Deals, we take consumer safety, hygiene, and product integrity seriously. Please review our policy regarding returns, refunds, damaged shipments, and order cancellations below.
        </p>
        <p className="text-[11px] font-semibold text-slate-400">
          Last Updated: September 2026 • Passaic, New Jersey
        </p>
      </div>

      {/* Policy Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        
        {/* Important Notice Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start space-x-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-black text-amber-900 uppercase tracking-wide">
              Health, Safety &amp; Hygiene Standards Notice
            </h3>
            <p className="text-amber-800 leading-relaxed">
              NJ Select Deals sells liquid products, cosmetics, personal care, beauty, hair care, confectionery, chocolates, food, and other hygiene-sensitive goods. For health, safety, contamination-prevention, and sanitary reasons, <strong>these products cannot reasonably or legally be resold once they leave our fulfillment facility</strong>. Consequently, general returns and subjective refunds are strictly limited.
            </p>
          </div>
        </div>

        {/* 1. No General Returns */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Ban className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              1. No General Returns
            </h2>
          </div>
          <p>
            NJ Select Deals does <strong>not</strong> offer a general return policy. We do not accept returns or issue refunds simply because a customer:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 text-xs">
            <li>Changed their mind after placing an order or receiving a delivery.</li>
            <li>Ordered the wrong product, quantity, size, flavor, scent, or variation.</li>
            <li>No longer wants or needs the product.</li>
            <li>Is subjectively dissatisfied with taste, fragrance, texture, color, or cosmetic results for non-defective reasons.</li>
            <li>Found an item elsewhere at a different price.</li>
          </ul>
        </section>

        {/* 2. Final Sale & Non-Returnable Products */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              2. Final Sale &amp; Non-Returnable Products
            </h2>
          </div>
          <p>
            Except where explicitly required by applicable law, the following categories are strictly <strong>Final Sale and Non-Returnable</strong> once dispatched:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">Personal Care &amp; Hygiene</span>
              <p className="text-[11px] text-slate-500">
                Body washes, soaps, oral care, lotions, creams, sanitizers, and personal wellness items.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">Beauty, Hair &amp; Cosmetics</span>
              <p className="text-[11px] text-slate-500">
                Shampoos, conditioners, hair treatments, makeup, skincare serums, and cosmetics.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">Food &amp; Confectionery</span>
              <p className="text-[11px] text-slate-500">
                Chocolates, candies, snacks, beverages, and all perishable or consumable goods.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 text-xs block">Opened or Unsealed Goods</span>
              <p className="text-[11px] text-slate-500">
                Any item with broken manufacturer seals, removed shrink-wrap, or evidence of handling/use.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Damaged or Leaking Shipments */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Camera className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              3. Damaged, Leaking, or Broken Products (48-Hour Claim Window)
            </h2>
          </div>
          <p>
            We package all fragile bottles, liquids, and confectioneries with extreme care. However, if your package suffers material transit damage, leaking, or breakage:
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Strict 48-Hour Notification Window:</span>
            </div>
            <p className="text-slate-600">
              You must contact NJ Select Deals at <strong>njselectdeals@gmail.com</strong> within <strong>48 hours of carrier delivery</strong> (as recorded by carrier tracking timestamps). Claims submitted after 48 hours cannot be accepted.
            </p>
            <p className="font-bold text-slate-800 pt-1">Mandatory Photographic Evidence Required:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Clear photo of the damaged or leaking product showing the issue.</li>
              <li>Clear photo of the exterior shipping box showing any crushing, moisture, or puncture.</li>
              <li>Clear photo of the carrier shipping label showing the tracking number legible.</li>
              <li>Clear photo of all interior packaging materials (bubble wrap, air pillows, etc.).</li>
            </ul>
            <p className="text-slate-600 pt-1">
              <strong>Important:</strong> Customers must retain the original shipping box, inner packaging, and damaged merchandise until the claim review has been completed. Discarding packaging prior to claim resolution will result in claim denial.
            </p>
          </div>
          <p className="text-xs text-slate-600">
            NJ Select Deals will review each damage claim individually. At its sole discretion and as appropriate based on the facts, NJ Select Deals may provide a <strong>replacement product, store credit, or a refund</strong>. Submitting a claim does not automatically guarantee a cash refund.
          </p>
        </section>

        {/* 4. Wrong Product Shipped */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <PackageCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              4. Incorrect Product Shipped
            </h2>
          </div>
          <p>
            If you believe you received an incorrect item differing from your order confirmation:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 text-xs">
            <li>You must contact our customer support team within <strong>48 hours of delivery</strong>.</li>
            <li>You must provide photographs of the received item showing the product name, barcode/UPC, and the shipping label.</li>
            <li>The incorrect item must remain completely unopened, unused, and in its original sealed factory packaging.</li>
            <li>If our fulfillment logs confirm an incorrect item was dispatched, NJ Select Deals may provide a replacement, store credit, or refund as appropriate.</li>
          </ul>
        </section>

        {/* 5. Defective Products */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              5. Defective Products
            </h2>
          </div>
          <p>
            If an item contains a verified manufacturing defect (such as a broken pump mechanism upon arrival), you must notify support promptly with clear photographic or video evidence documenting the defect and proof of purchase.
          </p>
          <p className="text-xs text-slate-600">
            Defect claims are subject to verification. We do not automatically guarantee a cash refund. NJ Select Deals will determine the appropriate resolution based on the verified circumstances, including replacement, store credit, or refund, subject to applicable law.
          </p>
        </section>

        {/* 6. Customer Responsibility */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              6. Customer Responsibility &amp; Delivery Accuracy
            </h2>
          </div>
          <p>
            To avoid fulfillment issues, customers are responsible for:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 text-xs">
            <li>Carefully reading product descriptions, specifications, net weights, and ingredients prior to ordering.</li>
            <li>Confirming correct sizes, quantities, scents, colors, or product variations before submitting checkout.</li>
            <li>Providing an accurate, complete, and deliverable shipping address (including apartment, suite, or building numbers).</li>
            <li>Promptly receiving and inspecting packages upon delivery.</li>
          </ul>
          <p className="text-xs text-slate-600">
            <strong>Undeliverable or Refused Shipments:</strong> Packages returned to sender due to incorrect addresses provided by the customer, failed delivery attempts, refusal of delivery, or failure to collect from carrier hold locations do <strong>not</strong> qualify for an automatic refund. Reshipment fees or carrier return surcharges will apply.
          </p>
        </section>

        {/* 7. Order Cancellations */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              7. Order Cancellations
            </h2>
          </div>
          <p>
            Orders can only be cancelled <strong>prior to entering warehouse processing, fulfillment, packing, or dispatch</strong>. Because we strive to process and dispatch orders rapidly (orders placed before 2:00 PM EST frequently ship same-day), we cannot guarantee that a cancellation request can be processed in time.
          </p>
          <p className="text-xs text-slate-600">
            Once an order has entered processing or has been assigned a carrier tracking number, it cannot be cancelled or intercepted simply because of a change of mind.
          </p>
        </section>

        {/* 8. Refund Processing */}
        <section className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Clock className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              8. Refund Method &amp; Bank Timelines
            </h2>
          </div>
          <p>
            NJ Select Deals does not offer an unconditional 30-day money-back guarantee, nor does submitting an inquiry automatically guarantee a refund.
          </p>
          <p>
            In the event that a refund is formally approved by NJ Select Deals after investigation, it will be credited to the original payment method used at the time of purchase. Please note that banks, credit card issuers, and payment processors typically take <strong>3 to 7 business days</strong> to post the refund to your account statement. Original shipping charges are non-refundable.
          </p>
        </section>

        {/* 9. Legal Compliance */}
        <section className="space-y-3 pt-6 border-t border-slate-100 bg-slate-50/60 -mx-8 sm:-mx-10 -mb-8 sm:-mb-10 p-8 sm:p-10 rounded-b-3xl">
          <h2 className="text-base font-black text-slate-900">
            9. Applicable Law &amp; Statutory Rights
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Nothing in this policy is intended to limit any rights or remedies that cannot legally be excluded or limited under applicable federal, state, or local law. NJ Select Deals complies fully with applicable consumer protection statutes and payment provider regulations.
          </p>
          
          <div className="pt-4 border-t border-slate-200/80 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Customer Support Contact
            </h3>
            <p className="text-xs text-slate-600">
              To submit a claim regarding transit damage, wrong items, or defect inquiries within 48 hours of delivery, contact our official support desk:
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 pt-1">
              <div className="flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-brand-600" />
                <a href="mailto:njselectdeals@gmail.com" className="text-brand-600 hover:underline">
                  njselectdeals@gmail.com
                </a>
              </div>
              <div className="flex items-center space-x-1.5">
                <Phone className="w-4 h-4 text-brand-600" />
                <span></span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              NJ Select Deals LLC • Passaic, New Jersey, USA
            </p>
          </div>
        </section>

      </div>

      {/* Helpful Quick Links */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-4 px-2">
        <Link href="/terms" className="hover:text-slate-900 transition-colors">
          View Terms of Service →
        </Link>
        <Link href="/faq" className="hover:text-slate-900 transition-colors">
          Frequently Asked Questions →
        </Link>
        <Link href="/contact" className="hover:text-slate-900 transition-colors">
          Contact Customer Care →
        </Link>
      </div>

    </div>
  );
}
