'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Lock, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { UserSession, AddressItem } from '@/lib/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, discountTotal, shippingEstimate } = useCart();

  const [user, setUser] = useState<UserSession | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State (First name, Last name, Email, Phone, Address, Apt, City, State, ZIP, Country)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NJ');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [notes, setNotes] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; message: string } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Calculate NJ State Sales Tax (6.625%)
  const effectiveSubtotal = Math.max(0, subtotal - (appliedCoupon?.discountAmount || 0));
  const taxRate = 0.06625;
  const taxEstimate = Math.round(effectiveSubtotal * taxRate * 100) / 100;
  const orderTotalWithTax = Math.round((effectiveSubtotal + shippingEstimate + taxEstimate) * 100) / 100;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponMessage(null);

    try {
      const res = await fetch('/api/promotions/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
          message: data.message,
        });
        setCouponMessage({ type: 'success', text: data.message });
      } else {
        setAppliedCoupon(null);
        setCouponMessage({ type: 'error', text: data.message || data.error || 'Invalid coupon code.' });
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponMessage({ type: 'error', text: 'Error checking coupon code.' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Fetch session & saved addresses if logged in
  useEffect(() => {
    async function loadUser() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.user) {
            setUser(sessionData.user);
            setEmail(sessionData.user.email);

            const nameParts = (sessionData.user.name || '').trim().split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');

            // Fetch addresses
            const addrRes = await fetch('/api/account/addresses');
            if (addrRes.ok) {
              const addrData = await addrRes.json();
              const addresses: AddressItem[] = addrData.addresses || [];
              setSavedAddresses(addresses);
              const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
              if (defaultAddr) {
                const addrNameParts = defaultAddr.fullName.trim().split(' ');
                setFirstName(addrNameParts[0] || '');
                setLastName(addrNameParts.slice(1).join(' ') || '');
                setStreet(defaultAddr.street);
                setApartment(defaultAddr.apartment || '');
                setCity(defaultAddr.city);
                setState(defaultAddr.state);
                setPostalCode(defaultAddr.postalCode);
                setCountry(defaultAddr.country || 'US');
                if (defaultAddr.phone) setPhone(defaultAddr.phone);
              }
            }
          }
        }
      } catch (err) {
        console.error('Checkout user load error', err);
      }
    }
    loadUser();
  }, []);

  const handleSelectSavedAddress = (addr: AddressItem) => {
    const parts = addr.fullName.trim().split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
    setStreet(addr.street);
    setApartment(addr.apartment || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setCountry(addr.country || 'US');
    if (addr.phone) setPhone(addr.phone);
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Please add products before checking out.');
      return;
    }

    if (!firstName || !lastName || !street || !city || !state || !postalCode) {
      setErrorMessage('Please complete all required shipping address fields.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('Please provide a valid email address for your order confirmation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            variantId: i.variantId,
          })),
          shippingAddress: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            street: street.trim(),
            apartment: apartment.trim() || null,
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country: country.trim() || 'US',
            phone: phone.trim() || null,
            saveAddress: user ? saveAddress : false,
          },
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment session.');
      }

      // If development fallback, cache order details for verify-session
      if (data.isDevelopmentMock && data.orderDetails) {
        sessionStorage.setItem('mock_order_data', JSON.stringify(data.orderDetails));
      }

      // Redirect to Stripe Checkout or verification URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout redirection URL received.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="store-container py-20 text-center">
        <h1 className="text-2xl font-black text-slate-900">Your Cart is Empty</h1>
        <p className="text-xs text-slate-500 mt-2">Add items to your cart before proceeding to checkout.</p>
        <Link
          href="/products"
          className="inline-block mt-6 px-6 py-3 bg-brand-600 text-white font-bold text-xs rounded-xl"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="store-container py-10 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout & Payment</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provide shipping information and complete payment securely with Stripe
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Stripe SSL 256-Bit Encrypted</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center space-x-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Checkout Form & Order Summary */}
      <form onSubmit={handlePayNow} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Shipping Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Saved Addresses for Logged-In User */}
          {user && savedAddresses.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Select Saved Address
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      street === addr.street
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <p className="font-bold text-slate-900">{addr.fullName}</p>
                    <p className="text-slate-600 truncate">{addr.street}</p>
                    <p className="text-slate-500">{addr.city}, {addr.state} {addr.postalCode}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
              1. Customer Information
            </h2>

            {!user && (
              <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 text-xs text-brand-900 flex items-center justify-between">
                <span>Have an account?</span>
                <Link href="/auth/login?redirect=/checkout" className="font-bold underline hover:text-brand-700">
                  Log in for faster checkout
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={Boolean(user)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 disabled:opacity-70"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(201) 555-0199"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
              2. Shipping Details
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Last Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Shipping Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Apartment / Suite / Unit (Optional)
                </label>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="Apt 4B"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    City <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Paramus"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    State <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NJ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ZIP Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="07652"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="US">United States (US)</option>
                </select>
              </div>

              {user && (
                <label className="flex items-center space-x-2 pt-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Save this address to my account address book</span>
                </label>
              )}
            </div>
          </div>

          {/* Delivery Notes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
              3. Delivery Instructions (Optional)
            </h2>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Leave at front door, ring doorbell, gate code..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

        </div>

        {/* Order Summary & Pay Now (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900 pb-3 border-b border-slate-100">
            Order Summary ({items.length} items)
          </h2>

          {/* Items List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-3">
            {items.map((item) => {
              const effectivePrice =
                item.salePrice !== null && item.salePrice !== undefined && item.salePrice < item.price
                  ? item.salePrice
                  : item.price;
              return (
                <div key={`${item.id}-${item.variantId || 'default'}`} className="pt-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 line-clamp-1">{item.name}</p>
                      <p className="text-slate-400 text-[11px]">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-black text-slate-900">{formatPrice(effectivePrice * item.quantity)}</span>
                </div>
              );
            })}
          </div>

          {/* Coupon Code Box */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Have a Promo or Coupon Code?
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isValidatingCoupon || !couponCode.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors"
              >
                {isValidatingCoupon ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {couponMessage && (
              <p
                className={`text-[11px] font-semibold ${
                  couponMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {couponMessage.text}
              </p>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Product Discounts</span>
                <span className="font-bold">-{formatPrice(discountTotal)}</span>
              </div>
            )}

            {appliedCoupon && appliedCoupon.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="font-bold text-slate-900">
                {shippingEstimate === 0 ? (
                  <span className="text-emerald-700 font-black uppercase">Free</span>
                ) : (
                  formatPrice(shippingEstimate)
                )}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Estimated Sales Tax (NJ 6.625%)</span>
              <span className="font-bold text-slate-900">{formatPrice(taxEstimate)}</span>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-black text-slate-900">Total</span>
              <span className="text-2xl font-black text-slate-900">{formatPrice(orderTotalWithTax)}</span>
            </div>
          </div>

          {/* Stripe Trust Highlights */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span>Direct Stripe Payment</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              We never store your credit card or CVV. Your payment is securely verified and processed through Stripe PCI Level 1 certified infrastructure.
            </p>
          </div>

          {/* Clear Pay Now Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-bold text-sm rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Pay Now • {formatPrice(orderTotalWithTax)}</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted SSL • Zero Card Storage • Buyer Protection</span>
          </div>

        </div>

      </form>
    </div>
  );
}
