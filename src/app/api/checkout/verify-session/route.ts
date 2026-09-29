export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured, isMockCheckoutAllowed } from '@/lib/stripe';
import { completePaidOrder } from '@/lib/order-service';
import { calculateOrderPricing } from '@/lib/pricing-engine';
import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

function sanitizeOrderForClient(order: any, isAdmin: boolean) {
  if (isAdmin) return order;
  const { stripePaymentId, stripeSessionId, ...safeOrder } = order;
  return safeOrder;
}

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF / Origin Validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // 2. Rate Limiting (10 verification attempts per minute per IP)
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'checkout_verify_session',
      limit: 10,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.reset) },
        }
      );
    }

    const session = await getSession();
    const isAdmin = session?.role === 'ADMIN';

    const body = await request.json().catch(() => ({}));
    const { sessionId, mockOrderData } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Valid session ID is required.' }, { status: 400 });
    }

    // 3. Idempotency Check: Did we already create the order for this session?
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
      // Authorization Verification: Block IDOR exfiltration of existing orders
      if (existingOrder.userId) {
        if (!session || (!isAdmin && session.id !== existingOrder.userId)) {
          return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 });
        }
      } else {
        const guestEmail = (body.guestEmail || body.mockOrderData?.guestEmail || '').trim().toLowerCase();
        const isMatchingSessionEmail = session && session.email?.toLowerCase() === existingOrder.guestEmail?.toLowerCase();
        const isMatchingGuestEmail = guestEmail && existingOrder.guestEmail && guestEmail === existingOrder.guestEmail.toLowerCase();

        if (!isAdmin && !isMatchingSessionEmail && !isMatchingGuestEmail) {
          return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 });
        }
      }

      return NextResponse.json({
        success: true,
        order: sanitizeOrderForClient(existingOrder, isAdmin),
        isExisting: true,
      });
    }

    // 4. Verified Stripe Session Retrieval
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

      let appliedPromotionIds: string[] | null = null;
      if (metadata.appliedPromotionIds) {
        try {
          appliedPromotionIds = JSON.parse(metadata.appliedPromotionIds);
        } catch {}
      }

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
        couponCode: metadata.couponCode || null,
        appliedPromotionIds,
      });

      return NextResponse.json({
        success: true,
        order: sanitizeOrderForClient(order, isAdmin),
      });
    }

    // 5. Fallback for Development Test Mode — STRICTLY FORBIDDEN IN PRODUCTION
    if (mockOrderData) {
      if (!isMockCheckoutAllowed()) {
        logSecurityEvent(
          'PAYMENT_EVENT',
          { reason: 'MOCK_ORDER_COMPLETION_BLOCKED_IN_PRODUCTION', sessionId },
          request,
          session ? { userId: session.id, role: session.role } : undefined
        );
        return NextResponse.json(
          { error: 'Direct mock order completion is strictly disabled in production.' },
          { status: 403 }
        );
      }

      console.warn('[DEV ONLY]: Processing mock order without live payment verification');

      // Server-side financial recalculation to prevent client pricing manipulation even in dev
      const calculatedPricing = await calculateOrderPricing(
        (mockOrderData.items || []).map((i: any) => ({
          productId: i.productId || i.id,
          quantity: i.quantity,
          variantId: i.variantId || null,
        })),
        mockOrderData.couponCode || null
      );

      const order = await completePaidOrder({
        stripePaymentId: `pi_test_${Date.now()}`,
        stripeSessionId: sessionId,
        userId: session?.id || mockOrderData.userId || null,
        guestEmail: mockOrderData.guestEmail || 'guest@njselectdeals.com',
        shippingAddress: mockOrderData.shippingAddress,
        items: mockOrderData.items,
        subtotal: calculatedPricing.subtotal,
        discount: calculatedPricing.totalSavings,
        shippingCost: calculatedPricing.shippingCost,
        tax: calculatedPricing.tax,
        total: calculatedPricing.total,
        notes: mockOrderData.notes,
        couponCode: mockOrderData.couponCode || null,
        appliedPromotionIds: calculatedPricing.appliedPromotions.map((p) => p.id),
      });

      return NextResponse.json({
        success: true,
        order: sanitizeOrderForClient(order, isAdmin),
      });
    }

    return NextResponse.json({ error: 'Unable to verify order session.' }, { status: 400 });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to verify payment session.');
  }
}

