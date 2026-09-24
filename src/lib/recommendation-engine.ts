import { prisma } from '@/lib/prisma';
import { getProductActivePromotions } from '@/lib/pricing-engine';

export type RecommendationType = 'RELATED' | 'FREQUENTLY_BOUGHT_TOGETHER' | 'CUSTOMERS_ALSO_BOUGHT' | 'RECOMMENDED';

export interface FormattedRecommendation {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  price: number;
  salePrice: number | null;
  rating: number;
  reviewCount: number;
  inventory: number;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  image: string;
  relationshipType: RecommendationType;
  badge?: string | null;
}

export interface ProductRecommendationsHub {
  relatedProducts: FormattedRecommendation[];
  frequentlyBoughtTogether: FormattedRecommendation[];
  customersAlsoBought: FormattedRecommendation[];
  recommendedProducts: FormattedRecommendation[];
}

/**
 * Helper to format a prisma product into a recommendation item
 */
function formatProduct(p: any, relType: RecommendationType): FormattedRecommendation {
  const primaryImage =
    p.images && p.images.length > 0
      ? p.images[0].url
      : 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    price: p.price,
    salePrice: p.salePrice,
    rating: p.rating || 5,
    reviewCount: p.reviewCount || 0,
    inventory: p.inventory,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
        }
      : null,
    image: primaryImage,
    relationshipType: relType,
  };
}

/**
 * Retrieves reliable 4-tier recommendations for a product:
 * 1. Admin-selected manual relations (priority)
 * 2. Purchase history co-occurrence (orders containing this product)
 * 3. Brand & Category affinity (same brand/category)
 * 4. General store top performers / best sellers
 */
export async function getProductRecommendations(productId: string): Promise<ProductRecommendationsHub> {
  const current = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      categoryId: true,
      brand: true,
    },
  });

  if (!current) {
    return {
      relatedProducts: [],
      frequentlyBoughtTogether: [],
      customersAlsoBought: [],
      recommendedProducts: [],
    };
  }

  // 1. Fetch all manual relations configured by admin
  const manualRelations = await prisma.productRelation.findMany({
    where: { productId: current.id },
    orderBy: { sortOrder: 'asc' },
    include: {
      relatedProduct: {
        include: {
          category: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  const manualRelated: FormattedRecommendation[] = [];
  const manualFbt: FormattedRecommendation[] = [];
  const manualAlsoBought: FormattedRecommendation[] = [];
  const manualRecommended: FormattedRecommendation[] = [];

  for (const rel of manualRelations) {
    if (!rel.relatedProduct || !rel.relatedProduct.isActive) continue;

    const formatted = formatProduct(rel.relatedProduct, rel.relationship as RecommendationType);
    if (rel.relationship === 'FREQUENTLY_BOUGHT_TOGETHER') {
      manualFbt.push(formatted);
    } else if (rel.relationship === 'CUSTOMERS_ALSO_BOUGHT') {
      manualAlsoBought.push(formatted);
    } else if (rel.relationship === 'RECOMMENDED') {
      manualRecommended.push(formatted);
    } else {
      manualRelated.push(formatted);
    }
  }

  const excludedIds = new Set<string>([
    current.id,
    ...manualRelated.map((p) => p.id),
    ...manualFbt.map((p) => p.id),
    ...manualAlsoBought.map((p) => p.id),
    ...manualRecommended.map((p) => p.id),
  ]);

  // 2. Compute purchase history co-occurrence (Frequently Bought Together fallback)
  let historyCoPurchased: any[] = [];
  if (manualFbt.length === 0) {
    // Find order IDs that contain this product
    const orderItemsWithProduct = await prisma.orderItem.findMany({
      where: { productId: current.id },
      take: 50,
      select: { orderId: true },
    });
    const orderIds = orderItemsWithProduct.map((oi) => oi.orderId);

    if (orderIds.length > 0) {
      // Find other items in those orders
      const coOrderItems = await prisma.orderItem.findMany({
        where: {
          orderId: { in: orderIds },
          productId: { notIn: Array.from(excludedIds) },
        },
        take: 20,
        select: {
          productId: true,
        },
      });

      const coProductIds = Array.from(new Set(coOrderItems.map((item) => item.productId))).slice(0, 4);

      if (coProductIds.length > 0) {
        historyCoPurchased = await prisma.product.findMany({
          where: {
            id: { in: coProductIds },
            isActive: true,
          },
          include: {
            category: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        });
        historyCoPurchased.forEach((p) => excludedIds.add(p.id));
      }
    }
  }

  // 3. Fallback: Related Products (same category)
  let categoryFallback: any[] = [];
  if (manualRelated.length < 4) {
    categoryFallback = await prisma.product.findMany({
      where: {
        categoryId: current.categoryId,
        id: { notIn: Array.from(excludedIds) },
        isActive: true,
      },
      take: 4 - manualRelated.length,
      orderBy: [{ rating: 'desc' }, { isBestSeller: 'desc' }],
      include: {
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });
    categoryFallback.forEach((p) => excludedIds.add(p.id));
  }

  // 4. Fallback: Customers Also Bought (same brand or top rated in category)
  let alsoBoughtFallback: any[] = [];
  if (manualAlsoBought.length < 4) {
    const brandWhere: any = {
      id: { notIn: Array.from(excludedIds) },
      isActive: true,
    };
    if (current.brand) {
      brandWhere.brand = current.brand;
    } else {
      brandWhere.categoryId = current.categoryId;
    }

    alsoBoughtFallback = await prisma.product.findMany({
      where: brandWhere,
      take: 4 - manualAlsoBought.length,
      orderBy: { rating: 'desc' },
      include: {
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });
    alsoBoughtFallback.forEach((p) => excludedIds.add(p.id));
  }

  // 5. Fallback: Recommended Products (Featured & Best Sellers storewide)
  let recommendedFallback: any[] = [];
  if (manualRecommended.length < 4) {
    recommendedFallback = await prisma.product.findMany({
      where: {
        id: { notIn: Array.from(excludedIds) },
        isActive: true,
      },
      take: 4 - manualRecommended.length,
      orderBy: [
        { isFeatured: 'desc' },
        { isBestSeller: 'desc' },
        { rating: 'desc' },
      ],
      include: {
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });
  }

  return {
    relatedProducts: [
      ...manualRelated,
      ...categoryFallback.map((p) => formatProduct(p, 'RELATED')),
    ],
    frequentlyBoughtTogether: [
      ...manualFbt,
      ...historyCoPurchased.map((p) => formatProduct(p, 'FREQUENTLY_BOUGHT_TOGETHER')),
    ],
    customersAlsoBought: [
      ...manualAlsoBought,
      ...alsoBoughtFallback.map((p) => formatProduct(p, 'CUSTOMERS_ALSO_BOUGHT')),
    ],
    recommendedProducts: [
      ...manualRecommended,
      ...recommendedFallback.map((p) => formatProduct(p, 'RECOMMENDED')),
    ],
  };
}
