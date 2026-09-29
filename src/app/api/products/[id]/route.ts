export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { getProductActivePromotions } from '@/lib/pricing-engine';
import { getProductRecommendations } from '@/lib/recommendation-engine';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { validatePrice, validateInventoryCount } from '@/lib/validation';
import { logSecurityEvent } from '@/lib/security-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Search by ID or slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 1. Fetch active promotions for this product
    const now = new Date();
    const promotions = await getProductActivePromotions(product.id, now);

    // 2. Fetch Multi-Tiered Reliable Recommendations (Related, Frequently Bought Together, Also Bought, Recommended)
    const recommendations = await getProductRecommendations(product.id);

    return NextResponse.json({
      product,
      promotions,
      relatedProducts: recommendations.relatedProducts,
      frequentlyBoughtTogether: recommendations.frequentlyBoughtTogether,
      customersAlsoBought: recommendations.customersAlsoBought,
      recommendedProducts: recommendations.recommendedProducts,
    });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch product');
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
      slug,
      sku,
      brand,
      description,
      price,
      salePrice,
      inventory,
      lowStockThreshold,
      weight,
      isFeatured,
      isNewArrival,
      isBestSeller,
      isActive,
      categoryId,
      images,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slugify(slug);
    if (sku !== undefined) updateData.sku = sku.trim();
    if (brand !== undefined) updateData.brand = brand ? brand.trim() : null;
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) {
      const prCheck = validatePrice(price, 0.01);
      if (!prCheck.valid) return NextResponse.json({ error: prCheck.error }, { status: 400 });
      updateData.price = prCheck.value!;
    }
    if (salePrice !== undefined) {
      if (salePrice !== null && salePrice !== '') {
        const spCheck = validatePrice(salePrice, 0.01);
        if (!spCheck.valid) return NextResponse.json({ error: spCheck.error }, { status: 400 });
        updateData.salePrice = spCheck.value!;
      } else {
        updateData.salePrice = null;
      }
    }
    if (inventory !== undefined) {
      const invCheck = validateInventoryCount(inventory);
      if (!invCheck.valid) return NextResponse.json({ error: invCheck.error }, { status: 400 });
      updateData.inventory = invCheck.value!;
    }
    if (lowStockThreshold !== undefined) {
      const lCheck = validateInventoryCount(lowStockThreshold, 100000);
      if (!lCheck.valid) return NextResponse.json({ error: lCheck.error }, { status: 400 });
      updateData.lowStockThreshold = lCheck.value!;
    }
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (isNewArrival !== undefined) updateData.isNewArrival = Boolean(isNewArrival);
    if (isBestSeller !== undefined) updateData.isBestSeller = Boolean(isBestSeller);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    // If images are updated
    if (Array.isArray(images)) {
      // Delete existing and recreate
      await prisma.productImage.deleteMany({
        where: { productId: params.id },
      });

      const imageCreates = images.map((img: any, idx: number) => {
        if (typeof img === 'string') {
          return {
            url: img.trim(),
            isPrimary: idx === 0,
            sortOrder: idx,
            productId: params.id,
          };
        }
        return {
          url: img.url.trim(),
          altText: img.altText || null,
          isPrimary: img.isPrimary ?? idx === 0,
          sortOrder: img.sortOrder ?? idx,
          productId: params.id,
        };
      });

      if (imageCreates.length > 0) {
        await prisma.productImage.createMany({
          data: imageCreates,
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true,
        images: true,
      },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'UPDATE_PRODUCT', productId: updated.id, sku: updated.sku, name: updated.name },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to update product');
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

    await prisma.product.delete({
      where: { id: params.id },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'DELETE_PRODUCT', productId: params.id },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to delete product');
  }
}
