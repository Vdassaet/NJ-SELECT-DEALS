import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Award,
  ChevronRight,
  Mail,
  Percent
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/products/ProductCard';
import NewsletterForm from '@/components/layout/NewsletterForm';
import { HomepageFlashDeals } from '@/components/promotions/HomepageFlashDeals';

export const dynamic = 'force-dynamic';

async function getHomeData() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 8,
    });

    const featuredProducts = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 4,
      include: {
        images: true,
        category: true,
      },
    });

    const bestSellers = await prisma.product.findMany({
      where: { isActive: true, isBestSeller: true },
      take: 4,
      include: {
        images: true,
        category: true,
      },
    });

    const newArrivals = await prisma.product.findMany({
      where: { isActive: true, isNewArrival: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        category: true,
      },
    });

    const flashDeals = await prisma.product.findMany({
      where: { 
        isActive: true, 
        salePrice: { not: null } 
      },
      take: 4,
      include: {
        images: true,
        category: true,
      },
    });

    return {
      categories,
      featuredProducts,
      bestSellers,
      newArrivals,
      flashDeals,
    };
  } catch (error) {
    console.error('Home data load error:', error);
    return {
      categories: [],
      featuredProducts: [],
      bestSellers: [],
      newArrivals: [],
      flashDeals: [],
    };
  }
}

export default async function HomePage() {
  const data = await getHomeData();

  // Fallback initial categories for display if database has not been seeded yet
  const displayCategories = data.categories.length > 0 ? data.categories : [
    { name: 'Hair Care', slug: 'hair-care', image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80', description: 'Shampoos, conditioners & oils' },
    { name: 'Skin Care', slug: 'skin-care', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80', description: 'Hydrating creams & serums' },
    { name: 'Beauty', slug: 'beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80', description: 'Cosmetics & grooming' },
    { name: 'Chocolate', slug: 'chocolate', image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80', description: 'Artisanal bars & truffles' },
    { name: 'Candy', slug: 'candy', image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800&auto=format&fit=crop&q=80', description: 'Gummies, chews & sweets' },
    { name: 'Personal Care', slug: 'personal-care', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80', description: 'Body wash & essentials' },
    { name: 'Special Offers', slug: 'special-offers', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80', description: 'Exclusive bundle savings' },
    { name: 'New Arrivals', slug: 'new-arrivals', image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop&q=80', description: 'Freshly stocked items' },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative bg-zinc-950 text-white overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="store-container py-16 sm:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold px-3.5 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>NJ SELECT DEALS • DIRECT ONLINE STORE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
                Quality Products <br />
                <span className="text-zinc-400">
                  Delivered to Your Door
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
                Discover our curated selection of premium hair care, nourishing skin creams, authentic cosmetics, gourmet chocolates, and sweet treats with fast, reliable delivery.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/products"
                  className="px-8 py-4 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm sm:text-base rounded-2xl flex items-center space-x-3 transition-all"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/products?category=special-offers"
                  className="px-6 py-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-bold text-sm sm:text-base rounded-2xl border border-slate-700 transition-colors"
                >
                  View Special Offers
                </Link>
              </div>

              {/* Badges strip */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-brand-400" />
                  <span>Free shipping $50+</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-brand-400" />
                  <span>100% Genuine goods</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-brand-400" />
                  <span>Direct fulfillment</span>
                </div>
              </div>
            </div>

            {/* Right Hero Feature Graphic */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative mx-auto max-w-md">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                  <Image
                    src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80"
                    alt="Quality personal care and beauty products"
                    fill
                    sizes="500px"
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  
                  {/* Floating Promo Card */}
                  <div className="absolute bottom-6 inset-x-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-100 flex items-center justify-between text-slate-900">
                    <div>
                      <span className="text-[11px] font-black uppercase text-rose-600 tracking-wider block">Special Promo</span>
                      <span className="text-base font-extrabold block">Personal Care & Treats</span>
                      <span className="text-xs text-slate-500">Starting from $4.99</span>
                    </div>
                    <Link
                      href="/products"
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Browse
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Categories Showcase Grid */}
      <section className="store-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Explore Our Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Carefully categorized everyday essentials, beauty care, and confectionery
            </p>
          </div>
          <Link
            href="/products"
            className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-brand-500/50 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                <Image
                  src={category.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-extrabold text-base leading-tight drop-shadow-sm group-hover:text-brand-300 transition-colors">
                    {category.name}
                  </h3>
                </div>
              </div>
              <div className="p-3 bg-white flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">{category.description || 'Quality selection'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Flash Deals / Special Offers Showcase */}
      <HomepageFlashDeals />

      {/* 4. Featured Products Section */}
      <section className="store-container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-100 text-brand-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Featured Products</h2>
              <p className="text-xs text-slate-500">Hand-picked highlights from our direct inventory</p>
            </div>
          </div>
          <Link
            href="/products?featured=true"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {data.featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.featuredProducts.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <p className="text-slate-500 text-sm font-semibold">
              No featured products configured yet. The store owner can flag products as &quot;Featured&quot; from the Admin Dashboard.
            </p>
            <Link
              href="/products"
              className="inline-block mt-4 px-5 py-2.5 bg-brand-600 text-white font-bold text-xs rounded-xl"
            >
              Browse Catalog
            </Link>
          </div>
        )}
      </section>

      {/* 5. Best Sellers & New Arrivals Dual Section */}
      <section className="store-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Best Sellers */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <h3 className="text-xl font-black text-slate-900">Best Sellers</h3>
                </div>
                <Link
                  href="/products?sort=best_selling"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                >
                  <span>More</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data.bestSellers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.bestSellers.map((prod: any) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Best seller items will populate here as products are ordered and flagged by the admin.
                </p>
              )}
            </div>
          </div>

          {/* New Arrivals */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-xl font-black text-slate-900">New Arrivals</h3>
                </div>
                <Link
                  href="/products?sort=newest"
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                >
                  <span>More</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data.newArrivals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.newArrivals.map((prod: any) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Newly added inventory items will appear here automatically.
                </p>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 6. Newsletter Signup Section */}
      <section className="store-container">
        <div className="bg-zinc-950 text-white rounded-3xl p-8 sm:p-12 shadow-sm border border-zinc-800 relative overflow-hidden">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Mail className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Stay in the Loop on Deals & Restocks
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Subscribe to the NJ Select Deals newsletter for first-look notifications on new personal care shipments, limited chocolates, and exclusive promotions.
            </p>

            <NewsletterForm />

            <p className="text-[11px] text-slate-500">
              Zero spam. Unsubscribe at any time with a single click.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
