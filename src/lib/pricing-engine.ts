import { prisma } from './prisma';
import {
  OrderPricingResult,
  ItemDiscountBreakdown,
  AppliedPromotionSummary,
  PromotionItem,
  TieredDiscountRule,
} from './types';

export const STANDARD_SHIPPING_COST = 4.99;
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 50.0;
export const NJ_SALES_TAX_RATE = 0.06625;

/**
 * Validates whether a promotion record is active at a specific point in time
 */
export function isPromotionActive(
  promo: {
    isActive: boolean;
    startDate: Date | string;
    endDate?: Date | string | null;
    usageLimit?: number | null;
    usedCount: number;
  },
  now: Date = new Date()
): boolean {
  if (!promo.isActive) return false;
  const start = new Date(promo.startDate);
  if (start > now) return false;
  if (promo.endDate) {
    const end = new Date(promo.endDate);
    if (end < now) return false;
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return false;
  }
  return true;
}

/**
 * Fetches all currently applicable active promotions for a given product
 */
export async function getProductActivePromotions(
  productId: string,
  now: Date = new Date()
): Promise<PromotionItem[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, categoryId: true },
  });

  if (!product) return [];

  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: {
      products: { select: { id: true } },
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const matching = promos.filter((promo) => {
    if (!isPromotionActive(promo, now)) return false;

    if (promo.scope === 'ALL_PRODUCTS') return true;
    if (promo.scope === 'CATEGORY' && promo.categoryId === product.categoryId) return true;
    if (promo.scope === 'PRODUCT' && promo.products.some((p) => p.id === product.id)) return true;
    if (promo.scope === 'BUNDLE' && Array.isArray(promo.bundleProductIds)) {
      return (promo.bundleProductIds as string[]).includes(product.id);
    }
    return false;
  });

  return matching as unknown as PromotionItem[];
}

/**
 * Authoritative Server-Side Pricing Engine
 * Performs all financial & promotional calculations directly against database records.
 * Never trusts any totals, discounts, or prices sent from the client.
 */
