'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, MapPin, User, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { OrderDetail } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AccountOverviewPage() {
  const [profile, setProfile] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const [profRes, ordRes] = await Promise.all([
          fetch('/api/account/profile'),
          fetch('/api/orders'),
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(profData.user);
        }

        if (ordRes.ok) {
          const ordData = await ordRes.json();
          setRecentOrders(ordData.orders?.slice(0, 3) || []);
        }
      } catch (err) {
        console.error('Failed to load account overview', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOverview();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading account details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Total Orders</span>
            <span className="text-xl font-black text-slate-900">{profile?._count?.orders || 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Saved Addresses</span>
            <span className="text-xl font-black text-slate-900">{profile?._count?.addresses || 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Account Status</span>
            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
              Active Member
            </span>
          </div>
        </div>
      </div>

      {/* Recent Orders Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Recent Orders</h2>
          <Link
            href="/account/orders"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((ord) => (
              <div key={ord.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Placed on {formatDate(ord.createdAt)}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-black text-slate-900">{formatPrice(ord.total)}</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link
              href="/products"
              className="inline-block mt-3 px-4 py-2 bg-brand-600 text-white font-bold rounded-xl"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>

      {/* Profile summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">Need to update your personal details?</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage your name, phone number, and account password.</p>
        </div>
        <Link
          href="/account/profile"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
        >
          Edit Profile
        </Link>
      </div>
    </div>
  );
}
