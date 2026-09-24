'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Clock, 
  Truck, 
  ShieldCheck, 
  MapPin, 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Printer,
  RotateCcw,
  CreditCard,
  User,
  Phone,
  FileText,
  Calendar,
  Box
} from 'lucide-react';
import { OrderDetail } from '@/lib/types';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { getTrackingUrl, calculateEstimatedDeliveryDate, ORDER_LIFECYCLE_STATUSES } from '@/lib/shipping-engine';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('PENDING');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [carrier, setCarrier] = useState('USPS');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setStatus(data.order.status);
        setPaymentStatus(data.order.paymentStatus || 'PENDING');
        setCarrier(data.order.carrier || 'USPS');
        setTrackingNumber(data.order.trackingNumber || '');
        setTrackingUrl(data.order.trackingUrl || '');
        setNotes(data.order.notes || '');
        setShippingDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    setIsUpdating(true);

    try {
      // Calculate auto-tracking URL if not explicitly given
      const resolvedTrackingUrl = trackingUrl.trim() || getTrackingUrl(carrier, trackingNumber.trim()) || '';

      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          paymentStatus,
          carrier,
          trackingNumber: trackingNumber.trim(),
          trackingUrl: resolvedTrackingUrl,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      setNotification({
        type: 'success',
        message: status === 'SHIPPED'
          ? `Order #${order?.orderNumber} status updated to SHIPPED. Customer shipping notification dispatched!`
          : 'Order updated successfully.',
      });
      fetchOrder();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating order.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!order) return;
    setIsRefunding(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Order #${order.orderNumber} successfully refunded and inventory restored.`,
        });
        setShowRefundModal(false);
        fetchOrder();
      } else {
        throw new Error(data.error || 'Failed to process refund');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error refunding order.' });
    } finally {
      setIsRefunding(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <p className="font-bold text-slate-700">Order not found.</p>
        <Link href="/admin/orders" className="text-brand-600 underline mt-2 block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const effectiveTrackingLink = order.trackingUrl || getTrackingUrl(order.carrier, order.trackingNumber);
  const estimatedDeliveryRange = calculateEstimatedDeliveryDate(2, 5, 1);

  return (
    <div className="space-y-6">
      {/* Screen Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/orders"
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                Order #{order.orderNumber}
              </h1>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                order.status === 'DELIVERED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : order.status === 'SHIPPED'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : order.status === 'PROCESSING'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : order.status === 'CANCELLED'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons: Print Slip & Refund */}
        <div className="flex items-center space-x-2">
          <Link
            href={`/admin/orders/${order.id}/print`}
            target="_blank"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Packing Slip</span>
          </Link>

          {(order as any).paymentStatus !== 'REFUNDED' && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Issue Refund</span>
            </button>
          )}
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

      {/* Main Order Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Items, Snapshot Details, Event Logs (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Carrier & Shipping Status Banner */}
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-sky-500 text-white rounded-xl shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sky-900 text-sm">
                  {order.carrier || 'USPS'} Delivery
                </p>
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-sky-800 mt-0.5">
                  {order.trackingNumber ? (
                    <>
                      <span>Tracking: <strong className="font-mono">{order.trackingNumber}</strong></span>
                      <span>•</span>
                      <span>Est. Arrival: <strong>{estimatedDeliveryRange}</strong></span>
                    </>
                  ) : (
                    <span>Awaiting shipping fulfillment &amp; carrier tracking number</span>
                  )}
                </div>
              </div>
            </div>

            {effectiveTrackingLink && (
              <a
                href={effectiveTrackingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-sm transition-colors self-start sm:self-auto"
              >
                <span>Track Package</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Order Items List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Order Items ({order.items?.length || 0})
              </h2>
              <span className="text-[11px] text-slate-400">Total Units: {order.items?.reduce((acc, i) => acc + i.quantity, 0)}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                      <Image
                        src={item.productImage || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-slate-400 text-[11px]">
                        {formatPrice(item.price)} × {item.quantity} unit(s)
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-slate-900">{formatPrice(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span className="font-bold">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee</span>
                <span className="font-bold text-slate-900">
                  {order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span className="font-bold text-slate-900">{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Address Snapshot Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-900 font-black uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-brand-600" />
                <span>Customer Profile</span>
              </div>
              <div>
                <p className="text-slate-400">Account Type</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {order.userId ? (
                    <span className="text-brand-600 font-semibold">Registered Customer</span>
                  ) : (
                    <span className="text-slate-500 font-semibold">Guest Checkout</span>
                  )}
                </p>

                <p className="text-slate-400 mt-2">Email Address</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {order.guestEmail || order.user?.email || 'No email recorded'}
                </p>

                {order.user && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <Link
                      href={`/admin/customers/${order.user.id}`}
                      className="text-brand-600 hover:underline font-bold flex items-center space-x-1"
                    >
                      <span>View Customer History &amp; Orders</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address Snapshot */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-900 font-black uppercase tracking-wider text-xs border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Shipping Destination</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{order.shippingName}</p>
                <p className="text-slate-800 font-medium mt-1">{order.shippingStreet}</p>
                {order.shippingApartment && <p className="text-slate-800 font-medium">{order.shippingApartment}</p>}
                <p className="text-slate-800 font-medium">
                  {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                </p>
                <p className="text-slate-500 font-medium">{order.shippingCountry}</p>
                {order.shippingPhone && (
                  <p className="text-slate-600 mt-2 font-mono flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{order.shippingPhone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Email Notification Event Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Email Audit Trail ({order.emails?.length || 0})
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">Recorded Notifications</span>
            </div>

            {(!order.emails || order.emails.length === 0) ? (
              <div className="p-6 text-center text-slate-400 italic">
                No email events logged for this order yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {order.emails.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                          {log.template}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center space-x-1 ${
                            log.status === 'SENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.status === 'SENT' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                          {log.status === 'PENDING' && <Clock className="w-3 h-3" />}
                          <span>{log.status}</span>
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Recipient: <strong className="text-slate-900">{log.recipient}</strong>
                      </p>
                      <p className="text-slate-400 text-[11px] italic">
                        Subject: &quot;{log.subject}&quot;
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 flex-shrink-0">
                      <p>{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Status & Carrier Fulfillment Controls (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Fulfillment &amp; Shipping Controls
          </h2>

          <form onSubmit={handleUpdateStatus} className="space-y-4">
            {/* Status Dropdown - Supports all 8 lifecycle statuses */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Order Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="PENDING">Pending (Awaiting Confirmation)</option>
                <option value="PROCESSING">Processing (Warehouse Fulfillment)</option>
                <option value="SHIPPED">Shipped (Dispatches Customer Tracking Email)</option>
                <option value="DELIVERED">Delivered (Customer Delivery Email)</option>
                <option value="CANCELLED">Cancelled (Restores Inventory)</option>
              </select>
            </div>

            {/* Carrier Architecture Selection: USPS, UPS, FedEx, Other */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <p className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-brand-600" />
                <span>Carrier &amp; Tracking Configuration</span>
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="USPS">USPS (United States Postal Service)</option>
                  <option value="UPS">UPS (United Parcel Service)</option>
                  <option value="FEDEX">FedEx</option>
                  <option value="DHL">DHL Express</option>
                  <option value="OTHER">Other Carrier</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 9400 1000 0000 0000 00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Manual tracking entry supported when carrier API credentials are not set.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Shipping Date</label>
                <input
                  type="date"
                  value={shippingDate}
                  onChange={(e) => setShippingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Custom Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="Auto-generated if left empty"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Shipping Notes / Internal Memo</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shipping instructions, packaging notes or cancellation reason..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isUpdating ? 'Saving...' : 'Update Status & Shipping'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-2 text-rose-600 font-black text-sm">
              <RotateCcw className="w-5 h-5" />
              <span>Issue Customer Refund</span>
            </div>
            <p className="text-slate-600">
              This will mark order <strong className="font-mono">#{order.orderNumber}</strong> as{' '}
              <strong className="text-rose-600">REFUNDED</strong>, cancel fulfillment, and restock{' '}
              {order.items?.length || 0} product(s) back into inventory.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Refund Reason</label>
              <textarea
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer returned items / damaged in transit / requested cancellation..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                disabled={isRefunding}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRefunding ? 'Processing...' : 'Confirm Full Refund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
