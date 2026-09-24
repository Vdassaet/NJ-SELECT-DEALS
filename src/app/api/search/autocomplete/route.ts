import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Fast search and autocomplete endpoint
 * Supports query:
 * - Product Name
 * - SKU
 * - Brand
 * - Category Name
 * - Description
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || '6', 10)));

    if (!q || q.length < 1) {
      return NextResponse.json({
        query: q,
        suggestions: [],
        products: [],
        categories: [],
        brands: [],
      });
    }

    // 1. Fetch matching active products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          {
            category: {
              name: { contains: q, mode: 'insensitive' },
            },
          },
        ],
      },
      take: limit,
      orderBy: [
        { isBestSeller: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        brand: true,
        price: true,
        salePrice: true,
        rating: true,
        inventory: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    // 2. Extract unique matching categories
    const matchingCategories = await prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    // 3. Extract unique matching brands from existing products
    const matchingBrandsRaw = await prisma.product.findMany({
      where: {
        isActive: true,
        brand: { contains: q, mode: 'insensitive' },
      },
      distinct: ['brand'],
      take: 4,
      select: {
        brand: true,
      },
    });
    const matchingBrands = matchingBrandsRaw
      .map((b) => b.brand)
      .filter((b): b is string => Boolean(b));

    // 4. Build text suggestions list for autocomplete highlighting
    const suggestionsSet = new Set<string>();

    for (const p of products) {
      if (p.name.toLowerCase().includes(q.toLowerCase())) {
        suggestionsSet.add(p.name);
      }
      if (p.brand && p.brand.toLowerCase().includes(q.toLowerCase())) {
        suggestionsSet.add(p.brand);
      }
    }
    for (const c of matchingCategories) {
      suggestionsSet.add(c.name);
    }

    const suggestions = Array.from(suggestionsSet).slice(0, 6);

    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      brand: p.brand,
      price: p.price,
      salePrice: p.salePrice,
      rating: p.rating,
      inStock: p.inventory > 0,
      categoryName: p.category?.name,
      categorySlug: p.category?.slug,
      image:
        p.images[0]?.url ||
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    }));

    return NextResponse.json({
      query: q,
      suggestions,
      products: formattedProducts,
      categories: matchingCategories,
      brands: matchingBrands,
      totalMatches: products.length,
    });
  } catch (error) {
    console.error('Search autocomplete API error:', error);
    return NextResponse.json(
      { error: 'Failed to process autocomplete search' },
      { status: 500 }
    );
  }
}
