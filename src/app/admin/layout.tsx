'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  ShoppingCart, 
  Users, 
  Boxes, 
  Settings, 
  ExternalLink, 
  LogOut, 
  Menu, 
  X,
  Tag,
  Zap,
  Ticket,
  Star,
  Truck,
  BarChart3
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<UserSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (!data.user || data.user.role !== 'ADMIN') {
            router.push('/auth/login?redirect=/admin');
            return;
          }
          setUser(data.user);
        } else {
          router.push('/auth/login?redirect=/admin');
        }
      } catch (err) {
        router.push('/auth/login?redirect=/admin');
      } finally {
        setIsLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Products', href: '/admin/products', icon: Package },
    { label: 'Categories', href: '/admin/categories', icon: Layers },
    { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Customers', href: '/admin/customers', icon: Users },
    { label: 'Promotions', href: '/admin/promotions', icon: Tag },
    { label: 'Flash Sales', href: '/admin/promotions?type=FLASH_SALE', icon: Zap },
    { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
    { label: 'Reviews', href: '/admin/reviews', icon: Star },
    { label: 'Shipping', href: '/admin/shipping', icon: Truck },
    { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
            Verifying Administrator Credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
              NJ
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">
                NJ SELECT DEALS
              </span>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Store Admin Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
          >
            <span>View Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center space-x-3 text-xs">
            <div className="text-right hidden md:block">
              <span className="font-bold text-white block">{user?.name}</span>
              <span className="text-[10px] text-amber-400 font-mono block uppercase">Store Administrator</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex flex-1 relative">
        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden backdrop-blur-sm"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-30 transition-transform duration-200 ease-in-out overflow-y-auto ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 space-y-1">
            <p className="px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Store Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isExactActive = pathname === item.href;
              const isSubActive = item.href !== '/admin' && !item.href.includes('?') && pathname.startsWith(item.href);
              const isActive = isExactActive || isSubActive;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">NJ Select Deals</p>
              <p className="text-[10px] text-slate-400">Paramus, New Jersey • Secure Store Management</p>
            </div>
          </div>
        </aside>

        {/* Dynamic Admin View */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
