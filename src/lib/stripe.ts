import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not defined. Stripe payment features will not function.');
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2026-08-26.dahlia' as any,
  typescript: true,
  appInfo: {
    name: 'NJ Select Deals Store',
    version: '1.0.0',
  },
});

export function isStripeConfigured(): boolean {
  return (
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    !process.env.STRIPE_SECRET_KEY?.includes('placeholder')
  );
}
