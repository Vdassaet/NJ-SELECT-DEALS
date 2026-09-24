import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { 
  verifyCustomerPurchasedProduct, 
  calculateRatingStats, 
  formatReviewPayload, 
  parseReviewPayload 
} from '@/lib/review-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews?productId=xyz
 * Returns public reviews and summary stats (average rating, count, distribution)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId parameter is required' }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isPublic: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
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
        isVerifiedPurchase: metadata.isVerifiedPurchase ?? true,
        createdAt: r.createdAt,
        user: {
          id: r.user?.id,
          name: r.user?.name || 'Verified Customer',
        },
      };
    });

    const stats = calculateRatingStats(reviews);

    return NextResponse.json({
      reviews: parsedReviews,
      stats,
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Customer submits a review with Verified Purchase requirement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Please sign in to write a review.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, rating, title, comment, photos } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5 stars' }, { status: 400 });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please enter a review comment of at least 5 characters' },
        { status: 400 }
      );
    }

    // 1. Server-side purchase verification: Only customers who purchased can review
    const verification = await verifyCustomerPurchasedProduct(session.id, productId);

    if (!verification.hasPurchased) {
      return NextResponse.json(
        { 
          error: 'Only customers who have purchased this product can leave a review.',
          code: 'UNVERIFIED_PURCHASE'
        },
        { status: 403 }
      );
    }

    // 2. Prevent duplicate reviews for the same product
    if (verification.alreadyReviewed) {
      return NextResponse.json(
        { 
          error: 'You have already submitted a review for this product.',
          code: 'DUPLICATE_REVIEW'
        },
        { status: 400 }
      );
    }

    // 3. Format payload with photos and Verified Purchase mark
    const sanitizedPhotos = Array.isArray(photos)
      ? photos.filter((p: any) => typeof p === 'string' && p.startsWith('http')).slice(0, 5)
      : [];

    const encodedComment = formatReviewPayload(comment.trim(), {
      photos: sanitizedPhotos,
      isVerifiedPurchase: true,
      isFlagged: false,
    });

    // 4. Create review
    const newReview = await prisma.review.create({
      data: {
        productId,
        userId: session.id,
        rating: Math.round(numericRating),
        title: title ? title.trim().substring(0, 150) : null,
        comment: encodedComment,
        isPublic: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 5. Update cached product rating & review count for fast list filtering
    const allProductReviews = await prisma.review.findMany({
      where: { productId, isPublic: true },
      select: { rating: true },
    });

    const newStats = calculateRatingStats(allProductReviews);
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: newStats.average,
        reviewCount: newStats.totalCount,
      },
    });

    const { cleanComment, metadata } = parseReviewPayload(newReview.comment);

    return NextResponse.json({
      success: true,
      review: {
        id: newReview.id,
        productId: newReview.productId,
        rating: newReview.rating,
        title: newReview.title,
        comment: cleanComment,
        photos: metadata.photos || [],
        isVerifiedPurchase: true,
        createdAt: newReview.createdAt,
        user: {
          id: newReview.user?.id,
          name: newReview.user?.name || 'Verified Customer',
        },
      },
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit review' }, { status: 500 });
  }
}
