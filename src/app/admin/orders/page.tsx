'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle,
  Filter,
  DollarSign,
  User,
  ExternalLink,
  Printer,
  Package,
  RotateCcw
} from 'lucide-react';
import { OrderDetail } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { getTrackingUrl } from '@/lib/shipping-engine';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'SHIPPED':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'PACKED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PROCESSING':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'REFUNDED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REFUNDED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesPayment = paymentFilter === 'ALL' || (o as any).paymentStatus === paymentFilter;
      const matchesCarrier = carrierFilter === 'ALL' || (o.carrier || 'USPS').toUpperCase() === carrierFilter;
      return matchesPayment && matchesCarrier;
    });
  }, [orders, paymentFilter, carrierFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process fulfillment, attach carrier tracking, print packing slips, and manage order statuses
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            Total Orders: {filteredOrders.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, email, address, tracking #..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Additional Filter Selects */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Payment Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Payments</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Carrier Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Carrier:</span>
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Carriers</option>
                <option value="USPS">USPS</option>
                <option value="UPS">UPS</option>
                <option value="FEDEX">FedEx</option>
                <option value="DHL">DHL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fulfillment Lifecycle Status Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full pb-1">
          {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading orders...</div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Carrier &amp; Tracking</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((ord: any) => {
                  const trackingLink = ord.trackingUrl || getTrackingUrl(ord.carrier, ord.trackingNumber);

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="font-mono font-bold text-slate-900 hover:text-brand-600 flex items-center space-x-1"
                        >
                          <span>{ord.orderNumber}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{ord.shippingName}</p>
                        <p className="text-[11px] text-slate-400">{ord.guestEmail || ord.user?.email || '—'}</p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(ord.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 font-medium">
                        {ord.items?.length || 0} product(s)
                      </td>

                      <td className="py-3.5 px-4">
                        {ord.trackingNumber ? (
                          <div>
                            <span className="font-bold text-slate-800 text-[11px] block">{ord.carrier || 'USPS'}</span>
                            {trackingLink ? (
                              <a
                                href={trackingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-blue-600 hover:underline flex items-center space-x-1 text-[11px]"
                              >
                                <span>{ord.trackingNumber}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="font-mono text-slate-600 text-[11px]">{ord.trackingNumber}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unfulfilled</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getPaymentBadge(ord.paymentStatus || 'PENDING')}`}>
                          {ord.paymentStatus || 'PENDING'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {formatPrice(ord.total)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadge(ord.status)}`}>
                          {ord.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link
                            href={`/admin/orders/${ord.id}/print`}
                            target="_blank"
                            title="Print Packing Slip"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-brand-600 text-white font-bold rounded-lg transition-colors text-[11px]"
                          >
                            <span>Open</span>
                          </Link>
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
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No orders match the selected criteria</p>
            <p className="mt-1">Adjust search parameters or clear status filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
