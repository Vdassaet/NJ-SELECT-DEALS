const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updates = [
    { key: 'store_logo', value: '/logo.jpg' },
    { key: 'store_email', value: 'njselectdeals@gmail.com' },
    { key: 'store_phone', value: '' },
    { key: 'store_address', value: 'Passaic, New Jersey' },
    { key: 'order_notification_email', value: 'njselectdeals@gmail.com' }
  ];

  for (const item of updates) {
    await prisma.settings.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: { key: item.key, value: item.value, description: 'Updated via script' }
    });
    console.log(`Updated ${item.key} to ${item.value}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
