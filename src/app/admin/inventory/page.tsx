'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Boxes, 
  AlertTriangle, 
  Check, 
  Search, 
  AlertCircle, 
  Plus, 
  Minus, 
  History, 
  TrendingDown, 
  CheckCircle2, 
  DollarSign, 
  Archive,
  RefreshCw,
  Edit2,
  X
} from 'lucide-react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { InventoryLogItem, InventoryMetrics } from '@/lib/types';

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
    inventoryValuation: 0,
  });
  const [history, setHistory] = useState<InventoryLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY'>('STOCK');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'IN'>('ALL');

  // Modal / Adjustment state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adjustModalProduct, setAdjustModalProduct] = useState<any | null>(null);
  const [customNewStock, setCustomNewStock] = useState<number>(0);
  const [customReason, setCustomReason] = useState<string>('RESTOCK');
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState<number>(5);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.history) setHistory(data.history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleQuickAdjust = async (productId: string, adjustment: number, defaultReason: string = 'RESTOCK') => {
    setUpdatingId(productId);
    setNotification(null);

    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          adjustment,
          reason: adjustment > 0 ? defaultReason : 'MANUAL_ADJUSTMENT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      setNotification({ type: 'success', message: 'Inventory adjusted and logged in history.' });
      fetchInventory();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating stock.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveCustomAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    setUpdatingId(adjustModalProduct.id);
    setNotification(null);

    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustModalProduct.id,
          inventory: customNewStock,
          reason: customReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stock');
      }

      setNotification({ type: 'success', message: `Stock level updated to ${customNewStock} (${customReason}).` });
      setAdjustModalProduct(null);
      fetchInventory();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating stock.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveThreshold = async (productId: string) => {
    setUpdatingId(productId);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          lowStockThreshold: thresholdInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update threshold');

      setNotification({ type: 'success', message: 'Low stock threshold saved.' });
      setEditingThresholdId(null);
      fetchInventory();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveCost = async (productId: string) => {
    setUpdatingId(productId);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          costPrice: costInput === '' ? null : parseFloat(costInput),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update unit cost');

      setNotification({ type: 'success', message: 'Unit cost saved. Inventory valuation updated.' });
      setEditingCostId(null);
      fetchInventory();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

    const available = p.availableQuantity ?? Math.max(0, p.inventory - (p.reservedQuantity || 0));

    if (statusFilter === 'LOW') {
      return matchesSearch && available > 0 && available <= p.lowStockThreshold;
    }
    if (statusFilter === 'OUT') {
      return matchesSearch && available <= 0;
    }
    if (statusFilter === 'IN') {
      return matchesSearch && available > p.lowStockThreshold;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock monitoring, audit history, low-stock thresholds, and valuation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInventory}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs shadow-sm flex items-center space-x-1.5"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Products</span>
          <p className="text-2xl font-black text-slate-900">{metrics.totalProducts}</p>
          <span className="text-[10px] text-slate-400 block">Catalog items</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">In Stock</span>
          <p className="text-2xl font-black text-emerald-700">{metrics.inStockCount}</p>
          <span className="text-[10px] text-emerald-600 block">Healthy inventory</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Low Stock</span>
          <p className="text-2xl font-black text-amber-700">{metrics.lowStockCount}</p>
          <span className="text-[10px] text-amber-600 block">At or below threshold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Out of Stock</span>
          <p className="text-2xl font-black text-rose-700">{metrics.outOfStockCount}</p>
          <span className="text-[10px] text-rose-600 block">0 available units</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Valuation</span>
          <p className="text-2xl font-black text-slate-900">{formatPrice(metrics.inventoryValuation)}</p>
          <span className="text-[10px] text-slate-400 block">Unit cost / retail value</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`pb-3 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'STOCK'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Product Inventory ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Inventory History & Audit Trail ({history.length})</span>
        </button>
      </div>

      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          {/* Filters and search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, brand..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Status Segmented Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStatusFilter('LOW')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'LOW' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Low Stock ({metrics.lowStockCount})
              </button>
              <button
                onClick={() => setStatusFilter('OUT')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'OUT' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Out of Stock ({metrics.outOfStockCount})
              </button>
              <button
                onClick={() => setStatusFilter('IN')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'IN' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                In Stock ({metrics.inStockCount})
              </button>
            </div>
          </div>

          {/* Product Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading inventory data...</div>
            ) : filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Item & Brand</th>
                      <th className="py-3.5 px-4">SKU</th>
                      <th className="py-3.5 px-4">Available Qty</th>
                      <th className="py-3.5 px-4">Unit Cost</th>
                      <th className="py-3.5 px-4">Threshold</th>
                      <th className="py-3.5 px-4">Inventory Status</th>
                      <th className="py-3.5 px-4 text-right">Quick Stock Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProducts.map((p) => {
                      const available = p.availableQuantity ?? Math.max(0, p.inventory - (p.reservedQuantity || 0));
                      const isOutOfStock = available <= 0;
                      const isLowStock = available > 0 && available <= p.lowStockThreshold;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 line-clamp-1">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.brand || p.category?.name || 'NJ Select'}</p>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {p.sku}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-baseline space-x-1.5">
                              <span
                                className={`text-base font-black ${
                                  isOutOfStock
                                    ? 'text-rose-600'
                                    : isLowStock
                                    ? 'text-amber-700'
                                    : 'text-slate-900'
                                }`}
                              >
                                {available}
                              </span>
                              {p.reservedQuantity > 0 && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({p.reservedQuantity} reserved)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Unit Cost Editable */}
                          <td className="py-3.5 px-4">
                            {editingCostId === p.id ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={costInput}
                                  onChange={(e) => setCostInput(e.target.value)}
                                  className="w-16 px-1.5 py-1 bg-white border border-brand-500 rounded text-xs text-slate-900 font-bold"
                                />
                                <button
                                  onClick={() => handleSaveCost(p.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  title="Save"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingCostId(null)}
                                  className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingCostId(p.id);
                                  setCostInput(p.costPrice != null ? String(p.costPrice) : '');
                                }}
                                className="group flex items-center space-x-1 text-slate-700 hover:text-brand-600 font-semibold text-xs"
                                title="Click to edit unit cost"
                              >
                                <span>{p.costPrice ? formatPrice(p.costPrice) : 'Set Cost'}</span>
                                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                              </button>
                            )}
                          </td>

                          {/* Low Stock Threshold Editable */}
                          <td className="py-3.5 px-4">
                            {editingThresholdId === p.id ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={thresholdInput}
                                  onChange={(e) => setThresholdInput(parseInt(e.target.value, 10) || 1)}
                                  className="w-14 px-1.5 py-1 bg-white border border-brand-500 rounded text-xs text-slate-900 font-bold"
                                />
                                <button
                                  onClick={() => handleSaveThreshold(p.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  title="Save"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingThresholdId(null)}
                                  className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingThresholdId(p.id);
                                  setThresholdInput(p.lowStockThreshold || 5);
                                }}
                                className="group flex items-center space-x-1 text-slate-600 hover:text-brand-600 text-xs font-semibold"
                                title="Click to configure threshold per product"
                              >
                                <span>≤ {p.lowStockThreshold} units</span>
                                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                              </button>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {isOutOfStock ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <div className="inline-flex flex-col">
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                  LOW STOCK
                                </span>
                                <span className="text-[10px] text-amber-700 font-bold mt-0.5">
                                  Only {available} remaining
                                </span>
                              </div>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                In Stock
                              </span>
                            )}
                          </td>

                          {/* Quick Adjust Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleQuickAdjust(p.id, -1)}
                                disabled={updatingId === p.id || available <= 0}
                                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 font-bold flex items-center justify-center text-xs"
                                title="Decrease by 1 unit"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(p.id, 1)}
                                disabled={updatingId === p.id}
                                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 font-bold flex items-center justify-center text-xs"
                                title="Increase by 1 unit"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(p.id, 10, 'RESTOCK')}
                                disabled={updatingId === p.id}
                                className="px-2 h-7 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-lg text-xs"
                                title="Quick restock +10"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustModalProduct(p);
                                  setCustomNewStock(p.inventory);
                                  setCustomReason('RESTOCK');
                                }}
                                className="px-2.5 h-7 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
                                title="Set exact quantity & reason"
                              >
                                Set Qty
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No matching inventory items</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Inventory Audit History Trail
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every quantity change recorded with SKU, previous/new stock, difference, and audit reason
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Showing latest {history.length} records
            </span>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Prev Qty</th>
                    <th className="py-3 px-4">New Qty</th>
                    <th className="py-3 px-4">Difference</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">User / Admin</th>
                    <th className="py-3 px-4">Order Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 line-clamp-1">
                        {log.product?.name || 'Item'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {log.sku}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {log.previousQuantity}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {log.newQuantity}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            log.difference > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.difference < 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.difference > 0 ? `+${log.difference}` : log.difference}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {log.reason}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {log.performedBy || log.user?.email || 'SYSTEM'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-800 font-bold">
                        {log.orderNumber ? (
                          <span className="text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            #{log.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              No inventory history recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Set Quantity Modal with Reason Tracking */}
      {adjustModalProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Adjust Product Stock Level
              </h3>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="font-bold text-slate-900 text-sm">{adjustModalProduct.name}</p>
              <p className="text-slate-400 font-mono mt-0.5">SKU: {adjustModalProduct.sku}</p>
              <p className="text-slate-600 mt-1">Current Stock: <strong>{adjustModalProduct.inventory} units</strong></p>
            </div>

            <form onSubmit={handleSaveCustomAdjustment} className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Total Inventory Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={customNewStock}
                  onChange={(e) => setCustomNewStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adjustment Reason (Audit Trail)</label>
                <select
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="RESTOCK">RESTOCK - New shipment received from supplier</option>
                  <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT - Routine count correction</option>
                  <option value="DAMAGED_EXPIRED">DAMAGED_EXPIRED - Spoiled, damaged, or expired stock</option>
                  <option value="CUSTOMER_RETURN">CUSTOMER_RETURN - Restocked customer return</option>
                  <option value="AUDIT_COUNT">AUDIT_COUNT - Annual warehouse physical audit count</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === adjustModalProduct.id}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Save & Log Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
