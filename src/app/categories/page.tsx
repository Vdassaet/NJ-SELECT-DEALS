import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { generateSEOMetadata, generateBreadcrumbSchema } from '@/lib/seo';
import { Sparkles, ArrowRight, Package } from 'lucide-react';

export const revalidate = 3600;

export const metadata: Metadata = generateSEOMetadata({
  title: 'All Product Categories & Departments | NJ Select Deals',
  description:
    'Explore curated categories at NJ Select Deals. Hair Care & Shampoos, Skin Care & Creams, Luxury Chocolates, Sweet Candy, and Daily Essentials.',
  path: '/categories',
});

export default async function CategoriesPage() {
  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });
  } catch (error) {
    // Fallback categories during build prerendering or database unavailability
    categories = [
      { id: '1', name: 'Hair Care & Shampoos', slug: 'hair-care', description: 'Professional shampoos, conditioners, hair oils, and salon-grade restorative masks.', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80', _count: { products: 12 } },
      { id: '2', name: 'Skin Care & Creams', slug: 'skin-care', description: 'Nourishing face creams, hydrating serums, moisturizers, and organic botanical body butters.', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80', _count: { products: 10 } },
      { id: '3', name: 'Beauty & Cosmetics', slug: 'beauty', description: 'Premium cosmetics, gentle cleansers, toners, and beauty care treatments.', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80', _count: { products: 8 } },
      { id: '4', name: 'Gourmet Chocolates', slug: 'chocolate', description: 'Artisanal dark chocolates, European truffles, pralines, and confectioner cocoa selections.', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&auto=format&fit=crop&q=80', _count: { products: 14 } },
      { id: '5', name: 'Candy & Sweets', slug: 'candy', description: 'Gourmet gummy candies, hard candies, fruit chews, and nostalgic sweet treats.', image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800&auto=format&fit=crop&q=80', _count: { products: 9 } },
      { id: '6', name: 'Personal Care Essentials', slug: 'personal-care', description: 'Everyday hygiene essentials, organic hand soaps, lip balms, and bath salts.', image: 'https://images.unsplash.com/photo-1608248597359-bb4741490216?w=800&auto=format&fit=crop&q=80', _count: { products: 11 } },
    ];
  }

  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ]);

  return (
    <div className="store-container py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center space-x-1.5 bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Shop by Department</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Browse Store Categories
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Discover handpicked personal care essentials, imported chocolates, and hair products shipped direct from New Jersey.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-brand-500 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <Image
                  src={
                    cat.image ||
                    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'
                  }
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                  {cat.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {cat.description || `Explore our premium collection of authentic ${cat.name.toLowerCase()} products.`}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>{cat._count.products} Products</span>
              </span>
              <span className="font-black text-brand-600 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
