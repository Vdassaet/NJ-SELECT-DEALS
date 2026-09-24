'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  ArrowRight, 
  Star, 
  Tag, 
  Sparkles, 
  PackageCheck,
  TrendingUp,
  RotateCw
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface SearchAutocompleteProps {
  initialQuery?: string;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  categories: { name: string; slug: string }[];
  isMobile?: boolean;
}

export function SearchAutocomplete({
  initialQuery = '',
  selectedCategory = '',
  onSelectCategory,
  categories,
  isMobile = false,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    suggestions: string[];
    products: any[];
    categories: any[];
    brands: string[];
  }>({
    suggestions: [],
    products: [],
    categories: [],
    brands: [],
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) {
      setResults({ suggestions: [], products: [], categories: [], brands: [] });
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults({
            suggestions: data.suggestions || [],
            products: data.products || [],
            categories: data.categories || [],
            brands: data.brands || [],
          });
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    router.push(`/products?${params.toString()}`);
  };

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setIsOpen(false);
    const params = new URLSearchParams();
    params.set('q', text);
    if (selectedCategory) params.set('category', selectedCategory);
    router.push(`/products?${params.toString()}`);
  };

  const handleSelectCategory = (catSlug: string) => {
    setIsOpen(false);
    router.push(`/products?category=${catSlug}`);
  };

  const handleSelectBrand = (brandName: string) => {
    setIsOpen(false);
    router.push(`/products?brand=${encodeURIComponent(brandName)}`);
  };

  const hasAnyResults =
    results.products.length > 0 ||
    results.suggestions.length > 0 ||
    results.categories.length > 0 ||
    results.brands.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex w-full">
        <div
          className={`flex w-full overflow-hidden transition-all ${
            isMobile
              ? 'rounded-xl border border-slate-200 bg-slate-50'
              : 'rounded-xl border-2 border-slate-200 focus-within:border-brand-600 bg-slate-50'
          }`}
        >
          {/* Category Dropdown Filter (Desktop only) */}
          {!isMobile && onSelectCategory && (
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="bg-slate-100 text-xs font-semibold text-slate-700 px-3 py-2.5 border-r border-slate-200 focus:outline-none cursor-pointer hover:bg-slate-200/70"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length > 0 && hasAnyResults) {
                setIsOpen(true);
              }
            }}
            placeholder={
              isMobile
                ? 'Search products, brands, SKU...'
                : 'Search products (e.g. shampoo, Dove, lotion, chocolate)...'
            }
            className={`flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
            }`}
          />

          {/* Clear query button */}
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="px-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Search button with loading spinner indicator */}
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 sm:px-5 flex items-center justify-center transition-colors"
            aria-label="Search"
          >
            {isLoading ? (
              <RotateCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
          {hasAnyResults ? (
            <div className="p-4 space-y-4 text-xs">
              
              {/* Quick Text Suggestions */}
              {results.suggestions.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Search Suggestions
                  </span>
                  <div className="space-y-1">
                    {results.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center space-x-2 text-slate-700 font-semibold group transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600" />
                        <span className="group-hover:text-brand-700">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Categories & Brands Pills */}
              {(results.categories.length > 0 || results.brands.length > 0) && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Departments &amp; Brands
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {results.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.slug)}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-full font-bold flex items-center space-x-1 transition-colors"
                      >
                        <Tag className="w-3 h-3 text-brand-600" />
                        <span>Category: {cat.name}</span>
                      </button>
                    ))}
                    {results.brands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleSelectBrand(b)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full font-bold flex items-center space-x-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Brand: {b}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Direct Matches */}
              {results.products.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Product Matches ({results.products.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                    >
                      <span>View all results</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {results.products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                            <Image src={p.image} alt={p.name} fill sizes="44px" className="object-cover" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-900 group-hover:text-brand-600 truncate">
                              {p.name}
                            </p>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                              {p.brand && <span className="font-medium text-slate-600">{p.brand}</span>}
                              <span>•</span>
                              <span className="font-mono text-slate-400">SKU: {p.sku}</span>
                              {p.inStock && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-600 font-semibold flex items-center space-x-0.5">
                                    <PackageCheck className="w-2.5 h-2.5" />
                                    <span>In Stock</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 pl-3">
                          <div className="font-black text-slate-900">
                            {formatPrice(p.salePrice || p.price)}
                          </div>
                          {p.salePrice && (
                            <div className="text-[10px] text-slate-400 line-through">
                              {formatPrice(p.price)}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View Full Search CTA */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search store for &ldquo;{query}&rdquo;</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              <p>No products found matching &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] mt-1 text-slate-400">
                Try searching by shampoo, brand name, category, or SKU code.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
