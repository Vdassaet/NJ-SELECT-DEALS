'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  Flame, 
  Clock, 
  Tag, 
  Percent, 
  DollarSign, 
  Gift 
} from 'lucide-react';
import { PromotionType, PromotionScope, TieredDiscountRule, CategoryItem, ProductItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface PromotionFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function PromotionForm({ initialData, isEdit = false }: PromotionFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState<PromotionType>(initialData?.type || 'PERCENTAGE');
  const [scope, setScope] = useState<PromotionScope>(initialData?.scope || 'PRODUCT');
  const [discountType, setDiscountType] = useState<string>(initialData?.discountType || 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>(initialData?.discountValue ? String(initialData.discountValue) : '');
  const [salePrice, setSalePrice] = useState<string>(initialData?.salePrice ? String(initialData.salePrice) : '');
  const [couponCode, setCouponCode] = useState<string>(initialData?.couponCode || '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialData?.products?.map((p: any) => p.id) || []
  );
  const [minOrderSubtotal, setMinOrderSubtotal] = useState<string>(
    initialData?.minOrderSubtotal ? String(initialData.minOrderSubtotal) : ''
  );
  const [buyQuantity, setBuyQuantity] = useState<string>(initialData?.buyQuantity ? String(initialData.buyQuantity) : '2');
  const [getQuantity, setGetQuantity] = useState<string>(initialData?.getQuantity ? String(initialData.getQuantity) : '1');
  const [getDiscountPercent, setGetDiscountPercent] = useState<string>(
    initialData?.getDiscountPercent != null ? String(initialData.getDiscountPercent) : '100'
  );
  const [tieredRules, setTieredRules] = useState<TieredDiscountRule[]>(
    initialData?.tieredRules || [
      { minQty: 2, discountPercent: 10 },
      { minQty: 3, discountPercent: 15 },
    ]
  );
  const [bundleProductIds, setBundleProductIds] = useState<string[]>(
    initialData?.bundleProductIds || []
  );
  const [maxQuantity, setMaxQuantity] = useState<string>(initialData?.maxQuantity ? String(initialData.maxQuantity) : '');
  const [usageLimit, setUsageLimit] = useState<string>(initialData?.usageLimit ? String(initialData.usageLimit) : '');
  const [startDate, setStartDate] = useState<string>(
    initialData?.startDate
      ? new Date(initialData.startDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState<string>(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState<boolean>(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [isFlashSale, setIsFlashSale] = useState<boolean>(
    initialData?.isFlashSale || initialData?.type === 'FLASH_SALE' || false
  );
  const [bannerText, setBannerText] = useState<string>(initialData?.bannerText || '');

  // Load Categories & Products for selectors
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch('/api/categories?activeOnly=false'),
          fetch('/api/products?limit=100'),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }
      } catch (err) {
        console.error('Failed to load metadata', err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMetadata();
  }, []);

  const handleAddTierRow = () => {
    const nextQty = tieredRules.length > 0 ? tieredRules[tieredRules.length - 1].minQty + 1 : 2;
    const nextPct = tieredRules.length > 0 ? tieredRules[tieredRules.length - 1].discountPercent + 5 : 10;
    setTieredRules([...tieredRules, { minQty: nextQty, discountPercent: nextPct }]);
  };

  const handleRemoveTierRow = (index: number) => {
    setTieredRules(tieredRules.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: 'minQty' | 'discountPercent', value: number) => {
    const updated = [...tieredRules];
    updated[index] = { ...updated[index], [field]: value };
    setTieredRules(updated);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter a promotion name.');
      return;
    }

    if (type === 'PERCENTAGE' && (!discountValue || parseFloat(discountValue) <= 0)) {
      setErrorMessage('Please enter a valid percentage discount.');
      return;
    }

    if (type === 'FIXED_AMOUNT' && (!discountValue || parseFloat(discountValue) <= 0)) {
      setErrorMessage('Please enter a valid fixed discount amount.');
      return;
    }

    if (type === 'SALE_PRICE' && (!salePrice || parseFloat(salePrice) <= 0)) {
      setErrorMessage('Please enter a valid sale price.');
      return;
    }

    if (type === 'FLASH_SALE' && !endDate) {
      setErrorMessage('Flash sales require an explicit end date and time.');
      return;
    }

    if (scope === 'PRODUCT' && selectedProductIds.length === 0) {
      setErrorMessage('Please select at least one product for this product promotion.');
      return;
    }

    if (scope === 'CATEGORY' && !categoryId) {
      setErrorMessage('Please select a target category for this category promotion.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        scope,
        discountType,
        discountValue: discountValue ? parseFloat(discountValue) : null,
        salePrice: salePrice ? parseFloat(salePrice) : null,
        couponCode: couponCode.trim() || null,
        categoryId: categoryId || null,
        productIds: selectedProductIds,
        minOrderSubtotal: minOrderSubtotal ? parseFloat(minOrderSubtotal) : null,
        buyQuantity: buyQuantity ? parseInt(buyQuantity) : null,
        getQuantity: getQuantity ? parseInt(getQuantity) : null,
        getDiscountPercent: getDiscountPercent ? parseFloat(getDiscountPercent) : null,
        tieredRules: type === 'TIERED_VOLUME' ? tieredRules : null,
        bundleProductIds: type === 'BUNDLE' ? bundleProductIds : null,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isActive,
        isFlashSale: isFlashSale || type === 'FLASH_SALE',
        bannerText: bannerText.trim() || null,
      };

      const url = isEdit ? `/api/promotions/${initialData.id}` : '/api/promotions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save promotion.');
      }

      router.push('/admin/promotions');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/promotions"
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Edit Promotion' : 'Create Promotion'}
            </h1>
            <p className="text-xs text-slate-500">
              Configure discounts, volume tiers, flash sale timers, and coupon rules.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/promotions"
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center space-x-2"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEdit ? 'Save Changes' : 'Create Promotion'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-700 text-xs font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Basic Details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Basic Promotion Details</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">Promotion Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Haircare Flash Sale, Buy 2 Save 10%, Welcome Coupon"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">Description / Customer Note</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description shown to customers or used for admin reference"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Promotion Type *</label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as PromotionType;
                setType(newType);
                if (newType === 'FLASH_SALE') setIsFlashSale(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="PERCENTAGE">Percentage Discount (% off)</option>
              <option value="FIXED_AMOUNT">Fixed Amount Discount ($ off)</option>
              <option value="SALE_PRICE">Sale Price (Set new unit price)</option>
              <option value="TIERED_VOLUME">Volume / Tiered (Buy 2 Save 10%, Buy 3 Save 15%)</option>
              <option value="BUY_X_GET_Y">Buy X Get Y (e.g. Buy 1 Get 1 Free / 50% off)</option>
              <option value="BUNDLE">Bundle Discount (Buy together and save)</option>
              <option value="FREE_SHIPPING">Free Shipping Promotion</option>
              <option value="FLASH_SALE">Flash Sale (Time-limited with countdown timer)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Promotion Scope *</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as PromotionScope)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="PRODUCT">Specific Product(s)</option>
              <option value="CATEGORY">Entire Category</option>
              <option value="ALL_PRODUCTS">All Products (Storewide)</option>
              <option value="BUNDLE">Specific Bundle Set</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Type-Specific Discount Rules */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Discount & Pricing Rules</span>
        </h2>

        {/* A. Percentage Discount */}
        {type === 'PERCENTAGE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Discount Percentage (%) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>
        )}

        {/* B. Fixed Amount Discount */}
        {type === 'FIXED_AMOUNT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Discount Amount ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="e.g. 5.00"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* C. Sale Price */}
        {type === 'SALE_PRICE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Promotional Sale Price ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="e.g. 14.99"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* D. Tiered Volume Discount: Buy 2 Save 10%, Buy 3 Save 15% */}
        {type === 'TIERED_VOLUME' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">Volume Tier Rules</h3>
                <p className="text-[11px] text-slate-500">Configure minimum quantities and matching discount percentages.</p>
              </div>
              <button
                type="button"
                onClick={handleAddTierRow}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tier</span>
              </button>
            </div>

            <div className="space-y-2">
              {tieredRules.map((rule, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 w-16">Tier {idx + 1}:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600 font-semibold">Buy at least</span>
                    <input
                      type="number"
                      min="1"
                      value={rule.minQty}
                      onChange={(e) => handleTierChange(idx, 'minQty', parseInt(e.target.value) || 1)}
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 font-semibold">units</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600 font-semibold">Save</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={rule.discountPercent}
                      onChange={(e) => handleTierChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 font-semibold">%</span>
                  </div>

                  {tieredRules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTierRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* E. Buy X Get Y */}
        {type === 'BUY_X_GET_Y' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Buy Quantity (X) *</label>
              <input
                type="number"
                min="1"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                placeholder="2"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Get Quantity (Y) *</label>
              <input
                type="number"
                min="1"
                value={getQuantity}
                onChange={(e) => setGetQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Discount on Y items (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={getDiscountPercent}
                onChange={(e) => setGetDiscountPercent(e.target.value)}
                placeholder="100 for Free, 50 for Half-Price"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">100% = Free, 50% = 50% Off</span>
            </div>
          </div>
        )}

        {/* F. Flash Sale Configuration */}
        {type === 'FLASH_SALE' && (
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-4">
            <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-xs">
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Flash Sale Urgent Discount Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Discount Percentage (%) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="e.g. 20 for 20% OFF"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Maximum Flash Quantity (Cap)</label>
                <input
                  type="number"
                  min="1"
                  value={maxQuantity}
                  onChange={(e) => setMaxQuantity(e.target.value)}
                  placeholder="e.g. 20 units total"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Flash Banner Headline</label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="e.g. ⚡ FLASH SALE: 20% OFF TODAY ONLY"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Coupon Code & Usage Limits */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
          <Gift className="w-4 h-4 text-amber-500" />
          <span>Coupon Code & Usage Controls (Optional)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Coupon Code</label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20, WELCOME10"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black uppercase"
            />
            <span className="text-[10px] text-slate-400">Leave blank if discount applies automatically.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Minimum Order Subtotal ($)</label>
            <input
              type="number"
              step="0.01"
              value={minOrderSubtotal}
              onChange={(e) => setMinOrderSubtotal(e.target.value)}
              placeholder="e.g. 35.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Total Usage Limit</label>
            <input
              type="number"
              min="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="e.g. 100 uses"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* 4. Scheduling & Date Limits */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Schedule & Validity Window</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Start Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              End Date & Time {type === 'FLASH_SALE' ? '*' : '(Optional)'}
            </label>
            <input
              type="datetime-local"
              required={type === 'FLASH_SALE'}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
              Promotion is Active
            </label>
          </div>
        </div>
      </div>

      {/* 5. Target Assignment (Products / Categories) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center space-x-2">
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Target Scope Assignment</span>
        </h2>

        {scope === 'CATEGORY' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Select Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="">Select a category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(scope === 'PRODUCT' || scope === 'BUNDLE' || type === 'FLASH_SALE') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Select Eligible Product(s) ({selectedProductIds.length} selected)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedProductIds.length === products.length) {
                    setSelectedProductIds([]);
                  } else {
                    setSelectedProductIds(products.map((p) => p.id));
                  }
                }}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
              >
                {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
              {isLoadingMeta ? (
                <p className="p-4 text-xs text-slate-400 text-center">Loading products...</p>
              ) : (
                products.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  return (
                    <label
                      key={prod.id}
                      className={`flex items-center space-x-3 p-2.5 hover:bg-white cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/60 font-bold' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(prod.id)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <div className="text-xs flex-1">
                        <span className="text-slate-900">{prod.name}</span>
                        <span className="text-slate-400 text-[11px] ml-2">SKU: {prod.sku}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{formatPrice(prod.price)}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {scope === 'ALL_PRODUCTS' && (
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            This promotion is storewide and will apply to all active products in your store.
          </p>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end space-x-3">
        <Link
          href="/admin/promotions"
          className="px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md disabled:opacity-50 flex items-center space-x-2"
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{isEdit ? 'Save Changes' : 'Create Promotion'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
