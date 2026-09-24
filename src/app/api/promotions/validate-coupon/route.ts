export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { calculateOrderPricing } from '@/lib/pricing-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { couponCode, items } = body;

    if (!couponCode || typeof couponCode !== 'string' || !couponCode.trim()) {
      return NextResponse.json({ error: 'Please enter a coupon code.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    const pricing = await calculateOrderPricing(
      items.map((i: any) => ({
        productId: i.id || i.productId,
        quantity: i.quantity || 1,
        variantId: i.variantId || null,
      })),
      couponCode.trim()
    );

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
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate coupon code.' },
      { status: 500 }
    );
  }
}

