'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Printer, 
  ArrowLeft, 
  Truck, 
  Package, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { OrderDetail } from '@/lib/types';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils';
import { calculateEstimatedDeliveryDate, getTrackingUrl } from '@/lib/shipping-engine';

export default function PrintableOrderPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrder();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Generating printable slip...</div>;
  }

  if (!order) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <p className="font-bold text-slate-800">Order not found</p>
        <Link href="/admin/orders" className="text-brand-600 underline mt-2 block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const estimatedDelivery = calculateEstimatedDeliveryDate(2, 5, 1);
  const totalUnits = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-4xl mx-auto print:p-0 print:max-w-none">
      {/* Top action toolbar (Hidden when printing on paper) */}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-200 print:hidden">
        <Link
          href={`/admin/orders/${order.id}`}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Order #{order.orderNumber}</span>
        </Link>

        <button
          onClick={handlePrint}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Print Packing Slip (Standard Paper / A4 / Letter)</span>
        </button>
      </div>

      {/* DOCUMENT HEADER: Store Information & Order Identifiers */}
      <div className="border-b-2 border-slate-900 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm print:border print:border-slate-900">
                NJ
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">NJ SELECT DEALS</h1>
            </div>
            <p className="text-xs text-slate-600">Paramus Distribution Center • 100 Route 17 North, Paramus, NJ 07652</p>
            <p className="text-xs text-slate-600">Customer Support: (800) 555-DEAL • orders@njselectdeals.com</p>
            <p className="text-[11px] text-slate-500">Store Website: https://njselectdeals.com</p>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-xs font-black rounded print:bg-slate-200 print:text-slate-900">
              PACKING SLIP &amp; INVOICE
            </span>
            <p className="font-mono text-xl font-black text-slate-900">#{order.orderNumber}</p>
            <p className="text-xs text-slate-600">Order Date: {formatDate(order.createdAt)}</p>
            <p className="text-xs text-slate-600">Print Date: {formatDateTime(new Date())}</p>
          </div>
        </div>
      </div>

      {/* METADATA BAR: Shipping Method, Carrier, Tracking, Delivery Est */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs print:bg-slate-50">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Fulfillment Carrier</span>
          <strong className="text-slate-900 text-sm">{order.carrier || 'USPS Ground Advantage'}</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Tracking Number</span>
          <strong className="font-mono text-slate-900 text-sm block">
            {order.trackingNumber || 'Pending Tracking'}
          </strong>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Status</span>
          <strong className="text-slate-900 uppercase font-black">{order.status}</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Delivery</span>
          <strong className="text-slate-900">{estimatedDelivery}</strong>
        </div>
      </div>

      {/* RECIPIENT & BILLING ADDRESSES */}
      <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
        {/* Ship To */}
        <div className="p-4 border border-slate-200 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 mb-2">
            SHIP TO (RECIPIENT)
          </span>
          <p className="font-bold text-sm text-slate-900">{order.shippingName}</p>
          <p className="text-slate-800">{order.shippingStreet}</p>
          {order.shippingApartment && <p className="text-slate-800">{order.shippingApartment}</p>}
          <p className="text-slate-800">
            {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
          </p>
          <p className="text-slate-600">{order.shippingCountry}</p>
          {order.shippingPhone && <p className="text-slate-600 pt-1">Tel: {order.shippingPhone}</p>}
        </div>

        {/* Customer Account Details */}
        <div className="p-4 border border-slate-200 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 mb-2">
            BUYER / BILLING INFO
          </span>
          <p className="font-bold text-sm text-slate-900">
            {order.user?.name || order.shippingName}
          </p>
          <p className="text-slate-800">{order.guestEmail || order.user?.email}</p>
          <p className="text-slate-600">
            Payment Status: <strong className="text-slate-900 uppercase">{(order as any).paymentStatus || 'PAID'}</strong>
          </p>
          <p className="text-slate-600">
            Payment Method: <strong className="font-mono text-slate-800 text-[11px]">{(order as any).stripePaymentId ? 'STRIPE' : 'MANUAL'}</strong>
          </p>
          {order.notes && (
            <p className="text-slate-700 italic pt-1 text-[11px] border-t border-slate-100 mt-2">
              Note: &quot;{order.notes}&quot;
            </p>
          )}
        </div>
      </div>

      {/* ITEMS TABLE: SKU, Product Name, Quantity, Unit Price, Line Total */}
      <div className="mb-8">
        <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider block mb-2">
          ORDER ITEMS ({totalUnits} total units)
        </span>
        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 w-16">Item #</th>
              <th className="py-2.5 px-3">Product Description</th>
              <th className="py-2.5 px-3 text-center w-24">Quantity</th>
              <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
              <th className="py-2.5 px-3 text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {order.items?.map((item, idx) => (
              <tr key={item.id} className="print:border-b print:border-slate-200">
                <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                <td className="py-3 px-3">
                  <p className="font-bold text-slate-900">{item.productName}</p>
                  {(item as any).product?.sku && (
                    <p className="text-[10px] font-mono text-slate-500">SKU: {(item as any).product.sku}</p>
                  )}
                </td>
                <td className="py-3 px-3 text-center font-black text-slate-900 text-sm">
                  {item.quantity}
                </td>
                <td className="py-3 px-3 text-right font-medium">
                  {formatPrice(item.price)}
                </td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">
                  {formatPrice(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FINANCIAL TOTALS */}
      <div className="flex justify-end mb-8 text-xs">
        <div className="w-72 space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-bold text-slate-900">{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Discount Applied:</span>
              <span className="font-bold">-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Shipping ({order.carrier || 'Standard'}):</span>
            <span className="font-bold text-slate-900">
              {order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Sales Tax (NJ):</span>
            <span className="font-bold text-slate-900">{formatPrice(order.tax)}</span>
          </div>
          <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t-2 border-slate-300">
            <span>Total Paid:</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* FOOTER & RETURN INSTRUCTIONS */}
      <div className="border-t border-slate-200 pt-6 text-[11px] text-slate-500 text-center space-y-1">
        <p className="font-bold text-slate-700">Thank you for your order with NJ Select Deals!</p>
        <p>
          Questions about your shipment or return requests? Contact our Paramus warehouse team at{' '}
          <strong>support@njselectdeals.com</strong> or call <strong>(800) 555-DEAL</strong>.
        </p>
        <p className="text-[10px] text-slate-400 pt-2">
          NJ Select Deals • 100 Route 17 North, Paramus, NJ 07652 • All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
