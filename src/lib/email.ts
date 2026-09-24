import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { EmailStatus } from '@prisma/client';
import { getTrackingUrl } from '@/lib/shipping-engine';

const resendApiKey = process.env.RESEND_API_KEY || '';
const defaultFrom = process.env.EMAIL_FROM || 'NJ Select Deals <orders@njselectdeals.com>';

export const resend = new Resend(resendApiKey || 're_placeholder_for_development');

export function isResendConfigured(): boolean {
  return Boolean(resendApiKey) && !resendApiKey.includes('placeholder');
}

export interface StoreEmailConfig {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  orderNotificationEmail: string;
  baseUrl: string;
}

export async function getStoreEmailConfig(): Promise<StoreEmailConfig> {
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const storeEmail =
      settingsMap['store_email'] ||
      process.env.NEXT_PUBLIC_STORE_EMAIL ||
      'support@njselectdeals.com';

    return {
      storeName:
        settingsMap['store_name'] ||
        process.env.NEXT_PUBLIC_STORE_NAME ||
        'NJ Select Deals',
      storeEmail,
      storePhone:
        settingsMap['store_phone'] ||
        process.env.NEXT_PUBLIC_STORE_PHONE ||
        '(800) 555-DEAL',
      storeAddress:
        settingsMap['store_address'] ||
        '100 Route 17 North, Paramus, NJ 07652',
      orderNotificationEmail:
        settingsMap['order_notification_email'] ||
        process.env.ADMIN_EMAIL ||
        storeEmail,
      baseUrl:
        process.env.NEXT_PUBLIC_BASE_URL ||
        'http://localhost:3000',
    };
  } catch (err) {
    return {
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'NJ Select Deals',
      storeEmail: process.env.NEXT_PUBLIC_STORE_EMAIL || 'support@njselectdeals.com',
      storePhone: process.env.NEXT_PUBLIC_STORE_PHONE || '(800) 555-DEAL',
      storeAddress: '100 Route 17 North, Paramus, NJ 07652',
      orderNotificationEmail: process.env.ADMIN_EMAIL || 'admin@njselectdeals.com',
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    };
  }
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  template: string;
  orderId?: string | null;
  metadata?: any;
}

export interface SendEmailResult {
  success: boolean;
  logId?: string;
  isDuplicate?: boolean;
  error?: string;
}

export async function sendEmailWithLog(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, template, orderId, metadata } = params;

  if (!isValidEmail(to)) {
    console.error(`[EMAIL ERROR] Invalid email address: ${to}`);
    return { success: false, error: `Invalid recipient address: ${to}` };
  }

  let emailLog: any = null;
  try {
    emailLog = await prisma.emailLog.create({
      data: {
        orderId: orderId || null,
        recipient: to.trim().toLowerCase(),
        subject,
        template,
        status: EmailStatus.PENDING,
        metadata: metadata ? metadata : undefined,
      },
    });
  } catch (dbErr) {
    console.error('[EMAIL ERROR] Failed to create pending EmailLog:', dbErr);
  }

  try {
    if (!isResendConfigured()) {
      console.log(`[EMAIL DEVELOPMENT] [${template}] Dispatching email to: ${to} | Subject: "${subject}"`);
      if (emailLog) {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: EmailStatus.SENT,
            providerId: `dev-mock-${Date.now()}`,
            sentAt: new Date(),
          },
        });
      }
      return { success: true, logId: emailLog?.id };
    }

    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to: [to.trim()],
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL ERROR] Resend provider error:', error);
      if (emailLog) {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: EmailStatus.FAILED,
            error: error.message || 'Unknown provider error',
          },
        });
      }
      return { success: false, error: error.message };
    }

    if (emailLog) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          providerId: data?.id || null,
          sentAt: new Date(),
        },
      });
    }

    return { success: true, logId: emailLog?.id };
  } catch (sendError: any) {
    console.error('[EMAIL CRITICAL] Unexpected error dispatching email:', sendError);
    if (emailLog) {
      try {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: EmailStatus.FAILED,
            error: sendError.message || 'Unknown runtime error',
          },
        });
      } catch (e) {
        console.error(e);
      }
    }
    return { success: false, error: sendError.message };
  }
}

