import { prisma } from '../src/lib/prisma';
import { calculateOrderPricing, isPromotionActive } from '../src/lib/pricing-engine';

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

async function runPromotionsTestSuite() {
  console.log('====================================================');
  console.log('  COMPLETE PROMOTIONAL SYSTEM TEST SUITE');
  console.log('====================================================\n');

  try {
    // -------------------------------------------------------------
    // Setup Test Products & Category
    // -------------------------------------------------------------
    const testCategory = await prisma.category.upsert({
      where: { slug: 'promo-test-cat' },
      update: {},
      create: {
        name: 'Promo Test Category',
        slug: 'promo-test-cat',
        description: 'Test category for promotional rules',
      },
    });

    const shampoo = await prisma.product.create({
      data: {
        name: 'Premium Shampoo Test',
        slug: `premium-shampoo-${Date.now()}`,
        sku: `SKU-SHAMPOO-${Date.now()}`,
        description: 'Test nourishing shampoo formula',
        price: 20.00,
        inventory: 50,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    const conditioner = await prisma.product.create({
      data: {
        name: 'Hydrating Conditioner Test',
        slug: `conditioner-${Date.now()}`,
        sku: `SKU-COND-${Date.now()}`,
        description: 'Test hydrating daily conditioner',
        price: 15.00,
        inventory: 50,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    const hairMask = await prisma.product.create({
      data: {
        name: 'Deep Repair Hair Mask Test',
        slug: `hair-mask-${Date.now()}`,
        sku: `SKU-MASK-${Date.now()}`,
        description: 'Test intensive repair hair mask',
        price: 25.00,
        inventory: 50,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    const now = new Date();

    // -------------------------------------------------------------
    // TEST 1: Expired Promotion
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Expired Promotion (Rejected Server-Side & Restores Normal Pricing) ---');
    const expiredPromo = await prisma.promotion.create({
      data: {
        name: 'Expired 50% Off Flash Sale',
        type: 'PERCENTAGE',
        scope: 'PRODUCT',
        discountValue: 50,
        startDate: new Date(now.getTime() - 48 * 3600 * 1000), // 2 days ago
        endDate: new Date(now.getTime() - 24 * 3600 * 1000),   // 1 day ago (EXPIRED)
        isActive: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    assert(
      isPromotionActive(expiredPromo, now) === false,
      'isPromotionActive identifies promotion with past endDate as inactive'
    );

    const expiredPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }],
      null,
      { now }
    );

    assert(
      expiredPricing.itemBreakdowns[0].effectiveUnitPrice === 20.00,
      'Normal pricing strictly restored for expired promotion (Unit price is $20.00, not 50% off)',
      `Actual: $${expiredPricing.itemBreakdowns[0].effectiveUnitPrice}`
    );
    assert(
      expiredPricing.totalItemDiscount === 0,
      'Total item discount is $0 for expired promotion'
    );

    // -------------------------------------------------------------
    // TEST 2: Future / Scheduled Promotion
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Future / Scheduled Promotion (Not Yet Active) ---');
    const futurePromo = await prisma.promotion.create({
      data: {
        name: 'Future Holiday Sale 30% Off',
        type: 'PERCENTAGE',
        scope: 'PRODUCT',
        discountValue: 30,
        startDate: new Date(now.getTime() + 24 * 3600 * 1000), // starts in 1 day
        endDate: new Date(now.getTime() + 48 * 3600 * 1000),
        isActive: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    assert(
      isPromotionActive(futurePromo, now) === false,
      'isPromotionActive identifies future promotion (startDate > now) as inactive'
    );

    const futurePricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }],
      null,
      { now }
    );

    assert(
      futurePricing.itemBreakdowns[0].effectiveUnitPrice === 20.00,
      'Future promotion does not discount current prices'
    );

    // -------------------------------------------------------------
    // TEST 3: Active Promotions (Percentage, Fixed Amount, Sale Price)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Active Promotions (Percentage, Fixed Amount, Sale Price) ---');
    // Percentage 20% off shampoo ($20 -> $16)
    const activePercentPromo = await prisma.promotion.create({
      data: {
        name: 'Shampoo 20% Off',
        type: 'PERCENTAGE',
        scope: 'PRODUCT',
        discountValue: 20,
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    const activePercentPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }],
      null,
      { now }
    );

    assert(
      activePercentPricing.itemBreakdowns[0].effectiveUnitPrice === 16.00,
      '20% off active promotion correctly reduces unit price from $20.00 to $16.00',
      `Actual: $${activePercentPricing.itemBreakdowns[0].effectiveUnitPrice}`
    );
    assert(
      activePercentPricing.totalSavings === 4.00,
      'Total savings equals $4.00 for 1 unit'
    );

    // Fixed amount $5 off conditioner ($15 -> $10)
    const activeFixedPromo = await prisma.promotion.create({
      data: {
        name: 'Conditioner $5 Off',
        type: 'FIXED_AMOUNT',
        scope: 'PRODUCT',
        discountValue: 5.00,
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
        products: { connect: [{ id: conditioner.id }] },
      },
    });

    const activeFixedPricing = await calculateOrderPricing(
      [{ productId: conditioner.id, quantity: 2 }],
      null,
      { now }
    );

    assert(
      activeFixedPricing.itemBreakdowns[0].effectiveUnitPrice === 10.00,
      'Fixed amount $5 off correctly reduces unit price from $15.00 to $10.00'
    );
    assert(
      activeFixedPricing.totalItemDiscount === 10.00,
      'Fixed amount discounts $10.00 total across 2 units ($5 x 2)'
    );

    // Clean up temporary promo for shampoo before tiered test
    await prisma.promotion.delete({ where: { id: activePercentPromo.id } });

    // -------------------------------------------------------------
    // TEST 4: Volume / Tiered Promotion (Buy 2 Save 10%, Buy 3 Save 15%)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Volume / Tiered Promotion (Buy 2 Save 10%, Buy 3 Save 15%) ---');
    const tieredPromo = await prisma.promotion.create({
      data: {
        name: 'Shampoo Volume Discount',
        type: 'TIERED_VOLUME',
        scope: 'PRODUCT',
        tieredRules: [
          { minQty: 2, discountPercent: 10 },
          { minQty: 3, discountPercent: 15 },
        ],
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    // Quantity = 1: No tier met (0% discount -> $20.00 each)
    const tier1Pricing = await calculateOrderPricing([{ productId: shampoo.id, quantity: 1 }], null, { now });
    assert(
      tier1Pricing.itemBreakdowns[0].lineDiscount === 0 && tier1Pricing.itemBreakdowns[0].lineTotal === 20.00,
      'Quantity 1 does not qualify for tiered volume discount (Line total = $20.00)'
    );

    // Quantity = 2: Tier 1 met (10% discount -> $20 x 2 = $40 - $4 = $36.00)
    const tier2Pricing = await calculateOrderPricing([{ productId: shampoo.id, quantity: 2 }], null, { now });
    assert(
      tier2Pricing.itemBreakdowns[0].lineDiscount === 4.00 && tier2Pricing.itemBreakdowns[0].lineTotal === 36.00,
      'Quantity 2 triggers "Buy 2 Save 10%" (Line total = $36.00, Save $4.00)',
      `Actual total: $${tier2Pricing.itemBreakdowns[0].lineTotal}`
    );

    // Quantity = 3: Tier 2 met (15% discount -> $20 x 3 = $60 - $9 = $51.00)
    const tier3Pricing = await calculateOrderPricing([{ productId: shampoo.id, quantity: 3 }], null, { now });
    assert(
      tier3Pricing.itemBreakdowns[0].lineDiscount === 9.00 && tier3Pricing.itemBreakdowns[0].lineTotal === 51.00,
      'Quantity 3 triggers "Buy 3 Save 15%" (Line total = $51.00, Save $9.00)',
      `Actual total: $${tier3Pricing.itemBreakdowns[0].lineTotal}`
    );

    // Quantity = 4: Still Tier 2 (15% discount -> $20 x 4 = $80 - $12 = $68.00)
    const tier4Pricing = await calculateOrderPricing([{ productId: shampoo.id, quantity: 4 }], null, { now });
    assert(
      tier4Pricing.itemBreakdowns[0].lineDiscount === 12.00 && tier4Pricing.itemBreakdowns[0].lineTotal === 68.00,
      'Quantity 4 maintains highest qualifying Tier (15% off = $68.00 total)'
    );

    await prisma.promotion.delete({ where: { id: tieredPromo.id } });

    // -------------------------------------------------------------
    // TEST 5: Buy X Get Y Promotion (Buy 2 Get 1 Free)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Buy X Get Y Promotion (Buy 2 Get 1 Free) ---');
    const bogoPromo = await prisma.promotion.create({
      data: {
        name: 'Hair Mask BOGO (Buy 2 Get 1 Free)',
        type: 'BUY_X_GET_Y',
        scope: 'PRODUCT',
        buyQuantity: 2,
        getQuantity: 1,
        getDiscountPercent: 100, // 100% off (Free)
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
        products: { connect: [{ id: hairMask.id }] },
      },
    });

    // 3 Hair Masks ($25 each): Customer pays for 2 ($50), 3rd is Free ($25 discount)
    const bogoPricing = await calculateOrderPricing(
      [{ productId: hairMask.id, quantity: 3 }],
      null,
      { now }
    );

    assert(
      bogoPricing.itemBreakdowns[0].lineDiscount === 25.00,
      'Buy 2 Get 1 Free discounts exactly 1 full item ($25.00 discount on 3 items)',
      `Actual discount: $${bogoPricing.itemBreakdowns[0].lineDiscount}`
    );
    assert(
      bogoPricing.itemBreakdowns[0].lineTotal === 50.00,
      'Line total for 3 items with Buy 2 Get 1 Free equals price of 2 items ($50.00)',
      `Actual total: $${bogoPricing.itemBreakdowns[0].lineTotal}`
    );

    await prisma.promotion.delete({ where: { id: bogoPromo.id } });

    // -------------------------------------------------------------
    // TEST 6: Bundle Promotion (Product A + Product B)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Bundle Promotion (Shampoo + Conditioner Bundle $5 Off) ---');
    const bundlePromo = await prisma.promotion.create({
      data: {
        name: 'Shampoo + Conditioner Routine Bundle',
        type: 'BUNDLE',
        scope: 'BUNDLE',
        discountValue: 5.00,
        bundleProductIds: [shampoo.id, conditioner.id],
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
      },
    });

    // Incomplete bundle (only shampoo in cart)
    const incompleteBundle = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }],
      null,
      { now }
    );
    assert(
      incompleteBundle.totalSavings === 0,
      'Bundle discount is NOT applied when bundle items are incomplete'
    );

    // Complete bundle (both shampoo and conditioner in cart)
    const completeBundle = await calculateOrderPricing(
      [
        { productId: shampoo.id, quantity: 1 },
        { productId: conditioner.id, quantity: 1 },
      ],
      null,
      { now }
    );
    assert(
      completeBundle.totalSavings === 5.00,
      'Bundle discount is successfully applied when all required bundle products are present',
      `Actual savings: $${completeBundle.totalSavings}`
    );

    await prisma.promotion.delete({ where: { id: bundlePromo.id } });

    // -------------------------------------------------------------
    // TEST 7: Free Shipping Promotion
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Free Shipping Promotion ---');
    // Without promo, an order under $50 incurs standard $4.99 shipping
    const standardShippingPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }], // $20 subtotal
      null,
      { now }
    );
    assert(
      standardShippingPricing.shippingCost === 4.99 && standardShippingPricing.isFreeShipping === false,
      'Order under $50 incurs standard $4.99 shipping by default'
    );

    // Create Free Shipping promotion
    const freeShippingPromo = await prisma.promotion.create({
      data: {
        name: 'Sitewide Free Shipping Weekend',
        type: 'FREE_SHIPPING',
        scope: 'ALL_PRODUCTS',
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
      },
    });

    const freeShippingPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }], // $20 subtotal
      null,
      { now }
    );
    assert(
      freeShippingPricing.shippingCost === 0 && freeShippingPricing.isFreeShipping === true,
      'Free shipping promotion successfully overrides shipping cost to $0.00',
      `Actual shipping cost: $${freeShippingPricing.shippingCost}`
    );

    await prisma.promotion.delete({ where: { id: freeShippingPromo.id } });

    // -------------------------------------------------------------
    // TEST 8: Multiple Promotions & Coupon Stacking
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Multiple Promotions & Stacking ---');
    // Product 10% off
    const productPromo = await prisma.promotion.create({
      data: {
        name: 'Shampoo 10% Off',
        type: 'PERCENTAGE',
        scope: 'PRODUCT',
        discountValue: 10,
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    // Order-level coupon: EXTRA10 ($10 off min $30)
    const couponPromo = await prisma.promotion.create({
      data: {
        name: 'Extra $10 Off Coupon',
        type: 'FIXED_AMOUNT',
        scope: 'ALL_PRODUCTS',
        couponCode: 'EXTRA10',
        discountValue: 10.00,
        minOrderSubtotal: 30.00,
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
      },
    });

    // 2 Shampoos = $40 original -> 10% product discount = $36 -> Coupon EXTRA10 = $26 subtotal
    const multiPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 2 }],
      'EXTRA10',
      { now }
    );

    assert(
      multiPricing.totalItemDiscount === 4.00,
      'Product-level 10% discount applied ($4.00 off 2 units)'
    );
    assert(
      multiPricing.orderDiscount === 10.00,
      'Order-level coupon EXTRA10 stacked successfully ($10.00 off)'
    );
    assert(
      multiPricing.totalSavings === 14.00,
      'Total combined promotional savings equals $14.00 ($4 + $10)',
      `Actual savings: $${multiPricing.totalSavings}`
    );

    // -------------------------------------------------------------
    // TEST 9: Invalid & Non-Existent Coupon Codes
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Invalid Promotion Handling ---');
    const invalidPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }],
      'NON_EXISTENT_PROMO_CODE',
      { now }
    );
    assert(
      Boolean(invalidPricing.coupon && invalidPricing.coupon.valid === false),
      'Non-existent coupon code is rejected with valid: false'
    );
    assert(
      invalidPricing.orderDiscount === 0,
      'Rejected coupon contributes $0 discount'
    );

    // Coupon min subtotal requirement not met
    const subtotalFailPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }], // $20 ($18 after promo) < $30 min required
      'EXTRA10',
      { now }
    );
    assert(
      subtotalFailPricing.coupon?.valid === false,
      'Coupon rejected when cart subtotal is below minOrderSubtotal requirement'
    );

    await prisma.promotion.delete({ where: { id: couponPromo.id } });
    await prisma.promotion.delete({ where: { id: productPromo.id } });

    // -------------------------------------------------------------
    // TEST 10: Flash Sale & Maximum Quantity Cap (Inventory Limit)
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Flash Sale & Maximum Quantity Cap ---');
    const flashPromo = await prisma.promotion.create({
      data: {
        name: 'Flash Sale Max 2 Units',
        type: 'FLASH_SALE',
        scope: 'PRODUCT',
        discountValue: 50, // 50% off ($10 instead of $20)
        maxQuantity: 2,     // Cap at 2 units
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() + 3600 * 1000),
        isActive: true,
        isFlashSale: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    // Customer requests 4 units. Cap is 2 units at 50% off ($10), remaining 2 units at full price ($20).
    // Total line = (2 * $10) + (2 * $20) = $60. (Original $80 - $20 discount = $60).
    const flashCapPricing = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 4 }],
      null,
      { now }
    );

    assert(
      flashCapPricing.itemBreakdowns[0].lineDiscount === 20.00,
      'Flash sale 50% discount strictly capped to maxQuantity (2 units x $10 = $20 discount)',
      `Actual discount: $${flashCapPricing.itemBreakdowns[0].lineDiscount}`
    );
    assert(
      flashCapPricing.itemBreakdowns[0].lineTotal === 60.00,
      'Line total accurately charges full regular price for units beyond flash quota ($60.00 total)',
      `Actual total: $${flashCapPricing.itemBreakdowns[0].lineTotal}`
    );

    await prisma.promotion.delete({ where: { id: flashPromo.id } });

    // -------------------------------------------------------------
    // TEST 11: Flash Sale Expiration During Checkout
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Flash Sale Expiration During Checkout ---');
    // Imagine flash sale expired 1 second ago
    const expiredFlash = await prisma.promotion.create({
      data: {
        name: 'Ending Flash Sale',
        type: 'FLASH_SALE',
        scope: 'PRODUCT',
        discountValue: 30,
        startDate: new Date(now.getTime() - 3600 * 1000),
        endDate: new Date(now.getTime() - 1000), // Expired 1 second ago
        isActive: true,
        products: { connect: [{ id: shampoo.id }] },
      },
    });

    const checkoutAtExpiration = await calculateOrderPricing(
      [{ productId: shampoo.id, quantity: 1 }],
      null,
      { now }
    );

    assert(
      checkoutAtExpiration.itemBreakdowns[0].effectiveUnitPrice === 20.00,
      'Server-side calculation immediately rejects expired flash sale during checkout calculation',
      `Unit price: $${checkoutAtExpiration.itemBreakdowns[0].effectiveUnitPrice}`
    );

    await prisma.promotion.delete({ where: { id: expiredFlash.id } });

    // -------------------------------------------------------------
    // TEST 12: Smart Related Products Rules
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Smart Related Products Configurable Rules ---');
    // Admin configures manual cross-sell relations: Shampoo -> Conditioner, Hair Mask
    await prisma.productRelation.create({
      data: {
        productId: shampoo.id,
        relatedId: conditioner.id,
        relationship: 'RELATED',
        sortOrder: 0,
      },
    });
    await prisma.productRelation.create({
      data: {
        productId: shampoo.id,
        relatedId: hairMask.id,
        relationship: 'RELATED',
        sortOrder: 1,
      },
    });

    const configuredRelations = await prisma.productRelation.findMany({
      where: { productId: shampoo.id },
      orderBy: { sortOrder: 'asc' },
    });

    assert(
      configuredRelations.length === 2,
      'Admin successfully configured 2 smart related cross-sell products'
    );
    assert(
      configuredRelations[0].relatedId === conditioner.id && configuredRelations[1].relatedId === hairMask.id,
      'Smart related products maintain exact configured admin sortOrder (Conditioner first, Hair Mask second)'
    );

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    await prisma.productRelation.deleteMany({ where: { productId: shampoo.id } });
    if (activeFixedPromo) await prisma.promotion.delete({ where: { id: activeFixedPromo.id } });
    if (expiredPromo) await prisma.promotion.delete({ where: { id: expiredPromo.id } });
    if (futurePromo) await prisma.promotion.delete({ where: { id: futurePromo.id } });
    await prisma.product.deleteMany({
      where: { id: { in: [shampoo.id, conditioner.id, hairMask.id] } },
    });

    console.log('\n====================================================');
    console.log(`PROMOTIONAL TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPromotionsTestSuite();
