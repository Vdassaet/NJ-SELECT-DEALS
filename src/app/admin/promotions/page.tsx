'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Tag, 
  Plus, 
  Search, 
  Sparkles, 
  Flame, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  AlertCircle,
  Percent,
  Check,
  RotateCw,
  Gift
} from 'lucide-react';
import { PromotionItem, PromotionType } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { CountdownTimer } from '@/components/promotions/CountdownTimer';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
    flashDeals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'flash'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/promotions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load promotions', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPromotions();
  };

  const handleToggleStatus = async (promo: PromotionItem) => {
    try {
      const res = await fetch(`/api/promotions/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      if (res.ok) {
        fetchPromotions();
      }
    } catch (err) {
      console.error('Error toggling status', err);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/promotions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchPromotions();
      }
    } catch (err) {
      console.error('Error deleting promotion', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const now = new Date();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Tag className="w-8 h-8 text-amber-500" />
            <span>Promotions & Discounts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create, schedule, and manage flash sales, volume discounts, coupons, and bundles without touching code.
          </p>
        </div>

        <Link
          href="/admin/promotions/new"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promotion</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Promotions</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Active Deals</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.active}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Scheduled / Upcoming</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{metrics.scheduled}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Expired</span>
          <p className="text-2xl font-black text-rose-700 mt-1">{metrics.expired}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block flex items-center space-x-1">
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Flash Sales</span>
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{metrics.flashDeals}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'all', label: 'All Promotions' },
              { id: 'active', label: 'Active' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'expired', label: 'Expired' },
              { id: 'flash', label: 'Flash Sales' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Type Filter */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Types</option>
              <option value="PERCENTAGE">Percentage Discount</option>
              <option value="FIXED_AMOUNT">Fixed Amount Discount</option>
              <option value="SALE_PRICE">Sale Price</option>
              <option value="TIERED_VOLUME">Volume / Tiered</option>
              <option value="BUY_X_GET_Y">Buy X Get Y</option>
              <option value="BUNDLE">Bundle Discount</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
              <option value="FLASH_SALE">Flash Sale</option>
            </select>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search promotions..."
                className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Promotion</th>
                <th className="p-4">Type & Scope</th>
                <th className="p-4">Rule / Discount</th>
                <th className="p-4">Schedule & Validity</th>
                <th className="p-4">Redemptions</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading promotions...</span>
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-600">No promotions found</p>
                    <p className="text-[11px] mt-1">Create your first promotion using the button above.</p>
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => {
                  const isStarted = new Date(promo.startDate) <= now;
                  const isEnded = promo.endDate ? new Date(promo.endDate) < now : false;
                  const isCurrentlyActive = promo.isActive && isStarted && !isEnded;

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Badge */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-sm">{promo.name}</div>
                        {promo.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">{promo.description}</div>
                        )}
                        {promo.couponCode && (
                          <span className="inline-block mt-1 font-mono font-bold text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            CODE: {promo.couponCode}
                          </span>
                        )}
                      </td>

                      {/* Type & Scope */}
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider bg-slate-100 text-slate-800 w-fit">
                            {promo.type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Scope: <strong className="text-slate-700">{promo.scope}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Rule / Value */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {promo.type === 'PERCENTAGE' && `${promo.discountValue}% OFF`}
                          {promo.type === 'FIXED_AMOUNT' && `${formatPrice(promo.discountValue || 0)} OFF`}
                          {promo.type === 'SALE_PRICE' && `Sale: ${formatPrice(promo.salePrice || 0)}`}
                          {promo.type === 'TIERED_VOLUME' && (
                            <span className="text-amber-800">
                              Tiered ({promo.tieredRules?.length || 0} rules)
                            </span>
                          )}
                          {promo.type === 'BUY_X_GET_Y' && (
                            <span className="text-emerald-800">
                              Buy {promo.buyQuantity} Get {promo.getQuantity} ({promo.getDiscountPercent === 100 ? 'Free' : `${promo.getDiscountPercent}% off`})
                            </span>
                          )}
                          {promo.type === 'FREE_SHIPPING' && 'Free Standard Shipping'}
                          {promo.type === 'FLASH_SALE' && (
                            <span className="text-rose-700 flex items-center space-x-1">
                              <Flame className="w-3.5 h-3.5" />
                              <span>{promo.discountValue ? `${promo.discountValue}% OFF` : 'Flash Sale'}</span>
                            </span>
                          )}
                          {promo.type === 'BUNDLE' && 'Bundle Savings'}
                        </div>
                      </td>

                      {/* Schedule / Validity */}
                      <td className="p-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="text-slate-700 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>From: {new Date(promo.startDate).toLocaleDateString()}</span>
                          </div>
                          {promo.endDate ? (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className={isEnded ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                To: {new Date(promo.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">No expiration</span>
                          )}
                          {promo.isFlashSale && !isEnded && promo.endDate && (
                            <div className="mt-1">
                              <CountdownTimer
                                targetDate={promo.endDate}
                                label="Left"
                                variant="compact"
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Redemptions */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {promo.usedCount}
                          {promo.usageLimit != null && (
                            <span className="text-slate-400 font-normal"> / {promo.usageLimit}</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(promo)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all ${
                            promo.isActive
                              ? isEnded
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : !isStarted
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle active/inactive"
                        >
                          {isEnded ? (
                            <span>Expired</span>
                          ) : !isStarted ? (
                            <span>Scheduled</span>
                          ) : promo.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </>
                          ) : (
                            <span>Inactive</span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/admin/promotions/${promo.id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Promotion"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(promo.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Promotion"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Delete Promotion?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this promotion? This action cannot be undone and will immediately remove associated customer discounts.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
