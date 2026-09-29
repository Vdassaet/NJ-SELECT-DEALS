import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { verifyCustomerPurchasedProduct } from '@/lib/review-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { createSafeErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/eligibility?productId=xyz
 * Checks whether the currently logged in user is eligible to review the product
 */
export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: 'review_eligibility',
    limit: 60,
    windowSeconds: 60,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId parameter is required' }, { status: 400 });
    }

    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({
        isAuthenticated: false,
        canReview: false,
        reason: 'NOT_AUTHENTICATED',
      });
    }

    const verification = await verifyCustomerPurchasedProduct(session.id, productId);

    return NextResponse.json({
      isAuthenticated: true,
      hasPurchased: verification.hasPurchased,
      alreadyReviewed: verification.alreadyReviewed,
      existingReviewId: verification.existingReviewId,
      canReview: verification.hasPurchased && !verification.alreadyReviewed,
      orderNumber: verification.orderNumber,
      purchaseDate: verification.purchaseDate,
    });
  } catch (error) {
    return createSafeErrorResponse(error, 'Failed to verify review eligibility');
  }
}
