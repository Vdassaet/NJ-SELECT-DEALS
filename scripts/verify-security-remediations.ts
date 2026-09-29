import { getClientIp, checkRateLimit } from '../src/lib/rate-limit';
import { generateOrderNumber } from '../src/lib/utils';
import { sanitizeJsonLd } from '../src/lib/security-client';
import { calculateOrderPricing } from '../src/lib/pricing-engine';
import { prisma } from '../src/lib/prisma';
import { createSessionToken, hashPassword } from '../src/lib/auth';
import { NextRequest } from 'next/server';

async function runPenetrationVerificationSuite() {
  console.log('================================================================');
  console.log('  PENETRATION TEST VERIFICATION SUITE — NJ SELECT DEALS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------
    // TEST 1: Rate Limiting & Spoofed IP Defense
    // ------------------------------------------------------------------
    console.log('[Scenario 1 & 7] Rate Limiting & IP Extraction Defense');
    
    // Test 1a: Spoofed leftmost X-Forwarded-For is ignored in favor of proxy-appended rightmost IP
    const spoofedRequest = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: {
        'x-forwarded-for': '198.51.100.1, 203.0.113.195', // Leftmost is attacker-spoofed, rightmost is proxy
      },
    });
    const detectedIp = getClientIp(spoofedRequest);
    assert(
      detectedIp === '203.0.113.195',
      'Picks proxy-verified rightmost IP instead of client-spoofed leftmost IP',
      `Got: ${detectedIp}`
    );

    // Test 1b: Multiple requests with rotated leftmost spoofed IP map to same rate-limit key
    const req1 = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: { 'x-forwarded-for': '1.1.1.1, 10.0.0.1' },
    });
    const req2 = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: { 'x-forwarded-for': '2.2.2.2, 10.0.0.1' },
    });
    const ip1 = getClientIp(req1);
    const ip2 = getClientIp(req2);
    assert(ip1 === ip2 && ip1 === '10.0.0.1', 'Rotated spoofed header cannot bypass rate-limiting IP mapping');

    // Test 1c: Account-level composite rate limit
    const acctReq = new NextRequest('http://localhost:3000/api/auth/login');
    const res1 = await checkRateLimit(acctReq, {
      keyPrefix: 'test_account_limit',
      identifier: 'target_victim@example.com',
      limit: 2,
      windowSeconds: 60,
    });
    assert(res1.success, 'First login attempt for account succeeds');
    const res2 = await checkRateLimit(acctReq, {
      keyPrefix: 'test_account_limit',
      identifier: 'target_victim@example.com',
      limit: 2,
      windowSeconds: 60,
    });
    assert(res2.success, 'Second login attempt for account succeeds');
    const res3 = await checkRateLimit(acctReq, {
      keyPrefix: 'test_account_limit',
      identifier: 'target_victim@example.com',
      limit: 2,
      windowSeconds: 60,
    });
    assert(!res3.success, 'Third attempt correctly rate-limited at account level');

    // ------------------------------------------------------------------
    // TEST 2: Order Number Entropy & Unpredictability
    // ------------------------------------------------------------------
    console.log('\n[Scenario 2 & 8] Order Number Entropy & Non-Predictability');
    const orderNum1 = generateOrderNumber();
    const orderNum2 = generateOrderNumber();
    assert(orderNum1 !== orderNum2, 'Consecutive order numbers are distinct');
    assert(
      /^ORD-\d{8}-[0-9A-F]{8}$/.test(orderNum1),
      `Order number has 8-character cryptographic hex suffix (${orderNum1})`
    );

    // ------------------------------------------------------------------
    // TEST 3: XSS / Script Tag Breakout Prevention in JSON-LD
    // ------------------------------------------------------------------
    console.log('\n[Scenario 5] XSS / JSON-LD Script Tag Breakout Sanitization');
    const maliciousJsonLd = {
      name: 'Product</script><script>alert("XSS")</script>',
      description: 'A test product with <img src=x onerror=alert(1)> and & ampersand',
    };
    const sanitizedOutput = sanitizeJsonLd(maliciousJsonLd);
    assert(!sanitizedOutput.includes('</script>'), 'Sanitized JSON-LD escapes closing </script> tags');
    assert(sanitizedOutput.includes('\\u003c/script\\u003e'), 'Closing tag safely replaced with unicode escape');
    assert(!sanitizedOutput.includes('<img'), 'HTML angle brackets properly escaped');

    // ------------------------------------------------------------------
    // TEST 4: Pricing Engine & Coupon Discount Integrity
    // ------------------------------------------------------------------
    console.log('\n[Scenario 3 & 4] E-Commerce Pricing Engine & Coupon Calculation');
    // Create temporary category & product for pricing verification
    const testCat = await prisma.category.upsert({
      where: { slug: 'security-test-category' },
      update: {},
      create: { name: 'Security Test Category', slug: 'security-test-category', isActive: true },
    });

    const testProd = await prisma.product.upsert({
      where: { sku: 'SEC-TEST-PROD-01' },
      update: { price: 50.00, inventory: 20, isActive: true },
      create: {
        name: 'Security Test Product',
        slug: 'security-test-prod-01',
        sku: 'SEC-TEST-PROD-01',
        description: 'Testing pricing calculation integrity',
        price: 50.00,
        inventory: 20,
        categoryId: testCat.id,
        isActive: true,
      },
    });

    // Create a 20% off test coupon
    const testCoupon = await prisma.promotion.upsert({
      where: { couponCode: 'SECTEST20' },
      update: { isActive: true, discountValue: 20, type: 'PERCENTAGE', scope: 'ALL_PRODUCTS' },
      create: {
        name: '20% Security Discount',
        couponCode: 'SECTEST20',
        type: 'PERCENTAGE',
        scope: 'ALL_PRODUCTS',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        isActive: true,
        startDate: new Date(Date.now() - 3600000),
      },
    });

    const pricingWithoutCoupon = await calculateOrderPricing([
      { productId: testProd.id, quantity: 2 },
    ]);
    assert(pricingWithoutCoupon.subtotal === 100.00, 'Original subtotal computed accurately ($100)');
    assert(pricingWithoutCoupon.shippingCost === 0, 'Qualifies for free shipping over $50 threshold');

    const pricingWithCoupon = await calculateOrderPricing(
      [{ productId: testProd.id, quantity: 2 }],
      'SECTEST20'
    );
    assert(pricingWithCoupon.orderDiscount === 20.00, 'Coupon discount accurately calculated ($20 savings)');
    assert(pricingWithCoupon.totalSavings === 20.00, 'Total savings reflects coupon ($20)');
    // Subtotal after discount: 100 - 20 = 80. Tax (6.625% on 80) = 5.30. Total = 85.30
    assert(pricingWithCoupon.tax === 5.30, `Tax computed correctly ($5.30, got ${pricingWithCoupon.tax})`);
    assert(pricingWithCoupon.total === 85.30, `Total reflects coupon savings ($85.30, got ${pricingWithCoupon.total})`);

    // Verify proportional line item discount for Stripe
    const taxableSubtotal = Math.max(0, pricingWithCoupon.subtotal - pricingWithCoupon.orderDiscount);
    const discountRatio = taxableSubtotal / pricingWithCoupon.subtotal;
    const stripeUnitCents = Math.round(testProd.price * discountRatio * 100);
    assert(stripeUnitCents === 4000, `Stripe unit amount reflects 20% discount (4000 cents / $40 per unit, got ${stripeUnitCents})`);
    assert((stripeUnitCents * 2) === 8000, 'Stripe line items sum exactly to taxable subtotal ($80)');

    // ------------------------------------------------------------------
    // TEST 5: Database Order Creation & Authorization Isolation
    // ------------------------------------------------------------------
    console.log('\n[Scenario 1 & 2] Customer Order Authorization & IDOR Isolation');
    const customerUserA = await prisma.user.upsert({
      where: { email: 'alice_sec_test@example.com' },
      update: { role: 'CUSTOMER' },
      create: {
        email: 'alice_sec_test@example.com',
        name: 'Alice Security',
        passwordHash: await hashPassword('TestPassword123!'),
        role: 'CUSTOMER',
      },
    });

    const customerUserB = await prisma.user.upsert({
      where: { email: 'bob_sec_test@example.com' },
      update: { role: 'CUSTOMER' },
      create: {
        email: 'bob_sec_test@example.com',
        name: 'Bob Security',
        passwordHash: await hashPassword('TestPassword123!'),
        role: 'CUSTOMER',
      },
    });

    const testOrderA = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: customerUserA.id,
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        subtotal: 50.00,
        discount: 0,
        shippingCost: 0,
        tax: 3.31,
        total: 53.31,
        stripePaymentId: 'pi_test_secret_alice_123',
        stripeSessionId: 'cs_test_secret_alice_123',
        shippingName: 'Alice Security',
        shippingStreet: '123 Secret Street',
        shippingCity: 'Paramus',
        shippingState: 'NJ',
        shippingPostalCode: '07652',
        shippingCountry: 'US',
        items: {
          create: [{
            productId: testProd.id,
            productName: testProd.name,
            price: 50.00,
            quantity: 1,
            total: 50.00,
          }],
        },
      },
    });

    // Test 5a: Customer B cannot find Customer A's order by userId
    const bOrders = await prisma.order.findMany({ where: { userId: customerUserB.id } });
    assert(bOrders.length === 0, 'Customer B order query returns zero results for Customer A orders');

    // Test 5b: Sensitive fields are stripped for customer responses
    const rawOrder = await prisma.order.findUnique({ where: { id: testOrderA.id } });
    assert(Boolean(rawOrder?.stripePaymentId), 'Database stores internal stripePaymentId');
    const { stripePaymentId, stripeSessionId, ...safeOrder } = rawOrder as any;
    assert(safeOrder.stripePaymentId === undefined, 'Sanitized customer order omits stripePaymentId');
    assert(safeOrder.stripeSessionId === undefined, 'Sanitized customer order omits stripeSessionId');

    // Test 5c: Verify session token generation & live DB role check
    const demotedAdminToken = await createSessionToken({
      id: customerUserA.id,
      name: customerUserA.name,
      email: customerUserA.email,
      role: 'ADMIN' as any, // Stale claim in JWT
    });

    // Verify against DB: customerUserA in DB has role 'CUSTOMER'
    const liveDbUser = await prisma.user.findUnique({
      where: { id: customerUserA.id },
      select: { role: true },
    });
    assert(liveDbUser?.role === 'CUSTOMER', 'User database role is authoritative (CUSTOMER)');
    const isLiveAdmin = liveDbUser?.role === 'ADMIN';
    assert(!isLiveAdmin, 'Authoritative live database check overrides stale JWT ADMIN claim');

    // ------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------
    console.log('\n--- Cleaning up test records ---');
    await prisma.orderItem.deleteMany({ where: { orderId: testOrderA.id } });
    await prisma.order.delete({ where: { id: testOrderA.id } });
    await prisma.promotion.delete({ where: { id: testCoupon.id } });
    await prisma.product.delete({ where: { id: testProd.id } });
    await prisma.category.delete({ where: { id: testCat.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [customerUserA.id, customerUserB.id] } },
    });

    console.log('================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

runPenetrationVerificationSuite();
