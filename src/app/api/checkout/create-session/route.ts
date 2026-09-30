export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { stripe, isStripeConfigured, isMockCheckoutAllowed } from '@/lib/stripe';
import { calculateOrderPricing } from '@/lib/pricing-engine';
import { completePaidOrder } from '@/lib/order-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, validateQuantity, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF / Origin Validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    // 2. Rate Limiting (10 session creation attempts per minute per IP)
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'checkout_create_session',
      limit: 10,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.reset) },
        }
      );
    }

    const sessionUser = await getSession();
    const body = await request.json().catch(() => ({}));
    const { items, shippingAddress, email, phone, notes } = body;

    // 3. Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (
      !shippingAddress ||
      !shippingAddress.firstName ||
      !shippingAddress.lastName ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      return NextResponse.json(
        { error: 'Please provide complete shipping address details.' },
        { status: 400 }
      );
    }

    // 4. Validate quantity types and bounds strictly
    for (const item of items) {
      const qCheck = validateQuantity(item.quantity);
      if (!qCheck.valid) {
        return NextResponse.json(
          { error: 'Invalid item quantity. Quantities must be whole numbers between 1 and 99.' },
          { status: 400 }
        );
      }
    }

    // 5. Database product & inventory validation (Server-side ground truth)
    const productIds = items.map((i: any) => i.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        return NextResponse.json({ error: `Product ID ${item.id} not found.` }, { status: 400 });
      }

      if (!product.isActive) {
        return NextResponse.json(
          { error: 'Sorry, one or more products are no longer available in the requested quantity.' },
          { status: 400 }
        );
      }

      if (product.inventory < item.quantity) {
        return NextResponse.json(
          { error: 'Sorry, one or more products are no longer available in the requested quantity.' },
          { status: 400 }
        );
      }
    }

    // 3. Server-side financial calculations (Never trust client totals)
    const { couponCode, shippingMethod } = body;
    const pricing = await calculateOrderPricing(
      items.map((i: any) => ({
        productId: i.id || i.productId,
        quantity: i.quantity || 1,
        variantId: i.variantId || null,
      })),
      couponCode,
      { shippingMethod }
    );

    const subtotal = pricing.subtotal;
    const discount = pricing.totalSavings;
    const shippingCost = pricing.shippingCost;
    const tax = pricing.tax;
    const total = pricing.total;

    const fulfillmentItems = pricing.itemBreakdowns.map((b) => {
      const prod = productMap.get(b.productId)!;
      return {
        productId: prod.id,
        variantId: null,
        name: prod.name,
        price: b.effectiveUnitPrice,
        quantity: b.quantity,
        image: prod.images?.[0]?.url || null,
      };
    });

    const fullName = `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim();
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.nextUrl.origin ||
      'http://localhost:3000';

    // 4. Create Stripe Checkout Session
    if (isStripeConfigured()) {
      // If order is free or below Stripe's minimum 50-cent charge, complete directly
      if (Math.round(total * 100) < 50) {
        const freeSessionId = `free_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const order = await completePaidOrder({
          stripePaymentId: null,
          stripeSessionId: freeSessionId,
          userId: sessionUser?.id || null,
          guestEmail: email.trim().toLowerCase(),
          shippingAddress: {
            fullName,
            street: shippingAddress.street.trim(),
            apartment: shippingAddress.apartment?.trim() || null,
            city: shippingAddress.city.trim(),
            state: shippingAddress.state.trim(),
            postalCode: shippingAddress.postalCode.trim(),
            country: shippingAddress.country || 'US',
            phone: phone?.trim() || null,
            saveAddress: !!shippingAddress.saveAddress,
          },
          items: fulfillmentItems,
          subtotal,
          discount,
          shippingCost,
          tax,
          total,
          notes: notes?.trim() || null,
          couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null, shippingMethod,
          appliedPromotionIds: pricing.appliedPromotions.map((p) => p.id),
        });

        return NextResponse.json({
          success: true,
          sessionId: freeSessionId,
          url: `${baseUrl}/checkout/success?session_id=${freeSessionId}`,
          isFreeOrder: true,
        });
      }

      // Proportional distribution of order-level discounts (e.g. coupons) to Stripe line items
      const taxableSubtotal = Math.max(0, subtotal - pricing.orderDiscount);
      const discountRatio = subtotal > 0 ? taxableSubtotal / subtotal : 1;

      let accumulatedLineCents = 0;
      const lineItems: any[] = fulfillmentItems.map((item, index) => {
        let unitCents: number;
        if (index === fulfillmentItems.length - 1) {
          const targetSubtotalCents = Math.round(taxableSubtotal * 100);
          unitCents = Math.max(0, Math.round((targetSubtotalCents - accumulatedLineCents) / item.quantity));
        } else {
          unitCents = Math.max(0, Math.round(item.price * discountRatio * 100));
          accumulatedLineCents += unitCents * item.quantity;
        }

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name + (pricing.orderDiscount > 0 ? ' (Discount Applied)' : ''),
              images: item.image ? [item.image.startsWith('http') ? item.image : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://njselectdeals.com'}${item.image}`] : [],
            },
            unit_amount: unitCents,
          },
          quantity: item.quantity,
        };
      });

      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: shippingMethod === 'free' ? 'Free Standard Shipping' : 'Fast Shipping',
              description: shippingMethod === 'free' ? 'Estimated delivery 6-8 business days' : 'Estimated delivery 2-4 business days',
            },
            unit_amount: Math.round(shippingCost * 100),
          },
          quantity: 1,
        });
      }

      if (tax > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Sales Tax (NJ State)',
            },
            unit_amount: Math.round(tax * 100),
          },
          quantity: 1,
        });
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: email.trim().toLowerCase(),
        client_reference_id: sessionUser?.id || undefined,
        line_items: lineItems,
        metadata: {
          userId: sessionUser?.id || '',
          guestEmail: email.trim().toLowerCase(),
          customerPhone: phone?.trim() || '',
          shippingAddress: JSON.stringify({
            fullName,
            street: shippingAddress.street.trim(),
            apartment: shippingAddress.apartment?.trim() || null,
            city: shippingAddress.city.trim(),
            state: shippingAddress.state.trim(),
            postalCode: shippingAddress.postalCode.trim(),
            country: shippingAddress.country || 'US',
            phone: phone?.trim() || null,
            saveAddress: !!shippingAddress.saveAddress,
          }),
          items: JSON.stringify(fulfillmentItems),
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          notes: notes?.trim() || '',
          couponCode: couponCode ? String(couponCode).trim().toUpperCase() : '',
          appliedPromotionIds: JSON.stringify(pricing.appliedPromotions.map((p) => p.id)),
        },
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout?cancelled=true`,
      });

      logSecurityEvent(
        'PAYMENT_EVENT',
        {
          action: 'CHECKOUT_SESSION_CREATED',
          sessionId: checkoutSession.id,
          total,
          itemCount: fulfillmentItems.length,
          isFreeOrder: false,
        },
        request,
        sessionUser ? { userId: sessionUser.id, role: sessionUser.role } : undefined
      );

      return NextResponse.json({
        success: true,
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    }

    // 5. Fallback for test mode: STRICTLY prohibited in production
    if (!isMockCheckoutAllowed()) {
      logSecurityEvent(
        'WEBHOOK_FAILURE',
        { reason: 'STRIPE_NOT_CONFIGURED_IN_PROD' },
        request,
        sessionUser ? { userId: sessionUser.id, role: sessionUser.role } : undefined
      );
      return NextResponse.json(
        { error: 'Payment gateway configuration error. Live checkout requires configured Stripe API keys.' },
        { status: 503 }
      );
    }

    // Generate a deterministic test checkout session reference for local development only
    const testSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json({
      success: true,
      sessionId: testSessionId,
      url: `${baseUrl}/checkout/success?session_id=${testSessionId}`,
      isDevelopmentMock: true,
      orderDetails: {
        userId: sessionUser?.id || null,
        guestEmail: email.trim().toLowerCase(),
        customerPhone: phone?.trim() || null,
        shippingAddress: {
          fullName,
          street: shippingAddress.street.trim(),
          apartment: shippingAddress.apartment?.trim() || null,
          city: shippingAddress.city.trim(),
          state: shippingAddress.state.trim(),
          postalCode: shippingAddress.postalCode.trim(),
          country: shippingAddress.country || 'US',
          phone: phone?.trim() || null,
          saveAddress: !!shippingAddress.saveAddress,
        },
        items: fulfillmentItems,
        subtotal,
        discount,
        shippingCost,
        tax,
        total,
        notes: notes?.trim() || null,
        couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null, shippingMethod,
        appliedPromotionIds: pricing.appliedPromotions.map((p) => p.id),
      },
    });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to initialize payment session. Please try again.');
  }
}

