import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseReviewPayload, formatReviewPayload, calculateRatingStats } from '@/lib/review-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status'); // ALL | PUBLIC | HIDDEN | FLAGGED
    const q = searchParams.get('q');

    const where: any = {};
    if (productId) where.productId = productId;

    if (status === 'PUBLIC') {
      where.isPublic = true;
    } else if (status === 'HIDDEN') {
      where.isPublic = false;
    }

    if (q && q.trim()) {
      const query = q.trim();
      where.OR = [
        { comment: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { product: { name: { contains: query, mode: 'insensitive' } } },
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { user: { email: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const parsedReviews = reviews.map((r) => {
      const { cleanComment, metadata } = parseReviewPayload(r.comment);
      return {
        id: r.id,
        productId: r.productId,
        rating: r.rating,
        title: r.title,
        comment: cleanComment,
        photos: metadata.photos || [],
        isFlagged: metadata.isFlagged || false,
        flagReason: metadata.flagReason || null,
        isVerifiedPurchase: metadata.isVerifiedPurchase ?? true,
        isPublic: r.isPublic,
        createdAt: r.createdAt,
        product: r.product,
        user: r.user,
      };
    });

    // If status filter is FLAGGED, filter by parsed flag
    const finalReviews =
      status === 'FLAGGED'
        ? parsedReviews.filter((r) => r.isFlagged)
        : parsedReviews;

    return NextResponse.json({ reviews: finalReviews });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Reviews admin error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { id, isPublic, isFlagged, flagReason } = body;

    if (!id) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    const existing = await prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const { cleanComment, metadata } = parseReviewPayload(existing.comment);

    // Update metadata flags if provided
    const newMetadata = { ...metadata };
    if (typeof isFlagged === 'boolean') {
      newMetadata.isFlagged = isFlagged;
      newMetadata.flagReason = flagReason || (isFlagged ? 'Flagged by Administrator' : undefined);
    }

    const updatedComment = formatReviewPayload(cleanComment, newMetadata);

    const dataToUpdate: any = {
      comment: updatedComment,
    };

    if (typeof isPublic === 'boolean') {
      dataToUpdate.isPublic = isPublic;
    }

    const updated = await prisma.review.update({
      where: { id },
      data: dataToUpdate,
    });

    // Recalculate product rating stats if visibility changed
    if (typeof isPublic === 'boolean') {
      const allProductReviews = await prisma.review.findMany({
        where: { productId: existing.productId, isPublic: true },
        select: { rating: true },
      });
      const stats = calculateRatingStats(allProductReviews);
      await prisma.product.update({
        where: { id: existing.productId },
        data: { rating: stats.average, reviewCount: stats.totalCount },
      });
    }

    return NextResponse.json({ success: true, review: updated });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Review update error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (review) {
      await prisma.review.delete({
        where: { id },
      });

      // Recalculate stats
      const allProductReviews = await prisma.review.findMany({
        where: { productId: review.productId, isPublic: true },
        select: { rating: true },
      });
      const stats = calculateRatingStats(allProductReviews);
      await prisma.product.update({
        where: { id: review.productId },
        data: { rating: stats.average, reviewCount: stats.totalCount },
      });
    }

    return NextResponse.json({ success: true, message: 'Review deleted' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }
    console.error('Review delete error:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
