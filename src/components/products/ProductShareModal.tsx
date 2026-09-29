'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  Mail, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface ShareableProduct {
  id?: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  brand?: string | null;
  images?: { url: string }[] | null;
}

interface ProductShareModalProps {
  product: ShareableProduct;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductShareModal({ product, isOpen, onClose }: ProductShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const fallbackImage = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';
  const productImage = product.images && product.images.length > 0 ? product.images[0].url : fallbackImage;
  const currentPrice = product.salePrice ?? product.price;

  // Build clean URL
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/products/${product.slug}` 
    : `https://njselectdeals.com/products/${product.slug}`;

  const shareTitle = `${product.name} | NJ SELECT DEALS`;
  const shareText = `Check out this deal for ${product.name} on NJ SELECT DEALS!`;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const shareChannels = [
    {
      name: 'WhatsApp',
      color: 'bg-[#25D366] hover:bg-[#20ba59] text-white',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.026-.067-.282-.088-.636-.217-1.096-.417-1.956-.848-3.23-2.825-3.328-2.955-.097-.132-.796-1.059-.796-2.021 0-.962.502-1.436.681-1.632.179-.195.39-.244.52-.244.13 0 .26.002.375.008.12.006.28-.046.438.334.162.39.553 1.349.602 1.448.049.098.082.213.016.342-.066.13-.099.213-.195.328-.097.115-.205.257-.293.345-.098.098-.201.205-.086.402.115.197.513.846 1.099 1.368.756.673 1.393.882 1.59.98.197.098.312.082.428-.049.115-.131.492-.572.623-.768.131-.197.262-.164.442-.098.18.066 1.144.54 1.34.638.197.098.328.147.377.23.049.082.049.475-.095.88z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.399C8.423 21.497 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2C12 2zm0 18.2c-1.677 0-3.237-.487-4.557-1.325l-.326-.208-3.003.843.856-2.923-.228-.344C3.842 14.82 3.8 13.432 3.8 12c0-4.521 3.679-8.2 8.2-8.2 4.522 0 8.2 3.679 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z" />
        </svg>
      ),
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    },
    {
      name: 'Facebook',
      color: 'bg-[#1877F2] hover:bg-[#166fe5] text-white',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'X (Twitter)',
      color: 'bg-black hover:bg-neutral-800 text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Email',
      color: 'bg-slate-700 hover:bg-slate-800 text-white',
      icon: <Mail className="w-4 h-4" />,
      url: `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl z-10 animate-in fade-in zoom-in-95 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-brand-50 text-brand-700 rounded-xl">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Share this Product</h3>
              <p className="text-xs text-slate-400">Send this deal to friends & family</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Mini Product Card Preview */}
          <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
              <Image 
                src={productImage} 
                alt={product.name} 
                fill 
                sizes="64px" 
                className="object-cover" 
              />
            </div>
            <div className="min-w-0 flex-1">
              {product.brand && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 block">
                  {product.brand}
                </span>
              )}
              <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                {product.name}
              </h4>
              <p className="text-xs font-black text-slate-900 mt-1">
                {formatPrice(currentPrice)}
              </p>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Share to
            </label>
            <div className="grid grid-cols-4 gap-2">
              {shareChannels.map((ch) => (
                <a
                  key={ch.name}
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all shadow-sm active:scale-95 ${ch.color}`}
                >
                  <div className="mb-1">{ch.icon}</div>
                  <span className="text-[11px] font-bold">{ch.name.split(' ')[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Native device share button if supported (iOS / Android / Safari) */}
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <Smartphone className="w-4 h-4 text-slate-600" />
              <span>More sharing options (Device apps)</span>
            </button>
          )}

          {/* Direct Copy Link Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Or copy link
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 truncate border border-slate-200">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all flex-shrink-0 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer feedback */}
        {copied && (
          <div className="bg-emerald-50 text-emerald-800 px-5 py-2.5 text-xs font-bold text-center border-t border-emerald-100 flex items-center justify-center space-x-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Product link copied to clipboard. Ready to paste!</span>
          </div>
        )}

      </div>
    </div>
  );
}

/**
 * Reusable Share Button with trigger modal
 */
export function ProductShareButton({ 
  product, 
  variant = 'button',
  className = '' 
}: { 
  product: ShareableProduct; 
  variant?: 'button' | 'icon' | 'pill';
  className?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`p-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all shadow-sm ${className}`}
          title="Share this product"
          aria-label="Share this product"
        >
          <Share2 className="w-4 h-4" />
        </button>
      ) : variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all ${className}`}
          title="Share this product"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Share</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm ${className}`}
          title="Share this product"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Share</span>
        </button>
      )}

      <ProductShareModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/**
 * Reusable Inline Quick Share Bar
 * Displays directly on the product detail page under the cart/buy buttons
 */
export function ProductShareInlineBar({ product }: { product: ShareableProduct }) {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/products/${product.slug}` 
    : `https://njselectdeals.com/products/${product.slug}`;

  const shareText = `Check out ${product.name} on NJ SELECT DEALS!`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-2 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <Share2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-700">Share with friends:</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* WhatsApp Quick Icon */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
            title="Share via WhatsApp"
            aria-label="Share via WhatsApp"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-1.026-.067-.282-.088-.636-.217-1.096-.417-1.956-.848-3.23-2.825-3.328-2.955-.097-.132-.796-1.059-.796-2.021 0-.962.502-1.436.681-1.632.179-.195.39-.244.52-.244.13 0 .26.002.375.008.12.006.28-.046.438.334.162.39.553 1.349.602 1.448.049.098.082.213.016.342-.066.13-.099.213-.195.328-.097.115-.205.257-.293.345-.098.098-.201.205-.086.402.115.197.513.846 1.099 1.368.756.673 1.393.882 1.59.98.197.098.312.082.428-.049.115-.131.492-.572.623-.768.131-.197.262-.164.442-.098.18.066 1.144.54 1.34.638.197.098.328.147.377.23.049.082.049.475-.095.88z" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.399C8.423 21.497 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2C12 2zm0 18.2c-1.677 0-3.237-.487-4.557-1.325l-.326-.208-3.003.843.856-2.923-.228-.344C3.842 14.82 3.8 13.432 3.8 12c0-4.521 3.679-8.2 8.2-8.2 4.522 0 8.2 3.679 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z" />
            </svg>
          </button>

          {/* Facebook Quick Icon */}
          <button
            type="button"
            onClick={handleFacebook}
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
            title="Share on Facebook"
            aria-label="Share on Facebook"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition-all ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Copy product link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* All Options Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            title="More share options"
          >
            More...
          </button>
        </div>
      </div>

      <ProductShareModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
