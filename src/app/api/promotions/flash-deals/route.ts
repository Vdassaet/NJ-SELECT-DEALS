import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPromotionActive } from '@/lib/pricing-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    const flashPromos = await prisma.promotion.findMany({
      where: {
        isActive: true,
        isFlashSale: true,
        startDate: { lte: now },
        AND: [
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        ],
      },
      include: {
        products: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeFlashPromos = flashPromos.filter((p) => isPromotionActive(p, now));

    const flashDeals: any[] = [];
    const seenProductIds = new Set<string>();

    for (const promo of activeFlashPromos) {
      for (const product of promo.products) {
        if (seenProductIds.has(product.id) || !product.isActive) continue;
        seenProductIds.add(product.id);

        let calculatedSalePrice = product.price;
        let discountPercent = 0;

        if (promo.discountValue) {
          if (promo.discountType === 'PERCENTAGE' || !promo.discountType) {
            discountPercent = promo.discountValue;
            calculatedSalePrice = Math.round(product.price * (1 - promo.discountValue / 100) * 100) / 100;
          } else {
            calculatedSalePrice = Math.max(0, Math.round((product.price - promo.discountValue) * 100) / 100);
            discountPercent = Math.round(((product.price - calculatedSalePrice) / product.price) * 100);
          }
        } else if (promo.salePrice != null && promo.salePrice < product.price) {
          calculatedSalePrice = promo.salePrice;
          discountPercent = Math.round(((product.price - promo.salePrice) / product.price) * 100);
        } else if (product.salePrice != null && product.salePrice < product.price) {
          calculatedSalePrice = product.salePrice;
          discountPercent = Math.round(((product.price - product.salePrice) / product.price) * 100);
        }

        const primaryImage =
          product.images && product.images.length > 0
            ? product.images[0].url
            : 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';

        const stockRemaining = Math.max(0, product.inventory - (product.reservedQuantity || 0));
        const flashStockCap = promo.maxQuantity ? Math.min(stockRemaining, promo.maxQuantity) : stockRemaining;

        flashDeals.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          brand: product.brand,
          price: product.price,
          salePrice: calculatedSalePrice,
          discountPercent,
          stockRemaining,
          flashStockCap,
          image: primaryImage,
          category: product.category?.name || 'Deals',
          promotionId: promo.id,
          promotionName: promo.name,
          bannerText: promo.bannerText || `⚡ FLASH SALE: ${discountPercent}% OFF`,
          endDate: promo.endDate ? promo.endDate.toISOString() : null,
        });
      }
    }

    return NextResponse.json({ flashDeals });
  } catch (error) {
    console.error('Error fetching flash deals:', error);
    return NextResponse.json({ error: 'Failed to fetch flash deals' }, { status: 500 });
  }
}
