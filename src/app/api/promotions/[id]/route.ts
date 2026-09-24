export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { PromotionType, PromotionScope } from '@/lib/types';

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
    console.error('Error fetching promotion:', error);
    return NextResponse.json({ error: 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        discountValue: discountValue !== undefined ? (discountValue ? parseFloat(discountValue) : null) : existing.discountValue,
        salePrice: salePrice !== undefined ? (salePrice ? parseFloat(salePrice) : null) : existing.salePrice,
        couponCode: cleanCouponCode,
        categoryId: categoryId !== undefined ? categoryId || null : existing.categoryId,
        minOrderSubtotal: minOrderSubtotal !== undefined ? (minOrderSubtotal ? parseFloat(minOrderSubtotal) : null) : existing.minOrderSubtotal,
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

    return NextResponse.json({ promotion: updated });
  } catch (error: any) {
    console.error('Error updating promotion:', error);
    return NextResponse.json({ error: error.message || 'Failed to update promotion.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { isActive } = body;

    const promotion = await prisma.promotion.update({
      where: { id: params.id },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json({ promotion });
  } catch (error: any) {
    console.error('Error toggling promotion status:', error);
    return NextResponse.json({ error: 'Failed to update promotion status' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await prisma.promotion.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Promotion successfully deleted' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
