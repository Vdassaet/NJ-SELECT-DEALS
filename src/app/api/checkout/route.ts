import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { items, shippingAddress, guestEmail, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      return NextResponse.json({ error: 'Please provide complete shipping address details.' }, { status: 400 });
    }

    if (!session && (!guestEmail || !guestEmail.includes('@'))) {
      return NextResponse.json({ error: 'A valid email address is required to place an order.' }, { status: 400 });
    }

    // Step 1: Validate stock for each product in database
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

    // Step 2: Calculate financial amounts
    let subtotal = 0;
    let discount = 0;

    const orderItemData = items.map((item: any) => {
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

    // Step 3: Atomic database transaction: Create Order + OrderItems + Decrement Inventory
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
          shippingName: shippingAddress.fullName.trim(),
          shippingStreet: shippingAddress.street.trim(),
          shippingApartment: shippingAddress.apartment ? shippingAddress.apartment.trim() : null,
          shippingCity: shippingAddress.city.trim(),
          shippingState: shippingAddress.state.trim(),
          shippingPostalCode: shippingAddress.postalCode.trim(),
          shippingCountry: shippingAddress.country || 'US',
          shippingPhone: shippingAddress.phone ? shippingAddress.phone.trim() : null,
          notes: notes ? notes.trim() : null,
          items: {
            create: orderItemData,
          },
        },
        include: {
          items: true,
        },
      });

      // Decrement inventory atomically for each product, preventing negative stock under concurrency
      for (const item of items) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.id,
            inventory: {
              gte: item.quantity,
            },
          },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        });

        if (updateResult.count === 0) {
          throw new Error(`Insufficient inventory remaining for item ID ${item.id}. Another order may have just claimed it.`);
        }
      }

      // If user is logged in and requested saving address, save or update default address
      if (session && shippingAddress.saveAddress) {
        await tx.address.create({
          data: {
            userId: session.id,
            fullName: shippingAddress.fullName.trim(),
            street: shippingAddress.street.trim(),
            apartment: shippingAddress.apartment ? shippingAddress.apartment.trim() : null,
            city: shippingAddress.city.trim(),
            state: shippingAddress.state.trim(),
            postalCode: shippingAddress.postalCode.trim(),
            country: shippingAddress.country || 'US',
            phone: shippingAddress.phone ? shippingAddress.phone.trim() : null,
            isDefault: true,
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      order,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to place order. Please check database connection.' },
      { status: 500 }
    );
  }
}
