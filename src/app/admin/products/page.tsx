'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Copy,
  Package,
  ExternalLink,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { ProductItem, CategoryItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('newest');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?activeOnly=false');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?activeOnly=false');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Single Product Status Toggle
  const handleToggleStatus = async (product: ProductItem) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      if (res.ok) {
        setNotification({
          type: 'success',
          message: `"${product.name}" is now ${!product.isActive ? 'Active' : 'Inactive'}.`,
        });
        fetchProducts();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Duplicate Product
  const handleDuplicateProduct = async (product: ProductItem) => {
    try {
      setNotification({ type: 'success', message: `Duplicating "${product.name}"...` });
      const res = await fetch(`/api/admin/products/${product.id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Product cloned as "${data.product.name}" (saved as Inactive for review).`,
        });
        fetchProducts();
      } else {
        throw new Error(data.error || 'Failed to duplicate product');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Single Product Delete
  const handleDeleteProduct = async (product: ProductItem) => {
    if (!confirm(`Are you sure you want to permanently delete "${product.name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Product deleted successfully.' });
        setSelectedIds((prev) => prev.filter((id) => id !== product.id));
        fetchProducts();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete product');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Bulk Actions: Select/Deselect All
  const handleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedProducts.map((p) => p.id));
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Execute Bulk Action
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (
      action === 'delete' &&
      !confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)
    ) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, productIds: selectedIds }),
      });
      const data = await res.json();

      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setSelectedIds([]);
        fetchProducts();
      } else {
        throw new Error(data.error || 'Bulk operation failed');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Filter & Sort Logic
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === '' || p.categoryId === selectedCategory;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.isActive) ||
        (statusFilter === 'inactive' && !p.isActive);

      let matchesStock = true;
      if (stockFilter === 'out_of_stock') {
        matchesStock = p.inventory === 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = p.inventory > 0 && p.inventory <= p.lowStockThreshold;
      } else if (stockFilter === 'in_stock') {
        matchesStock = p.inventory > p.lowStockThreshold;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'stock_asc':
          return a.inventory - b.inventory;
        case 'stock_desc':
          return b.inventory - a.inventory;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [products, searchQuery, selectedCategory, stockFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, duplicate, filter, sort, and bulk manage your complete store inventory
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
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

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, or brand..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; Threshold)</option>
              <option value="low_stock">Low Stock (≤ Threshold)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>

            {/* Active Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">All Visibility</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Sort Options */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent py-2 text-xs text-slate-700 font-semibold focus:outline-none pr-1"
              >
                <option value="newest">Newest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="price_asc">Price (Low → High)</option>
                <option value="price_desc">Price (High → Low)</option>
                <option value="stock_asc">Stock (Low → High)</option>
                <option value="stock_desc">Stock (High → Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar (When 1 or more items selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-amber-900 font-black">
              <span>{selectedIds.length} product{selectedIds.length > 1 ? 's' : ''} selected</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={isBulkProcessing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Activate</span>
              </button>

              <button
                onClick={() => handleBulkAction('deactivate')}
                disabled={isBulkProcessing}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>

              <button
                onClick={() => handleBulkAction('delete')}
                disabled={isBulkProcessing}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 underline font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading products...</div>
        ) : filteredAndSortedProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <button
                      onClick={handleSelectAll}
                      className="p-1 hover:text-slate-900 transition-colors"
                      title="Select all"
                    >
                      {selectedIds.length === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Item</th>
                  <th className="py-3.5 px-4">SKU / Brand</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Badges</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAndSortedProducts.map((p) => {
                  const primaryImage =
                    p.images && p.images.length > 0
                      ? p.images.find((i) => i.isPrimary)?.url || p.images[0].url
                      : 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';

                  const isLowStock = p.inventory > 0 && p.inventory <= p.lowStockThreshold;
                  const isOutOfStock = p.inventory === 0;
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleSelectProduct(p.id)}
                          className="p-1 hover:text-slate-900 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                            <Image src={primaryImage} alt="" fill sizes="48px" className="object-cover" />
                          </div>
                          <div>
                            <Link
                              href={`/products/${p.slug}`}
                              target="_blank"
                              className="font-bold text-slate-900 hover:text-brand-600 line-clamp-1 flex items-center space-x-1"
                            >
                              <span>{p.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </Link>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-900">{p.sku}</p>
                        <p className="text-slate-400 text-[11px]">{p.brand || '—'}</p>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.category?.name || 'Unassigned'}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-black text-slate-900">{formatPrice(p.price)}</p>
                        {p.salePrice && p.salePrice < p.price && (
                          <p className="text-[11px] text-rose-600 font-bold">
                            Sale: {formatPrice(p.salePrice)}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-black ${
                            isOutOfStock
                              ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                              : isLowStock
                              ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded'
                              : 'text-emerald-700'
                          }`}
                        >
                          {p.inventory} units
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.isFeatured && (
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              Featured
                            </span>
                          )}
                          {p.isBestSeller && (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              Best Seller
                            </span>
                          )}
                          {p.isNewArrival && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              New
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition-colors ${
                            p.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title="Click to toggle active status"
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Duplicate product"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
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
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No products match the selected criteria</p>
            <p className="mt-1">Adjust search parameters or clear filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
