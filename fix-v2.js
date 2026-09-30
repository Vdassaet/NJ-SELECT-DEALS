const fs = require('fs');

// 1. Delete backup
if (fs.existsSync('src/lib/pricing-engine.bak.ts')) {
    fs.unlinkSync('src/lib/pricing-engine.bak.ts');
}

// 2. Fix order-service.ts (remove duplicate recordRefund)
let orderService = fs.readFileSync('src/lib/order-service.ts', 'utf8');
const parts = orderService.split('export async function recordRefund');
if (parts.length > 2) {
    // Keep everything up to the last one
    orderService = parts[0] + 'export async function recordRefund' + parts[parts.length - 1];
    fs.writeFileSync('src/lib/order-service.ts', orderService);
}

// 3. Fix route.ts
let route = fs.readFileSync('src/app/api/webhooks/stripe/route.ts', 'utf8');
route = route.replace(/efund_/g, "refund_");
route = route.replace(/await recordRefund\(paymentIntentId, stripeRefundId, thisRefundAmount, isFullRefund\);/g, "await recordRefund(paymentIntentId, stripeRefundId, thisRefundAmount, isFullRefund);");
fs.writeFileSync('src/app/api/webhooks/stripe/route.ts', route);
