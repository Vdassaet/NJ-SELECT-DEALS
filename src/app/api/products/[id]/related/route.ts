import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getProductRecommendations, RecommendationType } from '@/lib/recommendation-engine';
import { validateOrigin, createSafeErrorResponse } from '@/lib/security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const currentProduct = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 1. Fetch comprehensive multi-tier recommendations
    const recommendations = await getProductRecommendations(currentProduct.id);

    // 2. Also check if admin has configured manual rules
    const manualRulesCount = await prisma.productRelation.count({
      where: { productId: currentProduct.id },
    });

    // 3. For backwards compatibility with existing UI callers that expect { relatedProducts }
    return NextResponse.json({
      ...recommendations,
      isManualRule: manualRulesCount > 0,
      manualRulesCount,
    });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to fetch recommendations');
  }
}

/**
 * POST /api/products/[id]/related
 * Admin assigns relations across:
 * - RELATED (Related Products)
 * - FREQUENTLY_BOUGHT_TOGETHER
 * - CUSTOMERS_ALSO_BOUGHT
 * - RECOMMENDED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin or cross-site request blocked.' }, { status: 403 });
  }

  try {
    const adminUser = await requireAdmin();

    const { id } = params;
    const body = await request.json();
    const {
      relatedProductIds,
      frequentlyBoughtTogetherIds,
      customersAlsoBoughtIds,
      recommendedProductIds,
      // For backwards compatibility:
      relationshipType,
    } = body;

    const currentProduct = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { id: true },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Build list of relations to persist
    const relationsToInsert: {
      productId: string;
      relatedId: string;
      relationship: string;
      sortOrder: number;
    }[] = [];

    // Helper to queue items
    const queue = (ids: any, relType: string) => {
      if (Array.isArray(ids)) {
        ids.forEach((relId: string, idx: number) => {
          if (relId && relId !== currentProduct.id) {
            // Avoid duplicate target products in the same product relations
            if (!relationsToInsert.some((r) => r.relatedId === relId)) {
              relationsToInsert.push({
                productId: currentProduct.id,
                relatedId: relId,
                relationship: relType,
                sortOrder: idx,
              });
            }
          }
        });
      }
    };

    if (
      frequentlyBoughtTogetherIds !== undefined ||
      customersAlsoBoughtIds !== undefined ||
      recommendedProductIds !== undefined
    ) {
      // Structured 4-tier update
      queue(relatedProductIds, 'RELATED');
      queue(frequentlyBoughtTogetherIds, 'FREQUENTLY_BOUGHT_TOGETHER');
      queue(customersAlsoBoughtIds, 'CUSTOMERS_ALSO_BOUGHT');
      queue(recommendedProductIds, 'RECOMMENDED');
    } else if (Array.isArray(relatedProductIds)) {
      // Legacy or single-type update
      const relType = relationshipType || 'RELATED';
      queue(relatedProductIds, relType);
    }

    // Atomically replace relations for this product
    await prisma.$transaction(async (tx) => {
      await tx.productRelation.deleteMany({
        where: { productId: currentProduct.id },
      });

      if (relationsToInsert.length > 0) {
        await tx.productRelation.createMany({
          data: relationsToInsert,
        });
      }
    });

    logSecurityEvent('ADMIN_ACTION', {
      action: 'UPDATE_PRODUCT_RELATIONS',
      adminId: adminUser.id,
      productId: currentProduct.id,
      count: relationsToInsert.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Product recommendation rules updated successfully.',
      count: relationsToInsert.length,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return createSafeErrorResponse(error, 'Failed to save recommendation rules');
  }
}
