import { prisma } from '@/lib/prisma';
import { generateOrderNumber } from '@/lib/utils';
import {
  sendOrderConfirmationCustomerEmail,
  sendNewOrderAdminEmail,
  sendOrderCancelledEmail,
  OrderEmailPayload,
} from '@/lib/email';
import { PaymentStatus, OrderStatus } from '@prisma/client';

export interface FulfillmentItem {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
}

export interface FulfillmentAddress {
  fullName: string;
  street: string;
  apartment?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  saveAddress?: boolean;
}

export interface CompleteOrderInput {
  stripePaymentId?: string | null;
  stripeSessionId?: string | null;
  userId?: string | null;
  guestEmail: string;
  shippingAddress: FulfillmentAddress;
  items: FulfillmentItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  notes?: string | null;
}

/**
 * Atomic Order Creation & Inventory Reduction Engine
 * Strictly enforces server-side inventory verification and idempotency.
 */
export async function completePaidOrder(input: CompleteOrderInput) {
  // Step 1: Idempotency check - if order was already completed (e.g. webhook vs return_url race), return existing
  if (input.stripePaymentId || input.stripeSessionId) {
    const existing = await prisma.order.findFirst({
      where: {
        OR: [
          ...(input.stripePaymentId ? [{ stripePaymentId: input.stripePaymentId }] : []),
          ...(input.stripeSessionId ? [{ stripeSessionId: input.stripeSessionId }] : []),
        ],
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (existing) {
      return existing;
    }
  }

  // Step 2: Pre-validate inventory before transaction
  const productIds = input.items.map((item) => item.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive || product.inventory < item.quantity) {
      throw new Error('Sorry, one or more products are no longer available in the requested quantity.');
    }
  }

  const orderNumber = generateOrderNumber();

  // Step 3: Atomic database transaction
  const order = await prisma.$transaction(async (tx) => {
    // 3a. Atomically verify and decrement inventory
    for (const item of input.items) {
      const updateResult = await tx.product.updateMany({
        where: {
          id: item.productId,
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
        throw new Error('Sorry, one or more products are no longer available in the requested quantity.');
      }

      const dbProd = productMap.get(item.productId);
      if (dbProd) {
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            sku: dbProd.sku,
            previousQuantity: dbProd.inventory,
            newQuantity: dbProd.inventory - item.quantity,
            difference: -item.quantity,
            reason: 'ORDER_PLACED',
            orderNumber,
            performedBy: input.guestEmail || 'CUSTOMER',
            userId: input.userId || null,
          },
        });
      }
    }

    // 3b. Create Order with complete financial, address, and Stripe audit snapshots
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
        guestEmail: input.userId ? null : input.guestEmail.trim().toLowerCase(),
        status: OrderStatus.PROCESSING,
        paymentStatus: PaymentStatus.PAID,
        subtotal: input.subtotal,
        discount: input.discount,
        shippingCost: input.shippingCost,
        tax: input.tax,
        total: input.total,
        stripePaymentId: input.stripePaymentId || null,
        stripeSessionId: input.stripeSessionId || null,
        shippingName: input.shippingAddress.fullName.trim(),
        shippingStreet: input.shippingAddress.street.trim(),
        shippingApartment: input.shippingAddress.apartment?.trim() || null,
        shippingCity: input.shippingAddress.city.trim(),
        shippingState: input.shippingAddress.state.trim(),
        shippingPostalCode: input.shippingAddress.postalCode.trim(),
        shippingCountry: input.shippingAddress.country || 'US',
        shippingPhone: input.shippingAddress.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.name,
            productImage: item.image || null,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
        },
        payments: {
          create: {
            amount: input.total,
            currency: 'USD',
            provider: 'STRIPE',
            transactionId: input.stripePaymentId || input.stripeSessionId || null,
            status: PaymentStatus.PAID,
          },
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // 3c. Optional address persistence for logged-in customers
    if (input.userId && input.shippingAddress.saveAddress) {
      await tx.address.create({
        data: {
          userId: input.userId,
          fullName: input.shippingAddress.fullName.trim(),
          street: input.shippingAddress.street.trim(),
          apartment: input.shippingAddress.apartment?.trim() || null,
          city: input.shippingAddress.city.trim(),
          state: input.shippingAddress.state.trim(),
          postalCode: input.shippingAddress.postalCode.trim(),
          country: input.shippingAddress.country || 'US',
          phone: input.shippingAddress.phone?.trim() || null,
          isDefault: true,
        },
      });
    }

    return newOrder;
  });

  // Step 4: Dispatch transactional emails (Customer Confirmation + Admin New Order Notification)
  try {
    const emailPayload: OrderEmailPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: input.guestEmail,
      customerName: input.shippingAddress.fullName,
      customerPhone: input.shippingAddress.phone || null,
      shippingAddress: input.shippingAddress,
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      tax: order.tax,
      total: order.total,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };

    // Dispatch both customer and admin notification concurrently
    await Promise.allSettled([
      sendOrderConfirmationCustomerEmail(emailPayload),
      sendNewOrderAdminEmail(emailPayload),
    ]);
  } catch (emailErr) {
    console.error('Non-critical: Transactional order emails failed to send:', emailErr);
  }

  return order;
}

