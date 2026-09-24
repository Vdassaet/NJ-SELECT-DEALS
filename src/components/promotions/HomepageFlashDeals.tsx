'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, Percent, Clock } from 'lucide-react';
import { FlashDealCard, FlashDealItem } from './FlashDealCard';
import { CountdownTimer } from './CountdownTimer';

export function HomepageFlashDeals({ initialDeals = [] }: { initialDeals?: FlashDealItem[] }) {
  const [deals, setDeals] = useState<FlashDealItem[]>(initialDeals);
  const [isLoading, setIsLoading] = useState(initialDeals.length === 0);

  useEffect(() => {
    async function loadFlashDeals() {
      try {
        const res = await fetch('/api/promotions/flash-deals');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.flashDeals)) {
            setDeals(data.flashDeals);
          }
        }
      } catch (err) {
        console.error('Failed to load flash deals:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadFlashDeals();
  }, []);

  // Find nearest expiring deal for the section header countdown
  const nearestEnd = deals
    .map((d) => (d.endDate ? new Date(d.endDate).getTime() : 0))
    .filter((t) => t > Date.now())
    .sort((a, b) => a - b)[0];

  return (
    <section className="store-container">
      <div className="bg-zinc-950 rounded-3xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden border border-zinc-800">
        {/* Header with Title and Global Countdown */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-zinc-900 rounded-2xl text-rose-500 shadow-inner">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-200 bg-white/10 px-2 py-0.5 rounded-full">
                  ⚡ Limited Time
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mt-1">
                FLASH DEALS
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {nearestEnd && (
              <div className="bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-800">
                <CountdownTimer
                  targetDate={new Date(nearestEnd)}
                  label="FLASH SALE ENDS IN"
                  variant="card"
                />
              </div>
            )}

            <Link
              href="/products?discount=true"
              className="px-5 py-3 bg-white text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md hover:bg-amber-100 transition-all flex items-center space-x-1.5"
            >
              <span>See All Deals</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Deals Grid */}
        {deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {deals.slice(0, 4).map((deal) => (
              <FlashDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center text-white border border-white/20">
            <Percent className="w-12 h-12 mx-auto mb-3 text-amber-200" />
            <h3 className="text-lg font-bold">New Special Promotions Coming Soon!</h3>
            <p className="text-xs text-white/80 max-w-md mx-auto mt-1">
              The store owner adds fresh discounts and limited-time flash sales regularly. Check back soon or browse our full catalog.
            </p>
            <Link
              href="/products"
              className="inline-block mt-4 px-6 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-amber-50"
            >
              Browse Full Catalog
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
