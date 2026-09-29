export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireAdmin } from '@/lib/auth';
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
} from '@/lib/email';
import { getTrackingUrl } from '@/lib/shipping-engine';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Rate limiting on order lookup (20 requests per minute per IP to prevent ID/number scraping)
    const rateLimit = await checkRateLimit(request, {
      keyPrefix: 'order_lookup',
      limit: 20,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many order requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
      );
    }

    const session = await getSession();
    let isAdmin = false;
    if (session?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, role: true },
      });
      isAdmin = dbUser?.role === 'ADMIN';
    }

    const { id } = params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                weight: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        ...(isAdmin
          ? {
              emails: {
                orderBy: { createdAt: 'desc' },
              },
            }
          : {}),
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Strict Authorization Verification
    if (order.userId) {
      // Registered User Order: Only the order owner or verified store administrator can view
      if (!session || (!isAdmin && session.id !== order.userId)) {
        logSecurityEvent(
          'AUTHZ_FAILURE',
          { reason: 'USER_ORDER_ACCESS_DENIED', orderId: order.id, attemptedUserId: session?.id },
          request,
          session ? { userId: session.id, role: session.role } : undefined
        );
        return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 });
      }
    } else {
      // Guest Order: Require either Admin session, matching authenticated user email, or matching query email + postal code
      const emailQuery = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
      const postalCodeQuery = request.nextUrl.searchParams.get('postalCode')?.trim().toLowerCase();
      const isMatchingLoggedInUser = session && session.email?.toLowerCase() === order.guestEmail?.toLowerCase();
      const isVerifiedGuest = Boolean(
        emailQuery &&
        postalCodeQuery &&
        order.guestEmail &&
        emailQuery === order.guestEmail.toLowerCase() &&
        postalCodeQuery === order.shippingPostalCode.toLowerCase()
      );

      if (!isAdmin && !isMatchingLoggedInUser && !isVerifiedGuest) {
        logSecurityEvent(
          'AUTHZ_FAILURE',
          { reason: 'GUEST_ORDER_ACCESS_DENIED', orderId: order.id, emailQuery },
          request,
          session ? { userId: session.id, role: session.role } : undefined
        );
        return NextResponse.json(
          { error: 'Unauthorized to view this order. Associated email address and postal code are required.' },
          { status: 403 }
        );
      }
    }

    // 3. Sanitize sensitive internal payment tokens for non-admin callers
    if (!isAdmin) {
      const { stripePaymentId, stripeSessionId, ...safeOrder } = order as any;
      return NextResponse.json({ order: safeOrder });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch order details');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const session = await requireAdmin();

    const body = await request.json();
    const { status, paymentStatus, notes, carrier, trackingNumber, trackingUrl } = body;

    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status as OrderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus as PaymentStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber ? trackingNumber.trim() : null;

    // Automatic deep-link resolution for trackingUrl if not explicitly provided
    if (trackingUrl !== undefined && trackingUrl.trim()) {
      updateData.trackingUrl = trackingUrl.trim();
    } else if (trackingNumber !== undefined && trackingNumber.trim()) {
      const resolved = getTrackingUrl(carrier || currentOrder.carrier, trackingNumber.trim());
      if (resolved) updateData.trackingUrl = resolved;
    }

    // If order is transitioned to CANCELLED, restore inventory if previously active
    if (status === OrderStatus.CANCELLED && currentOrder.status !== OrderStatus.CANCELLED) {
      await prisma.$transaction(async (tx) => {
        for (const item of currentOrder.items) {
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
                reason: 'ORDER_CANCELLED',
                orderNumber: currentOrder.orderNumber,
                performedBy: session?.email || 'ADMIN',
                userId: session?.id || null,
              },
            });
          }
        }
      });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: true,
        user: true,
        emails: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      {
        action: 'UPDATE_ORDER_STATUS',
        orderId: params.id,
        orderNumber: currentOrder.orderNumber,
        newStatus: status || currentOrder.status,
        newPaymentStatus: paymentStatus || currentOrder.paymentStatus,
      },
      request,
      { userId: session.id, role: session.role }
    );

    // Customer recipient resolution
    const customerEmail =
      updated.guestEmail ||
      updated.user?.email ||
      (updated.userId
        ? (await prisma.user.findUnique({ where: { id: updated.userId } }))?.email
        : null);

    // Trigger lifecycle emails based on state transitions
    if (customerEmail) {
      try {
        // 1. SHIPPED Notification - includes carrier and tracking information
        if (status === OrderStatus.SHIPPED && currentOrder.status !== OrderStatus.SHIPPED) {
          await sendOrderShippedEmail({
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            customerEmail,
            customerName: updated.shippingName || 'Valued Customer',
            carrier: updated.carrier || 'USPS',
            trackingNumber: updated.trackingNumber || 'Pending Tracking',
            trackingUrl: updated.trackingUrl,
          });
        }

        // 2. DELIVERED Notification
        if (status === OrderStatus.DELIVERED && currentOrder.status !== OrderStatus.DELIVERED) {
          await sendOrderDeliveredEmail({
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            customerEmail,
            customerName: updated.shippingName || 'Valued Customer',
          });
        }

        // 3. CANCELLED Notification
        if (status === OrderStatus.CANCELLED && currentOrder.status !== OrderStatus.CANCELLED) {
          await sendOrderCancelledEmail({
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            customerEmail,
            customerName: updated.shippingName || 'Valued Customer',
            reason: notes || 'Order cancelled by store administrator.',
          });
        }
      } catch (emailErr) {
        console.error('Non-critical: Order status lifecycle email failed:', emailErr);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to update order');
  }
}
