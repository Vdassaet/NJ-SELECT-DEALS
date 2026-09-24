'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Eye, Check, AlertCircle } from 'lucide-react';
import { ProductItem } from '@/lib/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { QuickViewModal } from './QuickViewModal';

interface ProductCardProps {
  product: ProductItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const discount = calculateDiscount(product.price, product.salePrice);
  const isOutOfStock = product.inventory <= 0;
  const isLowStock = product.inventory > 0 && product.inventory <= product.lowStockThreshold;

  const fallbackImage = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';
  const initialImage =
    product.images && product.images.length > 0
      ? product.images.find((img) => img.isPrimary)?.url || product.images[0].url
      : fallbackImage;
  const [imgSrc, setImgSrc] = useState(initialImage);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage(null);
    setIsAdding(true);

    const result = addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      price: product.price,
      salePrice: product.salePrice,
      image: imgSrc,
      maxInventory: product.inventory,
    });

    setIsAdding(false);
    if (result.success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } else {
      setErrorMessage(result.message || 'Error');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleOpenQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-brand-500/40 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col overflow-hidden">
        
        {/* Top Badges & Image Container */}
        <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
          <Link href={`/products/${product.slug}`} className="block w-full h-full">
            <Image
              src={imgSrc}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onError={() => setImgSrc(fallbackImage)}
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </Link>

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {discount > 0 && (
              <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm">
                {discount}% OFF
              </span>
            )}
            {product.isBestSeller && (
              <span className="bg-amber-500 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wide">
                Best Seller
              </span>
            )}
            {product.isNewArrival && !product.isBestSeller && (
              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wide">
                New
              </span>
            )}
          </div>

          {/* Quick View Button (hover reveal on desktop, always accessible) */}
          <div className="absolute inset-x-0 bottom-3 px-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={handleOpenQuickView}
              className="w-full py-2 bg-white/95 backdrop-blur hover:bg-white text-slate-800 text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Quick View</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Brand & Stock Status */}
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] truncate max-w-[60%]">
                {product.brand || 'NJ Select'}
              </span>

              {isOutOfStock ? (
                <span className="font-bold text-rose-600 text-[11px]">Out of Stock</span>
              ) : isLowStock ? (
                <span className="font-bold text-amber-700 text-[11px]">Only {product.inventory} left</span>
              ) : (
                <span className="font-semibold text-emerald-600 text-[11px]">In Stock</span>
              )}
            </div>

            {/* Product Name */}
            <Link
              href={`/products/${product.slug}`}
              className="block font-bold text-slate-900 text-sm hover:text-brand-600 transition-colors line-clamp-2 leading-snug"
              title={product.name}
            >
              {product.name}
            </Link>

            {/* Rating Stars */}
            <div className="flex items-center space-x-1 mt-1.5">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-slate-700">
                {(product.rating || 5.0).toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">
                ({product.reviewCount || 0})
              </span>
            </div>
          </div>

          {/* Pricing & Add to Cart Action */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-black text-slate-900">
                {formatPrice(product.salePrice ?? product.price)}
              </span>
              {product.salePrice && product.salePrice < product.price && (
                <span className="text-xs font-semibold text-slate-400 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
              {discount > 0 && (
                <span className="text-[11px] font-bold text-rose-600">
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* Error or Alert */}
            {errorMessage && (
              <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </p>
            )}

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className={`w-full mt-2.5 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                addedSuccess
                  ? 'bg-emerald-600 text-white'
                  : isOutOfStock
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white active:scale-[0.98]'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Cart!</span>
                </>
              ) : isOutOfStock ? (
                <span>Out of Stock</span>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
