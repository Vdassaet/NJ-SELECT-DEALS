'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Package, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Box,
  Star
} from 'lucide-react';
import { OrderDetail } from '@/lib/types';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils';
import { getTrackingUrl, calculateEstimatedDeliveryDate } from '@/lib/shipping-engine';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Error fetching orders', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
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

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading order history...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Order History</h1>
        <p className="text-xs text-slate-500 mt-1">Track, review, and inspect details of all past purchases</p>
      </div>

      {orders.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {orders.map((ord) => {
            const isExpanded = expandedOrderId === ord.id;
            const trackingLink = ord.trackingUrl || getTrackingUrl(ord.carrier, ord.trackingNumber);
            const estimatedDelivery = calculateEstimatedDeliveryDate(2, 5, 1);

            return (
              <div key={ord.id} className="p-6 transition-colors hover:bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {ord.orderNumber}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${getStatusBadge(ord.status)}`}>
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Ordered on {formatDate(ord.createdAt)} • {ord.items?.length || 0} item(s)
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-base font-black text-slate-900">
                      {formatPrice(ord.total)}
                    </span>
                    <button
                      onClick={() => toggleExpand(ord.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-6 text-xs animate-in fade-in duration-200">
                    
                    {/* Carrier & Tracking Info Banner (Customer-Facing) */}
                    {(ord.carrier || ord.trackingNumber) ? (
                      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-sm">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sky-900 text-sm">
                                {ord.carrier || 'USPS'} Delivery
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 uppercase">
                                {ord.status === 'DELIVERED' ? 'Delivered' : 'In Transit'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-sky-800 mt-0.5">
                              {ord.trackingNumber && (
                                <span>
                                  Tracking #: <strong className="font-mono text-sky-950 font-bold">{ord.trackingNumber}</strong>
                                </span>
                              )}
                              <span>•</span>
                              <span>Est. Delivery: <strong>{estimatedDelivery}</strong></span>
                            </div>
                          </div>
                        </div>

                        {trackingLink && (
                          <a
                            href={trackingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors self-start sm:self-auto"
                          >
                            <span>Track Package</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Fulfillment in progress at our Paramus warehouse. Tracking information will be emailed once dispatched.</span>
                      </div>
                    )}

                    {/* Items table */}
                    <div>
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block mb-2">
                        Items in this Shipment
                      </span>
                      <div className="bg-slate-50 rounded-xl p-3 divide-y divide-slate-200/60">
                        {ord.items?.map((item) => (
                          <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900">{item.productName}</p>
                              <p className="text-slate-500 text-[11px]">
                                Qty: {item.quantity} × {formatPrice(item.price)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3 self-end sm:self-auto">
                              <span className="font-bold text-slate-900">{formatPrice(item.total)}</span>
                              <Link
                                href={`/products/${item.productId}#customer-reviews`}
                                className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>Write Review</span>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Destination & Cost Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-900 block mb-1 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivery Address:</span>
                        </span>
                        <p className="text-slate-900 font-semibold">{ord.shippingName}</p>
                        <p className="text-slate-600">{ord.shippingStreet}</p>
                        {ord.shippingApartment && <p className="text-slate-600">{ord.shippingApartment}</p>}
                        <p className="text-slate-600">
                          {ord.shippingCity}, {ord.shippingState} {ord.shippingPostalCode}
                        </p>
                        <p className="text-slate-500 text-[11px]">{ord.shippingCountry}</p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-900 block mb-1">Financial Breakdown:</span>
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-semibold text-slate-900">{formatPrice(ord.subtotal)}</span>
                        </div>
                        {ord.discount > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discount:</span>
                            <span className="font-semibold">-{formatPrice(ord.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping ({ord.carrier || 'Standard'}):</span>
                          <span className="font-semibold text-slate-900">
                            {ord.shippingCost === 0 ? 'FREE' : formatPrice(ord.shippingCost)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Sales Tax (NJ):</span>
                          <span className="font-semibold text-slate-900">{formatPrice(ord.tax)}</span>
                        </div>
                        <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                          <span>Total Paid:</span>
                          <span>{formatPrice(ord.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 text-xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No orders placed yet</p>
          <p className="mt-1">When you make a purchase, it will appear here with full shipment tracking details.</p>
          <Link
            href="/products"
            className="inline-block mt-4 px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl"
          >
            Explore Store Catalog
          </Link>
        </div>
      )}
    </div>
  );
}
