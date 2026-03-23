import { disconnectSeeds, prisma } from './seeds/connection';
import { seedCoreReferenceData } from './seeds/core';

async function main(): Promise<void> {
  console.log(
    '🌱 Seeding database (prod: admin, categories, cities, tariff plans)...',
  );
  console.log(
    'DATABASE_URL:',
    process.env.DATABASE_URL?.substring(0, 30) + '...',
  );

  await seedCoreReferenceData(prisma);

  console.log(
    '✅ Prod seed completed: admin, categories, cities, tariffs (no demo users).',
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeeds();
  });
