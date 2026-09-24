'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Star, ShoppingCart, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { ProductItem } from '@/lib/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

interface QuickViewModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedImageIndex(0);
      setAddedMessage(null);
      setErrorMessage(null);
    }
  }, [product]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const discount = calculateDiscount(product.price, product.salePrice);
  const isOutOfStock = product.inventory <= 0;
  const isLowStock = product.inventory > 0 && product.inventory <= product.lowStockThreshold;

  const images = product.images && product.images.length > 0
    ? product.images.map(img => img.url)
    : ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'];

  const currentImage = images[selectedImageIndex] || images[0];

  const handleAddToCart = () => {
    setErrorMessage(null);
    setAddedMessage(null);

    const result = addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        price: product.price,
        salePrice: product.salePrice,
        image: currentImage,
        maxInventory: product.inventory,
      },
      quantity
    );

    if (result.success) {
      setAddedMessage('Added to cart!');
      setTimeout(() => setAddedMessage(null), 3000);
    } else {
      setErrorMessage(result.message || 'Could not add to cart.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl z-10 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Media Column */}
        <div className="md:w-1/2 p-6 bg-slate-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white shadow-inner">
            <Image
              src={currentImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />

            {discount > 0 && (
              <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex space-x-2 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="60px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Column */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {product.brand && (
              <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">
                {product.brand}
              </p>
            )}

            <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
              {product.name}
            </h3>

            {/* Rating */}
            <div className="flex items-center space-x-2 mt-2">
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
              <span className="text-xs font-semibold text-slate-700">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-slate-400">({product.reviewCount || 0} reviews)</span>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-2xl font-black text-slate-900">
                {formatPrice(product.salePrice ?? product.price)}
              </span>
              {product.salePrice && product.salePrice < product.price && (
                <span className="text-sm font-semibold text-slate-400 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Stock Status Badge */}
            <div className="mt-3">
              {isOutOfStock ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Only {product.inventory} left in stock - order soon
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  In Stock ({product.inventory} available)
                </span>
              )}
            </div>

            {/* Description snippet */}
            <p className="mt-4 text-xs text-slate-600 line-clamp-3 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Action Box */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
            {!isOutOfStock && (
              <div className="flex items-center space-x-4">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.inventory, quantity + 1))}
                    disabled={quantity >= product.inventory}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {addedMessage && (
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>{addedMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-500/10 flex items-center justify-center space-x-2 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
              </button>

              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="View full product page"
              >
                <ExternalLink className="w-5 h-5" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
