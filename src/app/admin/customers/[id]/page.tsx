'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  ShoppingBag, 
  DollarSign, 
  Star,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { formatDate, formatDateTime, formatPrice } from '@/lib/utils';

export default function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const res = await fetch(`/api/admin/customers/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data.customer);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomer();
  }, [params.id]);

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Loading customer details...</div>;
  }

  if (!customer) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        <p className="font-bold text-slate-700">Customer account not found.</p>
        <Link href="/admin/customers" className="text-brand-600 underline mt-2 block">
          Back to Customers Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/admin/customers"
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>{customer.name}</span>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                customer.role === 'ADMIN'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {customer.role}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Member since {formatDate(customer.createdAt)}
          </p>
        </div>
      </div>

      {/* KPI Cards: Orders, Total Spent, Reviews */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
          <p className="text-2xl font-black text-emerald-700">{formatPrice(customer.totalSpent || 0)}</p>
          <span className="text-[11px] text-slate-400 block">Across all completed orders</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders Placed</span>
          <p className="text-2xl font-black text-slate-900">{customer.orderCount || 0}</p>
          <span className="text-[11px] text-slate-400 block">Lifetime transactions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reviews Submitted</span>
          <p className="text-2xl font-black text-indigo-700">{customer.reviews?.length || 0}</p>
          <span className="text-[11px] text-slate-400 block">Product feedback &amp; ratings</span>
        </div>
      </div>

      {/* Main Grid: Customer Info & Addresses (Left) & Order History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols): Profile Info & Saved Addresses */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Contact Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-brand-600" />
              <span>Contact Information</span>
            </h2>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{customer.name}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Email Address</span>
                <span className="font-semibold text-slate-800">{customer.email}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Phone Number</span>
                <span className="font-semibold text-slate-800">{customer.phone || 'No phone recorded'}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Security Policy</span>
                <span className="text-[11px] text-emerald-700 font-bold flex items-center space-x-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Passwords strictly hashed &amp; excluded from admin portal</span>
                </span>
              </div>
            </div>
          </div>

          {/* Addresses Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Registered Addresses ({customer.addresses?.length || 0})</span>
            </h2>

            {customer.addresses && customer.addresses.length > 0 ? (
              <div className="space-y-3 divide-y divide-slate-100">
                {customer.addresses.map((addr: any, idx: number) => (
                  <div key={addr.id} className={idx > 0 ? 'pt-3' : ''}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{addr.fullName}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Default {addr.type}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700">{addr.street}</p>
                    {addr.apartment && <p className="text-slate-700">{addr.apartment}</p>}
                    <p className="text-slate-700">{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p className="text-slate-500">{addr.country}</p>
                    {addr.phone && <p className="text-slate-500 text-[11px] mt-0.5">Tel: {addr.phone}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No saved addresses on customer profile.</p>
            )}
          </div>

        </div>

        {/* Right Column (7 cols): Order History */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <ShoppingBag className="w-4 h-4 text-brand-600" />
              <span>Customer Order History ({customer.orders?.length || 0})</span>
            </h2>
          </div>

          {customer.orders && customer.orders.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {customer.orders.map((ord: any) => (
                <div key={ord.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="font-mono font-bold text-slate-900 hover:text-brand-600 flex items-center space-x-1"
                      >
                        <span>#{ord.orderNumber}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[10px] text-slate-400">({ord.items?.length || 0} items)</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {formatDateTime(ord.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-slate-900">{formatPrice(ord.total)}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      ord.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : ord.status === 'SHIPPED'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : ord.status === 'PROCESSING'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : ord.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic">
              No orders placed by this customer account yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
