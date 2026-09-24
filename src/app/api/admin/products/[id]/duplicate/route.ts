import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const original = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSku = `${original.sku}-COPY-${randomSuffix}`;
    const newSlug = `${original.slug}-copy-${randomSuffix.toLowerCase()}`;
    const newName = `${original.name} (Copy)`;

    const duplicated = await prisma.product.create({
      data: {
        name: newName,
        slug: newSlug,
        sku: newSku,
        brand: original.brand,
        description: original.description,
        price: original.price,
        salePrice: original.salePrice,
        costPrice: original.costPrice,
        inventory: original.inventory,
        reservedQuantity: 0,
        lowStockThreshold: original.lowStockThreshold,
        weight: original.weight,
        isFeatured: false,
        isNewArrival: true,
        isBestSeller: false,
        isActive: false, // Default to inactive for review
        categoryId: original.categoryId,
        images: {
          create: original.images.map((img) => ({
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
        },
        variants: {
          create: original.variants.map((v) => ({
            name: v.name,
            sku: `${v.sku}-COPY-${randomSuffix}`,
            price: v.price,
            inventory: v.inventory,
          })),
        },
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    return NextResponse.json({ success: true, product: duplicated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Duplicate product error:', error);
    return NextResponse.json({ error: error.message || 'Failed to duplicate product' }, { status: 500 });
  }
}
