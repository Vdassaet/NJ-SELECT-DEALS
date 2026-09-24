import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { calculateOrderPricing, recordPromotionUsage } from '@/lib/pricing-engine';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession();
    const body = await request.json();
    const { items, shippingAddress, email, phone, notes } = body;

    // 1. Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
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

    // 2. Database product & inventory validation (Server-side ground truth)
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
    const { couponCode } = body;
    const pricing = await calculateOrderPricing(
      items.map((i: any) => ({
        productId: i.id || i.productId,
        quantity: i.quantity || 1,
        variantId: i.variantId || null,
      })),
      couponCode
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
      const lineItems: any[] = fulfillmentItems.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Standard Shipping',
              description: 'Fast delivery across New Jersey and Continental US',
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
        },
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout?cancelled=true`,
      });

      return NextResponse.json({
        success: true,
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    }

    // 5. Fallback for test mode if live Stripe API key is not yet set
    // Generate a deterministic test checkout session reference
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
      },
    });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment session. Please try again.' },
      { status: 500 }
    );
  }
}
