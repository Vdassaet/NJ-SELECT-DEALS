'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Filter, 
  SlidersHorizontal, 
  X, 
  Search, 
  ChevronDown, 
  Check, 
  Sparkles,
  PackageOpen,
  ArrowUpDown
} from 'lucide-react';
import { ProductItem, CategoryItem } from '@/lib/types';
import { ProductCard } from '@/components/products/ProductCard';

function ProductsCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter states
  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const inStockParam = searchParams.get('inStock') === 'true';
  const discountParam = searchParams.get('discount') === 'true';
  const sortParam = searchParams.get('sort') || 'newest';

  const [searchInput, setSearchInput] = useState(qParam);
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);

  // Sync inputs with URL params
  useEffect(() => {
    setSearchInput(qParam);
    setMinPriceInput(minPriceParam);
    setMaxPriceInput(maxPriceParam);
  }, [qParam, minPriceParam, maxPriceParam]);

  // Fetch Categories & Products
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch categories
        const catRes = await fetch('/api/categories?activeOnly=true');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        // Fetch products with all filters
        const params = new URLSearchParams(searchParams.toString());
        const prodRes = await fetch(`/api/products?${params.toString()}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const fetchedProducts: ProductItem[] = prodData.products || [];
          setProducts(fetchedProducts);

          // Extract unique brands
          const uniqueBrands = Array.from(
            new Set(fetchedProducts.map((p) => p.brand).filter(Boolean) as string[])
          );
          setBrands(uniqueBrands);
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [searchParams]);

  // Helper to update query string
  const updateQuery = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    });
    router.push(`/products?${current.toString()}`);
  };

  const clearAllFilters = () => {
    router.push('/products');
  };

  const hasActiveFilters =
    Boolean(qParam) ||
    Boolean(categoryParam) ||
    Boolean(brandParam) ||
    Boolean(minPriceParam) ||
    Boolean(maxPriceParam) ||
    inStockParam ||
    discountParam ||
    sortParam !== 'newest';

  return (
    <div className="store-container py-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {categoryParam
              ? categories.find((c) => c.slug === categoryParam)?.name || 'Category Catalog'
              : qParam
              ? `Search Results for "${qParam}"`
              : 'All Products'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Showing <span className="font-bold text-slate-900">{products.length}</span> quality items
          </p>
        </div>

        {/* Sort and Mobile Filter Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-brand-600"></span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Sort:</span>
            <select
              value={sortParam}
              onChange={(e) => updateQuery({ sort: e.target.value })}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer py-1"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="best_selling">Best Selling</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <span className="text-xs font-bold text-slate-400 mr-1">Active:</span>

          {categoryParam && (
            <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
              Category: {categories.find((c) => c.slug === categoryParam)?.name || categoryParam}
              <button onClick={() => updateQuery({ category: null })} className="ml-1.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {qParam && (
            <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
              Keyword: &quot;{qParam}&quot;
              <button onClick={() => updateQuery({ q: null })} className="ml-1.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {brandParam && (
            <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
              Brand: {brandParam}
              <button onClick={() => updateQuery({ brand: null })} className="ml-1.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(minPriceParam || maxPriceParam) && (
            <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
              Price: ${minPriceParam || '0'} - ${maxPriceParam || 'Any'}
              <button onClick={() => updateQuery({ minPrice: null, maxPrice: null })} className="ml-1.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {inStockParam && (
            <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
              In Stock Only
              <button onClick={() => updateQuery({ inStock: null })} className="ml-1.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {discountParam && (
            <span className="inline-flex items-center text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-200">
              On Sale Only
              <button onClick={() => updateQuery({ discount: null })} className="ml-1.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid Layout (Sidebar + Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Search within results */}
            <div>
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
                Search Products
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateQuery({ q: searchInput });
                }}
                className="relative"
              >
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Type name or keyword..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </form>
            </div>

            {/* Categories */}
            <div className="border-t border-slate-100 pt-5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                Categories
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <button
                  onClick={() => updateQuery({ category: null })}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                    !categoryParam ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>All Categories</span>
                  {!categoryParam && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateQuery({ category: cat.slug })}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                      categoryParam === cat.slug
                        ? 'bg-brand-50 text-brand-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat._count && <span className="text-[10px] text-slate-400">({cat._count.products})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="border-t border-slate-100 pt-5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                Price Range ($)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => updateQuery({ minPrice: minPriceInput || null, maxPrice: maxPriceInput || null })}
                className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Apply Price
              </button>
            </div>

            {/* Brands */}
            {brands.length > 0 && (
              <div className="border-t border-slate-100 pt-5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                  Brand
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  <button
                    onClick={() => updateQuery({ brand: null })}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-medium ${
                      !brandParam ? 'text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Brands
                  </button>
                  {brands.map((b) => (
                    <button
                      key={b}
                      onClick={() => updateQuery({ brand: b })}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-medium flex items-center justify-between ${
                        brandParam === b ? 'text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{b}</span>
                      {brandParam === b && <Check className="w-3 h-3 text-brand-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability & Discount Toggles */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Availability & Deals
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockParam}
                  onChange={(e) => updateQuery({ inStock: e.target.checked ? 'true' : null })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>In Stock Only</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountParam}
                  onChange={(e) => updateQuery({ discount: e.target.checked ? 'true' : null })}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>On Sale / Discounted</span>
              </label>
            </div>

          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-3"
                >
                  <div className="aspect-square bg-slate-100 rounded-xl w-full" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-100 rounded w-full mt-4" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No products matched your criteria</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Try adjusting your search terms, changing categories, or clearing active filters to view available items.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-5 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </main>

      </div>

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />

          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="font-extrabold text-slate-900 text-base">Filter Products</span>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-6">
              {/* Categories */}
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
                  Category
                </span>
                <select
                  value={categoryParam}
                  onChange={(e) => {
                    updateQuery({ category: e.target.value || null });
                    setIsMobileFilterOpen(false);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* In Stock & Discount */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={inStockParam}
                    onChange={(e) => {
                      updateQuery({ inStock: e.target.checked ? 'true' : null });
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>In Stock Only</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={discountParam}
                    onChange={(e) => {
                      updateQuery({ discount: e.target.checked ? 'true' : null });
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>On Sale Only</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    clearAllFilters();
                    setIsMobileFilterOpen(false);
                  }}
                  className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="store-container py-12 text-center text-slate-500 text-sm">Loading catalog...</div>}>
      <ProductsCatalogContent />
    </Suspense>
  );
}
