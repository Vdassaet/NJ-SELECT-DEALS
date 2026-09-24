'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Star, 
  ShoppingCart, 
  Zap, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  AlertCircle,
  PackageOpen,
  ArrowLeft
} from 'lucide-react';
import { ProductItem } from '@/lib/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/products/ProductCard';
import { CountdownTimer } from '@/components/promotions/CountdownTimer';
import { ProductReviewsSection } from '@/components/reviews/ProductReviewsSection';
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { Sparkles, Flame, Tag } from 'lucide-react';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([]);
  const [frequentlyBoughtTogether, setFrequentlyBoughtTogether] = useState<ProductItem[]>([]);
  const [customersAlsoBought, setCustomersAlsoBought] = useState<ProductItem[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductItem[]>([]);
  const [isFlashExpired, setIsFlashExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shipping' | 'returns'>('shipping');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          setPromotions(data.promotions || []);
          setRelatedProducts(data.relatedProducts || []);
          setFrequentlyBoughtTogether(data.frequentlyBoughtTogether || []);
          setCustomersAlsoBought(data.customersAlsoBought || []);
          setRecommendedProducts(data.recommendedProducts || []);
          if (data.product.variants && data.product.variants.length > 0) {
            setSelectedVariantId(data.product.variants[0].id);
          }
        }
      } catch (e) {
        console.error('Error fetching product', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="store-container py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-lg mx-auto">
          <div className="h-8 bg-slate-200 rounded w-1/2 mx-auto" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="store-container py-20 text-center">
        <PackageOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-slate-900">Product Not Found</h1>
        <p className="text-xs text-slate-500 mt-2">The product you are looking for does not exist or has been retired.</p>
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 mt-6 px-6 py-3 bg-brand-600 text-white font-bold text-xs rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Catalog</span>
        </Link>
      </div>
    );
  }

  const discount = calculateDiscount(product.price, product.salePrice);
  const isOutOfStock = product.inventory <= 0;
  const isLowStock = product.inventory > 0 && product.inventory <= product.lowStockThreshold;

  // Check active promotions
  const flashSalePromo = !isFlashExpired ? promotions.find((p) => p.type === 'FLASH_SALE' || p.isFlashSale) : null;
  const tieredPromo = promotions.find((p) => (p.type === 'TIERED_VOLUME' || (Array.isArray(p.tieredRules) && p.tieredRules.length > 0)) && !p.isFlashSale);
  const bogoPromo = promotions.find((p) => p.type === 'BUY_X_GET_Y');

  // Normalize tiered rules to use consistent { minQty, discountPercent } shape
  const normalizedTieredRules = tieredPromo?.tieredRules?.map((r: any) => ({
    minQty: r.minQty ?? r.quantity ?? r.min_qty ?? 2,
    discountPercent: r.discountPercent ?? r.discount_percent ?? r.discount ?? 0,
  }));

  // Compute active tiered volume rule for current quantity
  const activeTier = normalizedTieredRules
    ?.slice()
    ?.sort((a: any, b: any) => b.minQty - a.minQty)
    ?.find((t: any) => quantity >= t.minQty);

  // Compute current display price
  let currentUnitPrice = product.price;
  let originalUnitPrice = product.price;
  let activeDiscountPercent = 0;

  if (flashSalePromo) {
    if (flashSalePromo.discountValue) {
      activeDiscountPercent = flashSalePromo.discountValue;
      currentUnitPrice = Math.round(product.price * (1 - flashSalePromo.discountValue / 100) * 100) / 100;
    } else if (flashSalePromo.salePrice != null && flashSalePromo.salePrice < product.price) {
      currentUnitPrice = flashSalePromo.salePrice;
      activeDiscountPercent = Math.round(((product.price - flashSalePromo.salePrice) / product.price) * 100);
    }
  } else if (activeTier) {
    activeDiscountPercent = activeTier.discountPercent;
    currentUnitPrice = Math.round(product.price * (1 - activeTier.discountPercent / 100) * 100) / 100;
  } else if (product.salePrice != null && product.salePrice < product.price) {
    currentUnitPrice = product.salePrice;
    activeDiscountPercent = Math.round(((product.price - product.salePrice) / product.price) * 100);
  }

  const images =
    product.images && product.images.length > 0
      ? product.images.map((i) => i.url)
      : ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'];

  const currentImage = images[selectedImageIndex] || images[0];

  const handleAddToCart = () => {
    setNotification(null);

    const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);

    const result = addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        price: selectedVariant?.price ?? product.price,
        salePrice: currentUnitPrice < (selectedVariant?.price ?? product.price) ? currentUnitPrice : product.salePrice,
        image: currentImage,
        maxInventory: selectedVariant ? selectedVariant.inventory : product.inventory,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.name,
      },
      quantity
    );

    if (result.success) {
      setNotification({ type: 'success', message: 'Added to your shopping cart!' });
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({ type: 'error', message: result.message || 'Could not add to cart.' });
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  const productSchema = generateProductSchema({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    sku: product.sku,
    brand: product.brand,
    price: product.price,
    salePrice: product.salePrice,
    inventory: product.inventory,
    rating: product.rating,
    reviewCount: product.reviewCount,
    images: product.images,
    category: product.category,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    ...(product.category
      ? [{ name: product.category.name, url: `/products?category=${product.category.slug}` }]
      : []),
    { name: product.name, url: `/products/${product.slug}` },
  ]);

  return (
    <div className="store-container py-8 space-y-12">
      {/* Product & Breadcrumb Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/products" className="hover:text-slate-900 transition-colors">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-slate-900 transition-colors">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left: Image Gallery (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
            <Image
              src={currentImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
              className="object-cover"
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-brand-600 ring-4 ring-brand-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Purchase Box (7 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {product.brand && (
              <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">
                {product.brand}
              </p>
            )}
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">SKU: <span className="font-mono text-slate-600">{product.sku}</span></p>

            {/* Rating */}
            <div className="flex items-center space-x-2 mt-3">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-800">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-slate-400">({product.reviewCount || 0} customer reviews)</span>
            </div>
          </div>

          {/* ⚡ FLASH SALE BANNER WITH LIVE COUNTDOWN */}
          {flashSalePromo && (
            <div className="bg-zinc-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-zinc-800 rounded-xl">
                  <Flame className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">
                    ⚡ FLASH SALE
                  </span>
                  <h4 className="text-base font-black leading-tight">
                    {flashSalePromo.bannerText || `${flashSalePromo.discountValue}% OFF LIMITED TIME`}
                  </h4>
                </div>
              </div>
              {flashSalePromo.endDate && (
                <div className="bg-black/40 backdrop-blur px-3.5 py-1.5 rounded-xl border border-white/15 self-start sm:self-auto">
                  <CountdownTimer
                    targetDate={flashSalePromo.endDate}
                    label="Ends in"
                    onExpire={() => setIsFlashExpired(true)}
                    variant="compact"
                    className="text-amber-300"
                  />
                </div>
              )}
            </div>
          )}

          {/* Price Box with "Was $..." & "% OFF" */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-baseline space-x-3">
            <span className="text-3xl font-black text-slate-900">
              {formatPrice(currentUnitPrice)}
            </span>
            {currentUnitPrice < originalUnitPrice && (
              <span className="text-base font-semibold text-slate-400 line-through">
                Was {formatPrice(originalUnitPrice)}
              </span>
            )}
            {activeDiscountPercent > 0 && (
              <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                {activeDiscountPercent}% OFF
              </span>
            )}
          </div>

          {/* SPECIAL OFFER: Buy 2 — Save 10%, Buy 3 — Save 15% */}
          {tieredPromo && normalizedTieredRules && normalizedTieredRules.length > 0 && (
            <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>SPECIAL OFFER</span>
                </span>
                <span className="text-[11px] text-amber-700 font-semibold">Volume Savings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {normalizedTieredRules.map((rule: any, idx: number) => {
                  const isCurrent = quantity >= rule.minQty;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuantity(rule.minQty)}
                      className={`p-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/30'
                          : 'bg-white/80 border-amber-200/60 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span>Buy {rule.minQty} — Save {rule.discountPercent}%</span>
                      {isCurrent ? (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded-full">
                          Applied
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold">Select</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BUY X GET Y SPECIAL OFFER */}
          {bogoPromo && (
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center space-x-2.5 shadow-sm">
              <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Buy {bogoPromo.buyQuantity} Get {bogoPromo.getQuantity}{' '}
                {bogoPromo.getDiscountPercent === 100 ? 'FREE' : `${bogoPromo.getDiscountPercent}% OFF`}!
              </span>
            </div>
          )}

          {/* Stock Availability */}
          <div>
            {isOutOfStock ? (
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4" />
                <span>Out of Stock</span>
              </div>
            ) : isLowStock ? (
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4" />
                <span>Low Stock - Only {product.inventory} remaining</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>In Stock & Ready to Ship ({product.inventory} available)</span>
              </div>
            )}
          </div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Select Option / Size:
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedVariantId === v.id
                        ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {v.name} {v.price && `(${formatPrice(v.price)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Stepper (Strictly inventory-bounded) */}
          {!isOutOfStock && (
            <div className="flex items-center space-x-4">
              <span className="text-xs font-bold text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 font-bold"
                >
                  -
                </button>
                <span className="px-4 py-2 text-xs font-extrabold text-slate-900 w-12 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.inventory, quantity + 1))}
                  disabled={quantity >= product.inventory}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-400">
                (Max {product.inventory})
              </span>
            </div>
          )}

          {/* Notification banner */}
          {notification && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 py-4 px-6 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex-1 py-4 px-6 bg-white hover:bg-zinc-50 disabled:bg-zinc-200 disabled:text-zinc-400 text-zinc-900 font-bold text-sm rounded-2xl border border-zinc-200 flex items-center justify-center space-x-2 transition-all"
            >
              <Zap className="w-5 h-5 text-zinc-900" />
              <span>Buy Now</span>
            </button>
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Shipping and Return Information Accordion/Tabs */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('shipping')}
                className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center space-x-2 border-b-2 transition-colors ${
                  activeTab === 'shipping'
                    ? 'border-brand-600 text-brand-700 bg-brand-50/50'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Shipping Information</span>
              </button>
              <button
                onClick={() => setActiveTab('returns')}
                className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center space-x-2 border-b-2 transition-colors ${
                  activeTab === 'returns'
                    ? 'border-brand-600 text-brand-700 bg-brand-50/50'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Return Policy</span>
              </button>
            </div>

            <div className="p-4 text-xs text-slate-600 leading-relaxed">
              {activeTab === 'shipping' ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Direct Express Shipping from New Jersey:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500">
                    <li>Orders placed before 2:00 PM EST ship the same business day.</li>
                    <li><strong>FREE Standard Shipping</strong> on all orders over $50.</li>
                    <li>Standard flat-rate delivery is $4.99 for orders under $50.</li>
                    <li>Carefully packaged in climate-controlled materials for chocolates and liquids.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">30-Day Money-Back Guarantee:</p>
                  <p className="text-slate-500">
                    If you are not 100% satisfied with your order, return unopened items within 30 days of delivery for a prompt full refund. For damaged or defective goods, contact our support team at support@njselectdeals.com.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Customer Reviews & Ratings Section */}
      <ProductReviewsSection productId={product.id} productName={product.name} />

      {/* 1. Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-600">
                  Related Products
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Similar Items in {product.category?.name || 'Store'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Curated essentials to complete your routine
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Frequently Bought Together */}
      {frequentlyBoughtTogether.length > 0 && (
        <section className="pt-12 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-600">
                  Frequently Bought Together
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Customers Often Bundle With This
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Popular pairings based on store orders and shopper habits
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {frequentlyBoughtTogether.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Customers Also Bought */}
      {customersAlsoBought.length > 0 && (
        <section className="pt-12 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-black uppercase tracking-wider text-brand-700">
                  Customers Also Bought
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Top Picks from {product.brand || 'Our Catalog'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Discover what other shoppers with similar taste are purchasing
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {customersAlsoBought.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Recommended Products */}
      {recommendedProducts.length > 0 && (
        <section className="pt-12 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-600">
                  Recommended For You
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Top Rated &amp; Best Sellers
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Highly rated favorites across all categories
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
