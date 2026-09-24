'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, 
  Package, 
  MapPin, 
  Settings, 
  LogOut, 
  Shield, 
  ChevronRight 
} from 'lucide-react';
import { UserSession } from '@/lib/types';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        // middleware handles redirection
      }
    }
    loadUser();
  }, []);

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
    { label: 'Overview', href: '/account', icon: User },
    { label: 'My Orders', href: '/account/orders', icon: Package },
    { label: 'Profile & Security', href: '/account/profile', icon: Settings },
    { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
  ];

  return (
    <div className="store-container py-10 space-y-8">
      {/* Account Top Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-brand-500/20">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">{user?.name || 'Customer Account'}</h1>
              {user?.role === 'ADMIN' && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md transition-colors flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Open Admin Dashboard</span>
          </Link>
        )}
      </div>

      {/* Main Grid: Sidebar + Sub-page Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar (3 cols) */}
        <nav className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Content Area (9 cols) */}
        <main className="lg:col-span-9">{children}</main>

      </div>
    </div>
  );
}
