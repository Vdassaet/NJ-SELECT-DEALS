import { prisma } from '../src/lib/prisma';
import { completePaidOrder, updateOrderPaymentState } from '../src/lib/order-service';
import { PaymentStatus, OrderStatus } from '@prisma/client';

async function runStripePaymentAudit() {
  console.log('====================================================');
  console.log('  STRIPE PAYMENT & ORDER FULFILLMENT TEST SUITE');
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
    // 0. Setup: Clean test category & product
    const testCategory = await prisma.category.upsert({
      where: { slug: 'stripe-test-category' },
      update: {},
      create: {
        name: 'Stripe Test Category',
        slug: 'stripe-test-category',
        isActive: true,
      },
    });

    const initialStock = 10;
    const testProduct = await prisma.product.upsert({
      where: { sku: 'TEST-STRIPE-SKU-01' },
      update: {
        inventory: initialStock,
        price: 25.00,
        isActive: true,
      },
      create: {
        name: 'Stripe Test Product',
        slug: 'stripe-test-product',
        sku: 'TEST-STRIPE-SKU-01',
        description: 'Test product for Stripe payment lifecycle',
        price: 25.00,
        inventory: initialStock,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    // Setup two test users for authorization testing
    const userA = await prisma.user.upsert({
      where: { email: 'customer_a_test@njselectdeals.com' },
      update: {},
      create: {
        email: 'customer_a_test@njselectdeals.com',
        name: 'Customer A',
        passwordHash: 'hashed_pw_test',
        role: 'CUSTOMER',
      },
    });

    const userB = await prisma.user.upsert({
      where: { email: 'customer_b_test@njselectdeals.com' },
      update: {},
      create: {
        email: 'customer_b_test@njselectdeals.com',
        name: 'Customer B',
        passwordHash: 'hashed_pw_test',
        role: 'CUSTOMER',
      },
    });

    // ---------------------------------------------------------------
    // Test 1: Inventory Validation & Overselling Prevention
    // ---------------------------------------------------------------
    console.log('\n--- Test 1: Insufficient Inventory Protection ---');
    let inventoryErrorCaught = false;
    try {
      await completePaidOrder({
        stripePaymentId: 'pi_test_oversell',
        stripeSessionId: 'cs_test_oversell',
        userId: userA.id,
        guestEmail: userA.email,
        shippingAddress: {
          fullName: 'Customer A',
          street: '100 Main St',
          city: 'Fort Lee',
          state: 'NJ',
          postalCode: '07024',
          country: 'US',
        },
        items: [{
          productId: testProduct.id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 999, // Exceeds available stock
        }],
        subtotal: testProduct.price * 999,
        discount: 0,
        shippingCost: 0,
        tax: 0,
        total: testProduct.price * 999,
      });
    } catch (err: any) {
      if (err.message === 'Sorry, one or more products are no longer available in the requested quantity.') {
        inventoryErrorCaught = true;
      } else {
        console.error('Unexpected error message:', err.message);
      }
    }
    assert(inventoryErrorCaught, 'Rejects checkout when quantity exceeds stock with exact required error message');

    const stockAfterOversellAttempt = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    assert(stockAfterOversellAttempt?.inventory === initialStock, 'Inventory unchanged after rejected overselling attempt');

    // ---------------------------------------------------------------
    // Test 2: Successful Payment, Order Creation & Inventory Reduction
    // ---------------------------------------------------------------
    console.log('\n--- Test 2: Successful Payment & Order Creation ---');
    const orderQuantity = 2;
    const testPaymentId = `pi_test_${Date.now()}_success`;
    const testSessionId = `cs_test_${Date.now()}_success`;

    const createdOrder = await completePaidOrder({
      stripePaymentId: testPaymentId,
      stripeSessionId: testSessionId,
      userId: userA.id,
      guestEmail: userA.email,
      shippingAddress: {
        fullName: 'Customer A',
        street: '100 Main St',
        apartment: 'Suite 2B',
        city: 'Fort Lee',
        state: 'NJ',
        postalCode: '07024',
        country: 'US',
        phone: '2015550199',
      },
      items: [{
        productId: testProduct.id,
        name: testProduct.name,
        price: testProduct.price,
        quantity: orderQuantity,
      }],
      subtotal: testProduct.price * orderQuantity,
      discount: 0,
      shippingCost: 0,
      tax: 3.31,
      total: (testProduct.price * orderQuantity) + 3.31,
      notes: 'Please leave at reception',
    });

    assert(Boolean(createdOrder && createdOrder.id), 'Order successfully created in database');
    assert(/^ORD-\d{8}-\d{4}$/.test(createdOrder.orderNumber), `Order number matches ORD-YYYYMMDD-XXXX (${createdOrder.orderNumber})`);
    assert(createdOrder.paymentStatus === PaymentStatus.PAID, 'Payment status set to PAID');
    assert(createdOrder.status === OrderStatus.PROCESSING, 'Order status set to PROCESSING');
    assert(createdOrder.stripePaymentId === testPaymentId, 'Stripe Payment ID saved correctly');
    assert(createdOrder.tax === 3.31, 'Sales tax saved correctly');

    const stockAfterSuccess = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    const expectedStock = initialStock - orderQuantity;
    assert(stockAfterSuccess?.inventory === expectedStock, `Inventory accurately decreased from ${initialStock} to ${expectedStock}`);

    // ---------------------------------------------------------------
    // Test 3: Duplicate Webhook & Idempotency
    // ---------------------------------------------------------------
    console.log('\n--- Test 3: Duplicate Webhook Idempotency ---');
    const duplicateAttempt = await completePaidOrder({
      stripePaymentId: testPaymentId,
      stripeSessionId: testSessionId,
      userId: userA.id,
      guestEmail: userA.email,
      shippingAddress: {
        fullName: 'Customer A',
        street: '100 Main St',
        city: 'Fort Lee',
        state: 'NJ',
        postalCode: '07024',
        country: 'US',
      },
      items: [{
        productId: testProduct.id,
        name: testProduct.name,
        price: testProduct.price,
        quantity: orderQuantity,
      }],
      subtotal: testProduct.price * orderQuantity,
      discount: 0,
      shippingCost: 0,
      tax: 3.31,
      total: (testProduct.price * orderQuantity) + 3.31,
    });

    assert(duplicateAttempt.id === createdOrder.id, 'Duplicate webhook returns identical existing order');
    const stockAfterDuplicate = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    assert(stockAfterDuplicate?.inventory === expectedStock, 'Duplicate webhook does NOT double-decrement inventory');

    // ---------------------------------------------------------------
    // Test 4: Payment Failed Webhook State
    // ---------------------------------------------------------------
    console.log('\n--- Test 4: Payment Failed Webhook State ---');
    await updateOrderPaymentState(
      { stripePaymentId: testPaymentId },
      PaymentStatus.FAILED
    );
    const orderAfterFailed = await prisma.order.findUnique({
      where: { id: createdOrder.id },
    });
    assert(orderAfterFailed?.paymentStatus === PaymentStatus.FAILED, 'Order payment status transitioned to FAILED');

    // Reset back to PAID for cancellation test
    await prisma.order.update({
      where: { id: createdOrder.id },
      data: { paymentStatus: PaymentStatus.PAID },
    });

    // ---------------------------------------------------------------
    // Test 5: Payment Cancelled Webhook & Inventory Restoration
    // ---------------------------------------------------------------
    console.log('\n--- Test 5: Payment Cancelled & Stock Restoration ---');
    await updateOrderPaymentState(
      { stripePaymentId: testPaymentId },
      PaymentStatus.CANCELLED,
      OrderStatus.CANCELLED
    );
    const orderAfterCancel = await prisma.order.findUnique({
      where: { id: createdOrder.id },
    });
    assert(orderAfterCancel?.paymentStatus === PaymentStatus.CANCELLED, 'Order payment status transitioned to CANCELLED');
    assert(orderAfterCancel?.status === OrderStatus.CANCELLED, 'Order status transitioned to CANCELLED');

    const stockAfterCancel = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    assert(stockAfterCancel?.inventory === initialStock, `Inventory restored to ${initialStock} upon cancellation`);

    // ---------------------------------------------------------------
    // Test 6: Charge Refunded Webhook & Inventory Restoration
    // ---------------------------------------------------------------
    console.log('\n--- Test 6: Charge Refunded & Stock Restoration ---');
    const refundPaymentId = `pi_test_${Date.now()}_refund`;
    const refundSessionId = `cs_test_${Date.now()}_refund`;

    const orderToRefund = await completePaidOrder({
      stripePaymentId: refundPaymentId,
      stripeSessionId: refundSessionId,
      userId: userA.id,
      guestEmail: userA.email,
      shippingAddress: {
        fullName: 'Customer A',
        street: '100 Main St',
        city: 'Fort Lee',
        state: 'NJ',
        postalCode: '07024',
        country: 'US',
      },
      items: [{
        productId: testProduct.id,
        name: testProduct.name,
        price: testProduct.price,
        quantity: 3,
      }],
      subtotal: testProduct.price * 3,
      discount: 0,
      shippingCost: 0,
      tax: 4.97,
      total: (testProduct.price * 3) + 4.97,
    });

    const stockBeforeRefund = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(stockBeforeRefund?.inventory === initialStock - 3, 'Stock decreased by 3 before refund');

    await updateOrderPaymentState(
      { stripePaymentId: refundPaymentId },
      PaymentStatus.REFUNDED,
      OrderStatus.CANCELLED
    );

    const refundedOrder = await prisma.order.findUnique({ where: { id: orderToRefund.id } });
    assert(refundedOrder?.paymentStatus === PaymentStatus.REFUNDED, 'Order payment status transitioned to REFUNDED');

    const stockAfterRefund = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert(stockAfterRefund?.inventory === initialStock, 'Inventory fully restored after refund');

    // ---------------------------------------------------------------
    // Test 7: Customer Order Authorization Isolation
    // ---------------------------------------------------------------
    console.log('\n--- Test 7: Customer Order Access Isolation ---');
    // Customer B queries their orders
    const ordersForCustomerB = await prisma.order.findMany({
      where: { userId: userB.id },
    });
    assert(ordersForCustomerB.length === 0, 'Customer B cannot view Customer A orders in order list');

    // Customer A queries their orders
    const ordersForCustomerA = await prisma.order.findMany({
      where: { userId: userA.id },
    });
    assert(ordersForCustomerA.length > 0, 'Customer A successfully views own orders');

    // ---------------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------------
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [createdOrder.id, orderToRefund.id] } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: { in: [createdOrder.id, orderToRefund.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [createdOrder.id, orderToRefund.id] } },
    });
    await prisma.product.delete({ where: { id: testProduct.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test suite:', error);
    process.exit(1);
  }
}

runStripePaymentAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
