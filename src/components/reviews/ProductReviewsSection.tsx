'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Camera, 
  X, 
  Lock, 
  MessageSquare, 
  ThumbsUp,
  UserCheck
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { RatingStats } from '@/lib/review-service';

interface ReviewItem {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string;
  photos: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    id?: string;
    name: string;
  };
}

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
}

export function ProductReviewsSection({ productId, productName }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review eligibility status
  const [eligibility, setEligibility] = useState<{
    isAuthenticated: boolean;
    hasPurchased: boolean;
    alreadyReviewed: boolean;
    canReview: boolean;
    orderNumber?: string;
  } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Fetch reviews & eligibility
  const loadReviewsData = async () => {
    try {
      setIsLoading(true);
      const [revRes, eligRes] = await Promise.all([
        fetch(`/api/reviews?productId=${productId}`),
        fetch(`/api/reviews/eligibility?productId=${productId}`),
      ]);

      if (revRes.ok) {
        const data = await revRes.json();
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      }

      if (eligRes.ok) {
        const eligData = await eligRes.json();
        setEligibility(eligData);
      }
    } catch (err) {
      console.error('Failed to load reviews data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadReviewsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleAddPhoto = () => {
    if (!photoInput.trim()) return;
    if (!photoInput.startsWith('http')) {
      alert('Please enter a valid image URL starting with http:// or https://');
      return;
    }
    if (formPhotos.length >= 5) {
      alert('You can attach up to 5 photos.');
      return;
    }
    setFormPhotos([...formPhotos, photoInput.trim()]);
    setPhotoInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setFormPhotos(formPhotos.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (formRating < 1 || formRating > 5) {
      setNotification({ type: 'error', message: 'Please select a rating between 1 and 5 stars.' });
      return;
    }

    if (formComment.trim().length < 5) {
      setNotification({ type: 'error', message: 'Please write a review comment with at least 5 characters.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: formRating,
          title: formTitle.trim() || undefined,
          comment: formComment.trim(),
          photos: formPhotos,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setNotification({
        type: 'success',
        message: 'Thank you! Your verified purchase review has been posted.',
      });
      setIsFormOpen(false);
      setFormTitle('');
      setFormComment('');
      setFormPhotos([]);
      loadReviewsData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = stats ? stats.average : 0;
  const totalCount = stats ? stats.totalCount : reviews.length;

  return (
    <section className="pt-12 border-t border-slate-200" id="customer-reviews">
      <div className="space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                Verified Customer Feedback
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Customer Reviews &amp; Ratings
            </h2>
          </div>

          {/* Action: Write a review if eligible */}
          <div>
            {eligibility?.canReview ? (
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Write a Verified Review</span>
              </button>
            ) : eligibility?.alreadyReviewed ? (
              <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>You have reviewed this product</span>
              </span>
            ) : (
              <div className="text-right">
                <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Verified Purchasers Only</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Global Notification */}
        {notification && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
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

        {/* Ratings Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200/80">
          
          {/* Average Score Box (4 cols) */}
          <div className="md:col-span-4 flex flex-col justify-center items-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-200">
            <span className="text-5xl font-black text-slate-900 tracking-tight">
              {averageRating > 0 ? averageRating.toFixed(1) : '5.0'}
            </span>
            <div className="flex items-center space-x-1 text-amber-400 my-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(averageRating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-slate-700">
              Based on {totalCount} verified review{totalCount === 1 ? '' : 's'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">100% verified customer purchases</p>
          </div>

          {/* Rating Distribution Bars (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats?.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
              const pct = stats?.percentages[star as 1 | 2 | 3 | 4 | 5] || 0;

              return (
                <div key={star} className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1 w-14 font-bold text-slate-700">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>

                  {/* Progress track */}
                  <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="w-16 text-right font-semibold text-slate-500 text-[11px]">
                    {pct}% ({count})
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Gating Notice for Visitors / Non-Purchasers */}
        {!eligibility?.canReview && !eligibility?.alreadyReviewed && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Verified Purchase Policy</p>
              <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                To guarantee authentic, trusted feedback for all shoppers, reviews can only be submitted by customers who have ordered this product through their account.
                {!eligibility?.isAuthenticated && (
                  <span className="block mt-1">
                    Have an account?{' '}
                    <Link href="/auth/login" className="font-bold underline hover:text-amber-950">
                      Sign in to verify your purchase
                    </Link>
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Review Form Modal / Expanded Box */}
        {isFormOpen && (
          <div className="bg-white border-2 border-brand-500 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Write a Product Review</h3>
                <p className="text-xs text-slate-500">
                  Sharing your thoughts on <strong>{productName}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Overall Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-300 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (hoverRating || formRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {formRating === 5 && '5.0 - Outstanding!'}
                    {formRating === 4 && '4.0 - Very Good'}
                    {formRating === 3 && '3.0 - Average'}
                    {formRating === 2 && '2.0 - Below Expectations'}
                    {formRating === 1 && '1.0 - Poor'}
                  </span>
                </div>
              </div>

              {/* Review Headline / Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Review Headline (Optional)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Excellent scent and very fast shipping!"
                  maxLength={100}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Review &amp; Experience <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="What did you like or dislike about this product? How was the quality, packaging, and performance?"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 leading-relaxed"
                />
              </div>

              {/* Optional Photos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Optional Product Photos (Image URLs)</span>
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="url"
                    value={photoInput}
                    onChange={(e) => setPhotoInput(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-... or hosted image URL"
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Add Photo
                  </button>
                </div>

                {formPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formPhotos.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                        <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
                >
                  {isSubmitting ? 'Posting Review...' : 'Submit Verified Review'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Customer Reviews List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Showing {reviews.length} Verified Customer Review{reviews.length === 1 ? '' : 's'}
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading reviews...</div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  {/* Header: User & Rating */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {rev.user?.name ? rev.user.name[0].toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{rev.user?.name || 'Customer'}</span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified Purchase</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{formatDate(rev.createdAt)}</p>
                      </div>
                    </div>

                    {/* Star Score */}
                    <div className="flex items-center space-x-1 text-amber-400 self-start sm:self-auto">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Title & Comment */}
                  <div className="space-y-1">
                    {rev.title && (
                      <h4 className="font-black text-slate-900 text-xs">{rev.title}</h4>
                    )}
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Customer Attached Photos */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                        Customer photos:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {rev.photos.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => setLightboxPhoto(p)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-brand-500 transition-all flex-shrink-0"
                          >
                            <Image src={p} alt="Review attachment" fill sizes="64px" className="object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No customer reviews yet</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Be the first verified purchaser of this product to share your feedback with our store community.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden p-3 shadow-2xl">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden">
              <Image src={lightboxPhoto} alt="Review photo" fill className="object-contain" />
            </div>
            <div className="p-3 text-center">
              <p className="text-xs text-slate-500">Customer Photo • Click anywhere to close</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
