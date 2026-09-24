import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { sendOrderCancelledEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      return NextResponse.json({ error: 'Order is already marked as refunded' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const refundReason = body.reason || 'Customer refund requested and processed by store administrator';

    // 1. Transaction to update order status, payment status, restore inventory and add logs
    const updated = await prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of order.items) {
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
              reason: 'ORDER_REFUNDED',
              orderNumber: order.orderNumber,
              performedBy: session.email || 'ADMIN',
              userId: session.id || null,
            },
          });
        }
      }

      // Record refund in Payment table
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: -order.total,
          currency: 'USD',
          provider: order.stripePaymentId ? 'STRIPE' : 'MANUAL',
          transactionId: `REFUND-${order.orderNumber}-${Date.now()}`,
          status: PaymentStatus.REFUNDED,
        },
      });

      // Update Order
      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
          notes: order.notes ? `${order.notes} | Refund: ${refundReason}` : `Refund: ${refundReason}`,
        },
        include: {
          items: true,
          user: true,
          payments: true,
          emails: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    // Notify customer
    const customerEmail =
      updated.guestEmail ||
      updated.user?.email ||
      (updated.userId
        ? (await prisma.user.findUnique({ where: { id: updated.userId } }))?.email
        : null);

    if (customerEmail) {
      try {
        await sendOrderCancelledEmail({
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          customerEmail,
          customerName: updated.shippingName || 'Valued Customer',
          reason: `Your order has been fully refunded ($${updated.total.toFixed(2)}). Reason: ${refundReason}`,
        });
      } catch (err) {
        console.error('Failed to send refund notification email:', err);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Refund processing error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process refund' }, { status: 500 });
  }
}
