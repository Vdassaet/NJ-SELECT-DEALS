import { prisma } from '../src/lib/prisma';
import { PromotionType, PromotionScope } from '@prisma/client';

async function main() {
  console.log('Seeding promotions and smart product relations for demonstration...');

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  });

  if (products.length === 0) {
    console.log('No products found in database.');
    return;
  }

  console.log(`Found ${products.length} products.`);

  // Find or pick a shampoo / hair care product
  const shampoo = products.find(p => p.name.toLowerCase().includes('shampoo')) || products[0];
  const hairCareProducts = products.filter(p => p.id !== shampoo.id).slice(0, 4);

  // 1. Flash Sale Promotion on shampoo
  const flashSaleEndDate = new Date(Date.now() + 2 * 60 * 60 * 1000 + 35 * 60 * 1000 + 42 * 1000); // ~2h 35m 42s in future!
  const flashSale = await prisma.promotion.upsert({
    where: { id: 'demo-flash-sale-shampoo' },
    update: {
      name: 'Super Flash Sale - 25% OFF',
      type: PromotionType.FLASH_SALE,
      scope: PromotionScope.PRODUCT,
      discountType: 'PERCENTAGE',
      discountValue: 25,
      salePrice: 14.99,
      isFlashSale: true,
      isActive: true,
      startDate: new Date(Date.now() - 3600 * 1000),
      endDate: flashSaleEndDate,
      maxQuantity: 15,
      bannerText: 'FLASH SALE: 25% OFF Limited Time Offer!',
      products: {
        set: [{ id: shampoo.id }],
      },
    },
    create: {
      id: 'demo-flash-sale-shampoo',
      name: 'Super Flash Sale - 25% OFF',
      type: PromotionType.FLASH_SALE,
      scope: PromotionScope.PRODUCT,
      discountType: 'PERCENTAGE',
      discountValue: 25,
      salePrice: 14.99,
      isFlashSale: true,
      isActive: true,
      startDate: new Date(Date.now() - 3600 * 1000),
      endDate: flashSaleEndDate,
      maxQuantity: 15,
      bannerText: 'FLASH SALE: 25% OFF Limited Time Offer!',
      products: {
        connect: [{ id: shampoo.id }],
      },
    },
  });
  console.log('Created/Updated Flash Sale on:', shampoo.name);

  // 2. Tiered Volume Discount on shampoo (Buy 2 Save 10%, Buy 3 Save 15%)
  const tieredPromo = await prisma.promotion.upsert({
    where: { id: 'demo-tiered-volume-shampoo' },
    update: {
      name: 'Volume Special: Buy 2 Save 10%, Buy 3 Save 15%',
      type: PromotionType.TIERED_VOLUME,
      scope: PromotionScope.PRODUCT,
      isActive: true,
      tieredRules: [
        { quantity: 2, discountPercent: 10 },
        { quantity: 3, discountPercent: 15 },
      ],
      bannerText: 'Special Volume Deal: Buy 2 Save 10%, Buy 3 Save 15%',
      products: {
        set: [{ id: shampoo.id }],
      },
    },
    create: {
      id: 'demo-tiered-volume-shampoo',
      name: 'Volume Special: Buy 2 Save 10%, Buy 3 Save 15%',
      type: PromotionType.TIERED_VOLUME,
      scope: PromotionScope.PRODUCT,
      isActive: true,
      tieredRules: [
        { quantity: 2, discountPercent: 10 },
        { quantity: 3, discountPercent: 15 },
      ],
      bannerText: 'Special Volume Deal: Buy 2 Save 10%, Buy 3 Save 15%',
      products: {
        connect: [{ id: shampoo.id }],
      },
    },
  });
  console.log('Created/Updated Tiered Volume Promo on:', shampoo.name);

  // 3. Coupon promotion (SAVE20)
  const couponPromo = await prisma.promotion.upsert({
    where: { id: 'demo-coupon-save20' },
    update: {
      name: 'Site-Wide 20% Off Coupon',
      type: PromotionType.PERCENTAGE,
      scope: PromotionScope.ALL_PRODUCTS,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      couponCode: 'SAVE20',
      isActive: true,
      usageLimit: 500,
      minOrderSubtotal: 25,
      bannerText: 'Use code SAVE20 at checkout for 20% off orders over $25!',
    },
    create: {
      id: 'demo-coupon-save20',
      name: 'Site-Wide 20% Off Coupon',
      type: PromotionType.PERCENTAGE,
      scope: PromotionScope.ALL_PRODUCTS,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      couponCode: 'SAVE20',
      isActive: true,
      usageLimit: 500,
      minOrderSubtotal: 25,
      bannerText: 'Use code SAVE20 at checkout for 20% off orders over $25!',
    },
  });
  console.log('Created/Updated Coupon SAVE20');

  // 4. Another flash deal on another product so homepage has multiple cards
  if (products.length > 1) {
    const secondProduct = products[1];
    const flash2EndDate = new Date(Date.now() + 5 * 60 * 60 * 1000 + 12 * 60 * 1000);
    await prisma.promotion.upsert({
      where: { id: 'demo-flash-sale-product-2' },
      update: {
        name: 'Flash Deal - 30% OFF Special',
        type: PromotionType.FLASH_SALE,
        scope: PromotionScope.PRODUCT,
        discountType: 'PERCENTAGE',
        discountValue: 30,
        isFlashSale: true,
        isActive: true,
        startDate: new Date(Date.now() - 1800 * 1000),
        endDate: flash2EndDate,
        maxQuantity: 20,
        bannerText: 'Weekend Flash Deal: 30% OFF!',
        products: {
          set: [{ id: secondProduct.id }],
        },
      },
      create: {
        id: 'demo-flash-sale-product-2',
        name: 'Flash Deal - 30% OFF Special',
        type: PromotionType.FLASH_SALE,
        scope: PromotionScope.PRODUCT,
        discountType: 'PERCENTAGE',
        discountValue: 30,
        isFlashSale: true,
        isActive: true,
        startDate: new Date(Date.now() - 1800 * 1000),
        endDate: flash2EndDate,
        maxQuantity: 20,
        bannerText: 'Weekend Flash Deal: 30% OFF!',
        products: {
          connect: [{ id: secondProduct.id }],
        },
      },
    });
    console.log('Created/Updated second Flash Sale on:', secondProduct.name);
  }

  // 5. Smart Related Products for shampoo:
  // Admin manual configuration: customer views shampoo -> show conditioner, hair mask, hair cream, etc.
  if (hairCareProducts.length > 0) {
    // Delete existing relations for shampoo
    await prisma.productRelation.deleteMany({
      where: { productId: shampoo.id },
    });

    for (let i = 0; i < hairCareProducts.length; i++) {
      await prisma.productRelation.create({
        data: {
          productId: shampoo.id,
          relatedId: hairCareProducts[i].id,
          sortOrder: i,
        },
      });
    }
    console.log(`Configured ${hairCareProducts.length} smart related products for ${shampoo.name}`);
  }

  console.log('Demonstration promotions and relations seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
