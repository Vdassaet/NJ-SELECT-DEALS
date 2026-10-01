'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Sparkles, 
  TrendingUp, 
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface ChartDataPoint {
  label: string;
  sublabel?: string;
  amount: number;
  orderCount: number;
}

export interface PeriodFinancials {
  productRevenue: number;
  shippingCollected: number;
  taxCollected: number;
  totalCollected: number;
  orderCount: number;
}

export interface SalesPerformanceProps {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  grossSales: number;
  validOrdersCount: number;
  todayOrdersCount: number;
  weeklyOrdersCount: number;
  monthlyOrdersCount: number;
  breakdowns: {
    today: PeriodFinancials;
    weekly: PeriodFinancials;
    monthly: PeriodFinancials;
    gross: PeriodFinancials;
  };
  chartData: {
    today: ChartDataPoint[];
    weekly: ChartDataPoint[];
    monthly: ChartDataPoint[];
    allTime: ChartDataPoint[];
  };
}

type Period = 'today' | 'weekly' | 'monthly' | 'gross';

export default function SalesPerformanceInteractive({
  todaySales,
  weeklySales,
  monthlySales,
  grossSales,
  validOrdersCount,
  todayOrdersCount,
  weeklyOrdersCount,
  monthlyOrdersCount,
  breakdowns,
  chartData,
}: SalesPerformanceProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const getPeriodDetails = () => {
    switch (selectedPeriod) {
      case 'today':
        return {
          title: "Today's Sales Velocity",
          subtitle: `Product Revenue: ${formatPrice(breakdowns.today.productRevenue)} • Shipping: ${formatPrice(breakdowns.today.shippingCollected)} • Tax: ${formatPrice(breakdowns.today.taxCollected)}`,
          total: breakdowns.today.totalCollected,
          orders: breakdowns.today.orderCount,
          financials: breakdowns.today,
          data: chartData.today,
          icon: Calendar,
          color: 'text-emerald-600',
        };
      case 'weekly':
        return {
          title: 'Weekly Sales Breakdown (Last 7 Days)',
          subtitle: `Product Revenue: ${formatPrice(breakdowns.weekly.productRevenue)} • Shipping: ${formatPrice(breakdowns.weekly.shippingCollected)} • Tax: ${formatPrice(breakdowns.weekly.taxCollected)}`,
          total: breakdowns.weekly.totalCollected,
          orders: breakdowns.weekly.orderCount,
          financials: breakdowns.weekly,
          data: chartData.weekly,
          icon: DollarSign,
          color: 'text-blue-600',
        };
      case 'monthly':
        return {
          title: 'Monthly Sales Volume (Rolling 30 Days)',
          subtitle: `Product Revenue: ${formatPrice(breakdowns.monthly.productRevenue)} • Shipping: ${formatPrice(breakdowns.monthly.shippingCollected)} • Tax: ${formatPrice(breakdowns.monthly.taxCollected)}`,
          total: breakdowns.monthly.totalCollected,
          orders: breakdowns.monthly.orderCount,
          financials: breakdowns.monthly,
          data: chartData.monthly,
          icon: BarChart3,
          color: 'text-indigo-600',
        };
      case 'gross':
        return {
          title: 'All-Time Gross Sales History',
          subtitle: `Product Revenue: ${formatPrice(breakdowns.gross.productRevenue)} • Shipping: ${formatPrice(breakdowns.gross.shippingCollected)} • Tax: ${formatPrice(breakdowns.gross.taxCollected)}`,
          total: breakdowns.gross.totalCollected,
          orders: breakdowns.gross.orderCount,
          financials: breakdowns.gross,
          data: chartData.allTime,
          icon: Sparkles,
          color: 'text-amber-600',
        };
    }
  };

  const currentDetails = getPeriodDetails();
  const maxAmount = Math.max(1, ...currentDetails.data.map((d) => d.amount));
  const avgOrderValue = currentDetails.orders > 0 ? currentDetails.total / currentDetails.orders : 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sales Velocity &amp; Performance</span>
        </p>
        <span className="text-[11px] font-semibold text-slate-400">
          Click any card to inspect sales chart
        </span>
      </div>

      {/* 4 Interactive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Today's Sales */}
        <button
          type="button"
          onClick={() => setSelectedPeriod('today')}
          title={`Product: ${formatPrice(breakdowns.today.productRevenue)} | Shipping: ${formatPrice(breakdowns.today.shippingCollected)} | Tax: ${formatPrice(breakdowns.today.taxCollected)}`}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden bg-white ${
            selectedPeriod === 'today'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Today&apos;s Sales
            </span>
            <div className={`p-2 rounded-xl ${selectedPeriod === 'today' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatPrice(todaySales)}</p>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-emerald-600 font-bold flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Current 24h cycle</span>
            </span>
            <span className="text-slate-400 font-medium">
              {todayOrdersCount} order{todayOrdersCount !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedPeriod === 'today' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
          )}
        </button>

        {/* 2. Weekly Sales */}
        <button
          type="button"
          onClick={() => setSelectedPeriod('weekly')}
          title={`Product: ${formatPrice(breakdowns.weekly.productRevenue)} | Shipping: ${formatPrice(breakdowns.weekly.shippingCollected)} | Tax: ${formatPrice(breakdowns.weekly.taxCollected)}`}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden bg-white ${
            selectedPeriod === 'weekly'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Weekly Sales (7d)
            </span>
            <div className={`p-2 rounded-xl ${selectedPeriod === 'weekly' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatPrice(weeklySales)}</p>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-blue-600 font-semibold">Past 7 days volume</span>
            <span className="text-slate-400 font-medium">
              {weeklyOrdersCount} order{weeklyOrdersCount !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedPeriod === 'weekly' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
          )}
        </button>

        {/* 3. Monthly Sales */}
        <button
          type="button"
          onClick={() => setSelectedPeriod('monthly')}
          title={`Product: ${formatPrice(breakdowns.monthly.productRevenue)} | Shipping: ${formatPrice(breakdowns.monthly.shippingCollected)} | Tax: ${formatPrice(breakdowns.monthly.taxCollected)}`}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden bg-white ${
            selectedPeriod === 'monthly'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Monthly Sales (30d)
            </span>
            <div className={`p-2 rounded-xl ${selectedPeriod === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatPrice(monthlySales)}</p>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-indigo-600 font-semibold">Rolling 30-day window</span>
            <span className="text-slate-400 font-medium">
              {monthlyOrdersCount} order{monthlyOrdersCount !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedPeriod === 'monthly' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
          )}
        </button>

        {/* 4. Gross Sales */}
        <button
          type="button"
          onClick={() => setSelectedPeriod('gross')}
          title={`Product: ${formatPrice(breakdowns.gross.productRevenue)} | Shipping: ${formatPrice(breakdowns.gross.shippingCollected)} | Tax: ${formatPrice(breakdowns.gross.taxCollected)}`}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden bg-white ${
            selectedPeriod === 'gross'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/10 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Gross Sales
            </span>
            <div className={`p-2 rounded-xl ${selectedPeriod === 'gross' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatPrice(grossSales)}</p>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-amber-700 font-semibold">Total collected</span>
            <span className="text-slate-400 font-medium">
              {validOrdersCount} completed
            </span>
          </div>
          {selectedPeriod === 'gross' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
          )}
        </button>

      </div>

      {/* Dynamic Graph & Visual Breakdown Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Header & KPI Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg bg-slate-100 ${currentDetails.color}`}>
                <currentDetails.icon className="w-4 h-4" />
              </span>
              <h3 className="text-base font-black text-slate-900">{currentDetails.title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentDetails.subtitle}</p>
          </div>

          {/* Quick Metrics for selected period */}
          <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
            <div title={`Total Collected: Product Revenue (${formatPrice(currentDetails.financials.productRevenue)}) + Shipping (${formatPrice(currentDetails.financials.shippingCollected)}) + Tax (${formatPrice(currentDetails.financials.taxCollected)})`}>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Collected</span>
              <span className="text-sm font-black text-slate-900">{formatPrice(currentDetails.total)}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Paid Orders</span>
              <span className="text-sm font-black text-slate-900">{currentDetails.orders}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200" />
            <div title="Average total collected per order, including product, shipping and tax.">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Order Value</span>
              <span className="text-sm font-black text-slate-900">{formatPrice(avgOrderValue)}</span>
            </div>
          </div>
        </div>

        {/* Hovered Bar Inspection Banner */}
        <div className="h-6 flex items-center justify-between text-xs">
          {hoveredPoint ? (
            <div className="flex items-center space-x-2 text-slate-700 animate-in fade-in">
              <span className="font-bold text-slate-900">{hoveredPoint.label}</span>
              {hoveredPoint.sublabel && (
                <span className="text-slate-400">({hoveredPoint.sublabel})</span>
              )}
              <span>•</span>
              <span className="font-black text-emerald-600">{formatPrice(hoveredPoint.amount)}</span>
              <span>•</span>
              <span className="text-slate-500 font-semibold">{hoveredPoint.orderCount} order{hoveredPoint.orderCount !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              Hover over any bar to view exact revenue and order count for that interval
            </span>
          )}
        </div>

        {/* Chart Body */}
        {currentDetails.data.length > 0 ? (
          <div className="space-y-2">
            {/* Visual Bar Area */}
            <div className="h-52 w-full flex items-end gap-1.5 sm:gap-3 pt-6 pb-2 border-b border-slate-100">
              {currentDetails.data.map((point, index) => {
                const heightPercent = Math.max(point.amount > 0 ? 8 : 2, Math.round((point.amount / maxAmount) * 100));
                const isHovered = hoveredPoint?.label === point.label;

                return (
                  <div
                    key={`${point.label}-${index}`}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                  >
                    {/* Amount label on hover or above bars */}
                    {point.amount > 0 && (
                      <span className={`text-[10px] font-bold text-slate-600 mb-1 transition-opacity ${
                        isHovered ? 'opacity-100 text-slate-900 font-black' : 'opacity-0 sm:opacity-80'
                      }`}>
                        {formatPrice(point.amount)}
                      </span>
                    )}

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-200 ${
                        point.amount > 0
                          ? isHovered
                            ? 'bg-slate-900 shadow-md scale-y-105'
                            : selectedPeriod === 'today'
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : selectedPeriod === 'weekly'
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : selectedPeriod === 'monthly'
                            ? 'bg-indigo-500 hover:bg-indigo-600'
                            : 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-slate-100 border border-dashed border-slate-200'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {currentDetails.data.map((point, index) => (
                <div key={`label-${point.label}-${index}`} className="flex-1 text-center truncate">
                  <span className={`text-[10px] font-semibold block truncate ${
                    hoveredPoint?.label === point.label ? 'text-slate-900 font-bold' : 'text-slate-500'
                  }`}>
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400 italic">
            No completed sales recorded for this period.
          </div>
        )}

      </div>
    </div>
  );
}
