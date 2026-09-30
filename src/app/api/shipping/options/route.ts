import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAvailableShippingOptions, CARRIERS } from '@/lib/shipping-engine';
import { createSafeErrorResponse } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Rate limiting (30 requests/min)
  const rateLimitResult = await checkRateLimit(request, {
    keyPrefix: 'shipping_options',
    limit: 30,
    windowSeconds: 60,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.reset) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const subtotal = Math.max(0, parseFloat(searchParams.get('subtotal') || '0'));
    const weight = Math.max(0, parseFloat(searchParams.get('weight') || '1'));
    const state = (searchParams.get('state') || 'NJ').slice(0, 50);
    const postalCode = (searchParams.get('postalCode') || '07055').slice(0, 20);

    const settingsList = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const options = calculateAvailableShippingOptions(
      { subtotal, totalWeightLbs: weight, state, postalCode },
      settingsMap
    );

    return NextResponse.json({
      options,
      carriers: CARRIERS,
    });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to calculate shipping options');
  }
}