export interface OrderItemEmailData {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderEmailPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  items: OrderItemEmailData[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: {
    fullName: string;
    street: string;
    apartment?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country?: string | null;
  };
  paymentStatus?: string;
  createdAt?: string | Date;
}

/**
 * 1. Customer Order Confirmation Email
 */
export async function sendOrderConfirmationCustomerEmail(payload: OrderEmailPayload) {
  const config = await getStoreEmailConfig();

  const itemsHtml = payload.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">
        <strong>${item.name}</strong>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #64748b;">
        ${item.quantity}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: bold; color: #0f172a;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${config.storeName}</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Order Confirmation</p>
        </div>

        <div style="padding: 30px;">
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; color: #065f46; font-size: 13px; font-weight: bold; text-transform: uppercase;">Thank you for your order!</p>
            <p style="margin: 4px 0 0 0; color: #047857; font-size: 20px; font-weight: 900;">Order #${payload.orderNumber}</p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Hi <strong>${payload.customerName}</strong>,<br/>
            We have received your order and payment confirmation. Our Paramus fulfillment team is preparing your package.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">
                <th style="padding: 8px 12px;">Product</th>
                <th style="padding: 8px 12px; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #e2e8f0; padding-top: 14px; font-size: 13px; line-height: 1.8;">
            <div style="display: flex; justify-content: space-between; color: #64748b;">
              <span>Subtotal:</span>
              <span style="color: #0f172a; font-weight: 600;">${formatPrice(payload.subtotal)}</span>
            </div>
            ${payload.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: #e11d48;"><span>Discount:</span><span style="font-weight: 600;">-${formatPrice(payload.discount)}</span></div>` : ''}
            <div style="display: flex; justify-content: space-between; color: #64748b;">
              <span>Shipping:</span>
              <span style="color: #0f172a; font-weight: 600;">${payload.shippingCost === 0 ? 'FREE' : formatPrice(payload.shippingCost)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #64748b;">
              <span>Tax:</span>
              <span style="color: #0f172a; font-weight: 600;">${formatPrice(payload.tax)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 16px; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 6px;">
              <span>Total:</span>
              <span>${formatPrice(payload.total)}</span>
            </div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${config.baseUrl}/account/orders" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px;">
              View Order in Account
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithLog({
    to: payload.customerEmail,
    subject: `Order Confirmation #${payload.orderNumber}`,
    html,
    template: 'ORDER_CONFIRMATION',
    orderId: payload.orderId,
    metadata: { orderNumber: payload.orderNumber, total: payload.total },
  });
}

/**
 * 2. Store Owner / Admin New Order Notification Email
 */
export async function sendNewOrderAdminEmail(payload: OrderEmailPayload) {
  const config = await getStoreEmailConfig();
  const recipient = config.orderNotificationEmail || config.storeEmail;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 800;">${config.storeName} - Admin Portal</h2>
          <p style="margin: 4px 0 0 0; color: #f59e0b; font-size: 12px; font-weight: bold; text-transform: uppercase;">New Order Placed</p>
        </div>
        <div style="padding: 24px; font-size: 13px;">
          <p>A new order <strong>#${payload.orderNumber}</strong> was placed by <strong>${payload.customerName}</strong> (${payload.customerEmail}).</p>
          <p>Total: <strong>${formatPrice(payload.total)}</strong></p>
          <div style="margin-top: 20px;">
            <a href="${config.baseUrl}/admin/orders/${payload.orderId}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 12px;">
              Process Order in Admin
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithLog({
    to: recipient,
    subject: `[New Order Alert] #${payload.orderNumber} ($${payload.total.toFixed(2)})`,
    html,
    template: 'ADMIN_NEW_ORDER',
    orderId: payload.orderId,
    metadata: { orderNumber: payload.orderNumber, total: payload.total },
  });
}

/**
 * Shipping Notification Email
 * Sent to customer when order status changes to SHIPPED. Includes carrier, tracking number, and tracking link.
 */
export async function sendOrderShippedEmail(params: {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
}) {
  const config = await getStoreEmailConfig();
  const { orderId, orderNumber, customerEmail, customerName, carrier, trackingNumber, trackingUrl } = params;

  // Auto-construct tracking link using carrier architecture
  const effectiveTrackingLink = trackingUrl || getTrackingUrl(carrier, trackingNumber) || `${config.baseUrl}/account/orders`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${config.storeName}</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Shipment Dispatch Notice</p>
        </div>

        <div style="padding: 30px;">
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: bold; text-transform: uppercase;">Shipping Status</p>
            <p style="margin: 4px 0 0 0; color: #1e3a8a; font-size: 22px; font-weight: 900;">SHIPPED</p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Hi <strong>${customerName}</strong>,<br/>
            Great news! Your order <strong>#${orderNumber}</strong> has been packaged and handed over to <strong>${carrier}</strong> for delivery.
          </p>

          <div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 140px;">Order Number:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Carrier:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${carrier}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Tracking Number:</td>
                <td style="padding: 6px 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #2563eb;">${trackingNumber}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${effectiveTrackingLink}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Track Package Online
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center;">
            Carrier updates may take up to 24 hours to reflect initial scans. You can also monitor your package directly under <a href="${config.baseUrl}/account/orders" style="color: #2563eb; font-weight: bold;">My Account &gt; Order History</a>.
          </p>

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
            <strong>Need assistance?</strong><br/>
            Email: <a href="mailto:${config.storeEmail}" style="color: #2563eb;">${config.storeEmail}</a> • Phone: ${config.storePhone}<br/>
            ${config.storeName} • ${config.storeAddress}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithLog({
    to: customerEmail,
    subject: `Your order #${orderNumber} has shipped! (${carrier})`,
    html,
    template: 'ORDER_SHIPPED',
    orderId,
    metadata: { orderNumber, carrier, trackingNumber, trackingUrl: effectiveTrackingLink },
  });
}

export async function sendOrderDeliveredEmail(params: {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
}) {
  const config = await getStoreEmailConfig();
  const { orderId, orderNumber, customerEmail, customerName } = params;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${config.storeName}</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Delivery Confirmation</p>
        </div>
        <div style="padding: 30px;">
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; color: #065f46; font-size: 13px; font-weight: bold; text-transform: uppercase;">Delivery Status</p>
            <p style="margin: 4px 0 0 0; color: #047857; font-size: 22px; font-weight: 900;">DELIVERED</p>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Hi <strong>${customerName}</strong>,<br/>
            Your order <strong>#${orderNumber}</strong> has been marked as delivered by the carrier. We hope you enjoy your purchase!
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${config.baseUrl}/account/orders" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px;">
              View Order Details
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithLog({
    to: customerEmail,
    subject: `Delivered: Your NJ Select Deals order #${orderNumber}`,
    html,
    template: 'ORDER_DELIVERED',
    orderId,
    metadata: { orderNumber },
  });
}

export async function sendOrderCancelledEmail(params: {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  reason?: string;
}) {
  const config = await getStoreEmailConfig();
  const { orderId, orderNumber, customerEmail, customerName, reason } = params;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${config.storeName}</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Order Notice</p>
        </div>
        <div style="padding: 30px;">
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; color: #9f1239; font-size: 13px; font-weight: bold; text-transform: uppercase;">Status Update</p>
            <p style="margin: 4px 0 0 0; color: #be123c; font-size: 20px; font-weight: 900;">ORDER CANCELLED</p>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Hi <strong>${customerName}</strong>,<br/>
            Your order <strong>#${orderNumber}</strong> has been cancelled.
            ${reason ? `<br/><br/><strong>Reason:</strong> ${reason}` : ''}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailWithLog({
    to: customerEmail,
    subject: `Order #${orderNumber} Cancellation Notice`,
    html,
    template: 'ORDER_CANCELLED',
    orderId,
    metadata: { orderNumber, reason },
  });
}
