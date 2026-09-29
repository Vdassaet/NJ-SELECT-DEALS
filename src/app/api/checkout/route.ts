export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, validateQuantity, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  // CSRF Origin validation
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(request, {
    keyPrefix: 'checkout_direct',
    limit: 10,
    windowSeconds: 60,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.reset) } }
    );
  }

  try {
    const session = await getSession();
    const body = await request.json();
    const { items, shippingAddress, guestEmail, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Your cart is invalid or empty.' }, { status: 400 });
    }

    if (!shippingAddress || typeof shippingAddress !== 'object' ||
        !shippingAddress.fullName || !shippingAddress.street ||
        !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      return NextResponse.json({ error: 'Please provide complete shipping address details.' }, { status: 400 });
    }

    if (!session && (!guestEmail || typeof guestEmail !== 'string' || !guestEmail.includes('@') || guestEmail.length > 255)) {
      return NextResponse.json({ error: 'A valid email address is required to place an order.' }, { status: 400 });
    }

    // Step 1: Validate stock and integer quantities for each product in database
    const validatedItems: { id: string; quantity: number; variantId?: string }[] = [];
    for (const item of items) {
      if (!item || typeof item.id !== 'string') {
        return NextResponse.json({ error: 'Invalid item data in cart.' }, { status: 400 });
      }
      const qtyCheck = validateQuantity(item.quantity);
      if (!qtyCheck.valid) {
        return NextResponse.json({ error: 'Invalid item quantity. Must be an integer between 1 and 99.' }, { status: 400 });
      }
      validatedItems.push({
        id: item.id,
        quantity: qtyCheck.value,
        variantId: typeof item.variantId === 'string' ? item.variantId : undefined,
      });
    }

    const productIds = validatedItems.map((i) => i.id);
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

    for (const item of validatedItems) {
      const product = productMap.get(item.id);
      if (!product) {
        return NextResponse.json({ error: `Product not found.` }, { status: 400 });
      }

      if (!product.isActive) {
        return NextResponse.json({ error: `${product.name} is no longer available.` }, { status: 400 });
      }

      if (product.inventory < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Only ${product.inventory} units remaining.`,
          },
          { status: 400 }
        );
      }
    }

    // Step 2: Calculate financial amounts using server-side database prices
    let subtotal = 0;
    let discount = 0;

    const orderItemData = validatedItems.map((item) => {
      const product = productMap.get(item.id)!;
      const effectivePrice =
        product.salePrice !== null && product.salePrice < product.price
          ? product.salePrice
          : product.price;

      const lineTotal = effectivePrice * item.quantity;
      subtotal += lineTotal;

      if (product.salePrice && product.salePrice < product.price) {
        discount += (product.price - product.salePrice) * item.quantity;
      }

      const primaryImage = product.images?.[0]?.url || null;

      return {
        productId: product.id,
        variantId: item.variantId || null,
        productName: product.name,
        productImage: primaryImage,
        price: effectivePrice,
        quantity: item.quantity,
        total: lineTotal,
      };
    });

    const freeShippingThreshold = 50;
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : 4.99;
    const total = subtotal + shippingCost;

    const orderNumber = generateOrderNumber();

    // Step 3: Atomic database transaction: Create Order + OrderItems
    // NOTE: Inventory is NOT decremented here. Inventory is decremented only upon confirmed payment
    // in completePaidOrder (Stripe webhook / verified payment session) to prevent denial-of-inventory attacks.
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: session?.id || null,
          guestEmail: session ? null : guestEmail.trim().toLowerCase(),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          subtotal,
          discount,
          shippingCost,
          total,
          shippingName: String(shippingAddress.fullName).slice(0, 100).trim(),
          shippingStreet: String(shippingAddress.street).slice(0, 200).trim(),
          shippingApartment: shippingAddress.apartment ? String(shippingAddress.apartment).slice(0, 100).trim() : null,
          shippingCity: String(shippingAddress.city).slice(0, 100).trim(),
          shippingState: String(shippingAddress.state).slice(0, 50).trim(),
          shippingPostalCode: String(shippingAddress.postalCode).slice(0, 20).trim(),
          shippingCountry: shippingAddress.country ? String(shippingAddress.country).slice(0, 50).trim() : 'US',
          shippingPhone: shippingAddress.phone ? String(shippingAddress.phone).slice(0, 30).trim() : null,
          notes: notes ? String(notes).slice(0, 500).trim() : null,
          items: {
            create: orderItemData,
          },
        },
        include: {
          items: true,
        },
      });

      // If user is logged in and requested saving address, save address
      if (session && shippingAddress.saveAddress) {
        await tx.address.create({
          data: {
            userId: session.id,
            fullName: String(shippingAddress.fullName).slice(0, 100).trim(),
            street: String(shippingAddress.street).slice(0, 200).trim(),
            apartment: shippingAddress.apartment ? String(shippingAddress.apartment).slice(0, 100).trim() : null,
            city: String(shippingAddress.city).slice(0, 100).trim(),
            state: String(shippingAddress.state).slice(0, 50).trim(),
            postalCode: String(shippingAddress.postalCode).slice(0, 20).trim(),
            country: shippingAddress.country ? String(shippingAddress.country).slice(0, 50).trim() : 'US',
            phone: shippingAddress.phone ? String(shippingAddress.phone).slice(0, 30).trim() : null,
            isDefault: true,
          },
        });
      }

      return newOrder;
    });

    logSecurityEvent(
      'PAYMENT_EVENT',
      {
        action: 'DIRECT_ORDER_CREATED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        itemCount: order.items?.length || 0,
      },
      request,
      session ? { userId: session.id, role: session.role } : undefined
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      order,
    });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to place order.');
  }
}
