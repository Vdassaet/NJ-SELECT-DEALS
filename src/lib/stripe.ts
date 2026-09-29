import Stripe from 'stripe';

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && !key.includes('placeholder') && key.startsWith('sk_'));
}

export function isStripeWebhookConfigured(): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return Boolean(secret && !secret.includes('placeholder') && secret.startsWith('whsec_'));
}

/**
 * Checks whether development mock payment checkout is permitted.
 * Mock payment is STRICTLY forbidden in production and whenever Stripe is configured.
 */
export function isMockCheckoutAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return !isStripeConfigured();
}

/**
 * Safe Stripe instance proxy.
 * Prevents hardcoded secret fallbacks and fails safely in production if secrets are missing.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(target, prop, receiver) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.includes('placeholder')) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: STRIPE_SECRET_KEY is missing or invalid in production. Payment operation aborted.'
        );
      }
    }

    const realClient = new Stripe(key || 'sk_test_dev_placeholder', {
      apiVersion: '2026-08-26.dahlia' as any,
      typescript: true,
      appInfo: {
        name: 'NJ Select Deals Store',
        version: '1.0.0',
      },
    });

    const value = Reflect.get(realClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(realClient);
    }
    return value;
  },
});
