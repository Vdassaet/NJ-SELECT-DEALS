const path = require('path');
const fs = require('fs');
const epModule = require('embedded-postgres');
const EmbeddedPostgres = epModule.default || epModule;

const dataDir = path.join(process.cwd(), '.postgres-data');

async function main() {
  const isFirstRun = !fs.existsSync(dataDir);
  
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
  });

  if (isFirstRun) {
    console.log('Initializing new PostgreSQL cluster...');
    await pg.initialise();
  }

  console.log('Starting PostgreSQL on localhost:5432...');
  await pg.start();
  console.log('PostgreSQL is running.');

  try {
    console.log('Ensuring nj_select_deals database exists...');
    await pg.createDatabase('nj_select_deals');
    console.log('Database nj_select_deals is ready.');
  } catch (err) {
    console.log('Database notice:', err.message || err);
  }

  console.log('Embedded PostgreSQL daemon is ready for Prisma operations.');

  // Keep node process alive to maintain database service
  process.on('SIGINT', async () => {
    console.log('Shutting down PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });

  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('Failed to start embedded PostgreSQL:', err);
  process.exit(1);
});
