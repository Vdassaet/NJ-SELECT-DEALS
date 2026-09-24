import { prisma } from '../src/lib/prisma';
import {
  getStoreEmailConfig,
  isValidEmail,
  sendEmailWithLog,
  sendNewOrderAdminEmail,
  sendOrderConfirmationCustomerEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  OrderEmailPayload,
} from '../src/lib/email';
import { completePaidOrder } from '../src/lib/order-service';
import { EmailStatus, OrderStatus, PaymentStatus } from '@prisma/client';

async function runEmailSystemAudit() {
  console.log('====================================================');
  console.log('  TRANSACTIONAL EMAIL SYSTEM AUDIT & TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Dynamic Admin Settings & Order Notification Email
    // -------------------------------------------------------------
    console.log('--- TEST 1: Admin Settings & Dynamic Store Configuration ---');
    const customAdminEmail = 'store-owner-alerts@njselectdeals.com';
    await prisma.settings.upsert({
      where: { key: 'order_notification_email' },
      update: { value: customAdminEmail },
      create: { key: 'order_notification_email', value: customAdminEmail },
    });

    await prisma.settings.upsert({
      where: { key: 'store_name' },
      update: { value: 'NJ Select Deals - Test Store' },
      create: { key: 'store_name', value: 'NJ Select Deals - Test Store' },
    });

    const config = await getStoreEmailConfig();
    assert(
      config.orderNotificationEmail === customAdminEmail,
      'Admin Order Notification Email is retrieved dynamically from Settings',
      `Expected ${customAdminEmail}, got ${config.orderNotificationEmail}`
    );
    assert(
      config.storeName === 'NJ Select Deals - Test Store',
      'Store branding info is retrieved dynamically from Settings without hardcoding',
      `Got ${config.storeName}`
    );

    // -------------------------------------------------------------
    // Test 2: Invalid Email Format Validation & Error Logging
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Email Format Validation & FAILED Email Logging ---');
    const validCheck1 = isValidEmail('customer@example.com');
    const validCheck2 = isValidEmail('invalid-email-no-at');
    const validCheck3 = isValidEmail('invalid@domain');
    const validCheck4 = isValidEmail('');

    assert(validCheck1 === true, 'Valid email correctly accepted');
    assert(validCheck2 === false && validCheck3 === false && validCheck4 === false, 'Invalid emails correctly rejected');

    const invalidEmailResult = await sendEmailWithLog({
      to: 'broken-email-address',
      subject: 'Invalid Email Test',
      html: '<p>Test</p>',
      template: 'INVALID_TEST',
    });

    assert(invalidEmailResult.success === false, 'Invalid email dispatch returned failure');
    const failedLog = await prisma.emailLog.findUnique({
      where: { id: invalidEmailResult.logId! },
    });

    assert(
      failedLog !== null && failedLog.status === EmailStatus.FAILED,
      'Invalid email is logged with FAILED status in database',
      `Status: ${failedLog?.status}`
    );
    assert(
      Boolean(failedLog?.error && failedLog.error.includes('Invalid recipient')),
      'Failed email log captures accurate descriptive error message',
      `Error: ${failedLog?.error}`
    );

    // -------------------------------------------------------------
    // Test 3: Setup Test Product & Order Creation
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Order Setup & Initial Payment Processing ---');
    const testCategory = await prisma.category.upsert({
      where: { slug: 'email-test-category' },
      update: {},
      create: {
        name: 'Email Test Category',
        slug: 'email-test-category',
        isActive: true,
      },
    });

    const testProduct = await prisma.product.upsert({
      where: { sku: 'EMAIL-TEST-SKU-01' },
      update: { inventory: 50, price: 34.99, isActive: true },
      create: {
        name: 'Luxury Hydrating Face Cream',
        slug: 'luxury-hydrating-face-cream-test',
        sku: 'EMAIL-TEST-SKU-01',
        description: 'Test cream for email notifications',
        price: 34.99,
        inventory: 50,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    const testOrderId = `order_test_${Date.now()}`;
    const testSessionId = `cs_test_email_${Date.now()}`;
    const testCustomerEmail = 'sarah.customer@example.com';
    const testCustomerName = 'Sarah Jenkins';

    const order = await completePaidOrder({
      stripeSessionId: testSessionId,
      guestEmail: testCustomerEmail,
      shippingAddress: {
        fullName: testCustomerName,
        street: '742 Evergreen Terrace',
        apartment: 'Suite 4B',
        city: 'Paramus',
        state: 'NJ',
        postalCode: '07652',
        country: 'US',
        phone: '(201) 555-0199',
      },
      items: [
        {
          productId: testProduct.id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 2,
        },
      ],
      subtotal: 69.98,
      discount: 5.00,
      shippingCost: 0,
      tax: 4.30,
      total: 69.28,
      notes: 'Please leave by front porch inside storm door',
    });

    assert(Boolean(order && order.id), 'Paid test order completed atomically in database');

    // -------------------------------------------------------------
    // Test 4: New Order Email to Store Owner
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: New Order Email to Store Owner ---');
    const adminEmailLog = await prisma.emailLog.findFirst({
      where: {
        orderId: order.id,
        template: 'ADMIN_NEW_ORDER',
      },
      orderBy: { createdAt: 'desc' },
    });

    assert(adminEmailLog !== null, 'Admin notification email logged in database');
    assert(
      adminEmailLog?.recipient === customAdminEmail.toLowerCase(),
      'Admin notification email dispatched to dynamically configured order_notification_email',
      `Recipient: ${adminEmailLog?.recipient}`
    );
    assert(
      adminEmailLog?.subject === `New Order #${order.orderNumber}`,
      `Admin email subject matches exact specification: "New Order #${order.orderNumber}"`,
      `Subject: ${adminEmailLog?.subject}`
    );
    assert(
      adminEmailLog?.status === EmailStatus.SENT,
      'Admin email status is SENT in database',
      `Status: ${adminEmailLog?.status}`
    );

    // -------------------------------------------------------------
    // Test 5: Customer Order Confirmation Email
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Customer Order Confirmation Email ---');
    const customerEmailLog = await prisma.emailLog.findFirst({
      where: {
        orderId: order.id,
        template: 'ORDER_CONFIRMATION',
      },
      orderBy: { createdAt: 'desc' },
    });

    assert(customerEmailLog !== null, 'Customer confirmation email logged in database');
    assert(
      customerEmailLog?.recipient === testCustomerEmail.toLowerCase(),
      'Customer confirmation email dispatched to customer email address',
      `Recipient: ${customerEmailLog?.recipient}`
    );
    assert(
      customerEmailLog?.subject === `Order Confirmation #${order.orderNumber}`,
      `Customer email subject matches exact specification: "Order Confirmation #${order.orderNumber}"`,
      `Subject: ${customerEmailLog?.subject}`
    );
    assert(
      customerEmailLog?.status === EmailStatus.SENT,
      'Customer email status is SENT in database',
      `Status: ${customerEmailLog?.status}`
    );

    // -------------------------------------------------------------
    // Test 6: Duplicate Webhook Protection (Idempotency Guard)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Duplicate Webhook Protection (Zero Duplicate Emails) ---');
    const countBeforeDup = await prisma.emailLog.count({
      where: { orderId: order.id },
    });

    // Simulate duplicate webhook event or duplicate payment notification
    const dupAdminResult = await sendNewOrderAdminEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: testCustomerEmail,
      customerName: testCustomerName,
      shippingAddress: {
        fullName: testCustomerName,
        street: '742 Evergreen Terrace',
        city: 'Paramus',
        state: 'NJ',
        postalCode: '07652',
        country: 'US',
      },
      items: [{ name: testProduct.name, quantity: 2, price: testProduct.price }],
      subtotal: 69.98,
      discount: 5.00,
      shippingCost: 0,
      tax: 4.30,
      total: 69.28,
      paymentStatus: 'PAID',
      createdAt: order.createdAt,
    });

    const dupCustomerResult = await sendOrderConfirmationCustomerEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: testCustomerEmail,
      customerName: testCustomerName,
      shippingAddress: {
        fullName: testCustomerName,
        street: '742 Evergreen Terrace',
        city: 'Paramus',
        state: 'NJ',
        postalCode: '07652',
        country: 'US',
      },
      items: [{ name: testProduct.name, quantity: 2, price: testProduct.price }],
      subtotal: 69.98,
      discount: 5.00,
      shippingCost: 0,
      tax: 4.30,
      total: 69.28,
      paymentStatus: 'PAID',
      createdAt: order.createdAt,
    });

    assert(dupAdminResult.isDuplicate === true, 'Duplicate admin notification correctly detected and skipped');
    assert(dupCustomerResult.isDuplicate === true, 'Duplicate customer confirmation correctly detected and skipped');

    const countAfterDup = await prisma.emailLog.count({
      where: { orderId: order.id },
    });

    assert(
      countBeforeDup === countAfterDup,
      'No duplicate email log records created on duplicate webhook event',
      `Before: ${countBeforeDup}, After: ${countAfterDup}`
    );

    // -------------------------------------------------------------
    // Test 7: Shipping Notification Email
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Shipping Notification Email ---');
    const testTrackingNumber = '9400111899223191234567';
    const testCarrier = 'USPS';

    const shipResult = await sendOrderShippedEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: testCustomerEmail,
      customerName: testCustomerName,
      carrier: testCarrier,
      trackingNumber: testTrackingNumber,
    });

    assert(shipResult.success === true, 'Shipping notification dispatched successfully');

    const shippedLog = await prisma.emailLog.findFirst({
      where: {
        orderId: order.id,
        template: 'ORDER_SHIPPED',
      },
    });

    assert(shippedLog !== null && shippedLog.status === EmailStatus.SENT, 'Shipping email logged as SENT in database');
    assert(
      Boolean(shippedLog?.subject && shippedLog.subject.includes(order.orderNumber)),
      `Shipping email subject includes order number (${shippedLog?.subject})`
    );

    // -------------------------------------------------------------
    // Test 8: Delivered Notification Email
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Delivered Notification Email ---');
    const deliverResult = await sendOrderDeliveredEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: testCustomerEmail,
      customerName: testCustomerName,
    });

    assert(deliverResult.success === true, 'Delivery notification dispatched successfully');

    const deliveredLog = await prisma.emailLog.findFirst({
      where: {
        orderId: order.id,
        template: 'ORDER_DELIVERED',
      },
    });

    assert(deliveredLog !== null && deliveredLog.status === EmailStatus.SENT, 'Delivery email logged as SENT in database');
    assert(
      Boolean(deliveredLog?.subject && deliveredLog.subject.includes('Delivered')),
      `Delivery email subject confirms delivery (${deliveredLog?.subject})`
    );

    // -------------------------------------------------------------
    // Test 9: Order Cancellation Email
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Order Cancellation Email ---');
    const cancelReason = 'Customer requested cancellation prior to carrier pickup.';
    const cancelResult = await sendOrderCancelledEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: testCustomerEmail,
      customerName: testCustomerName,
      reason: cancelReason,
    });

    assert(cancelResult.success === true, 'Cancellation notification dispatched successfully');

    const cancelledLog = await prisma.emailLog.findFirst({
      where: {
        orderId: order.id,
        template: 'ORDER_CANCELLED',
      },
    });

    assert(cancelledLog !== null && cancelledLog.status === EmailStatus.SENT, 'Cancellation email logged as SENT in database');
    assert(
      Boolean(cancelledLog?.subject && cancelledLog.subject.includes('Cancelled')),
      `Cancellation email subject confirms cancellation (${cancelledLog?.subject})`
    );

    // -------------------------------------------------------------
    // Test 10: Complete Order Lifecycle Email Audit in Database
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Database Audit Trail Verification ---');
    const orderWithEmails = await prisma.order.findUnique({
      where: { id: order.id },
      include: { emails: true },
    });

    const emailTemplatesSent = orderWithEmails?.emails.map((e) => e.template) || [];
    assert(
      emailTemplatesSent.includes('ADMIN_NEW_ORDER'),
      'Database order relation contains ADMIN_NEW_ORDER log'
    );
    assert(
      emailTemplatesSent.includes('ORDER_CONFIRMATION'),
      'Database order relation contains ORDER_CONFIRMATION log'
    );
    assert(
      emailTemplatesSent.includes('ORDER_SHIPPED'),
      'Database order relation contains ORDER_SHIPPED log'
    );
    assert(
      emailTemplatesSent.includes('ORDER_DELIVERED'),
      'Database order relation contains ORDER_DELIVERED log'
    );
    assert(
      emailTemplatesSent.includes('ORDER_CANCELLED'),
      'Database order relation contains ORDER_CANCELLED log'
    );

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Audit suite crashed with unhandled exception:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEmailSystemAudit();
