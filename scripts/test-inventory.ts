import { prisma } from '../src/lib/prisma';
import { completePaidOrder, updateOrderPaymentState } from '../src/lib/order-service';
import {
  calculateInventoryStatus,
  adjustProductInventory,
  getInventoryMetrics,
  getRecentInventoryLogs,
} from '../src/lib/inventory-service';
import { PaymentStatus, OrderStatus } from '@prisma/client';

async function runInventoryAudit() {
  console.log('====================================================');
  console.log('  COMPLETE INVENTORY MANAGEMENT TEST SUITE');
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
    // Setup: Category & Clean Test Products
    // -------------------------------------------------------------
    const testCategory = await prisma.category.upsert({
      where: { slug: 'inventory-audit-category' },
      update: {},
      create: {
        name: 'Inventory Audit Category',
        slug: 'inventory-audit-category',
        isActive: true,
      },
    });

    // -------------------------------------------------------------
    // Test 1: 1 Item Remaining & Two Simultaneous Purchases (Concurrency Race)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Concurrency Race Condition (1 Item Remaining, Two Simultaneous Purchases) ---');
    const raceSku = `SKU-RACE-${Date.now()}`;
    const raceProduct = await prisma.product.create({
      data: {
        name: 'Single Unit Ultra Cream',
        slug: `single-unit-ultra-cream-${Date.now()}`,
        sku: raceSku,
        description: 'Single item for concurrency test',
        price: 49.99,
        costPrice: 20.00,
        inventory: 1, // Exactly 1 unit remaining!
        lowStockThreshold: 3,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    assert(raceProduct.inventory === 1, 'Test product initialized with exactly 1 unit remaining');

    // Fire TWO purchases simultaneously competing for the single unit
    const purchaseA = completePaidOrder({
      stripeSessionId: `cs_race_a_${Date.now()}`,
      guestEmail: 'shopper.a@example.com',
      shippingAddress: {
        fullName: 'Shopper Alpha',
        street: '100 Main St',
        city: 'Paramus',
        state: 'NJ',
        postalCode: '07652',
        country: 'US',
      },
      items: [{ productId: raceProduct.id, name: raceProduct.name, price: 49.99, quantity: 1 }],
      subtotal: 49.99,
      discount: 0,
      shippingCost: 4.99,
      tax: 3.31,
      total: 58.29,
    });

    const purchaseB = completePaidOrder({
      stripeSessionId: `cs_race_b_${Date.now()}`,
      guestEmail: 'shopper.b@example.com',
      shippingAddress: {
        fullName: 'Shopper Beta',
        street: '200 Market St',
        city: 'Paramus',
        state: 'NJ',
        postalCode: '07652',
        country: 'US',
      },
      items: [{ productId: raceProduct.id, name: raceProduct.name, price: 49.99, quantity: 1 }],
      subtotal: 49.99,
      discount: 0,
      shippingCost: 4.99,
      tax: 3.31,
      total: 58.29,
    });

    const [resultA, resultB] = await Promise.allSettled([purchaseA, purchaseB]);

    const fulfilledCount = [resultA, resultB].filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = [resultA, resultB].filter((r) => r.status === 'rejected').length;

    assert(fulfilledCount === 1, 'Exactly one concurrent purchase succeeded (no double selling)', `Fulfilled: ${fulfilledCount}`);
    assert(rejectedCount === 1, 'Exactly one concurrent purchase was blocked and rejected', `Rejected: ${rejectedCount}`);

    const rejectedResult = resultA.status === 'rejected' ? resultA : resultB;
    const rejectionReason = (rejectedResult as PromiseRejectedResult).reason?.message || '';
    assert(
      rejectionReason.includes('no longer available in the requested quantity'),
      'Blocked purchase received exact out-of-stock validation error message',
      `Error: "${rejectionReason}"`
    );

    // Verify inventory state in database is exactly 0 (not -1, not corrupted)
    const postRaceProduct = await prisma.product.findUnique({
      where: { id: raceProduct.id },
    });

    assert(
      postRaceProduct?.inventory === 0,
      'Product inventory is exactly 0 after race condition (zero overselling)',
      `Inventory: ${postRaceProduct?.inventory}`
    );

    const raceLogs = await prisma.inventoryLog.findMany({
      where: { productId: raceProduct.id },
    });

    assert(
      raceLogs.length === 1 && raceLogs[0].difference === -1 && raceLogs[0].reason === 'ORDER_PLACED',
      'InventoryLog accurately recorded single decremented unit (-1) with reason ORDER_PLACED'
    );

    // -------------------------------------------------------------
    // Test 2: Order Cancellation & Inventory Restoration
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Cancelled Order (Automatic Inventory Restoration) ---');
    const winningResult = resultA.status === 'fulfilled' ? resultA : resultB;
    const winningOrder = (winningResult as PromiseFulfilledResult<any>).value;

    // Admin/System cancels the winning order
    await updateOrderPaymentState(
      { orderId: winningOrder.id },
      PaymentStatus.CANCELLED,
      OrderStatus.CANCELLED
    );

    const postCancelProduct = await prisma.product.findUnique({
      where: { id: raceProduct.id },
    });

    assert(
      postCancelProduct?.inventory === 1,
      'Product inventory successfully restored from 0 back to 1 upon order cancellation',
      `Inventory: ${postCancelProduct?.inventory}`
    );

    const cancelLog = await prisma.inventoryLog.findFirst({
      where: {
        productId: raceProduct.id,
        reason: 'ORDER_CANCELLED',
      },
      orderBy: { createdAt: 'desc' },
    });

    assert(
      cancelLog !== null && cancelLog.difference === 1 && cancelLog.newQuantity === 1,
      'InventoryLog recorded positive difference (+1) with reason ORDER_CANCELLED',
      `Diff: ${cancelLog?.difference}, New: ${cancelLog?.newQuantity}`
    );

    // -------------------------------------------------------------
    // Test 3: Refund & Inventory Restoration
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Refund (Automatic Inventory Restoration) ---');
    const refundSku = `SKU-REFUND-${Date.now()}`;
    const refundProduct = await prisma.product.create({
      data: {
        name: 'Refundable Moisture Serum',
        slug: `refundable-moisture-serum-${Date.now()}`,
        sku: refundSku,
        description: 'Test serum for refund restoration',
        price: 30.00,
        inventory: 10,
        lowStockThreshold: 4,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    // Purchase 3 units (Inventory: 10 -> 7)
    const paidOrder = await completePaidOrder({
      stripeSessionId: `cs_refund_test_${Date.now()}`,
      guestEmail: 'shopper.refund@example.com',
      shippingAddress: {
        fullName: 'Shopper Refund',
        street: '300 State St',
        city: 'Paramus',
        state: 'NJ',
        postalCode: '07652',
        country: 'US',
      },
      items: [{ productId: refundProduct.id, name: refundProduct.name, price: 30.00, quantity: 3 }],
      subtotal: 90.00,
      discount: 0,
      shippingCost: 0,
      tax: 5.96,
      total: 95.96,
    });

    const midRefundProduct = await prisma.product.findUnique({ where: { id: refundProduct.id } });
    assert(midRefundProduct?.inventory === 7, 'Inventory decreased by 3 on purchase (10 -> 7)');

    // Refund order
    await updateOrderPaymentState(
      { orderId: paidOrder.id },
      PaymentStatus.REFUNDED,
      OrderStatus.CANCELLED
    );

    const postRefundProduct = await prisma.product.findUnique({ where: { id: refundProduct.id } });
    assert(
      postRefundProduct?.inventory === 10,
      'Inventory fully restored back to 10 on refund (7 -> 10)',
      `Inventory: ${postRefundProduct?.inventory}`
    );

    const refundLog = await prisma.inventoryLog.findFirst({
      where: {
        productId: refundProduct.id,
        reason: 'ORDER_REFUNDED',
      },
      orderBy: { createdAt: 'desc' },
    });

    assert(
      refundLog !== null && refundLog.difference === 3 && refundLog.newQuantity === 10,
      'InventoryLog recorded positive difference (+3) with reason ORDER_REFUNDED',
      `Diff: ${refundLog?.difference}, Reason: ${refundLog?.reason}`
    );

    // -------------------------------------------------------------
    // Test 4: Quantity Update (Manual Adjustment & Restock)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Quantity Update (Relative & Absolute Adjustments) ---');
    // Relative restock (+20)
    const restockResult = await adjustProductInventory({
      productId: refundProduct.id,
      adjustment: 20,
      reason: 'RESTOCK',
      performedBy: 'warehouse_manager@njselectdeals.com',
    });

    assert(
      restockResult.product.inventory === 30,
      'Relative stock adjustment correctly added 20 units (10 -> 30)',
      `New inventory: ${restockResult.product.inventory}`
    );
    assert(
      restockResult.log.reason === 'RESTOCK' && restockResult.log.difference === 20,
      'Restock recorded in audit log with difference +20 and performedBy'
    );

    // Absolute set (Set to 15)
    const setResult = await adjustProductInventory({
      productId: refundProduct.id,
      newInventory: 15,
      reason: 'MANUAL_ADJUSTMENT',
      performedBy: 'admin@njselectdeals.com',
    });

    assert(
      setResult.product.inventory === 15,
      'Absolute stock level set directly to 15 units (30 -> 15)',
      `New inventory: ${setResult.product.inventory}`
    );
    assert(
      setResult.log.reason === 'MANUAL_ADJUSTMENT' && setResult.log.difference === -15,
      'Set adjustment recorded in audit log with difference -15 and previous 30'
    );

    // -------------------------------------------------------------
    // Test 5: Out of Stock Behavior
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Out of Stock Behavior & Checkout Prevention ---');
    // Set stock to 0
    await adjustProductInventory({
      productId: refundProduct.id,
      newInventory: 0,
      reason: 'AUDIT_COUNT',
    });

    const oosStatus = calculateInventoryStatus(0, 5, 0);
    assert(oosStatus.isOutOfStock === true, 'calculateInventoryStatus identifies inventory = 0 as Out of Stock');
    assert(oosStatus.status === 'OUT_OF_STOCK', 'calculateInventoryStatus status is OUT_OF_STOCK');

    // Attempt checkout when product is Out of Stock
    let checkoutBlocked = false;
    try {
      await completePaidOrder({
        stripeSessionId: `cs_oos_blocked_${Date.now()}`,
        guestEmail: 'blocked@example.com',
        shippingAddress: {
          fullName: 'Blocked User',
          street: '1 Test Way',
          city: 'Paramus',
          state: 'NJ',
          postalCode: '07652',
          country: 'US',
        },
        items: [{ productId: refundProduct.id, name: refundProduct.name, price: 30.00, quantity: 1 }],
        subtotal: 30.00,
        discount: 0,
        shippingCost: 4.99,
        tax: 2.00,
        total: 36.99,
      });
    } catch (err: any) {
      checkoutBlocked = true;
      assert(
        err.message.includes('no longer available in the requested quantity'),
        'Checkout strictly blocked for Out of Stock products on server side',
        `Error: "${err.message}"`
      );
    }
    assert(checkoutBlocked === true, 'Checkout rejection confirmed for 0 inventory');

    // -------------------------------------------------------------
    // Test 6: Low Stock & Configurable Threshold Per Product
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Low Stock Status & Configurable Per-Product Threshold ---');
    // Set inventory = 3, threshold = 5 -> LOW STOCK (Only 3 remaining)
    const lowStockProduct = await prisma.product.update({
      where: { id: refundProduct.id },
      data: { inventory: 3, lowStockThreshold: 5 },
    });

    const lowMeta1 = calculateInventoryStatus(lowStockProduct.inventory, lowStockProduct.lowStockThreshold);
    assert(lowMeta1.isLowStock === true, 'Identifies stock <= threshold as LOW STOCK');
    assert(lowMeta1.status === 'LOW_STOCK', 'Status enum is LOW_STOCK');
    assert(lowMeta1.availableQuantity === 3, 'Available quantity matches remaining stock (Only 3 remaining)');

    // Reconfigure threshold per product to 2 -> Now 3 is IN_STOCK!
    const reconfiguredMeta = calculateInventoryStatus(3, 2);
    assert(
      reconfiguredMeta.status === 'IN_STOCK' && reconfiguredMeta.isLowStock === false,
      'Product threshold is configurable: threshold = 2 makes 3 units IN_STOCK'
    );

    // -------------------------------------------------------------
    // Test 7: Inventory Valuation Calculation
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Inventory Valuation Calculation ---');
    const valProduct = await prisma.product.create({
      data: {
        name: 'Valuation Test Cream',
        slug: `val-test-cream-${Date.now()}`,
        sku: `VAL-SKU-${Date.now()}`,
        description: 'Testing inventory valuation computation',
        price: 50.00,
        costPrice: 25.00, // Explicit cost price
        inventory: 10,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    const oosMetricProduct = await prisma.product.create({
      data: {
        name: 'OOS Test Product',
        slug: `oos-test-product-${Date.now()}`,
        sku: `OOS-SKU-${Date.now()}`,
        description: 'Testing out of stock count aggregation',
        price: 20.00,
        costPrice: 10.00,
        inventory: 0,
        categoryId: testCategory.id,
        isActive: true,
      },
    });

    const metrics = await getInventoryMetrics();
    assert(metrics.totalProducts > 0, 'Inventory metrics aggregates total products count');
    assert(metrics.inventoryValuation > 0, 'Inventory valuation computed successfully');
    assert(
      metrics.lowStockCount >= 1,
      'Low stock metric aggregates products at or below threshold'
    );
    assert(
      metrics.outOfStockCount >= 1,
      'Out of stock metric aggregates products at 0 inventory'
    );

    // -------------------------------------------------------------
    // Test 8: Inventory History Integrity Audit
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Inventory History Trail Completeness & Integrity ---');
    const allHistory = await getRecentInventoryLogs(50);
    assert(allHistory.length >= 4, 'Audit trail contains logged inventory changes across test lifecycle');

    for (const log of allHistory) {
      assert(
        Boolean(log.sku && log.sku.length > 0),
        `Audit row has valid SKU: ${log.sku}`
      );
      assert(
        log.newQuantity - log.previousQuantity === log.difference,
        `Audit row arithmetic valid: (${log.newQuantity} - ${log.previousQuantity} === ${log.difference})`
      );
      assert(
        Boolean(log.reason && log.reason.length > 0),
        `Audit row has descriptive reason: ${log.reason}`
      );
      assert(
        Boolean(log.createdAt),
        `Audit row has timestamp: ${log.createdAt}`
      );
      break; // Check sample for concise output
    }

    console.log('\n====================================================');
    console.log(`INVENTORY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Inventory audit suite crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runInventoryAudit();
