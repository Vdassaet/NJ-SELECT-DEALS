import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { PromotionType, PromotionScope } from '@/lib/types';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { validatePrice, validatePercentage } from '@/lib/validation';
import { logSecurityEvent } from '@/lib/security-logger';

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
    return createSafeErrorResponse(error, 'Failed to fetch promotions');
  }
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();

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

    let validatedDiscount: number | null = null;
    if (discountValue !== undefined && discountValue !== null && discountValue !== '') {
      const dType = discountType || (type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT');
      if (dType === 'PERCENTAGE') {
        const pCheck = validatePercentage(discountValue, 0.01, 100);
        if (!pCheck.valid) return NextResponse.json({ error: pCheck.error }, { status: 400 });
        validatedDiscount = pCheck.value!;
      } else {
        const prCheck = validatePrice(discountValue, 0.01, 100000);
        if (!prCheck.valid) return NextResponse.json({ error: prCheck.error }, { status: 400 });
        validatedDiscount = prCheck.value!;
      }
    }

    let validatedSalePrice: number | null = null;
    if (salePrice !== undefined && salePrice !== null && salePrice !== '') {
      const spCheck = validatePrice(salePrice, 0.01);
      if (!spCheck.valid) return NextResponse.json({ error: spCheck.error }, { status: 400 });
      validatedSalePrice = spCheck.value!;
    }

    let validatedMinSubtotal: number | null = null;
    if (minOrderSubtotal !== undefined && minOrderSubtotal !== null && minOrderSubtotal !== '') {
      const msCheck = validatePrice(minOrderSubtotal, 0);
      if (!msCheck.valid) return NextResponse.json({ error: msCheck.error }, { status: 400 });
      validatedMinSubtotal = msCheck.value!;
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
        discountValue: validatedDiscount,
        salePrice: validatedSalePrice,
        couponCode: cleanCouponCode,
        categoryId: categoryId || null,
        minOrderSubtotal: validatedMinSubtotal,
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

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'CREATE_PROMOTION', promotionId: promotion.id, name: promotion.name, type: promotion.type },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to create promotion.');
  }
}
