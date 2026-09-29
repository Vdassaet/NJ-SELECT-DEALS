export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch category');
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
    const { name, slug, description, image, isActive, sortOrder } = body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (slug !== undefined) data.slug = slugify(slug);
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (image !== undefined) data.image = image ? image.trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

    const updated = await prisma.category.update({
      where: { id: params.id },
      data,
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'UPDATE_CATEGORY', categoryId: updated.id, name: updated.name },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to update category');
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

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: params.id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${productCount} assigned products. Please reassign or delete the products first.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'DELETE_CATEGORY', categoryId: params.id },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to delete category');
  }
}
