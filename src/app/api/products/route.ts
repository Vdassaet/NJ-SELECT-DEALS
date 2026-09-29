import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { validatePrice, validateInventoryCount } from '@/lib/validation';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock') === 'true';
    const discount = searchParams.get('discount') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const newArrival = searchParams.get('newArrival') === 'true';
    const bestSeller = searchParams.get('bestSeller') === 'true';
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // default true
    const sort = searchParams.get('sort') || 'newest';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (category) {
      where.category = {
        OR: [{ slug: category }, { id: category }],
      };
    }

    if (brand) {
      where.brand = {
        contains: brand,
        mode: 'insensitive',
      };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (inStock) {
      where.inventory = { gt: 0 };
    }

    if (discount) {
      where.salePrice = { not: null };
    }

    if (featured) {
      where.isFeatured = true;
    }

    if (newArrival) {
      where.isNewArrival = true;
    }

    if (bestSeller) {
      where.isBestSeller = true;
    }

    if (q && q.trim()) {
      const searchTerms = q.trim();
      where.OR = [
        { name: { contains: searchTerms, mode: 'insensitive' } },
        { brand: { contains: searchTerms, mode: 'insensitive' } },
        { description: { contains: searchTerms, mode: 'insensitive' } },
        { sku: { contains: searchTerms, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'best_selling':
        orderBy = [{ isBestSeller: 'desc' }, { rating: 'desc' }];
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
      },
    });

    return NextResponse.json({ products, total: products.length });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch products');
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

    if (!name || !sku || !description || price === undefined || !categoryId) {
      return NextResponse.json(
        { error: 'Name, SKU, Description, Price, and Category are required.' },
        { status: 400 }
      );
    }

    const priceCheck = validatePrice(price, 0.01);
    if (!priceCheck.valid) {
      return NextResponse.json({ error: priceCheck.error }, { status: 400 });
    }

    let validatedSalePrice: number | null = null;
    if (salePrice !== null && salePrice !== undefined && salePrice !== '') {
      const spCheck = validatePrice(salePrice, 0.01);
      if (!spCheck.valid) {
        return NextResponse.json({ error: spCheck.error }, { status: 400 });
      }
      validatedSalePrice = spCheck.value!;
    }

    const invCheck = validateInventoryCount(inventory ?? 0);
    if (!invCheck.valid) {
      return NextResponse.json({ error: invCheck.error }, { status: 400 });
    }

    const generatedSlug = slug && slug.trim() ? slugify(slug) : slugify(name);

    // Verify SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: sku.trim() },
    });
    if (existingSku) {
      return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 409 });
    }

    // Prepare images array
    const imageCreates: any[] = [];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img: any, idx: number) => {
        if (typeof img === 'string' && img.trim()) {
          imageCreates.push({
            url: img.trim(),
            isPrimary: idx === 0,
            sortOrder: idx,
          });
        } else if (typeof img === 'object' && img.url) {
          imageCreates.push({
            url: img.url.trim(),
            altText: img.altText || null,
            isPrimary: img.isPrimary ?? idx === 0,
            sortOrder: img.sortOrder ?? idx,
          });
        }
      });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: generatedSlug,
        sku: sku.trim(),
        brand: brand ? brand.trim() : null,
        description: description.trim(),
        price: priceCheck.value!,
        salePrice: validatedSalePrice,
        inventory: invCheck.value!,
        lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 5,
        weight: weight ? parseFloat(weight) : null,
        isFeatured: Boolean(isFeatured),
        isNewArrival: isNewArrival !== undefined ? Boolean(isNewArrival) : true,
        isBestSeller: Boolean(isBestSeller),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        categoryId,
        images: {
          create: imageCreates,
        },
      },
      include: {
        category: true,
        images: true,
      },
    });

    logSecurityEvent(
      'ADMIN_ACTION',
      { action: 'CREATE_PRODUCT', productId: product.id, sku: product.sku, name: product.name, price: product.price },
      request,
      { userId: adminUser.id, role: adminUser.role }
    );

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    return createSafeErrorResponse(error, 'Failed to create product');
  }
}
