'use client';

import { useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    // Simulate brief network submission for client UX feedback
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSubmitting(false);
    setIsSubscribed(true);
  };

  if (isSubscribed) {
    return (
      <div className="mt-6 flex items-center justify-center space-x-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-6 py-3.5 rounded-xl max-w-md mx-auto animate-in fade-in zoom-in-95">
        <Check className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-bold">You&apos;re subscribed! Thanks for joining us.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto w-full"
    >
      <div className="w-full sm:flex-1 relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email address..."
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 disabled:opacity-50 transition-colors"
        />
        {error && (
          <p className="text-xs text-rose-400 text-left mt-1 absolute -bottom-5 left-1">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white rounded-xl shadow-lg transition-colors whitespace-nowrap disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Subscribing...</span>
          </>
        ) : (
          <>
            <span>Subscribe</span>
            <Send className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
}
