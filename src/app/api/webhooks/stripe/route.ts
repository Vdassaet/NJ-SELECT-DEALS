export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { completePaidOrder, updateOrderPaymentState } from '@/lib/order-service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import Stripe from 'stripe';
import { logSecurityEvent } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    // 1. Cryptographic Stripe Webhook Signature Verification
    if (!signature) {
      logSecurityEvent('WEBHOOK_FAILURE', { reason: 'MISSING_SIGNATURE' }, request);
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    if (!webhookSecret || webhookSecret.includes('placeholder')) {
      if (process.env.NODE_ENV === 'production') {
        logSecurityEvent('WEBHOOK_FAILURE', { reason: 'MISSING_SECRET_IN_PRODUCTION' }, request);
        return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
      }
      // In development/testing without live Stripe CLI, require explicit local test secret or fail
      const devBypassSecret = process.env.DEV_WEBHOOK_BYPASS_TOKEN;
      const testToken = request.headers.get('x-njd-test-secret');
      if (devBypassSecret && testToken && testToken === devBypassSecret) {
        try {
          event = JSON.parse(rawBody) as Stripe.Event;
        } catch (err) {
          return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }
      } else {
        return NextResponse.json(
          { error: 'STRIPE_WEBHOOK_SECRET must be configured to process incoming webhooks.' },
          { status: 400 }
        );
      }
    } else {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        logSecurityEvent('WEBHOOK_FAILURE', { reason: 'INVALID_SIGNATURE', message: err?.message }, request);
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    }

    console.log(`[STRIPE WEBHOOK] Received event: ${event.type} (ID: ${event.id})`);

    // 2. Event Routing
    switch (event.type) {
      // Case A: Successful Checkout Session Completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === 'paid') {
          const metadata = session.metadata || {};
          const shippingAddress = metadata.shippingAddress ? JSON.parse(metadata.shippingAddress) : null;
          const items = metadata.items ? JSON.parse(metadata.items) : [];

          if (shippingAddress && items.length > 0) {
            const paymentIntentId =
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || null;

            let appliedPromotionIds: string[] | null = null;
            if (metadata.appliedPromotionIds) {
              try {
                appliedPromotionIds = JSON.parse(metadata.appliedPromotionIds);
              } catch {}
            }

            await completePaidOrder({
              stripePaymentId: paymentIntentId,
              stripeSessionId: session.id,
              userId: metadata.userId || null,
              guestEmail: metadata.guestEmail || session.customer_email || 'guest@njselectdeals.com',
              shippingAddress,
              items,
              subtotal: parseFloat(metadata.subtotal || '0'),
              discount: parseFloat(metadata.discount || '0'),
              shippingCost: parseFloat(metadata.shippingCost || '0'),
              tax: parseFloat(metadata.tax || '0'),
              total: parseFloat(metadata.total || '0'),
              notes: metadata.notes || null,
              couponCode: metadata.couponCode || null,
              shippingMethod: (metadata.shippingMethod === 'free' || metadata.shippingMethod === 'fast') ? metadata.shippingMethod : undefined,
              appliedPromotionIds,
            });
            console.log(`[STRIPE WEBHOOK] Order completed for session ${session.id}`);
          }
        }
        break;
      }

      // Case B: Direct Payment Intent Succeeded
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await updateOrderPaymentState(
          { stripePaymentId: paymentIntent.id },
          PaymentStatus.PAID,
          OrderStatus.PROCESSING
        );
        console.log(`[STRIPE WEBHOOK] PaymentIntent succeeded: ${paymentIntent.id}`);
        break;
      }

      // Case C: Payment Failed
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await updateOrderPaymentState(
          { stripePaymentId: paymentIntent.id },
          PaymentStatus.FAILED
        );
        console.log(`[STRIPE WEBHOOK] PaymentIntent failed: ${paymentIntent.id}`);
        break;
      }

      // Case D: Payment Cancelled
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await updateOrderPaymentState(
          { stripePaymentId: paymentIntent.id },
          PaymentStatus.CANCELLED,
          OrderStatus.CANCELLED
        );
        console.log(`[STRIPE WEBHOOK] PaymentIntent cancelled: ${paymentIntent.id}`);
        break;
      }

      // Case E: Charge Refunded
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        
        if (paymentIntentId) {
          // charge.refunded is true if fully refunded, false if partially refunded
          const isFullRefund = charge.refunded;
          const amountRefunded = charge.amount_refunded / 100; // Total refunded so far
          // To calculate just THIS refund amount and tax, we need to query the order
          // But for now, we can pass it to a robust handler in order-service
          const stripeRefundId = charge.refunds?.data[charge.refunds.data.length - 1]?.id || 'refund_' + Date.now();
          const thisRefundAmount = (charge.refunds?.data[charge.refunds.data.length - 1]?.amount || charge.amount_refunded) / 100;

          // Dynamically imported to avoid circular dependency issues if any
          const { recordRefund } = await import('@/lib/order-service');
          await recordRefund(paymentIntentId, stripeRefundId, thisRefundAmount, isFullRefund);
          
          console.log('[STRIPE WEBHOOK] Charge refunded for PaymentIntent: ' + paymentIntentId);
        }
        break;
      }

      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logSecurityEvent('WEBHOOK_FAILURE', { error: error?.message || 'UNKNOWN' }, request);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

