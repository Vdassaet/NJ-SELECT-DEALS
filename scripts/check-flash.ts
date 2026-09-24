import { prisma } from '../src/lib/prisma';

async function main() {
  const promos = await prisma.promotion.findMany({
    where: { isFlashSale: true },
    include: {
      products: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  for (const p of promos) {
    console.log(`Promotion: ${p.name}`);
    console.log(`  isActive: ${p.isActive}`);
    console.log(`  isFlashSale: ${p.isFlashSale}`);
    console.log(`  startDate: ${p.startDate}`);
    console.log(`  endDate: ${p.endDate}`);
    console.log(`  usedCount: ${p.usedCount}`);
    console.log(`  Products: ${p.products.length}`);
    for (const prod of p.products) {
      console.log(`    - ${prod.name} (active: ${prod.isActive})`);
    }
  }

  // Also check if isPromotionActive would pass
  const now = new Date();
  console.log(`\nCurrent time: ${now.toISOString()}`);
  for (const p of promos) {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : null;
    const isActiveNow = p.isActive && start <= now && (!end || end >= now);
    console.log(`${p.name}: isActiveNow=${isActiveNow} (start=${start.toISOString()}, end=${end?.toISOString() || 'null'}, startOk=${start <= now}, endOk=${!end || end >= now})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
