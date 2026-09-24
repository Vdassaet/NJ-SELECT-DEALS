import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { getProductActivePromotions } from '@/lib/pricing-engine';
import { getProductRecommendations } from '@/lib/recommendation-engine';

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
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
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
    if (price !== undefined) updateData.price = parseFloat(price);
    if (salePrice !== undefined) {
      updateData.salePrice = salePrice !== null && salePrice !== '' ? parseFloat(salePrice) : null;
    }
    if (inventory !== undefined) updateData.inventory = parseInt(inventory, 10);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold, 10);
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

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
