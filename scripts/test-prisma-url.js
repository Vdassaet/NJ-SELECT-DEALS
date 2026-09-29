const { PrismaClient } = require('@prisma/client');
async function run() {
try {
  const p = new PrismaClient({ datasources: { db: { url: '"postgresql://test"' } } });
  await p.$connect();
  console.log("Connected");
} catch (e) {
  console.log("Error:", e.message);
}
}
run();
