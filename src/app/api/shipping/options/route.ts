import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateAvailableShippingOptions, CARRIERS } from '@/lib/shipping-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subtotal = parseFloat(searchParams.get('subtotal') || '0');
    const weight = parseFloat(searchParams.get('weight') || '1');
    const state = searchParams.get('state') || 'NJ';
    const postalCode = searchParams.get('postalCode') || '07652';

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
    console.error('Shipping calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate shipping options' }, { status: 500 });
  }
}
