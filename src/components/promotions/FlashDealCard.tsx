'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Flame, Check, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { CountdownTimer } from './CountdownTimer';

export interface FlashDealItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand?: string | null;
  price: number;
  salePrice: number;
  discountPercent: number;
  stockRemaining: number;
  flashStockCap?: number;
  image: string;
  category?: string;
  promotionId: string;
  promotionName: string;
  bannerText?: string | null;
  endDate?: string | null;
}

export function FlashDealCard({ deal }: { deal: FlashDealItem }) {
  const { addItem } = useCart();
  const [isExpired, setIsExpired] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const displayPrice = isExpired ? deal.price : deal.salePrice;
  const isOutOfStock = deal.stockRemaining <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;

    const result = addItem({
      id: deal.id,
      name: deal.name,
      slug: deal.slug,
      brand: deal.brand || null,
      price: deal.price,
      salePrice: isExpired ? null : deal.salePrice,
      image: deal.image,
      maxInventory: deal.stockRemaining,
    });

    if (result.success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative">
      {/* Top Banner with Countdown */}
      {deal.endDate && !isExpired && (
        <div className="bg-slate-950 text-white px-3.5 py-2 flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center space-x-1.5 font-bold text-amber-400">
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider">Flash Deal</span>
          </div>
          <CountdownTimer
            targetDate={deal.endDate}
            label="Ends in"
            onExpire={() => setIsExpired(true)}
            variant="compact"
            className="text-amber-300 font-mono"
          />
        </div>
      )}

      {/* Product Image */}
      <Link href={`/products/${deal.slug}`} className="relative aspect-square overflow-hidden bg-slate-50 block">
        <Image
          src={deal.image}
          alt={deal.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge */}
        {!isExpired && deal.discountPercent > 0 && (
          <div className="absolute top-3 left-3 bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
            {deal.discountPercent}% OFF
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-rose-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {deal.category && (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              {deal.category}
            </span>
          )}

          <Link
            href={`/products/${deal.slug}`}
            className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 hover:text-brand-600 transition-colors"
          >
            {deal.name}
          </Link>

          {/* Pricing */}
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {formatPrice(displayPrice)}
            </span>
            {!isExpired && deal.salePrice < deal.price && (
              <span className="text-xs text-slate-400 line-through">
                Was {formatPrice(deal.price)}
              </span>
            )}
          </div>

          {/* Stock Remaining Indicator */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500">Stock Remaining:</span>
              <span className={deal.stockRemaining <= 3 ? 'text-rose-600' : 'text-slate-800'}>
                {deal.stockRemaining > 0 ? `${deal.stockRemaining} units left` : 'Sold Out'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  deal.stockRemaining <= 3 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(10, (deal.stockRemaining / 20) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm ${
            isOutOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : isAdded
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 active:scale-[0.98]'
          }`}
        >
          {isAdded ? (
            <>
              <Check className="w-4 h-4" />
              <span>Added to Cart!</span>
            </>
          ) : isOutOfStock ? (
            <span>Out of Stock</span>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
