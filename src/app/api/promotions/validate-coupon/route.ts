export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { calculateOrderPricing } from '@/lib/pricing-engine';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateOrigin, validateQuantity, createSafeErrorResponse } from '@/lib/security';

export async function POST(request: NextRequest) {
  // CSRF Origin validation
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // Rate limit to prevent coupon dictionary brute-force (10 attempts per minute per IP)
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: 'coupon_validate',
    limit: 10,
    windowSeconds: 60,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many coupon attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const body = await request.json();
    const { couponCode, items } = body;

    if (!couponCode || typeof couponCode !== 'string' || !couponCode.trim()) {
      return NextResponse.json({ error: 'Please enter a coupon code.' }, { status: 400 });
    }

    const cleanCode = couponCode.trim().slice(0, 50);

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Your cart is invalid or empty.' }, { status: 400 });
    }

    const validatedItems = items.map((i: any) => {
      const q = validateQuantity(i.quantity);
      return {
        productId: String(i.id || i.productId || ''),
        quantity: q.valid ? q.value : 1,
        variantId: typeof i.variantId === 'string' ? i.variantId : null,
      };
    });

    const pricing = await calculateOrderPricing(validatedItems, cleanCode);

    if (!pricing.coupon || !pricing.coupon.valid) {
      return NextResponse.json(
        {
          valid: false,
          message: pricing.coupon?.message || 'Invalid or expired coupon code.',
          pricing,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: pricing.coupon.code,
      discountAmount: pricing.coupon.discountAmount,
      message: pricing.coupon.message,
      pricing,
    });
  } catch (error: any) {
    return createSafeErrorResponse(error, 'Failed to validate coupon code.');
  }
}
