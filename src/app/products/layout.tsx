import { Metadata } from 'next';
import { generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'All Products & Daily Deals | NJ Select Deals',
  description:
    'Browse the complete NJ Select Deals catalog. Authentic shampoos, personal care products, conditioners, skincare creams, artisanal chocolates, and confectionery.',
  path: '/products',
});

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
