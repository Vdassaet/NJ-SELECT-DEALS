'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  CheckCircle2, 
  Package, 
  ShoppingBag,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { OrderDetail } from '@/lib/types';
import { useCart } from '@/context/CartContext';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const fallbackOrderId = searchParams.get('orderId');
  const { clearCart } = useCart();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAndLoadOrder() {
      // 1. Session verification with Stripe
      if (sessionId) {
        try {
          const cachedMockData = typeof window !== 'undefined'
            ? sessionStorage.getItem('mock_order_data')
            : null;
          const mockOrderData = cachedMockData ? JSON.parse(cachedMockData) : null;

          const res = await fetch('/api/checkout/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              mockOrderData,
            }),
          });

          const data = await res.json();
          if (res.ok && data.order) {
            setOrder(data.order);
            clearCart();
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('mock_order_data');
            }
          } else {
            setErrorMessage(data.error || 'Unable to confirm payment status.');
          }
        } catch (err: any) {
          console.error('Error verifying payment session:', err);
          setErrorMessage('Error verifying Stripe session. Please check your account orders.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 2. Direct order ID fallback
      if (fallbackOrderId) {
        try {
          const res = await fetch(`/api/orders/${fallbackOrderId}`);
          if (res.ok) {
            const data = await res.json();
            setOrder(data.order);
            clearCart();
          } else {
            setErrorMessage('Order not found.');
          }
        } catch (err) {
          console.error('Error fetching order:', err);
          setErrorMessage('Could not load order details.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(false);
    }

    verifyAndLoadOrder();
  }, [sessionId, fallbackOrderId, clearCart]);

  if (isLoading) {
    return (
      <div className="store-container py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Verifying payment with Stripe...</p>
        <p className="text-xs text-slate-400">Please do not close this window.</p>
      </div>
    );
  }

  if (errorMessage && !order) {
    return (
      <div className="store-container py-16 max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Payment Verification Issue</h1>
        <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/account/orders"
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
          >
            Check My Orders
          </Link>
          <Link
            href="/cart"
            className="px-6 py-2.5 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700"
          >
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="store-container py-16 max-w-2xl mx-auto space-y-8">
      {/* Hero Badge & Confirmation Header */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        {/* Exact Prompts Required Text: ORDER CONFIRMED */}
        <span className="text-xs font-black uppercase text-emerald-600 tracking-wider block">
          ORDER CONFIRMED
        </span>

        {/* Exact Prompts Required Text: Thank you for your order. */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Thank you for your order.
        </h1>

        {/* Exact Prompts Required Text: Order #XXXXXXXX */}
        <p className="font-mono text-base sm:text-lg font-bold text-slate-700">
          Order #{order?.orderNumber || 'Processing'}
        </p>

        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Your payment was confirmed by Stripe. A receipt and confirmation has been dispatched to your email address.
        </p>
      </div>

      {/* Order Summary Box */}
      {order && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">Shipping To:</span>
              <p className="font-semibold text-slate-800">{order.shippingName}</p>
              <p className="text-slate-600">{order.shippingStreet}</p>
              {order.shippingApartment && <p className="text-slate-600">{order.shippingApartment}</p>}
              <p className="text-slate-600">
                {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">Payment & Order Details:</span>
              <p className="text-slate-600">Date: {formatDate(order.createdAt)}</p>
              <p className="text-slate-600">
                Payment Status: <strong className="text-emerald-600 font-bold uppercase">{order.paymentStatus}</strong>
              </p>
              <p className="text-slate-600">
                Shipping: {order.shippingCost === 0 ? 'FREE Standard' : formatPrice(order.shippingCost)}
              </p>
              <p className="font-bold text-slate-900 mt-1">Total Paid: {formatPrice(order.total)}</p>
            </div>
          </div>

          {/* Ordered Line Items */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Purchased Items ({order.items.length})
              </span>
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-slate-400">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <span className="font-black text-slate-900">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons: [View Order] and [Continue Shopping] */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/account/orders"
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <Package className="w-4 h-4" />
              <span>View Order</span>
            </Link>

            <Link
              href="/products"
              className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="store-container py-20 text-center text-slate-500 text-sm">Loading order confirmation...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
