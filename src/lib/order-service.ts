import { prisma } from '@/lib/prisma';
import { generateOrderNumber } from '@/lib/utils';
import {
  sendOrderConfirmationCustomerEmail,
  sendNewOrderAdminEmail,
  sendOrderCancelledEmail,
  OrderEmailPayload,
} from '@/lib/email';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { calculateOrderPricing } from '@/lib/pricing-engine';
import { logSecurityEvent } from '@/lib/security-logger';

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
  couponCode?: string | null;
  shippingMethod?: 'free' | 'fast';
  appliedPromotionIds?: string[] | null;
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

  // Step 3: Authoritative Database Pricing Calculation
  // Ground truth recalculation prevents any client total/price tampering
  const authoritativePricing = await calculateOrderPricing(
    input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, variantId: i.variantId })),
    input.couponCode,
    { shippingMethod: input.shippingMethod }
  );

  const subtotal = authoritativePricing.subtotal;
  const discount = authoritativePricing.totalSavings;
  const shippingCost = authoritativePricing.shippingCost;
  const tax = authoritativePricing.tax;
  const total = authoritativePricing.total;

  const itemMap = new Map(authoritativePricing.itemBreakdowns.map((b) => [b.productId, b]));
  const orderItemData = input.items.map((item) => {
    const breakdown = itemMap.get(item.productId);
    const effectivePrice = breakdown ? breakdown.effectiveUnitPrice : item.price;
    return {
      productId: item.productId,
      variantId: item.variantId || null,
      productName: item.name,
      productImage: item.image || null,
      price: effectivePrice,
      quantity: item.quantity,
      total: Math.round(effectivePrice * item.quantity * 100) / 100,
    };
  });

  const orderNumber = generateOrderNumber();

  // Step 4: Atomic database transaction with race condition handling
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      // 4a. Atomically verify and decrement inventory
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

      // 4b. Create Order with authoritative financial snapshot
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
          guestEmail: input.userId ? null : input.guestEmail.trim().toLowerCase(),
          status: OrderStatus.PROCESSING,
          paymentStatus: PaymentStatus.PAID,
          subtotal,
          discount,
          shippingCost,
          tax,
          total,
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
            create: orderItemData,
          },
          payments: {
            create: {
              amount: total,
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

      // 4c. Optional address persistence for logged-in customers
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

      // 4d. Atomically record Promotion & Coupon usage upon successful paid order
      if (input.appliedPromotionIds && input.appliedPromotionIds.length > 0) {
        for (const promoId of input.appliedPromotionIds) {
          try {
            if (promoId.startsWith('coupon_')) {
              const legacyId = promoId.replace('coupon_', '');
              await tx.coupon.update({
                where: { id: legacyId },
                data: { usedCount: { increment: 1 } },
              });
            } else {
              await tx.promotion.update({
                where: { id: promoId },
                data: { usedCount: { increment: 1 } },
              });
            }
          } catch (promoErr) {
            console.warn(`Could not increment usedCount for promotion ${promoId}:`, promoErr);
          }
        }
      } else if (input.couponCode) {
        const cleanCode = input.couponCode.trim().toUpperCase();
        try {
          const promo = await tx.promotion.findUnique({ where: { couponCode: cleanCode } });
          if (promo) {
            await tx.promotion.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            });
          } else {
            const legacy = await tx.coupon.findUnique({ where: { code: cleanCode } });
            if (legacy) {
              await tx.coupon.update({
                where: { id: legacy.id },
                data: { usedCount: { increment: 1 } },
              });
            }
          }
        } catch (couponErr) {
          console.warn(`Could not increment usedCount for coupon code ${cleanCode}:`, couponErr);
        }
      }

      return newOrder;
    });
  } catch (txErr: any) {
    // If unique constraint violated because concurrent webhook / request already completed this session
    if (txErr?.code === 'P2002' || String(txErr?.message).includes('Unique constraint')) {
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
        if (existing) return existing;
      }
    }
    throw txErr;
  }

  // Step 5: Security Audit Log
  logSecurityEvent({
    type: 'PAYMENT_EVENT',
    action: 'ORDER_COMPLETED',
    userId: order.userId,
    userEmail: input.guestEmail,
    resourceId: order.id,
    details: {
      orderNumber: order.orderNumber,
      total: order.total,
      stripePaymentId: input.stripePaymentId,
      stripeSessionId: input.stripeSessionId,
    },
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

  logSecurityEvent({
    type: 'PAYMENT_EVENT',
    action: 'ORDER_PAYMENT_STATE_UPDATED',
    userId: existing.userId,
    userEmail: existing.guestEmail,
    resourceId: existing.id,
    details: {
      orderNumber: existing.orderNumber,
      previousPaymentStatus: existing.paymentStatus,
      newPaymentStatus: paymentStatus,
      newOrderStatus: orderStatus,
    },
  });

  return existing;
}
