import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { validatePrice, validatePercentage } from '@/lib/validation';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ coupons });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to fetch coupons');
  }
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const session = await requireAdmin();

    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startDate,
      endDate,
      isActive,
    } = body;

    if (!code || discountValue === undefined || discountValue === null) {
      return NextResponse.json({ error: 'Coupon code and discount value are required' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    if (cleanCode.length < 2 || cleanCode.length > 50) {
      return NextResponse.json({ error: 'Coupon code must be between 2 and 50 characters' }, { status: 400 });
    }

    const type = discountType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE';
    let validatedDiscount: number;

    if (type === 'PERCENTAGE') {
      const pCheck = validatePercentage(discountValue, 0.01, 100);
      if (!pCheck.valid) {
        return NextResponse.json({ error: pCheck.error }, { status: 400 });
      }
      validatedDiscount = pCheck.value!;
    } else {
      const prCheck = validatePrice(discountValue, 0.01, 100000);
      if (!prCheck.valid) {
        return NextResponse.json({ error: prCheck.error }, { status: 400 });
      }
      validatedDiscount = prCheck.value!;
    }

    let minOrder: number | null = null;
    if (minOrderAmount !== undefined && minOrderAmount !== null && minOrderAmount !== '') {
      const minCheck = validatePrice(minOrderAmount, 0, 100000);
      if (!minCheck.valid) {
        return NextResponse.json({ error: 'Invalid minimum order amount' }, { status: 400 });
      }
      minOrder = minCheck.value!;
    }

    let parsedMaxUses: number | null = null;
    if (maxUses !== undefined && maxUses !== null && maxUses !== '') {
      const num = Number(maxUses);
      if (!Number.isInteger(num) || num < 1 || num > 10_000_000) {
        return NextResponse.json({ error: 'Maximum uses must be a whole number between 1 and 10,000,000' }, { status: 400 });
      }
      parsedMaxUses = num;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : null;
    if (end && end < start) {
      return NextResponse.json({ error: 'End date cannot be earlier than start date' }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountType: type,
        discountValue: validatedDiscount,
        minOrderAmount: minOrder,
        maxUses: parsedMaxUses,
        startDate: start,
        endDate: end,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'CREATE_COUPON', couponId: coupon.id, code: coupon.code, discountType: type, discountValue: validatedDiscount },
      request,
      { userId: session.id, role: session.role }
    );

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to create coupon');
  }
}

export async function PUT(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const session = await requireAdmin();

    const body = await request.json();
    const { id, code, discountType, discountValue, minOrderAmount, maxUses, startDate, endDate, isActive } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });
    }

    const updateData: any = {};
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      if (cleanCode.length < 2 || cleanCode.length > 50) {
        return NextResponse.json({ error: 'Coupon code must be between 2 and 50 characters' }, { status: 400 });
      }
      updateData.code = cleanCode;
    }

    if (discountType) {
      updateData.discountType = discountType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE';
    }

    if (discountValue !== undefined && discountValue !== null) {
      const isFixed = (discountType || updateData.discountType) === 'FIXED_AMOUNT';
      if (isFixed) {
        const prCheck = validatePrice(discountValue, 0.01, 100000);
        if (!prCheck.valid) return NextResponse.json({ error: prCheck.error }, { status: 400 });
        updateData.discountValue = prCheck.value!;
      } else {
        const pCheck = validatePercentage(discountValue, 0.01, 100);
        if (!pCheck.valid) return NextResponse.json({ error: pCheck.error }, { status: 400 });
        updateData.discountValue = pCheck.value!;
      }
    }

    if (minOrderAmount !== undefined) {
      if (minOrderAmount === null || minOrderAmount === '') {
        updateData.minOrderAmount = null;
      } else {
        const minCheck = validatePrice(minOrderAmount, 0, 100000);
        if (!minCheck.valid) return NextResponse.json({ error: 'Invalid minimum order amount' }, { status: 400 });
        updateData.minOrderAmount = minCheck.value!;
      }
    }

    if (maxUses !== undefined) {
      if (maxUses === null || maxUses === '') {
        updateData.maxUses = null;
      } else {
        const num = Number(maxUses);
        if (!Number.isInteger(num) || num < 1 || num > 10_000_000) {
          return NextResponse.json({ error: 'Maximum uses must be a whole number between 1 and 10,000,000' }, { status: 400 });
        }
        updateData.maxUses = num;
      }
    }

    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'UPDATE_COUPON', couponId: updated.id, code: updated.code },
      request,
      { userId: session.id, role: session.role }
    );

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to update coupon');
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'DELETE_COUPON', couponId: id },
      request,
      { userId: session.id, role: session.role }
    );

    return NextResponse.json({ success: true, message: 'Coupon deleted' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to delete coupon');
  }
}
