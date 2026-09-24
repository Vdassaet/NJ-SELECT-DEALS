import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { StoreLayout } from '@/components/layout/StoreLayout';

import { generateSEOMetadata, generateOrganizationSchema, STORE_INFO, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NJ Select Deals | Quality Personal Care, Creams, Chocolates & Treats',
    template: '%s | NJ Select Deals',
  },
  description: STORE_INFO.description,
  keywords: [
    'NJ Select Deals',
    'shampoo',
    'hair care',
    'skin care',
    'creams',
    'chocolates',
    'candy',
    'personal care',
    'Paramus New Jersey',
    'authentic e-commerce',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'NJ Select Deals | Quality Personal Care, Creams, Chocolates & Treats',
    description: STORE_INFO.description,
    url: SITE_URL,
    siteName: STORE_INFO.name,
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: STORE_INFO.name,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NJ Select Deals | Quality Goods & Fast Express Delivery',
    description: STORE_INFO.description,
    images: [`${SITE_URL}/og-image.jpg`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationSchema()),
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <CartProvider>
          <StoreLayout>{children}</StoreLayout>
        </CartProvider>
      </body>
    </html>
  );
}
