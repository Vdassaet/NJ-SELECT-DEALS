'use client';

import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  AlertCircle, 
  RotateCw,
  Search,
  Flame,
  Tag,
  Star
} from 'lucide-react';
import { ProductItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { RecommendationType } from '@/lib/recommendation-engine';

interface RelatedProductsManagerProps {
  productId: string;
  productName: string;
}

export function RelatedProductsManager({ productId, productName }: RelatedProductsManagerProps) {
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [activeTab, setActiveTab] = useState<RecommendationType>('RELATED');

  // Multi-tier selected relation IDs
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [fbtIds, setFbtIds] = useState<string[]>([]);
  const [alsoBoughtIds, setAlsoBoughtIds] = useState<string[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [allRes, relatedRes] = await Promise.all([
          fetch('/api/products?limit=150'),
          fetch(`/api/products/${productId}/related`),
        ]);

        if (allRes.ok) {
          const allData = await allRes.json();
          setAllProducts((allData.products || []).filter((p: any) => p.id !== productId));
        }

        if (relatedRes.ok) {
          const relatedData = await relatedRes.json();
          if (Array.isArray(relatedData.relatedProducts)) {
            setRelatedIds(relatedData.relatedProducts.map((p: any) => p.id));
          }
          if (Array.isArray(relatedData.frequentlyBoughtTogether)) {
            setFbtIds(relatedData.frequentlyBoughtTogether.map((p: any) => p.id));
          }
          if (Array.isArray(relatedData.customersAlsoBought)) {
            setAlsoBoughtIds(relatedData.customersAlsoBought.map((p: any) => p.id));
          }
          if (Array.isArray(relatedData.recommendedProducts)) {
            setRecommendedIds(relatedData.recommendedProducts.map((p: any) => p.id));
          }
        }
      } catch (err) {
        console.error('Failed to load related products', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [productId]);

  // Current active list getter & setter
  const getCurrentList = (): string[] => {
    switch (activeTab) {
      case 'FREQUENTLY_BOUGHT_TOGETHER':
        return fbtIds;
      case 'CUSTOMERS_ALSO_BOUGHT':
        return alsoBoughtIds;
      case 'RECOMMENDED':
        return recommendedIds;
      case 'RELATED':
      default:
        return relatedIds;
    }
  };

  const setCurrentList = (updater: (prev: string[]) => string[]) => {
    switch (activeTab) {
      case 'FREQUENTLY_BOUGHT_TOGETHER':
        setFbtIds(updater);
        break;
      case 'CUSTOMERS_ALSO_BOUGHT':
        setAlsoBoughtIds(updater);
        break;
      case 'RECOMMENDED':
        setRecommendedIds(updater);
        break;
      case 'RELATED':
      default:
        setRelatedIds(updater);
        break;
    }
  };

  const handleAddProduct = (id: string) => {
    setCurrentList((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleRemoveProduct = (id: string) => {
    setCurrentList((prev) => prev.filter((pId) => pId !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const list = getCurrentList();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCurrentList(() => updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/products/${productId}/related`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedProductIds: relatedIds,
          frequentlyBoughtTogetherIds: fbtIds,
          customersAlsoBoughtIds: alsoBoughtIds,
          recommendedProductIds: recommendedIds,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: 'All recommendation rules saved successfully!' });
        setTimeout(() => setFeedback(null), 3500);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to save recommendations.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network error saving recommendations.' });
    } finally {
      setIsSaving(false);
    }
  };

  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const currentSelectedIds = getCurrentList();

  const filteredCatalog = allProducts.filter((p) => {
    if (currentSelectedIds.includes(p.id)) return false;
    if (!searchQuery.trim()) return true;
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2 text-amber-900 font-black text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Product Recommendations Hub</span>
          </div>
          <h3 className="text-base font-black text-slate-900 mt-0.5">
            Configure Recommendations for &ldquo;{productName}&rdquo;
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin can curate custom selections for Related Products, Frequently Bought Together, Customers Also Bought, and Recommended Items.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center space-x-1.5 self-start sm:self-auto transition-colors"
        >
          {isSaving ? (
            <span>Saving Rules...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Save All Recommendations</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs for the 4 Recommendation Tiers */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('RELATED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
            activeTab === 'RELATED'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Related Products ({relatedIds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FREQUENTLY_BOUGHT_TOGETHER')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
            activeTab === 'FREQUENTLY_BOUGHT_TOGETHER'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Frequently Bought Together ({fbtIds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS_ALSO_BOUGHT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
            activeTab === 'CUSTOMERS_ALSO_BOUGHT'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Customers Also Bought ({alsoBoughtIds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECOMMENDED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
            activeTab === 'RECOMMENDED'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Recommended Products ({recommendedIds.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
          <RotateCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Loading recommendations data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Configured Products for Current Tab */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Selected for &ldquo;{activeTab.replace(/_/g, ' ')}&rdquo; ({currentSelectedIds.length})
              </span>
              {currentSelectedIds.length > 0 ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Admin Overrides Active
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Using Smart Fallback
                </span>
              )}
            </div>

            {currentSelectedIds.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No custom products selected for this section. The store will automatically populate it using category, brand, order history, and best sellers.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {currentSelectedIds.map((id, index) => {
                  const prod = productMap.get(id);
                  if (!prod) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span className="font-mono text-slate-400 font-bold w-5">#{index + 1}</span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block truncate">{prod.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatPrice(prod.price)} · {prod.brand || 'No brand'} · SKU: {prod.sku}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === currentSelectedIds.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(id)}
                          className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Catalog Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Add from Store Catalog</span>
              <span className="text-[11px] text-slate-400">{filteredCatalog.length} available</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by name, brand, SKU..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredCatalog.slice(0, 30).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 hover:border-brand-300 text-xs transition-colors"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-800 block truncate">{prod.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatPrice(prod.price)} · {prod.brand || 'No brand'} · SKU: {prod.sku}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddProduct(prod.id)}
                    className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg flex items-center space-x-1 flex-shrink-0 transition-colors font-bold text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
