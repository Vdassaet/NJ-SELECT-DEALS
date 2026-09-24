'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  ShoppingCart, 
  ShieldCheck, 
  Truck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    subtotal, 
    discountTotal, 
    shippingEstimate, 
    orderTotal,
    freeShippingThreshold 
  } = useCart();

  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  if (items.length === 0) {
    return (
      <div className="store-container py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400 mb-6">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Shopping Cart is Empty</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Explore our store for high-quality shampoos, facial creams, luxury chocolates, and personal care essentials.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 mt-8 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-2xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="store-container py-10 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
        <p className="text-xs text-slate-500 mt-1">Review your selected items and proceed to secure checkout</p>
      </div>

      {/* Free Shipping Progress Meter */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-800">
            <Truck className="w-4 h-4 text-brand-600" />
            {amountNeededForFreeShipping > 0 ? (
              <span>
                Add <strong className="text-brand-600">{formatPrice(amountNeededForFreeShipping)}</strong> more to unlock <strong className="text-slate-900">FREE Standard Shipping</strong>!
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>You qualified for FREE Standard Shipping!</span>
              </span>
            )}
          </div>
          <span className="font-bold text-slate-500">{freeShippingProgress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      {/* Grid Layout: Cart Items List (8 cols) & Order Summary (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cart Items Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <span className="font-extrabold text-slate-900 text-sm">Items in Cart ({items.length})</span>
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
            >
              Clear Cart
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const effectivePrice =
                item.salePrice !== null && item.salePrice !== undefined && item.salePrice < item.price
                  ? item.salePrice
                  : item.price;
              const lineTotal = effectivePrice * item.quantity;
              const isAtMax = item.quantity >= item.maxInventory;

              return (
                <div key={`${item.id}-${item.variantId || 'default'}`} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Thumbnail & Name */}
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                      <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                    </div>

                    <div className="space-y-1">
                      {item.brand && (
                        <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                          {item.brand}
                        </span>
                      )}
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-bold text-sm text-slate-900 hover:text-brand-600 transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-xs text-slate-500">Option: {item.variantName}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {formatPrice(effectivePrice)} each
                        {item.salePrice && item.salePrice < item.price && (
                          <span className="ml-2 text-slate-400 line-through text-[11px]">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper (Bounded by inventory) */}
                  <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-6">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-900 w-9 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                          disabled={isAtMax}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-30 text-xs font-bold"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {isAtMax && (
                        <span className="text-[10px] text-amber-600 font-semibold mt-1">
                          Max stock reached
                        </span>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        {formatPrice(lineTotal)}
                      </span>
                    </div>

                    {/* Remove item */}
                    <button
                      onClick={() => removeItem(item.id, item.variantId)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/products"
              className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-brand-600"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900 pb-3 border-b border-slate-100">
            Order Summary
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex items-center justify-between text-rose-600 font-medium">
                <span>Promotional Savings</span>
                <span className="font-bold">-{formatPrice(discountTotal)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-600">
              <span>Estimated Shipping</span>
              <span className="font-bold text-slate-900">
                {shippingEstimate === 0 ? (
                  <span className="text-emerald-700 uppercase font-black tracking-wider">Free</span>
                ) : (
                  formatPrice(shippingEstimate)
                )}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3 flex items-baseline justify-between">
              <span className="text-sm font-black text-slate-900">Estimated Total</span>
              <span className="text-2xl font-black text-slate-900">{formatPrice(orderTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/checkout')}
            className="w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 transition-all"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Trust badges */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Direct store inventory guaranteed authentic</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-brand-600" />
              <span>Fast shipping from New Jersey facility</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
