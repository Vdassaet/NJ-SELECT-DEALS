'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AddressItem } from '@/lib/types';

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New address form state
  const [fullName, setFullName] = useState('');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NJ');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAddresses = async () => {
    try {
      const res = await fetch('/api/account/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          street,
          apartment,
          city,
          state,
          postalCode,
          phone,
          isDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save address');
      }

      setNotification({ type: 'success', message: 'Address saved to your address book.' });
      setShowAddForm(false);
      // Reset form
      setFullName('');
      setStreet('');
      setApartment('');
      setCity('');
      setState('NJ');
      setPostalCode('');
      setPhone('');
      setIsDefault(false);
      loadAddresses();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error saving address.' });
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return;

    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Address deleted.' });
        loadAddresses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading addresses...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Saved Addresses</h1>
          <p className="text-xs text-slate-500 mt-1">Manage delivery locations for quick 1-click checkout</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cancel' : 'Add New Address'}</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Add Address Form */}
      {showAddForm && (
        <form onSubmit={handleAddAddress} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">New Shipping Address</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name / Recipient</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Street Address</label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="100 Route 17 North"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Apartment / Suite</label>
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="Suite 200"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paramus"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NJ"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">ZIP / Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="07652"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(201) 555-0199"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Set as default delivery address</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md"
            >
              Save Address
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                addr.isDefault
                  ? 'border-brand-500 bg-brand-50/20 shadow-sm'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{addr.fullName}</span>
                  {addr.isDefault && (
                    <span className="bg-brand-100 text-brand-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-slate-600">{addr.street}</p>
                {addr.apartment && <p className="text-slate-600">{addr.apartment}</p>}
                <p className="text-slate-600">
                  {addr.city}, {addr.state} {addr.postalCode}
                </p>
                {addr.phone && <p className="text-slate-400 mt-2">Phone: {addr.phone}</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 text-xs">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No saved addresses</p>
          <p className="mt-0.5">Click &quot;Add New Address&quot; above to save a delivery address.</p>
        </div>
      )}
    </div>
  );
}
