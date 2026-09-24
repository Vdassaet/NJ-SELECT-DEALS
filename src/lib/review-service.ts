import { prisma } from '@/lib/prisma';

export interface ReviewMetadata {
  photos?: string[];
  isFlagged?: boolean;
  flagReason?: string;
  isVerifiedPurchase?: boolean;
}

export interface RatingStats {
  average: number;
  totalCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  percentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Encodes review comment and optional photo / flag metadata safely
 */
export function formatReviewPayload(comment: string, metadata: ReviewMetadata): string {
  const metaTag = `\n<!--METADATA:${JSON.stringify(metadata)}-->`;
  return `${comment.trim()}${metaTag}`;
}

/**
 * Parses review comment and extracts optional photos and moderation flags
 */
export function parseReviewPayload(rawComment: string): {
  cleanComment: string;
  metadata: ReviewMetadata;
} {
  const match = rawComment.match(/\n<!--METADATA:(.*?)-->$/s);
  if (!match) {
    return {
      cleanComment: rawComment,
      metadata: { isVerifiedPurchase: true, photos: [], isFlagged: false },
    };
  }

  try {
    const meta = JSON.parse(match[1]);
    const clean = rawComment.replace(/\n<!--METADATA:(.*?)-->$/s, '').trim();
    return {
      cleanComment: clean,
      metadata: {
        photos: Array.isArray(meta.photos) ? meta.photos : [],
        isFlagged: Boolean(meta.isFlagged),
        flagReason: meta.flagReason || undefined,
        isVerifiedPurchase: meta.isVerifiedPurchase ?? true,
      },
    };
  } catch {
    return {
      cleanComment: rawComment,
      metadata: { isVerifiedPurchase: true, photos: [], isFlagged: false },
    };
  }
}

/**
 * Validates whether a user has actually purchased a product.
 * Requires at least one non-cancelled order containing an item matching productId.
 */
export async function verifyCustomerPurchasedProduct(
  userId: string,
  productId: string
): Promise<{
  hasPurchased: boolean;
  orderNumber?: string;
  purchaseDate?: Date;
  alreadyReviewed: boolean;
  existingReviewId?: string;
}> {
  // 1. Check for existing review by this user on this product
  const existingReview = await prisma.review.findFirst({
    where: {
      userId,
      productId,
    },
    select: { id: true },
  });

  const alreadyReviewed = Boolean(existingReview);

  // 2. Find any eligible completed or processing order containing the product
  const orderWithItem = await prisma.order.findFirst({
    where: {
      userId,
      status: { notIn: ['CANCELLED'] },
      items: {
        some: {
          productId,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
    },
  });

  if (!orderWithItem) {
    return {
      hasPurchased: false,
      alreadyReviewed,
      existingReviewId: existingReview?.id,
    };
  }

  return {
    hasPurchased: true,
    orderNumber: orderWithItem.orderNumber,
    purchaseDate: orderWithItem.createdAt,
    alreadyReviewed,
    existingReviewId: existingReview?.id,
  };
}

/**
 * Computes average ratings, total reviews, and 1-5 star distributions
 */
export function calculateRatingStats(reviews: { rating: number }[]): RatingStats {
  const totalCount = reviews.length;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (totalCount === 0) {
    return {
      average: 0,
      totalCount: 0,
      distribution,
      percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  let totalScore = 0;
  for (const r of reviews) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    totalScore += star;
  }

  const average = Math.round((totalScore / totalCount) * 10) / 10;

  const percentages = {
    5: Math.round((distribution[5] / totalCount) * 100),
    4: Math.round((distribution[4] / totalCount) * 100),
    3: Math.round((distribution[3] / totalCount) * 100),
    2: Math.round((distribution[2] / totalCount) * 100),
    1: Math.round((distribution[1] / totalCount) * 100),
  };

  return {
    average,
    totalCount,
    distribution,
    percentages,
  };
}
