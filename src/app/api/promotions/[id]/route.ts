export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { PromotionType, PromotionScope } from '@/lib/types';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { validatePrice, validatePercentage } from '@/lib/validation';
import { logSecurityEvent } from '@/lib/security-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promotion = await prisma.promotion.findUnique({
      where: { id: params.id },
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
    });

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json({ promotion });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch promotion');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.promotion.findUnique({
      where: { id: params.id },
      include: { products: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    const cleanCouponCode = couponCode && couponCode.trim() ? couponCode.trim().toUpperCase() : null;

    if (cleanCouponCode && cleanCouponCode !== existing.couponCode) {
      const codeConflict = await prisma.promotion.findUnique({
        where: { couponCode: cleanCouponCode },
      });
      if (codeConflict && codeConflict.id !== params.id) {
        return NextResponse.json(
          { error: `Coupon code "${cleanCouponCode}" is already in use by another promotion.` },
          { status: 400 }
        );
      }
    }

    let validatedDiscount: number | null | undefined = undefined;
    if (discountValue !== undefined) {
      if (discountValue === null || discountValue === '') {
        validatedDiscount = null;
      } else {
        const dType = discountType || existing.discountType;
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
    }

    let validatedSalePrice: number | null | undefined = undefined;
    if (salePrice !== undefined) {
      if (salePrice === null || salePrice === '') {
        validatedSalePrice = null;
      } else {
        const spCheck = validatePrice(salePrice, 0.01);
        if (!spCheck.valid) return NextResponse.json({ error: spCheck.error }, { status: 400 });
        validatedSalePrice = spCheck.value!;
      }
    }

    let validatedMinSubtotal: number | null | undefined = undefined;
    if (minOrderSubtotal !== undefined) {
      if (minOrderSubtotal === null || minOrderSubtotal === '') {
        validatedMinSubtotal = null;
      } else {
        const msCheck = validatePrice(minOrderSubtotal, 0);
        if (!msCheck.valid) return NextResponse.json({ error: msCheck.error }, { status: 400 });
        validatedMinSubtotal = msCheck.value!;
      }
    }

    const startDateTime = startDate ? new Date(startDate) : existing.startDate;
    const endDateTime = endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;

    if (endDateTime && endDateTime <= startDateTime) {
      return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
    }

    const updated = await prisma.promotion.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        type: (type as PromotionType) || existing.type,
        scope: (scope as PromotionScope) || existing.scope,
        discountType: discountType !== undefined ? discountType : existing.discountType,
        discountValue: validatedDiscount !== undefined ? validatedDiscount : existing.discountValue,
        salePrice: validatedSalePrice !== undefined ? validatedSalePrice : existing.salePrice,
        couponCode: cleanCouponCode,
        categoryId: categoryId !== undefined ? categoryId || null : existing.categoryId,
        minOrderSubtotal: validatedMinSubtotal !== undefined ? validatedMinSubtotal : existing.minOrderSubtotal,
        minQuantity: minQuantity !== undefined ? (minQuantity ? parseInt(minQuantity) : null) : existing.minQuantity,
        buyQuantity: buyQuantity !== undefined ? (buyQuantity ? parseInt(buyQuantity) : null) : existing.buyQuantity,
        getQuantity: getQuantity !== undefined ? (getQuantity ? parseInt(getQuantity) : null) : existing.getQuantity,
        getDiscountPercent: getDiscountPercent !== undefined ? (getDiscountPercent != null ? parseFloat(getDiscountPercent) : null) : existing.getDiscountPercent,
        tieredRules: tieredRules !== undefined ? tieredRules : (existing.tieredRules as any),
        bundleProductIds: bundleProductIds !== undefined ? bundleProductIds : (existing.bundleProductIds as any),
        maxQuantity: maxQuantity !== undefined ? (maxQuantity ? parseInt(maxQuantity) : null) : existing.maxQuantity,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : existing.usageLimit,
        startDate: startDateTime,
        endDate: endDateTime,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        isFlashSale: isFlashSale !== undefined ? Boolean(isFlashSale) : existing.isFlashSale,
        bannerText: bannerText !== undefined ? bannerText?.trim() || null : existing.bannerText,
        products:
          Array.isArray(productIds)
            ? {
                set: productIds.map((id: string) => ({ id })),
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
      { action: 'UPDATE_PROMOTION', promotionId: updated.id, name: updated.name },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ promotion: updated });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to update promotion.');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();

    const body = await request.json();
    const { isActive } = body;

    const promotion = await prisma.promotion.update({
      where: { id: params.id },
      data: { isActive: Boolean(isActive) },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'TOGGLE_PROMOTION', promotionId: params.id, isActive: Boolean(isActive) },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ promotion });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to update promotion status');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();

    await prisma.promotion.delete({
      where: { id: params.id },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'DELETE_PROMOTION', promotionId: params.id },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ message: 'Promotion successfully deleted' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to delete promotion');
  }
}
