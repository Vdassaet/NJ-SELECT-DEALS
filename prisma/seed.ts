import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Store Settings
  const defaultSettings = [
    { key: 'store_name', value: process.env.NEXT_PUBLIC_STORE_NAME || 'NJ Select Deals', description: 'Primary store name' },
    { key: 'store_email', value: process.env.NEXT_PUBLIC_STORE_EMAIL || 'support@njselectdeals.com', description: 'Store customer support email' },
    { key: 'store_phone', value: process.env.NEXT_PUBLIC_STORE_PHONE || '(800) 555-DEAL', description: 'Store contact telephone' },
    { key: 'store_address', value: '100 Route 17 North, Paramus, NJ 07652', description: 'Store physical or warehouse address' },
    { key: 'currency', value: 'USD', description: 'Store currency code' },
    { key: 'currency_symbol', value: '$', description: 'Store currency symbol' },
    { key: 'free_shipping_threshold', value: process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD || '50', description: 'Minimum order amount for free shipping' },
    { key: 'standard_shipping_rate', value: '4.99', description: 'Standard shipping cost if threshold not met' },
    { key: 'announcement_text', value: 'Free Shipping on orders over $50 | Quality Personal Care, Chocolates & Treats Delivered to Your Door', description: 'Header announcement bar message' },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ Store settings initialized.');

  // 2. Seed Initial Categories
  const initialCategories = [
    {
      name: 'Hair Care',
      slug: 'hair-care',
      description: 'Shampoos, conditioners, hair serums, scalp treatments, and professional styling products.',
      image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80',
      sortOrder: 1,
    },
    {
      name: 'Skin Care',
      slug: 'skin-care',
      description: 'Nourishing creams, cleansers, facial serums, sunscreens, and anti-aging care.',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
      sortOrder: 2,
    },
    {
      name: 'Beauty',
      slug: 'beauty',
      description: 'Cosmetics, beauty tools, face masks, eye creams, and premium cosmetics.',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80',
      sortOrder: 3,
    },
    {
      name: 'Chocolate',
      slug: 'chocolate',
      description: 'Artisanal dark and milk chocolate bars, truffles, gourmet confections, and gift boxes.',
      image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80',
      sortOrder: 4,
    },
    {
      name: 'Candy',
      slug: 'candy',
      description: 'Chewy gummies, hard candies, fruit chews, licorice, and specialty sweets.',
      image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800&auto=format&fit=crop&q=80',
      sortOrder: 5,
    },
    {
      name: 'Personal Care',
      slug: 'personal-care',
      description: 'Body washes, gentle hand soaps, oral health, lotions, and daily hygiene essentials.',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
      sortOrder: 6,
    },
    {
      name: 'Special Offers',
      slug: 'special-offers',
      description: 'Discounted value bundles, seasonal sales, and limited-time savings across the store.',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
      sortOrder: 7,
    },
    {
      name: 'New Arrivals',
      slug: 'new-arrivals',
      description: 'Latest additions and fresh product releases across personal care and sweets.',
      image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop&q=80',
      sortOrder: 8,
    },
  ];

  for (const cat of initialCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        image: cat.image,
        sortOrder: cat.sortOrder,
      },
      create: cat,
    });
  }
  console.log(`✅ ${initialCategories.length} categories seeded.`);

  // 3. Seed Initial Administrator (Admin user)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@njselectdeals.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword2026!';
  const adminName = process.env.ADMIN_NAME || 'Store Administrator';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log(`✅ Administrator account created: ${adminEmail}`);
  } else {
    console.log(`ℹ️ Administrator account already exists: ${adminEmail}`);
  }

  console.log('🎉 Database seeding complete! Clean production database ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
