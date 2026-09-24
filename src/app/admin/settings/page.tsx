'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Check, 
  AlertCircle, 
  Save, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Truck, 
  FileText, 
  Share2, 
  Search, 
  Image as ImageIcon 
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'general' | 'localization' | 'shipping' | 'payment' | 'policies' | 'social' | 'seo'
  >('general');

  const [settings, setSettings] = useState<Record<string, string>>({
    store_name: 'NJ Select Deals',
    store_logo: '',
    store_email: 'support@njselectdeals.com',
    order_notification_email: 'orders@njselectdeals.com',
    store_phone: '(800) 555-DEAL',
    store_address: '100 Route 17 North, Paramus, NJ 07652',
    announcement_text:
      'Free Shipping on orders over $50 | Quality Personal Care, Chocolates & Treats Delivered to Your Door',

    // Localization & Tax
    currency: 'USD',
    currency_symbol: '$',
    sales_tax_rate: '6.625', // Standard NJ state sales tax
    tax_calculation_enabled: 'true',

    // Shipping
    free_shipping_threshold: '50',
    standard_shipping_rate: '4.99',
    expedited_shipping_rate: '12.99',
    shipping_origin_zip: '07652',

    // Payment
    stripe_enabled: 'true',
    cod_enabled: 'false',
    payment_instructions: 'Payment securely processed via Stripe encrypted payment gateway.',

    // Policies
    policy_refund: 'We offer a 30-day return policy for unopened items in original packaging. Contact support to initiate a return.',
    policy_privacy: 'NJ Select Deals respects your privacy. We never sell or distribute your personal contact information.',
    policy_terms: 'By using this site, you agree to our standard terms of service and order fulfillment policies.',

    // Social Media
    social_facebook: 'https://facebook.com/njselectdeals',
    social_instagram: 'https://instagram.com/njselectdeals',
    social_twitter: 'https://x.com/njselectdeals',
    social_tiktok: 'https://tiktok.com/@njselectdeals',

    // SEO
    meta_title: 'NJ Select Deals | Quality Personal Care & Specialty Goods',
    meta_description: 'Shop trusted personal care essentials, chocolates, pantry treats, and daily savings at NJ Select Deals.',
    meta_keywords: 'personal care, deals, chocolates, new jersey deals, discount store, pantry essentials',
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
          if (data.settings && Object.keys(data.settings).length > 0) {
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
    setNotification(null);
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setNotification({ type: 'success', message: 'All store settings saved successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 text-xs">Loading store settings...</div>;
  }

  const tabs = [
    { id: 'general', label: 'Store Identity & Contact', icon: Globe },
    { id: 'localization', label: 'Currency & Tax', icon: SettingsIcon },
    { id: 'shipping', label: 'Shipping Rules', icon: Truck },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'policies', label: 'Store Policies', icon: FileText },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'seo', label: 'SEO & Metadata', icon: Search },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Store Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure store identity, branding, contacts, currency, tax rates, shipping, payments, policies, and SEO
        </p>
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

      {/* Settings Navigation Tabs */}
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: General & Identity */}
        {activeTab === 'general' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Store Identity, Logo &amp; Contact Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Name</label>
                <input
                  type="text"
                  required
                  value={settings.store_name}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Store Logo URL</label>
                <input
                  type="url"
                  placeholder="https://.../logo.png"
                  value={settings.store_logo || ''}
                  onChange={(e) => handleChange('store_logo', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Support Email</label>
                <input
                  type="email"
                  required
                  value={settings.store_email}
                  onChange={(e) => handleChange('store_email', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Order Notification Email <span className="text-brand-600 font-normal">(Owner Alerts)</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.order_notification_email || ''}
                  onChange={(e) => handleChange('order_notification_email', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Support Telephone Phone</label>
                <input
                  type="text"
                  value={settings.store_phone}
                  onChange={(e) => handleChange('store_phone', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Facility / Warehouse Address</label>
                <input
                  type="text"
                  value={settings.store_address}
                  onChange={(e) => handleChange('store_address', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Header Announcement Bar Text</label>
                <input
                  type="text"
                  value={settings.announcement_text}
                  onChange={(e) => handleChange('announcement_text', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Localization & Tax */}
        {activeTab === 'localization' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Currency &amp; Sales Tax Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Currency Code (ISO)</label>
                <input
                  type="text"
                  required
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  required
                  value={settings.currency_symbol}
                  onChange={(e) => handleChange('currency_symbol', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={settings.sales_tax_rate}
                  onChange={(e) => handleChange('sales_tax_rate', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default New Jersey state sales tax is 6.625%.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tax Calculation</label>
                <select
                  value={settings.tax_calculation_enabled}
                  onChange={(e) => handleChange('tax_calculation_enabled', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                >
                  <option value="true">Enabled (Compute tax at checkout)</option>
                  <option value="false">Disabled (Tax exempt / zero tax)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Shipping */}
        {activeTab === 'shipping' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Shipping Rates &amp; Free Delivery Threshold
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Free Shipping Threshold ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={settings.free_shipping_threshold}
                  onChange={(e) => handleChange('free_shipping_threshold', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Orders above this subtotal qualify for complimentary shipping.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Standard Shipping Flat Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={settings.standard_shipping_rate}
                  onChange={(e) => handleChange('standard_shipping_rate', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expedited 2-Day Shipping Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.expedited_shipping_rate}
                  onChange={(e) => handleChange('expedited_shipping_rate', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Warehouse Origin Postal Code</label>
                <input
                  type="text"
                  value={settings.shipping_origin_zip}
                  onChange={(e) => handleChange('shipping_origin_zip', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Payment */}
        {activeTab === 'payment' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Payment Gateway Configuration
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <span className="font-bold text-slate-900 block text-sm">Stripe Payment Gateway</span>
                  <span className="text-[11px] text-slate-500">Accept credit cards, Apple Pay, Google Pay</span>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black rounded-full uppercase text-[10px]">
                  Active &amp; Ready
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Payment Instructions</label>
                <textarea
                  rows={3}
                  value={settings.payment_instructions}
                  onChange={(e) => handleChange('payment_instructions', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Store Policies */}
        {activeTab === 'policies' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Store Legal Policies
            </h2>

            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Return &amp; Refund Policy</label>
                <textarea
                  rows={4}
                  value={settings.policy_refund}
                  onChange={(e) => handleChange('policy_refund', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Privacy Policy</label>
                <textarea
                  rows={4}
                  value={settings.policy_privacy}
                  onChange={(e) => handleChange('policy_privacy', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Terms of Service</label>
                <textarea
                  rows={4}
                  value={settings.policy_terms}
                  onChange={(e) => handleChange('policy_terms', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Social Media */}
        {activeTab === 'social' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Social Media Accounts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Facebook Page URL</label>
                <input
                  type="url"
                  value={settings.social_facebook}
                  onChange={(e) => handleChange('social_facebook', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={settings.social_instagram}
                  onChange={(e) => handleChange('social_instagram', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Twitter / X URL</label>
                <input
                  type="url"
                  value={settings.social_twitter}
                  onChange={(e) => handleChange('social_twitter', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">TikTok Profile URL</label>
                <input
                  type="url"
                  value={settings.social_tiktok}
                  onChange={(e) => handleChange('social_tiktok', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SEO & Metadata */}
        {activeTab === 'seo' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Search Engine Optimization (SEO) &amp; Metadata
            </h2>

            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Default Meta Title</label>
                <input
                  type="text"
                  value={settings.meta_title}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Recommended 50–60 characters.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Default Meta Description</label>
                <textarea
                  rows={3}
                  value={settings.meta_description}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Recommended 150–160 characters for search snippet previews.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Meta Keywords (Comma-separated)</label>
                <input
                  type="text"
                  value={settings.meta_keywords}
                  onChange={(e) => handleChange('meta_keywords', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center space-x-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
