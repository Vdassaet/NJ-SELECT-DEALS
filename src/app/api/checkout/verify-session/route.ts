import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { completePaidOrder } from '@/lib/order-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, mockOrderData } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    // 1. Idempotency Check: Did we already create the order for this session?
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { stripeSessionId: sessionId },
          { stripePaymentId: sessionId },
        ],
      },
      include: {
        items: true,
      },
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: existingOrder,
        isExisting: true,
      });
    }

    // 2. Verified Stripe Session Retrieval
    if (isStripeConfigured() && sessionId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Payment was not confirmed by Stripe. Please try again.' },
          { status: 400 }
        );
      }

      const metadata = session.metadata || {};
      const shippingAddress = metadata.shippingAddress ? JSON.parse(metadata.shippingAddress) : null;
      const items = metadata.items ? JSON.parse(metadata.items) : [];

      if (!shippingAddress || items.length === 0) {
        return NextResponse.json({ error: 'Order metadata is missing from Stripe session.' }, { status: 400 });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;

      const order = await completePaidOrder({
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
      });

      return NextResponse.json({
        success: true,
        order,
      });
    }

    // 3. Fallback for Development Test Mode
    if (mockOrderData) {
      const order = await completePaidOrder({
        stripePaymentId: `pi_test_${Date.now()}`,
        stripeSessionId: sessionId,
        userId: mockOrderData.userId || null,
        guestEmail: mockOrderData.guestEmail,
        shippingAddress: mockOrderData.shippingAddress,
        items: mockOrderData.items,
        subtotal: mockOrderData.subtotal,
        discount: mockOrderData.discount,
        shippingCost: mockOrderData.shippingCost,
        tax: mockOrderData.tax,
        total: mockOrderData.total,
        notes: mockOrderData.notes,
      });

      return NextResponse.json({
        success: true,
        order,
      });
    }

    return NextResponse.json({ error: 'Unable to verify order session.' }, { status: 400 });
  } catch (error: any) {
    console.error('Verify session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment session.' },
      { status: 500 }
    );
  }
}
