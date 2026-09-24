'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Star, 
  Search, 
  Check, 
  X, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Flag,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLIC' | 'HIDDEN' | 'FLAGGED'>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleTogglePublic = async (review: any) => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, isPublic: !review.isPublic }),
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Review #${review.id.substring(0, 6)} is now ${!review.isPublic ? 'Public & Approved' : 'Hidden'}.`,
        });
        fetchReviews();
      } else {
        throw new Error('Failed to toggle review visibility');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleToggleFlag = async (review: any) => {
    try {
      const newFlaggedState = !review.isFlagged;
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: review.id,
          isFlagged: newFlaggedState,
          flagReason: newFlaggedState ? 'Flagged for moderation by Administrator' : undefined,
        }),
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Review #${review.id.substring(0, 6)} was ${newFlaggedState ? 'flagged for moderation' : 'unflagged'}.`,
        });
        fetchReviews();
      } else {
        throw new Error('Failed to update flag status');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Review deleted successfully.' });
        fetchReviews();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const query = searchQuery.toLowerCase();
    return reviews.filter((r) => {
      return (
        r.product?.name?.toLowerCase().includes(query) ||
        r.product?.sku?.toLowerCase().includes(query) ||
        r.user?.name?.toLowerCase().includes(query) ||
        r.user?.email?.toLowerCase().includes(query) ||
        r.title?.toLowerCase().includes(query) ||
        r.comment?.toLowerCase().includes(query)
      );
    });
  }, [reviews, searchQuery]);

  // Compute metrics
  const totalReviewsCount = reviews.length;
  const publicCount = reviews.filter((r) => r.isPublic).length;
  const hiddenCount = reviews.filter((r) => !r.isPublic).length;
  const flaggedCount = reviews.filter((r) => r.isFlagged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>Product Reviews &amp; Moderation</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, approve, hide, flag, and manage verified customer product reviews
          </p>
        </div>

        <button
          onClick={fetchReviews}
          className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto"
        >
          Refresh Feed
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Reviews</span>
          <span className="text-2xl font-black text-slate-900 mt-0.5 block">{totalReviewsCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter('PUBLIC')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'PUBLIC'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">Approved / Public</span>
          <span className="text-2xl font-black text-emerald-900 mt-0.5 block">{publicCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter('HIDDEN')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'HIDDEN'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-600 uppercase block">Hidden</span>
          <span className="text-2xl font-black text-slate-800 mt-0.5 block">{hiddenCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter('FLAGGED')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'FLAGGED'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center space-x-1 text-rose-700">
            <Flag className="w-3 h-3 fill-rose-600" />
            <span className="text-[11px] font-bold uppercase">Flagged</span>
          </div>
          <span className="text-2xl font-black text-rose-900 mt-0.5 block">{flaggedCount}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product, customer, SKU, title, or review text..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">All Reviews</option>
            <option value="PUBLIC">Approved / Public Only</option>
            <option value="HIDDEN">Hidden Only</option>
            <option value="FLAGGED">Flagged for Moderation</option>
          </select>
        </div>
      </div>

      {/* Reviews Moderation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading reviews feed...</div>
        ) : filteredReviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Feedback &amp; Photos</th>
                  <th className="py-3.5 px-4">Status &amp; Flags</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReviews.map((r) => (
                  <tr key={r.id} className={`hover:bg-slate-50/60 transition-colors ${r.isFlagged ? 'bg-rose-50/20' : ''}`}>
                    <td className="py-3.5 px-4">
                      {r.product ? (
                        <div className="flex items-center space-x-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                            {r.product.images && r.product.images[0]?.url ? (
                              <Image src={r.product.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">N/A</div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/products/${r.product.slug}`}
                              target="_blank"
                              className="font-bold text-slate-900 hover:text-brand-600 line-clamp-1 flex items-center space-x-1"
                            >
                              <span>{r.product.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </Link>
                            <span className="font-mono text-[10px] text-slate-400">SKU: {r.product.sku}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Product Removed</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">{r.user?.name || 'Verified Customer'}</p>
                        <p className="text-[11px] text-slate-400">{r.user?.email || '—'}</p>
                        <span className="inline-flex items-center space-x-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Verified Purchase</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1 text-amber-500 font-black">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{r.rating}.0</span>
                      </div>
                      <div className="flex text-amber-400 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${i < r.rating ? 'fill-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      {r.title && <p className="font-bold text-slate-900 mb-0.5">{r.title}</p>}
                      <p className="text-slate-600 line-clamp-2 italic">&quot;{r.comment}&quot;</p>
                      
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex items-center space-x-1.5 mt-2">
                          {r.photos.map((photoUrl: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setPreviewPhoto(photoUrl)}
                              className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-brand-500 transition-all flex-shrink-0"
                            >
                              <Image src={photoUrl} alt="Review photo" fill sizes="32px" className="object-cover" />
                            </button>
                          ))}
                          <span className="text-[10px] text-slate-400 font-semibold">
                            ({r.photos.length} photo{r.photos.length > 1 ? 's' : ''})
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                            r.isPublic
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {r.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{r.isPublic ? 'Public' : 'Hidden'}</span>
                        </span>

                        {r.isFlagged && (
                          <div className="flex items-center space-x-1 text-rose-700 text-[10px] font-bold">
                            <Flag className="w-3 h-3 fill-rose-600" />
                            <span>Flagged</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Approve / Hide Toggle */}
                        <button
                          onClick={() => handleTogglePublic(r)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            r.isPublic
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={r.isPublic ? 'Hide from product page' : 'Approve & make public'}
                        >
                          {r.isPublic ? 'Hide' : 'Approve'}
                        </button>

                        {/* Flag / Unflag */}
                        <button
                          onClick={() => handleToggleFlag(r)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            r.isFlagged
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={r.isFlagged ? 'Remove flag' : 'Flag review'}
                        >
                          <Flag className={`w-3.5 h-3.5 ${r.isFlagged ? 'fill-current' : ''}`} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete review permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No reviews found</p>
            <p className="mt-1">Customer product reviews will appear here for verification and moderation.</p>
          </div>
        )}
      </div>

      {/* Photo Preview Lightbox */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <div className="relative aspect-square w-full rounded-xl overflow-hidden">
              <Image src={previewPhoto} alt="Review attachment" fill className="object-contain" />
            </div>
            <div className="p-3 text-center">
              <p className="text-xs text-slate-500">Customer submitted photo • Click anywhere to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
