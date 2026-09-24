import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  CreditCard, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2 
} from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
      {/* 1. Value Proposition Banner */}
      <div className="border-b border-slate-800 py-8 bg-slate-950/50">
        <div className="store-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Free Express Shipping</h4>
                <p className="text-xs text-slate-400 mt-0.5">On all qualified orders over $50</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">100% Quality Guaranteed</h4>
                <p className="text-xs text-slate-400 mt-0.5">Authentic personal care & confectionary</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Hassle-Free 30-Day Returns</h4>
                <p className="text-xs text-slate-400 mt-0.5">Quick refunds and simple returns</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Safe & Secure Transactions</h4>
                <p className="text-xs text-slate-400 mt-0.5">256-bit encrypted checkout</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Links */}
      <div className="store-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-zinc-900 font-bold text-lg shadow-sm">
                NJ
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                NJ SELECT <span className="text-brand-400">DEALS</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              Your trusted single-store source for quality shampoos, hair care, skin care, creams, cosmetics, artisanal chocolates, and confectionery delivered directly to your door.
            </p>
            <div className="space-y-2 text-xs text-slate-400 pt-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>Paramus, New Jersey, USA</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>(800) 555-DEAL</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span>support@njselectdeals.com</span>
              </div>
            </div>
          </div>

          {/* Shop Categories */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Shop Categories</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/products?category=hair-care" className="hover:text-brand-400 transition-colors">Hair Care & Shampoos</Link></li>
              <li><Link href="/products?category=skin-care" className="hover:text-brand-400 transition-colors">Skin Care & Creams</Link></li>
              <li><Link href="/products?category=beauty" className="hover:text-brand-400 transition-colors">Beauty & Cosmetics</Link></li>
              <li><Link href="/products?category=chocolate" className="hover:text-brand-400 transition-colors">Gourmet Chocolates</Link></li>
              <li><Link href="/products?category=candy" className="hover:text-brand-400 transition-colors">Candy & Sweets</Link></li>
              <li><Link href="/products?category=personal-care" className="hover:text-brand-400 transition-colors">Personal Care Essentials</Link></li>
            </ul>
          </div>

          {/* Customer Service & Information */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Customer Care</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/about" className="hover:text-brand-400 transition-colors">About NJ Select Deals</Link></li>
              <li><Link href="/contact" className="hover:text-brand-400 transition-colors">Contact Customer Support</Link></li>
              <li><Link href="/faq" className="hover:text-brand-400 transition-colors">Frequently Asked Questions</Link></li>
              <li><Link href="/shipping" className="hover:text-brand-400 transition-colors">Shipping Rates & Policies</Link></li>
              <li><Link href="/returns" className="hover:text-brand-400 transition-colors">30-Day Return Guarantee</Link></li>
              <li><Link href="/account/orders" className="hover:text-brand-400 transition-colors">Track My Order</Link></li>
            </ul>
          </div>

          {/* Store Policies & Trust */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Trust & Policies</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Authentic Products</span></li>
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>No Third-Party Sellers</span></li>
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Direct Store Fulfillment</span></li>
              <li className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Secure Checkout</span></li>
              <li className="pt-2">
                <Link href="/privacy" className="hover:text-slate-200 transition-colors block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-200 transition-colors block">
                  Terms of Service
                </Link>
              </li>
              <li className="pt-2">
                <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* 3. Copyright Sub-Footer */}
      <div className="border-t border-slate-800/80 py-6 bg-slate-950">
        <div className="store-container flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {currentYear} NJ Select Deals. All rights reserved. Direct store e-commerce.</p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/shipping" className="hover:text-slate-300 transition-colors">Shipping Policy</Link>
            <Link href="/returns" className="hover:text-slate-300 transition-colors">Return Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