/**
 * Updates order payment status for webhooks (failed, cancelled, refunded)
 */
export async function updateOrderPaymentState(
  identifier: { stripePaymentId?: string; stripeSessionId?: string; orderId?: string },
  paymentStatus: PaymentStatus,
  orderStatus?: OrderStatus
) {
  const whereClause: any = {};
  if (identifier.stripePaymentId) whereClause.stripePaymentId = identifier.stripePaymentId;
  else if (identifier.stripeSessionId) whereClause.stripeSessionId = identifier.stripeSessionId;
  else if (identifier.orderId) whereClause.id = identifier.orderId;
  else return null;

  const existing = await prisma.order.findFirst({
    where: whereClause,
    include: { items: true },
  });

  if (!existing) return null;

  // If transitioning to CANCELLED or REFUNDED and order was not already cancelled, restore inventory
  if (
    (paymentStatus === PaymentStatus.CANCELLED || paymentStatus === PaymentStatus.REFUNDED) &&
    existing.paymentStatus === PaymentStatus.PAID
  ) {
    await prisma.$transaction(async (tx) => {
      // Restore inventory with audit history logging
      for (const item of existing.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, sku: true, inventory: true },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              increment: item.quantity,
            },
          },
        });

        if (prod) {
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              sku: prod.sku,
              previousQuantity: prod.inventory,
              newQuantity: prod.inventory + item.quantity,
              difference: item.quantity,
              reason: paymentStatus === PaymentStatus.REFUNDED ? 'ORDER_REFUNDED' : 'ORDER_CANCELLED',
              orderNumber: existing.orderNumber,
              performedBy: 'SYSTEM',
              userId: existing.userId || null,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: existing.id },
        data: {
          paymentStatus,
          status: orderStatus || OrderStatus.CANCELLED,
        },
      });

      await tx.payment.updateMany({
        where: { orderId: existing.id },
        data: { status: paymentStatus },
      });
    });
  } else {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        paymentStatus,
        ...(orderStatus ? { status: orderStatus } : {}),
      },
    });

    await prisma.payment.updateMany({
      where: { orderId: existing.id },
      data: { status: paymentStatus },
    });
  }

  // Trigger customer cancellation notification if transitioned to CANCELLED
  if (paymentStatus === PaymentStatus.CANCELLED || orderStatus === OrderStatus.CANCELLED) {
    try {
      let recipientEmail = existing.guestEmail;
      if (!recipientEmail && existing.userId) {
        const user = await prisma.user.findUnique({ where: { id: existing.userId } });
        recipientEmail = user?.email || null;
      }

      if (recipientEmail) {
        await sendOrderCancelledEmail({
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          customerEmail: recipientEmail,
          customerName: existing.shippingName || 'Valued Customer',
          reason: 'Payment cancelled or refunded.',
        });
      }
    } catch (cancelErr) {
      console.error('Non-critical: Order cancellation email failed:', cancelErr);
    }
  }

  return existing;
}
