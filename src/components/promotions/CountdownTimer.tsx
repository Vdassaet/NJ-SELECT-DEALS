'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate?: string | Date | null;
  label?: string;
  onExpire?: () => void;
  variant?: 'compact' | 'card' | 'banner';
  className?: string;
}

export function CountdownTimer({
  targetDate,
  label = 'Ends In',
  onExpire,
  variant = 'compact',
  className = '',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const [hasExpiredFired, setHasExpiredFired] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    function calculateTime() {
      const now = new Date().getTime();
      const target = new Date(targetDate!).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (!hasExpiredFired && onExpire) {
          setHasExpiredFired(true);
          onExpire();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire, hasExpiredFired]);

  if (!targetDate) return null;

  if (timeLeft.isExpired) {
    return (
      <div className={`inline-flex items-center space-x-1.5 text-xs font-bold text-rose-600 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>Sale Expired</span>
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Compact variant (e.g. for pills, cards)
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-1.5 font-mono text-xs font-black text-rose-600 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        {label && <span className="font-sans text-[11px] uppercase tracking-wider text-slate-500 mr-1">{label}:</span>}
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  // Card or Hero Banner variant with separated blocks (02 : 35 : 42)
  return (
    <div className={`flex flex-col items-start sm:items-center space-y-1.5 ${className}`}>
      {label && (
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-200 flex items-center space-x-1">
          <Clock className="w-3 h-3 text-amber-300 animate-pulse" />
          <span>{label}</span>
        </span>
      )}
      <div className="flex items-center space-x-1 sm:space-x-1.5 font-mono font-black text-xs sm:text-sm">
        {timeLeft.days > 0 && (
          <>
            <div className="bg-slate-900/80 text-amber-300 px-2 py-1 rounded-lg shadow-inner border border-amber-400/20">
              {pad(timeLeft.days)}d
            </div>
            <span className="text-amber-300 font-bold">:</span>
          </>
        )}
        <div className="bg-slate-900/80 text-amber-300 px-2 py-1 rounded-lg shadow-inner border border-amber-400/20">
          {pad(timeLeft.hours)}
        </div>
        <span className="text-amber-300 font-bold">:</span>
        <div className="bg-slate-900/80 text-amber-300 px-2 py-1 rounded-lg shadow-inner border border-amber-400/20">
          {pad(timeLeft.minutes)}
        </div>
        <span className="text-amber-300 font-bold">:</span>
        <div className="bg-slate-900/80 text-amber-300 px-2 py-1 rounded-lg shadow-inner border border-amber-400/20">
          {pad(timeLeft.seconds)}
        </div>
      </div>
    </div>
  );
}
