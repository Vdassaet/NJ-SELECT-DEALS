'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  ShieldCheck, 
  Package, 
  LogOut, 
  LayoutDashboard,
  Heart,
  Sparkles
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { UserSession } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';

function SearchParamsSync({ onSync }: { onSync: (q: string, cat: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onSync(searchParams.get('q') || '', searchParams.get('category') || '');
  }, [searchParams, onSync]);
  return null;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems, subtotal } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);

  const handleSyncParams = useCallback((q: string, cat: string) => {
    if (q) setSearchQuery(q);
    if (cat) setSelectedCategory(cat);
  }, []);

  // Check auth session
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      }
    }
    fetchSession();
  }, [pathname]); // Refresh session whenever the URL changes

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    setIsMobileMenuOpen(false);
    router.push(`/products?${params.toString()}`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setIsAccountMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const storeCategories = [
    { name: 'Hair Care', slug: 'hair-care' },
    { name: 'Skin Care', slug: 'skin-care' },
    { name: 'Beauty', slug: 'beauty' },
    { name: 'Chocolate', slug: 'chocolate' },
    { name: 'Candy', slug: 'candy' },
    { name: 'Personal Care', slug: 'personal-care' },
    { name: 'Special Offers', slug: 'special-offers' },
    { name: 'New Arrivals', slug: 'new-arrivals' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <Suspense fallback={null}>
        <SearchParamsSync onSync={handleSyncParams} />
      </Suspense>
      {/* 1. Announcement Bar */}
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 text-center font-medium flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Free Standard Shipping on Orders Over $50 | Quality Personal Care, Chocolates & Essentials</span>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="store-container py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Store Logo */}
          <Link href="/" className="flex items-center space-x-2.5 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-bold text-xl shadow-sm transition-transform">
              NJ
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                NJ SELECT <span className="text-brand-600">DEALS</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block">
                Direct Store & Quality Goods
              </span>
            </div>
          </Link>

          {/* Desktop Search Autocomplete Bar */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-4 items-center">
            <SearchAutocomplete
              initialQuery={searchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categories={storeCategories}
            />
          </div>

          {/* Desktop Actions (Categories, Account, Cart) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Categories Dropdown */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setIsCategoriesMenuOpen(!isCategoriesMenuOpen)}
                onBlur={() => setTimeout(() => setIsCategoriesMenuOpen(false), 200)}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span>Categories</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isCategoriesMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Browse Store
                  </div>
                  {storeCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/products?category=${cat.slug}`}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 font-medium transition-colors"
                      onClick={() => setIsCategoriesMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <Link
                      href="/products"
                      className="block px-3 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50 transition-colors"
                      onClick={() => setIsCategoriesMenuOpen(false)}
                    >
                      View All Products →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                onBlur={() => setTimeout(() => setIsAccountMenuOpen(false), 200)}
                className="flex items-center space-x-2 p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  {user ? (
                    <>
                      <span className="text-slate-400 block text-[10px]">Welcome back,</span>
                      <span className="font-bold text-slate-900 truncate max-w-[100px] block">
                        {user.name.split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400 block text-[10px]">Hello, Guest</span>
                      <span className="font-bold text-slate-900 block">Account</span>
                    </>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-500">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                        {user.role === 'ADMIN' && (
                          <span className="inline-block mt-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Store Admin
                          </span>
                        )}
                      </div>

                      {user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}

                      <Link
                        href="/account"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>My Account</span>
                      </Link>

                      <Link
                        href="/account/orders"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        <Package className="w-4 h-4 text-slate-400" />
                        <span>My Orders</span>
                      </Link>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 border-b border-slate-100">
                        <Link
                          href="/auth/login"
                          className="w-full block text-center py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                        <p className="text-center text-xs text-slate-500 mt-2">
                          New customer?{' '}
                          <Link
                            href="/auth/register"
                            className="text-brand-600 font-semibold hover:underline"
                            onClick={() => setIsAccountMenuOpen(false)}
                          >
                            Start here.
                          </Link>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            <Link
              href="/cart"
              className="flex items-center space-x-2.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 px-3 py-2 rounded-xl transition-colors group"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-slate-700 group-hover:text-brand-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-brand-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <span className="text-slate-400 block text-[10px]">Cart</span>
                <span className="font-bold text-slate-900 group-hover:text-brand-700">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </Link>

          </div>
        </div>

        {/* Mobile Search Autocomplete Bar */}
        <div className="mt-3 lg:hidden">
          <SearchAutocomplete
            initialQuery={searchQuery}
            categories={storeCategories}
            isMobile={true}
          />
        </div>
      </div>

      {/* 3. Categories Quick Navigation Bar (Desktop) */}
      <div className="hidden lg:block bg-slate-50 border-t border-slate-100">
        <div className="store-container">
          <nav className="flex items-center space-x-6 overflow-x-auto py-2 text-xs font-semibold text-slate-700">
            <Link
              href="/products"
              className="text-brand-700 hover:text-brand-800 flex items-center space-x-1 flex-shrink-0"
            >
              <span>All Products</span>
            </Link>
            {storeCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="hover:text-brand-600 transition-colors flex-shrink-0"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* 4. Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-sm">
                  NJ
                </div>
                <span className="font-extrabold text-slate-900">NJ SELECT DEALS</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categories</p>
              <div className="space-y-1">
                <Link
                  href="/products"
                  className="block px-3 py-2 rounded-lg text-sm font-semibold text-brand-600 hover:bg-brand-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  All Products
                </Link>
                {storeCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/products?category=${c.slug}`}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">My Account</p>
              <div className="space-y-1">
                {user ? (
                  <>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      href="/account"
                      className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Account Overview
                    </Link>
                    <Link
                      href="/account/orders"
                      className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Order History
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="block px-3 py-2 rounded-lg text-sm font-semibold text-brand-600 bg-brand-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Need Assistance?</p>
              <p>Email: support@njselectdeals.com</p>
              <p>Toll-Free: (800) 555-DEAL</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
