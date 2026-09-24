'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Save, 
  Check, 
  AlertCircle, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  Box,
  Layers,
  Scale,
  Calendar,
  Key,
  Globe,
  Settings
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { CARRIERS } from '@/lib/shipping-engine';

export default function AdminShippingPage() {
  const [activeTab, setActiveTab] = useState<'methods' | 'rates' | 'zones' | 'carriers'>('methods');

  const [settings, setSettings] = useState<Record<string, string>>({
    // Free Shipping & Threshold
    free_shipping_enabled: 'true',
    free_shipping_threshold: '50',
    free_shipping_text: 'Free Standard Shipping on orders over $50',

    // Flat Rate
    flat_rate_enabled: 'true',
    standard_shipping_rate: '4.99',
    expedited_shipping_rate: '12.99',
    overnight_shipping_enabled: 'false',
    overnight_shipping_rate: '29.99',

    // Weight-Based Shipping
    shipping_weight_enabled: 'true',
    shipping_weight_tier_base_lbs: '2.0',
    shipping_rate_per_lb: '0.75',

    // Order-Value-Based Shipping
    order_value_shipping_enabled: 'true',
    order_value_tier1_max: '25',
    order_value_tier1_fee: '6.99',
    order_value_tier2_max: '50',
    order_value_tier2_fee: '4.99',

    // Zones & Methods
    shipping_origin_zip: '07652',
    shipping_origin_state: 'NJ',
    shipping_origin_city: 'Paramus',
    zone_domestic_enabled: 'true',
    zone_extended_enabled: 'true', // AK, HI, PR
    zone_extended_surcharge: '5.00',
    handling_days: '1',
    transit_days_standard: '2–5 business days',
    transit_days_expedited: '1–2 business days',

    // Carriers Configuration
    shipping_carrier_default: 'USPS',
    usps_enabled: 'true',
    ups_enabled: 'true',
    fedex_enabled: 'true',
    usps_account_id: '',
    ups_account_id: '',
    fedex_account_id: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotification(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'Shipping settings, methods, and carrier configurations updated.' });
      } else {
        throw new Error(data.error || 'Failed to update shipping rules');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Loading shipping settings...</div>;
  }

  const tabs = [
    { id: 'methods', label: 'Shipping Methods & Rates', icon: Truck },
    { id: 'rates', label: 'Weight & Order-Value Rules', icon: Scale },
    { id: 'zones', label: 'Shipping Zones & Transit', icon: Globe },
    { id: 'carriers', label: 'Carrier Architecture (USPS, UPS, FedEx)', icon: Key },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-6 h-6 text-brand-600" />
            <span>Store Shipping Management System</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure free shipping, flat rates, weight-based &amp; order-value tiers, shipping zones, and carrier integrations
          </p>
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

      {/* Tabs navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 font-bold text-xs rounded-xl transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* TAB 1: Methods & Flat Rates */}
        {activeTab === 'methods' && (
          <div className="space-y-6">
            {/* Free Shipping Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>1. Free Shipping Rules</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Free Shipping Status</label>
                  <select
                    value={settings.free_shipping_enabled}
                    onChange={(e) => handleChange('free_shipping_enabled', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="true">Enabled (Orders ≥ threshold qualify)</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Minimum Order Subtotal ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={settings.free_shipping_threshold}
                    onChange={(e) => handleChange('free_shipping_threshold', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Orders above this amount receive free delivery.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Free Shipping Badge / Promotional Text</label>
                  <input
                    type="text"
                    value={settings.free_shipping_text}
                    onChange={(e) => handleChange('free_shipping_text', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Flat-Rate Shipping Methods */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <Truck className="w-4 h-4 text-brand-600" />
                <span>2. Flat-Rate Shipping Methods</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Standard Flat Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={settings.standard_shipping_rate}
                    onChange={(e) => handleChange('standard_shipping_rate', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Applied when cart is below free shipping minimum.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expedited 2-Day Flat Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.expedited_shipping_rate}
                    onChange={(e) => handleChange('expedited_shipping_rate', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Priority 2-day transit.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Next-Day Priority Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.overnight_shipping_rate}
                    onChange={(e) => handleChange('overnight_shipping_rate', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">FedEx / UPS overnight option.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Weight & Order Value */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            {/* Weight-Based Shipping */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Weight-Based Shipping Tiers</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Weight-Based Surcharge</label>
                  <select
                    value={settings.shipping_weight_enabled}
                    onChange={(e) => handleChange('shipping_weight_enabled', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled (Ignore weight)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Base Included Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.shipping_weight_tier_base_lbs}
                    onChange={(e) => handleChange('shipping_weight_tier_base_lbs', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Standard rate covers up to this weight.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Extra Fee per Additional Lb ($)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.shipping_rate_per_lb}
                    onChange={(e) => handleChange('shipping_rate_per_lb', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Added per lb over base weight limit.</p>
                </div>
              </div>
            </div>

            {/* Order-Value-Based Shipping */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Order-Value-Based Tiers</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tier 1 Maximum ($)</label>
                  <input
                    type="number"
                    value={settings.order_value_tier1_max}
                    onChange={(e) => handleChange('order_value_tier1_max', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Subtotals up to $25.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tier 1 Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.order_value_tier1_fee}
                    onChange={(e) => handleChange('order_value_tier1_fee', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tier 2 Maximum ($)</label>
                  <input
                    type="number"
                    value={settings.order_value_tier2_max}
                    onChange={(e) => handleChange('order_value_tier2_max', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Subtotals $25–$50.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tier 2 Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.order_value_tier2_fee}
                    onChange={(e) => handleChange('order_value_tier2_fee', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Shipping Zones & Estimated Delivery */}
        {activeTab === 'zones' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Shipping Zones &amp; Estimated Delivery Windows</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Warehouse Facility Origin Postal Code</label>
                <input
                  type="text"
                  value={settings.shipping_origin_zip}
                  onChange={(e) => handleChange('shipping_origin_zip', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Paramus, New Jersey (07652).</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Average Warehouse Handling Time (Days)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.handling_days}
                  onChange={(e) => handleChange('handling_days', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Business days to pack and dispatch.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Extended Zone Surcharge (AK, HI, PR) ($)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.zone_extended_surcharge}
                  onChange={(e) => handleChange('zone_extended_surcharge', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Standard Shipping Estimated Delivery</label>
                <input
                  type="text"
                  value={settings.transit_days_standard}
                  onChange={(e) => handleChange('transit_days_standard', e.target.value)}
                  placeholder="e.g. 2–5 business days"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expedited Estimated Delivery</label>
                <input
                  type="text"
                  value={settings.transit_days_expedited}
                  onChange={(e) => handleChange('transit_days_expedited', e.target.value)}
                  placeholder="e.g. 1–2 business days"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Carrier Architecture (USPS, UPS, FedEx) */}
        {activeTab === 'carriers' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
              <Key className="w-4 h-4 text-brand-600" />
              <span>Carrier Architecture: USPS, UPS, &amp; FedEx</span>
            </h2>

            {/* Architecture note */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Production Carrier Architecture Guarantee</span>
              </p>
              <p className="text-[11px] text-amber-800">
                We do not mock or simulate fake carrier APIs. When carrier API credentials are not provided, NJ Select Deals operates in manual tracking entry mode with full tracking links and real customer email delivery.
              </p>
            </div>

            <div className="space-y-4">
              {/* Default Carrier */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Default Shipping Carrier</label>
                <select
                  value={settings.shipping_carrier_default}
                  onChange={(e) => handleChange('shipping_carrier_default', e.target.value)}
                  className="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="USPS">USPS (United States Postal Service)</option>
                  <option value="UPS">UPS (United Parcel Service)</option>
                  <option value="FEDEX">FedEx (Federal Express)</option>
                </select>
              </div>

              {/* Carrier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* USPS */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">USPS</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      Manual / Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports Ground Advantage, Priority Mail, and Priority Express tracking.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">USPS User ID / WebTools (Optional)</label>
                    <input
                      type="text"
                      placeholder="Optional User ID"
                      value={settings.usps_account_id || ''}
                      onChange={(e) => handleChange('usps_account_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* UPS */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">UPS</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      Manual / Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports UPS Ground, 3 Day Select, 2nd Day Air, and Next Day Air.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">UPS Client ID / Account # (Optional)</label>
                    <input
                      type="text"
                      placeholder="Optional Client ID"
                      value={settings.ups_account_id || ''}
                      onChange={(e) => handleChange('ups_account_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* FedEx */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">FedEx</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      Manual / Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports FedEx Home Delivery, FedEx 2Day, and Priority Overnight.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">FedEx API Key / Account # (Optional)</label>
                    <input
                      type="text"
                      placeholder="Optional API Key"
                      value={settings.fedex_account_id || ''}
                      onChange={(e) => handleChange('fedex_account_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Shipping Settings...' : 'Save All Shipping Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