export async function calculateOrderPricing(
  cartItems: { productId: string; quantity: number; variantId?: string | null }[],
  couponCode?: string | null,
  options?: { now?: Date }
): Promise<OrderPricingResult> {
  const now = options?.now || new Date();

  if (!cartItems || cartItems.length === 0) {
    return {
      originalSubtotal: 0,
      subtotal: 0,
      totalItemDiscount: 0,
      orderDiscount: 0,
      totalSavings: 0,
      shippingCost: 0,
      isFreeShipping: false,
      freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
      tax: 0,
      taxRate: NJ_SALES_TAX_RATE,
      total: 0,
      itemBreakdowns: [],
      appliedPromotions: [],
      coupon: null,
    };
  }

  // 1. Fetch DB Products
  const productIds = Array.from(new Set(cartItems.map((i) => i.productId)));
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      category: true,
      variants: true,
      promotions: {
        where: {
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      },
    },
  });

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // 2. Fetch all other potentially active promotions (ALL_PRODUCTS, CATEGORY, BUNDLE, COUPON, FREE_SHIPPING)
  const generalPromotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: {
      products: { select: { id: true } },
    },
  });

  const activePromos = generalPromotions.filter((p) => isPromotionActive(p, now));

  const itemBreakdowns: ItemDiscountBreakdown[] = [];
  const appliedPromotionsMap = new Map<string, AppliedPromotionSummary>();

  let originalSubtotal = 0;
  let subtotalAfterItemDiscounts = 0;

  // 3. Process Product-Level Discounts for each line item
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const unitBasePrice = product.price;
    const qty = Math.max(1, item.quantity);
    const lineOriginal = unitBasePrice * qty;
    originalSubtotal += lineOriginal;

    // Collect all promos targeting this product
    const relevantPromos = activePromos.filter((promo) => {
      if (promo.couponCode && promo.couponCode.trim().length > 0) return false; // Coupons handled at order level
      if (promo.type === 'FREE_SHIPPING') return false; // Handled at shipping level
      if (promo.scope === 'ALL_PRODUCTS') return true;
      if (promo.scope === 'CATEGORY' && promo.categoryId === product.categoryId) return true;
      if (promo.scope === 'PRODUCT' && promo.products.some((p) => p.id === product.id)) return true;
      return false;
    });

    let bestDiscount = 0;
    let bestReason = '';
    let bestPromo: (typeof activePromos)[0] | null = null;

    // A. Direct Database Sale Price check (e.g. was $19.99, now $14.99)
    if (product.salePrice != null && product.salePrice < product.price) {
      const saleDiff = (product.price - product.salePrice) * qty;
      if (saleDiff > bestDiscount) {
        bestDiscount = saleDiff;
        bestReason = `Sale Price: $${product.salePrice.toFixed(2)}`;
      }
    }

    // B. Evaluate Promotions for this item
    for (const promo of relevantPromos) {
      let promoDiscount = 0;
      let promoReason = promo.name;

      if (promo.type === 'PERCENTAGE' && promo.discountValue) {
        promoDiscount = lineOriginal * (promo.discountValue / 100);
        promoReason = `${promo.discountValue}% OFF`;
      } else if (promo.type === 'FIXED_AMOUNT' && promo.discountValue) {
        promoDiscount = Math.min(lineOriginal, promo.discountValue * qty);
        promoReason = `$${promo.discountValue.toFixed(2)} OFF per unit`;
      } else if (promo.type === 'SALE_PRICE' && promo.salePrice != null && promo.salePrice < unitBasePrice) {
        promoDiscount = (unitBasePrice - promo.salePrice) * qty;
        promoReason = `Sale Price: $${promo.salePrice.toFixed(2)}`;
      } else if (promo.type === 'FLASH_SALE') {
        // Flash sale with possible maxQuantity cap
        const eligibleQty = promo.maxQuantity ? Math.min(qty, promo.maxQuantity) : qty;
        if (promo.discountValue) {
          if (promo.discountType === 'PERCENTAGE' || !promo.discountType) {
            promoDiscount = unitBasePrice * eligibleQty * (promo.discountValue / 100);
            promoReason = `⚡ Flash Sale: ${promo.discountValue}% OFF`;
          } else {
            promoDiscount = eligibleQty * promo.discountValue;
            promoReason = `⚡ Flash Sale: $${promo.discountValue.toFixed(2)} OFF`;
          }
        } else if (promo.salePrice != null && promo.salePrice < unitBasePrice) {
          promoDiscount = (unitBasePrice - promo.salePrice) * eligibleQty;
          promoReason = `⚡ Flash Sale: $${promo.salePrice.toFixed(2)}`;
        }
      } else if (promo.type === 'TIERED_VOLUME') {
        // Tiered volume discount: e.g. Buy 2 save 10%, Buy 3 save 15%
        const rules = (promo.tieredRules as unknown as TieredDiscountRule[]) || [];
        if (Array.isArray(rules) && rules.length > 0) {
          // Sort descending by minQty to find highest qualifying tier
          const sortedTiers = [...rules].sort((a, b) => b.minQty - a.minQty);
          const matchedTier = sortedTiers.find((t) => qty >= t.minQty);
          if (matchedTier) {
            promoDiscount = lineOriginal * (matchedTier.discountPercent / 100);
            promoReason = `Buy ${matchedTier.minQty}+ Save ${matchedTier.discountPercent}%`;
          }
        }
      } else if (promo.type === 'BUY_X_GET_Y') {
        // Buy X Get Y: e.g. Buy 2 Get 1 Free (100% off) or 50% off
        const buyX = promo.buyQuantity || 1;
        const getY = promo.getQuantity || 1;
        const discountPct = promo.getDiscountPercent != null ? promo.getDiscountPercent : 100;
        const setSize = buyX + getY;

        if (qty >= setSize) {
          const setsCount = Math.floor(qty / setSize);
          const freeOrDiscountedUnits = setsCount * getY;
          promoDiscount = freeOrDiscountedUnits * unitBasePrice * (discountPct / 100);
          promoReason = `Buy ${buyX} Get ${getY} ${discountPct === 100 ? 'Free' : `${discountPct}% OFF`}`;
        }
      }

      if (promoDiscount > bestDiscount) {
        bestDiscount = promoDiscount;
        bestReason = promoReason;
        bestPromo = promo;
      }
    }

    // Ensure line discount doesn't exceed line original
    bestDiscount = Math.min(lineOriginal, Math.round(bestDiscount * 100) / 100);
    const lineTotal = Math.max(0, Math.round((lineOriginal - bestDiscount) * 100) / 100);
    const effectiveUnitPrice = Math.round((lineTotal / qty) * 100) / 100;

    subtotalAfterItemDiscounts += lineTotal;

    itemBreakdowns.push({
      productId: product.id,
      name: product.name,
      originalPrice: unitBasePrice,
      effectiveUnitPrice,
      unitDiscount: Math.round((unitBasePrice - effectiveUnitPrice) * 100) / 100,
      quantity: qty,
      lineSubtotal: lineOriginal,
      lineDiscount: bestDiscount,
      lineTotal,
      appliedPromotionId: bestPromo?.id,
      appliedPromotionName: bestPromo?.name,
      appliedPromotionType: bestPromo?.type,
      reason: bestReason || undefined,
    });

    if (bestPromo && bestDiscount > 0) {
      const existing = appliedPromotionsMap.get(bestPromo.id);
      if (existing) {
        existing.discountAmount = Math.round((existing.discountAmount + bestDiscount) * 100) / 100;
      } else {
        appliedPromotionsMap.set(bestPromo.id, {
          id: bestPromo.id,
          name: bestPromo.name,
          type: bestPromo.type,
          discountAmount: bestDiscount,
          description: bestReason,
        });
      }
    }
  }

  // 4. Bundle Discounts
  const bundlePromos = activePromos.filter((p) => p.type === 'BUNDLE');
  for (const bundle of bundlePromos) {
    const requiredProductIds = (bundle.bundleProductIds as string[]) || [];
    if (requiredProductIds.length > 0) {
      const hasAllProducts = requiredProductIds.every((reqId) =>
        cartItems.some((ci) => ci.productId === reqId)
      );

      if (hasAllProducts) {
        let bundleDiscount = 0;
        if (bundle.discountType === 'PERCENTAGE' && bundle.discountValue) {
          bundleDiscount = subtotalAfterItemDiscounts * (bundle.discountValue / 100);
        } else if (bundle.discountValue) {
          bundleDiscount = bundle.discountValue;
        }

        if (bundleDiscount > 0) {
          bundleDiscount = Math.min(subtotalAfterItemDiscounts, Math.round(bundleDiscount * 100) / 100);
          subtotalAfterItemDiscounts = Math.max(0, subtotalAfterItemDiscounts - bundleDiscount);

          appliedPromotionsMap.set(bundle.id, {
            id: bundle.id,
            name: bundle.name,
            type: bundle.type,
            discountAmount: bundleDiscount,
            description: `Bundle Savings: $${bundleDiscount.toFixed(2)}`,
          });
        }
      }
    }
  }

  // 5. Coupon Evaluation (Order-level)
  let orderDiscount = 0;
  let couponInfo: OrderPricingResult['coupon'] = null;

  if (couponCode && couponCode.trim().length > 0) {
    const cleanCode = couponCode.trim().toUpperCase();

    // Check in Promotion model first
    let matchingPromo = activePromos.find(
      (p) => p.couponCode && p.couponCode.trim().toUpperCase() === cleanCode
    );

    // If not found in active cached promos, query directly
    if (!matchingPromo) {
      const found = await prisma.promotion.findFirst({
        where: {
          couponCode: { equals: cleanCode, mode: 'insensitive' },
        },
      });

      if (found) {
        if (!found.isActive) {
          couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon code is currently inactive.' };
        } else if (new Date(found.startDate) > now) {
          couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This promotion has not started yet.' };
        } else if (found.endDate && new Date(found.endDate) < now) {
          couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon code has expired.' };
        } else if (found.usageLimit != null && found.usedCount >= found.usageLimit) {
          couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon has reached its maximum redemption limit.' };
        } else {
          matchingPromo = found as unknown as typeof activePromos[0];
        }
      } else {
        // Fallback to legacy Coupon table if applicable
        const legacyCoupon = await prisma.coupon.findUnique({
          where: { code: cleanCode },
        });

        if (legacyCoupon) {
          if (!legacyCoupon.isActive) {
            couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon code is inactive.' };
          } else if (new Date(legacyCoupon.startDate) > now) {
            couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon has not started yet.' };
          } else if (legacyCoupon.endDate && new Date(legacyCoupon.endDate) < now) {
            couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon has expired.' };
          } else if (legacyCoupon.maxUses != null && legacyCoupon.usedCount >= legacyCoupon.maxUses) {
            couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'This coupon has reached its maximum uses.' };
          } else if (legacyCoupon.minOrderAmount != null && subtotalAfterItemDiscounts < legacyCoupon.minOrderAmount) {
            couponInfo = {
              code: cleanCode,
              valid: false,
              discountAmount: 0,
              message: `Minimum order of $${legacyCoupon.minOrderAmount.toFixed(2)} required for this coupon.`,
            };
          } else {
            let disc = 0;
            if (legacyCoupon.discountType === 'PERCENTAGE') {
              disc = subtotalAfterItemDiscounts * (legacyCoupon.discountValue / 100);
            } else {
              disc = legacyCoupon.discountValue;
            }
            disc = Math.min(subtotalAfterItemDiscounts, Math.round(disc * 100) / 100);
            orderDiscount += disc;

            couponInfo = {
              code: cleanCode,
              valid: true,
              discountAmount: disc,
              message: `Coupon "${cleanCode}" applied: -$${disc.toFixed(2)}`,
            };

            appliedPromotionsMap.set(`coupon_${legacyCoupon.id}`, {
              id: legacyCoupon.id,
              name: `Coupon: ${cleanCode}`,
              type: 'PERCENTAGE',
              discountAmount: disc,
              couponCode: cleanCode,
            });
          }
        } else {
          couponInfo = { code: cleanCode, valid: false, discountAmount: 0, message: 'Invalid coupon code.' };
        }
      }
    }

    if (matchingPromo && isPromotionActive(matchingPromo, now)) {
      if (matchingPromo.minOrderSubtotal != null && subtotalAfterItemDiscounts < matchingPromo.minOrderSubtotal) {
        couponInfo = {
          code: cleanCode,
          valid: false,
          discountAmount: 0,
          message: `Minimum order amount of $${matchingPromo.minOrderSubtotal.toFixed(2)} required to use coupon "${cleanCode}".`,
        };
      } else {
        let disc = 0;
        if (matchingPromo.discountType === 'PERCENTAGE' || (!matchingPromo.discountType && matchingPromo.type === 'PERCENTAGE')) {
          disc = subtotalAfterItemDiscounts * ((matchingPromo.discountValue || 0) / 100);
        } else if (matchingPromo.discountValue) {
          disc = matchingPromo.discountValue;
        }

        disc = Math.min(subtotalAfterItemDiscounts, Math.round(disc * 100) / 100);
        orderDiscount += disc;

        couponInfo = {
          code: cleanCode,
          valid: true,
          discountAmount: disc,
          message: `Coupon "${cleanCode}" applied: -$${disc.toFixed(2)}`,
        };

        appliedPromotionsMap.set(matchingPromo.id, {
          id: matchingPromo.id,
          name: matchingPromo.name,
          type: matchingPromo.type,
          discountAmount: disc,
          couponCode: cleanCode,
          description: `Coupon ${cleanCode}`,
        });
      }
    }
  }

  // 6. Free Shipping Promotions
  const freeShippingPromo = activePromos.find(
    (p) =>
      p.type === 'FREE_SHIPPING' &&
      (!p.minOrderSubtotal || subtotalAfterItemDiscounts >= p.minOrderSubtotal)
  );

  const qualifiesDefaultFreeShipping = subtotalAfterItemDiscounts >= DEFAULT_FREE_SHIPPING_THRESHOLD;
  const isFreeShipping = Boolean(freeShippingPromo || qualifiesDefaultFreeShipping);
  const shippingCost = isFreeShipping ? 0 : STANDARD_SHIPPING_COST;

  if (freeShippingPromo && !qualifiesDefaultFreeShipping) {
    appliedPromotionsMap.set(freeShippingPromo.id, {
      id: freeShippingPromo.id,
      name: freeShippingPromo.name,
      type: 'FREE_SHIPPING',
      discountAmount: STANDARD_SHIPPING_COST,
      description: 'Free Shipping Promotion Applied',
    });
  }

  // 7. Taxes & Final Calculations
  const taxableSubtotal = Math.max(0, subtotalAfterItemDiscounts - orderDiscount);
  const tax = Math.round(taxableSubtotal * NJ_SALES_TAX_RATE * 100) / 100;
  const total = Math.round((taxableSubtotal + shippingCost + tax) * 100) / 100;

  const totalItemDiscount = itemBreakdowns.reduce((sum, item) => sum + item.lineDiscount, 0);
  const totalSavings = Math.round((totalItemDiscount + orderDiscount) * 100) / 100;

  return {
    originalSubtotal: Math.round(originalSubtotal * 100) / 100,
    subtotal: Math.round(subtotalAfterItemDiscounts * 100) / 100,
    totalItemDiscount: Math.round(totalItemDiscount * 100) / 100,
    orderDiscount: Math.round(orderDiscount * 100) / 100,
    totalSavings,
    shippingCost,
    isFreeShipping,
    freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
    tax,
    taxRate: NJ_SALES_TAX_RATE,
    total,
    itemBreakdowns,
    appliedPromotions: Array.from(appliedPromotionsMap.values()),
    coupon: couponInfo,
  };
}

/**
 * Atomically increments the redemption count for applied promotions upon confirmed checkout
 */
export async function recordPromotionUsage(appliedPromotions: AppliedPromotionSummary[]): Promise<void> {
  if (!appliedPromotions || appliedPromotions.length === 0) return;

  for (const promo of appliedPromotions) {
    try {
      if (promo.id.startsWith('coupon_')) {
        const legacyId = promo.id.replace('coupon_', '');
        await prisma.coupon.update({
          where: { id: legacyId },
          data: { usedCount: { increment: 1 } },
        });
      } else {
        await prisma.promotion.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    } catch (err) {
      console.warn(`Failed to increment usedCount for promotion ${promo.id}:`, err);
    }
  }
}
