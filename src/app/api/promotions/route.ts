import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { PromotionType, PromotionScope } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, active, scheduled, expired, flash
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const now = new Date();
    const where: any = {};

    if (type) {
      where.type = type as PromotionType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { couponCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.startDate = { lte: now };
      where.AND = [
        {
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      ];
    } else if (status === 'scheduled') {
      where.startDate = { gt: now };
    } else if (status === 'expired') {
      where.endDate = { lt: now };
    } else if (status === 'flash') {
      where.isFlashSale = true;
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        category: true,
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute Metrics for admin dashboard
    const allPromos = await prisma.promotion.findMany({
      select: {
        id: true,
        isActive: true,
        startDate: true,
        endDate: true,
        isFlashSale: true,
        type: true,
      },
    });

    let activeCount = 0;
    let scheduledCount = 0;
    let expiredCount = 0;
    let flashCount = 0;

    for (const p of allPromos) {
      const isStarted = new Date(p.startDate) <= now;
      const isEnded = p.endDate ? new Date(p.endDate) < now : false;

      if (p.isFlashSale && p.isActive && isStarted && !isEnded) {
        flashCount++;
      }

      if (isEnded) {
        expiredCount++;
      } else if (!isStarted) {
        scheduledCount++;
      } else if (p.isActive) {
        activeCount++;
      }
    }

    return NextResponse.json({
      promotions,
      metrics: {
        total: allPromos.length,
        active: activeCount,
        scheduled: scheduledCount,
        expired: expiredCount,
        flashDeals: flashCount,
      },
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      description,
      type,
      scope,
      discountType,
      discountValue,
      salePrice,
      couponCode,
      categoryId,
      productIds,
      minOrderSubtotal,
      minQuantity,
      buyQuantity,
      getQuantity,
      getDiscountPercent,
      tieredRules,
      bundleProductIds,
      maxQuantity,
      usageLimit,
      startDate,
      endDate,
      isActive,
      isFlashSale,
      bannerText,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Promotion name is required.' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Promotion type is required.' }, { status: 400 });
    }

    const cleanCouponCode = couponCode && couponCode.trim() ? couponCode.trim().toUpperCase() : null;

    if (cleanCouponCode) {
      const existing = await prisma.promotion.findUnique({
        where: { couponCode: cleanCouponCode },
      });
      if (existing) {
        return NextResponse.json({ error: `Coupon code "${cleanCouponCode}" is already in use.` }, { status: 400 });
      }
    }

    const startDateTime = startDate ? new Date(startDate) : new Date();
    const endDateTime = endDate ? new Date(endDate) : null;

    if (endDateTime && endDateTime <= startDateTime) {
      return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type as PromotionType,
        scope: (scope as PromotionScope) || 'PRODUCT',
        discountType: discountType || (type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT'),
        discountValue: discountValue ? parseFloat(discountValue) : null,
        salePrice: salePrice ? parseFloat(salePrice) : null,
        couponCode: cleanCouponCode,
        categoryId: categoryId || null,
        minOrderSubtotal: minOrderSubtotal ? parseFloat(minOrderSubtotal) : null,
        minQuantity: minQuantity ? parseInt(minQuantity) : null,
        buyQuantity: buyQuantity ? parseInt(buyQuantity) : null,
        getQuantity: getQuantity ? parseInt(getQuantity) : null,
        getDiscountPercent: getDiscountPercent != null ? parseFloat(getDiscountPercent) : null,
        tieredRules: tieredRules || null,
        bundleProductIds: bundleProductIds || null,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        startDate: startDateTime,
        endDate: endDateTime,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isFlashSale: Boolean(isFlashSale || type === 'FLASH_SALE'),
        bannerText: bannerText?.trim() || null,
        products:
          Array.isArray(productIds) && productIds.length > 0
            ? {
                connect: productIds.map((id: string) => ({ id })),
              }
            : undefined,
      },
      include: {
        category: true,
        products: true,
      },
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create promotion.' },
      { status: 500 }
    );
  }
}
